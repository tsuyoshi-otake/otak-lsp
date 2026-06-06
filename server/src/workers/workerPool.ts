/**
 * Worker Pool
 * Feature: parallel-advanced-rules
 *
 * 汎用 worker_threads プール。
 *
 * 設計方針:
 * - **lazy init**: 最初の `submit` で worker をまとめて起動する
 * - **round-robin**: idle な worker を見つけたら割り当て、なければ FIFO キューに積む
 * - **request-id 多重化**: 1 worker に対して同時に複数 request は送らない (CPU バウンドなので意味がない)
 * - **shutdown 安全**: shutdown 後の submit は reject、再起動はしない
 * - **エラー時 reject**: worker が exit code != 0 で死んだら、その worker の pending request を reject。
 *   pool 全体は劣化モードで残りの worker で動作を続ける。全 worker が死んだら pool 自体を closed にする。
 *
 * 上位 (AdvancedRulesManager) はこの reject を catch して in-process フォールバックする。
 */

import { Worker } from 'worker_threads';

/**
 * worker に投げる 1 件のリクエスト。
 *
 * `id` は pool 内部で一意の数値で、レスポンスのマッチングに使う。
 * `message` は呼出側が自由に詰める payload で、worker 側でも同形の object として受け取る。
 */
export interface WorkerRequest<TMessage = unknown> {
  message: TMessage;
}

/**
 * worker からのレスポンスメッセージの想定形。
 *
 * - 正常系: `{ id, result }`
 * - 異常系: `{ id, error }`
 *
 * pool はこの形を assume するため、worker 実装はこれに従うこと。
 */
export interface WorkerResponse<TResult = unknown> {
  id: number;
  result?: TResult;
  error?: string;
}

interface InternalRequest<TMessage, TResult> {
  id: number;
  message: TMessage;
  resolve: (value: TResult) => void;
  reject: (reason: Error) => void;
}

interface ManagedWorker {
  worker: Worker;
  /** 現在処理中の request id (idle なら null) */
  currentRequestId: number | null;
  /** 死亡フラグ。true なら以降は割り当てない */
  dead: boolean;
}

/**
 * WorkerPool の起動オプション
 */
export interface WorkerPoolOptions {
  /** worker bundle の絶対パス */
  workerScript: string;
  /** 起動する worker 数。1 以上 */
  size: number;
  /** worker 起動時に渡す初期データ (worker 側で `workerData` として受け取る) */
  workerData?: unknown;
}

/**
 * 汎用 worker_threads プール。
 */
export class WorkerPool<TMessage = unknown, TResult = unknown> {
  private readonly workerScript: string;
  private readonly desiredSize: number;
  private readonly workerData: unknown;

  private workers: ManagedWorker[] = [];
  private pendingRequests = new Map<number, InternalRequest<TMessage, TResult>>();
  private queue: InternalRequest<TMessage, TResult>[] = [];
  private nextRequestId = 0;

  /** lazy 起動を 1 回だけ行うためのフラグ */
  private initialized = false;
  /** shutdown 済みフラグ。以降の submit は reject */
  private closed = false;

  constructor(options: WorkerPoolOptions) {
    if (options.size < 1) {
      throw new Error(`WorkerPool size must be >= 1, got ${options.size}`);
    }
    this.workerScript = options.workerScript;
    this.desiredSize = options.size;
    this.workerData = options.workerData;
  }

  /**
   * 起動済みかどうか。テスト用に公開。
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * 設定上の worker 数 (起動目標)。生存数は `liveWorkerCount()` で取得する。
   */
  get size(): number {
    return this.desiredSize;
  }

  /**
   * shutdown 済みかどうか。
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * 現在生存している worker 数。
   */
  liveWorkerCount(): number {
    return this.workers.filter((w) => !w.dead).length;
  }

  /**
   * 1 件のリクエストを worker に投げ、結果を Promise で返す。
   *
   * - idle な worker があれば即座に割り当てる
   * - なければ FIFO キューに積み、worker が空いたら処理する
   * - pool が closed なら即 reject
   * - 全 worker が死んでいたら即 reject
   */
  submit(message: TMessage): Promise<TResult> {
    if (this.closed) {
      return Promise.reject(new Error('WorkerPool is closed'));
    }

    this.ensureInitialized();

    return new Promise<TResult>((resolve, reject) => {
      if (this.liveWorkerCount() === 0) {
        reject(new Error('WorkerPool has no live workers'));
        return;
      }

      const id = this.nextRequestId++;
      const request: InternalRequest<TMessage, TResult> = {
        id,
        message,
        resolve,
        reject,
      };
      this.queue.push(request);
      this.tryAssignNext();
    });
  }

  /**
   * pool を shutdown する。
   *
   * - 進行中の request は worker からの最終 response を待たずに reject する
   *   (in-process フォールバックさせるため、長い待機は避ける)
   * - すべての worker に `terminate()` を送る
   * - 以降の submit は即 reject
   */
  async shutdown(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;

    const queuedError = new Error('WorkerPool shutdown: request canceled');
    for (const request of this.queue) {
      request.reject(queuedError);
    }
    this.queue = [];

    const pendingError = new Error('WorkerPool shutdown: request canceled');
    for (const request of this.pendingRequests.values()) {
      request.reject(pendingError);
    }
    this.pendingRequests.clear();

    const terminations = this.workers.map(async (managed) => {
      if (managed.dead) {
        return;
      }
      managed.dead = true;
      try {
        await managed.worker.terminate();
      } catch {
        // terminate 失敗 (= 既に死んでいる) は無視
      }
    });
    await Promise.all(terminations);
    this.workers = [];
  }

  // ---------- internal ----------

  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    for (let i = 0; i < this.desiredSize; i++) {
      this.spawnWorker();
    }
  }

  private spawnWorker(): void {
    const worker = new Worker(this.workerScript, {
      workerData: this.workerData,
    });
    const managed: ManagedWorker = {
      worker,
      currentRequestId: null,
      dead: false,
    };

    worker.on('message', (raw: WorkerResponse<TResult>) => {
      this.handleResponse(managed, raw);
    });
    worker.on('error', (err) => {
      this.handleWorkerError(managed, err);
    });
    worker.on('exit', (code) => {
      if (code !== 0) {
        this.handleWorkerError(managed, new Error(`Worker exited with code ${code}`));
      } else {
        managed.dead = true;
      }
    });

    this.workers.push(managed);
  }

  private handleResponse(managed: ManagedWorker, raw: WorkerResponse<TResult>): void {
    const requestId = raw?.id;
    if (typeof requestId !== 'number') {
      return;
    }
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return;
    }
    this.pendingRequests.delete(requestId);
    managed.currentRequestId = null;

    if (raw.error !== undefined) {
      request.reject(new Error(raw.error));
    } else {
      request.resolve(raw.result as TResult);
    }

    this.tryAssignNext();
  }

  private handleWorkerError(managed: ManagedWorker, err: Error): void {
    if (managed.dead) {
      return;
    }
    managed.dead = true;

    const currentId = managed.currentRequestId;
    if (currentId !== null) {
      const request = this.pendingRequests.get(currentId);
      if (request) {
        this.pendingRequests.delete(currentId);
        request.reject(err);
      }
      managed.currentRequestId = null;
    }

    if (this.liveWorkerCount() === 0) {
      // 全 worker 死亡。キュー上の request も reject する
      const fatal = new Error('All workers in the pool have died');
      for (const request of this.queue) {
        request.reject(fatal);
      }
      this.queue = [];
    } else {
      this.tryAssignNext();
    }
  }

  private tryAssignNext(): void {
    if (this.queue.length === 0) {
      return;
    }
    for (const managed of this.workers) {
      if (managed.dead || managed.currentRequestId !== null) {
        continue;
      }
      const request = this.queue.shift();
      if (!request) {
        return;
      }
      managed.currentRequestId = request.id;
      this.pendingRequests.set(request.id, request);
      managed.worker.postMessage({ id: request.id, ...(request.message as object) });
      if (this.queue.length === 0) {
        return;
      }
    }
  }
}

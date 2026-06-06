/**
 * Worker Pool Manager
 * Feature: parallel-advanced-rules
 *
 * AdvancedRulesManager から分離した「worker pool のライフサイクル管理」責務。
 *   - 設定に基づく lazy init（フラグ off / 初期化失敗時は null を返す）
 *   - 初期化失敗のセンチネル管理（一度失敗したら以降 in-process フォールバック）
 *   - 設定変更検知に伴うプールの作り直し
 *   - shutdown / アクティブ判定
 *
 * 「どのルールをどう並列に配るか」は ParallelRuleExecutor の責務であり、
 * このマネージャは worker_threads リソースの生存管理だけに責任を持つ。
 */

import * as os from 'os';
import * as path from 'path';

import { ParallelExecutionConfig } from '../../../shared/src/advancedTypes';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { WorkerPool } from './workerPool';
import type {
  RunRulesMessage,
  RunRulesResultPayload,
} from './advancedRulesWorker';

/**
 * Worker pool 起動失敗フラグ用センチネル。
 * 一度失敗したら以降は in-process フォールバックする。
 */
const POOL_INIT_FAILED = Symbol('POOL_INIT_FAILED');

export type ManagedWorkerPool = WorkerPool<Omit<RunRulesMessage, 'id'>, RunRulesResultPayload>;
type PoolInitResult = ManagedWorkerPool | typeof POOL_INIT_FAILED;

export class WorkerPoolManager {
  private readonly logger: Logger | undefined;

  /** worker pool (lazy init)。POOL_INIT_FAILED の場合は初期化済みかつ失敗 */
  private workerPool: PoolInitResult | null = null;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * worker pool を lazy init する。失敗したら POOL_INIT_FAILED を入れて以降 fall back。
   *
   * テストで worker bundle が無い環境でも config フラグ off なら呼ばれないので問題ない。
   * フラグ on でも bundle が無ければ Worker constructor が同期 throw するため、catch して
   * フォールバックする。
   */
  ensure(parallel: ParallelExecutionConfig | undefined): ManagedWorkerPool | null {
    if (this.workerPool && this.workerPool !== POOL_INIT_FAILED) {
      return this.workerPool;
    }
    if (this.workerPool === POOL_INIT_FAILED) {
      return null;
    }

    if (!parallel?.enabled) {
      return null;
    }

    try {
      const defaultMax = Math.max(1, os.cpus().length - 1);
      const requestedMax = parallel.maxWorkers ?? defaultMax;
      const size = Math.max(1, Math.min(requestedMax, defaultMax));
      const workerScript =
        parallel.workerScript ?? path.join(__dirname, 'advancedRulesWorker.js');
      const pool = new WorkerPool<Omit<RunRulesMessage, 'id'>, RunRulesResultPayload>({
        workerScript,
        size,
      });
      this.workerPool = pool;
      return pool;
    } catch (e) {
      logError(this.logger, 'Failed to init worker pool, falling back to in-process', e);
      this.workerPool = POOL_INIT_FAILED;
      return null;
    }
  }

  /**
   * worker 実行が全滅した等の致命的失敗を記録し、以降 in-process フォールバックさせる。
   */
  markFailed(): void {
    this.workerPool = POOL_INIT_FAILED;
  }

  /**
   * parallelExecution 設定（enabled / maxWorkers / workerScript）に差があれば
   * プールを作り直す（即時切り離し + バックグラウンド終了）。
   * 次回 ensure() で最新設定に基づき再生成（または無効化）される。
   */
  onConfigChanged(
    prev: ParallelExecutionConfig | undefined,
    next: ParallelExecutionConfig | undefined
  ): void {
    if (this.parallelConfigChanged(prev, next)) {
      this.reset();
    }
  }

  /**
   * parallelExecution 設定（enabled / maxWorkers / workerScript）に差があるか。
   */
  private parallelConfigChanged(
    prev: ParallelExecutionConfig | undefined,
    next: ParallelExecutionConfig | undefined
  ): boolean {
    return (
      (prev?.enabled ?? false) !== (next?.enabled ?? false) ||
      (prev?.maxWorkers ?? 0) !== (next?.maxWorkers ?? 0) ||
      (prev?.workerScript ?? '') !== (next?.workerScript ?? '')
    );
  }

  /**
   * worker pool を即座に切り離し、バックグラウンドで終了させる。
   */
  private reset(): void {
    const pool = this.workerPool;
    this.workerPool = null;
    if (pool && pool !== POOL_INIT_FAILED) {
      pool.shutdown().catch(() => undefined);
    }
  }

  /**
   * worker pool を停止する。テストや LSP サーバの shutdown 時に呼ぶ。
   */
  async shutdown(): Promise<void> {
    const pool = this.workerPool;
    if (pool && pool !== POOL_INIT_FAILED) {
      await pool.shutdown();
    }
    this.workerPool = null;
  }

  /**
   * worker pool が現在アクティブ（起動済みかつ未破棄）かどうか。テスト・診断用。
   */
  isActive(): boolean {
    return this.workerPool !== null && this.workerPool !== POOL_INIT_FAILED;
  }
}

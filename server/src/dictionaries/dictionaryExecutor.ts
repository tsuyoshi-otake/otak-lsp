import * as path from 'path';
import { ConcurrencyLimiter } from '../utils/concurrencyLimiter';
import { WorkerPool } from '../workers/workerPool';
import type { DictionaryWorkerRequest, DictionaryWorkerResult } from '../workers/dictionaryWorker';
import type { SpellWorkerRequest, SpellWorkerResult } from '../workers/spellCheck';

// この境界の全インスタンスで実Workerを最大2つに制限する。
const limiter = new ConcurrencyLimiter(() => 2);
const MAX_PENDING = 8;
const MAX_DIAGNOSTICS = 1000;

/** 辞書の正規表現を隔離し、失敗時に同期実行へフォールバックしない。 */
export class DictionaryExecutor {
  constructor(
    private readonly workerScript = path.join(__dirname, 'dictionaryWorker.js'),
    private readonly deadlineMs = 5000,
  ) {
    if (!Number.isFinite(deadlineMs) || deadlineMs <= 0 || deadlineMs > 2_147_483_647) {
      throw new Error('Invalid dictionary execution deadline');
    }
  }

  run(request: Omit<DictionaryWorkerRequest, 'maxDiagnostics'>): Promise<DictionaryWorkerResult> {
    return this.execute<DictionaryWorkerRequest, DictionaryWorkerResult>({ ...request, maxDiagnostics: MAX_DIAGNOSTICS });
  }

  runSpell(request: Omit<SpellWorkerRequest, 'maxDiagnostics'>): Promise<SpellWorkerResult> {
    return this.execute<SpellWorkerRequest, SpellWorkerResult>({ ...request, maxDiagnostics: MAX_DIAGNOSTICS });
  }

  private execute<TRequest, TResult>(request: TRequest): Promise<TResult> {
    if (limiter.activeCount >= 2 && limiter.pendingCount >= MAX_PENDING) {
      return Promise.reject(new Error('Dictionary execution queue is full'));
    }
    const deadline = Date.now() + this.deadlineMs;
    return new Promise((resolve, reject) => {
      let expired = false;
      const timer = setTimeout(() => {
        expired = true;
        reject(new Error('Dictionary execution timed out while queued'));
      }, this.deadlineMs);
      void limiter.run(async () => {
        if (expired) return undefined;
        clearTimeout(timer);
        const remaining = deadline - Date.now();
        if (remaining <= 0) throw new Error('Dictionary execution timed out while queued');
        const pool = new WorkerPool<TRequest, TResult>({
          workerScript: this.workerScript,
          size: 1,
          requestTimeoutMs: remaining,
        });
        try {
          return await pool.submit(request);
        } finally {
          await pool.shutdown();
        }
      }).then(result => {
        if (!expired && result !== undefined) resolve(result);
      }, error => {
        if (!expired) reject(error);
      }).finally(() => clearTimeout(timer));
    });
  }
}

/**
 * WorkerPool Tests
 * Feature: parallel-advanced-rules
 *
 * テスト戦略:
 * - 実 worker (worker_threads) を起動するため、一時ディレクトリに JS worker スクリプトを書き出して
 *   そのパスを WorkerPool に渡す。ts-jest はソースコード変換しか出来ないので、worker は
 *   素の JS で用意するのがシンプル。
 * - 起動・shutdown / 並行 submit / クラッシュ時 reject / closed 状態の挙動 をカバーする。
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { buildSync } from 'esbuild';

import { WorkerPool } from './workerPool';
import { WorkerPoolManager } from './workerPoolManager';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { MeCabAnalyzer } from '../mecab/analyzer';
import * as fc from 'fast-check';

const TEST_TIMEOUT_MS = 10_000;

/**
 * 「受け取った message.payload を 2 倍にして返す」だけの worker。
 * { type: 'crash' } を投げると process.exit(1) する。
 */
const ECHO_WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
parentPort.on('message', (msg) => {
  const { id, payload, type } = msg;
  if (type === 'crash') {
    process.exit(1);
  }
  // 非同期で返すことで複数 worker の並行性をテストしやすくする
  setImmediate(() => {
    parentPort.postMessage({ id, result: payload * 2 });
  });
});
`;

/**
 * 受信メッセージに対して error を返す worker (idempotent な失敗テスト用)。
 */
const ERROR_WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
parentPort.on('message', (msg) => {
  parentPort.postMessage({ id: msg.id, error: 'simulated worker error' });
});
`;

const HANG_WORKER_SOURCE = `
const { parentPort } = require('worker_threads');
parentPort.on('message', msg => {
  if (msg.type === 'exit-cleanly') process.exit(0);
  // Keep the worker alive while deliberately never responding.
  setInterval(() => {}, 1000);
});
`;

let tempDir: string;
let echoWorkerPath: string;
let errorWorkerPath: string;
let hangWorkerPath: string;
let advancedWorkerPath: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-lsp-worker-pool-test-'));
  echoWorkerPath = path.join(tempDir, 'echoWorker.js');
  errorWorkerPath = path.join(tempDir, 'errorWorker.js');
  hangWorkerPath = path.join(tempDir, 'hangWorker.js');
  advancedWorkerPath = path.join(tempDir, 'advancedRulesWorker.js');
  fs.writeFileSync(echoWorkerPath, ECHO_WORKER_SOURCE);
  fs.writeFileSync(errorWorkerPath, ERROR_WORKER_SOURCE);
  fs.writeFileSync(hangWorkerPath, HANG_WORKER_SOURCE);
  buildSync({
    entryPoints: [path.resolve(__dirname, 'advancedRulesWorker.ts')],
    bundle: true, format: 'cjs', platform: 'node', outfile: advancedWorkerPath,
    external: ['vscode', 'kuromoji'], logLevel: 'silent',
  });
});

afterAll(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('WorkerPool', () => {
  it('無応答workerと待機中の要求を期限内に失敗させる', async () => {
    const options = { workerScript: hangWorkerPath, size: 1, requestTimeoutMs: 150 };
    const pool = new WorkerPool<{ type: string }, number>(options);
    try {
      const results = Promise.allSettled([pool.submit({ type: 'hang' }), pool.submit({ type: 'hang' })]);
      const observed = await Promise.race([results, new Promise<'deadline'>(resolve => setTimeout(() => resolve('deadline'), 1000))]);
      expect(observed).not.toBe('deadline');
      expect(observed).toEqual([expect.objectContaining({ status: 'rejected' }), expect.objectContaining({ status: 'rejected' })]);
      if (observed !== 'deadline') {
        expect(observed.every(result => result.status === 'rejected' && /timed out/.test(String(result.reason)))).toBe(true);
      }
      expect(pool.isClosed()).toBe(true);
    } finally {
      await pool.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('処理中のworkerが正常終了しても要求を失敗させる', async () => {
    const pool = new WorkerPool<{ type: string }, number>({ workerScript: hangWorkerPath, size: 1 });
    try {
      const result = pool.submit({ type: 'exit-cleanly' }).then(() => 'resolved', () => 'rejected');
      const observed = await Promise.race([result, new Promise<'deadline'>(resolve => setTimeout(() => resolve('deadline'), 1000))]);
      expect(observed).toBe('rejected');
    } finally {
      await pool.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('古いpoolの失敗通知は設定変更後の新しいpoolを無効化しない', async () => {
    const manager = new WorkerPoolManager();
    const firstConfig = { enabled: true, maxWorkers: 1, workerScript: echoWorkerPath };
    const secondConfig = { ...firstConfig, maxWorkers: 2 };
    const first = manager.ensure(firstConfig)!;
    let second: typeof first | null = null;
    try {
      manager.onConfigChanged(firstConfig, secondConfig);
      second = manager.ensure(secondConfig);
      expect(second).not.toBeNull();
      (manager.markFailed as (pool: typeof first) => void)(first);
      expect(manager.ensure(secondConfig)).toBe(second);
      expect(second?.isClosed()).toBe(false);
    } finally {
      await first.shutdown();
      if (second) await second.shutdown();
      await manager.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('現在のpoolが失敗したら終了し、設定変更まで再試行せず、変更後は復旧する', async () => {
    const manager = new WorkerPoolManager();
    const firstConfig = { enabled: true, maxWorkers: 1, workerScript: hangWorkerPath };
    const nextConfig = { ...firstConfig, workerScript: echoWorkerPath };
    const pool = manager.ensure(firstConfig)!;
    try {
      const pending = pool.submit({} as Parameters<typeof pool.submit>[0]);
      const outcome = pending.then(() => 'resolved', () => 'rejected');
      manager.markFailed(pool);
      expect(await outcome).toBe('rejected');
      expect(pool.isClosed()).toBe(true);
      expect(manager.ensure(firstConfig)).toBeNull();
      manager.onConfigChanged(firstConfig, nextConfig);
      const next = manager.ensure(nextConfig);
      expect(next).not.toBeNull();
      expect(next).not.toBe(pool);
    } finally {
      await manager.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('実行中に設定を変えても古い失敗は新しい実workerの診断を妨げない', async () => {
    const manager = new AdvancedRulesManager({
      parallelExecution: { enabled: true, maxWorkers: 1, workerScript: hangWorkerPath },
    });
    try {
      const text = '容量は10GBです。';
      const tokens = await new MeCabAnalyzer().analyze(text);
      const expected = await manager.checkTextAsync(text, tokens);
      expect(expected.some(d => d.code === 'space-around-unit')).toBe(true);
      const oldResult = manager.checkTextParallel(text, tokens);
      manager.updateConfig({ parallelExecution: {
        enabled: true, maxWorkers: 1, workerScript: advancedWorkerPath,
      } });
      const newResult = manager.checkTextParallel(text, tokens);
      const [oldDiagnostics, newDiagnostics] = await Promise.all([oldResult, newResult]);
      expect(oldDiagnostics).toEqual(expected);
      expect(newDiagnostics).toEqual(expected);
      expect(manager.hasActiveWorkerPool()).toBe(true);
    } finally {
      await manager.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('複製できない入力の失敗後もworkerは正常な要求を処理する', async () => {
    const pool = new WorkerPool<{ payload: unknown }, number>({ workerScript: echoWorkerPath, size: 1 });
    try {
      await expect(pool.submit({ payload: () => 1 })).rejects.toThrow();
      await expect(pool.submit({ payload: 7 })).resolves.toBe(14);
    } finally {
      await pool.shutdown();
    }
  }, TEST_TIMEOUT_MS);

  it('worker終了失敗はmanagerのshutdownから観測できる', async () => {
    const original = Worker.prototype.terminate;
    const termination = jest.spyOn(Worker.prototype, 'terminate').mockImplementation(function (this: Worker) {
      // 実workerは終了したうえでエラーを注入し、テスト後にプロセスを残さない。
      return original.call(this).then(() => { throw new Error('termination failure'); });
    });
    const manager = new WorkerPoolManager();
    const config = { enabled: true, maxWorkers: 1, workerScript: echoWorkerPath };
    const pool = manager.ensure(config)!;
    try {
      const pending = pool.submit({ payload: 2 } as unknown as Parameters<typeof pool.submit>[0]);
      await pending;
      manager.markFailed(pool);
      await expect(manager.shutdown()).rejects.toThrow('termination failure');
    } finally {
      termination.mockRestore();
    }
  }, TEST_TIMEOUT_MS);

  it('生成した送信と終了の履歴で、実poolが正常進行と終了後の拒否を守る', async () => {
    const command = fc.oneof(
      fc.integer({ min: -100, max: 100 }).map(value => ({ type: 'submit' as const, value })),
      fc.constant({ type: 'shutdown' as const })
    );
    await fc.assert(fc.asyncProperty(fc.array(command, { minLength: 1, maxLength: 6 }), async commands => {
      const pool = new WorkerPool<{ payload: number }, number>({ workerScript: echoWorkerPath, size: 1 });
      let closed = false;
      try {
        for (const operation of commands) {
          if (operation.type === 'shutdown') {
            await pool.shutdown();
            closed = true;
          } else if (closed) {
            await expect(pool.submit({ payload: operation.value })).rejects.toThrow(/closed/i);
          } else {
            await expect(pool.submit({ payload: operation.value })).resolves.toBe(operation.value * 2);
          }
          expect(pool.isClosed()).toBe(closed);
        }
      } finally {
        await pool.shutdown();
      }
    }), { numRuns: 20, seed: 20261027 });
  }, TEST_TIMEOUT_MS);

  it('実際の無応答workerから30秒で文法診断へフォールバックする', async () => {
    const manager = new AdvancedRulesManager({
      parallelExecution: { enabled: true, maxWorkers: 1, workerScript: hangWorkerPath },
    });
    try {
      const text = '容量は10GBです。';
      const tokens = await new MeCabAnalyzer().analyze(text);
      const expected = await manager.checkTextAsync(text, tokens);
      expect(expected.some(d => d.code === 'space-around-unit')).toBe(true);
      const started = Date.now();
      const actual = await manager.checkTextParallel(text, tokens);
      expect(Date.now() - started).toBeLessThan(35_000);
      expect(actual).toEqual(expected);
      expect(manager.hasActiveWorkerPool()).toBe(false);
      await expect(manager.checkTextParallel(text, tokens)).resolves.toEqual(expected);
    } finally {
      await manager.shutdown();
    }
  }, 40_000);
  it(
    'lazy init: 起動は最初の submit のとき',
    async () => {
      const pool = new WorkerPool<{ type?: string; payload: number }, number>({
        workerScript: echoWorkerPath,
        size: 2,
      });
      expect(pool.isInitialized()).toBe(false);
      const result = await pool.submit({ payload: 7 });
      expect(pool.isInitialized()).toBe(true);
      expect(result).toBe(14);
      await pool.shutdown();
    },
    TEST_TIMEOUT_MS
  );

  it(
    '複数 request を同時に投げても全件結果が返る',
    async () => {
      const pool = new WorkerPool<{ payload: number }, number>({
        workerScript: echoWorkerPath,
        size: 3,
      });
      const inputs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const results = await Promise.all(inputs.map((p) => pool.submit({ payload: p })));
      expect(results).toEqual(inputs.map((x) => x * 2));
      await pool.shutdown();
    },
    TEST_TIMEOUT_MS
  );

  it(
    'shutdown 後の submit は reject される',
    async () => {
      const pool = new WorkerPool<{ payload: number }, number>({
        workerScript: echoWorkerPath,
        size: 2,
      });
      await pool.submit({ payload: 1 });
      await pool.shutdown();
      expect(pool.isClosed()).toBe(true);
      await expect(pool.submit({ payload: 99 })).rejects.toThrow(/closed/i);
    },
    TEST_TIMEOUT_MS
  );

  it(
    'worker から error 応答 (.error フィールド) を受けたら個別 reject',
    async () => {
      const pool = new WorkerPool<{ payload: number }, number>({
        workerScript: errorWorkerPath,
        size: 1,
      });
      await expect(pool.submit({ payload: 1 })).rejects.toThrow('simulated worker error');
      await pool.shutdown();
    },
    TEST_TIMEOUT_MS
  );

  it(
    'worker が process.exit(1) でクラッシュしたら、その worker の pending を reject',
    async () => {
      const pool = new WorkerPool<{ type?: string; payload: number }, number>({
        workerScript: echoWorkerPath,
        size: 1, // 1 つだけにして「全 worker 死亡」を再現
      });
      // まず通常 request 1 件
      const ok = await pool.submit({ payload: 2 });
      expect(ok).toBe(4);

      // crash request -> reject 期待
      await expect(pool.submit({ type: 'crash', payload: 0 })).rejects.toThrow();

      // 全 worker 死んでいるので、追加 submit は reject
      await expect(pool.submit({ payload: 5 })).rejects.toThrow();

      await pool.shutdown();
    },
    TEST_TIMEOUT_MS
  );

  it(
    'liveWorkerCount は spawn 後に size になる',
    async () => {
      const pool = new WorkerPool<{ payload: number }, number>({
        workerScript: echoWorkerPath,
        size: 3,
      });
      // submit するまで spawn しない
      expect(pool.liveWorkerCount()).toBe(0);
      await pool.submit({ payload: 1 });
      expect(pool.liveWorkerCount()).toBe(3);
      await pool.shutdown();
      expect(pool.liveWorkerCount()).toBe(0);
    },
    TEST_TIMEOUT_MS
  );

  it('size < 1 は constructor で reject', () => {
    expect(() => new WorkerPool({ workerScript: echoWorkerPath, size: 0 })).toThrow();
    expect(() => new WorkerPool({ workerScript: echoWorkerPath, size: -1 })).toThrow();
  });
});

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

import { WorkerPool } from './workerPool';

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

let tempDir: string;
let echoWorkerPath: string;
let errorWorkerPath: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'otak-lsp-worker-pool-test-'));
  echoWorkerPath = path.join(tempDir, 'echoWorker.js');
  errorWorkerPath = path.join(tempDir, 'errorWorker.js');
  fs.writeFileSync(echoWorkerPath, ECHO_WORKER_SOURCE);
  fs.writeFileSync(errorWorkerPath, ERROR_WORKER_SOURCE);
});

afterAll(() => {
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // ignore
  }
});

describe('WorkerPool', () => {
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

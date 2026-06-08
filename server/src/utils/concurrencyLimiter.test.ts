/**
 * ConcurrencyLimiter Tests
 */

import { ConcurrencyLimiter, DEFAULT_MAX_CONCURRENT_ANALYSES } from './concurrencyLimiter';

/** 外部から解決できる Deferred を作るヘルパー。 */
function deferred<T = void>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

/**
 * 保留中のマイクロタスクを確実に流す。
 * acquire→task→release→次の waiter 起床→task と数ホップ挟むため、
 * 固定回数の `await Promise.resolve()` ではなくマクロタスク境界で全消化する。
 */
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('ConcurrencyLimiter', () => {
  it('上限までは同時に実行し、超過分はスロットが空くまで待たせる', async () => {
    const limiter = new ConcurrencyLimiter(() => 2);
    const gates = [deferred(), deferred(), deferred()];
    let started = 0;

    const tasks = gates.map((g) =>
      limiter.run(async () => {
        started++;
        await g.promise;
      })
    );

    // マイクロタスクを一巡させる
    await tick();

    // 上限 2 なので 2 件だけ走り、3 件目は待機
    expect(started).toBe(2);
    expect(limiter.activeCount).toBe(2);
    expect(limiter.pendingCount).toBe(1);

    // 1 件完了させると 3 件目が動く
    gates[0].resolve();
    await tick();
    expect(started).toBe(3);

    gates[1].resolve();
    gates[2].resolve();
    await Promise.all(tasks);
    expect(limiter.activeCount).toBe(0);
    expect(limiter.pendingCount).toBe(0);
  });

  it('決して上限を超えて同時実行しない（多数タスクでピーク同時数を観測）', async () => {
    const MAX = 3;
    const limiter = new ConcurrencyLimiter(() => MAX);
    let current = 0;
    let peak = 0;

    const run = (i: number) =>
      limiter.run(async () => {
        current++;
        peak = Math.max(peak, current);
        // 数マイクロタスク分滞留させる
        await Promise.resolve();
        await Promise.resolve();
        current--;
        return i;
      });

    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => run(i)));
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i));
    expect(peak).toBeLessThanOrEqual(MAX);
    expect(peak).toBeGreaterThan(0);
  });

  it('タスクが例外を投げてもスロットを返し、後続が詰まらない', async () => {
    const limiter = new ConcurrencyLimiter(() => 1);

    await expect(
      limiter.run(async () => {
        throw new Error('boom');
      })
    ).rejects.toThrow('boom');

    expect(limiter.activeCount).toBe(0);

    // 後続は正常に実行できる
    const ok = await limiter.run(async () => 42);
    expect(ok).toBe(42);
    expect(limiter.activeCount).toBe(0);
  });

  it('上限を動的に引き上げると、待機中タスクが追加で動ける', async () => {
    let max = 1;
    const limiter = new ConcurrencyLimiter(() => max);
    const gates = [deferred(), deferred()];
    let started = 0;

    const tasks = gates.map((g) =>
      limiter.run(async () => { started++; await g.promise; })
    );

    await tick();
    expect(started).toBe(1); // 上限 1

    // 上限を上げてから 1 件完了 → release 時に待機者が起きる
    max = 2;
    gates[0].resolve();
    await tick();
    expect(started).toBe(2);

    gates[1].resolve();
    await Promise.all(tasks);
  });

  it('非有限・1 未満の上限は 1 に丸める', async () => {
    const limiter = new ConcurrencyLimiter(() => 0);
    const gates = [deferred(), deferred()];
    let started = 0;
    const tasks = gates.map((g) => limiter.run(async () => { started++; await g.promise; }));

    await tick();
    expect(started).toBe(1);

    gates[0].resolve();
    await tick();
    expect(started).toBe(2);
    gates[1].resolve();
    await Promise.all(tasks);
  });

  it('既定の同時解析数は正の整数', () => {
    expect(Number.isInteger(DEFAULT_MAX_CONCURRENT_ANALYSES)).toBe(true);
    expect(DEFAULT_MAX_CONCURRENT_ANALYSES).toBeGreaterThanOrEqual(1);
  });
});

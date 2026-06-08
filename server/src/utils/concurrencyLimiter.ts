/**
 * ConcurrencyLimiter
 *
 * 非同期タスクの同時実行数を上限化する async セマフォ。
 *
 * 解析パイプライン自体は 1 文書単位ではメモリ有界だが、設定変更や大量 didOpen で
 * 「開いている全ドキュメントを一斉に解析」するとファンアウトが無制限になり、
 * ピーク時のヒープ使用量が `文書数 × 1 文書あたりのコスト` に膨らみ得る。
 *
 * この limiter で同時実行数を K に抑えることで、ピークを構造的に
 * `K × 1 文書あたりのコスト` に有界化する（メモリ安全のための主要機構）。
 *
 * 上限は固定値ではなく getMax プロバイダ経由で都度参照するため、
 * 実行中に設定（maxConcurrentAnalyses）が変わっても次の acquire から反映される。
 * 上限を下げた場合は、超過分の実行中タスクが自然に drain してから新規が動く。
 */
export class ConcurrencyLimiter {
  private active = 0;
  private readonly waiters: Array<() => void> = [];

  /**
   * @param getMax 現在の同時実行上限を返すプロバイダ。1 未満・非有限は 1 に丸める。
   */
  constructor(private readonly getMax: () => number) {}

  private get max(): number {
    const m = this.getMax();
    return Number.isFinite(m) && m >= 1 ? Math.floor(m) : 1;
  }

  /**
   * スロットを取得してから task を実行し、完了（成功/失敗）後に必ずスロットを返す。
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < this.max) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private release(): void {
    this.active = Math.max(0, this.active - 1);
    // 上限に空きがあり、待機者がいれば 1 件だけ起こす。
    if (this.waiters.length > 0 && this.active < this.max) {
      const next = this.waiters.shift();
      next?.();
    }
  }

  /** 実行中のタスク数（診断・テスト用）。 */
  get activeCount(): number {
    return this.active;
  }

  /** スロット待ちのタスク数（診断・テスト用）。 */
  get pendingCount(): number {
    return this.waiters.length;
  }
}

/**
 * 同時解析数の既定値。
 *
 * 多数の小さな文書では実質ボトルネックにならず、巨大文書が複数開かれている
 * ケースでもピークメモリを構造的に抑えるバランス値。
 */
export const DEFAULT_MAX_CONCURRENT_ANALYSES = 4;

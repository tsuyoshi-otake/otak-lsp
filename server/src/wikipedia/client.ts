/**
 * Wikipedia API Client
 * Wikipedia APIとの通信を管理し、サマリー情報を取得する
 * Feature: japanese-grammar-analyzer
 * 要件: 5.4, 5.5
 */

import { isBlank } from '../utils/stringUtils';
import { ConcurrencyLimiter } from '../utils/concurrencyLimiter';

/**
 * デフォルト設定値
 */
const DEFAULT_TIMEOUT_MS = 5000; // 5秒
const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24時間
const DEFAULT_MAX_CACHE_SIZE = 1000; // 最大キャッシュエントリ数

/**
 * Wikipedia APIレスポンス
 */
interface WikipediaResponse {
  type?: string;
  extract?: string;
  title?: string;
  description?: string;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  value: string;
  timestamp: number;
}

interface RetryState {
  until: number;
  failures: number;
}

/**
 * フェッチ関数の型
 */
type FetchFunction = (url: string, options: RequestInit) => Promise<Response>;

/**
 * Wikipedia API クライアント
 * 日本語Wikipediaからサマリー情報を取得する
 */
export class WikipediaClient {
  private cache: Map<string, CacheEntry> = new Map();
  private inFlight: Map<string, Promise<string | null>> = new Map();
  private cacheGeneration: number = 0;
  private fetchFn: FetchFunction;
  private timeoutMs: number = DEFAULT_TIMEOUT_MS;
  private cacheTTL: number = DEFAULT_CACHE_TTL_MS;
  private maxCacheSize: number = DEFAULT_MAX_CACHE_SIZE;
  private retryStates = new Map<string, RetryState>();
  private rateLimitUntil = 0;
  private readonly requestLimiter = new ConcurrencyLimiter(() => 4);

  private static readonly BASE_URL = 'https://ja.wikipedia.org/api/rest_v1/page/summary';
  private static readonly USER_AGENT = 'JapaneseGrammarAnalyzer/1.0 (VSCode Extension)';

  constructor() {
    // デフォルトではglobal fetchを使用
    this.fetchFn = (url: string, options: RequestInit) => {
      // Node.js 18以降は組み込みfetchを使用、それ以前はPolyfillが必要
      if (typeof globalThis.fetch === 'function') {
        return globalThis.fetch(url, options);
      }
      // テスト用のフォールバック
      return Promise.reject(new Error('Fetch not available'));
    };
  }

  /**
   * テスト用: フェッチ関数を設定
   */
  setFetch(fn: FetchFunction): void {
    this.fetchFn = fn;
  }

  /**
   * テスト用: タイムアウトを設定
   */
  setTimeout(ms: number): void {
    this.timeoutMs = ms;
  }

  /**
   * テスト用: キャッシュTTLを設定
   */
  setCacheTTL(ms: number): void {
    this.cacheTTL = ms;
  }

  /**
   * テスト用: 最大キャッシュサイズを設定
   */
  setMaxCacheSize(size: number): void {
    this.maxCacheSize = size;
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheGeneration += 1;
    this.inFlight.clear();
  }

  /**
   * キャッシュ済みのWikipediaサマリーを取得（同期）
   * - ホバーなど「即時応答が必要」な用途向け
   * - キャッシュが無い場合はnull
   */
  getCachedSummary(term: string): string | null {
    if (isBlank(term)) {
      return null;
    }
    return this.getFromCache(term.trim());
  }

  /**
   * Wikipediaサマリーをバックグラウンドで事前取得
   * - 取得完了後にキャッシュへ保存（成功時のみ）
   * - 既にキャッシュ済み/取得中の場合は何もしない
   */
  prefetchSummary(term: string): void {
    if (isBlank(term)) {
      return;
    }

    const normalizedTerm = term.trim();
    const cached = this.getFromCache(normalizedTerm);
    if (cached !== null) {
      return;
    }

    if (this.inFlight.has(normalizedTerm)) {
      return;
    }

    this.startFetch(normalizedTerm);
  }

  /**
   * Wikipedia APIからサマリーを取得
   * @param term 検索語
   * @returns サマリーテキスト、または取得できない場合はnull
   */
  async getSummary(term: string): Promise<string | null> {
    // 空文字チェック
    if (isBlank(term)) {
      return null;
    }

    const normalizedTerm = term.trim();

    // キャッシュチェック
    const cached = this.getFromCache(normalizedTerm);
    if (cached !== null) {
      return cached;
    }

    const existing = this.inFlight.get(normalizedTerm);
    if (existing) {
      return await existing;
    }

    return await this.startFetch(normalizedTerm);
  }

  private startFetch(term: string): Promise<string | null> {
    const generation = this.cacheGeneration;

    const promise: Promise<string | null> = this.requestLimiter.run(async () => {
      if (Date.now() < this.rateLimitUntil || Date.now() < (this.retryStates.get(term)?.until ?? 0)) {
        return null;
      }
      return this.fetchSummary(term);
    })
      .then((summary) => {
        if (summary !== null && generation === this.cacheGeneration) {
          this.retryStates.delete(term);
          this.setToCache(term, summary);
        }
        return summary;
      })
      .catch(() => null)
      .finally(() => {
        const current = this.inFlight.get(term);
        if (current === promise) {
          this.inFlight.delete(term);
        }
      });

    this.inFlight.set(term, promise);
    return promise;
  }

  /** 自動再試行はせず、次回ホバーからの再要求をバックオフする。 */
  private deferRetry(term: string, minimumDelay = 0): number {
    const failures = (this.retryStates.get(term)?.failures ?? 0) + 1;
    const delay = Math.max(minimumDelay, Math.min(60_000, 1_000 * 2 ** Math.min(failures - 1, 6)) * (1 + Math.random() * 0.25));
    const until = Date.now() + delay;
    this.retryStates.delete(term);
    if (this.retryStates.size >= DEFAULT_MAX_CACHE_SIZE) {
      const oldest = this.retryStates.keys().next().value;
      if (oldest !== undefined) this.retryStates.delete(oldest);
    }
    this.retryStates.set(term, { until, failures });
    return until;
  }

  /**
   * キャッシュから取得
   */
  private getFromCache(term: string): string | null {
    const entry = this.cache.get(term);
    if (!entry) {
      return null;
    }

    // TTLチェック
    const now = Date.now();
    if (now - entry.timestamp > this.cacheTTL) {
      this.cache.delete(term);
      return null;
    }

    // LRU: アクセスされたエントリを最新に移動
    this.cache.delete(term);
    this.cache.set(term, entry);

    return entry.value;
  }

  /**
   * キャッシュに保存
   */
  private setToCache(term: string, value: string): void {
    // 最大サイズチェック
    if (this.cache.size >= this.maxCacheSize) {
      // 最も古いエントリを削除（LRU）
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(term, {
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Wikipedia APIからサマリーを取得（内部）
   */
  private async fetchSummary(term: string): Promise<string | null> {
    const url = `${WikipediaClient.BASE_URL}/${encodeURIComponent(term)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: 'GET',
        headers: {
          'User-Agent': WikipediaClient.USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        const retryAfter = response.headers?.get('Retry-After');
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        const retryAt = retryAfter ? Date.parse(retryAfter) : NaN;
        const minimumDelay = Number.isFinite(seconds)
          ? Math.max(0, seconds * 1000)
          : Number.isFinite(retryAt) ? Math.max(0, retryAt - Date.now()) : 0;
        const until = this.deferRetry(term, response.status === 404 ? 300_000 : minimumDelay);
        if (response.status === 429) {
          this.rateLimitUntil = Math.max(this.rateLimitUntil, until);
        }
        await response.body?.cancel();
        return null;
      }

      const data = await response.json() as WikipediaResponse;

      // 記事が見つからない場合
      if (data.type && data.type.includes('not_found')) {
        this.deferRetry(term, 300_000);
        return null;
      }

      // extractフィールドがサマリーテキスト
      if (!data.extract) this.deferRetry(term, 60_000);
      return data.extract ?? null;
    } catch {
      this.deferRetry(term);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

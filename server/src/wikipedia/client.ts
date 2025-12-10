/**
 * Wikipedia API Client
 * Wikipedia APIとの通信を管理し、サマリー情報を取得する
 * Feature: japanese-grammar-analyzer
 * 要件: 5.4, 5.5
 */

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
  private fetchFn: FetchFunction;
  private timeoutMs: number = 5000;
  private cacheTTL: number = 24 * 60 * 60 * 1000; // 24時間
  private maxCacheSize: number = 1000;

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
  }

  /**
   * Wikipedia APIからサマリーを取得
   * @param term 検索語
   * @returns サマリーテキスト、または取得できない場合はnull
   */
  async getSummary(term: string): Promise<string | null> {
    // 空文字チェック
    if (!term || term.trim() === '') {
      return null;
    }

    const normalizedTerm = term.trim();

    // キャッシュチェック
    const cached = this.getFromCache(normalizedTerm);
    if (cached !== null) {
      return cached;
    }

    try {
      const summary = await this.fetchSummary(normalizedTerm);
      if (summary !== null) {
        this.setToCache(normalizedTerm, summary);
      }
      return summary;
    } catch {
      return null;
    }
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

      clearTimeout(timeoutId);

      if (!response.ok) {
        // レート制限またはその他のエラー
        return null;
      }

      const data = await response.json() as WikipediaResponse;

      // 記事が見つからない場合
      if (data.type && data.type.includes('not_found')) {
        return null;
      }

      // extractフィールドがサマリーテキスト
      return data.extract || null;
    } catch {
      clearTimeout(timeoutId);
      return null;
    }
  }
}

/**
 * Language Server
 * LSPサーバーのコア機能を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 1.4, 7.1, 7.3
 */

import { Token, Configuration } from '../../../shared/src/types';

/**
 * 解析結果
 */
export interface AnalysisResult {
  uri: string;
  version: number;
  tokens: Token[];
  timestamp: number;
}

/**
 * ドキュメント情報
 */
interface DocumentInfo {
  uri: string;
  text: string;
  version: number;
  languageId?: string;
}

/**
 * 解析結果キャッシュ（LRU）
 */
export class AnalysisCache {
  private cache: Map<string, AnalysisResult> = new Map();
  private maxSize: number;

  constructor(maxSize: number = 100) {
    this.maxSize = maxSize;
  }

  /**
   * キャッシュから取得（LRU更新）
   */
  get(uri: string): AnalysisResult | undefined {
    const result = this.cache.get(uri);
    if (result) {
      // LRU: アクセスされたエントリを最新に移動
      this.cache.delete(uri);
      this.cache.set(uri, result);
    }
    return result;
  }

  /**
   * キャッシュに保存
   */
  set(uri: string, result: AnalysisResult): void {
    // 既存エントリを削除（LRU順序のため）
    this.cache.delete(uri);

    // 最大サイズチェック
    if (this.cache.size >= this.maxSize) {
      // 最も古いエントリを削除
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(uri, result);
  }

  /**
   * キャッシュから削除
   */
  delete(uri: string): void {
    this.cache.delete(uri);
  }

  /**
   * キャッシュをクリア
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * キャッシュが古いかどうかを判定
   */
  isStale(uri: string, currentVersion: number): boolean {
    const cached = this.cache.get(uri);
    if (!cached) {
      return true;
    }
    return cached.version < currentVersion;
  }
}

/**
 * デバウンスタイマー管理
 */
interface DebouncedTimers {
  [key: string]: ReturnType<typeof setTimeout> | undefined;
}

/**
 * Language Server
 * LSPサーバーのコア機能を管理する
 */
export class LanguageServer {
  private documents: Map<string, DocumentInfo> = new Map();
  private analysisCache: AnalysisCache;
  private debouncedTimers: DebouncedTimers = {};
  private configuration: Configuration;

  constructor() {
    this.analysisCache = new AnalysisCache(100);
    this.configuration = this.getDefaultConfiguration();
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfiguration(): Configuration {
    return {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
      debounceDelay: 500
    };
  }

  /**
   * 設定を取得
   */
  getConfiguration(): Configuration {
    return { ...this.configuration };
  }

  /**
   * 設定を更新
   */
  updateConfiguration(config: Partial<Configuration>): void {
    this.configuration = {
      ...this.configuration,
      ...config
    };
  }

  /**
   * ドキュメントを開く
   */
  openDocument(uri: string, text: string, version: number, languageId?: string): void {
    this.documents.set(uri, {
      uri,
      text,
      version,
      languageId
    });
  }

  /**
   * ドキュメントを閉じる
   */
  closeDocument(uri: string): void {
    this.documents.delete(uri);
    this.analysisCache.delete(uri);
    this.clearDebounceTimer(uri);
  }

  /**
   * ドキュメントを更新
   */
  updateDocument(uri: string, text: string, version: number): void {
    const doc = this.documents.get(uri);
    if (doc) {
      doc.text = text;
      doc.version = version;
    }
  }

  /**
   * ドキュメントが開いているか確認
   */
  isDocumentOpen(uri: string): boolean {
    return this.documents.has(uri);
  }

  /**
   * ドキュメントを取得
   */
  getDocument(uri: string): DocumentInfo | null {
    return this.documents.get(uri) || null;
  }

  /**
   * 解析キャッシュを取得
   */
  getAnalysisCache(): AnalysisCache {
    return this.analysisCache;
  }

  /**
   * デバウンスされたコールバックを作成
   */
  createDebouncedCallback<T>(
    callback: (arg: T) => void,
    delay: number
  ): (arg: T) => void {
    let timerId: ReturnType<typeof setTimeout> | undefined;

    return (arg: T) => {
      if (timerId) {
        clearTimeout(timerId);
      }

      timerId = setTimeout(() => {
        callback(arg);
        timerId = undefined;
      }, delay);
    };
  }

  /**
   * 特定URIのデバウンスタイマーをクリア
   */
  private clearDebounceTimer(uri: string): void {
    const timer = this.debouncedTimers[uri];
    if (timer) {
      clearTimeout(timer);
      delete this.debouncedTimers[uri];
    }
  }

  /**
   * ドキュメント解析をスケジュール（デバウンス付き）
   */
  scheduleAnalysis(uri: string, callback: () => void): void {
    this.clearDebounceTimer(uri);

    this.debouncedTimers[uri] = setTimeout(() => {
      callback();
      delete this.debouncedTimers[uri];
    }, this.configuration.debounceDelay);
  }
}

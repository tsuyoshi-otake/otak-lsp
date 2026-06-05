/**
 * Language Server
 * LSPサーバーのコア機能を提供する
 * Feature: japanese-grammar-analyzer, input-lag-improvement
 * 要件: 1.4, 7.1, 7.3, 3.1, 3.2, 3.3
 */

import { Token, Configuration, GLOSSARY_GROUPS } from '../../../shared/src/types';
import { DEFAULT_ENABLED_GLOSSARIES } from '../hover/glossary';
import { TextDocument } from 'vscode-languageserver-textdocument';

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
 * 解析状態インターフェース
 * Feature: input-lag-improvement
 * 要件: 3.1, 3.3
 */
export interface AnalysisState {
  /** 解析実行中フラグ */
  running: boolean;
  /** 待機中解析フラグ */
  pending: boolean;
  /** 最新の文書状態 */
  latestDocument: TextDocument | null;
  /** 最新の文書バージョン */
  latestVersion: number;
  /** 最後の変更時刻（ミリ秒） */
  lastChangeAt: number;
}

/**
 * 解析状態の初期値を生成
 */
export function createInitialAnalysisState(): AnalysisState {
  return {
    running: false,
    pending: false,
    latestDocument: null,
    latestVersion: 0,
    lastChangeAt: 0,
  };
}

/**
 * デバッグログ出力用のコールバック型
 * Feature: input-lag-improvement (タスク7)
 */
export type DebugLogCallback = (message: string) => void;

/**
 * 解析状態管理クラス
 * Feature: input-lag-improvement
 * 要件: 3.1, 3.2, 3.3
 */
export class AnalysisStateManager {
  private states: Map<string, AnalysisState> = new Map();
  private debugLogCallback: DebugLogCallback | null = null;

  /**
   * デバッグログ出力用のコールバックを設定
   * Feature: input-lag-improvement (タスク7)
   */
  setDebugLogCallback(callback: DebugLogCallback | null): void {
    this.debugLogCallback = callback;
  }

  /**
   * デバッグログを出力
   * Feature: input-lag-improvement (タスク7)
   */
  private debugLog(message: string): void {
    if (this.debugLogCallback) {
      this.debugLogCallback(message);
    }
  }

  /**
   * 解析状態を文字列で表現（デバッグ用）
   * Feature: input-lag-improvement (タスク7)
   */
  private formatStateForLog(state: AnalysisState): string {
    return `running=${state.running}, pending=${state.pending}, version=${state.latestVersion}`;
  }

  /**
   * 指定URIの解析状態を取得（存在しない場合は初期状態を作成）
   */
  getState(uri: string): AnalysisState {
    let state = this.states.get(uri);
    if (!state) {
      state = createInitialAnalysisState();
      this.states.set(uri, state);
      this.debugLog(`[STATE] Created initial state for ${uri}`);
    }
    return state;
  }

  /**
   * 指定URIの解析状態を更新
   */
  updateState(uri: string, updates: Partial<AnalysisState>): AnalysisState {
    const state = this.getState(uri);
    const previousState = this.formatStateForLog(state);
    const updatedState = { ...state, ...updates };
    this.states.set(uri, updatedState);
    const newState = this.formatStateForLog(updatedState);
    
    // 状態変化をログ出力（Feature: input-lag-improvement タスク7）
    if (previousState !== newState) {
      this.debugLog(`[STATE] Updated ${uri}: ${previousState} -> ${newState}`);
    }
    
    return updatedState;
  }

  /**
   * 指定URIの解析状態を削除
   * 要件: 3.2 - 文書クローズ時に状態を削除
   */
  deleteState(uri: string): boolean {
    const existed = this.states.has(uri);
    const result = this.states.delete(uri);
    if (existed) {
      this.debugLog(`[STATE] Deleted state for ${uri}`);
    }
    return result;
  }

  /**
   * 指定URIの解析状態が存在するか確認
   */
  hasState(uri: string): boolean {
    return this.states.has(uri);
  }

  /**
   * すべての解析状態をクリア
   */
  clear(): void {
    this.states.clear();
  }

  /**
   * 管理中の状態数を取得
   */
  size(): number {
    return this.states.size;
  }

  /**
   * すべてのURIを取得
   */
  getUris(): string[] {
    return Array.from(this.states.keys());
  }
}

/**
 * デフォルト設定値
 */
const DEFAULT_ANALYSIS_CACHE_SIZE = 100;

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

  constructor(maxSize: number = DEFAULT_ANALYSIS_CACHE_SIZE) {
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
  private analysisStateManager: AnalysisStateManager;
  private debouncedTimers: DebouncedTimers = {};
  private configuration: Configuration;

  constructor() {
    this.analysisCache = new AnalysisCache(DEFAULT_ANALYSIS_CACHE_SIZE);
    this.analysisStateManager = new AnalysisStateManager();
    this.configuration = this.getDefaultConfiguration();
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfiguration(): Configuration {
    return {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      enableProfileLogs: false,
      markdown: {
        analyzeCodeBlocks: false,
        analyzeTables: true,
      },
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
      debounceDelay: 250,
      excludeTableDelimiters: true,
      hover: {
        enableWikipedia: true,
        enableGlossary: true,
        enabledGlossaries: [...DEFAULT_ENABLED_GLOSSARIES],
        enabledGlossaryGroups: GLOSSARY_GROUPS.map(g => g.id),
      },
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
   * 要件: 3.2 - 文書クローズ時に解析状態を削除
   */
  closeDocument(uri: string): void {
    this.documents.delete(uri);
    this.analysisCache.delete(uri);
    this.analysisStateManager.deleteState(uri);
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
    return this.documents.get(uri) ?? null;
  }

  /**
   * 解析キャッシュを取得
   */
  getAnalysisCache(): AnalysisCache {
    return this.analysisCache;
  }

  /**
   * 解析状態マネージャーを取得
   * Feature: input-lag-improvement
   * 要件: 3.1
   */
  getAnalysisStateManager(): AnalysisStateManager {
    return this.analysisStateManager;
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

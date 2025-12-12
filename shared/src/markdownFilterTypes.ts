/**
 * マークダウンフィルタリング用型定義
 * Feature: markdown-document-filtering
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1
 */

/**
 * 除外タイプ
 */
export type ExcludeType =
  | 'code-block'
  | 'inline-code'
  | 'table'
  | 'url'
  | 'config-key'
  | 'heading'
  | 'list-marker'
  | 'custom';

/**
 * フィルタリング設定インターフェース
 */
export interface FilterConfig {
  /** コードブロック（```で囲まれた部分）を除外 */
  excludeCodeBlocks: boolean;
  /** インラインコード（`で囲まれた部分）を除外 */
  excludeInlineCode: boolean;
  /** マークダウンテーブルを除外 */
  excludeTables: boolean;
  /** URLを除外 */
  excludeUrls: boolean;
  /** 設定キー名（otakLcp.*など）を除外 */
  excludeConfigKeys: boolean;
  /** マークダウン見出し（# で始まる行）を除外 */
  excludeHeadings: boolean;
  /** リストマーカー（- * 1. など）の行を除外 */
  excludeListMarkers: boolean;
  /** カスタム除外パターン */
  customExcludePatterns: RegExp[];
  /** デバッグモード */
  debugMode: boolean;
}

/**
 * 除外されたテキスト範囲の情報
 */
export interface ExcludedRange {
  /** 開始位置（文字インデックス） */
  start: number;
  /** 終了位置（文字インデックス） */
  end: number;
  /** 除外タイプ */
  type: ExcludeType;
  /** 除外されたコンテンツ */
  content: string;
  /** 除外理由 */
  reason: string;
}

/**
 * デバッグ情報
 */
export interface DebugInfo {
  /** 処理時間（ミリ秒） */
  processingTimeMs: number;
  /** 除外された総文字数 */
  totalExcludedCharacters: number;
  /** タイプ別除外文字数 */
  excludedByType: Partial<Record<ExcludeType, number>>;
  /** ログメッセージ */
  logs: string[];
}

/**
 * フィルタリング結果インターフェース
 */
export interface FilterResult {
  /** フィルタリング後のテキスト */
  filteredText: string;
  /** 除外された範囲のリスト */
  excludedRanges: ExcludedRange[];
  /** 元のテキスト */
  originalText: string;
  /** デバッグ情報（オプション） */
  debugInfo?: DebugInfo;
}

/**
 * マークダウンフィルターインターフェース
 */
export interface IMarkdownFilter {
  /**
   * テキストをフィルタリング
   * @param text フィルタリング対象のテキスト
   * @param config フィルタリング設定（オプション）
   * @returns フィルタリング結果
   */
  filter(text: string, config?: FilterConfig): FilterResult;

  /**
   * 除外範囲を取得
   * @param text 対象テキスト
   * @param config フィルタリング設定（オプション）
   * @returns 除外範囲のリスト
   */
  getExcludedRanges(text: string, config?: FilterConfig): ExcludedRange[];
}

/**
 * フィルタリングエラー
 */
export class FilterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly position?: number
  ) {
    super(message);
    this.name = 'FilterError';
  }
}

/**
 * デフォルトのフィルタリング設定
 */
export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  excludeCodeBlocks: true,
  excludeInlineCode: true,
  excludeTables: true,
  excludeUrls: true,
  excludeConfigKeys: true,
  excludeHeadings: true,
  excludeListMarkers: true,
  customExcludePatterns: [],
  debugMode: false
};

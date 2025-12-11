/**
 * コア型定義
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 1.2, 1.3
 */

/**
 * サポートされているプログラミング言語
 */
export type SupportedLanguage = 'c' | 'cpp' | 'java' | 'python' | 'javascript' | 'typescript' | 'rust' | 'markdown' | 'plaintext';

/**
 * 位置情報
 */
export interface Position {
  line: number;
  character: number;
}

/**
 * 範囲情報
 */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * 診断情報の重大度
 */
export enum DiagnosticSeverity {
  Error = 0,
  Warning = 1,
  Information = 2,
  Hint = 3
}

/**
 * 診断情報
 */
export interface Diagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  code: string;
  source: string;
  relatedInformation?: DiagnosticRelatedInformation[];
}

/**
 * 関連診断情報
 */
export interface DiagnosticRelatedInformation {
  location: {
    uri: string;
    range: Range;
  };
  message: string;
}

/**
 * セマンティックトークン
 */
export interface SemanticTokens {
  data: number[];
}

/**
 * トークン入力パラメータ
 */
export interface TokenParams {
  surface: string;
  pos: string;
  posDetail1: string;
  posDetail2: string;
  posDetail3: string;
  conjugation: string;
  conjugationForm: string;
  baseForm: string;
  reading: string;
  pronunciation: string;
  start: number;
  end: number;
}

/**
 * 形態素トークン
 * MeCabの解析結果を表現する
 */
export class Token {
  /** 表層形 */
  surface: string;
  /** 品詞 */
  pos: string;
  /** 品詞細分類1 */
  posDetail1: string;
  /** 品詞細分類2 */
  posDetail2: string;
  /** 品詞細分類3 */
  posDetail3: string;
  /** 活用型 */
  conjugation: string;
  /** 活用形 */
  conjugationForm: string;
  /** 原形 */
  baseForm: string;
  /** 読み */
  reading: string;
  /** 発音 */
  pronunciation: string;
  /** 開始位置 */
  start: number;
  /** 終了位置 */
  end: number;

  constructor(params: TokenParams) {
    this.surface = params.surface;
    this.pos = params.pos;
    this.posDetail1 = params.posDetail1;
    this.posDetail2 = params.posDetail2;
    this.posDetail3 = params.posDetail3;
    this.conjugation = params.conjugation;
    this.conjugationForm = params.conjugationForm;
    this.baseForm = params.baseForm;
    this.reading = params.reading;
    this.pronunciation = params.pronunciation;
    this.start = params.start;
    this.end = params.end;
  }

  /**
   * 助詞かどうかを判定
   */
  isParticle(): boolean {
    return this.pos === '助詞';
  }

  /**
   * 動詞かどうかを判定
   */
  isVerb(): boolean {
    return this.pos === '動詞';
  }

  /**
   * 名詞かどうかを判定
   */
  isNoun(): boolean {
    return this.pos === '名詞';
  }

  /**
   * 形容詞かどうかを判定
   */
  isAdjective(): boolean {
    return this.pos === '形容詞';
  }

  /**
   * 副詞かどうかを判定
   */
  isAdverb(): boolean {
    return this.pos === '副詞';
  }
}

/**
 * ドキュメント解析パラメータ
 */
export interface DocumentAnalysisParams {
  uri: string;
  version: number;
  tokens: Token[];
  diagnostics: Diagnostic[];
  semanticTokens: SemanticTokens;
  timestamp: number;
}

/**
 * ドキュメント解析結果
 */
export class DocumentAnalysis {
  /** ドキュメントURI */
  uri: string;
  /** バージョン */
  version: number;
  /** トークンリスト */
  tokens: Token[];
  /** 診断情報リスト */
  diagnostics: Diagnostic[];
  /** セマンティックトークン */
  semanticTokens: SemanticTokens;
  /** タイムスタンプ */
  timestamp: number;

  constructor(params: DocumentAnalysisParams) {
    this.uri = params.uri;
    this.version = params.version;
    this.tokens = params.tokens;
    this.diagnostics = params.diagnostics;
    this.semanticTokens = params.semanticTokens;
    this.timestamp = params.timestamp;
  }

  /**
   * 解析結果が古いかどうかを判定
   */
  isStale(currentVersion: number): boolean {
    return this.version < currentVersion;
  }
}

/**
 * 文法エラータイプ
 */
export type GrammarErrorType = 'double-particle' | 'particle-sequence' | 'verb-particle-mismatch';

/**
 * 文法エラーパラメータ
 */
export interface GrammarErrorParams {
  type: GrammarErrorType;
  tokens: Token[];
  range: Range;
  message: string;
  suggestion?: string;
}

/**
 * 文法エラー
 */
export class GrammarError {
  /** エラータイプ */
  type: GrammarErrorType;
  /** 関連トークン */
  tokens: Token[];
  /** 範囲 */
  range: Range;
  /** エラーメッセージ */
  message: string;
  /** 修正候補 */
  suggestion?: string;

  constructor(params: GrammarErrorParams) {
    this.type = params.type;
    this.tokens = params.tokens;
    this.range = params.range;
    this.message = params.message;
    this.suggestion = params.suggestion;
  }

  /**
   * 診断情報に変換
   */
  toDiagnostic(): Diagnostic {
    return {
      range: this.range,
      severity: DiagnosticSeverity.Warning,
      message: this.message,
      code: this.type,
      source: 'otak-lcp'
    };
  }
}

/**
 * コメント範囲
 */
export interface CommentRange {
  /** 開始位置 */
  start: number;
  /** 終了位置 */
  end: number;
  /** テキスト */
  text: string;
  /** タイプ（行コメント/ブロックコメント） */
  type: 'line' | 'block';
}

/**
 * 設定
 */
export interface Configuration {
  /** 文法チェックの有効/無効 */
  enableGrammarCheck: boolean;
  /** セマンティックハイライトの有効/無効 */
  enableSemanticHighlight: boolean;
  /** 解析対象の言語 */
  targetLanguages: SupportedLanguage[];
  /** デバウンス遅延（ミリ秒） */
  debounceDelay: number;
}

/**
 * セマンティックトークンタイプ
 */
export enum TokenType {
  Noun = 0,
  Verb = 1,
  Adjective = 2,
  Particle = 3,
  Adverb = 4,
  Other = 5
}

/**
 * エラーコード
 */
export const ErrorCodes = {
  ANALYZER_INIT_ERROR: 'ANALYZER_INIT_ERROR',
  ANALYZER_DICT_ERROR: 'ANALYZER_DICT_ERROR',
  ANALYZER_PARSE_ERROR: 'ANALYZER_PARSE_ERROR',
  WIKIPEDIA_REQUEST_FAILED: 'WIKIPEDIA_REQUEST_FAILED',
  WIKIPEDIA_TIMEOUT: 'WIKIPEDIA_TIMEOUT',
  WIKIPEDIA_RATE_LIMIT: 'WIKIPEDIA_RATE_LIMIT',
  ENCODING_ERROR: 'ENCODING_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  COMMENT_EXTRACTION_ERROR: 'COMMENT_EXTRACTION_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

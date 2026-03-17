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
      source: 'otak-lsp'
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
export type GlossaryId =
  | 'it'
  | 'otakLspSettings'
  | 'cloud'
  | 'awsServices'
  | 'azureServices'
  | 'gcpServices'
  | 'ociServices'
  | 'cloudflareServices'
  | 'iotEmbedded'
  | 'backend'
  | 'frontend'
  | 'ddd'
  | 'tdd'
  | 'pmbok'
  | 'java'
  | 'nextjs'
  | 'dotnet'
  | 'security'
  | 'networkHttp'
  | 'authIam'
  | 'dbSqlTx'
  | 'apiDesign'
  | 'devopsCicd'
  | 'containersK8s'
  | 'observabilitySre'
  | 'distributedSystems'
  | 'messagingEda'
  | 'performanceCache'
  | 'architecturePatterns'
  | 'agileProduct'
  | 'aiLlm'
  | 'contractLegal'
  | 'git'
  | 'npm'
  | 'yarn'
  | 'pnpm'
  | 'pip'
  | 'docker'
  | 'linux'
  | 'windows'
  | 'powershell'
  | 'oracle'
  | 'mysql'
  | 'javaCli'
  | 'maven'
  | 'gradle'
  | 'devProcess'
  | 'ipaMetrics'
  | 'enterpriseArch';

/** カテゴリグループID */
export type GlossaryGroupId =
  | 'general'
  | 'webDevelopment'
  | 'designArchitecture'
  | 'languagesFrameworks'
  | 'packageManagersBuild'
  | 'versionControl'
  | 'databases'
  | 'securityAuth'
  | 'networkApi'
  | 'operationsMonitoring'
  | 'messaging'
  | 'aiMl'
  | 'projectManagement'
  | 'infrastructure'
  | 'cloudServices';

/** カテゴリグループ定義 */
export interface GlossaryGroupDefinition {
  readonly id: GlossaryGroupId;
  /** 日本語表示名 */
  readonly label: string;
  /** グループに属するカテゴリIDの配列 */
  readonly members: ReadonlyArray<GlossaryId>;
  /** グループの優先度（小さいほど高優先度、0始まり） */
  readonly priority: number;
}

/** グループ定義の定数（priority順） */
export const GLOSSARY_GROUPS: ReadonlyArray<GlossaryGroupDefinition> = [
  { id: 'general', label: '一般', members: ['it', 'otakLspSettings'], priority: 0 },
  { id: 'webDevelopment', label: 'Web開発', members: ['backend', 'frontend'], priority: 1 },
  { id: 'designArchitecture', label: '設計・アーキテクチャ', members: ['ddd', 'tdd', 'architecturePatterns', 'distributedSystems', 'enterpriseArch'], priority: 2 },
  { id: 'languagesFrameworks', label: '開発言語・フレームワーク', members: ['java', 'javaCli', 'nextjs', 'dotnet', 'pip'], priority: 3 },
  { id: 'packageManagersBuild', label: 'パッケージマネージャ・ビルドツール', members: ['npm', 'yarn', 'pnpm', 'maven', 'gradle'], priority: 4 },
  { id: 'versionControl', label: 'バージョン管理', members: ['git'], priority: 5 },
  { id: 'databases', label: 'データベース', members: ['dbSqlTx', 'oracle', 'mysql'], priority: 6 },
  { id: 'securityAuth', label: 'セキュリティ・認証', members: ['security', 'authIam'], priority: 7 },
  { id: 'networkApi', label: 'ネットワーク・API', members: ['networkHttp', 'apiDesign'], priority: 8 },
  { id: 'operationsMonitoring', label: '運用・監視', members: ['devopsCicd', 'observabilitySre', 'performanceCache'], priority: 9 },
  { id: 'messaging', label: 'メッセージング', members: ['messagingEda'], priority: 10 },
  { id: 'aiMl', label: 'AI・機械学習', members: ['aiLlm'], priority: 11 },
  { id: 'projectManagement', label: 'プロジェクト管理・プロセス', members: ['pmbok', 'agileProduct', 'devProcess', 'ipaMetrics', 'contractLegal'], priority: 12 },
  { id: 'infrastructure', label: '基盤・インフラ', members: ['cloud', 'containersK8s', 'linux', 'windows', 'powershell', 'docker', 'iotEmbedded'], priority: 13 },
  { id: 'cloudServices', label: 'クラウドサービス', members: ['awsServices', 'azureServices', 'gcpServices', 'ociServices', 'cloudflareServices'], priority: 14 },
];

export interface Configuration {
  /** 文法チェックの有効/無効 */
  enableGrammarCheck: boolean;
  /** セマンティックハイライトの有効/無効 */
  enableSemanticHighlight: boolean;
  /** テーブル内のセマンティックハイライト（旧動作に戻す場合はfalse） */
  excludeTableDelimiters: boolean;
  /** 解析パイプラインの計測ログを有効にする */
  enableProfileLogs: boolean;
  /** Markdown関連設定 */
  markdown: {
    /** Markdownのコードブロック（```）内も文法チェック対象にする */
    analyzeCodeBlocks: boolean;
    /** Markdownのテーブル（|...|）内も文法チェック対象にする */
    analyzeTables: boolean;
  };
  /** 解析対象の言語 */
  targetLanguages: SupportedLanguage[];
  /** デバウンス遅延（ミリ秒） */
  debounceDelay: number;
  /** ホバー関連設定 */
  hover: {
    /** Wikipediaサマリーの表示 */
    enableWikipedia: boolean;
    /** 用語図鑑（オフライン）の表示 */
    enableGlossary: boolean;
    /** 有効な用語図鑑 */
    enabledGlossaries: GlossaryId[];
    /** 有効な用語図鑑カテゴリグループ */
    enabledGlossaryGroups: GlossaryGroupId[];
  };
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

/**
 * セマンティックハイライトテーマID
 */
export type SemanticThemeId = 'default' | 'pastel' | 'vivid' | 'monochrome' | 'nature';

/**
 * セマンティックハイライトテーマの色設定
 */
export interface SemanticThemeColors {
  noun: string;
  verb: string;
  adjective: string;
  particle: string;
  adverb: string;
}

/**
 * セマンティックハイライトテーマ
 */
export interface SemanticTheme {
  id: SemanticThemeId;
  name: string;
  description: string;
  colors: SemanticThemeColors;
}

/**
 * セマンティックハイライトテーマプリセット
 */
export const SEMANTIC_THEMES: Record<SemanticThemeId, SemanticTheme> = {
  default: {
    id: 'default',
    name: 'Default',
    description: 'VS Code標準に近い配色',
    colors: {
      noun: '#4EC9B0',
      verb: '#DCDCAA',
      adjective: '#9CDCFE',
      particle: '#569CD6',
      adverb: '#C586C0'
    }
  },
  pastel: {
    id: 'pastel',
    name: 'Pastel',
    description: '目に優しいパステルカラー',
    colors: {
      noun: '#A8D8B9',
      verb: '#F7DC6F',
      adjective: '#AED6F1',
      particle: '#D7BDE2',
      adverb: '#F5B7B1'
    }
  },
  vivid: {
    id: 'vivid',
    name: 'Vivid',
    description: '鮮やかで視認性の高い配色',
    colors: {
      noun: '#00D4AA',
      verb: '#FFD700',
      adjective: '#00BFFF',
      particle: '#FF6B6B',
      adverb: '#DA70D6'
    }
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    description: 'グレースケールベースの落ち着いた配色',
    colors: {
      noun: '#B0B0B0',
      verb: '#E0E0E0',
      adjective: '#909090',
      particle: '#C8C8C8',
      adverb: '#A0A0A0'
    }
  },
  nature: {
    id: 'nature',
    name: 'Nature',
    description: '自然をイメージした配色',
    colors: {
      noun: '#228B22',
      verb: '#8B4513',
      adjective: '#4169E1',
      particle: '#DAA520',
      adverb: '#9370DB'
    }
  }
};

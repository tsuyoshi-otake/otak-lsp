/**
 * 高度な文法ルール用型定義
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1
 */

import { Token, Range, Diagnostic, DiagnosticSeverity } from './types';

/**
 * 高度な文法エラータイプ
 */
export type AdvancedGrammarErrorType =
  | 'style-inconsistency'
  | 'ra-nuki'
  | 'double-negation'
  | 'particle-repetition'
  | 'conjunction-repetition'
  | 'adversative-ga'
  | 'alphabet-width'
  | 'weak-expression'
  | 'comma-count'
  | 'term-notation'
  | 'kanji-opening';

/**
 * 文体タイプ
 */
export type StyleType = 'keigo' | 'joutai' | 'neutral';

/**
 * 弱い表現の検出レベル
 */
export type WeakExpressionLevel = 'strict' | 'normal' | 'loose';

/**
 * 文（Sentence）パラメータ
 */
export interface SentenceParams {
  text: string;
  tokens: Token[];
  start: number;
  end: number;
}

/**
 * 文（Sentence）クラス
 * テキストを文単位で管理する
 */
export class Sentence {
  /** 文のテキスト */
  text: string;
  /** トークンリスト */
  tokens: Token[];
  /** 開始位置 */
  start: number;
  /** 終了位置 */
  end: number;
  /** 読点の数 */
  commaCount: number;

  constructor(params: SentenceParams) {
    this.text = params.text;
    this.tokens = params.tokens;
    this.start = params.start;
    this.end = params.end;
    this.commaCount = this.countCommas();
  }

  /**
   * 読点の数をカウント
   */
  private countCommas(): number {
    return (this.text.match(/、/g) || []).length;
  }

  /**
   * 「です」「ます」で終わるかどうかを判定
   */
  endsWithDesuMasu(): boolean {
    const trimmed = this.text.trim().replace(/[。！？!?]$/, '');
    return /です$|ます$/.test(trimmed);
  }

  /**
   * 「である」で終わるかどうかを判定
   */
  endsWithDearu(): boolean {
    const trimmed = this.text.trim().replace(/[。！？!?]$/, '');
    return /である$/.test(trimmed);
  }
}

/**
 * 文体の不整合情報
 */
export interface StyleInconsistency {
  sentence: Sentence;
  detectedStyle: StyleType;
  dominantStyle: StyleType;
  range: Range;
}

/**
 * ら抜き言葉の情報
 */
export interface RaNukiInfo {
  verb: Token;
  raNukiForm: string;
  correctForm: string;
  range: Range;
}

/**
 * 二重否定の情報
 */
export interface DoubleNegation {
  tokens: Token[];
  pattern: string;
  range: Range;
  positiveForm?: string;
}

/**
 * 助詞連続使用の情報
 */
export interface ParticleRepetition {
  particle: string;
  occurrences: Token[];
  range: Range;
}

/**
 * 接続詞連続使用の情報
 */
export interface ConjunctionRepetition {
  conjunction: string;
  sentences: Sentence[];
  range: Range;
  alternatives: string[];
}

/**
 * 逆接「が」連続使用の情報
 */
export interface GaRepetition {
  gaTokens: Token[];
  sentences: Sentence[];
  range: Range;
}

/**
 * 全角半角混在の情報
 */
export interface WidthInconsistency {
  text: string;
  width: 'full' | 'half';
  dominantWidth: 'full' | 'half';
  range: Range;
}

/**
 * 弱い表現の情報
 */
export interface WeakExpression {
  pattern: string;
  tokens: Token[];
  range: Range;
  strongerForm?: string;
  severity: 'info' | 'warning';
}

/**
 * 読点過多の情報
 */
export interface CommaExcess {
  sentence: Sentence;
  commaCount: number;
  threshold: number;
  range: Range;
}

/**
 * 表記エラーの情報
 */
export interface NotationError {
  incorrect: string;
  correct: string;
  range: Range;
}

/**
 * 漢字開きの情報
 */
export interface KanjiOpening {
  kanji: string;
  opened: string;
  token: Token;
  range: Range;
}

/**
 * 高度な文法ルール設定
 */
export interface AdvancedRulesConfig {
  // ルールの有効/無効
  enableStyleConsistency: boolean;
  enableRaNukiDetection: boolean;
  enableDoubleNegation: boolean;
  enableParticleRepetition: boolean;
  enableConjunctionRepetition: boolean;
  enableAdversativeGa: boolean;
  enableAlphabetWidth: boolean;
  enableWeakExpression: boolean;
  enableCommaCount: boolean;
  enableTermNotation: boolean;
  enableKanjiOpening: boolean;

  // 技術用語辞典の有効/無効
  enableWebTechDictionary: boolean;
  enableGenerativeAIDictionary: boolean;
  enableAWSDictionary: boolean;
  enableAzureDictionary: boolean;
  enableOCIDictionary: boolean;

  // Untitledファイルや拡張子なしファイルの処理
  enableUntitledFiles: boolean;
  enableContentBasedDetection: boolean;
  excludedLanguageIds: string[];

  // その他の設定
  commaCountThreshold: number;
  weakExpressionLevel: WeakExpressionLevel;
  customNotationRules: Map<string, string>;
}

/**
 * デフォルトの高度な文法ルール設定
 */
export const DEFAULT_ADVANCED_RULES_CONFIG: AdvancedRulesConfig = {
  enableStyleConsistency: true,
  enableRaNukiDetection: true,
  enableDoubleNegation: true,
  enableParticleRepetition: false, // 初期設定で無効
  enableConjunctionRepetition: true,
  enableAdversativeGa: true,
  enableAlphabetWidth: true,
  enableWeakExpression: true,
  enableCommaCount: true,
  enableTermNotation: true,
  enableKanjiOpening: true,

  // 技術用語辞典はすべて有効
  enableWebTechDictionary: true,
  enableGenerativeAIDictionary: true,
  enableAWSDictionary: true,
  enableAzureDictionary: true,
  enableOCIDictionary: true,

  // Untitledファイルや拡張子なしファイルも有効
  enableUntitledFiles: true,
  enableContentBasedDetection: true,
  excludedLanguageIds: [],

  commaCountThreshold: 4,
  weakExpressionLevel: 'normal',
  customNotationRules: new Map()
};

/**
 * 高度な診断情報パラメータ
 */
export interface AdvancedDiagnosticParams {
  range: Range;
  message: string;
  code: AdvancedGrammarErrorType;
  ruleName: string;
  suggestions?: string[];
  severity?: DiagnosticSeverity;
}

/**
 * 高度な診断情報クラス
 */
export class AdvancedDiagnostic {
  range: Range;
  severity: DiagnosticSeverity;
  message: string;
  code: AdvancedGrammarErrorType;
  source: string;
  ruleName: string;
  suggestions: string[];

  constructor(params: AdvancedDiagnosticParams) {
    this.range = params.range;
    this.severity = params.severity ?? DiagnosticSeverity.Warning;
    this.message = params.message;
    this.code = params.code;
    this.source = 'japanese-grammar-advanced';
    this.ruleName = params.ruleName;
    this.suggestions = params.suggestions ?? [];
  }

  /**
   * Diagnostic形式に変換
   */
  toDiagnostic(): Diagnostic {
    return {
      range: this.range,
      severity: this.severity,
      message: this.message,
      code: this.code,
      source: this.source
    };
  }
}

/**
 * ルール実行結果
 */
export class RuleResult {
  ruleName: string;
  diagnostics: AdvancedDiagnostic[];
  executionTime: number;
  success: boolean;
  error?: Error;

  constructor(ruleName: string) {
    this.ruleName = ruleName;
    this.diagnostics = [];
    this.executionTime = 0;
    this.success = true;
  }

  addDiagnostic(diagnostic: AdvancedDiagnostic): void {
    this.diagnostics.push(diagnostic);
  }

  setError(error: Error): void {
    this.success = false;
    this.error = error;
  }
}

/**
 * ルールコンテキスト
 */
export interface RuleContext {
  documentText: string;
  sentences: Sentence[];
  config: AdvancedRulesConfig;
}

/**
 * 高度な文法ルールインターフェース
 */
export interface AdvancedGrammarRule {
  name: string;
  description: string;
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[];
  isEnabled(config: AdvancedRulesConfig): boolean;
}

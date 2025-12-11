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
  | 'kanji-opening'
  | 'redundant-expression'
  | 'tautology'
  | 'no-particle-chain'
  | 'monotonous-ending'
  | 'long-sentence'
  // Feature: remaining-grammar-rules
  | 'sahen-verb'
  | 'missing-subject'
  | 'twisted-sentence'
  | 'homophone'
  | 'honorific-error'
  | 'adverb-agreement'
  | 'modifier-position'
  | 'ambiguous-demonstrative'
  | 'passive-overuse'
  | 'noun-chain'
  | 'conjunction-misuse'
  // Extended Grammar Rules - Tasks 14-25
  | 'okurigana-variant'
  | 'orthography-variant'
  | 'number-width-mix'
  | 'katakana-chouon'
  | 'halfwidth-kana'
  | 'numeral-style-mix'
  | 'space-around-unit'
  | 'bracket-quote-mismatch'
  | 'date-format-variant'
  | 'dash-tilde-normalization'
  | 'nakaguro-usage'
  | 'symbol-width-mix';

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
 * 冗長表現の情報
 * Feature: additional-grammar-rules
 */
export interface RedundantExpression {
  pattern: string;
  redundantPart: string;
  suggestion: string;
  range: Range;
}

/**
 * 重複表現（同語反復）の情報
 * Feature: additional-grammar-rules
 */
export interface Tautology {
  pattern: string;
  duplicatedElement: string;
  suggestions: string[];
  range: Range;
}

/**
 * 助詞「の」連続使用の情報
 * Feature: additional-grammar-rules
 */
export interface NoParticleChain {
  tokens: Token[];
  chainLength: number;
  range: Range;
  suggestions: string[];
}

/**
 * 文末表現の単調さの情報
 * Feature: additional-grammar-rules
 */
export interface MonotonousEnding {
  endingPattern: string;
  sentences: Sentence[];
  consecutiveCount: number;
  range: Range;
  variations: string[];
}

/**
 * 長文の情報
 * Feature: additional-grammar-rules
 */
export interface LongSentence {
  sentence: Sentence;
  characterCount: number;
  threshold: number;
  range: Range;
  splitSuggestions: string[];
}

// ==========================================
// Feature: remaining-grammar-rules
// ==========================================

/**
 * サ変動詞の誤用情報
 */
export interface SahenVerbError {
  pattern: string;
  unnecessaryParticle: string;
  suggestion: string;
  range: Range;
}

/**
 * 主語欠如の情報
 */
export interface MissingSubject {
  sentence: Sentence;
  verbToken: Token;
  range: Range;
  suggestion: string;
}

/**
 * ねじれ文の情報
 */
export interface TwistedSentence {
  sentence: Sentence;
  subjectPart: string;
  predicatePart: string;
  range: Range;
  suggestions: string[];
}

/**
 * 同音異義語の誤用情報
 */
export interface HomophoneError {
  used: string;
  expected: string[];
  reading: string;
  range: Range;
  context: string;
}

/**
 * 敬語の誤用情報
 */
export interface HonorificError {
  expression: string;
  errorType: 'double-honorific' | 'misuse' | 'inconsistent';
  correction: string;
  range: Range;
}

/**
 * 副詞の呼応エラー情報
 */
export interface AdverbAgreementError {
  adverb: string;
  expectedEnding: string;
  actualEnding: string;
  range: Range;
  suggestion: string;
}

/**
 * 修飾語位置の問題情報
 */
export interface ModifierPositionError {
  modifier: string;
  modified: string;
  suggestedOrder: string;
  range: Range;
}

/**
 * 曖昧な指示語の情報
 */
export interface AmbiguousDemonstrative {
  demonstrative: string;
  possibleReferents: string[];
  range: Range;
  suggestion: string;
}

/**
 * 受身表現多用の情報
 */
export interface PassiveOveruse {
  passiveExpressions: string[];
  count: number;
  threshold: number;
  range: Range;
  suggestions: string[];
}

/**
 * 名詞連続の情報
 */
export interface NounChain {
  nouns: Token[];
  chainLength: number;
  range: Range;
  suggestion: string;
}

/**
 * 接続詞誤用の情報
 */
export interface ConjunctionMisuse {
  conjunction: string;
  expectedType: 'adversative' | 'additive' | 'causal' | 'sequential';
  actualRelation: string;
  range: Range;
  suggestion: string;
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

  // 追加文法ルールの有効/無効
  // Feature: additional-grammar-rules
  enableRedundantExpression: boolean;
  enableTautology: boolean;
  enableNoParticleChain: boolean;
  enableMonotonousEnding: boolean;
  enableLongSentence: boolean;

  // 残り文法ルールの有効/無効
  // Feature: remaining-grammar-rules
  enableSahenVerb: boolean;
  enableMissingSubject: boolean;
  enableTwistedSentence: boolean;
  enableHomophone: boolean;
  enableHonorificError: boolean;
  enableAdverbAgreement: boolean;
  enableModifierPosition: boolean;
  enableAmbiguousDemonstrative: boolean;
  enablePassiveOveruse: boolean;
  enableNounChain: boolean;
  enableConjunctionMisuse: boolean;

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

  // 追加文法ルールの設定
  // Feature: additional-grammar-rules
  noParticleChainThreshold: number;
  monotonousEndingThreshold: number;
  longSentenceThreshold: number;

  // 残り文法ルールの設定
  // Feature: remaining-grammar-rules
  nounChainThreshold: number;
  passiveOveruseThreshold: number;
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

  // 追加文法ルール（Feature: additional-grammar-rules）
  enableRedundantExpression: true,
  enableTautology: true,
  enableNoParticleChain: true,
  enableMonotonousEnding: true,
  enableLongSentence: true,

  // 残り文法ルール（Feature: remaining-grammar-rules）
  enableSahenVerb: true,
  enableMissingSubject: true,
  enableTwistedSentence: true,
  enableHomophone: true,
  enableHonorificError: true,
  enableAdverbAgreement: true,
  enableModifierPosition: true,
  enableAmbiguousDemonstrative: true,
  enablePassiveOveruse: true,
  enableNounChain: true,
  enableConjunctionMisuse: true,

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
  customNotationRules: new Map(),

  // 追加文法ルールの閾値設定（Feature: additional-grammar-rules）
  noParticleChainThreshold: 3,
  monotonousEndingThreshold: 3,
  longSentenceThreshold: 120,

  // 残り文法ルールの閾値設定（Feature: remaining-grammar-rules）
  nounChainThreshold: 5,
  passiveOveruseThreshold: 3
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
    this.source = 'otak-lcp-advanced';
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

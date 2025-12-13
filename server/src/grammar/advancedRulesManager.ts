/**
 * Advanced Rules Manager
 * 高度な文法ルールを管理し、実行を制御する
 * Feature: advanced-grammar-rules
 */

import { Token, Diagnostic, Range, Position } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { SentenceParser } from './sentenceParser';
import {
  StyleConsistencyRule,
  RaNukiRule,
  DoubleNegationRule,
  ParticleRepetitionRule,
  ConjunctionRepetitionRule,
  AdversativeGaRule,
  AlphabetWidthRule,
  WeakExpressionRule,
  CommaCountRule,
  TermNotationRule,
  KanjiOpeningRule,
  // Additional Grammar Rules (Feature: additional-grammar-rules)
  RedundantExpressionRule,
  TautologyRule,
  NoParticleChainRule,
  MonotonousEndingRule,
  LongSentenceRule,
  // Remaining Grammar Rules (Feature: remaining-grammar-rules)
  SahenVerbRule,
  MissingSubjectRule,
  TwistedSentenceRule,
  HomophoneRule,
  HonorificErrorRule,
  AdverbAgreementRule,
  ModifierPositionRule,
  AmbiguousDemonstrativeRule,
  PassiveOveruseRule,
  NounChainRule,
  ConjunctionMisuseRule,
  // Sentence Ending Colon Detection (Feature: sentence-ending-colon-detection)
  SentenceEndingColonRule,
  // Evals NG Pattern Expansion (Feature: evals-ng-pattern-expansion)
  PunctuationStyleMixRule,
  QuotationStyleMixRule,
  BulletStyleMixRule,
  EmphasisStyleMixRule,
  EnglishCaseMixRule,
  UnitNotationMixRule,
  PronounMixRule,
  HeadingLevelSkipRule,
  TableColumnMismatchRule,
  CodeBlockLanguageRule
} from './rules';

/**
 * Advanced Rules Manager
 * すべての高度な文法ルールを管理・実行する
 */
export class AdvancedRulesManager {
  private rules: AdvancedGrammarRule[];
  private config: AdvancedRulesConfig;
  private lineStarts: number[] = [];
  private firstLineLength: number = 0;

  /**
   * テキストから行開始位置を計算
   * (Feature: diagnostic-range-fix)
   */
  private calculateLineStarts(text: string): void {
    this.lineStarts = [0];
    let firstNewlineIndex = text.indexOf('\n');
    this.firstLineLength = firstNewlineIndex === -1 ? text.length : firstNewlineIndex;

    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  /**
   * オフセットから行と文字位置を取得
   * (Feature: diagnostic-range-fix)
   */
  private offsetToPosition(offset: number): Position {
    let line = 0;
    for (let i = 1; i < this.lineStarts.length; i++) {
      if (offset < this.lineStarts[i]) {
        break;
      }
      line = i;
    }
    return { line, character: offset - this.lineStarts[line] };
  }

  /**
   * 診断のrangeがオフセットベースかどうかを判定して必要に応じて変換
   * (Feature: diagnostic-range-fix)
   *
   * 判定ロジック:
   * - line: 0 かつ character が最初の行の長さを超えている場合はオフセットベースと判断
   * - それ以外は正しい行/文字ベースと判断してそのまま返す
   *
   * 要件 1.2: 既に正しい範囲を持っている場合は変更しない
   * 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
   */
  private fixDiagnosticRange(diagnostic: Diagnostic): Diagnostic {
    const { start, end } = diagnostic.range;

    // 行番号が0でない場合、または両方の行番号が異なる場合は
    // 既に正しい行/文字ベースの位置を持っていると判断
    if (start.line !== 0 || end.line !== 0 || start.line !== end.line) {
      return diagnostic;
    }

    // line: 0 の場合、character が最初の行の長さを超えているかチェック
    // 超えている場合はオフセットベースと判断して変換
    const maxChar = Math.max(start.character, end.character);
    if (maxChar > this.firstLineLength) {
      // オフセットベースの範囲を行/文字ベースに変換
      const newStart = this.offsetToPosition(start.character);
      const newEnd = this.offsetToPosition(end.character);
      return {
        ...diagnostic,
        range: { start: newStart, end: newEnd }
      };
    }

    // 最初の行の範囲内なので、正しい行/文字ベースと判断
    return diagnostic;
  }

  /**
   * テーブル範囲に重なる文を除外
   * （Markdownの文法チェックではテーブル全体を対象外にする）
   */
  private filterOutTableSentences(sentences: Sentence[], excludedRanges: ExcludedRange[]): Sentence[] {
    const tableRanges = excludedRanges.filter((r) => r.type === 'table');
    if (tableRanges.length === 0) {
      return sentences;
    }

    return sentences.filter((sentence) =>
      !tableRanges.some((table) =>
        sentence.start < table.end && sentence.end > table.start
      )
    );
  }

  /**
   * テーブル内のテキストをスペースでマスクする
   * - 文法チェックからテーブル内容を除外するため
   * - 改行は保持して行位置を崩さない
   */
  private maskTableContent(text: string, excludedRanges: ExcludedRange[]): string {
    const tableRanges = excludedRanges.filter((r) => r.type === 'table');
    if (tableRanges.length === 0) {
      return text;
    }

    const chars = text.split('');
    for (const range of tableRanges) {
      const start = Math.max(0, Math.min(range.start, chars.length));
      const end = Math.max(start, Math.min(range.end, chars.length));
      for (let i = start; i < end; i++) {
        const ch = chars[i];
        if (ch !== '\n' && ch !== '\r') {
          chars[i] = ' ';
        }
      }
    }

    return chars.join('');
  }

  constructor(config?: Partial<AdvancedRulesConfig>) {
    this.config = { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config };
    this.rules = [
      new StyleConsistencyRule(),
      new RaNukiRule(),
      new DoubleNegationRule(),
      new ParticleRepetitionRule(),
      new ConjunctionRepetitionRule(),
      new AdversativeGaRule(),
      new AlphabetWidthRule(),
      new WeakExpressionRule(),
      new CommaCountRule(),
      new TermNotationRule(),
      new KanjiOpeningRule(),
      // Additional Grammar Rules (Feature: additional-grammar-rules)
      new RedundantExpressionRule(),
      new TautologyRule(),
      new NoParticleChainRule(),
      new MonotonousEndingRule(),
      new LongSentenceRule(),
      // Remaining Grammar Rules (Feature: remaining-grammar-rules)
      new SahenVerbRule(),
      new MissingSubjectRule(),
      new TwistedSentenceRule(),
      new HomophoneRule(),
      new HonorificErrorRule(),
      new AdverbAgreementRule(),
      new ModifierPositionRule(),
      new AmbiguousDemonstrativeRule(),
      new PassiveOveruseRule(),
      new NounChainRule(),
      new ConjunctionMisuseRule(),
      // Sentence Ending Colon Detection (Feature: sentence-ending-colon-detection)
      new SentenceEndingColonRule(),
      // Evals NG Pattern Expansion (Feature: evals-ng-pattern-expansion)
      new PunctuationStyleMixRule(),
      new QuotationStyleMixRule(),
      new BulletStyleMixRule(),
      new EmphasisStyleMixRule(),
      new EnglishCaseMixRule(),
      new UnitNotationMixRule(),
      new PronounMixRule(),
      new HeadingLevelSkipRule(),
      new TableColumnMismatchRule(),
      new CodeBlockLanguageRule()
    ];
  }

  /**
   * ルールを登録
   */
  registerRule(rule: AdvancedGrammarRule): void {
    this.rules.push(rule);
  }

  /**
   * ルールを解除
   */
  unregisterRule(ruleName: string): void {
    this.rules = this.rules.filter(r => r.name !== ruleName);
  }

  /**
   * 有効なルールを取得
   */
  getEnabledRules(): AdvancedGrammarRule[] {
    return this.rules.filter(rule => rule.isEnabled(this.config));
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<AdvancedRulesConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): AdvancedRulesConfig {
    return { ...this.config };
  }

  /**
   * テキストをチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   */
  checkText(text: string, tokens: Token[], excludedRanges?: ExcludedRange[]): Diagnostic[] {
    const effectiveText = excludedRanges
      ? this.maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）
    this.calculateLineStarts(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode);
    const sentences = excludedRanges
      ? this.filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;
    const context: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config
    };

    const diagnostics: AdvancedDiagnostic[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      try {
        const ruleDiagnostics = rule.check(tokens, context);
        diagnostics.push(...ruleDiagnostics);
      } catch (error) {
        console.error(`Error in rule ${rule.name}:`, error);
      }
    }

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }

  /**
   * 特定のルールのみでチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   */
  checkWithRules(text: string, tokens: Token[], ruleNames: string[], excludedRanges?: ExcludedRange[]): Diagnostic[] {
    const effectiveText = excludedRanges
      ? this.maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）
    this.calculateLineStarts(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode);
    const sentences = excludedRanges
      ? this.filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;
    const context: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config
    };

    const diagnostics: AdvancedDiagnostic[] = [];
    const selectedRules = this.rules.filter(r => ruleNames.includes(r.name) && r.isEnabled(this.config));

    for (const rule of selectedRules) {
      try {
        const ruleDiagnostics = rule.check(tokens, context);
        diagnostics.push(...ruleDiagnostics);
      } catch (error) {
        console.error(`Error in rule ${rule.name}:`, error);
      }
    }

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }
}

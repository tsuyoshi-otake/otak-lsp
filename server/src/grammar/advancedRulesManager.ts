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
  ConjunctionMisuseRule
} from './rules';

/**
 * Advanced Rules Manager
 * すべての高度な文法ルールを管理・実行する
 */
export class AdvancedRulesManager {
  private rules: AdvancedGrammarRule[];
  private config: AdvancedRulesConfig;
  private lineStarts: number[] = [];

  /**
   * テキストから行開始位置を計算
   */
  private calculateLineStarts(text: string): void {
    this.lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  /**
   * オフセットから行と文字位置を取得
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
   * 診断のrangeを修正（offsetベースからline/charベースへ）
   */
  private fixDiagnosticRange(diagnostic: Diagnostic): Diagnostic {
    // rangeのstart/endがoffsetとして使われている場合を修正
    const startOffset = diagnostic.range.start.character;
    const endOffset = diagnostic.range.end.character;

    // line: 0 が使われている場合はoffsetベースと判断
    if (diagnostic.range.start.line === 0 && diagnostic.range.end.line === 0) {
      const start = this.offsetToPosition(startOffset);
      const end = this.offsetToPosition(endOffset);
      return {
        ...diagnostic,
        range: { start, end }
      };
    }
    return diagnostic;
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
      new ConjunctionMisuseRule()
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
   */
  checkText(text: string, tokens: Token[]): Diagnostic[] {
    // 行開始位置を計算
    this.calculateLineStarts(text);

    const sentences = SentenceParser.parseSentences(text, tokens);
    const context: RuleContext = {
      documentText: text,
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

    // offsetベースのrangeをline/charベースに変換
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }

  /**
   * 特定のルールのみでチェック
   */
  checkWithRules(text: string, tokens: Token[], ruleNames: string[]): Diagnostic[] {
    // 行開始位置を計算
    this.calculateLineStarts(text);

    const sentences = SentenceParser.parseSentences(text, tokens);
    const context: RuleContext = {
      documentText: text,
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

    // offsetベースのrangeをline/charベースに変換
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }
}

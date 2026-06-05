/**
 * Advanced Rule Registry
 * 高度な文法ルールの登録リストを管理する
 */

import { AdvancedGrammarRule } from '../../../shared/src/advancedTypes';
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
  AmbiguousTermRule,
  BekiUsageRule,
  // Extended Grammar Rules - Tasks 14-25 (Feature: remaining-grammar-rules)
  OkuriganaVariantRule,
  OrthographyVariantRule,
  NumberWidthMixRule,
  KatakanaChouonRule,
  HalfwidthKanaRule,
  NumeralStyleMixRule,
  SpaceAroundUnitRule,
  BracketQuoteMismatchRule,
  DateFormatVariantRule,
  DashTildeNormalizationRule,
  NakaguroUsageRule,
  SymbolWidthMixRule,
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
  CodeBlockLanguageRule,
  // Official Document Rules (Feature: official-document-rules)
  OyobiNarabiniRule,
  MatawaWakushikuwaRule,
  JouyouKanjiRule,
  BulletPunctuationRule,
  // Sentence Complexity Rule (Feature: sentence-complexity-rule)
  SentenceComplexityRule
} from './rules';

/**
 * 軽量ルール名リスト
 * Feature: advanced-rules-tiered-execution
 *
 * 走査コストが低く即時実行に適したルール。
 * 正規表現マッチや単純な文字列検査のみで完結するルールを含む。
 */
export const LIGHTWEIGHT_RULE_NAMES: readonly string[] = [
  'alphabet-width',
  'halfwidth-kana',
  'number-width-mix',
  'symbol-width-mix',
  'katakana-chouon',
  'okurigana-variant',
  'orthography-variant',
  'dash-tilde-normalization',
  'nakaguro-usage',
  'bracket-quote-mismatch',
  'space-around-unit',
  'date-format-variant',
  'numeral-style-mix',
  'punctuation-style-mix',
  'quotation-style-mix',
  'bullet-style-mix',
  'emphasis-style-mix',
  'sentence-ending-colon',
  'ambiguous-term',
  'beki-usage'
] as const;

/**
 * 既定の高度ルールを生成する
 */
export function createDefaultAdvancedRules(): AdvancedGrammarRule[] {
  return [
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
    new AmbiguousTermRule(),
    new BekiUsageRule(),
    // Extended Grammar Rules - Tasks 14-25 (Feature: remaining-grammar-rules)
    new OkuriganaVariantRule(),
    new OrthographyVariantRule(),
    new NumberWidthMixRule(),
    new KatakanaChouonRule(),
    new HalfwidthKanaRule(),
    new NumeralStyleMixRule(),
    new SpaceAroundUnitRule(),
    new BracketQuoteMismatchRule(),
    new DateFormatVariantRule(),
    new DashTildeNormalizationRule(),
    new NakaguroUsageRule(),
    new SymbolWidthMixRule(),
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
    new CodeBlockLanguageRule(),
    // Official Document Rules (Feature: official-document-rules)
    new OyobiNarabiniRule(),
    new MatawaWakushikuwaRule(),
    new JouyouKanjiRule(),
    new BulletPunctuationRule(),
    // Sentence Complexity Rule (Feature: sentence-complexity-rule)
    new SentenceComplexityRule()
  ];
}

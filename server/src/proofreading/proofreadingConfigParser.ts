/**
 * VS Code設定形式から ProofreadingSettingsConfig へのパース
 * Feature: proofreading-settings-compat
 */

import { splitAndTrimCommas } from '../utils/stringUtils';
import {
  ProofreadingSettingsConfig,
  ProofreadingCategories,
  ProofreadingPreset,
  MergeMode,
  TypoCheckConfig,
  TermBaseConfig,
  TermJournalistConfig,
  ExpressionConfig,
  CharTypeConfig,
  LengthCheckConfig,
  EnvDependentConfig,
  PunctuationConfig,
  SpellCheckConfig,
  NotationVariantConfig,
  BracketConfig,
  QuoteLineConfig,
  DictionarySettings,
} from './proofreadingTypes';
import { DEFAULT_PROOFREADING_CONFIG } from './proofreadingDefaults';

function isValidNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function cloneDefaultProofreadingConfig(): ProofreadingSettingsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_PROOFREADING_CONFIG));
}

function applyBoolean(raw: Record<string, unknown>, key: string, apply: (value: boolean) => void): void {
  const value = raw[key];
  if (typeof value === 'boolean') {
    apply(value);
  }
}

function applyNumber(
  raw: Record<string, unknown>,
  key: string,
  min: number,
  max: number,
  apply: (value: number) => void
): void {
  const value = raw[key];
  if (isValidNumber(value, min, max)) {
    apply(value);
  }
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function applyStringArray(
  raw: Record<string, unknown>,
  key: string,
  apply: (value: string[]) => void
): void {
  const value = readStringArray(raw[key]);
  if (value !== undefined) {
    apply(value);
  }
}

function isProofreadingPreset(value: unknown): value is ProofreadingPreset {
  return value === 'video-default' || value === 'custom';
}

function isMergeMode(value: unknown): value is MergeMode {
  return value === 'override' || value === 'merge';
}

function isOkuriganaMode(value: unknown): value is TermBaseConfig['okuriganaMode'] {
  return value === 'public-text' || value === 'public-text-honkoku' || value === 'custom';
}

function isEnvDependentMode(value: unknown): value is EnvDependentConfig['mode'] {
  return value === 'all' || value === 'partial';
}

function applyRootSettings(raw: Record<string, unknown>, config: ProofreadingSettingsConfig): void {
  if (isProofreadingPreset(raw.preset)) {
    config.preset = raw.preset;
  }
  if (isMergeMode(raw.mergeMode)) {
    config.mergeMode = raw.mergeMode;
  }
}

function applyTypoSettings(raw: Record<string, unknown>, config: TypoCheckConfig): void {
  applyBoolean(raw, 'typo.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'typo.checkInBrackets', (v) => { config.checkInBrackets = v; });
  applyBoolean(raw, 'typo.raNuki', (v) => { config.raNuki = v; });
  applyBoolean(raw, 'typo.saIre', (v) => { config.saIre = v; });
  applyBoolean(raw, 'typo.doubleHonorific', (v) => { config.doubleHonorific = v; });
  applyBoolean(raw, 'typo.adverbAgreement', (v) => { config.adverbAgreement = v; });
  applyBoolean(raw, 'typo.eraFirstYear', (v) => { config.eraFirstYear = v; });
}

function applyTermBaseSettings(raw: Record<string, unknown>, config: TermBaseConfig): void {
  applyBoolean(raw, 'termBase.enable', (v) => { config.enable = v; });
  if (isOkuriganaMode(raw['termBase.okuriganaMode'])) {
    config.okuriganaMode = raw['termBase.okuriganaMode'];
  }
  applyBoolean(raw, 'termBase.jouyouKanji', (v) => { config.jouyouKanji = v; });
  applyBoolean(raw, 'termBase.oldKanji', (v) => { config.oldKanji = v; });
  applyBoolean(raw, 'termBase.kanjiOpening', (v) => { config.kanjiOpening = v; });
  applyBoolean(raw, 'termBase.excludeProperNouns', (v) => { config.excludeProperNouns = v; });
}

function applyTermJournalistSettings(raw: Record<string, unknown>, config: TermJournalistConfig): void {
  applyBoolean(raw, 'termJournalist.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'termJournalist.journalistHandbook', (v) => { config.journalistHandbook = v; });
}

function applyExpressionSettings(raw: Record<string, unknown>, config: ExpressionConfig): void {
  applyBoolean(raw, 'expression.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'expression.styleConsistency', (v) => { config.styleConsistency = v; });
  applyBoolean(raw, 'expression.redundant', (v) => { config.redundant = v; });
  applyBoolean(raw, 'expression.particleRepetition', (v) => { config.particleRepetition = v; });
  applyBoolean(raw, 'expression.doubleNegation', (v) => { config.doubleNegation = v; });
  applyBoolean(raw, 'expression.twistedSentence', (v) => { config.twistedSentence = v; });
}

function applyCharTypeSettings(raw: Record<string, unknown>, config: CharTypeConfig): void {
  applyBoolean(raw, 'charType.enable', (v) => { config.enable = v; });
}

function applyLengthSettings(raw: Record<string, unknown>, config: LengthCheckConfig): void {
  applyBoolean(raw, 'length.enable', (v) => { config.enable = v; });
  applyNumber(raw, 'length.sentence', 1, 999, (v) => { config.sentence = v; });
  applyNumber(raw, 'length.comma', 1, 999, (v) => { config.comma = v; });
  applyNumber(raw, 'length.hiragana', 1, 999, (v) => { config.hiragana = v; });
  applyNumber(raw, 'length.katakana', 1, 999, (v) => { config.katakana = v; });
  applyNumber(raw, 'length.kanji', 1, 999, (v) => { config.kanji = v; });
}

function applyEnvDependentSettings(raw: Record<string, unknown>, config: EnvDependentConfig): void {
  applyBoolean(raw, 'envDependent.enable', (v) => { config.enable = v; });
  if (isEnvDependentMode(raw['envDependent.mode'])) {
    config.mode = raw['envDependent.mode'];
  }
}

function applyPunctuationSettings(raw: Record<string, unknown>, config: PunctuationConfig): void {
  applyBoolean(raw, 'punctuation.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'punctuation.evenLeader', (v) => { config.evenLeader = v; });
  applyBoolean(raw, 'punctuation.evenDash', (v) => { config.evenDash = v; });
  applyBoolean(raw, 'punctuation.evenWave', (v) => { config.evenWave = v; });
  applyBoolean(raw, 'punctuation.spaceAfterQE', (v) => { config.spaceAfterQE = v; });
  applyBoolean(raw, 'punctuation.periodBeforeCloseBracket', (v) => { config.periodBeforeCloseBracket = v; });
}

function applySpellSettings(raw: Record<string, unknown>, config: SpellCheckConfig): void {
  applyBoolean(raw, 'spell.enable', (v) => { config.enable = v; });
}

function applyNotationVariantSettings(raw: Record<string, unknown>, config: NotationVariantConfig): void {
  applyBoolean(raw, 'notationVariant.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'notationVariant.katakanaOnly', (v) => { config.katakanaOnly = v; });
}

function applyBracketSettings(raw: Record<string, unknown>, config: BracketConfig): void {
  applyBoolean(raw, 'bracket.enable', (v) => { config.enable = v; });
  applyBoolean(raw, 'bracket.checkPairing', (v) => { config.checkPairing = v; });
  applyNumber(raw, 'bracket.maxDepth', 1, 10, (v) => { config.maxDepth = v; });
}

function readQuoteLineMarkers(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return splitAndTrimCommas(value);
  }
  return readStringArray(value);
}

function applyQuoteLineSettings(raw: Record<string, unknown>, config: QuoteLineConfig): void {
  applyBoolean(raw, 'quoteLine.enable', (v) => { config.enable = v; });
  const markers = readQuoteLineMarkers(raw['quoteLine.markers']);
  if (markers !== undefined) {
    config.markers = markers;
  }
}

function applyCategoryProofreadingSettings(
  raw: Record<string, unknown>,
  categories: ProofreadingCategories
): void {
  applyTypoSettings(raw, categories.typo);
  applyTermBaseSettings(raw, categories.termBase);
  applyTermJournalistSettings(raw, categories.termJournalist);
  applyExpressionSettings(raw, categories.expression);
  applyCharTypeSettings(raw, categories.charType);
  applyLengthSettings(raw, categories.length);
  applyEnvDependentSettings(raw, categories.envDependent);
  applyPunctuationSettings(raw, categories.punctuation);
  applySpellSettings(raw, categories.spell);
  applyNotationVariantSettings(raw, categories.notationVariant);
  applyBracketSettings(raw, categories.bracket);
  applyQuoteLineSettings(raw, categories.quoteLine);
}

function applyDictionarySettings(raw: Record<string, unknown>, config: DictionarySettings): void {
  applyStringArray(raw, 'dictionaries.proofreading', (v) => { config.proofreading = v; });
  applyStringArray(raw, 'dictionaries.spell', (v) => { config.spell = v; });
  applyStringArray(raw, 'dictionaries.rule', (v) => { config.rule = v; });
}

function applyProofreadingDescription(raw: Record<string, unknown>, config: ProofreadingSettingsConfig): void {
  if (typeof raw.description === 'string') {
    config.description = raw.description;
  }
}

export function parseProofreadingSettingsFromRaw(raw: Record<string, unknown>): ProofreadingSettingsConfig {
  const config = cloneDefaultProofreadingConfig();
  applyRootSettings(raw, config);
  applyCategoryProofreadingSettings(raw, config.categories);
  applyDictionarySettings(raw, config.dictionaries);
  applyProofreadingDescription(raw, config);
  return config;
}

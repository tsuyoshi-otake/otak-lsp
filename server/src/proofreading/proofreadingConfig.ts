/**
 * 校正設定レイヤー
 * Feature: proofreading-settings-compat
 * タスク1: 校正設定レイヤーの追加
 *
 * 校正設定画面に相当する設定の読込と実効設定の計算を行う
 */

import { AdvancedRulesConfig, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import { splitAndTrimCommas } from '../utils/stringUtils';

/**
 * 誤字チェックカテゴリの設定
 */
export interface TypoCheckConfig {
  enable: boolean;
  checkInBrackets: boolean;
  raNuki: boolean;
  saIre: boolean;
  doubleHonorific: boolean;
  adverbAgreement: boolean;
  eraFirstYear: boolean;
}

/**
 * 用語基準カテゴリの設定
 */
export interface TermBaseConfig {
  enable: boolean;
  okuriganaMode: 'public-text' | 'public-text-honkoku' | 'custom';
  okurigana: boolean;
  jouyouKanji: boolean;
  oldKanji: boolean;
  kanjiOpening: boolean;
  excludeProperNouns: boolean;
}

/**
 * 用語基準（記者ハンドブック）カテゴリの設定
 */
export interface TermJournalistConfig {
  enable: boolean;
  journalistHandbook: boolean;
  foreignWords: boolean;
  abbreviations: boolean;
}

/**
 * 表現洗練カテゴリの設定
 */
export interface ExpressionConfig {
  enable: boolean;
  styleConsistency: boolean;
  redundant: boolean;
  particleRepetition: boolean;
  doubleNegation: boolean;
  twistedSentence: boolean;
  modifierAmbiguity: boolean;
  parallelAmbiguity: boolean;
  businessPhrase: boolean;
  imperativeExpression: boolean;
  casualExpression: boolean;
  casualExpressionCheckInBrackets: boolean;
  tariMissing: boolean;
  bekuEnd: boolean;
}

/**
 * 字種統一カテゴリの設定
 */
export interface CharTypeConfig {
  enable: boolean;
  preferred: {
    unit: 'symbol' | 'katakana';
    punctuation: 'comma-period' | 'touten-kuten';
    katakana: 'full' | 'half';
    numeral: 'full' | 'half' | 'mix';
    symbol: 'full' | 'half';
    alphabet: 'full' | 'half';
    halfFullMix: 'full' | 'half' | 'mix';
  };
}

/**
 * 長さチェックカテゴリの設定
 */
export interface LengthCheckConfig {
  enable: boolean;
  sentence: number;
  comma: number;
  hiragana: number;
  katakana: number;
  kanji: number;
}

/**
 * 環境依存文字カテゴリの設定
 */
export interface EnvDependentConfig {
  enable: boolean;
  mode: 'all' | 'partial';
  checkUserCreatedGaiji: boolean;
  checkJIS2004ChangedGlyphs: boolean;
}

/**
 * 印刷標準字体カテゴリの設定
 */
export interface PrintingStandardConfig {
  enable: boolean;
}

/**
 * 約物チェックカテゴリの設定
 */
export interface PunctuationConfig {
  enable: boolean;
  evenLeader: boolean;
  evenDash: boolean;
  evenWave: boolean;
  lineStartSpace: boolean;
  spaceAfterQE: boolean;
  spaceBeforeCloseBracket: boolean;
  periodBeforeCloseBracket: boolean;
}

/**
 * スペルチェックカテゴリの設定
 */
export interface SpellCheckConfig {
  enable: boolean;
  checkUppercase: boolean;
  checkAllCaps: boolean;
  checkDigits: boolean;
  checkFullwidth: boolean;
  checkEmailUrl: boolean;
  checkRepeat: boolean;
  checkSentenceLowercase: boolean;
  checkPunctuation: boolean;
  checkSpaceMissing: boolean;
  dictionary: 'japanese-name' | 'user';
}

/**
 * 表記ゆれカテゴリの設定
 */
export interface NotationVariantConfig {
  enable: boolean;
  katakanaOnly: boolean;
  halfFullWidth: boolean;
  lowerUpper: boolean;
}

/**
 * 括弧カテゴリの設定
 */
export interface BracketConfig {
  enable: boolean;
  checkPairing: boolean;
  maxDepth: number;
}

/**
 * 引用行カテゴリの設定
 */
export interface QuoteLineConfig {
  enable: boolean;
  markers: string[];
}

/**
 * 校正設定の全カテゴリ
 */
export interface ProofreadingCategories {
  typo: TypoCheckConfig;
  termBase: TermBaseConfig;
  termJournalist: TermJournalistConfig;
  expression: ExpressionConfig;
  charType: CharTypeConfig;
  length: LengthCheckConfig;
  envDependent: EnvDependentConfig;
  printingStandard: PrintingStandardConfig;
  punctuation: PunctuationConfig;
  spell: SpellCheckConfig;
  notationVariant: NotationVariantConfig;
  bracket: BracketConfig;
  quoteLine: QuoteLineConfig;
}

/**
 * 辞書設定
 */
export interface DictionarySettings {
  proofreading: string[];
  spell: string[];
  rule: string[];
}

/**
 * 校正設定のプリセットタイプ
 */
export type ProofreadingPreset = 'video-default' | 'custom';

/**
 * マージモード
 */
export type MergeMode = 'override' | 'merge';

/**
 * 校正設定全体
 */
export interface ProofreadingSettingsConfig {
  preset: ProofreadingPreset;
  mergeMode: MergeMode;
  categories: ProofreadingCategories;
  dictionaries: DictionarySettings;
  description: string;
}

/**
 * デフォルトの校正設定
 */
export const DEFAULT_PROOFREADING_CONFIG: ProofreadingSettingsConfig = {
  preset: 'custom',
  mergeMode: 'override',
  categories: {
    typo: {
      enable: true,
      checkInBrackets: true,
      raNuki: true,
      saIre: true,
      doubleHonorific: true,
      adverbAgreement: true,
      eraFirstYear: true
    },
    termBase: {
      enable: true,
      okuriganaMode: 'public-text',
      okurigana: true,
      jouyouKanji: true,
      oldKanji: true,
      kanjiOpening: true,
      excludeProperNouns: true
    },
    termJournalist: {
      enable: false,
      journalistHandbook: false,
      foreignWords: false,
      abbreviations: false
    },
    expression: {
      enable: true,
      styleConsistency: true,
      redundant: true,
      particleRepetition: true,
      doubleNegation: true,
      twistedSentence: true,
      modifierAmbiguity: true,
      parallelAmbiguity: true,
      businessPhrase: true,
      imperativeExpression: true,
      casualExpression: true,
      casualExpressionCheckInBrackets: true,
      tariMissing: true,
      bekuEnd: true
    },
    charType: {
      enable: true,
      preferred: {
        unit: 'symbol',
        punctuation: 'touten-kuten',
        katakana: 'full',
        numeral: 'half',
        symbol: 'half',
        alphabet: 'half',
        halfFullMix: 'half'
      }
    },
    length: {
      enable: true,
      sentence: 120,
      comma: 4,
      hiragana: 18,
      katakana: 18,
      kanji: 10
    },
    envDependent: {
      enable: true,
      mode: 'all',
      checkUserCreatedGaiji: true,
      checkJIS2004ChangedGlyphs: true
    },
    printingStandard: {
      enable: false
    },
    punctuation: {
      enable: true,
      evenLeader: true,
      evenDash: true,
      evenWave: true,
      lineStartSpace: true,
      spaceAfterQE: true,
      spaceBeforeCloseBracket: false,
      periodBeforeCloseBracket: true
    },
    spell: {
      enable: false,
      checkUppercase: true,
      checkAllCaps: true,
      checkDigits: true,
      checkFullwidth: true,
      checkEmailUrl: true,
      checkRepeat: true,
      checkSentenceLowercase: true,
      checkPunctuation: true,
      checkSpaceMissing: true,
      dictionary: 'japanese-name'
    },
    notationVariant: {
      enable: true,
      katakanaOnly: false,
      halfFullWidth: true,
      lowerUpper: true
    },
    bracket: {
      enable: true,
      checkPairing: true,
      maxDepth: 3
    },
    quoteLine: {
      enable: true,
      markers: ['>', '|']
    }
  },
  dictionaries: {
    proofreading: [],
    spell: [],
    rule: []
  },
  description: ''
};

/**
 * 動画のチェック状態を再現するプリセット
 */
export const VIDEO_DEFAULT_PRESET: ProofreadingSettingsConfig = {
  ...DEFAULT_PROOFREADING_CONFIG,
  preset: 'video-default',
  categories: {
    ...DEFAULT_PROOFREADING_CONFIG.categories,
    typo: {
      ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
      enable: true
    },
    termBase: {
      ...DEFAULT_PROOFREADING_CONFIG.categories.termBase,
      enable: true
    },
    expression: {
      ...DEFAULT_PROOFREADING_CONFIG.categories.expression,
      enable: true
    }
  }
};

/**
 * プリセットを適用
 */
export function applyPreset(config: ProofreadingSettingsConfig): ProofreadingSettingsConfig {
  if (config.preset === 'video-default') {
    return {
      ...VIDEO_DEFAULT_PRESET,
      // ユーザーが明示的に設定した項目は保持
      dictionaries: config.dictionaries,
      description: config.description || VIDEO_DEFAULT_PRESET.description
    };
  }
  return config;
}

/**
 * 校正設定とAdvancedRulesConfigのマッピングクラス
 */
export class ProofreadingConfigMapper {
  /**
   * 校正設定からAdvancedRulesConfigへのパッチを生成
   */
  static mapToAdvancedConfig(config: ProofreadingSettingsConfig): Partial<AdvancedRulesConfig> {
    const effectiveConfig = applyPreset(config);
    const { categories } = effectiveConfig;
    const patch: Partial<AdvancedRulesConfig> = {};

    // 誤字チェック
    const typoEnabled = categories.typo.enable;
    patch.enableRaNukiDetection = typoEnabled && categories.typo.raNuki;
    patch.enableHonorificError = typoEnabled && categories.typo.doubleHonorific;
    patch.enableAdverbAgreement = typoEnabled && categories.typo.adverbAgreement;

    // 用語基準
    const termBaseEnabled = categories.termBase.enable;
    patch.enableOkuriganaVariant = termBaseEnabled && categories.termBase.okurigana;
    patch.enableJouyouKanji = termBaseEnabled && categories.termBase.jouyouKanji;
    patch.enableOrthographyVariant = termBaseEnabled && categories.termBase.oldKanji;
    patch.enableKanjiOpening = termBaseEnabled && categories.termBase.kanjiOpening;
    patch.excludeProperNounsFromJouyouKanji = categories.termBase.excludeProperNouns;

    // 表現洗練
    const expressionEnabled = categories.expression.enable;
    patch.enableStyleConsistency = expressionEnabled && categories.expression.styleConsistency;
    patch.enableRedundantExpression = expressionEnabled && categories.expression.redundant;
    patch.enableParticleRepetition = expressionEnabled && categories.expression.particleRepetition;
    patch.enableDoubleNegation = expressionEnabled && categories.expression.doubleNegation;
    patch.enableTwistedSentence = expressionEnabled && categories.expression.twistedSentence;
    patch.enableModifierPosition = expressionEnabled && categories.expression.modifierAmbiguity;

    // 字種統一
    const charTypeEnabled = categories.charType.enable;
    patch.enableNumberWidthMix = charTypeEnabled;
    patch.enableSymbolWidthMix = charTypeEnabled;
    patch.enableAlphabetWidth = charTypeEnabled;
    patch.enablePunctuationStyleMix = charTypeEnabled;
    patch.enableNumeralStyleMix = charTypeEnabled;

    // 長さチェック
    const lengthEnabled = categories.length.enable;
    patch.enableLongSentence = lengthEnabled;
    patch.longSentenceThreshold = categories.length.sentence;
    patch.enableCommaCount = lengthEnabled;
    patch.commaCountThreshold = categories.length.comma;

    // 括弧
    const bracketEnabled = categories.bracket.enable;
    patch.enableBracketQuoteMismatch = bracketEnabled && categories.bracket.checkPairing;

    // 表記ゆれ
    const notationVariantEnabled = categories.notationVariant.enable;
    patch.enableOrthographyVariant = notationVariantEnabled || (termBaseEnabled && categories.termBase.oldKanji);
    patch.enableKatakanaChouon = notationVariantEnabled;
    patch.enableHalfwidthKana = notationVariantEnabled;

    return patch;
  }

  /**
   * 校正設定とAdvanced設定をマージ
   */
  static mergeWithAdvanced(
    proofreadingConfig: ProofreadingSettingsConfig,
    advancedConfig: AdvancedRulesConfig
  ): AdvancedRulesConfig {
    const patch = this.mapToAdvancedConfig(proofreadingConfig);

    if (proofreadingConfig.mergeMode === 'override') {
      // 校正設定を優先
      return {
        ...advancedConfig,
        ...patch
      };
    } else {
      // ORで統合（どちらかが有効なら有効）
      const merged: AdvancedRulesConfig = { ...advancedConfig };
      for (const [key, value] of Object.entries(patch)) {
        if (typeof value === 'boolean') {
          const advancedValue = advancedConfig[key as keyof AdvancedRulesConfig];
          merged[key as keyof AdvancedRulesConfig] = (advancedValue || value) as never;
        } else if (typeof value === 'number') {
          // 数値はpatchの値を使用（ただしpatchが設定されている場合のみ）
          merged[key as keyof AdvancedRulesConfig] = value as never;
        }
      }
      return merged;
    }
  }
}

/**
 * 数値が有効な範囲内かをチェック
 */
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

function applyRootProofreadingSettings(
  raw: Record<string, unknown>,
  config: ProofreadingSettingsConfig
): void {
  if (isProofreadingPreset(raw.preset)) {
    config.preset = raw.preset;
  }

  if (isMergeMode(raw.mergeMode)) {
    config.mergeMode = raw.mergeMode;
  }
}

function applyTypoSettings(raw: Record<string, unknown>, config: TypoCheckConfig): void {
  applyBoolean(raw, 'typo.enable', value => { config.enable = value; });
  applyBoolean(raw, 'typo.checkInBrackets', value => { config.checkInBrackets = value; });
  applyBoolean(raw, 'typo.raNuki', value => { config.raNuki = value; });
  applyBoolean(raw, 'typo.saIre', value => { config.saIre = value; });
  applyBoolean(raw, 'typo.doubleHonorific', value => { config.doubleHonorific = value; });
  applyBoolean(raw, 'typo.adverbAgreement', value => { config.adverbAgreement = value; });
  applyBoolean(raw, 'typo.eraFirstYear', value => { config.eraFirstYear = value; });
}

function applyTermBaseSettings(raw: Record<string, unknown>, config: TermBaseConfig): void {
  applyBoolean(raw, 'termBase.enable', value => { config.enable = value; });
  if (isOkuriganaMode(raw['termBase.okuriganaMode'])) {
    config.okuriganaMode = raw['termBase.okuriganaMode'];
  }
  applyBoolean(raw, 'termBase.jouyouKanji', value => { config.jouyouKanji = value; });
  applyBoolean(raw, 'termBase.oldKanji', value => { config.oldKanji = value; });
  applyBoolean(raw, 'termBase.kanjiOpening', value => { config.kanjiOpening = value; });
  applyBoolean(raw, 'termBase.excludeProperNouns', value => { config.excludeProperNouns = value; });
}

function applyTermJournalistSettings(raw: Record<string, unknown>, config: TermJournalistConfig): void {
  applyBoolean(raw, 'termJournalist.enable', value => { config.enable = value; });
  applyBoolean(raw, 'termJournalist.journalistHandbook', value => { config.journalistHandbook = value; });
}

function applyExpressionSettings(raw: Record<string, unknown>, config: ExpressionConfig): void {
  applyBoolean(raw, 'expression.enable', value => { config.enable = value; });
  applyBoolean(raw, 'expression.styleConsistency', value => { config.styleConsistency = value; });
  applyBoolean(raw, 'expression.redundant', value => { config.redundant = value; });
  applyBoolean(raw, 'expression.particleRepetition', value => { config.particleRepetition = value; });
  applyBoolean(raw, 'expression.doubleNegation', value => { config.doubleNegation = value; });
  applyBoolean(raw, 'expression.twistedSentence', value => { config.twistedSentence = value; });
}

function applyCharTypeSettings(raw: Record<string, unknown>, config: CharTypeConfig): void {
  applyBoolean(raw, 'charType.enable', value => { config.enable = value; });
}

function applyLengthSettings(raw: Record<string, unknown>, config: LengthCheckConfig): void {
  applyBoolean(raw, 'length.enable', value => { config.enable = value; });
  applyNumber(raw, 'length.sentence', 1, 999, value => { config.sentence = value; });
  applyNumber(raw, 'length.comma', 1, 999, value => { config.comma = value; });
  applyNumber(raw, 'length.hiragana', 1, 999, value => { config.hiragana = value; });
  applyNumber(raw, 'length.katakana', 1, 999, value => { config.katakana = value; });
  applyNumber(raw, 'length.kanji', 1, 999, value => { config.kanji = value; });
}

function applyEnvDependentSettings(raw: Record<string, unknown>, config: EnvDependentConfig): void {
  applyBoolean(raw, 'envDependent.enable', value => { config.enable = value; });
  if (isEnvDependentMode(raw['envDependent.mode'])) {
    config.mode = raw['envDependent.mode'];
  }
}

function applyPunctuationSettings(raw: Record<string, unknown>, config: PunctuationConfig): void {
  applyBoolean(raw, 'punctuation.enable', value => { config.enable = value; });
  applyBoolean(raw, 'punctuation.evenLeader', value => { config.evenLeader = value; });
  applyBoolean(raw, 'punctuation.evenDash', value => { config.evenDash = value; });
  applyBoolean(raw, 'punctuation.evenWave', value => { config.evenWave = value; });
  applyBoolean(raw, 'punctuation.spaceAfterQE', value => { config.spaceAfterQE = value; });
  applyBoolean(raw, 'punctuation.periodBeforeCloseBracket', value => { config.periodBeforeCloseBracket = value; });
}

function applySpellSettings(raw: Record<string, unknown>, config: SpellCheckConfig): void {
  applyBoolean(raw, 'spell.enable', value => { config.enable = value; });
}

function applyNotationVariantSettings(raw: Record<string, unknown>, config: NotationVariantConfig): void {
  applyBoolean(raw, 'notationVariant.enable', value => { config.enable = value; });
  applyBoolean(raw, 'notationVariant.katakanaOnly', value => { config.katakanaOnly = value; });
}

function applyBracketSettings(raw: Record<string, unknown>, config: BracketConfig): void {
  applyBoolean(raw, 'bracket.enable', value => { config.enable = value; });
  applyBoolean(raw, 'bracket.checkPairing', value => { config.checkPairing = value; });
  applyNumber(raw, 'bracket.maxDepth', 1, 10, value => { config.maxDepth = value; });
}

function readQuoteLineMarkers(value: unknown): string[] | undefined {
  if (typeof value === 'string') {
    return splitAndTrimCommas(value);
  }
  return readStringArray(value);
}

function applyQuoteLineSettings(raw: Record<string, unknown>, config: QuoteLineConfig): void {
  applyBoolean(raw, 'quoteLine.enable', value => { config.enable = value; });

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
  applyStringArray(raw, 'dictionaries.proofreading', value => { config.proofreading = value; });
  applyStringArray(raw, 'dictionaries.spell', value => { config.spell = value; });
  applyStringArray(raw, 'dictionaries.rule', value => { config.rule = value; });
}

function applyProofreadingDescription(raw: Record<string, unknown>, config: ProofreadingSettingsConfig): void {
  if (typeof raw.description === 'string') {
    config.description = raw.description;
  }
}

/**
 * VS Code設定形式からProofreadingSettingsConfigを生成
 */
export function parseProofreadingSettingsFromRaw(raw: Record<string, unknown>): ProofreadingSettingsConfig {
  const config = cloneDefaultProofreadingConfig();

  applyRootProofreadingSettings(raw, config);
  applyCategoryProofreadingSettings(raw, config.categories);
  applyDictionarySettings(raw, config.dictionaries);
  applyProofreadingDescription(raw, config);

  return config;
}

/**
 * 校正設定をAdvancedRulesConfigに適用
 */
export function applyProofreadingSettings(
  proofreadingConfig: ProofreadingSettingsConfig,
  advancedConfig: AdvancedRulesConfig
): AdvancedRulesConfig {
  return ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);
}

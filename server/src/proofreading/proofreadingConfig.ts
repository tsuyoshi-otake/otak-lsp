/**
 * 校正設定レイヤー
 * Feature: proofreading-settings-compat
 * タスク1: 校正設定レイヤーの追加
 *
 * 校正設定画面に相当する設定の読込と実効設定の計算を行う
 */

import { AdvancedRulesConfig, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

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

/**
 * VS Code設定形式からProofreadingSettingsConfigを生成
 */
export function parseProofreadingSettingsFromRaw(raw: Record<string, unknown>): ProofreadingSettingsConfig {
  const config: ProofreadingSettingsConfig = JSON.parse(JSON.stringify(DEFAULT_PROOFREADING_CONFIG));

  // プリセット
  if (raw.preset === 'video-default' || raw.preset === 'custom') {
    config.preset = raw.preset;
  }

  // マージモード
  if (raw.mergeMode === 'override' || raw.mergeMode === 'merge') {
    config.mergeMode = raw.mergeMode;
  }

  // 誤字チェック
  if (typeof raw['typo.enable'] === 'boolean') {
    config.categories.typo.enable = raw['typo.enable'];
  }
  if (typeof raw['typo.checkInBrackets'] === 'boolean') {
    config.categories.typo.checkInBrackets = raw['typo.checkInBrackets'];
  }
  if (typeof raw['typo.raNuki'] === 'boolean') {
    config.categories.typo.raNuki = raw['typo.raNuki'];
  }
  if (typeof raw['typo.saIre'] === 'boolean') {
    config.categories.typo.saIre = raw['typo.saIre'];
  }
  if (typeof raw['typo.doubleHonorific'] === 'boolean') {
    config.categories.typo.doubleHonorific = raw['typo.doubleHonorific'];
  }
  if (typeof raw['typo.adverbAgreement'] === 'boolean') {
    config.categories.typo.adverbAgreement = raw['typo.adverbAgreement'];
  }
  if (typeof raw['typo.eraFirstYear'] === 'boolean') {
    config.categories.typo.eraFirstYear = raw['typo.eraFirstYear'];
  }

  // 用語基準
  if (typeof raw['termBase.enable'] === 'boolean') {
    config.categories.termBase.enable = raw['termBase.enable'];
  }
  if (raw['termBase.okuriganaMode'] === 'public-text' ||
      raw['termBase.okuriganaMode'] === 'public-text-honkoku' ||
      raw['termBase.okuriganaMode'] === 'custom') {
    config.categories.termBase.okuriganaMode = raw['termBase.okuriganaMode'];
  }
  if (typeof raw['termBase.jouyouKanji'] === 'boolean') {
    config.categories.termBase.jouyouKanji = raw['termBase.jouyouKanji'];
  }
  if (typeof raw['termBase.oldKanji'] === 'boolean') {
    config.categories.termBase.oldKanji = raw['termBase.oldKanji'];
  }
  if (typeof raw['termBase.kanjiOpening'] === 'boolean') {
    config.categories.termBase.kanjiOpening = raw['termBase.kanjiOpening'];
  }
  if (typeof raw['termBase.excludeProperNouns'] === 'boolean') {
    config.categories.termBase.excludeProperNouns = raw['termBase.excludeProperNouns'];
  }

  // 用語基準（記者ハンドブック）
  if (typeof raw['termJournalist.enable'] === 'boolean') {
    config.categories.termJournalist.enable = raw['termJournalist.enable'];
  }
  if (typeof raw['termJournalist.journalistHandbook'] === 'boolean') {
    config.categories.termJournalist.journalistHandbook = raw['termJournalist.journalistHandbook'];
  }

  // 表現洗練
  if (typeof raw['expression.enable'] === 'boolean') {
    config.categories.expression.enable = raw['expression.enable'];
  }
  if (typeof raw['expression.styleConsistency'] === 'boolean') {
    config.categories.expression.styleConsistency = raw['expression.styleConsistency'];
  }
  if (typeof raw['expression.redundant'] === 'boolean') {
    config.categories.expression.redundant = raw['expression.redundant'];
  }
  if (typeof raw['expression.particleRepetition'] === 'boolean') {
    config.categories.expression.particleRepetition = raw['expression.particleRepetition'];
  }
  if (typeof raw['expression.doubleNegation'] === 'boolean') {
    config.categories.expression.doubleNegation = raw['expression.doubleNegation'];
  }
  if (typeof raw['expression.twistedSentence'] === 'boolean') {
    config.categories.expression.twistedSentence = raw['expression.twistedSentence'];
  }

  // 字種統一
  if (typeof raw['charType.enable'] === 'boolean') {
    config.categories.charType.enable = raw['charType.enable'];
  }

  // 長さチェック
  if (typeof raw['length.enable'] === 'boolean') {
    config.categories.length.enable = raw['length.enable'];
  }
  if (isValidNumber(raw['length.sentence'], 1, 999)) {
    config.categories.length.sentence = raw['length.sentence'];
  }
  if (isValidNumber(raw['length.comma'], 1, 999)) {
    config.categories.length.comma = raw['length.comma'];
  }
  if (isValidNumber(raw['length.hiragana'], 1, 999)) {
    config.categories.length.hiragana = raw['length.hiragana'];
  }
  if (isValidNumber(raw['length.katakana'], 1, 999)) {
    config.categories.length.katakana = raw['length.katakana'];
  }
  if (isValidNumber(raw['length.kanji'], 1, 999)) {
    config.categories.length.kanji = raw['length.kanji'];
  }

  // 環境依存文字
  if (typeof raw['envDependent.enable'] === 'boolean') {
    config.categories.envDependent.enable = raw['envDependent.enable'];
  }
  if (raw['envDependent.mode'] === 'all' || raw['envDependent.mode'] === 'partial') {
    config.categories.envDependent.mode = raw['envDependent.mode'];
  }

  // 約物
  if (typeof raw['punctuation.enable'] === 'boolean') {
    config.categories.punctuation.enable = raw['punctuation.enable'];
  }
  if (typeof raw['punctuation.evenLeader'] === 'boolean') {
    config.categories.punctuation.evenLeader = raw['punctuation.evenLeader'];
  }
  if (typeof raw['punctuation.evenDash'] === 'boolean') {
    config.categories.punctuation.evenDash = raw['punctuation.evenDash'];
  }
  if (typeof raw['punctuation.evenWave'] === 'boolean') {
    config.categories.punctuation.evenWave = raw['punctuation.evenWave'];
  }
  if (typeof raw['punctuation.spaceAfterQE'] === 'boolean') {
    config.categories.punctuation.spaceAfterQE = raw['punctuation.spaceAfterQE'];
  }
  if (typeof raw['punctuation.periodBeforeCloseBracket'] === 'boolean') {
    config.categories.punctuation.periodBeforeCloseBracket = raw['punctuation.periodBeforeCloseBracket'];
  }

  // スペルチェック
  if (typeof raw['spell.enable'] === 'boolean') {
    config.categories.spell.enable = raw['spell.enable'];
  }

  // 表記ゆれ
  if (typeof raw['notationVariant.enable'] === 'boolean') {
    config.categories.notationVariant.enable = raw['notationVariant.enable'];
  }
  if (typeof raw['notationVariant.katakanaOnly'] === 'boolean') {
    config.categories.notationVariant.katakanaOnly = raw['notationVariant.katakanaOnly'];
  }

  // 括弧
  if (typeof raw['bracket.enable'] === 'boolean') {
    config.categories.bracket.enable = raw['bracket.enable'];
  }
  if (typeof raw['bracket.checkPairing'] === 'boolean') {
    config.categories.bracket.checkPairing = raw['bracket.checkPairing'];
  }
  if (isValidNumber(raw['bracket.maxDepth'], 1, 10)) {
    config.categories.bracket.maxDepth = raw['bracket.maxDepth'];
  }

  // 引用行
  if (typeof raw['quoteLine.enable'] === 'boolean') {
    config.categories.quoteLine.enable = raw['quoteLine.enable'];
  }
  if (typeof raw['quoteLine.markers'] === 'string') {
    config.categories.quoteLine.markers = raw['quoteLine.markers'].split(',').map(s => s.trim()).filter(s => s);
  } else if (Array.isArray(raw['quoteLine.markers'])) {
    config.categories.quoteLine.markers = raw['quoteLine.markers'].filter((m): m is string => typeof m === 'string');
  }

  // 辞書
  if (Array.isArray(raw['dictionaries.proofreading'])) {
    config.dictionaries.proofreading = raw['dictionaries.proofreading'].filter((p): p is string => typeof p === 'string');
  }
  if (Array.isArray(raw['dictionaries.spell'])) {
    config.dictionaries.spell = raw['dictionaries.spell'].filter((p): p is string => typeof p === 'string');
  }
  if (Array.isArray(raw['dictionaries.rule'])) {
    config.dictionaries.rule = raw['dictionaries.rule'].filter((p): p is string => typeof p === 'string');
  }

  // 説明
  if (typeof raw.description === 'string') {
    config.description = raw.description;
  }

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

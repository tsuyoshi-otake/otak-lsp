/**
 * 校正設定とAdvancedRulesConfigのマッピング
 * Feature: proofreading-settings-compat
 */

import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';
import { ProofreadingSettingsConfig, ProofreadingCategories } from './proofreadingTypes';
import { applyPreset } from './proofreadingDefaults';

function mapTypoSettings(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = categories.typo.enable;
  patch.enableRaNukiDetection = enabled && categories.typo.raNuki;
  patch.enableHonorificError = enabled && categories.typo.doubleHonorific;
  patch.enableAdverbAgreement = enabled && categories.typo.adverbAgreement;
}

function mapTermBaseSettings(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = categories.termBase.enable;
  patch.enableOkuriganaVariant = enabled && categories.termBase.okurigana;
  patch.enableJouyouKanji = enabled && categories.termBase.jouyouKanji;
  patch.enableOrthographyVariant = enabled && categories.termBase.oldKanji;
  patch.enableKanjiOpening = enabled && categories.termBase.kanjiOpening;
  patch.excludeProperNounsFromJouyouKanji = categories.termBase.excludeProperNouns;
}

function mapExpressionSettings(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = categories.expression.enable;
  patch.enableStyleConsistency = enabled && categories.expression.styleConsistency;
  patch.enableRedundantExpression = enabled && categories.expression.redundant;
  patch.enableParticleRepetition = enabled && categories.expression.particleRepetition;
  patch.enableDoubleNegation = enabled && categories.expression.doubleNegation;
  patch.enableTwistedSentence = enabled && categories.expression.twistedSentence;
  patch.enableModifierPosition = enabled && categories.expression.modifierAmbiguity;
}

function mapCharTypeSettings(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = categories.charType.enable;
  patch.enableNumberWidthMix = enabled;
  patch.enableSymbolWidthMix = enabled;
  patch.enableAlphabetWidth = enabled;
  patch.enablePunctuationStyleMix = enabled;
  patch.enableNumeralStyleMix = enabled;
}

function mapLengthSettings(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = categories.length.enable;
  patch.enableLongSentence = enabled;
  patch.longSentenceThreshold = categories.length.sentence;
  patch.enableCommaCount = enabled;
  patch.commaCountThreshold = categories.length.comma;
}

function mapNotationVariantAndBracket(categories: ProofreadingCategories, patch: Partial<AdvancedRulesConfig>): void {
  const notationEnabled = categories.notationVariant.enable;
  const termBaseEnabled = categories.termBase.enable;

  patch.enableBracketQuoteMismatch = categories.bracket.enable && categories.bracket.checkPairing;
  patch.enableOrthographyVariant = notationEnabled || (termBaseEnabled && categories.termBase.oldKanji);
  patch.enableKatakanaChouon = notationEnabled;
  patch.enableHalfwidthKana = notationEnabled;
}

export class ProofreadingConfigMapper {
  static mapToAdvancedConfig(config: ProofreadingSettingsConfig): Partial<AdvancedRulesConfig> {
    const effectiveConfig = applyPreset(config);
    const { categories } = effectiveConfig;
    const patch: Partial<AdvancedRulesConfig> = {};

    mapTypoSettings(categories, patch);
    mapTermBaseSettings(categories, patch);
    mapExpressionSettings(categories, patch);
    mapCharTypeSettings(categories, patch);
    mapLengthSettings(categories, patch);
    mapNotationVariantAndBracket(categories, patch);

    return patch;
  }

  static mergeWithAdvanced(
    proofreadingConfig: ProofreadingSettingsConfig,
    advancedConfig: AdvancedRulesConfig
  ): AdvancedRulesConfig {
    const patch = this.mapToAdvancedConfig(proofreadingConfig);

    if (proofreadingConfig.mergeMode === 'override') {
      return { ...advancedConfig, ...patch };
    }

    const merged: AdvancedRulesConfig = { ...advancedConfig };
    for (const [key, value] of Object.entries(patch)) {
      if (typeof value === 'boolean') {
        const advancedValue = advancedConfig[key as keyof AdvancedRulesConfig];
        merged[key as keyof AdvancedRulesConfig] = (advancedValue || value) as never;
      } else if (typeof value === 'number') {
        merged[key as keyof AdvancedRulesConfig] = value as never;
      }
    }
    return merged;
  }
}

export function applyProofreadingSettings(
  proofreadingConfig: ProofreadingSettingsConfig,
  advancedConfig: AdvancedRulesConfig
): AdvancedRulesConfig {
  return ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);
}

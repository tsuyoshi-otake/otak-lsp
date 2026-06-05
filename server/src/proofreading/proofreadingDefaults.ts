/**
 * 校正設定のデフォルト値とプリセット
 * Feature: proofreading-settings-compat
 */

import { ProofreadingSettingsConfig } from './proofreadingTypes';

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
      eraFirstYear: true,
    },
    termBase: {
      enable: true,
      okuriganaMode: 'public-text',
      okurigana: true,
      jouyouKanji: true,
      oldKanji: true,
      kanjiOpening: true,
      excludeProperNouns: true,
    },
    termJournalist: {
      enable: false,
      journalistHandbook: false,
      foreignWords: false,
      abbreviations: false,
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
      bekuEnd: true,
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
        halfFullMix: 'half',
      },
    },
    length: {
      enable: true,
      sentence: 120,
      comma: 4,
      hiragana: 18,
      katakana: 18,
      kanji: 10,
    },
    envDependent: {
      enable: true,
      mode: 'all',
      checkUserCreatedGaiji: true,
      checkJIS2004ChangedGlyphs: true,
    },
    printingStandard: {
      enable: false,
    },
    punctuation: {
      enable: true,
      evenLeader: true,
      evenDash: true,
      evenWave: true,
      lineStartSpace: true,
      spaceAfterQE: true,
      spaceBeforeCloseBracket: false,
      periodBeforeCloseBracket: true,
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
      dictionary: 'japanese-name',
    },
    notationVariant: {
      enable: true,
      katakanaOnly: false,
      halfFullWidth: true,
      lowerUpper: true,
    },
    bracket: {
      enable: true,
      checkPairing: true,
      maxDepth: 3,
    },
    quoteLine: {
      enable: true,
      markers: ['>', '|'],
    },
  },
  dictionaries: {
    proofreading: [],
    spell: [],
    rule: [],
  },
  description: '',
};

export const VIDEO_DEFAULT_PRESET: ProofreadingSettingsConfig = {
  ...DEFAULT_PROOFREADING_CONFIG,
  preset: 'video-default',
  categories: {
    ...DEFAULT_PROOFREADING_CONFIG.categories,
    typo: { ...DEFAULT_PROOFREADING_CONFIG.categories.typo, enable: true },
    termBase: { ...DEFAULT_PROOFREADING_CONFIG.categories.termBase, enable: true },
    expression: { ...DEFAULT_PROOFREADING_CONFIG.categories.expression, enable: true },
  },
};

export function applyPreset(config: ProofreadingSettingsConfig): ProofreadingSettingsConfig {
  if (config.preset === 'video-default') {
    return {
      ...VIDEO_DEFAULT_PRESET,
      dictionaries: config.dictionaries,
      description: config.description || VIDEO_DEFAULT_PRESET.description,
    };
  }
  return config;
}

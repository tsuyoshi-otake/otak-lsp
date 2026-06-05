/**
 * 校正設定のドメイン型
 * Feature: proofreading-settings-compat
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

export interface TermBaseConfig {
  enable: boolean;
  okuriganaMode: 'public-text' | 'public-text-honkoku' | 'custom';
  okurigana: boolean;
  jouyouKanji: boolean;
  oldKanji: boolean;
  kanjiOpening: boolean;
  excludeProperNouns: boolean;
}

export interface TermJournalistConfig {
  enable: boolean;
  journalistHandbook: boolean;
  foreignWords: boolean;
  abbreviations: boolean;
}

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

export interface LengthCheckConfig {
  enable: boolean;
  sentence: number;
  comma: number;
  hiragana: number;
  katakana: number;
  kanji: number;
}

export interface EnvDependentConfig {
  enable: boolean;
  mode: 'all' | 'partial';
  checkUserCreatedGaiji: boolean;
  checkJIS2004ChangedGlyphs: boolean;
}

export interface PrintingStandardConfig {
  enable: boolean;
}

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

export interface NotationVariantConfig {
  enable: boolean;
  katakanaOnly: boolean;
  halfFullWidth: boolean;
  lowerUpper: boolean;
}

export interface BracketConfig {
  enable: boolean;
  checkPairing: boolean;
  maxDepth: number;
}

export interface QuoteLineConfig {
  enable: boolean;
  markers: string[];
}

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

export interface DictionarySettings {
  proofreading: string[];
  spell: string[];
  rule: string[];
}

export type ProofreadingPreset = 'video-default' | 'custom';

export type MergeMode = 'override' | 'merge';

export interface ProofreadingSettingsConfig {
  preset: ProofreadingPreset;
  mergeMode: MergeMode;
  categories: ProofreadingCategories;
  dictionaries: DictionarySettings;
  description: string;
}

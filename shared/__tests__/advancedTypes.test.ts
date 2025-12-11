/**
 * 高度な文法ルール用型定義のユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.1, 11.1
 */

import {
  AdvancedGrammarErrorType,
  Sentence,
  StyleType,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  WeakExpressionLevel
} from '../src/advancedTypes';

describe('Advanced Grammar Types', () => {
  describe('AdvancedGrammarErrorType', () => {
    it('should include all advanced error types', () => {
      const errorTypes: AdvancedGrammarErrorType[] = [
        'style-inconsistency',
        'ra-nuki',
        'double-negation',
        'particle-repetition',
        'conjunction-repetition',
        'adversative-ga',
        'alphabet-width',
        'weak-expression',
        'comma-count',
        'term-notation',
        'kanji-opening'
      ];

      // 各エラータイプが文字列であることを確認
      errorTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Sentence', () => {
    it('should create a sentence with required properties', () => {
      const sentence = new Sentence({
        text: 'これはテストです。',
        tokens: [],
        start: 0,
        end: 9
      });

      expect(sentence.text).toBe('これはテストです。');
      expect(sentence.tokens).toEqual([]);
      expect(sentence.start).toBe(0);
      expect(sentence.end).toBe(9);
    });

    it('should count commas correctly', () => {
      const sentence = new Sentence({
        text: 'これは、テストで、あります。',
        tokens: [],
        start: 0,
        end: 14
      });

      expect(sentence.commaCount).toBe(2);
    });

    it('should detect desu-masu ending', () => {
      const sentenceDesu = new Sentence({
        text: 'これはテストです',
        tokens: [],
        start: 0,
        end: 8
      });
      expect(sentenceDesu.endsWithDesuMasu()).toBe(true);

      const sentenceMasu = new Sentence({
        text: 'テストします',
        tokens: [],
        start: 0,
        end: 6
      });
      expect(sentenceMasu.endsWithDesuMasu()).toBe(true);
    });

    it('should detect dearu ending', () => {
      const sentence = new Sentence({
        text: 'これはテストである',
        tokens: [],
        start: 0,
        end: 9
      });
      expect(sentence.endsWithDearu()).toBe(true);
    });

    it('should not detect desu-masu for dearu ending', () => {
      const sentence = new Sentence({
        text: 'これはテストである',
        tokens: [],
        start: 0,
        end: 9
      });
      expect(sentence.endsWithDesuMasu()).toBe(false);
    });

    it('should not detect dearu for da ending', () => {
      const sentence = new Sentence({
        text: 'これはテストだ',
        tokens: [],
        start: 0,
        end: 7
      });
      expect(sentence.endsWithDearu()).toBe(false);
    });
  });

  describe('StyleType', () => {
    it('should have correct style types', () => {
      const styles: StyleType[] = ['keigo', 'joutai', 'neutral'];
      expect(styles).toContain('keigo');
      expect(styles).toContain('joutai');
      expect(styles).toContain('neutral');
    });
  });

  describe('AdvancedRulesConfig', () => {
    it('should have default config with correct values', () => {
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      // ルールの有効/無効設定
      expect(config.enableStyleConsistency).toBe(true);
      expect(config.enableRaNukiDetection).toBe(true);
      expect(config.enableDoubleNegation).toBe(true);
      expect(config.enableParticleRepetition).toBe(false); // 初期設定で無効
      expect(config.enableConjunctionRepetition).toBe(true);
      expect(config.enableAdversativeGa).toBe(true);
      expect(config.enableAlphabetWidth).toBe(true);
      expect(config.enableWeakExpression).toBe(true);
      expect(config.enableCommaCount).toBe(true);
      expect(config.enableTermNotation).toBe(true);
      expect(config.enableKanjiOpening).toBe(true);

      // 技術用語辞典の有効/無効設定
      expect(config.enableWebTechDictionary).toBe(true);
      expect(config.enableGenerativeAIDictionary).toBe(true);
      expect(config.enableAWSDictionary).toBe(true);
      expect(config.enableAzureDictionary).toBe(true);
      expect(config.enableOCIDictionary).toBe(true);

      // その他の設定
      expect(config.commaCountThreshold).toBe(4);
      expect(config.weakExpressionLevel).toBe('normal');
    });

    it('should allow custom config values', () => {
      const customConfig: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableParticleRepetition: true,
        commaCountThreshold: 3,
        weakExpressionLevel: 'strict'
      };

      expect(customConfig.enableParticleRepetition).toBe(true);
      expect(customConfig.commaCountThreshold).toBe(3);
      expect(customConfig.weakExpressionLevel).toBe('strict');
    });
  });

  describe('WeakExpressionLevel', () => {
    it('should have correct levels', () => {
      const levels: WeakExpressionLevel[] = ['strict', 'normal', 'loose'];
      expect(levels).toContain('strict');
      expect(levels).toContain('normal');
      expect(levels).toContain('loose');
    });
  });
});

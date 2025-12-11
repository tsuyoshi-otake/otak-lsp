/**
 * Style Consistency Ruleのユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 1.2, 1.3, 1.5
 */

import { StyleConsistencyRule } from './styleConsistencyRule';
import { Token } from '../../../../shared/src/types';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('StyleConsistencyRule', () => {
  let rule: StyleConsistencyRule;

  beforeEach(() => {
    rule = new StyleConsistencyRule();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  const createContext = (text: string, sentences: Sentence[]): RuleContext => ({
    documentText: text,
    sentences,
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('detectStyle', () => {
    it('should detect keigo style for desu ending', () => {
      const sentence = new Sentence({
        text: 'これはテストです',
        tokens: [],
        start: 0,
        end: 8
      });
      expect(rule.detectStyle(sentence)).toBe('keigo');
    });

    it('should detect keigo style for masu ending', () => {
      const sentence = new Sentence({
        text: 'テストします',
        tokens: [],
        start: 0,
        end: 6
      });
      expect(rule.detectStyle(sentence)).toBe('keigo');
    });

    it('should detect joutai style for dearu ending', () => {
      const sentence = new Sentence({
        text: 'これはテストである',
        tokens: [],
        start: 0,
        end: 9
      });
      expect(rule.detectStyle(sentence)).toBe('joutai');
    });

    it('should detect neutral style for da ending', () => {
      const sentence = new Sentence({
        text: 'これはテストだ',
        tokens: [],
        start: 0,
        end: 7
      });
      expect(rule.detectStyle(sentence)).toBe('neutral');
    });

    it('should detect neutral style for verb ending', () => {
      const sentence = new Sentence({
        text: '私は行く',
        tokens: [],
        start: 0,
        end: 4
      });
      expect(rule.detectStyle(sentence)).toBe('neutral');
    });

    it('should handle sentence with period', () => {
      const sentence = new Sentence({
        text: 'これはテストです。',
        tokens: [],
        start: 0,
        end: 9
      });
      expect(rule.detectStyle(sentence)).toBe('keigo');
    });
  });

  describe('check', () => {
    it('should detect style inconsistency when keigo and joutai are mixed', () => {
      const sentences = [
        new Sentence({ text: 'これはテストです。', tokens: [], start: 0, end: 9 }),
        new Sentence({ text: 'これはテストである。', tokens: [], start: 9, end: 19 })
      ];
      const context = createContext('これはテストです。これはテストである。', sentences);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('style-inconsistency');
    });

    it('should not detect inconsistency when only keigo is used', () => {
      const sentences = [
        new Sentence({ text: 'これはテストです。', tokens: [], start: 0, end: 9 }),
        new Sentence({ text: 'これもテストです。', tokens: [], start: 9, end: 18 })
      ];
      const context = createContext('これはテストです。これもテストです。', sentences);

      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect inconsistency when only joutai is used', () => {
      const sentences = [
        new Sentence({ text: 'これはテストである。', tokens: [], start: 0, end: 10 }),
        new Sentence({ text: 'これもテストである。', tokens: [], start: 10, end: 20 })
      ];
      const context = createContext('これはテストである。これもテストである。', sentences);

      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not flag neutral style sentences', () => {
      const sentences = [
        new Sentence({ text: 'これはテストです。', tokens: [], start: 0, end: 9 }),
        new Sentence({ text: 'これはテストだ。', tokens: [], start: 9, end: 17 })
      ];
      const context = createContext('これはテストです。これはテストだ。', sentences);

      const diagnostics = rule.check([], context);

      // 「だ」は中立なので、敬体との混在は検出しない
      expect(diagnostics).toHaveLength(0);
    });

    it('should include suggestion in diagnostic', () => {
      const sentences = [
        new Sentence({ text: 'これはテストです。', tokens: [], start: 0, end: 9 }),
        new Sentence({ text: 'これはテストである。', tokens: [], start: 9, end: 19 })
      ];
      const context = createContext('これはテストです。これはテストである。', sentences);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableStyleConsistency: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableStyleConsistency: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('getDominantStyle', () => {
    it('should return keigo when more keigo sentences exist', () => {
      const sentences = [
        new Sentence({ text: 'これはテストです。', tokens: [], start: 0, end: 9 }),
        new Sentence({ text: 'これもテストです。', tokens: [], start: 9, end: 18 }),
        new Sentence({ text: 'これはテストである。', tokens: [], start: 18, end: 28 })
      ];

      const dominantStyle = rule.getDominantStyle(sentences);
      expect(dominantStyle).toBe('keigo');
    });

    it('should return joutai when more joutai sentences exist', () => {
      const sentences = [
        new Sentence({ text: 'これはテストである。', tokens: [], start: 0, end: 10 }),
        new Sentence({ text: 'これもテストである。', tokens: [], start: 10, end: 20 }),
        new Sentence({ text: 'これはテストです。', tokens: [], start: 20, end: 29 })
      ];

      const dominantStyle = rule.getDominantStyle(sentences);
      expect(dominantStyle).toBe('joutai');
    });
  });
});

/**
 * Monotonous Ending Ruleのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 4.1, 4.3, 4.4
 */

import { MonotonousEndingRule } from './monotonousEndingRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('MonotonousEndingRule', () => {
  let rule: MonotonousEndingRule;

  beforeEach(() => {
    rule = new MonotonousEndingRule();
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

  const createSentence = (text: string, start: number): Sentence => {
    return new Sentence({
      text,
      tokens: [createToken(text, '名詞', start)],
      start,
      end: start + text.length
    });
  };

  const createContext = (text: string, sentences: Sentence[], threshold?: number): RuleContext => ({
    documentText: text,
    sentences,
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      monotonousEndingThreshold: threshold ?? 3
    }
  });

  describe('check', () => {
    it('should detect 3 consecutive "です" endings (要件 4.1)', () => {
      const text = 'Aです。Bです。Cです。';
      const sentences = [
        createSentence('Aです。', 0),
        createSentence('Bです。', 4),
        createSentence('Cです。', 8)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('monotonous-ending');
      expect(diagnostics[0].message).toContain('です');
    });

    it('should detect 3 consecutive "ます" endings (要件 4.3)', () => {
      const text = '行きます。食べます。見ます。';
      const sentences = [
        createSentence('行きます。', 0),
        createSentence('食べます。', 5),
        createSentence('見ます。', 10)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('monotonous-ending');
      expect(diagnostics[0].message).toContain('ます');
    });

    it('should not detect varied endings (要件 4.4)', () => {
      const text = 'Aです。Bます。Cである。';
      const sentences = [
        createSentence('Aです。', 0),
        createSentence('Bます。', 4),
        createSentence('Cである。', 8)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should include consecutive count in message (要件 4.5)', () => {
      const text = 'Aです。Bです。Cです。Dです。';
      const sentences = [
        createSentence('Aです。', 0),
        createSentence('Bです。', 4),
        createSentence('Cです。', 8),
        createSentence('Dです。', 12)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toMatch(/\d+回/);
    });

    it('should respect threshold setting', () => {
      const text = 'Aです。Bです。Cです。'; // 3回

      const sentences = [
        createSentence('Aです。', 0),
        createSentence('Bです。', 4),
        createSentence('Cです。', 8)
      ];

      // 閾値4で検出されない
      const context4 = createContext(text, sentences, 4);
      const diagnostics4 = rule.check([], context4);
      expect(diagnostics4).toHaveLength(0);

      // 閾値3で検出される
      const context3 = createContext(text, sentences, 3);
      const diagnostics3 = rule.check([], context3);
      expect(diagnostics3.length).toBeGreaterThan(0);
    });

    it('should provide variation suggestions', () => {
      const text = 'Aです。Bです。Cです。';
      const sentences = [
        createSentence('Aです。', 0),
        createSentence('Bです。', 4),
        createSentence('Cです。', 8)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should detect "である" endings', () => {
      const text = 'Aである。Bである。Cである。';
      const sentences = [
        createSentence('Aである。', 0),
        createSentence('Bである。', 5),
        createSentence('Cである。', 10)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('monotonous-ending');
    });

    it('should detect "ました" endings', () => {
      const text = '行きました。食べました。見ました。';
      const sentences = [
        createSentence('行きました。', 0),
        createSentence('食べました。', 6),
        createSentence('見ました。', 12)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('monotonous-ending');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableMonotonousEnding: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableMonotonousEnding: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

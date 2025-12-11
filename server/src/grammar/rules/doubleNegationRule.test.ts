/**
 * Double Negation Ruleのユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 3.4, 3.5
 */

import { DoubleNegationRule } from './doubleNegationRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('DoubleNegationRule', () => {
  let rule: DoubleNegationRule;

  beforeEach(() => {
    rule = new DoubleNegationRule();
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

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('check', () => {
    it('should detect "ないわけではない" pattern', () => {
      const text = 'それはないわけではない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('double-negation');
      expect(diagnostics[0].message).toContain('ないわけではない');
    });

    it('should detect "ないことはない" pattern', () => {
      const text = 'できないことはない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('double-negation');
      expect(diagnostics[0].message).toContain('ないことはない');
    });

    it('should detect "なくはない" pattern', () => {
      const text = 'それはなくはない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('double-negation');
      expect(diagnostics[0].message).toContain('なくはない');
    });

    it('should detect "ないとは言えない" pattern', () => {
      const text = 'それはないとは言えない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('double-negation');
      expect(diagnostics[0].message).toContain('ないとは言えない');
    });

    it('should detect "ないではいられない" pattern', () => {
      const text = 'それを言わないではいられない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('double-negation');
    });

    it('should not detect single negation', () => {
      const text = 'それはない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect text without negation', () => {
      const text = 'これはテストです';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should provide positive form suggestion', () => {
      const text = 'それはないわけではない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableDoubleNegation: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableDoubleNegation: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('multiple patterns', () => {
    it('should detect multiple double negations in same text', () => {
      const text = 'それはないわけではないし、できないことはない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });
});

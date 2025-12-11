/**
 * Redundant Expression Ruleのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 1.1, 1.2, 1.3
 */

import { RedundantExpressionRule } from './redundantExpressionRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('RedundantExpressionRule', () => {
  let rule: RedundantExpressionRule;

  beforeEach(() => {
    rule = new RedundantExpressionRule();
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
    it('should detect "馬から落馬する" pattern (要件 1.1)', () => {
      const text = '彼は馬から落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('馬から落馬');
    });

    it('should detect "後で後悔する" pattern (要件 1.2)', () => {
      const text = '後で後悔しても遅い';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('後で後悔');
    });

    it('should detect "一番最初" pattern (要件 1.3)', () => {
      const text = '一番最初に到着した';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('一番最初');
    });

    it('should detect "各々それぞれ" pattern', () => {
      const text = '各々それぞれが担当する';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('各々それぞれ');
    });

    it('should detect "まず最初に" pattern', () => {
      const text = 'まず最初に確認します';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('まず最初に');
    });

    it('should detect "過半数を超える" pattern', () => {
      const text = '過半数を超える賛成があった';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('過半数を超える');
    });

    it('should detect "元旦の朝" pattern', () => {
      const text = '元旦の朝に初詣に行く';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('redundant-expression');
      expect(diagnostics[0].message).toContain('元旦の朝');
    });

    it('should not detect non-redundant expressions', () => {
      const text = 'これはテストです';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect simple "落馬" without "馬から"', () => {
      const text = '彼は落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should provide suggestion for redundant expression (要件 1.5)', () => {
      const text = '馬から落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions[0]).toContain('落馬');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableRedundantExpression: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableRedundantExpression: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('multiple patterns', () => {
    it('should detect multiple redundant expressions in same text', () => {
      const text = '一番最初に馬から落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });
});

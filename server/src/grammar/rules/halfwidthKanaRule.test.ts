/**
 * Halfwidth Kana Rule Test
 * 半角カナ検出器のテスト
 * Feature: remaining-grammar-rules
 * Task: 18.1 - 18.4
 */

import { HalfwidthKanaRule } from './halfwidthKanaRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('HalfwidthKanaRule', () => {
  let rule: HalfwidthKanaRule;

  beforeEach(() => {
    rule = new HalfwidthKanaRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('halfwidth-kana');
      expect(rule.description).toContain('半角');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of halfwidth kana', () => {
    // **Property 46: Halfwidth kana detection**
    // Test: Task 18.2

    it('should detect halfwidth kana "ﾃｽﾄ"', () => {
      const text = 'ﾃｽﾄｱｶｳﾝﾄを作成';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('テスト'))).toBe(true);
    });

    it('should detect halfwidth kana "ｼｽﾃﾑ"', () => {
      const text = 'ｼｽﾃﾑを再起動';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('システム'))).toBe(true);
    });

    it('should detect halfwidth kana with dakuten', () => {
      const text = 'ﾃﾞｰﾀを処理する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Fullwidth kana non-detection', () => {
    // **Property 47: Fullwidth kana proper usage non-detection**
    // Test: Task 18.3

    it('should not flag fullwidth kana "テスト"', () => {
      const text = 'テストアカウントを作成';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const halfwidthErrors = diagnostics.filter(d => d.code === 'halfwidth-kana');
      expect(halfwidthErrors.length).toBe(0);
    });

    it('should not flag fullwidth kana "システム"', () => {
      const text = 'システムを再起動';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const halfwidthErrors = diagnostics.filter(d => d.code === 'halfwidth-kana');
      expect(halfwidthErrors.length).toBe(0);
    });
  });

  describe('Conversion suggestions', () => {
    // **Property 48: Halfwidth kana conversion suggestion**
    // Test: Task 18.4

    it('should provide fullwidth conversion suggestion', () => {
      const text = 'ﾃｽﾄを実行';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions).toBeDefined();
      expect(diagnostics[0].suggestions!.some(s => s.includes('テスト'))).toBe(true);
    });
  });

  describe('Conversion functionality', () => {
    it('should correctly convert halfwidth to fullwidth', () => {
      expect(rule.toFullwidth('ｱ')).toBe('ア');
      expect(rule.toFullwidth('ﾃｽﾄ')).toBe('テスト');
      expect(rule.toFullwidth('ｶﾀｶﾅ')).toBe('カタカナ');
    });

    it('should correctly convert dakuten/handakuten', () => {
      expect(rule.toFullwidth('ﾃﾞ')).toBe('デ');
      expect(rule.toFullwidth('ﾊﾟ')).toBe('パ');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without katakana', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle mixed halfwidth and fullwidth', () => {
      const text = 'ﾃｽﾄとテスト';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      // Only halfwidth should be flagged
      expect(diagnostics.length).toBe(1);
    });
  });
});

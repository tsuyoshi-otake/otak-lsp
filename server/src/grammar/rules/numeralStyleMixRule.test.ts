/**
 * Numeral Style Mix Rule Test
 * 数字表記混在バリデーターのテスト
 * Feature: remaining-grammar-rules
 * Task: 19.1 - 19.4
 */

import { NumeralStyleMixRule } from './numeralStyleMixRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('NumeralStyleMixRule', () => {
  let rule: NumeralStyleMixRule;

  beforeEach(() => {
    rule = new NumeralStyleMixRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('numeral-style-mix');
      expect(rule.description).toContain('数字');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of numeral style mix', () => {
    // **Property 49: Numeral style mix detection**
    // Test: Task 19.2

    it('should detect kanji and arabic numeral mix', () => {
      // Using multi-character kanji numerals to pass the filter
      const text = '二十人で5本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect mixed year notation', () => {
      const text = '二〇二五年に20件受注';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Unified notation non-detection', () => {
    // **Property 50: Unified numeral style non-detection**
    // Test: Task 19.3

    it('should not flag all arabic numerals', () => {
      const text = '3人で5本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag all kanji numerals', () => {
      const text = '三人で五本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    // **Property 51: Numeral style mix unification suggestion**
    // Test: Task 19.4

    it('should suggest unified format', () => {
      // Using multi-character kanji numerals to pass the filter
      const text = '二十人で5本';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without numerals', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle single numeral type', () => {
      const text = '今日は25日です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should allow fixed expressions with kanji numerals', () => {
      // Common expressions like "一人", "一つ" are often written in kanji
      const text = '一人で参加する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      // Single kanji numeral should not be flagged
      expect(diagnostics.length).toBe(0);
    });
  });
});

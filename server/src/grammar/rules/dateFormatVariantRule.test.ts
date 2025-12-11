/**
 * Date Format Variant Rule Test
 * 日付表記バリアントバリデーターのテスト
 * Feature: remaining-grammar-rules
 * Task: 22.1 - 22.4
 */

import { DateFormatVariantRule } from './dateFormatVariantRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('DateFormatVariantRule', () => {
  let rule: DateFormatVariantRule;

  beforeEach(() => {
    rule = new DateFormatVariantRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('date-format-variant');
      expect(rule.description).toContain('日付');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of date format inconsistency', () => {
    // **Property 58: Date format inconsistency detection**
    // Test: Task 22.2

    it('should detect mixed date formats with slash and kanji', () => {
      const text = '2025/12/11のデータと2025年12月10日を比較';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect mixed Japanese era and western year', () => {
      // Using complete date formats to trigger detection
      const text = '令和7年12月11日と2025年12月10日のデータ';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Consistent date format non-detection', () => {
    // **Property 59: Consistent date format non-detection**
    // Test: Task 22.3

    it('should not flag consistent kanji format', () => {
      const text = '2025年12月11日と2025年12月10日';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag consistent slash format', () => {
      const text = '2025/12/11と2025/12/10';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag single date', () => {
      const text = '2025年12月11日に開催';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    // **Property 60: Date format mix unification suggestion**
    // Test: Task 22.4

    it('should suggest unified format', () => {
      const text = '2025/12/11と2025年12月10日';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Date format patterns', () => {
    it('should detect slash format dates', () => {
      const dates = rule.findDates('2025/12/11に開催');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should detect kanji format dates', () => {
      const dates = rule.findDates('2025年12月11日に開催');
      expect(dates.length).toBeGreaterThan(0);
    });

    it('should detect hyphen format dates', () => {
      const dates = rule.findDates('2025-12-11に開催');
      expect(dates.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without dates', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle partial dates correctly', () => {
      const text = '12月と1月の比較';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      // Partial dates should not be flagged
      expect(diagnostics.length).toBe(0);
    });
  });
});

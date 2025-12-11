/**
 * Number Width Mix Rule Test
 * 全角半角数字混在バリデーターのテスト
 * Feature: remaining-grammar-rules
 * Task: 16.1 - 16.4
 */

import { NumberWidthMixRule } from './numberWidthMixRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('NumberWidthMixRule', () => {
  let rule: NumberWidthMixRule;

  beforeEach(() => {
    rule = new NumberWidthMixRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('number-width-mix');
      expect(rule.description).toContain('全角');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of number width mix', () => {
    // **Property 40: Fullwidth/halfwidth number mix detection**
    // Test: Task 16.2

    it('should detect fullwidth numbers mixed with halfwidth', () => {
      const text = '２０２５年に25件の案件を受注';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect halfwidth numbers when fullwidth is dominant', () => {
      const text = '２０２５年に25件、３０件、４０件';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect fullwidth numbers when halfwidth is dominant', () => {
      const text = '2025年に25件、３０件、40件';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Unified notation non-detection', () => {
    // **Property 41: Unified fullwidth/halfwidth non-detection**
    // Test: Task 16.3

    it('should not flag all halfwidth numbers', () => {
      const text = '2025年に25件の案件を受注';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag all fullwidth numbers', () => {
      const text = '２０２５年に２５件の案件を受注';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    // **Property 42: Fullwidth/halfwidth mix unification suggestion**
    // Test: Task 16.4

    it('should suggest unified format in diagnostics', () => {
      const text = '２０２５年に25件';
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

    it('should handle text without numbers', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle single number', () => {
      const text = '今日は25日です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

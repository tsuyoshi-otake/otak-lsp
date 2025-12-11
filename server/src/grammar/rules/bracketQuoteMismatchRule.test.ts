/**
 * Bracket Quote Mismatch Rule Test
 * 括弧引用符不一致検出器のテスト
 * Feature: remaining-grammar-rules
 * Task: 21.1 - 21.4
 */

import { BracketQuoteMismatchRule } from './bracketQuoteMismatchRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('BracketQuoteMismatchRule', () => {
  let rule: BracketQuoteMismatchRule;

  beforeEach(() => {
    rule = new BracketQuoteMismatchRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('bracket-quote-mismatch');
      expect(rule.description).toContain('括弧');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of bracket mismatch', () => {
    // **Property 55: Bracket/quote mismatch detection**
    // Test: Task 21.2

    it('should detect unclosed Japanese quote', () => {
      const text = '彼は「すぐ戻ると言った。';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect unclosed parenthesis', () => {
      const text = '（重要なお知らせです。';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect unopened closing bracket', () => {
      const text = '重要なお知らせです）';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Proper bracket matching non-detection', () => {
    // **Property 56: Proper bracket/quote matching non-detection**
    // Test: Task 21.3

    it('should not flag properly matched Japanese quotes', () => {
      const text = '彼は「すぐ戻る」と言った。';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag properly matched parentheses', () => {
      const text = '（重要なお知らせです）';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag properly nested brackets', () => {
      const text = '（「テスト」を実行）';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Mismatch correction suggestions', () => {
    // **Property 57: Bracket/quote mismatch suggestion**
    // Test: Task 21.4

    it('should suggest closing bracket', () => {
      const text = '「テスト';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Various bracket types', () => {
    it('should detect unclosed square brackets', () => {
      const text = '【重要';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect unclosed double quotes', () => {
      const text = '『テスト';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should handle ASCII brackets', () => {
      const text = '(test';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without brackets', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle multiple properly matched brackets', () => {
      const text = '「A」「B」「C」';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

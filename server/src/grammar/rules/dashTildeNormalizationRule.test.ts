/**
 * Dash Tilde Normalization Rule Test
 * ダッシュチルダ正規化器のテスト
 * Feature: remaining-grammar-rules
 * Task: 23.1 - 23.4
 */

import { DashTildeNormalizationRule } from './dashTildeNormalizationRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('DashTildeNormalizationRule', () => {
  let rule: DashTildeNormalizationRule;

  beforeEach(() => {
    rule = new DashTildeNormalizationRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('dash-tilde-normalization');
      expect(rule.description).toContain('ダッシュ');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of symbol inconsistency', () => {
    // **Property 61: Symbol inconsistency detection**
    // Test: Task 23.2

    it('should detect hyphen in range expression', () => {
      const text = '受付時間 9:00-18:00';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect en-dash in range expression', () => {
      const text = 'ページ 10-15 を参照';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect mixed symbols in same document', () => {
      const text = '9:00-18:00と10〜15';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Consistent symbol non-detection', () => {
    // **Property 62: Consistent symbol non-detection**
    // Test: Task 23.3

    it('should not flag consistent tilde usage', () => {
      const text = '9:00〜18:00と10〜15';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag single range expression', () => {
      const text = '9:00〜18:00に営業';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    // **Property 63: Symbol mix unification suggestion**
    // Test: Task 23.4

    it('should suggest unified symbol', () => {
      const text = '9:00-18:00';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Various range patterns', () => {
    it('should detect time range with hyphen', () => {
      const text = '10:00-12:00';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect number range with hyphen', () => {
      const text = '1-10の範囲';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect page range with en-dash', () => {
      const text = 'pp.10-20';
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

    it('should handle text without range expressions', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle proper tilde usage', () => {
      const text = '1〜10の範囲';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

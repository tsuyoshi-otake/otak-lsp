/**
 * Symbol Width Mix Rule Test
 * 記号幅混在バリデーターのテスト
 * Feature: remaining-grammar-rules
 * Task: 25.1 - 25.4
 */

import { SymbolWidthMixRule } from './symbolWidthMixRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('SymbolWidthMixRule', () => {
  let rule: SymbolWidthMixRule;

  beforeEach(() => {
    rule = new SymbolWidthMixRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('symbol-width-mix');
      expect(rule.description).toContain('記号');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of symbol width mix', () => {
    // **Property 67: Fullwidth symbol mix detection**
    // Test: Task 25.2

    it('should detect fullwidth colon in URL context', () => {
      // Needs both fullwidth and halfwidth colons to detect mixing
      const text = 'URLはｈｔｔｐ：//example.com 時刻:12時';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect mixed width colons', () => {
      const text = '日時：2025年12月11日/場所:会議室A';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Consistent symbol width non-detection', () => {
    // **Property 68: Consistent fullwidth symbol non-detection**
    // Test: Task 25.3

    it('should not flag consistent halfwidth symbols', () => {
      const text = '日時:2025年12月11日/場所:会議室A';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag consistent fullwidth symbols', () => {
      const text = '日時：2025年12月11日／場所：会議室A';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    // **Property 69: Fullwidth symbol mix unification suggestion**
    // Test: Task 25.4

    it('should suggest unified symbols', () => {
      const text = '日時：時間:場所';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Various symbol patterns', () => {
    it('should detect fullwidth slash', () => {
      const text = 'A／BとA/C';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect fullwidth question mark', () => {
      const text = '本当？いいえ?';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect fullwidth exclamation mark', () => {
      const text = 'すごい！本当に!';
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

    it('should handle text without symbols', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle single symbol type', () => {
      const text = '日時:場所:備考';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

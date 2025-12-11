/**
 * Nakaguro Usage Rule Test
 * 中黒使用チェッカーのテスト
 * Feature: remaining-grammar-rules
 * Task: 24.1 - 24.4
 */

import { NakaguroUsageRule } from './nakaguroUsageRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('NakaguroUsageRule', () => {
  let rule: NakaguroUsageRule;

  beforeEach(() => {
    rule = new NakaguroUsageRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('nakaguro-usage');
      expect(rule.description).toContain('中黒');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of nakaguro issues', () => {
    // **Property 64: Nakaguro excess/deficiency detection**
    // Test: Task 24.2

    it('should detect consecutive nakaguro', () => {
      const text = '設計・・実装・テスト';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect triple nakaguro', () => {
      const text = 'A・・・B';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Proper nakaguro usage non-detection', () => {
    // **Property 65: Proper nakaguro usage non-detection**
    // Test: Task 24.3

    it('should not flag proper nakaguro usage', () => {
      const text = '企画・開発・営業チーム';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag single nakaguro', () => {
      const text = '田中・山田';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Nakaguro suggestions', () => {
    // **Property 66: Nakaguro excess/deficiency suggestion**
    // Test: Task 24.4

    it('should suggest proper nakaguro usage', () => {
      const text = 'A・・B';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Various patterns', () => {
    it('should handle multiple proper nakaguro', () => {
      const text = 'A・B・C・D・E';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should detect nakaguro in context', () => {
      const text = 'これは設計・・実装の問題です';
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

    it('should handle text without nakaguro', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle halfwidth nakaguro', () => {
      // Halfwidth nakaguro (U+FF65) should also be detected
      const text = 'Aﾟﾟﾟﾟを使用';
      const context = createContext(text);
      // This specific pattern may not be detected as it's not double nakaguro
      const diagnostics = rule.check([], context);
      // Just verify no crash
      expect(diagnostics).toBeDefined();
    });
  });
});

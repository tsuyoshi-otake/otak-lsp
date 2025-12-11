/**
 * Space Around Unit Rule Test
 * スペース単位チェッカーのテスト
 * Feature: remaining-grammar-rules
 * Task: 20.1 - 20.4
 */

import { SpaceAroundUnitRule } from './spaceAroundUnitRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('SpaceAroundUnitRule', () => {
  let rule: SpaceAroundUnitRule;

  beforeEach(() => {
    rule = new SpaceAroundUnitRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('space-around-unit');
      expect(rule.description).toContain('スペース');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of space issues', () => {
    // **Property 52: Space excess/deficiency detection**
    // Test: Task 20.2

    it('should detect missing space between number and unit', () => {
      const text = 'CPUは3.2GHzで動作';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect missing space between version and number', () => {
      const text = 'Version1.2を使用';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Proper spacing non-detection', () => {
    // **Property 53: Proper space usage non-detection**
    // Test: Task 20.3

    it('should not flag proper spacing with units', () => {
      const text = '5 kgの荷物';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const spaceErrors = diagnostics.filter(d => d.code === 'space-around-unit');
      expect(spaceErrors.length).toBe(0);
    });

    it('should not flag proper version spacing', () => {
      const text = 'Version 1.2 を使用';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const spaceErrors = diagnostics.filter(d => d.code === 'space-around-unit');
      expect(spaceErrors.length).toBe(0);
    });
  });

  describe('Space deficiency suggestions', () => {
    // **Property 54: Space deficiency suggestion**
    // Test: Task 20.4

    it('should suggest proper spacing', () => {
      const text = '3.2GHzのCPU';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Common unit patterns', () => {
    it('should detect missing space before common units', () => {
      const text = '100MBのファイル';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should handle Japanese text without units', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without numbers or units', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should allow standard Japanese unit expressions', () => {
      // Japanese often omits spaces in certain contexts
      const text = '5個のりんご';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      // Japanese counters typically don't need space
      expect(diagnostics.length).toBe(0);
    });
  });
});

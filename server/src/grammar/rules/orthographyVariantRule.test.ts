/**
 * Orthography Variant Rule Test
 * 表記ゆれ検出器のテスト
 * Feature: remaining-grammar-rules
 * Task: 15.1 - 15.4
 */

import { OrthographyVariantRule } from './orthographyVariantRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('OrthographyVariantRule', () => {
  let rule: OrthographyVariantRule;

  beforeEach(() => {
    rule = new OrthographyVariantRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('orthography-variant');
      expect(rule.description).toContain('表記');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of orthography variants', () => {
    // **Property 37: Orthography inconsistency detection**
    // Test: Task 15.2

    it('should detect "出来る" and suggest "できる"', () => {
      const text = '出来るだけ早く対応します';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('できる'))).toBe(true);
    });

    it('should detect "下さい" and suggest "ください"', () => {
      const text = 'ご対応下さい';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('ください'))).toBe(true);
    });

    it('should detect "致します" and suggest "いたします"', () => {
      const text = 'ご連絡致します';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('いたします'))).toBe(true);
    });
  });

  describe('Unified notation non-detection', () => {
    // **Property 38: Unified notation non-detection**
    // Test: Task 15.3

    it('should not flag unified hiragana "できる"', () => {
      const text = 'できるだけ早く対応します';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForDekiru = diagnostics.filter(d =>
        d.message.includes('できる') && d.code === 'orthography-variant'
      );
      expect(errorForDekiru.length).toBe(0);
    });

    it('should not flag unified hiragana "ください"', () => {
      const text = 'ご確認ください';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForKudasai = diagnostics.filter(d =>
        d.message.includes('ください') && d.code === 'orthography-variant'
      );
      expect(errorForKudasai.length).toBe(0);
    });

    it('should not flag unified hiragana "いたします"', () => {
      const text = 'ご連絡いたします';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForItashimasu = diagnostics.filter(d =>
        d.message.includes('いたします') && d.code === 'orthography-variant'
      );
      expect(errorForItashimasu.length).toBe(0);
    });
  });

  describe('Multiple pattern unification', () => {
    // **Property 39: Multiple pattern unification prompt**
    // Test: Task 15.4

    it('should detect multiple variant patterns', () => {
      const text = '出来るだけご連絡致します';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Common variant patterns', () => {
    it('should detect "頂く" variant', () => {
      const text = 'ご確認頂く';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect "有る" and suggest "ある"', () => {
      const text = '問題が有る';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect "無い" and suggest "ない"', () => {
      const text = '問題が無い';
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

    it('should handle text without orthography issues', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

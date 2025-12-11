/**
 * Okurigana Variant Rule Test
 * 送り仮名揺れチェッカーのテスト
 * Feature: remaining-grammar-rules
 * Task: 14.1 - 14.4
 */

import { OkuriganaVariantRule } from './okuriganaVariantRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('OkuriganaVariantRule', () => {
  let rule: OkuriganaVariantRule;

  beforeEach(() => {
    rule = new OkuriganaVariantRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('okurigana-variant');
      expect(rule.description).toContain('送り仮名');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of okurigana variants', () => {
    // **Property 34: Okurigana error detection**
    // Test: Task 14.2

    it('should detect "表わす" and suggest "表す"', () => {
      const text = '愛でる心を表わす';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('表す'))).toBe(true);
    });

    it('should detect "現わす" and suggest "現す"', () => {
      const text = '結果を現わす';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('現す'))).toBe(true);
    });

    it('should detect "行なう" and suggest "行う"', () => {
      const text = '作業を行なう';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('行う'))).toBe(true);
    });

    it('should detect "おこなう" variant forms', () => {
      const text = '作業をおこなう';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Standard form non-detection', () => {
    // **Property 35: Standard okurigana non-detection**
    // Test: Task 14.3

    it('should not flag standard "表す"', () => {
      const text = '結果を表す';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForArawasu = diagnostics.filter(d =>
        d.message.includes('表') && d.message.includes('送り仮名')
      );
      expect(errorForArawasu.length).toBe(0);
    });

    it('should not flag standard "行う"', () => {
      const text = '作業を行う';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForOkonau = diagnostics.filter(d =>
        d.message.includes('行') && d.message.includes('送り仮名')
      );
      expect(errorForOkonau.length).toBe(0);
    });

    it('should not flag standard "現す"', () => {
      const text = '気持ちを現す';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForArawasu = diagnostics.filter(d =>
        d.message.includes('現') && d.message.includes('送り仮名')
      );
      expect(errorForArawasu.length).toBe(0);
    });
  });

  describe('Auxiliary verb okurigana', () => {
    // **Property 36: Auxiliary verb okurigana validation**
    // Test: Task 14.4

    it('should detect "戴く" and suggest "いただく"', () => {
      const text = '感じて戴きたい';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('いただ'))).toBe(true);
    });

    it('should detect "下さい" variant and suggest standard form', () => {
      const text = 'ご確認下さい';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should not flag standard auxiliary forms', () => {
      const text = '確認してください';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForKudasai = diagnostics.filter(d =>
        d.message.includes('ください') && d.message.includes('送り仮名')
      );
      expect(errorForKudasai.length).toBe(0);
    });
  });

  describe('Multiple variants in one text', () => {
    it('should detect multiple okurigana variants', () => {
      const text = '結果を表わし、行なう予定です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without okurigana issues', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

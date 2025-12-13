/**
 * Quotation Style Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 4.1 - TDD tests for QuotationStyleMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { QuotationStyleMixRule } from './quotationStyleMixRule';

describe('QuotationStyleMixRule', () => {
  let rule: QuotationStyleMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new QuotationStyleMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableQuotationStyleMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of Japanese and double quotes', () => {
      context.documentText = '彼は「こんにちは」と言った。彼女は"さようなら"と答えた。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('quotation-style-mix');
    });

    it('should detect mix of Japanese and single quotes', () => {
      context.documentText = '「日本語」と\'English\'の混在。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mix when only Japanese quotes are used', () => {
      context.documentText = '「こんにちは」と「さようなら」を言った。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only double quotes are used', () => {
      context.documentText = '"Hello"と"World"を組み合わせる。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('symmetry property', () => {
    it('should detect mix with Japanese first, then Western', () => {
      context.documentText = '「日本語」"English"';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix with Western first, then Japanese', () => {
      context.documentText = '"English"「日本語」';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      context.documentText = '';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without quotes', () => {
      context.documentText = 'これは引用符がない文です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableQuotationStyleMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });

    it('should be enabled when config is true', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableQuotationStyleMix: true
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(true);
    });
  });
});

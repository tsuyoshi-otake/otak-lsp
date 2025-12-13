/**
 * Punctuation Style Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 3.1 - TDD tests for PunctuationStyleMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { PunctuationStyleMixRule } from './punctuationStyleMixRule';

describe('PunctuationStyleMixRule', () => {
  let rule: PunctuationStyleMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new PunctuationStyleMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enablePunctuationStyleMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of Japanese and Western punctuation (comma)', () => {
      context.documentText = 'これは例文です。しかし，これは混在している。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('punctuation-style-mix');
    });

    it('should detect mix of Japanese and Western punctuation (period)', () => {
      context.documentText = '明日は晴れです．でも、風は強い。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mix when only Japanese punctuation is used', () => {
      context.documentText = 'これは例文です。しかし、これは統一されている。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only Western punctuation is used', () => {
      context.documentText = 'これは例文です．しかし，これは統一されている．';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('symmetry property', () => {
    it('should detect mix with Japanese first, then Western', () => {
      context.documentText = '日本語、文章，混在';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix with Western first, then Japanese', () => {
      context.documentText = '文章，混在、日本語';
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

    it('should handle text without punctuation', () => {
      context.documentText = 'これは句読点がない文です';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enablePunctuationStyleMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });

    it('should be enabled when config is true', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enablePunctuationStyleMix: true
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(true);
    });
  });
});

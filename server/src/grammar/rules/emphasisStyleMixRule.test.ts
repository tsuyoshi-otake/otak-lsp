/**
 * Emphasis Style Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 6.1 - TDD tests for EmphasisStyleMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { EmphasisStyleMixRule } from './emphasisStyleMixRule';

describe('EmphasisStyleMixRule', () => {
  let rule: EmphasisStyleMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new EmphasisStyleMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableEmphasisStyleMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of ** and __', () => {
      context.documentText = '**太字**と__下線強調__の混在。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('emphasis-style-mix');
    });

    it('should not detect mix when only ** is used', () => {
      context.documentText = '**太字**と**強調**の文章。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only __ is used', () => {
      context.documentText = '__太字__と__強調__の文章。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('symmetry property', () => {
    it('should detect mix with ** first', () => {
      context.documentText = '**太字**と__下線__';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix with __ first', () => {
      context.documentText = '__下線__と**太字**';
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

    it('should handle text without emphasis', () => {
      context.documentText = 'これは強調がない文です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not confuse single * with **', () => {
      context.documentText = '*italic* and __bold__';
      // Only __ should be detected as emphasis, * is italic
      // But if both ** and __ are not present together, no mix
      const diagnostics = rule.check(emptyTokens, context);
      // This should detect as there's __ but no ** (only * which is different)
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableEmphasisStyleMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

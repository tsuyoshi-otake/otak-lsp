/**
 * Pronoun Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 10.1 - TDD tests for PronounMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { PronounMixRule } from './pronounMixRule';

describe('PronounMixRule', () => {
  let rule: PronounMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new PronounMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enablePronounMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of watashi and boku', () => {
      context.documentText = '私は開発者です。僕はプログラミングが好きです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('pronoun-mix');
    });

    it('should detect mix of touhou and watashi', () => {
      context.documentText = '当方は担当者です。私が対応します。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix of jibun and watashi', () => {
      context.documentText = '自分は学生です。私は日本人です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mix when only watashi is used', () => {
      context.documentText = '私は開発者です。私はプログラミングが好きです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only boku is used', () => {
      context.documentText = '僕は学生です。僕は勉強が好きです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      context.documentText = '';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without pronouns', () => {
      context.documentText = 'これは代名詞がない文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enablePronounMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

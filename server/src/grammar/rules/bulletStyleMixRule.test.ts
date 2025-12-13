/**
 * Bullet Style Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 5.1 - TDD tests for BulletStyleMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { BulletStyleMixRule } from './bulletStyleMixRule';

describe('BulletStyleMixRule', () => {
  let rule: BulletStyleMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new BulletStyleMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableBulletStyleMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of nakaguro and hyphen', () => {
      context.documentText = '・項目1\n- 項目2';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('bullet-style-mix');
    });

    it('should detect mix of asterisk and hyphen', () => {
      context.documentText = '* タスク1\n- タスク2';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix of all three bullet types', () => {
      context.documentText = '・項目1\n- 項目2\n* 項目3';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mix when only nakaguro is used', () => {
      context.documentText = '・項目1\n・項目2\n・項目3';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only hyphen is used', () => {
      context.documentText = '- 項目1\n- 項目2\n- 項目3';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('symmetry property', () => {
    it('should detect mix regardless of order (nakaguro first)', () => {
      context.documentText = '・項目1\n- 項目2';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix regardless of order (hyphen first)', () => {
      context.documentText = '- 項目1\n・項目2';
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

    it('should handle text without bullet points', () => {
      context.documentText = 'これは箇条書きがない文です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should only detect bullets at line start', () => {
      // Nakaguro in middle of text should not be detected
      context.documentText = '企画・開発を行う。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableBulletStyleMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

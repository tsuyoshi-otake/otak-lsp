/**
 * Unit Notation Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 9.1 - TDD tests for UnitNotationMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { UnitNotationMixRule } from './unitNotationMixRule';

describe('UnitNotationMixRule', () => {
  let rule: UnitNotationMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new UnitNotationMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableUnitNotationMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of km and kilometer in katakana', () => {
      context.documentText = '速度は100km/hで、距離は50キロメートルです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('unit-notation-mix');
    });

    it('should detect mix of kg and kilogram in katakana', () => {
      context.documentText = '重さは5kgで、体重は60キログラムです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix of cm and centimeter in katakana', () => {
      context.documentText = '10cmの長さと20センチメートルの幅。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mix when only symbols are used', () => {
      context.documentText = '速度は100km/hで、距離は50kmです。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when only katakana is used', () => {
      context.documentText = '速度は100キロメートル毎時で、距離は50キロメートルです。';
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

    it('should handle text without units', () => {
      context.documentText = 'これは単位がない文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableUnitNotationMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

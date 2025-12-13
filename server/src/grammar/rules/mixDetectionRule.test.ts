/**
 * Mix Detection Rule Base Class Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 2.1 - TDD tests for MixDetectionRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  Sentence,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedDiagnostic,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Test implementation of MixDetectionRule
 */
class TestMixDetectionRule extends MixDetectionRule {
  name = 'test-mix-detection';
  description = 'Test implementation of mix detection rule';

  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    // Collect pattern A
    const patternAMatches = text.match(/A/g) || [];
    if (patternAMatches.length > 0) {
      patterns.set('patternA', {
        count: patternAMatches.length,
        positions: this.findAllPositions(text, /A/g)
      });
    }

    // Collect pattern B
    const patternBMatches = text.match(/B/g) || [];
    if (patternBMatches.length > 0) {
      patterns.set('patternB', {
        count: patternBMatches.length,
        positions: this.findAllPositions(text, /B/g)
      });
    }

    return patterns;
  }

  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const styles = Array.from(patterns.keys()).join('and');
    return `Patterns mixed: ${styles}`;
  }

  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'punctuation-style-mix'; // Use an existing type for testing
  }

  protected getConfigKey(): keyof typeof DEFAULT_ADVANCED_RULES_CONFIG {
    return 'enableStyleConsistency'; // Use an existing config key for testing
  }

  private findAllPositions(text: string, regex: RegExp): number[] {
    const positions: number[] = [];
    let match;
    const globalRegex = new RegExp(regex.source, 'g');
    while ((match = globalRegex.exec(text)) !== null) {
      positions.push(match.index);
    }
    return positions;
  }
}

describe('MixDetectionRule', () => {
  let rule: TestMixDetectionRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new TestMixDetectionRule();
    context = {
      documentText: '',
      sentences: [],
      config: DEFAULT_ADVANCED_RULES_CONFIG
    };
  });

  describe('detectMix', () => {
    it('should detect mix when multiple patterns exist', () => {
      context.documentText = 'AABB';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].message).toContain('mixed');
    });

    it('should not detect mix when only one pattern exists', () => {
      context.documentText = 'AAA';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect mix when no patterns exist', () => {
      context.documentText = 'CCC';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('symmetry property', () => {
    it('should detect mix regardless of pattern order (A then B)', () => {
      context.documentText = 'AAABBB';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix regardless of pattern order (B then A)', () => {
      context.documentText = 'BBBAAA';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect mix regardless of pattern order (interleaved)', () => {
      context.documentText = 'ABABAB';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });
  });

  describe('diagnostic range', () => {
    it('should provide correct range for detected mix', () => {
      context.documentText = 'AABB';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].range.start.character).toBe(0);
      expect(diagnostics[0].range.end.character).toBe(4);
    });
  });

  describe('rule code', () => {
    it('should return correct rule code', () => {
      context.documentText = 'AABB';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('punctuation-style-mix');
    });
  });

  describe('isEnabled', () => {
    it('should respect config settings', () => {
      const enabledConfig = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableStyleConsistency: true };
      expect(rule.isEnabled(enabledConfig)).toBe(true);

      const disabledConfig = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableStyleConsistency: false };
      expect(rule.isEnabled(disabledConfig)).toBe(false);
    });
  });
});

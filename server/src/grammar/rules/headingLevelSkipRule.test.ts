/**
 * Heading Level Skip Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 12.1 - TDD tests for HeadingLevelSkipRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { HeadingLevelSkipRule } from './headingLevelSkipRule';

describe('HeadingLevelSkipRule', () => {
  let rule: HeadingLevelSkipRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new HeadingLevelSkipRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableHeadingLevelSkip: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect skip from h1 to h3', () => {
      context.documentText = '# タイトル\n### サブセクション';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('heading-level-skip');
    });

    it('should detect skip from h2 to h4', () => {
      context.documentText = '## セクション\n#### 詳細';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect skip from h1 to h4', () => {
      context.documentText = '# 章\n#### 小節';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect when headings are sequential', () => {
      context.documentText = '# タイトル\n## セクション\n### サブセクション';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect when going from lower to higher level', () => {
      context.documentText = '### サブセクション\n# タイトル';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('multiple skips', () => {
    it('should detect multiple heading skips', () => {
      context.documentText = '# タイトル\n### スキップ1\n## セクション\n#### スキップ2';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(2);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      context.documentText = '';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without headings', () => {
      context.documentText = 'これは見出しがない文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle single heading', () => {
      context.documentText = '# 単一の見出し';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect heading-like patterns in code blocks', () => {
      // Note: This is a simplified test - real implementation might need AST parsing
      context.documentText = '# タイトル\n```\n### コード内\n```\n## セクション';
      const diagnostics = rule.check(emptyTokens, context);
      // Should detect skip from # to ## (ignoring code block content)
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableHeadingLevelSkip: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

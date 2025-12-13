/**
 * Code Block Language Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 14.1 - TDD tests for CodeBlockLanguageRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { CodeBlockLanguageRule } from './codeBlockLanguageRule';

describe('CodeBlockLanguageRule', () => {
  let rule: CodeBlockLanguageRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new CodeBlockLanguageRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableCodeBlockLanguage: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect code block without language specification', () => {
      context.documentText = '```\nconst x = 1;\n```';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('code-block-language');
    });

    it('should not detect code block with language specification', () => {
      context.documentText = '```javascript\nconst x = 1;\n```';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect code block with short language specification', () => {
      context.documentText = '```js\nconst x = 1;\n```';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('multiple code blocks', () => {
    it('should detect multiple code blocks without language', () => {
      context.documentText = '```\ncode1\n```\n\n```\ncode2\n```';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(2);
    });

    it('should only detect code blocks without language', () => {
      context.documentText = '```javascript\ncode1\n```\n\n```\ncode2\n```';
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

    it('should handle text without code blocks', () => {
      context.documentText = 'これはコードブロックがない文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle inline code (not code block)', () => {
      context.documentText = 'Use `const x = 1;` for constants.';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle code block with empty content', () => {
      context.documentText = '```\n```';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should handle tildes code block', () => {
      context.documentText = '~~~\ncode\n~~~';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should handle tildes code block with language', () => {
      context.documentText = '~~~python\ncode\n~~~';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableCodeBlockLanguage: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

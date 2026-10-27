/**
 * English Case Mix Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 8.1 - TDD tests for EnglishCaseMixRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { EnglishCaseMixRule } from './englishCaseMixRule';

describe('EnglishCaseMixRule', () => {
  let rule: EnglishCaseMixRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new EnglishCaseMixRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableEnglishCaseMix: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect mix of API and api', () => {
      context.documentText = 'APIを使用します。apiの設計は重要です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.map(d => d.range.start.character)).toEqual([0, 10]);
      expect(diagnostics[0].code).toBe('english-case-mix');
    });

    it('should detect mix of Json and JSON', () => {
      context.documentText = 'Jsonデータを解析する。JSONのフォーマットを確認。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(2);
    });

    it('should detect three variants of the same word', () => {
      context.documentText = 'htmlを書く。HTMLの基礎。Htmlタグ。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(3);
    });

    it('後から現れる別表記も示し、登場していない表記を統一候補にしない', () => {
      context.documentText = 'apiを使う。apiを確認。Apiを説明。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.map(d => context.documentText.slice(d.range.start.character, d.range.end.character)))
        .toEqual(['api', 'Api']);
      expect(diagnostics.every(d => !d.suggestions.some(s => s.includes('API')))).toBe(true);
    });

    it('should not detect when all uppercase', () => {
      context.documentText = 'APIを使用します。APIの設計は重要です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should not detect when all lowercase', () => {
      context.documentText = 'apiを使用します。apiの設計は重要です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('different words', () => {
    it('should not flag different English words', () => {
      context.documentText = 'APIとJSONを使用する。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('command context', () => {
    it('should ignore CLI commands like "npm install"', () => {
      context.documentText = 'Install手順: npm installを実行してください。';
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

    it('should handle text without English words', () => {
      context.documentText = 'これは日本語だけの文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableEnglishCaseMix: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

/**
 * Table Column Mismatch Rule Tests
 * Feature: evals-ng-pattern-expansion
 * Task: 13.1 - TDD tests for TableColumnMismatchRule
 */

import { Token } from '../../../../shared/src/types';
import {
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import { TableColumnMismatchRule } from './tableColumnMismatchRule';

describe('TableColumnMismatchRule', () => {
  let rule: TableColumnMismatchRule;
  let context: RuleContext;
  const emptyTokens: Token[] = [];

  beforeEach(() => {
    rule = new TableColumnMismatchRule();
    context = {
      documentText: '',
      sentences: [],
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableTableColumnMismatch: true
      } as AdvancedRulesConfig
    };
  });

  describe('basic detection', () => {
    it('should detect column mismatch between header and separator', () => {
      context.documentText = '| A | B | C |\n|---|---|\n| 1 | 2 | 3 |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('table-column-mismatch');
    });

    it('should detect column mismatch when data row has more columns', () => {
      context.documentText = '| A | B |\n|---|---|\n| 1 | 2 | 3 |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should detect column mismatch when data row has fewer columns', () => {
      context.documentText = '| A | B | C |\n|---|---|---|\n| 1 | 2 |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(1);
    });

    it('should not detect mismatch when all rows have same column count', () => {
      context.documentText = '| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('multiple tables', () => {
    it('should detect mismatch in multiple tables', () => {
      context.documentText = '| A | B |\n|---|\n| 1 | 2 |\n\n| X | Y | Z |\n|---|---|---|\n| a | b |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      context.documentText = '';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without tables', () => {
      context.documentText = 'これはテーブルがない文章です。';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle valid table with alignment markers', () => {
      context.documentText = '| Left | Center | Right |\n|:-----|:------:|------:|\n| 1 | 2 | 3 |';
      const diagnostics = rule.check(emptyTokens, context);
      expect(diagnostics.length).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should be disabled when config is false', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableTableColumnMismatch: false
      } as AdvancedRulesConfig;
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

/**
 * Redundant Expression Ruleのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 1: 冗長表現の検出と提案
 * 検証: 要件 1.1, 1.2, 1.3, 1.4, 1.5
 */

import * as fc from 'fast-check';
import { RedundantExpressionRule } from './redundantExpressionRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: RedundantExpressionRule', () => {
  const rule = new RedundantExpressionRule();

  const createToken = (surface: string, pos: string, start: number): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  /**
   * Feature: additional-grammar-rules, Property 1: 冗長表現の検出と提案
   * 任意のテキストに対して、冗長表現パターン（「馬から落馬する」「後で後悔する」「一番最初」など）が
   * 検出される場合、システムは診断情報を生成し、その診断情報には簡潔な表現への修正提案が含まれる
   *
   * 検証: 要件 1.1, 1.2, 1.3, 1.4, 1.5
   */
  describe('Property 1: 冗長表現の検出と提案', () => {
    it('should detect all redundant expression patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { pattern: '馬から落馬', suggestion: '落馬' },
            { pattern: '後で後悔', suggestion: '後悔' },
            { pattern: '一番最初', suggestion: '最初' },
            { pattern: '各々それぞれ', suggestion: 'それぞれ' },
            { pattern: 'まず最初に', suggestion: '最初に' },
            { pattern: '過半数を超える', suggestion: '過半数' },
            { pattern: '元旦の朝', suggestion: '元旦' },
            { pattern: '炎天下の下', suggestion: '炎天下' },
            { pattern: '射程距離', suggestion: '射程' }
          ),
          ({ pattern, suggestion }) => {
            const text = `これは${pattern}です`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('redundant-expression');
            expect(diagnostics[0].message).toContain(pattern);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide suggestions for all redundant expressions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '馬から落馬',
            '後で後悔',
            '一番最初',
            '各々それぞれ'
          ),
          (pattern) => {
            const text = `これは${pattern}です`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect non-redundant text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            '私は学生です',
            '今日は晴れています',
            '落馬した',
            '後悔している',
            '最初に始めた'
          ),
          (text) => {
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should detect redundant expression with any prefix text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }).filter(s => !s.includes('馬から落馬')),
          (prefix) => {
            const text = `${prefix}馬から落馬した`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('redundant-expression');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

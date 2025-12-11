/**
 * Double Negation Ruleのプロパティベーステスト
 * Feature: advanced-grammar-rules
 * プロパティ 4
 * 検証: 要件 3.1, 3.2, 3.3, 3.5
 */

import * as fc from 'fast-check';
import { DoubleNegationRule } from './doubleNegationRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: DoubleNegationRule', () => {
  const rule = new DoubleNegationRule();

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
   * Feature: advanced-grammar-rules, Property 4: 二重否定の検出と提案
   * 任意のトークンリストに対して、否定表現が二重に使用される場合、
   * システムは診断情報を生成し、その診断情報には肯定表現への書き換え提案が含まれる。
   * 単一の否定表現では診断情報を生成しない
   *
   * 検証: 要件 3.1, 3.2, 3.3, 3.5
   */
  describe('Property 4: 二重否定の検出と提案', () => {
    it('should detect all typical double negation patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { pattern: 'ないわけではない', desc: 'ないわけではない' },
            { pattern: 'ないことはない', desc: 'ないことはない' },
            { pattern: 'なくはない', desc: 'なくはない' },
            { pattern: 'ないとは言えない', desc: 'ないとは言えない' },
            { pattern: 'ないではいられない', desc: 'ないではいられない' }
          ),
          ({ pattern }) => {
            const text = `これは${pattern}`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('double-negation');
            expect(diagnostics[0].message).toContain(pattern);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect single negation patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'ない',
            'しない',
            'できない',
            'わからない',
            '見えない'
          ),
          (negation) => {
            const text = `これは${negation}`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide suggestions for all double negation detections', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'ないわけではない',
            'ないことはない',
            'なくはない'
          ),
          (pattern) => {
            const text = `それは${pattern}`;
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

    it('should not detect non-negation text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            '私は学生です',
            '今日は晴れています',
            '明日は雨が降るでしょう',
            '猫が走っている'
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
  });
});

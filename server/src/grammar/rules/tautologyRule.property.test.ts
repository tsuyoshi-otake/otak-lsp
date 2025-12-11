/**
 * Tautology Ruleのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 2: 重複表現（同語反復）の検出と提案
 * 検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as fc from 'fast-check';
import { TautologyRule } from './tautologyRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: TautologyRule', () => {
  const rule = new TautologyRule();

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
   * Feature: additional-grammar-rules, Property 2: 重複表現（同語反復）の検出と提案
   * 任意のテキストに対して、重複表現パターン（「頭痛が痛い」「違和感を感じる」「被害を被る」など）が
   * 検出される場合、システムは診断情報を生成し、その診断情報には適切な表現への修正提案が含まれる
   *
   * 検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5
   */
  describe('Property 2: 重複表現（同語反復）の検出と提案', () => {
    it('should detect all tautology patterns', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { pattern: '頭痛が痛い', duplicated: '頭/痛' },
            { pattern: '違和感を感じる', duplicated: '感' },
            { pattern: '被害を被る', duplicated: '被' },
            { pattern: '犯罪を犯す', duplicated: '犯' },
            { pattern: '危険が危ない', duplicated: '危' },
            { pattern: '歌を歌う', duplicated: '歌' },
            { pattern: '踊りを踊る', duplicated: '踊' }
          ),
          ({ pattern }) => {
            const text = `これは${pattern}`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('tautology');
            expect(diagnostics[0].message).toContain(pattern);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide multiple suggestions for tautology expressions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '頭痛が痛い',
            '違和感を感じる',
            '被害を被る'
          ),
          (pattern) => {
            const text = `${pattern}`;
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

    it('should not detect non-tautology text', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            '頭が痛い',
            '違和感がある',
            '被害を受けた',
            '罪を犯す',
            '危険がある'
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

    it('should detect tautology with any prefix text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 20 }).filter(s => !s.includes('頭痛が痛い')),
          (prefix) => {
            const text = `${prefix}頭痛が痛い`;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('tautology');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

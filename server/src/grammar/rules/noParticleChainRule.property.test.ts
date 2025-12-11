/**
 * No Particle Chain Ruleのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 3: 助詞「の」連続使用の閾値チェック
 * 検証: 要件 3.1, 3.2, 3.3, 3.4
 */

import * as fc from 'fast-check';
import { NoParticleChainRule } from './noParticleChainRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: NoParticleChainRule', () => {
  const rule = new NoParticleChainRule();

  const createToken = (surface: string, pos: string, posDetail1: string, start: number): Token => {
    return new Token({
      surface,
      pos,
      posDetail1,
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

  const createContext = (text: string, threshold?: number): RuleContext => ({
    documentText: text,
    sentences: [],
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      noParticleChainThreshold: threshold ?? 3
    }
  });

  /**
   * Feature: additional-grammar-rules, Property 3: 助詞「の」連続使用の閾値チェック
   * 任意のトークンリストに対して、助詞「の」の連続回数が閾値（デフォルト3回）以上の場合、
   * システムは診断情報を生成し、その診断情報には連続回数と文の書き換え提案が含まれる。
   * 閾値未満の場合は診断情報を生成しない
   *
   * 検証: 要件 3.1, 3.2, 3.3, 3.4
   */
  describe('Property 3: 助詞「の」連続使用の閾値チェック', () => {
    it('should detect "no" particle chains at or above threshold', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { text: '東京の会社の部長の息子', count: 3 },
            { text: '彼の家の庭の花の色', count: 4 },
            { text: '私の友人の兄の車の色', count: 4 },
            { text: '日本の東京の渋谷の店の商品', count: 4 }
          ),
          ({ text, count }) => {
            const tokens = [createToken(text, '名詞', '*', 0)];
            const context = createContext(text, 3);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('no-particle-chain');
            expect(diagnostics[0].message).toContain('の');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect "no" particle chains below threshold', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '彼の家の庭',
            '私の友人の本',
            '東京の天気',
            '会社の名前'
          ),
          (text) => {
            const tokens = [createToken(text, '名詞', '*', 0)];
            const context = createContext(text, 3);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide suggestions for all detected chains', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '東京の会社の部長の息子',
            '彼の家の庭の花'
          ),
          (text) => {
            const tokens = [createToken(text, '名詞', '*', 0)];
            const context = createContext(text, 3);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should respect custom threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (threshold) => {
            const text = '東京の会社の部長の息子の友達';
            const tokens = [createToken(text, '名詞', '*', 0)];
            const context = createContext(text, threshold);
            const diagnostics = rule.check(tokens, context);

            // 4回の「の」があるので、閾値が4以下なら検出される
            if (threshold <= 4) {
              expect(diagnostics.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

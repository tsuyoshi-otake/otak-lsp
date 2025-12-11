/**
 * Ra-nuki Detection Ruleのプロパティベーステスト
 * Feature: advanced-grammar-rules
 * プロパティ 3
 * 検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as fc from 'fast-check';
import { RaNukiRule } from './raNukiRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: RaNukiRule', () => {
  const rule = new RaNukiRule();

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    baseForm?: string,
    conjugation?: string
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: conjugation || '*',
      conjugationForm: '*',
      baseForm: baseForm || surface,
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
   * Feature: advanced-grammar-rules, Property 3: ら抜き言葉の検出と提案
   * 任意の動詞トークンに対して、五段活用または一段活用動詞に「れる」が接続される場合、
   * システムは診断情報を生成し、その診断情報には「られる」への修正候補が含まれる。
   * 正しい「られる」が使用される場合は診断情報を生成しない
   *
   * 検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5
   */
  describe('Property 3: ら抜き言葉の検出と提案', () => {
    it('should detect ra-nuki forms for ichidan verbs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { raNuki: '食べれる', correct: '食べられる', stem: '食べ' },
            { raNuki: '見れる', correct: '見られる', stem: '見' },
            { raNuki: '起きれる', correct: '起きられる', stem: '起き' },
            { raNuki: '考えれる', correct: '考えられる', stem: '考え' },
            { raNuki: '出れる', correct: '出られる', stem: '出' },
            { raNuki: '寝れる', correct: '寝られる', stem: '寝' }
          ),
          ({ raNuki, correct }) => {
            const tokens = [createToken(raNuki, '動詞', 0, raNuki, '一段')];
            const context = createContext(raNuki);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('ra-nuki');
            expect(diagnostics[0].suggestions).toContain(correct);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect ra-nuki for correct rareru forms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '食べられる', '見られる', '起きられる', '考えられる', '出られる', '寝られる'
          ),
          (correct) => {
            const tokens = [createToken(correct, '動詞', 0, correct, '一段')];
            const context = createContext(correct);
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect ra-nuki for godan verb potential forms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            '書ける', '読める', '走れる', '泳げる', '飛べる', '話せる'
          ),
          (potential) => {
            const tokens = [createToken(potential, '動詞', 0, potential, '五段')];
            const context = createContext(potential);
            const diagnostics = rule.check(tokens, context);

            // 五段活用動詞の可能形は正しい
            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide correction suggestion for all ra-nuki detections', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { raNuki: '食べれる', correct: '食べられる' },
            { raNuki: '見れる', correct: '見られる' },
            { raNuki: '起きれる', correct: '起きられる' }
          ),
          ({ raNuki, correct }) => {
            const tokens = [createToken(raNuki, '動詞', 0, raNuki, '一段')];
            const context = createContext(raNuki);
            const diagnostics = rule.check(tokens, context);

            // 診断情報が生成される
            expect(diagnostics.length).toBeGreaterThan(0);

            // 修正候補が含まれる
            expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
            expect(diagnostics[0].suggestions).toContain(correct);

            // メッセージに説明が含まれる
            expect(diagnostics[0].message.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

/**
 * Monotonous Ending Ruleのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 4: 文末表現の単調さ検出
 * 検証: 要件 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fc from 'fast-check';
import { MonotonousEndingRule } from './monotonousEndingRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: MonotonousEndingRule', () => {
  const rule = new MonotonousEndingRule();

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

  const createSentence = (text: string, start: number): Sentence => {
    return new Sentence({
      text,
      tokens: [createToken(text, '名詞', start)],
      start,
      end: start + text.length
    });
  };

  const createContext = (text: string, sentences: Sentence[], threshold?: number): RuleContext => ({
    documentText: text,
    sentences,
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      monotonousEndingThreshold: threshold ?? 3
    }
  });

  /**
   * Feature: additional-grammar-rules, Property 4: 文末表現の単調さ検出
   * 任意の文のリストに対して、同じ文末表現の連続回数が閾値（デフォルト3回）以上の場合、
   * システムは診断情報を生成し、その診断情報には連続回数と表現の多様化提案が含まれる。
   * 異なる文末表現が使用される場合は診断情報を生成しない
   *
   * 検証: 要件 4.1, 4.2, 4.3, 4.4, 4.5
   */
  describe('Property 4: 文末表現の単調さ検出', () => {
    it('should detect monotonous endings at or above threshold', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { ending: 'です', sentences: ['Aです。', 'Bです。', 'Cです。'] },
            { ending: 'ます', sentences: ['行きます。', '食べます。', '見ます。'] },
            { ending: 'である', sentences: 'Aである。Bである。Cである。' },
            { ending: 'ました', sentences: '行きました。食べました。見ました。' }
          ),
          ({ ending, sentences }) => {
            const text = Array.isArray(sentences) ? sentences.join('') : sentences;
            const sentenceList = text.split(/(?<=[。！？])/g).filter(s => s.trim());
            const sentenceObjs = sentenceList.map((s, i) => createSentence(s, text.indexOf(s)));
            const context = createContext(text, sentenceObjs, 3);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('monotonous-ending');
            expect(diagnostics[0].message).toContain(ending);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect varied endings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Aです。Bます。Cである。',
            '行った。食べている。見ます。',
            'これだ。あれです。それである。'
          ),
          (text) => {
            const sentenceList = text.split(/(?<=[。！？])/g).filter(s => s.trim());
            const sentenceObjs = sentenceList.map((s, i) => createSentence(s, text.indexOf(s)));
            const context = createContext(text, sentenceObjs, 3);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide variations for monotonous endings', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Aです。Bです。Cです。',
            '行きます。食べます。見ます。'
          ),
          (text) => {
            const sentenceList = text.split(/(?<=[。！？])/g).filter(s => s.trim());
            const sentenceObjs = sentenceList.map((s, i) => createSentence(s, text.indexOf(s)));
            const context = createContext(text, sentenceObjs, 3);
            const diagnostics = rule.check([], context);

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
            const text = 'Aです。Bです。Cです。Dです。'; // 4回連続
            const sentenceList = text.split(/(?<=[。！？])/g).filter(s => s.trim());
            const sentenceObjs = sentenceList.map((s, i) => createSentence(s, text.indexOf(s)));
            const context = createContext(text, sentenceObjs, threshold);
            const diagnostics = rule.check([], context);

            // 4回の連続があるので、閾値が4以下なら検出される
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

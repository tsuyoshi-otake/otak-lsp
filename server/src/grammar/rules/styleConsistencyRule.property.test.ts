/**
 * Style Consistency Ruleのプロパティベーステスト
 * Feature: advanced-grammar-rules
 * プロパティ 1, 2
 * 検証: 要件 1.1, 1.2, 1.3, 1.4, 1.5
 */

import * as fc from 'fast-check';
import { StyleConsistencyRule } from './styleConsistencyRule';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, StyleType } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: StyleConsistencyRule', () => {
  const rule = new StyleConsistencyRule();

  const createContext = (text: string, sentences: Sentence[]): RuleContext => ({
    documentText: text,
    sentences,
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  /**
   * Feature: advanced-grammar-rules, Property 1: 文体認識の正確性
   * 任意の日本語文に対して、文末が「です」「ます」の場合は敬体として認識され、
   * 「である」の場合は常体として認識され、「だ」などその他の文末は中立として認識される
   *
   * 検証: 要件 1.1, 1.2, 1.5
   */
  describe('Property 1: 文体認識の正確性', () => {
    it('should recognize desu/masu endings as keigo', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('です', 'ます'),
          (ending) => {
            const sentence = new Sentence({
              text: `これはテスト${ending}`,
              tokens: [],
              start: 0,
              end: 5 + ending.length
            });
            const style = rule.detectStyle(sentence);
            expect(style).toBe('keigo');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should recognize dearu ending as joutai', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('である'),
          (ending) => {
            const sentence = new Sentence({
              text: `これはテスト${ending}`,
              tokens: [],
              start: 0,
              end: 5 + ending.length
            });
            const style = rule.detectStyle(sentence);
            expect(style).toBe('joutai');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should recognize da and other endings as neutral', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('だ', 'する', '行く', 'ない'),
          (ending) => {
            const sentence = new Sentence({
              text: `これはテスト${ending}`,
              tokens: [],
              start: 0,
              end: 5 + ending.length
            });
            const style = rule.detectStyle(sentence);
            expect(style).toBe('neutral');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle sentences with periods', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { ending: 'です。', expected: 'keigo' as StyleType },
            { ending: 'ます。', expected: 'keigo' as StyleType },
            { ending: 'である。', expected: 'joutai' as StyleType },
            { ending: 'だ。', expected: 'neutral' as StyleType }
          ),
          ({ ending, expected }) => {
            const sentence = new Sentence({
              text: `これはテスト${ending}`,
              tokens: [],
              start: 0,
              end: 5 + ending.length
            });
            const style = rule.detectStyle(sentence);
            expect(style).toBe(expected);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 2: 文体混在の検出
   * 任意の文書に対して、敬体と常体が混在する場合、システムは診断情報を生成し、
   * その診断情報には文体統一の提案が含まれる
   *
   * 検証: 要件 1.3, 1.4
   */
  describe('Property 2: 文体混在の検出', () => {
    it('should detect style inconsistency when keigo and joutai are mixed', () => {
      fc.assert(
        fc.property(
          fc.record({
            keigoEnding: fc.constantFrom('です', 'ます'),
            joutaiEnding: fc.constantFrom('である')
          }),
          ({ keigoEnding, joutaiEnding }) => {
            const sentences = [
              new Sentence({ text: `これはテスト${keigoEnding}。`, tokens: [], start: 0, end: 10 }),
              new Sentence({ text: `これはテスト${joutaiEnding}。`, tokens: [], start: 10, end: 20 })
            ];
            const context = createContext('', sentences);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('style-inconsistency');
            expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect inconsistency when only one style is used', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { endings: ['です', 'ます'], style: 'keigo' },
            { endings: ['である', 'である'], style: 'joutai' }
          ),
          ({ endings }) => {
            const sentences = endings.map((ending, i) =>
              new Sentence({ text: `これはテスト${ending}。`, tokens: [], start: i * 10, end: (i + 1) * 10 })
            );
            const context = createContext('', sentences);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should identify dominant style correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          (keigoCount) => {
            const sentences: Sentence[] = [];

            // keigo文を追加
            for (let i = 0; i < keigoCount; i++) {
              sentences.push(new Sentence({
                text: 'これはテストです。',
                tokens: [],
                start: i * 10,
                end: (i + 1) * 10
              }));
            }

            // joutai文を1つ追加
            sentences.push(new Sentence({
              text: 'これはテストである。',
              tokens: [],
              start: keigoCount * 10,
              end: (keigoCount + 1) * 10
            }));

            const dominantStyle = rule.getDominantStyle(sentences);
            expect(dominantStyle).toBe('keigo');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

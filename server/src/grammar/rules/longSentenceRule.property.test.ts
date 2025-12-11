/**
 * Long Sentence Ruleのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 5: 長文の文字数チェック
 * 検証: 要件 5.1, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { LongSentenceRule } from './longSentenceRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: LongSentenceRule', () => {
  const rule = new LongSentenceRule();

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
      longSentenceThreshold: threshold ?? 120
    }
  });

  /**
   * Feature: additional-grammar-rules, Property 5: 長文の文字数チェック
   * 任意の文に対して、文字数が閾値（デフォルト120文字）を超える場合、
   * システムは診断情報を生成し、その診断情報には文字数と文の分割提案が含まれる。
   * 閾値以下の場合は診断情報を生成しない
   *
   * 検証: 要件 5.1, 5.2, 5.3, 5.4
   */
  describe('Property 5: 長文の文字数チェック', () => {
    it('should detect sentences exceeding threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 121, max: 200 }),
          (length) => {
            const text = 'あ'.repeat(length) + '。';
            const sentences = [createSentence(text, 0)];
            const context = createContext(text, sentences, 120);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('long-sentence');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect sentences at or below threshold', () => {
      fc.assert(
        fc.property(
          // max=119 because we add '。' (1 char) -> total 120 chars (at threshold)
          fc.integer({ min: 10, max: 119 }),
          (length) => {
            const text = 'あ'.repeat(length) + '。';
            const sentences = [createSentence(text, 0)];
            const context = createContext(text, sentences, 120);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should include character count in message', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 121, max: 200 }),
          (length) => {
            const text = 'あ'.repeat(length) + '。';
            const sentences = [createSentence(text, 0)];
            const context = createContext(text, sentences, 120);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].message).toContain(String(length + 1)); // +1 for 。
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide split suggestions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 121, max: 200 }),
          (length) => {
            const text = 'あ'.repeat(length) + '。';
            const sentences = [createSentence(text, 0)];
            const context = createContext(text, sentences, 120);
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
          fc.integer({ min: 50, max: 150 }),
          (threshold) => {
            const text = 'あ'.repeat(100) + '。'; // 101文字
            const sentences = [createSentence(text, 0)];
            const context = createContext(text, sentences, threshold);
            const diagnostics = rule.check([], context);

            if (threshold < 101) {
              expect(diagnostics.length).toBeGreaterThan(0);
            } else {
              expect(diagnostics).toHaveLength(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

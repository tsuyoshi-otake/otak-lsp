/**
 * TokenFilterのプロパティベーステスト
 * Feature: semantic-highlight-fix
 * プロパティ 1: トークンフィルタリングの完全性
 * 検証: 要件 2.1, 2.2, 2.3
 */

import * as fc from 'fast-check';
import { TokenFilter } from './tokenFilter';
import { Token } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

describe('Property-Based Tests: TokenFilter', () => {
  let tokenFilter: TokenFilter;

  beforeEach(() => {
    tokenFilter = new TokenFilter();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
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

  /**
   * ヘルパー関数: 除外範囲を作成
   */
  const createExcludedRange = (
    start: number,
    end: number,
    type: 'code-block' | 'inline-code' | 'table' | 'url' = 'inline-code'
  ): ExcludedRange => {
    return {
      start,
      end,
      type,
      content: ' '.repeat(end - start),
      reason: 'テスト用除外範囲'
    };
  };

  /**
   * プロパティ 1: トークンフィルタリングの完全性
   * すべてのトークンリストと除外範囲リストに対して、
   * フィルタリング後のトークンはすべて除外範囲外に存在しなければならない
   */
  describe('Property 1: トークンフィルタリングの完全性', () => {
    it('フィルタリング後のすべてのトークンが除外範囲外にあること', () => {
      fc.assert(
        fc.property(
          // トークン開始位置とサイズのペアを生成
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 100 }),
              size: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 0, maxLength: 20 }
          ),
          // 除外範囲の開始位置と終了位置のペアを生成
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 100 }),
              end: fc.integer({ min: 1, max: 105 })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (tokenSpecs, rangeSpecs) => {
            // トークンを作成
            const tokens = tokenSpecs.map(spec =>
              createToken('あ'.repeat(spec.size), '名詞', spec.start)
            );

            // 除外範囲を作成（start < end を保証）
            const excludedRanges = rangeSpecs
              .filter(spec => spec.start < spec.end)
              .map(spec => createExcludedRange(spec.start, spec.end));

            // フィルタリング実行
            const filteredTokens = tokenFilter.filterTokens(tokens, excludedRanges);

            // すべてのフィルタリング後のトークンが除外範囲外にあることを確認
            for (const token of filteredTokens) {
              const isInExcludedRange = excludedRanges.some(
                range => token.start < range.end && token.end > range.start
              );
              expect(isInExcludedRange).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('除外範囲外のトークンはすべて保持されること', () => {
      fc.assert(
        fc.property(
          // 連続するトークンを生成（重複なし）
          fc.array(
            fc.integer({ min: 1, max: 3 }),
            { minLength: 1, maxLength: 10 }
          ),
          // 除外範囲を生成
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 50 }),
              size: fc.integer({ min: 1, max: 10 })
            }),
            { minLength: 0, maxLength: 3 }
          ),
          (tokenSizes, rangeSpecs) => {
            // 連続するトークンを作成
            let position = 0;
            const tokens = tokenSizes.map(size => {
              const token = createToken('あ'.repeat(size), '名詞', position);
              position += size;
              return token;
            });

            // 除外範囲を作成
            const excludedRanges = rangeSpecs.map(spec =>
              createExcludedRange(spec.start, spec.start + spec.size)
            );

            // フィルタリング実行
            const filteredTokens = tokenFilter.filterTokens(tokens, excludedRanges);

            // 除外範囲外のトークンをカウント
            const expectedCount = tokens.filter(token => {
              return !excludedRanges.some(
                range => token.start < range.end && token.end > range.start
              );
            }).length;

            expect(filteredTokens.length).toBe(expectedCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('空の除外範囲リストの場合、すべてのトークンが保持されること', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.integer({ min: 1, max: 5 }),
            { minLength: 0, maxLength: 20 }
          ),
          (tokenSizes) => {
            let position = 0;
            const tokens = tokenSizes.map(size => {
              const token = createToken('あ'.repeat(size), '名詞', position);
              position += size;
              return token;
            });

            const filteredTokens = tokenFilter.filterTokens(tokens, []);

            expect(filteredTokens.length).toBe(tokens.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('空のトークンリストの場合、空の配列が返されること', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 100 }),
              size: fc.integer({ min: 1, max: 20 })
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (rangeSpecs) => {
            const excludedRanges = rangeSpecs.map(spec =>
              createExcludedRange(spec.start, spec.start + spec.size)
            );

            const filteredTokens = tokenFilter.filterTokens([], excludedRanges);

            expect(filteredTokens).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ: フィルタリングの一貫性
   * 同じ入力に対して常に同じ出力が返されること
   */
  describe('Property: フィルタリングの一貫性', () => {
    it('同じ入力に対して常に同じ結果が返されること', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 50 }),
              size: fc.integer({ min: 1, max: 3 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              start: fc.integer({ min: 0, max: 50 }),
              size: fc.integer({ min: 1, max: 10 })
            }),
            { minLength: 0, maxLength: 3 }
          ),
          (tokenSpecs, rangeSpecs) => {
            const tokens = tokenSpecs.map(spec =>
              createToken('あ'.repeat(spec.size), '名詞', spec.start)
            );

            const excludedRanges = rangeSpecs.map(spec =>
              createExcludedRange(spec.start, spec.start + spec.size)
            );

            // 2回実行
            const result1 = tokenFilter.filterTokens(tokens, excludedRanges);
            const result2 = tokenFilter.filterTokens(tokens, excludedRanges);

            // 同じ結果
            expect(result1.length).toBe(result2.length);
            for (let i = 0; i < result1.length; i++) {
              expect(result1[i].start).toBe(result2[i].start);
              expect(result1[i].end).toBe(result2[i].end);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

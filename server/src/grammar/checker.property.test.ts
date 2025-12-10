/**
 * Grammar Checkerのプロパティベーステスト
 * Feature: japanese-grammar-analyzer
 * プロパティ 5, 6, 7, 8
 * 検証: 要件 3.1, 3.2, 3.3, 3.4, 3.5
 */

import * as fc from 'fast-check';
import { GrammarChecker } from './checker';
import { Token, Diagnostic } from '../../../shared/src/types';

describe('Property-Based Tests: Grammar Checker', () => {
  const checker = new GrammarChecker();

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    posDetail1: string = '*',
    baseForm?: string
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1,
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: baseForm || surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  /**
   * Feature: japanese-grammar-analyzer, Property 5: 二重助詞の検出
   * 任意のトークンリストに対して、同じ助詞が連続して出現する場合、
   * システムは該当箇所に診断情報を生成する
   *
   * 検証: 要件 3.1
   */
  describe('Property 5: 二重助詞の検出', () => {
    it('should always detect double particle when same particle appears consecutively', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('が', 'を', 'に', 'で', 'と', 'へ', 'から', 'まで', 'より'),
          (particle) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(particle, '助詞', 1, '格助詞'),
              createToken(particle, '助詞', 1 + particle.length, '格助詞'),
              createToken('行く', '動詞', 1 + particle.length * 2)
            ];
            const diagnostics = checker.check(tokens);

            const doubleParticleErrors = diagnostics.filter(d => d.code === 'double-particle');
            expect(doubleParticleErrors.length).toBeGreaterThanOrEqual(1);
            expect(doubleParticleErrors[0].message).toContain(particle + particle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not detect double particle when particles are different', () => {
      fc.assert(
        fc.property(
          fc.record({
            p1: fc.constantFrom('が', 'を', 'に'),
            p2: fc.constantFrom('で', 'と', 'へ')
          }),
          ({ p1, p2 }) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(p1, '助詞', 1, '格助詞'),
              createToken(p2, '助詞', 1 + p1.length, '格助詞'),
              createToken('行く', '動詞', 1 + p1.length + p2.length)
            ];
            const diagnostics = checker.check(tokens);

            const doubleParticleErrors = diagnostics.filter(d => d.code === 'double-particle');
            expect(doubleParticleErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 6: 助詞連続の検出
   * 任意のトークンリストに対して、不適切な助詞の連続が出現する場合、
   * システムは該当箇所に診断情報を生成する
   *
   * 検証: 要件 3.2
   */
  describe('Property 6: 助詞連続の検出', () => {
    it('should detect problematic particle sequences', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { p1: 'が', p2: 'を' },
            { p1: 'を', p2: 'が' },
            { p1: 'が', p2: 'に' },
            { p1: 'を', p2: 'に' }
          ),
          ({ p1, p2 }) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(p1, '助詞', 1, '格助詞'),
              createToken(p2, '助詞', 1 + p1.length, '格助詞'),
              createToken('行く', '動詞', 1 + p1.length + p2.length)
            ];
            const diagnostics = checker.check(tokens);

            const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
            expect(sequenceErrors.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag valid particle combinations', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { p1: 'に', p2: 'は' },
            { p1: 'で', p2: 'は' }
          ),
          ({ p1, p2 }) => {
            const tokens = [
              createToken('学校', '名詞', 0),
              createToken(p1, '助詞', 2, '格助詞'),
              createToken(p2, '助詞', 2 + p1.length, '係助詞'),
              createToken('ある', '動詞', 2 + p1.length + p2.length)
            ];
            const diagnostics = checker.check(tokens);

            const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
            expect(sequenceErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 7: 動詞-助詞不整合の検出
   * 任意のトークンリストに対して、動詞と後続する助詞の組み合わせが不自然な場合、
   * システムは該当箇所に診断情報を生成する
   *
   * 検証: 要件 3.3
   */
  describe('Property 7: 動詞-助詞不整合の検出', () => {
    it('should detect mismatch when intransitive verb is used with を', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('行く', '来る', '帰る', '走る', '歩く', '泳ぐ', '飛ぶ'),
          (verb) => {
            const tokens = [
              createToken('学校', '名詞', 0),
              createToken('を', '助詞', 2, '格助詞'),
              createToken(verb, '動詞', 3, '*', verb)
            ];
            const diagnostics = checker.check(tokens);

            const mismatchErrors = diagnostics.filter(d => d.code === 'verb-particle-mismatch');
            expect(mismatchErrors.length).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not flag transitive verbs with を', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('読む', '書く', '食べる', '見る', '聞く', '作る', '買う'),
          (verb) => {
            const tokens = [
              createToken('本', '名詞', 0),
              createToken('を', '助詞', 1, '格助詞'),
              createToken(verb, '動詞', 2, '*', verb)
            ];
            const diagnostics = checker.check(tokens);

            const mismatchErrors = diagnostics.filter(d => d.code === 'verb-particle-mismatch');
            expect(mismatchErrors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 8: 診断情報の完全性
   * 任意の文法エラーに対して、生成される診断情報はエラーの種類、説明、範囲を含み、
   * 可能な場合は修正候補を含む
   *
   * 検証: 要件 3.4, 3.5
   */
  describe('Property 8: 診断情報の完全性', () => {
    it('should include all required diagnostic fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('が', 'を', 'に'),
          (particle) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(particle, '助詞', 1, '格助詞'),
              createToken(particle, '助詞', 1 + particle.length, '格助詞')
            ];
            const diagnostics = checker.check(tokens);

            expect(diagnostics.length).toBeGreaterThanOrEqual(1);
            const diagnostic = diagnostics[0];

            // エラーの種類（code）
            expect(diagnostic.code).toBeDefined();
            expect(typeof diagnostic.code).toBe('string');
            expect(diagnostic.code.length).toBeGreaterThan(0);

            // 説明（message）
            expect(diagnostic.message).toBeDefined();
            expect(typeof diagnostic.message).toBe('string');
            expect(diagnostic.message.length).toBeGreaterThan(0);

            // 範囲（range）
            expect(diagnostic.range).toBeDefined();
            expect(diagnostic.range.start).toBeDefined();
            expect(diagnostic.range.end).toBeDefined();
            expect(diagnostic.range.start.character).toBeDefined();
            expect(diagnostic.range.end.character).toBeDefined();

            // 重大度（severity）
            expect(diagnostic.severity).toBeDefined();
            expect(typeof diagnostic.severity).toBe('number');

            // ソース（source）
            expect(diagnostic.source).toBe('japanese-grammar-analyzer');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include suggestion in message for all error types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            // 二重助詞
            [
              createToken('私', '名詞', 0),
              createToken('が', '助詞', 1, '格助詞'),
              createToken('が', '助詞', 2, '格助詞')
            ],
            // 動詞-助詞不整合
            [
              createToken('学校', '名詞', 0),
              createToken('を', '助詞', 2, '格助詞'),
              createToken('行く', '動詞', 3, '*', '行く')
            ]
          ),
          (tokens) => {
            const diagnostics = checker.check(tokens);

            expect(diagnostics.length).toBeGreaterThanOrEqual(1);
            const diagnostic = diagnostics[0];

            // メッセージに修正候補や説明が含まれている
            expect(diagnostic.message.length).toBeGreaterThan(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid range positions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('が', 'を', 'に'),
          (particle) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(particle, '助詞', 1, '格助詞'),
              createToken(particle, '助詞', 1 + particle.length, '格助詞')
            ];
            const diagnostics = checker.check(tokens);

            expect(diagnostics.length).toBeGreaterThanOrEqual(1);
            const diagnostic = diagnostics[0];

            // 範囲の整合性
            expect(diagnostic.range.start.character).toBeGreaterThanOrEqual(0);
            expect(diagnostic.range.end.character).toBeGreaterThan(diagnostic.range.start.character);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

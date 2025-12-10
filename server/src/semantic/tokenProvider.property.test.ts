/**
 * Semantic Token Providerのプロパティベーステスト
 * Feature: japanese-grammar-analyzer
 * プロパティ 9: セマンティックトークンの生成
 * 検証: 要件 4.1, 4.2, 4.3, 4.4
 */

import * as fc from 'fast-check';
import { SemanticTokenProvider, TokenType } from './tokenProvider';
import { Token } from '../../../shared/src/types';

describe('Property-Based Tests: Semantic Token Provider', () => {
  const provider = new SemanticTokenProvider();

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
   * Feature: japanese-grammar-analyzer, Property 9: セマンティックトークンの生成
   * 任意の日本語テキストに対して、形態素解析を実行したとき、
   * すべてのトークンは品詞に応じたセマンティックトークンタイプにマッピングされる
   *
   * 検証: 要件 4.1, 4.2, 4.3, 4.4
   */
  describe('Property 9: セマンティックトークンの生成', () => {
    it('should map all 名詞 tokens to Noun type', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'日本語テスト単語'), { minLength: 1, maxLength: 5 }),
          (surface) => {
            const tokens = [createToken(surface, '名詞', 0)];
            const result = provider.provideSemanticTokens(tokens);

            expect(result.data.length).toBe(5);
            expect(result.data[3]).toBe(TokenType.Noun);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map all 動詞 tokens to Verb type', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'行読書食見'), { minLength: 1, maxLength: 3 }),
          (surface) => {
            const tokens = [createToken(surface, '動詞', 0)];
            const result = provider.provideSemanticTokens(tokens);

            expect(result.data.length).toBe(5);
            expect(result.data[3]).toBe(TokenType.Verb);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map all 形容詞 tokens to Adjective type', () => {
      fc.assert(
        fc.property(
          fc.stringOf(fc.constantFrom(...'美大小高低'), { minLength: 1, maxLength: 3 }),
          (surface) => {
            const tokens = [createToken(surface, '形容詞', 0)];
            const result = provider.provideSemanticTokens(tokens);

            expect(result.data.length).toBe(5);
            expect(result.data[3]).toBe(TokenType.Adjective);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map all 助詞 tokens to Particle type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('が', 'を', 'に', 'で', 'と', 'へ', 'から', 'まで', 'は', 'も'),
          (surface) => {
            const tokens = [createToken(surface, '助詞', 0)];
            const result = provider.provideSemanticTokens(tokens);

            expect(result.data.length).toBe(5);
            expect(result.data[3]).toBe(TokenType.Particle);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should map all 副詞 tokens to Adverb type', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('とても', 'すぐ', 'まだ', 'もう', 'よく', 'たぶん'),
          (surface) => {
            const tokens = [createToken(surface, '副詞', 0)];
            const result = provider.provideSemanticTokens(tokens);

            expect(result.data.length).toBe(5);
            expect(result.data[3]).toBe(TokenType.Adverb);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should generate correct number of data elements for any number of tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              surface: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
              pos: fc.constantFrom('名詞', '動詞', '形容詞', '助詞', '副詞')
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (tokenSpecs) => {
            let currentPosition = 0;
            const tokens = tokenSpecs.map(spec => {
              const token = createToken(spec.surface, spec.pos, currentPosition);
              currentPosition += spec.surface.length;
              return token;
            });

            const result = provider.provideSemanticTokens(tokens);

            // 各トークンは5つのデータ要素を持つ
            expect(result.data.length).toBe(tokens.length * 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correct relative positions for consecutive tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
            { minLength: 2, maxLength: 10 }
          ),
          (surfaces) => {
            let currentPosition = 0;
            const tokens = surfaces.map(surface => {
              const token = createToken(surface, '名詞', currentPosition);
              currentPosition += surface.length;
              return token;
            });

            const result = provider.provideSemanticTokens(tokens);

            // 最初のトークンの開始位置は0
            expect(result.data[1]).toBe(0);

            // 後続のトークンの相対位置が正しいことを確認
            for (let i = 1; i < tokens.length; i++) {
              const dataIndex = i * 5;
              const deltaChar = result.data[dataIndex + 1];
              expect(deltaChar).toBe(tokens[i - 1].surface.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly handle mixed POS types in a sentence', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.constantFrom('名詞', '動詞', '形容詞', '助詞', '副詞'),
            { minLength: 1, maxLength: 10 }
          ),
          (posTypes) => {
            let currentPosition = 0;
            const tokens = posTypes.map(pos => {
              const token = createToken('あ', pos, currentPosition);
              currentPosition += 1;
              return token;
            });

            const result = provider.provideSemanticTokens(tokens);

            // 各トークンのタイプが正しくマッピングされている
            for (let i = 0; i < tokens.length; i++) {
              const dataIndex = i * 5 + 3; // tokenType is at index 3 in each 5-element group
              const expectedType = provider.mapPosToTokenType(posTypes[i]);
              expect(result.data[dataIndex]).toBe(expectedType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always include valid token type values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('名詞', '動詞', '形容詞', '助詞', '副詞', '記号', '接続詞', '感動詞'),
          (pos) => {
            const tokens = [createToken('あ', pos, 0)];
            const result = provider.provideSemanticTokens(tokens);

            const tokenType = result.data[3];
            expect(tokenType).toBeGreaterThanOrEqual(0);
            expect(tokenType).toBeLessThanOrEqual(5); // TokenType.Other = 5
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

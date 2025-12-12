/**
 * Semantic Token Providerのユニットテスト
 * Feature: japanese-grammar-analyzer
 * 要件: 4.1, 4.2, 4.3, 4.4
 */

import { SemanticTokenProvider, TokenType } from './tokenProvider';
import { Token, SemanticTokens } from '../../../shared/src/types';

describe('Semantic Token Provider', () => {
  let provider: SemanticTokenProvider;

  beforeEach(() => {
    provider = new SemanticTokenProvider();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    line: number = 0
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

  describe('mapPosToTokenType', () => {
    it('should map 名詞 to Noun', () => {
      const tokenType = provider.mapPosToTokenType('名詞');
      expect(tokenType).toBe(TokenType.Noun);
    });

    it('should map 動詞 to Verb', () => {
      const tokenType = provider.mapPosToTokenType('動詞');
      expect(tokenType).toBe(TokenType.Verb);
    });

    it('should map 助動詞 to Verb', () => {
      const tokenType = provider.mapPosToTokenType('助動詞');
      expect(tokenType).toBe(TokenType.Verb);
    });

    it('should map 形容詞 to Adjective', () => {
      const tokenType = provider.mapPosToTokenType('形容詞');
      expect(tokenType).toBe(TokenType.Adjective);
    });

    it('should map 連体詞 to Adjective', () => {
      const tokenType = provider.mapPosToTokenType('連体詞');
      expect(tokenType).toBe(TokenType.Adjective);
    });

    it('should map 助詞 to Particle', () => {
      const tokenType = provider.mapPosToTokenType('助詞');
      expect(tokenType).toBe(TokenType.Particle);
    });

    it('should map 接続詞 to Particle', () => {
      const tokenType = provider.mapPosToTokenType('接続詞');
      expect(tokenType).toBe(TokenType.Particle);
    });

    it('should map 接頭詞 to Noun', () => {
      const tokenType = provider.mapPosToTokenType('接頭詞');
      expect(tokenType).toBe(TokenType.Noun);
    });

    it('should map 感動詞 to Noun', () => {
      const tokenType = provider.mapPosToTokenType('感動詞');
      expect(tokenType).toBe(TokenType.Noun);
    });

    it('should map フィラー to Adverb', () => {
      const tokenType = provider.mapPosToTokenType('フィラー');
      expect(tokenType).toBe(TokenType.Adverb);
    });

    it('should map 副詞 to Adverb', () => {
      const tokenType = provider.mapPosToTokenType('副詞');
      expect(tokenType).toBe(TokenType.Adverb);
    });

    it('should map unknown POS to Other', () => {
      const tokenType = provider.mapPosToTokenType('記号');
      expect(tokenType).toBe(TokenType.Other);
    });

    it('should map unknown non-symbol POS to Noun', () => {
      const tokenType = provider.mapPosToTokenType('その他');
      expect(tokenType).toBe(TokenType.Noun);
    });
  });

  describe('provideSemanticTokens', () => {
    it('should return empty data for empty token list', () => {
      const result = provider.provideSemanticTokens([], '');
      expect(result.data).toHaveLength(0);
    });

    it('should return correct format for single token', () => {
      const text = '日本語';
      const tokens = [createToken('日本語', '名詞', 0)];
      const result = provider.provideSemanticTokens(tokens, text);

      // 形式: [line, startChar, length, tokenType, tokenModifiers]
      expect(result.data.length).toBe(5);
      expect(result.data[0]).toBe(0); // line
      expect(result.data[1]).toBe(0); // startChar
      expect(result.data[2]).toBe(3); // length
      expect(result.data[3]).toBe(TokenType.Noun); // tokenType
      expect(result.data[4]).toBe(0); // tokenModifiers
    });

    it('should handle multiple tokens on same line', () => {
      const text = '私は行く';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('行く', '動詞', 2)
      ];
      const result = provider.provideSemanticTokens(tokens, text);

      // 3つのトークン、各5要素
      expect(result.data.length).toBe(15);

      // 最初のトークン
      expect(result.data[0]).toBe(0); // line (相対)
      expect(result.data[1]).toBe(0); // startChar (相対)
      expect(result.data[3]).toBe(TokenType.Noun);

      // 2番目のトークン
      expect(result.data[5]).toBe(0); // line (相対 - 同じ行なので0)
      expect(result.data[6]).toBe(1); // startChar (相対 - 前のトークンの開始位置からの差)
      expect(result.data[8]).toBe(TokenType.Particle);

      // 3番目のトークン
      expect(result.data[10]).toBe(0); // line
      expect(result.data[13]).toBe(TokenType.Verb);
    });

    it('should correctly map all POS types', () => {
      const text = '私はとても美しい花を見る';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('とても', '副詞', 2),
        createToken('美しい', '形容詞', 5),
        createToken('花', '名詞', 8),
        createToken('を', '助詞', 9),
        createToken('見る', '動詞', 10)
      ];
      const result = provider.provideSemanticTokens(tokens, text);

      // 7つのトークン
      expect(result.data.length).toBe(35);

      // TokenTypeを確認
      expect(result.data[3]).toBe(TokenType.Noun);     // 私
      expect(result.data[8]).toBe(TokenType.Particle); // は
      expect(result.data[13]).toBe(TokenType.Adverb);  // とても
      expect(result.data[18]).toBe(TokenType.Adjective); // 美しい
      expect(result.data[23]).toBe(TokenType.Noun);    // 花
      expect(result.data[28]).toBe(TokenType.Particle); // を
      expect(result.data[33]).toBe(TokenType.Verb);    // 見る
    });
  });

  describe('getTokenTypeLegend', () => {
    it('should return all token type names', () => {
      const legend = provider.getTokenTypeLegend();

      expect(legend).toContain('noun');
      expect(legend).toContain('verb');
      expect(legend).toContain('adjective');
      expect(legend).toContain('particle');
      expect(legend).toContain('adverb');
      expect(legend).toContain('other');
    });

    it('should have correct number of token types', () => {
      const legend = provider.getTokenTypeLegend();
      expect(legend.length).toBe(6);
    });
  });

  describe('calculateRelativePosition', () => {
    it('should calculate correct relative positions', () => {
      const text = 'あいう';
      const tokens = [
        createToken('あ', '名詞', 0),
        createToken('い', '名詞', 1),
        createToken('う', '名詞', 2)
      ];
      const result = provider.provideSemanticTokens(tokens, text);

      // 最初のトークンの startChar は絶対位置
      expect(result.data[1]).toBe(0);
      // 2番目のトークンの startChar は前のトークンからの相対位置
      expect(result.data[6]).toBe(1);
      // 3番目のトークンの startChar は前のトークンからの相対位置
      expect(result.data[11]).toBe(1);
    });
  });
});

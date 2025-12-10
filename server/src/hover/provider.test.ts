/**
 * Hover Provider Unit Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { HoverProvider } from './provider';
import { Token } from '../../../shared/src/types';
import { WikipediaClient } from '../wikipedia/client';

describe('Hover Provider', () => {
  let provider: HoverProvider;
  let mockWikipediaClient: WikipediaClient;

  beforeEach(() => {
    mockWikipediaClient = new WikipediaClient();
    provider = new HoverProvider(mockWikipediaClient);
  });

  describe('getTokenAtPosition', () => {
    it('should return null for empty token list', () => {
      const result = provider.getTokenAtPosition([], 5);
      expect(result).toBeNull();
    });

    it('should return token when position is within token range', () => {
      const tokens = [
        createToken('私', 0, 1, '名詞'),
        createToken('は', 1, 2, '助詞'),
        createToken('学生', 2, 4, '名詞')
      ];

      const result = provider.getTokenAtPosition(tokens, 2);
      expect(result).not.toBeNull();
      expect(result?.surface).toBe('学生');
    });

    it('should return token when position is at start of token', () => {
      const tokens = [
        createToken('私', 0, 1, '名詞'),
        createToken('は', 1, 2, '助詞')
      ];

      const result = provider.getTokenAtPosition(tokens, 0);
      expect(result).not.toBeNull();
      expect(result?.surface).toBe('私');
    });

    it('should return null when position is after all tokens', () => {
      const tokens = [
        createToken('テスト', 0, 3, '名詞')
      ];

      const result = provider.getTokenAtPosition(tokens, 10);
      expect(result).toBeNull();
    });

    it('should return null when position is before all tokens', () => {
      const tokens = [
        createToken('テスト', 5, 8, '名詞')
      ];

      const result = provider.getTokenAtPosition(tokens, 2);
      expect(result).toBeNull();
    });
  });

  describe('formatMorphemeInfo', () => {
    it('should format token with all information', () => {
      const token = createToken('食べる', 0, 3, '動詞', '食べる', 'タベル');

      const result = provider.formatMorphemeInfo(token);

      expect(result).toContain('**表層形**: 食べる');
      expect(result).toContain('**品詞**: 動詞');
      expect(result).toContain('**原形**: 食べる');
      expect(result).toContain('**読み**: タベル');
    });

    it('should handle missing reading gracefully', () => {
      const token = createToken('test', 0, 4, '名詞', 'test', '*');

      const result = provider.formatMorphemeInfo(token);

      expect(result).toContain('**表層形**: test');
      expect(result).not.toContain('**読み**: *');
    });

    it('should handle missing baseForm gracefully', () => {
      const token = createToken('走り', 0, 2, '動詞', '*', 'ハシリ');

      const result = provider.formatMorphemeInfo(token);

      expect(result).not.toContain('**原形**: *');
    });

    it('should include POS details when available', () => {
      const token = new Token({
        surface: '美しい',
        pos: '形容詞',
        posDetail1: '自立',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '形容詞・イ段',
        conjugationForm: '基本形',
        baseForm: '美しい',
        reading: 'ウツクシイ',
        pronunciation: 'ウツクシイ',
        start: 0,
        end: 3
      });

      const result = provider.formatMorphemeInfo(token);

      expect(result).toContain('形容詞');
    });
  });

  describe('provideHover', () => {
    it('should return null when no token at position', async () => {
      const result = await provider.provideHover([], 10);
      expect(result).toBeNull();
    });

    it('should return hover info with morpheme data', async () => {
      const tokens = [
        createToken('東京', 0, 2, '名詞', '東京', 'トウキョウ')
      ];

      // Wikipediaを無効化
      const mockFetch = jest.fn().mockRejectedValue(new Error('Disabled'));
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**表層形**: 東京');
      expect(result?.contents).toContain('**品詞**: 名詞');
      expect(result?.contents).toContain('**原形**: 東京');
      expect(result?.contents).toContain('**読み**: トウキョウ');
    });

    it('should include Wikipedia summary when available', async () => {
      const tokens = [
        createToken('日本', 0, 2, '名詞', '日本', 'ニホン')
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: '日本国は、東アジアに位置する島国である。'
        })
      });
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('日本国は、東アジアに位置する島国である。');
    });

    it('should return morpheme info only when Wikipedia is unavailable', async () => {
      const tokens = [
        createToken('テスト', 0, 3, '名詞', 'テスト', 'テスト')
      ];

      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**表層形**: テスト');
      // Wikipediaセクションは含まれない
      expect(result?.contents).not.toContain('Wikipedia');
    });

    it('should return range information', async () => {
      const tokens = [
        createToken('サンプル', 5, 9, '名詞', 'サンプル', 'サンプル')
      ];

      const mockFetch = jest.fn().mockRejectedValue(new Error('Disabled'));
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 6);

      expect(result).not.toBeNull();
      expect(result?.range).toEqual({
        start: 5,
        end: 9
      });
    });

    it('should use baseForm for Wikipedia lookup', async () => {
      const tokens = [
        createToken('食べた', 0, 3, '動詞', '食べる', 'タベタ')
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'サマリーテキスト'
        })
      });
      mockWikipediaClient.setFetch(mockFetch);

      await provider.provideHover(tokens, 0);

      // baseForm(食べる)でWikipediaを検索
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('%E9%A3%9F%E3%81%B9%E3%82%8B'), // 食べる encoded
        expect.any(Object)
      );
    });
  });

  describe('enableWikipedia', () => {
    it('should skip Wikipedia lookup when disabled', async () => {
      const tokens = [
        createToken('テスト', 0, 3, '名詞', 'テスト', 'テスト')
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ extract: 'Should not appear' })
      });
      mockWikipediaClient.setFetch(mockFetch);

      provider.setWikipediaEnabled(false);
      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
      expect(result?.contents).not.toContain('Should not appear');
    });
  });
});

// Helper function to create test tokens
function createToken(
  surface: string,
  start: number,
  end: number,
  pos: string,
  baseForm: string = surface,
  reading: string = surface
): Token {
  return new Token({
    surface,
    pos,
    posDetail1: '*',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm,
    reading,
    pronunciation: reading,
    start,
    end
  });
}

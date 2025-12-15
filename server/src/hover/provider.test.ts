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

    it('should include glossary description below Wikipedia when term matches', async () => {
      const tokens = [
        createToken('API', 0, 3, '名詞', 'API', 'API')
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'Wikipediaサマリー'
        })
      });
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      const contents = result!.contents;
      expect(contents).toContain('Wikipediaサマリー');
      expect(contents).toContain('**Wikipedia**');
      expect(contents).toContain('**IT用語図鑑**');
      expect(contents.indexOf('**Wikipedia**')).toBeLessThan(contents.indexOf('**IT用語図鑑**'));
    });

    it('should match term notation variants in glossary (e.g., Nodejs -> Node.js)', async () => {
      provider.setWikipediaEnabled(false);

      const tokens = [
        createToken('Nodejs', 0, 6, '名詞', 'Nodejs', 'Nodejs')
      ];

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**バックエンド用語図鑑**');
      expect(result?.contents).toContain('JavaScriptをサーバ側で動かす実行環境');
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

    it('should prefer longest glossary phrase match around position', async () => {
      provider.setWikipediaEnabled(false);

      const text = 'GitHub Actions';
      const tokens = [
        createToken('GitHub', 0, 6, '名詞', 'GitHub', 'GitHub')
      ];

      const result = await provider.provideHover(tokens, 1, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**DevOps・CI/CD・リリース用語図鑑**');
      expect(result?.contents).toContain('GitHub上でCI/CDワークフローを定義・実行する仕組み');
      expect(result?.range).toEqual({ start: 0, end: text.length });
    });

    it('should match glossary phrase even when hovering on space between words', async () => {
      provider.setWikipediaEnabled(false);

      const text = 'GitHub Actions';
      const tokens = [
        createToken('GitHub', 0, 6, '名詞', 'GitHub', 'GitHub')
      ];

      const spaceOffset = text.indexOf(' ');
      const result = await provider.provideHover(tokens, spaceOffset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**DevOps・CI/CD・リリース用語図鑑**');
      expect(result?.range).toEqual({ start: 0, end: text.length });
    });

    it('should match mixed-script glossary term from document text (e.g., VPCエンドポイント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'VPCエンドポイント';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 2;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**AWSサービス用語図鑑**');
      expect(result?.contents).toContain('プライベートに接続');
      expect(result?.contents).toContain('主な関連サービス');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should match Cloudflare console term aliases (e.g., オレンジクラウド)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'オレンジクラウド';
      const text = `プロキシ設定は${term}です`;
      const offset = text.indexOf(term) + 2;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**Cloudflareサービス用語図鑑**');
      expect(result?.contents).toContain('Cloudflareプロキシ');
      expect(result?.contents).toContain('**類義語**');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should match Azure console term from document text (e.g., コンテナグループ)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'コンテナグループ';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 3;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**Azureサービス用語図鑑**');
      expect(result?.contents).toContain('主な関連サービス');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should match OCI console term from document text (e.g., コンパートメント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'コンパートメント';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 3;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**OCIサービス用語図鑑**');
      expect(result?.contents).toContain('OCIでリソースを分離/整理');
      expect(result?.contents).toContain('主な関連サービス');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should return glossary-only hover when no token is available at position', async () => {
      provider.setWikipediaEnabled(false);

      const text = 'xxx otakLcp.hover.enableGlossary yyy';
      const offset = text.indexOf('otakLcp.hover.enableGlossary') + 5;
      const tokens = [
        createToken('dummy', 0, 5, '名詞', 'dummy', 'dummy')
      ];

      const result = await provider.provideHover(tokens, offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**otak-lcp設定用語図鑑**');
      expect(result?.contents).toContain('ホバーに用語図鑑（オフライン）を表示する設定');
      expect(result?.range.start).toBe(text.indexOf('otakLcp.hover.enableGlossary'));
      expect(result?.range.end).toBe(text.indexOf('otakLcp.hover.enableGlossary') + 'otakLcp.hover.enableGlossary'.length);
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

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

      const deferred = createDeferred<unknown>();
      const mockFetch = jest.fn().mockImplementation(() => deferred.promise);
      mockWikipediaClient.setFetch(mockFetch);

      // 1回目: キャッシュが無いので即時応答（Wikipediaは表示しない）しつつ、バックグラウンドで取得開始
      const result1 = await provider.provideHover(tokens, 0);
      expect(result1).not.toBeNull();
      expect(result1?.contents).not.toContain('**Wikipedia**');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 取得完了 → キャッシュに載る
      deferred.resolve({
        ok: true,
        json: () => Promise.resolve({ extract: '日本国は、東アジアに位置する島国である。' })
      });
      await mockWikipediaClient.getSummary('日本');

      // 2回目: キャッシュから即時にWikipediaを表示
      const result2 = await provider.provideHover(tokens, 0);
      expect(result2).not.toBeNull();
      expect(result2?.contents).toContain('日本国は、東アジアに位置する島国である。');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include glossary description below Wikipedia when term matches', async () => {
      const tokens = [
        createToken('API', 0, 3, '名詞', 'API', 'API')
      ];

      const deferred = createDeferred<unknown>();
      const mockFetch = jest.fn().mockImplementation(() => deferred.promise);
      mockWikipediaClient.setFetch(mockFetch);

      // 1回目: Wikipediaは未キャッシュなので、まず用語図鑑だけ表示される
      const result1 = await provider.provideHover(tokens, 0);
      expect(result1).not.toBeNull();
      expect(result1?.contents).toContain('**バックエンド用語図鑑**');
      expect(result1?.contents).not.toContain('**Wikipedia**');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 取得完了 → キャッシュに載る
      deferred.resolve({
        ok: true,
        json: () => Promise.resolve({ extract: 'Wikipediaサマリー' })
      });
      await mockWikipediaClient.getSummary('API');

      // 2回目: Wikipedia → 用語図鑑の順で表示される
      const result2 = await provider.provideHover(tokens, 0);
      expect(result2).not.toBeNull();
      const contents = result2!.contents;
      expect(contents).toContain('Wikipediaサマリー');
      expect(contents).toContain('**Wikipedia**');
      expect(contents).toContain('**バックエンド用語図鑑**');
      expect(contents.indexOf('**Wikipedia**')).toBeLessThan(contents.indexOf('**バックエンド用語図鑑**'));
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should match term notation variants in glossary (e.g., Nodejs -> Node.js)', async () => {
      provider.setWikipediaEnabled(false);

      const tokens = [
        createToken('Nodejs', 0, 6, '名詞', 'Nodejs', 'Nodejs')
      ];

      const result = await provider.provideHover(tokens, 0);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**IT用語図鑑**');
      expect(result?.contents).toContain('V8エンジン上で動作');
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

    it('should treat technical term with symbols as one word for Wikipedia lookup (e.g., C++)', async () => {
      const text = 'C++';
      const tokens = [
        createToken('C', 0, 1, '名詞', 'C', 'C'),
        createToken('++', 1, 3, '記号', '++', '++')
      ];

      const deferred = createDeferred<unknown>();
      const mockFetch = jest.fn().mockImplementation(() => deferred.promise);
      mockWikipediaClient.setFetch(mockFetch);

      // 1回目: 用語抽出は即時に行われる（Wikipediaは未キャッシュなので表示しない）
      const result1 = await provider.provideHover(tokens, 2, text);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('C%2B%2B'),
        expect.any(Object)
      );
      expect(result1).not.toBeNull();
      expect(result1?.contents).toContain('**用語**: C++');
      expect(result1?.contents).not.toContain('C++は汎用プログラミング言語である。');
      expect(result1?.range).toEqual({ start: 0, end: 3 });

      // 取得完了 → キャッシュに載る
      deferred.resolve({
        ok: true,
        json: () => Promise.resolve({ extract: 'C++は汎用プログラミング言語である。' })
      });
      await mockWikipediaClient.getSummary('C++');

      // 2回目: キャッシュからWikipediaを表示
      const result2 = await provider.provideHover(tokens, 2, text);
      expect(result2).not.toBeNull();
      expect(result2?.contents).toContain('C++は汎用プログラミング言語である。');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should prefer extracted technical term over shorter token for Wikipedia lookup (e.g., C -> C++)', async () => {
      const text = 'C++';
      const tokens = [
        createToken('C', 0, 1, '名詞', 'C', 'C'),
        createToken('++', 1, 3, '記号', '++', '++')
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'C++サマリー'
        })
      });
      mockWikipediaClient.setFetch(mockFetch);

      const result = await provider.provideHover(tokens, 0, text);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('C%2B%2B'),
        expect.any(Object)
      );
      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**用語**: C++');
      expect(result?.range).toEqual({ start: 0, end: 3 });
    });

    it('should prefer longest glossary phrase match around position', async () => {
      provider.setWikipediaEnabled(false);

      const text = 'GitHub Actions';
      const tokens = [
        createToken('GitHub', 0, 6, '名詞', 'GitHub', 'GitHub')
      ];

      const result = await provider.provideHover(tokens, 1, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**Git用語図鑑**');
      expect(result?.contents).toContain('GitHubに組み込まれたCI/CD基盤');
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
      expect(result?.contents).toContain('**Git用語図鑑**');
      expect(result?.range).toEqual({ start: 0, end: text.length });
    });

    it('should match mixed-script glossary term from document text (e.g., VPCエンドポイント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'VPCエンドポイント';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 2;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**クラウド用語図鑑**');
      expect(result?.contents).toContain('プライベートに接続');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should match mixed provider glossary term from document text (e.g., OCIコンパートメント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'OCIコンパートメント';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 5;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**OCIサービス用語図鑑**');
      expect(result?.contents).toContain('OCIリソースを論理的にグループ化');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should keep generic glossary terms in their current category (e.g., ビュー)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'ビュー';
      const text = `${term}を切り替える`;
      const offset = text.indexOf(term) + 1;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**DB・SQL・トランザクション用語図鑑**');
      expect(result?.contents).toContain('SQLで定義した仮想的な表');
      expect(result?.contents).not.toContain('Cloudflareの用語');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should prefer longer cloud provider term over shorter generic suffix (e.g., OCIコンパートメント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'OCIコンパートメント';
      const text = `${term}を作成する`;
      const offset = text.indexOf('コンパートメント') + 3;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**OCIサービス用語図鑑**');
      expect(result?.contents).toContain('アクセス制御・コスト管理');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should match generic cloud term from document text (e.g., コンパートメント)', async () => {
      provider.setWikipediaEnabled(false);

      const term = 'コンパートメント';
      const text = `${term}を作成する`;
      const offset = text.indexOf(term) + 3;

      const result = await provider.provideHover([], offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**クラウド用語図鑑**');
      expect(result?.contents).toContain('資源を論理的に分けて管理');
      expect(result?.range).toEqual({ start: text.indexOf(term), end: text.indexOf(term) + term.length });
    });

    it('should return glossary-only hover when no token is available at position', async () => {
      provider.setWikipediaEnabled(false);

      const text = 'xxx otakLsp.hover.enableGlossary yyy';
      const offset = text.indexOf('otakLsp.hover.enableGlossary') + 5;
      const tokens = [
        createToken('dummy', 0, 5, '名詞', 'dummy', 'dummy')
      ];

      const result = await provider.provideHover(tokens, offset, text);

      expect(result).not.toBeNull();
      expect(result?.contents).toContain('**otak-lsp設定用語図鑑**');
      expect(result?.contents).toContain('ホバーに用語図鑑（オフライン）を表示する設定');
      expect(result?.range.start).toBe(text.indexOf('otakLsp.hover.enableGlossary'));
      expect(result?.range.end).toBe(text.indexOf('otakLsp.hover.enableGlossary') + 'otakLsp.hover.enableGlossary'.length);
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

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

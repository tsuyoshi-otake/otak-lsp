/**
 * Wikipedia API Client Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 5.4, 5.5
 */

import { WikipediaClient } from './client';

describe('Wikipedia API Client', () => {
  let client: WikipediaClient;

  beforeEach(() => {
    client = new WikipediaClient();
  });

  afterEach(() => {
    client.clearCache();
  });

  describe('getSummary', () => {
    it('should return null for empty term', async () => {
      const result = await client.getSummary('');
      expect(result).toBeNull();
    });

    it('should return null for whitespace only term', async () => {
      const result = await client.getSummary('   ');
      expect(result).toBeNull();
    });

    it('should fetch summary from Wikipedia API for valid term', async () => {
      // モックを使用してネットワークリクエストをシミュレート
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'テスト記事のサマリーです。'
        })
      });
      client.setFetch(mockFetch);

      const result = await client.getSummary('テスト');
      expect(result).toBe('テスト記事のサマリーです。');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should return null when article not found', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          type: 'https://mediawiki.org/wiki/HyperSwitch/errors/not_found'
        })
      });
      client.setFetch(mockFetch);

      const result = await client.getSummary('存在しない記事xyz123');
      expect(result).toBeNull();
    });

    it('should return null when API returns error status', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404
      });
      client.setFetch(mockFetch);

      const result = await client.getSummary('テスト');
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'));
      client.setFetch(mockFetch);

      const result = await client.getSummary('テスト');
      expect(result).toBeNull();
    });

    it('should return null on timeout', async () => {
      const mockFetch = jest.fn().mockImplementation(() =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      client.setFetch(mockFetch);
      client.setTimeout(50); // 50msタイムアウト

      const result = await client.getSummary('テスト');
      expect(result).toBeNull();
    });
  });

  describe('caching', () => {
    it('should cache successful results', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'キャッシュテスト'
        })
      });
      client.setFetch(mockFetch);

      // 1回目のリクエスト
      const result1 = await client.getSummary('テスト');
      expect(result1).toBe('キャッシュテスト');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 2回目のリクエスト（キャッシュから取得）
      const result2 = await client.getSummary('テスト');
      expect(result2).toBe('キャッシュテスト');
      expect(mockFetch).toHaveBeenCalledTimes(1); // 増えていない
    });

    it('should not cache failed results', async () => {
      const mockFetch = jest.fn()
        .mockRejectedValueOnce(new Error('First request failed'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            extract: '成功したサマリー'
          })
        });
      client.setFetch(mockFetch);

      // 1回目のリクエスト（失敗）
      const result1 = await client.getSummary('テスト');
      expect(result1).toBeNull();

      // 2回目のリクエスト（成功）
      const result2 = await client.getSummary('テスト');
      expect(result2).toBe('成功したサマリー');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should respect cache TTL', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            extract: '古いサマリー'
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            extract: '新しいサマリー'
          })
        });
      client.setFetch(mockFetch);
      client.setCacheTTL(100); // 100msのTTL

      // 1回目のリクエスト
      const result1 = await client.getSummary('テスト');
      expect(result1).toBe('古いサマリー');

      // TTL期限前
      const result2 = await client.getSummary('テスト');
      expect(result2).toBe('古いサマリー');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // TTL期限後
      await new Promise(resolve => setTimeout(resolve, 150));
      const result3 = await client.getSummary('テスト');
      expect(result3).toBe('新しいサマリー');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should limit cache size', async () => {
      const mockFetch = jest.fn().mockImplementation((url: string) => {
        const term = decodeURIComponent(url.split('/').pop() || '');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            extract: `サマリー for ${term}`
          })
        });
      });
      client.setFetch(mockFetch);
      client.setMaxCacheSize(3);

      // 4つの異なるクエリ
      await client.getSummary('term1');
      await client.getSummary('term2');
      await client.getSummary('term3');
      await client.getSummary('term4');

      // 最初のterm1はキャッシュから削除されているはず
      mockFetch.mockClear();
      await client.getSummary('term1');
      expect(mockFetch).toHaveBeenCalledTimes(1); // 再度取得が必要

      // term4はまだキャッシュにある
      mockFetch.mockClear();
      await client.getSummary('term4');
      expect(mockFetch).toHaveBeenCalledTimes(0); // キャッシュから取得
    });

    it('should clear cache', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          extract: 'テストサマリー'
        })
      });
      client.setFetch(mockFetch);

      await client.getSummary('テスト');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      client.clearCache();

      await client.getSummary('テスト');
      expect(mockFetch).toHaveBeenCalledTimes(2); // キャッシュクリア後は再取得
    });
  });

  describe('URL construction', () => {
    it('should construct correct Wikipedia API URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ extract: 'test' })
      });
      client.setFetch(mockFetch);

      await client.getSummary('日本語');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://ja.wikipedia.org/api/rest_v1/page/summary/%E6%97%A5%E6%9C%AC%E8%AA%9E',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'User-Agent': expect.any(String)
          })
        })
      );
    });
  });

  describe('rate limiting', () => {
    it('should handle rate limit response gracefully', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: () => '60' // Retry-After header
        }
      });
      client.setFetch(mockFetch);

      const result = await client.getSummary('テスト');
      expect(result).toBeNull();
    });
  });
});

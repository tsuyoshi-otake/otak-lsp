/**
 * Language Server Unit Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 1.4, 7.1, 7.3
 */

import { LanguageServer, AnalysisCache } from './languageServer';

describe('Language Server', () => {
  describe('AnalysisCache', () => {
    let cache: AnalysisCache;

    beforeEach(() => {
      cache = new AnalysisCache(3); // 最大3エントリ
    });

    it('should store and retrieve analysis results', () => {
      const analysis = {
        uri: 'file:///test.md',
        version: 1,
        tokens: [],
        timestamp: Date.now()
      };

      cache.set('file:///test.md', analysis);
      const result = cache.get('file:///test.md');

      expect(result).toEqual(analysis);
    });

    it('should return undefined for non-existent entry', () => {
      const result = cache.get('file:///nonexistent.md');
      expect(result).toBeUndefined();
    });

    it('should update existing entry', () => {
      const analysis1 = {
        uri: 'file:///test.md',
        version: 1,
        tokens: [],
        timestamp: Date.now()
      };
      const analysis2 = {
        uri: 'file:///test.md',
        version: 2,
        tokens: [],
        timestamp: Date.now()
      };

      cache.set('file:///test.md', analysis1);
      cache.set('file:///test.md', analysis2);

      const result = cache.get('file:///test.md');
      expect(result?.version).toBe(2);
    });

    it('should evict oldest entry when max size reached', () => {
      cache.set('file:///a.md', { uri: 'file:///a.md', version: 1, tokens: [], timestamp: 1 });
      cache.set('file:///b.md', { uri: 'file:///b.md', version: 1, tokens: [], timestamp: 2 });
      cache.set('file:///c.md', { uri: 'file:///c.md', version: 1, tokens: [], timestamp: 3 });
      cache.set('file:///d.md', { uri: 'file:///d.md', version: 1, tokens: [], timestamp: 4 });

      // 最初のエントリは削除されているはず
      expect(cache.get('file:///a.md')).toBeUndefined();
      expect(cache.get('file:///b.md')).toBeDefined();
      expect(cache.get('file:///c.md')).toBeDefined();
      expect(cache.get('file:///d.md')).toBeDefined();
    });

    it('should update LRU order on get', () => {
      cache.set('file:///a.md', { uri: 'file:///a.md', version: 1, tokens: [], timestamp: 1 });
      cache.set('file:///b.md', { uri: 'file:///b.md', version: 1, tokens: [], timestamp: 2 });
      cache.set('file:///c.md', { uri: 'file:///c.md', version: 1, tokens: [], timestamp: 3 });

      // aにアクセスしてLRU順序を更新
      cache.get('file:///a.md');

      // 新しいエントリを追加（bが削除されるはず）
      cache.set('file:///d.md', { uri: 'file:///d.md', version: 1, tokens: [], timestamp: 4 });

      expect(cache.get('file:///a.md')).toBeDefined();
      expect(cache.get('file:///b.md')).toBeUndefined();
      expect(cache.get('file:///c.md')).toBeDefined();
      expect(cache.get('file:///d.md')).toBeDefined();
    });

    it('should delete specific entry', () => {
      cache.set('file:///test.md', { uri: 'file:///test.md', version: 1, tokens: [], timestamp: 1 });
      cache.delete('file:///test.md');

      expect(cache.get('file:///test.md')).toBeUndefined();
    });

    it('should clear all entries', () => {
      cache.set('file:///a.md', { uri: 'file:///a.md', version: 1, tokens: [], timestamp: 1 });
      cache.set('file:///b.md', { uri: 'file:///b.md', version: 1, tokens: [], timestamp: 2 });

      cache.clear();

      expect(cache.get('file:///a.md')).toBeUndefined();
      expect(cache.get('file:///b.md')).toBeUndefined();
    });

    it('should check if entry is stale', () => {
      cache.set('file:///test.md', { uri: 'file:///test.md', version: 1, tokens: [], timestamp: 1 });

      expect(cache.isStale('file:///test.md', 2)).toBe(true);
      expect(cache.isStale('file:///test.md', 1)).toBe(false);
      expect(cache.isStale('file:///nonexistent.md', 1)).toBe(true);
    });
  });

  describe('Debounce', () => {
    let server: LanguageServer;

    beforeEach(() => {
      server = new LanguageServer();
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce multiple rapid calls', () => {
      const callback = jest.fn();
      const debouncedCallback = server.createDebouncedCallback(callback, 500);

      // 複数回呼び出し
      debouncedCallback('call1');
      debouncedCallback('call2');
      debouncedCallback('call3');

      // タイマーが発火する前は呼び出されない
      expect(callback).not.toHaveBeenCalled();

      // 500ms後に最後の呼び出しのみ実行される
      jest.advanceTimersByTime(500);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call3');
    });

    it('should reset timer on each call', () => {
      const callback = jest.fn();
      const debouncedCallback = server.createDebouncedCallback(callback, 500);

      debouncedCallback('call1');
      jest.advanceTimersByTime(300);

      debouncedCallback('call2');
      jest.advanceTimersByTime(300);

      // まだ呼び出されていない（リセットされた）
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(200);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith('call2');
    });

    it('should allow immediate call after debounce completes', () => {
      const callback = jest.fn();
      const debouncedCallback = server.createDebouncedCallback(callback, 500);

      debouncedCallback('call1');
      jest.advanceTimersByTime(500);

      debouncedCallback('call2');
      jest.advanceTimersByTime(500);

      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe('Document Management', () => {
    let server: LanguageServer;

    beforeEach(() => {
      server = new LanguageServer();
    });

    it('should track open documents', () => {
      server.openDocument('file:///test.md', 'テスト', 1);

      expect(server.isDocumentOpen('file:///test.md')).toBe(true);
      expect(server.isDocumentOpen('file:///other.md')).toBe(false);
    });

    it('should remove document on close', () => {
      server.openDocument('file:///test.md', 'テスト', 1);
      server.closeDocument('file:///test.md');

      expect(server.isDocumentOpen('file:///test.md')).toBe(false);
    });

    it('should update document content', () => {
      server.openDocument('file:///test.md', 'テスト', 1);
      server.updateDocument('file:///test.md', '更新後', 2);

      const doc = server.getDocument('file:///test.md');
      expect(doc?.text).toBe('更新後');
      expect(doc?.version).toBe(2);
    });

    it('should return null for closed document', () => {
      const doc = server.getDocument('file:///nonexistent.md');
      expect(doc).toBeNull();
    });
  });

  describe('Configuration', () => {
    let server: LanguageServer;

    beforeEach(() => {
      server = new LanguageServer();
    });

    it('should have default configuration', () => {
      const config = server.getConfiguration();

      expect(config.enableGrammarCheck).toBe(true);
      expect(config.enableSemanticHighlight).toBe(true);
      expect(config.debounceDelay).toBe(500);
    });

    it('should update configuration', () => {
      server.updateConfiguration({
        enableGrammarCheck: false,
        debounceDelay: 1000
      });

      const config = server.getConfiguration();
      expect(config.enableGrammarCheck).toBe(false);
      expect(config.debounceDelay).toBe(1000);
    });
  });
});

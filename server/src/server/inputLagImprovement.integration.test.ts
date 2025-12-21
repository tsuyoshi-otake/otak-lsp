/**
 * 入力ラグ改善機能の統合テスト
 * Feature: input-lag-improvement
 * 要件: 5.1, 5.2, 6.2
 *
 * このテストファイルは以下を検証する:
 * - 大きなMarkdownファイルでの高速入力シミュレーション
 * - 文法チェック・セマンティックハイライトのON/OFF動作確認
 * - 複数文書同時編集での動作確認
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  AnalysisState,
  AnalysisStateManager,
  createInitialAnalysisState,
  AnalysisCache,
  LanguageServer,
} from './languageServer';

jest.setTimeout(30000);

describe('Input Lag Improvement Integration Tests', () => {
  describe('解析状態管理の基本動作', () => {
    let stateManager: AnalysisStateManager;

    beforeEach(() => {
      stateManager = new AnalysisStateManager();
    });

    afterEach(() => {
      stateManager.clear();
    });

    it('初期状態が正しく作成されること', () => {
      const state = stateManager.getState('file:///test.md');

      expect(state.running).toBe(false);
      expect(state.pending).toBe(false);
      expect(state.latestDocument).toBeNull();
      expect(state.latestVersion).toBe(0);
      expect(state.lastChangeAt).toBe(0);
    });

    it('状態更新が正しく反映されること', () => {
      const uri = 'file:///test.md';
      const doc = TextDocument.create(uri, 'markdown', 1, 'テスト');

      stateManager.updateState(uri, {
        running: true,
        latestDocument: doc,
        latestVersion: 1,
        lastChangeAt: Date.now(),
      });

      const state = stateManager.getState(uri);
      expect(state.running).toBe(true);
      expect(state.latestDocument).toBe(doc);
      expect(state.latestVersion).toBe(1);
    });

    it('文書クローズ時に状態が削除されること（要件3.2）', () => {
      const uri = 'file:///test.md';
      stateManager.updateState(uri, { running: true });

      expect(stateManager.hasState(uri)).toBe(true);

      stateManager.deleteState(uri);

      // 削除後は新しい初期状態が返される
      const state = stateManager.getState(uri);
      expect(state.running).toBe(false);
    });
  });

  describe('大きなMarkdownファイルでの高速入力シミュレーション', () => {
    let stateManager: AnalysisStateManager;

    beforeEach(() => {
      stateManager = new AnalysisStateManager();
    });

    afterEach(() => {
      stateManager.clear();
    });

    it('連続した変更要求が正しく待機状態に設定されること（要件1.1）', () => {
      const uri = 'file:///large-document.md';

      // 解析実行中に設定
      stateManager.updateState(uri, { running: true });

      // 連続した変更をシミュレート
      for (let i = 1; i <= 10; i++) {
        const doc = TextDocument.create(uri, 'markdown', i, `変更${i}`);
        stateManager.updateState(uri, {
          pending: true,
          latestDocument: doc,
          latestVersion: i,
          lastChangeAt: Date.now(),
        });
      }

      const state = stateManager.getState(uri);

      // 最新の変更のみが保持されている
      expect(state.pending).toBe(true);
      expect(state.latestVersion).toBe(10);
      expect(state.latestDocument?.getText()).toBe('変更10');
    });

    it('解析完了後に待機中の要求が処理されること（要件1.2）', async () => {
      const uri = 'file:///large-document.md';

      // 解析実行中に設定
      stateManager.updateState(uri, { running: true });

      // 待機中の要求を追加
      const doc = TextDocument.create(uri, 'markdown', 5, '待機中の内容');
      stateManager.updateState(uri, {
        pending: true,
        latestDocument: doc,
        latestVersion: 5,
        lastChangeAt: Date.now(),
      });

      // 解析完了をシミュレート
      stateManager.updateState(uri, { running: false });

      const state = stateManager.getState(uri);

      // 待機中の要求が残っている
      expect(state.running).toBe(false);
      expect(state.pending).toBe(true);
      expect(state.latestVersion).toBe(5);
    });

    it('大きな文書での状態管理が正しく動作すること', () => {
      const uri = 'file:///very-large-document.md';

      // 大きな文書を生成（約10KB）
      const lines: string[] = [];
      for (let i = 0; i < 200; i++) {
        lines.push(`## セクション${i}`);
        lines.push('');
        lines.push('これは日本語のテキストです。文法チェックの対象になります。');
        lines.push('');
        lines.push('```javascript');
        lines.push(`console.log("Section ${i}");`);
        lines.push('```');
        lines.push('');
      }
      const largeContent = lines.join('\n');

      const doc = TextDocument.create(uri, 'markdown', 1, largeContent);

      stateManager.updateState(uri, {
        latestDocument: doc,
        latestVersion: 1,
        lastChangeAt: Date.now(),
      });

      const state = stateManager.getState(uri);
      expect(state.latestDocument?.getText().length).toBeGreaterThan(10000);
    });
  });

  describe('文法チェック・セマンティックハイライトのON/OFF動作確認', () => {
    let server: LanguageServer;

    beforeEach(() => {
      server = new LanguageServer();
    });

    it('文法チェック有効時に設定が正しく反映されること（要件5.1）', () => {
      server.updateConfiguration({ enableGrammarCheck: true });
      const config = server.getConfiguration();

      expect(config.enableGrammarCheck).toBe(true);
    });

    it('文法チェック無効時に設定が正しく反映されること', () => {
      server.updateConfiguration({ enableGrammarCheck: false });
      const config = server.getConfiguration();

      expect(config.enableGrammarCheck).toBe(false);
    });

    it('セマンティックハイライト有効時に設定が正しく反映されること（要件5.2）', () => {
      server.updateConfiguration({ enableSemanticHighlight: true });
      const config = server.getConfiguration();

      expect(config.enableSemanticHighlight).toBe(true);
    });

    it('セマンティックハイライト無効時に設定が正しく反映されること', () => {
      server.updateConfiguration({ enableSemanticHighlight: false });
      const config = server.getConfiguration();

      expect(config.enableSemanticHighlight).toBe(false);
    });

    it('両方の設定を同時に変更できること', () => {
      server.updateConfiguration({
        enableGrammarCheck: false,
        enableSemanticHighlight: false,
      });
      let config = server.getConfiguration();

      expect(config.enableGrammarCheck).toBe(false);
      expect(config.enableSemanticHighlight).toBe(false);

      server.updateConfiguration({
        enableGrammarCheck: true,
        enableSemanticHighlight: true,
      });
      config = server.getConfiguration();

      expect(config.enableGrammarCheck).toBe(true);
      expect(config.enableSemanticHighlight).toBe(true);
    });

    it('設定変更後も他の設定が維持されること（要件5.3）', () => {
      const originalConfig = server.getConfiguration();
      const originalDebounceDelay = originalConfig.debounceDelay;

      server.updateConfiguration({ enableGrammarCheck: false });
      const config = server.getConfiguration();

      expect(config.debounceDelay).toBe(originalDebounceDelay);
    });
  });

  describe('複数文書同時編集での動作確認', () => {
    let stateManager: AnalysisStateManager;

    beforeEach(() => {
      stateManager = new AnalysisStateManager();
    });

    afterEach(() => {
      stateManager.clear();
    });

    it('複数文書の状態が独立して管理されること', () => {
      const uri1 = 'file:///doc1.md';
      const uri2 = 'file:///doc2.md';
      const uri3 = 'file:///doc3.md';

      // 各文書に異なる状態を設定
      stateManager.updateState(uri1, { running: true, latestVersion: 1 });
      stateManager.updateState(uri2, { pending: true, latestVersion: 2 });
      stateManager.updateState(uri3, { running: false, pending: false, latestVersion: 3 });

      // 各文書の状態が独立していることを確認
      const state1 = stateManager.getState(uri1);
      const state2 = stateManager.getState(uri2);
      const state3 = stateManager.getState(uri3);

      expect(state1.running).toBe(true);
      expect(state1.latestVersion).toBe(1);

      expect(state2.pending).toBe(true);
      expect(state2.latestVersion).toBe(2);

      expect(state3.running).toBe(false);
      expect(state3.pending).toBe(false);
      expect(state3.latestVersion).toBe(3);
    });

    it('一つの文書を閉じても他の文書の状態に影響しないこと', () => {
      const uri1 = 'file:///doc1.md';
      const uri2 = 'file:///doc2.md';

      stateManager.updateState(uri1, { running: true, latestVersion: 1 });
      stateManager.updateState(uri2, { running: true, latestVersion: 2 });

      // doc1を閉じる
      stateManager.deleteState(uri1);

      // doc2の状態は維持されている
      const state2 = stateManager.getState(uri2);
      expect(state2.running).toBe(true);
      expect(state2.latestVersion).toBe(2);
    });

    it('複数文書で同時に解析が実行中でも正しく管理されること', () => {
      const uris = [
        'file:///doc1.md',
        'file:///doc2.md',
        'file:///doc3.md',
        'file:///doc4.md',
        'file:///doc5.md',
      ];

      // すべての文書で解析を開始
      uris.forEach((uri, index) => {
        stateManager.updateState(uri, {
          running: true,
          latestVersion: index + 1,
          lastChangeAt: Date.now(),
        });
      });

      // すべての文書が実行中であることを確認
      uris.forEach((uri, index) => {
        const state = stateManager.getState(uri);
        expect(state.running).toBe(true);
        expect(state.latestVersion).toBe(index + 1);
      });

      // 管理中の状態数を確認
      expect(stateManager.size()).toBe(5);
    });

    it('複数文書で待機中の要求が正しく管理されること', () => {
      const uri1 = 'file:///doc1.md';
      const uri2 = 'file:///doc2.md';

      // doc1: 解析中、待機なし
      stateManager.updateState(uri1, { running: true, pending: false });

      // doc2: 解析中、待機あり
      stateManager.updateState(uri2, { running: true, pending: true });

      const state1 = stateManager.getState(uri1);
      const state2 = stateManager.getState(uri2);

      expect(state1.pending).toBe(false);
      expect(state2.pending).toBe(true);
    });
  });

  describe('解析キャッシュの動作確認', () => {
    let cache: AnalysisCache;

    beforeEach(() => {
      cache = new AnalysisCache(5);
    });

    it('キャッシュが正しく保存・取得できること', () => {
      const uri = 'file:///test.md';
      const result = {
        uri,
        version: 1,
        tokens: [],
        timestamp: Date.now(),
      };

      cache.set(uri, result);
      const cached = cache.get(uri);

      expect(cached).toBeDefined();
      expect(cached?.version).toBe(1);
    });

    it('古いキャッシュが正しく判定されること', () => {
      const uri = 'file:///test.md';
      const result = {
        uri,
        version: 1,
        tokens: [],
        timestamp: Date.now(),
      };

      cache.set(uri, result);

      // バージョン1のキャッシュに対してバージョン2は古い
      expect(cache.isStale(uri, 2)).toBe(true);

      // バージョン1のキャッシュに対してバージョン1は最新
      expect(cache.isStale(uri, 1)).toBe(false);
    });

    it('LRUキャッシュが正しく動作すること', () => {
      // 最大5件のキャッシュ
      for (let i = 1; i <= 6; i++) {
        cache.set(`file:///doc${i}.md`, {
          uri: `file:///doc${i}.md`,
          version: i,
          tokens: [],
          timestamp: Date.now(),
        });
      }

      // 最初のエントリーは削除されている
      expect(cache.get('file:///doc1.md')).toBeUndefined();

      // 最新のエントリーは残っている
      expect(cache.get('file:///doc6.md')).toBeDefined();
    });

    it('文書クローズ時にキャッシュが削除されること', () => {
      const uri = 'file:///test.md';
      cache.set(uri, {
        uri,
        version: 1,
        tokens: [],
        timestamp: Date.now(),
      });

      expect(cache.get(uri)).toBeDefined();

      cache.delete(uri);

      expect(cache.get(uri)).toBeUndefined();
    });
  });

  describe('デバウンス動作の確認', () => {
    let server: LanguageServer;

    beforeEach(() => {
      server = new LanguageServer();
    });

    it('デバウンス遅延が設定から取得できること', () => {
      const config = server.getConfiguration();
      expect(config.debounceDelay).toBeDefined();
      expect(typeof config.debounceDelay).toBe('number');
    });

    it('デバウンス遅延を変更できること', () => {
      server.updateConfiguration({ debounceDelay: 500 });
      const config = server.getConfiguration();

      expect(config.debounceDelay).toBe(500);
    });

    it('デバウンスコールバックが作成できること', () => {
      let callCount = 0;
      const callback = server.createDebouncedCallback(() => {
        callCount++;
      }, 100);

      expect(typeof callback).toBe('function');
    });
  });

  describe('最終一貫性の確認（要件6.2, 6.3）', () => {
    let stateManager: AnalysisStateManager;

    beforeEach(() => {
      stateManager = new AnalysisStateManager();
    });

    afterEach(() => {
      stateManager.clear();
    });

    it('連続編集後に最新バージョンが保持されること', () => {
      const uri = 'file:///test.md';

      // 連続した編集をシミュレート
      for (let i = 1; i <= 100; i++) {
        stateManager.updateState(uri, {
          latestVersion: i,
          lastChangeAt: Date.now(),
        });
      }

      const state = stateManager.getState(uri);
      expect(state.latestVersion).toBe(100);
    });

    it('解析完了後に正しいバージョンが反映されること', () => {
      const uri = 'file:///test.md';

      // 解析開始
      stateManager.updateState(uri, {
        running: true,
        latestVersion: 1,
      });

      // 解析中に新しい変更
      stateManager.updateState(uri, {
        pending: true,
        latestVersion: 2,
      });

      // 解析完了
      stateManager.updateState(uri, { running: false });

      const state = stateManager.getState(uri);

      // 最新バージョンが保持されている
      expect(state.latestVersion).toBe(2);
      // 待機中の要求が残っている
      expect(state.pending).toBe(true);
    });
  });
});

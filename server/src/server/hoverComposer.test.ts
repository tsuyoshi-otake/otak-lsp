/**
 * HoverComposer の解析範囲ゲートのテスト
 * Issue #14: OFF / 対象外言語 / 解析範囲外（コメント外・除外範囲内）では
 *            ホバーを表示せず、Wikipedia へのネットワーク問い合わせも起きない。
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { TextDocuments } from 'vscode-languageserver/node';
import { composeHoverResponse, HoverComposerDeps } from './hoverComposer';
import { DocumentCacheStore } from './documentCacheStore';
import { HoverProvider } from '../hover/provider';
import { WikipediaClient } from '../wikipedia/client';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import { Token } from '../../../shared/src/types';
import { Configuration } from '../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

const URI = 'file:///doc.md';

function makeToken(start: number, end: number): Token {
  return new Token({
    surface: '東京', pos: '名詞', posDetail1: '固有名詞', posDetail2: '*', posDetail3: '*',
    conjugation: '*', conjugationForm: '*', baseForm: '東京',
    reading: 'トウキョウ', pronunciation: 'トウキョウ', start, end,
  });
}

function makeConfig(overrides: Partial<Configuration> = {}): Configuration {
  return {
    enableGrammarCheck: true,
    enableSemanticHighlight: true,
    targetLanguages: ['markdown', 'plaintext', 'typescript'],
    debounceDelay: 250,
    maxNumberOfProblems: 2000,
    maxDocumentChars: 1_000_000,
    maxConcurrentAnalyses: 4,
    enableProfileLogs: false,
    excludeTableDelimiters: false,
    hover: { enabled: true, wikipedia: true, glossaries: true, enabledGlossaries: [], glossariesExplicitlySet: false },
    markdown: { analyzeCodeBlocks: false, analyzeTables: false },
    ...overrides,
  } as Configuration;
}

interface Setup {
  deps: HoverComposerDeps;
  fetchCount: () => number;
  provideHover: jest.SpyInstance;
}

function setup(options: {
  text: string;
  languageId: string;
  config?: Configuration;
  tokens?: Token[];
  excludedRanges?: { start: number; end: number; type: string }[];
  includedRanges?: { start: number; end: number }[];
  withEntry?: boolean;
}): Setup {
  const document = TextDocument.create(URI, options.languageId, 1, options.text);
  const documents = new TextDocuments(TextDocument);
  // TextDocuments の内部マップへ直接登録する代わりに documents.get をスタブする
  (documents as unknown as { get: (u: string) => TextDocument | undefined }).get = (u) =>
    u === URI ? document : undefined;

  const cacheStore = new DocumentCacheStore();
  if (options.withEntry !== false) {
    cacheStore.setAnalysisResult(
      URI,
      options.tokens ?? [],
      options.text,
      (options.excludedRanges ?? []) as never,
      [0],
      options.includedRanges
    );
  }

  // 実 HoverProvider + 実 WikipediaClient に、ネットワークを数える fake fetch を注入
  const wikipedia = new WikipediaClient();
  let fetchCount = 0;
  wikipedia.setFetch(() => {
    fetchCount += 1;
    return Promise.reject(new Error('network should not be reached'));
  });
  const hoverProvider = new HoverProvider(wikipedia);
  const provideHover = jest.spyOn(hoverProvider, 'provideHover');

  const config = options.config ?? makeConfig();
  const deps: HoverComposerDeps = {
    documents,
    cacheStore,
    hoverProvider,
    sentenceComplexityRule: new SentenceComplexityRule(),
    getAdvancedConfig: () => DEFAULT_ADVANCED_RULES_CONFIG,
    getConfig: () => config,
  };
  return { deps, fetchCount: () => fetchCount, provideHover };
}

const paramsAt = (line: number, character: number) => ({
  textDocument: { uri: URI },
  position: { line, character },
});

describe('Issue #14: ホバーの解析範囲ゲート', () => {
  it('文法・セマンティック両方 OFF の文書では表示もネットワークも起きない', async () => {
    const s = setup({
      text: '東京タワー',
      languageId: 'markdown',
      config: makeConfig({ enableGrammarCheck: false, enableSemanticHighlight: false }),
      tokens: [makeToken(0, 2)],
    });
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('対象外言語の文書では表示もネットワークも起きない', async () => {
    const s = setup({
      text: '東京タワー',
      languageId: 'rust',
      config: makeConfig({ targetLanguages: ['markdown'] }),
      tokens: [makeToken(0, 2)],
    });
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('除外範囲（コードブロック）内の位置では表示もネットワークも起きない', async () => {
    const s = setup({
      text: '```\n東京\n```',
      languageId: 'markdown',
      excludedRanges: [{ start: 0, end: 9, type: 'code-block' }],
      tokens: [makeToken(4, 6)],
    });
    // offset 5 はコードブロック内（「京」の位置）
    const result = await composeHoverResponse(
      { textDocument: { uri: URI }, position: { line: 1, character: 1 } },
      s.deps
    );
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('コード言語のコメント範囲外（includedRanges 外）では表示もネットワークも起きない', async () => {
    const s = setup({
      text: 'const x = 東京; // コメント内東京',
      languageId: 'typescript',
      includedRanges: [{ start: 16, end: 26 }],
      tokens: [makeToken(10, 12)],
    });
    // offset 11 はコメント外（コード部）の「京」
    const result = await composeHoverResponse(
      { textDocument: { uri: URI }, position: { line: 0, character: 11 } },
      s.deps
    );
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('未解析（キャッシュなし）の文書ではホバーを出さない', async () => {
    const s = setup({
      text: '東京タワー',
      languageId: 'markdown',
      withEntry: false,
    });
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('解析スキップで空トークンが保存されても外部検索しない', async () => {
    const s = setup({ text: '東京タワー', languageId: 'markdown', tokens: [] });
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('編集後の本文と異なる解析キャッシュでは外部検索しない', async () => {
    const s = setup({ text: '東京タワー', languageId: 'markdown', tokens: [makeToken(0, 2)] });
    s.deps.cacheStore.setAnalysisResult(URI, [makeToken(0, 2)], '京都タワー', [], [0]);
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).toBeNull();
    expect(s.provideHover).not.toHaveBeenCalled();
    expect(s.fetchCount()).toBe(0);
  });

  it('解析済み範囲内ではホバーが実行される（正常系）', async () => {
    const s = setup({
      text: '東京タワー',
      languageId: 'markdown',
      tokens: [makeToken(0, 2)],
    });
    s.provideHover.mockResolvedValue({ contents: '東京: 名詞', range: { start: 0, end: 2 } });
    const result = await composeHoverResponse(paramsAt(0, 1), s.deps);
    expect(result).not.toBeNull();
    expect(s.provideHover).toHaveBeenCalled();
  });

  it('analyzeCodeBlocks=true なら除外範囲内でもホバーが実行される', async () => {
    const s = setup({
      text: '```\n東京\n```',
      languageId: 'markdown',
      config: makeConfig({ markdown: { analyzeCodeBlocks: true, analyzeTables: false } as Configuration['markdown'] }),
      excludedRanges: [{ start: 0, end: 9, type: 'code-block' }],
      tokens: [makeToken(4, 6)],
    });
    s.provideHover.mockResolvedValue({ contents: '東京: 名詞', range: { start: 4, end: 6 } });
    const result = await composeHoverResponse(
      { textDocument: { uri: URI }, position: { line: 1, character: 1 } },
      s.deps
    );
    expect(result).not.toBeNull();
    expect(s.provideHover).toHaveBeenCalled();
  });
});

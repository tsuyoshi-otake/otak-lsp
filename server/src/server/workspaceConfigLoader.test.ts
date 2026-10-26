import { Connection } from 'vscode-languageserver/node';
import { ResourceConfigurationStore, loadWorkspaceConfiguration } from './workspaceConfigLoader';
import { ConfigManager, resolveConfiguration } from './configManager';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { HoverProvider } from '../hover/provider';
import { WikipediaClient } from '../wikipedia/client';

const snapshot = resolveConfiguration({});
const base = {
  getConfig: () => snapshot.config,
  getAdvancedConfig: () => snapshot.advancedConfig,
  getSnapshot: () => snapshot,
} as ConfigManager;

describe('文書ごとの設定取得と分離', () => {
  it('全セクションを対象文書のscopeUri付きで取得する', async () => {
    const getConfiguration = jest.fn().mockResolvedValue({});
    await loadWorkspaceConfiguration({ workspace: { getConfiguration } } as unknown as Connection, undefined, 'file:///a.md');
    expect(getConfiguration.mock.calls.map(([request]) => request)).toEqual(
      ['otakLsp', 'otakLsp.advanced', 'otakLsp.official', 'otakLsp.proofreading'].map(section => ({ section, scopeUri: 'file:///a.md' }))
    );
  });

  it('同一文書の取得を集約し、異なる文書の設定を分離する', async () => {
    const getConfiguration = jest.fn(async ({ section, scopeUri }: { section: string; scopeUri: string }) => {
      if (section === 'otakLsp') return { enableGrammarCheck: scopeUri.endsWith('a.md') };
      if (section === 'otakLsp.advanced') return { sentenceSplitMode: scopeUri.endsWith('a.md') ? 'strict' : 'loose' };
      return {};
    });
    const store = new ResourceConfigurationStore({ workspace: { getConfiguration } } as unknown as Connection, base);
    await Promise.all([store.load('file:///a.md'), store.load('file:///a.md'), store.load('file:///b.md')]);
    expect(getConfiguration).toHaveBeenCalledTimes(8);
    expect(store.manager.getConfig('file:///a.md').enableGrammarCheck).toBe(true);
    expect(store.manager.getConfig('file:///b.md').enableGrammarCheck).toBe(false);
    expect(store.manager.getAdvancedConfig('file:///a.md').sentenceSplitMode).toBe('strict');
    expect(store.manager.getAdvancedConfig('file:///b.md').sentenceSplitMode).toBe('loose');
    expect(base.getConfig().enableGrammarCheck).toBe(true);
  });

  it.each(['forget', 'clear'] as const)('取得中に%sして開き直しても古い応答を適用しない', async operation => {
    let stale = true;
    const resolvers: Array<(value: unknown) => void> = [];
    const getConfiguration = jest.fn(() => stale
      ? new Promise(resolve => resolvers.push(resolve))
      : Promise.resolve({ enableGrammarCheck: false }));
    const store = new ResourceConfigurationStore({ workspace: { getConfiguration } } as unknown as Connection, base);
    const oldLoad = store.load('file:///a.md');
    await Promise.resolve();
    if (operation === 'forget') store.forget('file:///a.md');
    else store.clear();
    stale = false;
    await store.load('file:///a.md');
    resolvers.forEach(resolve => resolve({ enableGrammarCheck: true }));
    await expect(oldLoad).resolves.toBe(false);
    expect(store.manager.getConfig('file:///a.md').enableGrammarCheck).toBe(false);
  });

  it('取得失敗を文書ごとに保持し、同じ編集で通信を繰り返さない', async () => {
    const getConfiguration = jest.fn().mockRejectedValue(new Error('取得失敗'));
    const store = new ResourceConfigurationStore({ workspace: { getConfiguration } } as unknown as Connection, base);
    await store.load('file:///a.md');
    await store.load('file:///a.md');
    expect(getConfiguration).toHaveBeenCalledTimes(4);
    expect(store.manager.getConfig('file:///a.md')).toEqual(base.getConfig());
  });

  it('同じルールマネージャーで異なる設定の非同期解析を混在させない', async () => {
    const manager = new AdvancedRulesManager();
    const enabled = resolveConfiguration({ advanced: { enableLongSentence: true, longSentenceThreshold: 5 } }).advancedConfig;
    const disabled = { ...enabled, enableLongSentence: false };
    const original = manager.getConfig();
    const [a, b] = await Promise.all([
      manager.checkTextAsync('これは十分に長い文章です。', [], undefined, { config: enabled }),
      manager.checkTextAsync('これは十分に長い文章です。', [], undefined, { config: disabled }),
    ]);
    expect(a.some(diagnostic => diagnostic.code === 'long-sentence')).toBe(true);
    expect(b.some(diagnostic => diagnostic.code === 'long-sentence')).toBe(false);
    expect(manager.getConfig()).toEqual(original);
  });

  it('文書別のホバー設定が別の文書に漏れない', async () => {
    const wikipedia = new WikipediaClient();
    const prefetch = jest.spyOn(wikipedia, 'prefetchSummary').mockImplementation(() => undefined);
    const provider = new HoverProvider(wikipedia);
    const enabled = { ...snapshot.config.hover, enableWikipedia: true, enableGlossary: false, glossariesExplicitlySet: false };
    const disabled = { ...enabled, enableWikipedia: false };
    await provider.provideHover([], 1, 'Node.js', disabled);
    expect(prefetch).not.toHaveBeenCalled();
    await provider.provideHover([], 1, 'Node.js', enabled);
    expect(prefetch).toHaveBeenCalledTimes(1);
  });
});

import { Connection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { createDocumentAnalyzer } from './documentAnalyzer';
import { resolveConfiguration } from './configManager';
import { loadWorkspaceConfiguration } from './workspaceConfigLoader';

describe('Issue #7: 文書別校正設定と診断', () => {
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
    new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager(),
  );
  const text = `${'内容を確認します'.repeat(8)}。\n映画を見れる。`;
  const document = TextDocument.create('file:///issue7.txt', 'plaintext', 1, text);

  async function check(proofreading: Record<string, unknown>) {
    // LSPの設定応答だけを代替し、設定変換・形態素解析・診断は実装を通す。
    const getConfiguration = jest.fn(async ({ section }: { section: string }) =>
      section === 'otakLsp.proofreading' ? proofreading : {});
    const raw = await loadWorkspaceConfiguration(
      { workspace: { getConfiguration } } as unknown as Connection, undefined, document.uri,
    );
    const settings = resolveConfiguration(raw);
    const result = await analyzer.analyze(
      document, settings.config, settings.advancedConfig, false, undefined, undefined, settings.proofreadingConfig,
    );
    expect(result.status).toBe('completed');
    return { settings, codes: result.diagnostics.map(diagnostic => diagnostic.code) };
  }

  it('入れ子設定の変更と削除が長文とら抜きの診断に反映される', async () => {
    const configured = await check({ typo: { raNuki: false }, length: { sentence: 50 } });
    expect(configured.settings.advancedConfig.longSentenceThreshold).toBe(50);
    expect(configured.codes).toContain('long-sentence');
    expect(configured.codes).not.toContain('ra-nuki');

    const reset = await check({});
    expect(reset.settings.advancedConfig.longSentenceThreshold).toBe(120);
    expect(reset.codes).not.toContain('long-sentence');
    expect(reset.codes).toContain('ra-nuki');
  }, 20000);
});

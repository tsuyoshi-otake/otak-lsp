/**
 * Issue #26: 実際の言語別抽出・Markdownフィルターから抑制適用までを検証する。
 * includeRangesをfixtureで正解に設定せず、本番の境界をそのまま通す。
 */
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
import { buildCodeActions } from './codeActionProvider';
import { TextDocumentEdit, TextEdit } from 'vscode-languageserver/node';

describe('Issue #26: 言語抽出と診断抑制の接続', () => {
  const snapshot = resolveConfiguration({});
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(),
    new TokenFilter(), new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager()
  );
  const sentence = '私はは学校に行きます。';
  const cases: Array<{ name: string; language: string; text: string; codeBlocks: boolean; suppressed: boolean }> = [
    { name: '通常の文は検出される', language: 'markdown', text: sentence, codeBlocks: true, suppressed: false },
    { name: 'コードの文字列内の類似表記は後続の実コメントを抑制しない', language: 'typescript', text: `const example = "// otak-lsp-disable -- example";\n// ${sentence}`, codeBlocks: true, suppressed: false },
    { name: 'コメント内の説明にある設定名だけでは後続の診断を抑制しない', language: 'typescript', text: `// 説明で otak-lsp-disable -- という設定名を紹介します\n// ${sentence}`, codeBlocks: true, suppressed: false },
    { name: 'コード解析有効でもフェンス内サンプルは本文を抑制しない', language: 'markdown', text: `\`\`\`text\n<!-- otak-lsp-disable -->\n\`\`\`\n${sentence}`, codeBlocks: true, suppressed: false },
    { name: 'コード解析無効でもフェンス内サンプルは本文を抑制しない', language: 'markdown', text: `\`\`\`text\n<!-- otak-lsp-disable -->\n\`\`\`\n${sentence}`, codeBlocks: false, suppressed: false },
    { name: '本文の明示的なHTMLコメント指示は診断を抑制する', language: 'markdown', text: `<!-- otak-lsp-disable-next-line double-particle -->\n${sentence}`, codeBlocks: true, suppressed: true },
  ];

  it.each(cases)('$name', async ({ language, text, codeBlocks, suppressed }) => {
    const config = { ...snapshot.config, markdown: { ...snapshot.config.markdown, analyzeCodeBlocks: codeBlocks } };
    const result = await analyzer.analyze(
      TextDocument.create('file:///suppression-integration', language, 1, text),
      config, snapshot.advancedConfig, false, undefined, undefined, snapshot.proofreadingConfig
    );
    expect(result.status).toBe('completed');
    expect(result.diagnostics.some(diagnostic => diagnostic.code === 'double-particle')).toBe(!suppressed);
  }, 20000);

  it.each(['markdown', 'plaintext', 'typescript', 'python'])('%s: 抑制アクションを適用すると対象行だけが抑制される', async language => {
    const prefix = language === 'typescript' ? '// ' : language === 'python' ? '# ' : '';
    const document = TextDocument.create('file:///quickfix', language, 7, `${prefix}${sentence}\n${prefix}${sentence}`);
    const analyze = (target: TextDocument) => analyzer.analyze(
      target, snapshot.config, snapshot.advancedConfig, false,
      undefined, undefined, snapshot.proofreadingConfig
    );
    const before = await analyze(document);
    const target = before.diagnostics.find(d => d.code === 'double-particle' && d.range.start.line === 0);
    expect(target).toBeDefined();
    const action = buildCodeActions(document, [target!]).find(candidate => candidate.edit);
    const edit = action?.edit?.documentChanges?.[0];
    expect(TextDocumentEdit.is(edit)).toBe(true);
    if (!TextDocumentEdit.is(edit)) throw new Error('版付き文書編集が必要');
    expect(edit.textDocument).toEqual({ uri: document.uri, version: 7 });
    const changedText = TextDocument.applyEdits(document, edit.edits as TextEdit[]);
    const after = await analyze(TextDocument.create(document.uri, language, 8, changedText));
    expect(after.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([1]);
  }, 20000);
});

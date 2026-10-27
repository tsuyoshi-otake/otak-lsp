import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { SemanticTokenProvider, TokenType } from '../semantic/tokenProvider';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { HoverProvider } from '../hover/provider';
import { WikipediaClient } from '../wikipedia/client';
import { createDocumentAnalyzer } from './documentAnalyzer';
import { resolveConfiguration } from './configManager';

describe('Issue #6: 特殊文字の後の診断とホバー', () => {
  const settings = resolveConfiguration({});
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
    new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager(),
  );

  it.each(['😀', '𠮷', '😀😄', '\u0000'])('%sの後で診断とホバーが元文書の位置を指す', async prefix => {
    const text = `${prefix}私はは学校へ行きます。`;
    const result = await analyzer.analyze(
      TextDocument.create('file:///issue6.txt', 'plaintext', 1, text),
      settings.config, settings.advancedConfig, false, undefined, undefined, settings.proofreadingConfig,
    );
    expect(result.status).toBe('completed');
    expect(result.diagnostics.find(d => d.code === 'double-particle')?.range).toEqual({
      start: { line: 0, character: prefix.length + 1 },
      end: { line: 0, character: prefix.length + 3 },
    });

    const hover = new HoverProvider(new WikipediaClient());
    hover.setWikipediaEnabled(false);
    hover.setGlossaryEnabled(false);
    const start = text.indexOf('学校');
    const info = await hover.provideHover(result.tokens, start, text);
    expect(info?.range).toEqual({ start, end: start + 2 });
    expect(info?.contents).toContain('学校');

    const data = new SemanticTokenProvider().provideSemanticTokens(result.tokens, text).data;
    let character = 0;
    const rendered = [];
    for (let i = 0; i < data.length; i += 5) {
      expect(data[i]).toBe(0);
      character += data[i + 1];
      rendered.push({ start: character, length: data[i + 2], type: data[i + 3] });
    }
    expect(rendered).toContainEqual({ start, length: 2, type: TokenType.Noun });
  });
});

/**
 * Markdownコードブロック内解析（オプトイン）の統合テスト
 * Feature: markdown-code-block-grammar
 *
 * 既定ではMarkdownのコードブロック内容は除外されるが、
 * preserveCodeBlockContent を有効にした場合は文法チェック対象にできることを検証する。
 */

import { MarkdownFilter } from '../parser/markdownFilter';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { TokenFilter } from '../semantic/tokenFilter';
import { AdvancedRulesManager } from './advancedRulesManager';
import { Diagnostic } from '../../../shared/src/types';

jest.setTimeout(20000);

describe('Markdownコードブロック内の文法チェック（オプトイン）', () => {
  let mecabAnalyzer: MeCabAnalyzer;
  let markdownFilter: MarkdownFilter;
  let tokenFilter: TokenFilter;
  let advancedRulesManager: AdvancedRulesManager;

  beforeAll(async () => {
    mecabAnalyzer = new MeCabAnalyzer();
    markdownFilter = new MarkdownFilter();
    tokenFilter = new TokenFilter();
    advancedRulesManager = new AdvancedRulesManager();

    await mecabAnalyzer.isAvailable();
  });

  const analyze = async (markdown: string, preserveCodeBlockContent: boolean): Promise<Diagnostic[]> => {
    const filterResult = markdownFilter.filter(markdown, {
      ...markdownFilter.getConfig(),
      preserveCodeBlockContent,
    });

    const excludedRanges = filterResult.excludedRanges;
    const grammarExcludedRanges = preserveCodeBlockContent
      ? excludedRanges.filter((r) => r.type !== 'code-block')
      : excludedRanges;

    const allTokens = await mecabAnalyzer.analyze(filterResult.filteredText);
    const grammarTokens = tokenFilter.filterTokens(allTokens, grammarExcludedRanges);

    return advancedRulesManager.checkText(filterResult.filteredText, grammarTokens, excludedRanges);
  };

  it('既定ではコードブロック内の「ら抜き言葉」を検出しないこと', async () => {
    const markdown = `説明です。

\`\`\`
食べれる
\`\`\`
`;

    const diagnostics = await analyze(markdown, false);
    expect(diagnostics.some((d) => d.code === 'ra-nuki')).toBe(false);
  });

  it('preserveCodeBlockContent有効時はコードブロック内の「ら抜き言葉」を検出できること', async () => {
    const markdown = `説明です。

\`\`\`
食べれる
\`\`\`
`;

    const diagnostics = await analyze(markdown, true);
    expect(diagnostics.some((d) => d.code === 'ra-nuki')).toBe(true);
  });
});


/**
 * README に出てくる例文での回帰テスト
 *
 * 目的:
 * - READMEの例文を使って、特定ルールが確実に検出できることを担保する
 * - Markdownのコードブロック等（非本文）に起因する誤検出を抑止する
 */

import { MarkdownFilter } from '../parser/markdownFilter';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { TokenFilter } from '../semantic/tokenFilter';
import { AdvancedRulesManager } from './advancedRulesManager';
import { Diagnostic } from '../../../shared/src/types';
import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';

jest.setTimeout(60000);

describe('README Examples Integration', () => {
  let mecabAnalyzer: MeCabAnalyzer;
  let markdownFilter: MarkdownFilter;
  let tokenFilter: TokenFilter;

  beforeAll(async () => {
    mecabAnalyzer = new MeCabAnalyzer();
    markdownFilter = new MarkdownFilter();
    tokenFilter = new TokenFilter();

    await mecabAnalyzer.isAvailable();
  });

  const analyzeMarkdown = async (
    markdown: string,
    options?: {
      analyzeCodeBlocks?: boolean;
      analyzeTables?: boolean;
      advancedConfig?: Partial<AdvancedRulesConfig>;
    }
  ): Promise<Diagnostic[]> => {
    const analyzeCodeBlocks = options?.analyzeCodeBlocks ?? true;
    const analyzeTables = options?.analyzeTables ?? false;

    const filterResult = markdownFilter.filter(markdown, {
      ...markdownFilter.getConfig(),
      preserveCodeBlockContent: analyzeCodeBlocks,
    });

    const excludedRanges = filterResult.excludedRanges;

    let grammarExcludedRanges = analyzeCodeBlocks
      ? excludedRanges.filter((r) => r.type !== 'code-block')
      : excludedRanges;
    if (analyzeTables) {
      grammarExcludedRanges = grammarExcludedRanges.filter((r) => r.type !== 'table');
    }

    const allTokens = await mecabAnalyzer.analyze(filterResult.filteredText);
    const grammarTokens = grammarExcludedRanges.length > 0
      ? tokenFilter.filterTokens(allTokens, grammarExcludedRanges)
      : allTokens;

    const advancedRulesManager = new AdvancedRulesManager(options?.advancedConfig);
    return advancedRulesManager.checkText(filterResult.filteredText, grammarTokens, excludedRanges, {
      analyzeTables,
    });
  };

  it('README 例「私は本を彼は読む」を検出できること', async () => {
    const markdown = [
      '```markdown',
      '私は本を彼は読む。',
      '```',
      ''
    ].join('\n');

    const diagnostics = await analyzeMarkdown(markdown);

    expect(diagnostics.some((d) => d.code === 'particle-repetition')).toBe(true);
  });

  it('README 例「これは正しいかもしれない」を検出できること', async () => {
    const markdown = [
      '```markdown',
      'これは正しいかもしれない。',
      '```',
      ''
    ].join('\n');

    const diagnostics = await analyzeMarkdown(markdown);
    expect(diagnostics.some((d) => d.code === 'weak-expression')).toBe(true);
  });

  it('Conjunction Repetition はコードブロック内を誤検出しないこと（本文のみ検出）', async () => {
    const markdown = [
      '```markdown',
      'しかし、Aです。しかし、Bです。',
      '```',
      '',
      'しかし、Cです。しかし、Dです。',
      ''
    ].join('\n');

    const diagnostics = await analyzeMarkdown(markdown);
    const conj = diagnostics.filter((d) => d.code === 'conjunction-repetition');

    // ```markdown は例文扱いとして、コードブロック側も検出対象
    expect(conj).toHaveLength(2);
    expect(conj.map((d) => d.range.start.line).sort((a, b) => a - b)).toEqual([1, 4]);
  });

  it('Adversative Ga はコードブロック内を誤検出しないこと（本文のみ検出）', async () => {
    const markdown = [
      '```markdown',
      '行きますが、Aです。行きますが、Bです。',
      '```',
      '',
      '行きますが、Cです。行きますが、Dです。',
      ''
    ].join('\n');

    const diagnostics = await analyzeMarkdown(markdown);
    const ga = diagnostics.filter((d) => d.code === 'adversative-ga');

    // ```markdown は例文扱いとして、コードブロック側も検出対象
    expect(ga).toHaveLength(2);
    expect(ga.map((d) => d.range.start.line).sort((a, b) => a - b)).toEqual([1, 4]);
  });
});

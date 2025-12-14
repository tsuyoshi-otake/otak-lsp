/**
 * README.md の診断結果をスナップショットで固定し、
 * 手動インストール/目視確認なしで回帰を検知する。
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { MarkdownFilter } from '../parser/markdownFilter';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { GrammarChecker } from './checker';
import { AdvancedRulesManager } from './advancedRulesManager';
import { TokenFilter } from '../semantic/tokenFilter';
import { Diagnostic } from '../../../shared/src/types';

function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.sort((a, b) => {
    const codeA = String(a.code);
    const codeB = String(b.code);
    const codeCmp = codeA.localeCompare(codeB);
    if (codeCmp !== 0) return codeCmp;

    if (a.range.start.line !== b.range.start.line) {
      return a.range.start.line - b.range.start.line;
    }
    if (a.range.start.character !== b.range.start.character) {
      return a.range.start.character - b.range.start.character;
    }
    if (a.range.end.line !== b.range.end.line) {
      return a.range.end.line - b.range.end.line;
    }
    if (a.range.end.character !== b.range.end.character) {
      return a.range.end.character - b.range.end.character;
    }
    return a.message.localeCompare(b.message);
  });
}

async function analyzeReadme(): Promise<Diagnostic[]> {
  const readmePath = path.resolve(process.cwd(), 'README.md');
  const markdown = readFileSync(readmePath, 'utf8');

  const markdownFilter = new MarkdownFilter();
  const mecabAnalyzer = new MeCabAnalyzer();
  const grammarChecker = new GrammarChecker();
  const advancedRulesManager = new AdvancedRulesManager();
  const tokenFilter = new TokenFilter();

  const filterResult = markdownFilter.filter(markdown);
  const filteredText = filterResult.filteredText;
  const excludedRanges = filterResult.excludedRanges;

  let tokens = await mecabAnalyzer.analyze(filteredText);
  tokens = tokenFilter.filterTokens(tokens, excludedRanges);

  const basicDiagnostics = grammarChecker.check(tokens, filteredText);
  const advancedDiagnostics = advancedRulesManager.checkText(filteredText, tokens, excludedRanges);

  return sortDiagnostics([...basicDiagnostics, ...advancedDiagnostics]);
}

describe('README Regression Snapshot', () => {
  jest.setTimeout(60000);

  it('should match README diagnostics snapshot', async () => {
    const diagnostics = await analyzeReadme();

    const simplified = diagnostics.map((d) => ({
      code: d.code,
      message: d.message,
      range: d.range
    }));

    expect(simplified).toMatchSnapshot();
  });
});

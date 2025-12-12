/**
 * README.md を main.ts と同等のパイプラインで解析し、
 * 文法診断をコンソールに出力するCLI。
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { MarkdownFilter } from '../server/src/parser/markdownFilter';
import { MeCabAnalyzer } from '../server/src/mecab/analyzer';
import { GrammarChecker } from '../server/src/grammar/checker';
import { AdvancedRulesManager } from '../server/src/grammar/advancedRulesManager';
import { TokenFilter } from '../server/src/semantic/tokenFilter';
import { PositionMapper } from '../server/src/parser/positionMapper';
import { Diagnostic } from '../shared/src/types';

function getOffsetFromPosition(text: string, line: number, character: number): number {
  const lines = text.split('\n');
  let offset = 0;
  for (let i = 0; i < line && i < lines.length; i++) {
    offset += lines[i].length + 1;
  }
  return offset + character;
}

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

async function analyzeMarkdown(text: string): Promise<Diagnostic[]> {
  const markdownFilter = new MarkdownFilter();
  const mecabAnalyzer = new MeCabAnalyzer();
  const grammarChecker = new GrammarChecker();
  const advancedRulesManager = new AdvancedRulesManager();
  const tokenFilter = new TokenFilter();

  const filterResult = markdownFilter.filter(text);
  const filteredText = filterResult.filteredText;
  const excludedRanges = filterResult.excludedRanges;
  const semanticExcludedRanges = excludedRanges.filter((r) => r.type !== 'table');

  let tokens = await mecabAnalyzer.analyze(filteredText);
  tokens = tokenFilter.filterTokens(tokens, excludedRanges);

  const basicDiagnostics = grammarChecker.check(tokens, filteredText);
  const advancedDiagnostics = advancedRulesManager.checkText(filteredText, tokens, excludedRanges);

  const positionMapper = new PositionMapper(text, filteredText, semanticExcludedRanges);
  const mappedDiagnostics = [...basicDiagnostics, ...advancedDiagnostics].map((diag) => {
    const startOffset = getOffsetFromPosition(filteredText, diag.range.start.line, diag.range.start.character);
    const endOffset = getOffsetFromPosition(filteredText, diag.range.end.line, diag.range.end.character);
    const mappedRange = positionMapper.mapRangeToOriginal(startOffset, endOffset);
    return mappedRange ? { ...diag, range: mappedRange } : diag;
  });

  return sortDiagnostics(mappedDiagnostics);
}

async function main(): Promise<void> {
  const readmePath = path.resolve(process.cwd(), 'README.md');
  const markdown = readFileSync(readmePath, 'utf8');

  const diagnostics = await analyzeMarkdown(markdown);
  const asJson = process.argv.includes('--json');

  if (asJson) {
    process.stdout.write(JSON.stringify(diagnostics, null, 2));
    return;
  }

  for (const diag of diagnostics) {
    const start = diag.range.start;
    process.stdout.write(`[${diag.code}] ${start.line + 1}:${start.character + 1} ${diag.message}\n`);
  }

  process.stdout.write(`\nTotal: ${diagnostics.length}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

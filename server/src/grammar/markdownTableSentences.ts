/**
 * Markdownテーブル行から解析対象セルを取り出して文にする処理
 */

import { Sentence } from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Token } from '../../../shared/src/types';
import {
  isOffsetInsideExcludedType,
  pushSentencesFromRange,
  TextRange
} from './sentenceParsingPrimitives';

export function tryPushTableCellSentences(
  sentences: Sentence[],
  text: string,
  tokens: Token[],
  start: number,
  end: number,
  sentenceText: string,
  tableRanges?: ExcludedRange[]
): boolean {
  const insideTable = isOffsetInsideExcludedType(start, tableRanges, 'table');
  if (!insideTable || !isMarkdownTableRowLine(sentenceText)) {
    return false;
  }

  const cellRanges = extractMarkdownTableCellRanges(text, start, end);
  const selected = selectBestTableCellRange(text, cellRanges);
  if (!selected) {
    return true;
  }

  pushSentencesFromRange(sentences, text, tokens, selected.start, selected.end);
  return true;
}

export function isMarkdownTableSeparatorLine(lineText: string): boolean {
  const trimmed = lineText.trim();
  if (trimmed.length === 0) {
    return false;
  }

  if (!trimmed.startsWith('|') || !/-/.test(trimmed)) {
    return false;
  }

  return /^\|[\s\-:|]+\|?$/.test(trimmed);
}

function isMarkdownTableRowLine(lineText: string): boolean {
  const trimmed = lineText.trim();
  if (trimmed.length === 0) {
    return false;
  }
  const withoutQuote = trimmed.replace(/^(?:>\s*)+/, '');
  if (!withoutQuote.includes('|')) {
    return false;
  }
  return withoutQuote.startsWith('|');
}

function isEscapedPipe(text: string, index: number): boolean {
  if (index <= 0 || text[index] !== '|') {
    return false;
  }

  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}

function extractMarkdownTableCellRanges(text: string, lineStart: number, lineEnd: number): TextRange[] {
  const line = text.substring(lineStart, lineEnd);
  const trimmed = line.trimEnd();
  if (trimmed.length === 0) {
    return [];
  }

  const quotePrefixMatch = trimmed.match(/^(?:\s*(?:>\s*)+)?/);
  const quotePrefixLength = quotePrefixMatch ? quotePrefixMatch[0].length : 0;

  const firstPipeLocal = trimmed.indexOf('|', quotePrefixLength);
  if (firstPipeLocal < 0) {
    return [];
  }

  const pipePositions: number[] = [];
  for (let i = firstPipeLocal; i < trimmed.length; i++) {
    if (trimmed[i] !== '|') {
      continue;
    }
    if (isEscapedPipe(trimmed, i)) {
      continue;
    }
    pipePositions.push(i);
  }

  if (pipePositions.length < 2) {
    return [];
  }

  const ranges: TextRange[] = [];
  const delimiters = pipePositions.slice();
  if (delimiters[delimiters.length - 1] !== trimmed.length - 1) {
    delimiters.push(trimmed.length);
  }

  for (let i = 0; i < delimiters.length - 1; i++) {
    const left = delimiters[i];
    const right = delimiters[i + 1];
    let contentStart = left + 1;
    let contentEnd = right;

    while (contentStart < contentEnd && (trimmed[contentStart] === ' ' || trimmed[contentStart] === '\t')) {
      contentStart++;
    }
    while (contentEnd > contentStart && (trimmed[contentEnd - 1] === ' ' || trimmed[contentEnd - 1] === '\t')) {
      contentEnd--;
    }

    const absStart = lineStart + contentStart;
    const absEnd = lineStart + contentEnd;
    if (absEnd > absStart) {
      ranges.push({ start: absStart, end: absEnd });
    }
  }

  return ranges;
}

function scoreTableCell(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return -1;
  }

  const withoutTicks = trimmed.replace(/`/g, '');
  const normalized = withoutTicks.trim();

  if (/^(?:PASS|FAIL|OK|NG)$/i.test(normalized)) {
    return 0;
  }

  let score = 0;
  if (/[ぁ-んァ-ン一-龠]/.test(normalized)) {
    score += 100;
  }
  if (/[。！？!?]/.test(normalized)) {
    score += 40;
  }
  if (/、/.test(normalized)) {
    score += 20;
  }
  if (/(?:です|ます|である|だ|た|ない)$/.test(normalized.replace(/[。！？!?]$/, ''))) {
    score += 10;
  }
  score += Math.min(normalized.length, 200);
  return score;
}

function selectBestTableCellRange(
  text: string,
  ranges: TextRange[]
): TextRange | null {
  if (ranges.length === 0) {
    return null;
  }

  let best = ranges[0];
  let bestScore = scoreTableCell(text.substring(best.start, best.end));

  for (const range of ranges.slice(1)) {
    const score = scoreTableCell(text.substring(range.start, range.end));
    if (score > bestScore) {
      best = range;
      bestScore = score;
    }
  }

  if (bestScore <= 0) {
    return null;
  }
  return best;
}

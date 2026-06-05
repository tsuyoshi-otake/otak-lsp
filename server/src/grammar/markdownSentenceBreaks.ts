/**
 * Markdown構造に由来する文境界の計算
 */

import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { splitLines } from '../utils/stringUtils';

/**
 * Markdownの構造を考慮した強制分割位置を計算
 * - 見出し行の前後で分割
 * - 表/コードブロックの前後で分割
 * - 太字のみの単独行は独立させる
 * - ":" / "：" で終わる行の後で分割
 */
export function computeMarkdownBreaks(text: string, excludedRanges: ExcludedRange[]): Set<number> {
  const breaks = new Set<number>();

  for (const range of excludedRanges) {
    addRangeBasedMarkdownBreaks(breaks, text, range);
  }

  addLineBasedMarkdownBreaks(breaks, text);
  return breaks;
}

function addRangeBasedMarkdownBreaks(
  breaks: Set<number>,
  text: string,
  range: ExcludedRange
): void {
  if (range.type === 'table' || range.type === 'code-block') {
    breaks.add(range.start);
    breaks.add(range.end);

    if (range.type === 'code-block') {
      addCodeFenceLineBreaks(breaks, text, range);
    }
  }

  if (range.type === 'heading') {
    addHeadingBreaks(breaks, text, range);
  }

  if (range.type === 'list-marker') {
    addListMarkerBreak(breaks, text, range);
  }
}

function addCodeFenceLineBreaks(
  breaks: Set<number>,
  text: string,
  range: ExcludedRange
): void {
  // コードフェンス行が本文と結合されると、文ベースのルールの範囲が崩れる。
  const openingFenceLineEnd = findNewlineStartAtOrAfter(text, range.start, range.end);
  if (openingFenceLineEnd !== null) {
    breaks.add(openingFenceLineEnd);
  }

  const closingFenceLineStart = findLastNewlineStartBefore(text, range.end, range.start);
  if (closingFenceLineStart !== null) {
    breaks.add(closingFenceLineStart);
  }
}

function addHeadingBreaks(
  breaks: Set<number>,
  text: string,
  range: ExcludedRange
): void {
  breaks.add(range.start);
  const lineEnd = text.indexOf('\n', range.start);
  if (lineEnd !== -1) {
    breaks.add(lineEnd);
  }
}

function addListMarkerBreak(
  breaks: Set<number>,
  text: string,
  range: ExcludedRange
): void {
  // loose モードでもリスト項目同士が1文に連結されないようにする。
  const newlineStart = getNewlineStartBefore(text, range.start);
  if (newlineStart !== null) {
    breaks.add(newlineStart);
  }
}

function addLineBasedMarkdownBreaks(breaks: Set<number>, text: string): void {
  const lines = splitLines(text);
  let position = 0;
  for (const originalLine of lines) {
    let line = originalLine;
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }

    const lineStart = position;
    const lineEnd = position + line.length;
    const hasNewline = lineEnd < text.length && (text[lineEnd] === '\n' || text[lineEnd] === '\r');

    const trimmed = line.trim();
    if (trimmed.length > 0) {
      if (/^\*\*.+\*\*$/.test(trimmed)) {
        breaks.add(lineStart);
        if (hasNewline) {
          breaks.add(lineEnd);
        }
      }

      const trimmedEnd = line.trimEnd();
      if (hasNewline && (trimmedEnd.endsWith(':') || trimmedEnd.endsWith('：'))) {
        breaks.add(lineEnd);
      }
    }

    position += originalLine.length + 1;
  }
}

function findNewlineStartAtOrAfter(
  text: string,
  start: number,
  endExclusive: number
): number | null {
  for (let i = start; i < endExclusive; i++) {
    const ch = text[i];
    if (ch === '\n') {
      return i > 0 && text[i - 1] === '\r' ? i - 1 : i;
    }
    if (ch === '\r') {
      return i;
    }
  }
  return null;
}

function findLastNewlineStartBefore(
  text: string,
  endExclusive: number,
  lowerBound: number
): number | null {
  for (let i = endExclusive - 1; i >= lowerBound; i--) {
    const ch = text[i];
    if (ch === '\n') {
      return i > 0 && text[i - 1] === '\r' ? i - 1 : i;
    }
    if (ch === '\r') {
      return i;
    }
  }
  return null;
}

function getNewlineStartBefore(text: string, position: number): number | null {
  if (position <= 0) {
    return null;
  }

  const prev = position - 1;
  if (text[prev] === '\n') {
    if (prev - 1 >= 0 && text[prev - 1] === '\r') {
      return prev - 1;
    }
    return prev;
  }
  if (text[prev] === '\r') {
    return prev;
  }

  return null;
}

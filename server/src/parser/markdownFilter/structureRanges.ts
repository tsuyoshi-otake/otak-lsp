import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import { isBlank, splitLines } from '../../utils/stringUtils';
import { findClosingParenForMarkdownLink, isEscapedAt, isOverlapping } from './rangeUtils';

/**
 * 見出しマーカーを検出する。
 * # で始まる行の「# 」部分のみを除外（タイトルテキストは検出対象に残す）。
 */
export function findHeadings(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];
  const lines = splitLines(text);
  let position = 0;

  // コードブロック範囲のみをチェック対象とする
  const codeBlockRanges = existingRanges.filter((r) => r.type === 'code-block');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = position;

    // マークダウン見出し: # で始まる行のマーカー部分のみ除外
    const headingMatch = line.match(/^(\s*(?:>\s*)*)(#{1,6}\s)/);
    if (headingMatch) {
      const markerEnd = lineStart + headingMatch[1].length + headingMatch[2].length;
      if (!isOverlapping(lineStart, markerEnd, codeBlockRanges)) {
        ranges.push({
          start: lineStart,
          end: markerEnd,
          type: 'heading',
          content: headingMatch[0],
          reason: 'マークダウン見出しマーカー検出'
        });
      }
    }

    position += line.length + 1; // +1 for newline
  }

  return ranges;
}

/**
 * リストマーカーを検出する。
 * - * + や 1. などのマーカー部分のみを除外（内容テキストは検出対象に残す）。
 */
export function findListMarkers(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];
  const lines = splitLines(text);
  let position = 0;

  // コードブロック範囲のみをチェック対象とする
  const codeBlockRanges = existingRanges.filter((r) => r.type === 'code-block');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = position;

    // リストマーカー: - * + または 1. 2. などで始まる行のマーカー部分のみ除外
    const listMatch =
      line.match(/^(\s*(?:>\s*)*)(\s*[-*+]\s)/) ||
      line.match(/^(\s*(?:>\s*)*)(\s*\d+\.\s)/);
    if (listMatch) {
      const markerEnd = lineStart + listMatch[1].length + listMatch[2].length;
      if (!isOverlapping(lineStart, markerEnd, codeBlockRanges)) {
        ranges.push({
          start: lineStart,
          end: markerEnd,
          type: 'list-marker',
          content: listMatch[0],
          reason: 'リストマーカー検出'
        });
      }
    }

    position += line.length + 1; // +1 for newline
  }

  return ranges;
}

/**
 * 強調マーカーを検出する。
 * - **bold**, *italic* などの `*` を除外（内容は残す）
 * - ただし箇条書きの先頭 `* ` は list-marker で扱うため除外しない
 */
export function findEmphasisMarkers(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  if (isBlank(text)) {
    return ranges;
  }

  // テーブル範囲は「本文として残す」設計のため、強調マーカー検出の重複チェックからは除外する
  const skipRanges = existingRanges.filter((r) => r.type !== 'table');

  const isOverlappingAny = (start: number, end: number): boolean => {
    return isOverlapping(start, end, skipRanges) || isOverlapping(start, end, ranges);
  };

  const isWhitespace = (ch: string): boolean => {
    return isBlank(ch) || /\s/.test(ch);
  };

  const isAsciiDigit = (ch: string): boolean => {
    return ch.length > 0 && ch >= '0' && ch <= '9';
  };

  const isAsciiWord = (ch: string): boolean => {
    return /[A-Za-z0-9_]/.test(ch);
  };

  const lines = splitLines(text);
  let position = 0;

  for (const line of lines) {
    const listMarkerMatch = line.match(/^(\s*(?:>\s*)*)(\s*\*\s)/);
    const listMarkerEnd = listMarkerMatch ? listMarkerMatch[1].length + listMarkerMatch[2].length : 0;

    let i = 0;
    while (i < line.length) {
      const marker = line[i];
      if (marker !== '*' && marker !== '_' && marker !== '~') {
        i++;
        continue;
      }

      const runStart = i;
      while (i < line.length && line[i] === marker) {
        i++;
      }
      const runEnd = i;
      const runLength = runEnd - runStart;

      if (runLength <= 0) {
        continue;
      }

      // 箇条書きマーカーは別ロジックで扱う（設定で無効化できるようにする）
      if (marker === '*' && runLength === 1 && runStart < listMarkerEnd) {
        continue;
      }

      const prev = runStart > 0 ? line[runStart - 1] : '';
      const next = runEnd < line.length ? line[runEnd] : '';

      // 2*3 のような数式っぽいケースは温存
      if (marker === '*' && runLength === 1 && isAsciiDigit(prev) && isAsciiDigit(next)) {
        continue;
      }

      // foo_bar のような ASCII 単語内のアンダースコアは温存
      if (marker === '_' && runLength === 1 && isAsciiWord(prev) && isAsciiWord(next)) {
        continue;
      }

      // ~~ は GFM の取り消し線。単体 ~ は温存（例: ~1 など）
      if (marker === '~' && runLength < 2) {
        continue;
      }

      // 両側が空白ならリテラル扱いにして温存（例: " * "）
      if (marker !== '~' && runLength === 1 && isWhitespace(prev) && isWhitespace(next)) {
        continue;
      }

      const absStart = position + runStart;
      const absEnd = position + runEnd;

      if (!isOverlappingAny(absStart, absEnd)) {
        ranges.push({
          start: absStart,
          end: absEnd,
          type: 'emphasis-marker',
          content: text.substring(absStart, absEnd),
          reason: '強調マーカー検出'
        });
      }
    }

    position += line.length + 1; // +1 for newline
  }

  return ranges;
}

/**
 * Markdownリンク/タスクの構造マーカーを検出する。
 * - [text](url) / ![alt](url) の `[`, `](`, `)` を除外（内容は残す）
 * - タスクリストの `[ ]` / `[x]` も除外
 */
export function findLinkMarkers(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  if (isBlank(text)) {
    return ranges;
  }

  // テーブル範囲は「本文として残す」設計のため、構造マーカー検出の重複チェックからは除外する
  const skipRanges = existingRanges.filter((r) => r.type !== 'table');

  const isOverlappingAny = (start: number, end: number): boolean => {
    return isOverlapping(start, end, skipRanges) || isOverlapping(start, end, ranges);
  };

  const addMarker = (start: number, end: number, reason: string): void => {
    if (start >= end) return;
    if (start < 0 || end > text.length) return;
    if (isOverlappingAny(start, end)) return;
    ranges.push({
      start,
      end,
      type: 'link-marker',
      content: text.substring(start, end),
      reason
    });
  };

  const findOpeningBracketBefore = (index: number): number | null => {
    // 同一行内で最後の '[' を探す（Markdownリンクは改行を跨がない）
    for (let i = index - 1; i >= 0; i--) {
      const ch = text[i];
      if (ch === '\n' || ch === '\r') {
        break;
      }
      if (ch === '[' && !isEscapedAt(text, i)) {
        return i;
      }
    }
    return null;
  };

  // [text](...)/![alt](...)
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== ']' || text[i + 1] !== '(') {
      continue;
    }
    if (isEscapedAt(text, i)) {
      continue;
    }

    const openingBracket = findOpeningBracketBefore(i);
    if (openingBracket !== null) {
      addMarker(openingBracket, openingBracket + 1, 'マークダウンリンク開始マーカー検出');
      // 画像リンク `![` の `!` もマーカーとして除外
      if (openingBracket - 1 >= 0 && text[openingBracket - 1] === '!' && !isEscapedAt(text, openingBracket - 1)) {
        addMarker(openingBracket - 1, openingBracket, 'マークダウン画像マーカー検出');
      }
    }

    // kuromoji が `](` を 1 トークン化するケースがあるため、まとめて除外する
    addMarker(i, i + 2, 'マークダウンリンク区切りマーカー検出');

    const contentStart = i + 2;
    const closingParen = findClosingParenForMarkdownLink(text, contentStart);
    if (closingParen === -1) {
      continue;
    }

    addMarker(closingParen, closingParen + 1, 'マークダウンリンク終了マーカー検出');
    i = closingParen;
  }

  // タスクリスト: [ ] / [x] / [X]
  for (let i = 0; i < text.length - 2; i++) {
    if (text[i] !== '[') continue;
    if (isEscapedAt(text, i)) continue;
    const b = text[i + 1];
    const c = text[i + 2];
    if (c !== ']') continue;
    if (b !== ' ' && b !== 'x' && b !== 'X') continue;
    addMarker(i, i + 3, 'タスクリストマーカー検出');
    i = i + 2;
  }

  return ranges;
}

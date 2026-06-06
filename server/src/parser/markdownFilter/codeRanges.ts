import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import { stripMarkdownBlockquotePrefix } from '../../../../shared/src/markdownSyntax';
import { splitLines } from '../../utils/stringUtils';
import { isOverlapping } from './rangeUtils';

const INLINE_CODE_PRESERVE_IN_TABLE_REGEX =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\u3005\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/;

/**
 * コードブロックを検出する。
 */
export function findCodeBlocks(text: string, precomputedLines?: string[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  // NOTE:
  // 以前は /```[\\s\\S]*?```/ で検出していたが、
  // これは行途中の ```...``` を「コードブロック」と誤認し、
  // テーブル検出を阻害する（README の evals など）ため、
  // CommonMark 互換の「行頭フェンス」を優先しつつ、
  // 後方互換のため単一行の ```code``` 形式も検出する。
  const lines = precomputedLines ?? splitLines(text);
  let position = 0;

  let inCodeBlock = false;
  let codeBlockStart = -1;
  let fenceChar: '`' | '~' | null = null;
  let fenceLength = 0;
  let closingFencePattern: RegExp | null = null;

  const openingFencePattern = /^\s*(`{3,}|~{3,})(.*)$/;
  let codeBlockBlockquoteDepth = 0;

  for (const line of lines) {
    const lineStart = position;
    const lineForMatch = line.endsWith('\r') ? line.slice(0, -1) : line;

    if (!inCodeBlock) {
      const { strippedLine, depth } = stripMarkdownBlockquotePrefix(lineForMatch);
      const match = strippedLine.match(openingFencePattern);
      if (match) {
        inCodeBlock = true;
        codeBlockStart = lineStart;
        fenceChar = match[1][0] as '`' | '~';
        fenceLength = match[1].length;
        closingFencePattern = new RegExp(`^\\s*${fenceChar}{${fenceLength},}\\s*$`);
        codeBlockBlockquoteDepth = depth;
      }
    } else if (closingFencePattern) {
      const { strippedLine, depth: actualDepth } = stripMarkdownBlockquotePrefix(
        lineForMatch,
        codeBlockBlockquoteDepth
      );
      if (actualDepth === codeBlockBlockquoteDepth && closingFencePattern.test(strippedLine)) {
        const codeBlockEnd = lineStart + line.length;
        ranges.push({
          start: codeBlockStart,
          end: codeBlockEnd,
          type: 'code-block',
          content: text.substring(codeBlockStart, codeBlockEnd),
          reason: 'コードブロック検出'
        });

        inCodeBlock = false;
        codeBlockStart = -1;
        fenceChar = null;
        fenceLength = 0;
        closingFencePattern = null;
        codeBlockBlockquoteDepth = 0;
      }
    }

    position += line.length + 1; // +1 for newline
  }

  // 単一行の ```code``` 形式（GFMでは通常コードブロック扱いではないが、既存挙動維持）
  // - ただし複数行ブロック検出と重複する場合は除外
  const inlineFencePattern = /```[^`\n]+```/g;
  let inlineMatch;
  while ((inlineMatch = inlineFencePattern.exec(text)) !== null) {
    const start = inlineMatch.index;
    const end = inlineMatch.index + inlineMatch[0].length;
    if (!isOverlapping(start, end, ranges)) {
      ranges.push({
        start,
        end,
        type: 'code-block',
        content: inlineMatch[0],
        reason: 'コードブロック検出'
      });
    }
  }

  return ranges;
}

/**
 * インラインコードを検出する。
 */
export function findInlineCode(text: string, existingRanges: ExcludedRange[], precomputedLines?: string[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];
  const lines = precomputedLines ?? splitLines(text);
  let position = 0;

  for (const line of lines) {
    let i = 0;
    while (i < line.length) {
      if (line[i] !== '`') {
        i++;
        continue;
      }

      const openingStart = i;
      let tickCount = 0;
      while (i < line.length && line[i] === '`') {
        tickCount++;
        i++;
      }

      let closingEnd = -1;
      let j = i;
      while (j < line.length) {
        if (line[j] !== '`') {
          j++;
          continue;
        }

        let k = j;
        while (k < line.length && line[k] === '`') {
          k++;
        }
        const runLength = k - j;
        if (runLength === tickCount) {
          closingEnd = k;
          break;
        }
        j = k;
      }

      if (closingEnd !== -1) {
        const absStart = position + openingStart;
        const absEnd = position + closingEnd;
        if (!isOverlapping(absStart, absEnd, existingRanges)) {
          ranges.push({
            start: absStart,
            end: absEnd,
            type: 'inline-code',
            content: text.substring(absStart, absEnd),
            reason: 'インラインコード検出'
          });
        }
        i = closingEnd;
      } else {
        // 閉じバッククォートがない場合はリテラルとして扱い、1文字進める
        i = openingStart + 1;
      }
    }

    position += line.length + 1; // +1 for newline
  }

  return ranges;
}

/**
 * テーブルセル内の日本語インラインコードだけは本文として残す。
 */
export function restoreInlineCodeInTables(ranges: ExcludedRange[]): ExcludedRange[] {
  const tableRanges = ranges.filter((r) => r.type === 'table');
  if (tableRanges.length === 0) {
    return ranges;
  }

  const shouldPreserveInlineCode = (inlineCode: ExcludedRange): boolean => {
    const stripped = inlineCode.content.replace(/^`+/, '').replace(/`+$/, '');
    return INLINE_CODE_PRESERVE_IN_TABLE_REGEX.test(stripped);
  };

  return ranges.filter((range) => {
    if (range.type !== 'inline-code') {
      return true;
    }
    if (!shouldPreserveInlineCode(range)) {
      return true;
    }
    return !tableRanges.some((table) => range.start >= table.start && range.end <= table.end);
  });
}

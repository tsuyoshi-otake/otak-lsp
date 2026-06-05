import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';

/**
 * 範囲が既存の範囲と重複しているかチェックする。
 */
export function isOverlapping(start: number, end: number, existingRanges: ExcludedRange[]): boolean {
  for (const range of existingRanges) {
    if (start < range.end && end > range.start) {
      return true;
    }
  }
  return false;
}

/**
 * Markdown のエスケープ状態を判定する。
 */
export function isEscapedAt(text: string, index: number): boolean {
  if (index <= 0) {
    return false;
  }

  let backslashes = 0;
  for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
    backslashes++;
  }
  return backslashes % 2 === 1;
}

/**
 * MarkdownリンクのURL/タイトル部分を閉じる `)` を探す。
 */
export function findClosingParenForMarkdownLink(text: string, contentStart: number): number {
  let depth = 0;
  let escaped = false;
  let inAngle = false;
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let i = contentStart; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inAngle) {
      if (ch === '>') {
        inAngle = false;
      }
      continue;
    }
    if (inSingleQuote) {
      if (ch === '\'') {
        inSingleQuote = false;
      }
      continue;
    }
    if (inDoubleQuote) {
      if (ch === '"') {
        inDoubleQuote = false;
      }
      continue;
    }

    if (ch === '<') {
      inAngle = true;
      continue;
    }
    if (ch === '\'') {
      inSingleQuote = true;
      continue;
    }
    if (ch === '"') {
      inDoubleQuote = true;
      continue;
    }

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      if (depth === 0) {
        return i;
      }
      depth--;
      continue;
    }
  }

  return -1;
}

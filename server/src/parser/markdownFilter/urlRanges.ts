import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import { findClosingParenForMarkdownLink, isOverlapping } from './rangeUtils';

/**
 * URLを検出する。
 */
export function findUrls(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  const isOverlappingAny = (start: number, end: number): boolean => {
    return isOverlapping(start, end, existingRanges) || isOverlapping(start, end, ranges);
  };

  const addUrlRange = (start: number, end: number, reason: string): void => {
    if (start >= end) {
      return;
    }
    if (isOverlappingAny(start, end)) {
      return;
    }
    ranges.push({
      start,
      end,
      type: 'url',
      content: text.substring(start, end),
      reason
    });
  };

  const trimPlainUrlEnd = (start: number, endExclusive: number): number => {
    let openParens = 0;
    let closeParens = 0;
    let openBrackets = 0;
    let closeBrackets = 0;
    let openBraces = 0;
    let closeBraces = 0;

    for (let i = start; i < endExclusive; i++) {
      const ch = text[i];
      if (ch === '(') {
        openParens++;
      } else if (ch === ')') {
        closeParens++;
      } else if (ch === '[') {
        openBrackets++;
      } else if (ch === ']') {
        closeBrackets++;
      } else if (ch === '{') {
        openBraces++;
      } else if (ch === '}') {
        closeBraces++;
      }
    }

    let end = endExclusive;
    while (end > start) {
      const ch = text[end - 1];

      // 括弧などの「余計な閉じ」を優先して落とす
      if (ch === ')' && closeParens > openParens) {
        closeParens--;
        end--;
        continue;
      }
      if (ch === ']' && closeBrackets > openBrackets) {
        closeBrackets--;
        end--;
        continue;
      }
      if (ch === '}' && closeBraces > openBraces) {
        closeBraces--;
        end--;
        continue;
      }

      // URL末尾に付与されがちな句読点・引用符などは除外
      if (/[.,;:!?]/.test(ch)) {
        end--;
        continue;
      }
      if (ch === '"' || ch === '\'' || ch === '`') {
        end--;
        continue;
      }
      if (ch === '。' || ch === '、' || ch === '，' || ch === '．') {
        end--;
        continue;
      }
      if (ch === '」' || ch === '』' || ch === '】' || ch === '）') {
        end--;
        continue;
      }

      break;
    }

    return end;
  };

  // マークダウンリンクのURL/タイトル部分 [text](...)/![alt](...)
  for (let i = 0; i < text.length - 1; i++) {
    if (text[i] !== ']' || text[i + 1] !== '(') {
      continue;
    }

    const contentStart = i + 2;
    const closingParen = findClosingParenForMarkdownLink(text, contentStart);
    if (closingParen === -1) {
      continue;
    }

    addUrlRange(contentStart, closingParen, 'マークダウンリンクURL検出');
    i = closingParen;
  }

  // 自動リンク <url>
  const autoLinkPattern = /<(https?:\/\/[^>]+)>/g;
  let match;
  while ((match = autoLinkPattern.exec(text)) !== null) {
    addUrlRange(match.index, match.index + match[0].length, '自動リンク検出');
  }

  // プレーンテキストURL
  // NOTE: `()` などを含むURLを取りこぼさないようにしつつ、末尾の句読点はトリムする
  const plainUrlPattern = /https?:\/\/[^\s<>]+/g;
  while ((match = plainUrlPattern.exec(text)) !== null) {
    const start = match.index;
    const trimmedEnd = trimPlainUrlEnd(start, match.index + match[0].length);
    addUrlRange(start, trimmedEnd, 'URL検出');
  }

  return ranges;
}

/**
 * 設定キー名を検出する。
 */
export function findConfigKeys(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];
  const configKeyPattern = /\b(?:otakLsp|config|settings)\.[a-zA-Z0-9_.]+/g;
  let match;

  while ((match = configKeyPattern.exec(text)) !== null) {
    if (!isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        type: 'config-key',
        content: match[0],
        reason: '設定キー名検出'
      });
    }
  }

  return ranges;
}

/**
 * カスタムパターンを検出する。
 */
export function findCustomPatterns(
  text: string,
  patterns: RegExp[],
  existingRanges: ExcludedRange[]
): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  for (const pattern of patterns) {
    // グローバルフラグを追加（なければ）
    const globalPattern = pattern.global
      ? pattern
      : new RegExp(pattern.source, pattern.flags + 'g');

    let match;
    while ((match = globalPattern.exec(text)) !== null) {
      if (!isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'custom',
          content: match[0],
          reason: `カスタムパターン検出: ${pattern.source}`
        });
      }
    }
  }

  return ranges;
}

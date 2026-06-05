/**
 * 文分割で共有する小さなプリミティブ
 */

import { Sentence } from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Token } from '../../../shared/src/types';
import { isBlank } from '../utils/stringUtils';

/**
 * 文分割の終端記号
 */
export const SENTENCE_TERMINATORS = /[。！？!?]/;

export type TextRange = {
  start: number;
  end: number;
};

export function isOffsetInsideRange(offset: number, range: ExcludedRange): boolean {
  return offset >= range.start && offset < range.end;
}

export function isOffsetInsideExcludedType(
  offset: number,
  excludedRanges: ExcludedRange[] | undefined,
  type: ExcludedRange['type']
): boolean {
  if (!excludedRanges || excludedRanges.length === 0) {
    return false;
  }
  return excludedRanges.some((range) => range.type === type && isOffsetInsideRange(offset, range));
}

/**
 * 指定範囲内のトークンを取得
 */
export function getTokensInRange(tokens: Token[], start: number, end: number): Token[] {
  if (tokens.length === 0) {
    return [];
  }

  let left = 0;
  let right = tokens.length;

  while (left < right) {
    const mid = Math.floor((left + right) / 2);
    if (tokens[mid].start < start) {
      left = mid + 1;
    } else {
      right = mid;
    }
  }

  const selected: Token[] = [];
  for (let i = left; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.start >= end) {
      break;
    }
    if (token.end > end) {
      break;
    }
    selected.push(token);
  }

  return selected;
}

export function pushPlainSentence(
  sentences: Sentence[],
  text: string,
  tokens: Token[],
  start: number,
  end: number
): void {
  if (end <= start) {
    return;
  }

  const sentenceText = text.substring(start, end);
  if (isBlank(sentenceText)) {
    return;
  }

  const sentenceTokens = getTokensInRange(tokens, start, end);
  sentences.push(new Sentence({
    text: sentenceText,
    tokens: sentenceTokens,
    start,
    end
  }));
}

export function pushSentencesFromRange(
  sentences: Sentence[],
  text: string,
  tokens: Token[],
  start: number,
  end: number
): void {
  if (end <= start) {
    return;
  }

  let currentStart = start;
  for (let i = start; i < end; i++) {
    if (!SENTENCE_TERMINATORS.test(text[i])) {
      continue;
    }

    while (i + 1 < end && SENTENCE_TERMINATORS.test(text[i + 1])) {
      i++;
    }

    pushPlainSentence(sentences, text, tokens, currentStart, i + 1);
    currentStart = i + 1;
  }

  if (currentStart < end) {
    pushPlainSentence(sentences, text, tokens, currentStart, end);
  }
}

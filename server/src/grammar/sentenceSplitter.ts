/**
 * テキストからSentenceを構築する文分割の本体
 */

import { Sentence } from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Token } from '../../../shared/src/types';
import { isBlank } from '../utils/stringUtils';
import { computeMarkdownBreaks } from './markdownSentenceBreaks';
import { isMarkdownTableSeparatorLine, tryPushTableCellSentences } from './markdownTableSentences';
import { shouldSplitOnNewline } from './newlineSentenceSplit';
import { getTokensInRange, isOffsetInsideExcludedType, SENTENCE_TERMINATORS } from './sentenceParsingPrimitives';

export type SentenceSplitMode = 'strict' | 'normal' | 'loose';

export function parseTextIntoSentences(
  text: string,
  tokens: Token[],
  excludedRanges?: ExcludedRange[],
  splitMode: SentenceSplitMode = 'normal',
  precomputedLines?: string[]
): Sentence[] {
  if (isBlank(text)) {
    return [];
  }

  const sentences: Sentence[] = [];
  let currentStart = 0;
  const markdownBreaks = excludedRanges ? computeMarkdownBreaks(text, excludedRanges, precomputedLines) : null;
  const tableRanges = excludedRanges ? excludedRanges.filter((range) => range.type === 'table') : undefined;

  for (let i = 0; i < text.length; i++) {
    if (markdownBreaks && markdownBreaks.has(i)) {
      pushSentence(sentences, text, tokens, currentStart, i, excludedRanges, tableRanges);
      currentStart = getStartAfterMarkdownBreak(text, i);
      continue;
    }

    if (SENTENCE_TERMINATORS.test(text[i])) {
      if (isOffsetInsideExcludedType(i, tableRanges, 'table')) {
        continue;
      }

      while (i + 1 < text.length && SENTENCE_TERMINATORS.test(text[i + 1])) {
        i++;
      }

      pushSentence(sentences, text, tokens, currentStart, i + 1, excludedRanges, tableRanges);
      currentStart = i + 1;
    } else if (text[i] === '\n') {
      const newlineStart = (i > 0 && text[i - 1] === '\r') ? i - 1 : i;

      if (isOffsetInsideExcludedType(newlineStart, tableRanges, 'table')) {
        pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);
        currentStart = i + 1;
        continue;
      }

      const emptyLineEnd = findEmptyLineEnd(text, i + 1);
      if (emptyLineEnd !== null) {
        pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);
        i = emptyLineEnd - 1;
        currentStart = emptyLineEnd;
      } else if (splitMode !== 'loose' && (splitMode === 'strict' || shouldSplitOnNewline(text, newlineStart))) {
        pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);
        currentStart = i + 1;
      }
    }
  }

  if (currentStart < text.length) {
    pushSentence(sentences, text, tokens, currentStart, text.length, excludedRanges, tableRanges);
  }

  return sentences;
}

function getStartAfterMarkdownBreak(text: string, breakOffset: number): number {
  if (text[breakOffset] === '\n') {
    return breakOffset + 1;
  }

  if (text[breakOffset] !== '\r') {
    return breakOffset;
  }

  if (breakOffset + 1 < text.length && text[breakOffset + 1] === '\n') {
    return breakOffset + 2;
  }
  return breakOffset + 1;
}

function findEmptyLineEnd(text: string, start: number): number | null {
  let position = start;
  let hasEmptyLine = false;

  while (
    position < text.length &&
    (text[position] === ' ' || text[position] === '\t' || text[position] === '\r' || text[position] === '\n')
  ) {
    if (text[position] === '\n') {
      hasEmptyLine = true;
      break;
    }
    position++;
  }

  if (!hasEmptyLine) {
    return null;
  }

  while (
    position < text.length &&
    (text[position] === ' ' || text[position] === '\t' || text[position] === '\r' || text[position] === '\n')
  ) {
    position++;
  }
  return position;
}

function pushSentence(
  sentences: Sentence[],
  text: string,
  tokens: Token[],
  start: number,
  end: number,
  excludedRanges?: ExcludedRange[],
  tableRanges?: ExcludedRange[]
): void {
  if (end <= start) {
    return;
  }

  const effectiveStart = getEffectiveSentenceStart(start, end, excludedRanges);
  if (end <= effectiveStart) {
    return;
  }

  const sentenceText = text.substring(effectiveStart, end);
  if (isBlank(sentenceText)) {
    return;
  }

  if (excludedRanges && isMarkdownTableSeparatorLine(sentenceText)) {
    return;
  }

  if (tryPushTableCellSentences(
    sentences,
    text,
    tokens,
    effectiveStart,
    end,
    sentenceText,
    tableRanges ?? excludedRanges
  )) {
    return;
  }

  const sentenceTokens = getTokensInRange(tokens, effectiveStart, end);
  sentences.push(new Sentence({
    text: sentenceText,
    tokens: sentenceTokens,
    start: effectiveStart,
    end
  }));
}

function getEffectiveSentenceStart(
  start: number,
  end: number,
  excludedRanges?: ExcludedRange[]
): number {
  if (!excludedRanges) {
    return start;
  }

  const prefixRange = excludedRanges.find(
    (range) =>
      (range.type === 'heading' || range.type === 'list-marker') &&
      range.start === start &&
      range.end <= end
  );
  return prefixRange ? prefixRange.end : start;
}

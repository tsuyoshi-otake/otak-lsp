/**
 * 括弧内の文末句点運用チェック
 *  - 文の場合は句点を付与
 *  - 短い名詞句の場合は句点を削除
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ProofreadingDiagnostic, ProofreadingRuleContext } from './proofreadingRuleTypes';

const SENTENCE_ENDING_PATTERN = /(?:です|ます|である|であります|だった|でした|であった|だ|とする|という)$/;
const END_PUNCT_PATTERN = /([。！？!?])\s*$/;
const END_PUNCT_STRIP_PATTERN = /[。！？!?]\s*$/;

function isShortNounPhrase(text: string): boolean {
  return !/[ぁ-ん]/.test(text) && text.length <= 6;
}

export function checkPeriodBeforeCloseBracket(ctx: ProofreadingRuleContext): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  const innerRanges = ctx.bracketDetector.getInnerRanges(ctx.bracketRanges);

  for (const range of innerRanges) {
    if (!ctx.checkInBrackets && ctx.bracketDetector.isInsideBracket(range.start, ctx.bracketRanges)) {
      continue;
    }

    const innerText = ctx.text.slice(range.start, range.end);
    const trimmed = innerText.trim();
    if (!trimmed) {
      continue;
    }

    const endPunctMatch = END_PUNCT_PATTERN.exec(trimmed);
    const hasEndPunct = Boolean(endPunctMatch);
    const trimmedWithoutPunct = hasEndPunct ? trimmed.replace(END_PUNCT_STRIP_PATTERN, '') : trimmed;
    const isSentenceLike = SENTENCE_ENDING_PATTERN.test(trimmedWithoutPunct);

    if (isSentenceLike && !hasEndPunct) {
      const closeIndex = range.end;
      diagnostics.push({
        range: {
          start: ctx.offsetToPosition(closeIndex),
          end: ctx.offsetToPosition(closeIndex + 1),
        },
        message: '括弧内が文の場合は句点（。）を付けてください。',
        severity: DiagnosticSeverity.Information,
        code: 'period-before-close-bracket',
      });
      continue;
    }

    if (hasEndPunct && !isSentenceLike && isShortNounPhrase(trimmedWithoutPunct)) {
      const punctChar = endPunctMatch?.[1];
      if (!punctChar) {
        continue;
      }
      const punctIndex = range.start + innerText.lastIndexOf(punctChar);
      diagnostics.push({
        range: {
          start: ctx.offsetToPosition(punctIndex),
          end: ctx.offsetToPosition(punctIndex + 1),
        },
        message: '括弧内が語句の場合は句点を付けません。句点を削除してください。',
        severity: DiagnosticSeverity.Information,
        code: 'period-before-close-bracket',
      });
    }
  }

  return diagnostics;
}

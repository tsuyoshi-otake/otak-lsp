/**
 * 疑問符/感嘆符の後の空白チェック
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import { isEscapedAt } from '../../parser/markdownFilter/rangeUtils';
import { ProofreadingDiagnostic, ProofreadingRuleContext, isClosingBracket } from './proofreadingRuleTypes';

const QE_PATTERN = /[?!？！]/g;

function hasFollowingWhitespace(text: string, startIndex: number): boolean {
  let cursor = startIndex;
  while (cursor < text.length) {
    const ch = text[cursor];
    if (/\s/.test(ch)) {
      return true;
    }
    if (isClosingBracket(ch)) {
      cursor += 1;
      continue;
    }
    return cursor >= text.length;
  }
  return true;
}

export function checkSpaceAfterQuestionExclamation(ctx: ProofreadingRuleContext, markdownRanges?: readonly ExcludedRange[]): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  const imageMarkers = new Set((markdownRanges ?? []).filter(r => r.type === 'link-marker' && ctx.text[r.start] === '!').map(r => r.start));
  let match;

  while ((match = QE_PATTERN.exec(ctx.text)) !== null) {
    const index = match.index;

    if (imageMarkers.has(index) ||
        (markdownRanges !== undefined && index > 0 && ctx.text.startsWith('<!--', index - 1) &&
         !isEscapedAt(ctx.text, index - 1))) continue;

    if (!ctx.checkInBrackets && ctx.bracketDetector.isInsideBracket(index, ctx.bracketRanges)) {
      continue;
    }

    const next = ctx.text[index + 1];
    if (!next) {
      continue;
    }
    if (/\s/.test(next) || /[?!？！]/.test(next)) {
      continue;
    }

    if (hasFollowingWhitespace(ctx.text, index + 1)) {
      continue;
    }

    diagnostics.push({
      range: {
        start: ctx.offsetToPosition(index),
        end: ctx.offsetToPosition(index + 1),
      },
      message: '疑問符/感嘆符の後に空白がありません。後続の文が続く場合は1文字分空けてください。',
      severity: DiagnosticSeverity.Information,
      code: 'space-after-question-exclamation',
    });
  }

  return diagnostics;
}

/**
 * 和暦初年（令和1年→令和元年）チェック
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ProofreadingDiagnostic, ProofreadingRuleContext } from './proofreadingRuleTypes';

const ERA_PATTERN = /(令和|平成|昭和|大正|明治)[1１一]年/g;

export function checkEraFirstYear(ctx: ProofreadingRuleContext): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  let match;

  while ((match = ERA_PATTERN.exec(ctx.text)) !== null) {
    const start = match.index;
    const end = match.index + match[0].length;

    if (!ctx.checkInBrackets && ctx.bracketDetector.isInsideBracket(start, ctx.bracketRanges)) {
      continue;
    }

    diagnostics.push({
      range: {
        start: ctx.offsetToPosition(start),
        end: ctx.offsetToPosition(end),
      },
      message: `「${match[0]}」は「${match[1]}元年」と表記することを推奨します`,
      severity: DiagnosticSeverity.Information,
      code: 'era-first-year',
    });
  }

  return diagnostics;
}

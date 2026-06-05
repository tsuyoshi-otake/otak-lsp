/**
 * 括弧の入れ子深さチェック
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { BracketRange } from '../bracketRangeDetector';
import { ProofreadingDiagnostic, ProofreadingRuleContext } from './proofreadingRuleTypes';

export function checkBracketDepth(
  ctx: ProofreadingRuleContext,
  bracketRanges: BracketRange[],
  maxDepth: number
): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];

  for (const range of bracketRanges) {
    if (range.depth < maxDepth) {
      continue;
    }
    diagnostics.push({
      range: {
        start: ctx.offsetToPosition(range.start),
        end: ctx.offsetToPosition(range.end),
      },
      message: `括弧の入れ子が深すぎます（深さ: ${range.depth + 1}、閾値: ${maxDepth}）`,
      severity: DiagnosticSeverity.Information,
      code: 'bracket-depth',
    });
  }

  return diagnostics;
}

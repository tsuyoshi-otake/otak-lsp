import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ProofreadingDiagnostic, ProofreadingRuleContext } from './proofreadingRuleTypes';

/** Unicode私用領域は利用先で意味や字形が異なる可能性がある。 */
export function checkPrivateUseCharacters(ctx: ProofreadingRuleContext): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  let offset = 0;
  for (const char of ctx.text) {
    const point = char.codePointAt(0)!;
    if ((point >= 0xE000 && point <= 0xF8FF)
      || (point >= 0xF0000 && point <= 0xFFFFD)
      || (point >= 0x100000 && point <= 0x10FFFD)) {
      diagnostics.push({
        range: { start: ctx.offsetToPosition(offset), end: ctx.offsetToPosition(offset + char.length) },
        message: `私用領域の文字（U+${point.toString(16).toUpperCase().padStart(4, '0')}）は利用先によって意味や字形が異なる場合があります`,
        severity: DiagnosticSeverity.Information,
        code: 'private-use-character',
      });
    }
    offset += char.length;
  }
  return diagnostics;
}

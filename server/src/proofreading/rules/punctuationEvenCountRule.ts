/**
 * 約物の偶数チェック（二点リーダ・ダッシュ・波線）
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ProofreadingDiagnostic, ProofreadingRuleContext, escapeRegex } from './proofreadingRuleTypes';

interface EvenSpec {
  char: string;
  name: string;
  code: string;
}

export interface PunctuationEvenCountConfig {
  evenLeader: boolean;
  evenDash: boolean;
  evenWave: boolean;
}

function checkSingleChar(ctx: ProofreadingRuleContext, spec: EvenSpec): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  const pattern = new RegExp(`${escapeRegex(spec.char)}+`, 'g');
  let match;

  while ((match = pattern.exec(ctx.text)) !== null) {
    const count = match[0].length;
    if (count % 2 === 0) {
      continue;
    }
    const start = match.index;
    const end = match.index + match[0].length;

    diagnostics.push({
      range: {
        start: ctx.offsetToPosition(start),
        end: ctx.offsetToPosition(end),
      },
      message: `${spec.name}は偶数個で使用することを推奨します（現在: ${count}個）`,
      severity: DiagnosticSeverity.Information,
      code: spec.code,
    });
  }

  return diagnostics;
}

export function checkPunctuationEvenCount(
  ctx: ProofreadingRuleContext,
  config: PunctuationEvenCountConfig
): ProofreadingDiagnostic[] {
  const specs: EvenSpec[] = [];

  if (config.evenLeader) {
    specs.push({ char: '‥', name: '二点リーダ', code: 'even-leader' });
  }
  if (config.evenDash) {
    specs.push({ char: '―', name: 'ダッシュ', code: 'even-dash' });
    specs.push({ char: '—', name: 'ダッシュ', code: 'even-dash' });
  }
  if (config.evenWave) {
    specs.push({ char: '〜', name: '波線', code: 'even-wave' });
    specs.push({ char: '～', name: '波線', code: 'even-wave' });
  }

  return specs.flatMap((spec) => checkSingleChar(ctx, spec));
}

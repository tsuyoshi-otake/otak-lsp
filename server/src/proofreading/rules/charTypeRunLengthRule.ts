/**
 * 同一文字種の連続長チェック（ひらがな/カタカナ/漢字）
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { ProofreadingDiagnostic, ProofreadingRuleContext } from './proofreadingRuleTypes';

interface CharTypeSpec {
  threshold: number;
  pattern: string;
  name: string;
  code: string;
}

export interface CharTypeRunLengthConfig {
  hiragana: number;
  katakana: number;
  kanji: number;
}

function findRunLengthViolations(
  ctx: ProofreadingRuleContext,
  spec: CharTypeSpec
): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  const regex = new RegExp(`[${spec.pattern}]{${spec.threshold + 1},}`, 'g');
  let match;

  while ((match = regex.exec(ctx.text)) !== null) {
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
      message: `${spec.name}が${match[0].length}文字連続しています（閾値: ${spec.threshold}文字）`,
      severity: DiagnosticSeverity.Information,
      code: spec.code,
    });
  }

  return diagnostics;
}

export function checkCharTypeRunLength(
  ctx: ProofreadingRuleContext,
  config: CharTypeRunLengthConfig
): ProofreadingDiagnostic[] {
  const specs: CharTypeSpec[] = [];

  if (config.hiragana > 0) {
    specs.push({ threshold: config.hiragana, pattern: 'ぁ-ん', name: 'ひらがな', code: 'hiragana-run-length' });
  }
  if (config.katakana > 0) {
    specs.push({ threshold: config.katakana, pattern: 'ァ-ヴー', name: 'カタカナ', code: 'katakana-run-length' });
  }
  if (config.kanji > 0) {
    specs.push({ threshold: config.kanji, pattern: '一-龯', name: '漢字', code: 'kanji-run-length' });
  }

  return specs.flatMap((spec) => findRunLengthViolations(ctx, spec));
}

/**
 * 校正用辞書ベースのチェック
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { DictionaryEntry } from '../../dictionaries/proofreadingDictionaryLoader';
import { ProofreadingDiagnostic, ProofreadingRuleContext, escapeRegex } from './proofreadingRuleTypes';

function compilePattern(entry: DictionaryEntry): RegExp | null {
  try {
    return entry.mode === 'regex'
      ? new RegExp(entry.match, 'g')
      : new RegExp(escapeRegex(entry.match), 'g');
  } catch {
    return null;
  }
}

function buildMessage(entry: DictionaryEntry, matched: string): string {
  let message = entry.message ?? `「${matched}」が検出されました`;
  if (entry.replace) {
    message += `（推奨: 「${entry.replace}」）`;
  }
  return message;
}

export function checkDictionaryEntries(
  ctx: ProofreadingRuleContext,
  entries: DictionaryEntry[]
): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];

  for (const entry of entries) {
    const pattern = compilePattern(entry);
    if (!pattern) {
      continue;
    }

    let match;
    while ((match = pattern.exec(ctx.text)) !== null) {
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
        message: buildMessage(entry, match[0]),
        severity: DiagnosticSeverity.Information,
        code: `dictionary-${entry.category}`,
      });
    }
  }

  return diagnostics;
}

/**
 * 校正用辞書ベースのチェック
 */

import { DiagnosticSeverity } from '../../../../shared/src/types';
import { DictionaryEntry } from '../../dictionaries/proofreadingDictionaryLoader';
import { ProofreadingDiagnostic, ProofreadingRuleContext, escapeRegex } from './proofreadingRuleTypes';

/**
 * コンパイル済み RegExp のキャッシュ。
 * 辞書エントリは長期的に再利用されるため、毎回の解析サイクルで
 * `new RegExp(...)` を呼ぶコストを WeakMap で 1 回に削減する。
 *
 * - キー: DictionaryEntry オブジェクト参照
 * - 値: コンパイル成功時は RegExp、失敗時は null
 * - エントリが GC されればキャッシュも自動で解放される
 */
const compiledPatternCache: WeakMap<DictionaryEntry, RegExp | null> = new WeakMap();

function compilePattern(entry: DictionaryEntry): RegExp | null {
  const cached = compiledPatternCache.get(entry);
  if (cached !== undefined) {
    return cached;
  }

  let pattern: RegExp | null;
  try {
    pattern = entry.mode === 'regex'
      ? new RegExp(entry.match, 'g')
      : new RegExp(escapeRegex(entry.match), 'g');
  } catch {
    pattern = null;
  }

  compiledPatternCache.set(entry, pattern);
  return pattern;
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
    // キャッシュした RegExp を再利用するため lastIndex を必ず 0 に戻す
    pattern.lastIndex = 0;

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

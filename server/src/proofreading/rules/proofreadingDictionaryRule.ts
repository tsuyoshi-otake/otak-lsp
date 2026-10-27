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
    pattern = entry.match === ''
      ? null
      : entry.mode === 'regex'
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
  entries: DictionaryEntry[],
  maxDiagnostics = Number.POSITIVE_INFINITY,
  excludedRanges: readonly { start: number; end: number }[] = []
): ProofreadingDiagnostic[] {
  const diagnostics: ProofreadingDiagnostic[] = [];
  const sorted = excludedRanges.filter(range => range.start < range.end).slice().sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const isExcluded = (start: number, end: number): boolean => {
    let lo = 0;
    let hi = merged.length;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (merged[mid].end <= start) lo = mid + 1;
      else hi = mid;
    }
    return lo < merged.length && merged[lo].start < end;
  };

  for (const entry of entries) {
    const pattern = compilePattern(entry);
    if (!pattern) {
      continue;
    }
    // キャッシュした RegExp を再利用するため lastIndex を必ず 0 に戻す
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(ctx.text)) !== null) {
      if (match[0].length === 0) {
        // execはゼロ幅一致でlastIndexを進めない。括弧判定より先に進める。
        pattern.lastIndex = match.index + 1;
        continue;
      }
      const start = match.index;
      const end = match.index + match[0].length;

      if (isExcluded(start, end)) continue;

      if (!ctx.checkInBrackets && ctx.bracketDetector.isInsideBracket(start, ctx.bracketRanges)) {
        continue;
      }

      diagnostics.push({
        range: {
          start: ctx.offsetToPosition(start),
          end: ctx.offsetToPosition(end),
        },
        message: buildMessage(entry, match[0]),
        severity: entry.severity === 'warn' ? DiagnosticSeverity.Warning : DiagnosticSeverity.Information,
        code: `dictionary-${entry.category}`,
      });
      if (diagnostics.length >= maxDiagnostics) return diagnostics;
    }
  }

  return diagnostics;
}

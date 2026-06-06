/**
 * 範囲スイープユーティリティ
 *
 * ソート済み区間（半開区間 [start, end)）に対する O(N+R) のスイープ操作を提供する。
 * 「ある位置・区間が除外範囲に含まれるか」「重なるか」「重なる要素のみを残す/除く」を
 * 個別ルールで実装すると O(N×R) になりがちなため、共通化して O(N+R) に揃える。
 *
 * 設計方針:
 * - 入力の不変性: 元配列をその場で並べ替えない（必要なら浅いコピーを作って sort）
 * - 半開区間 [start, end) で統一
 * - 「重なり (overlap)」と「完全包含 (containment)」を別 API で表現
 */

export interface Range {
  readonly start: number;
  readonly end: number;
}

/**
 * 範囲配列を start 昇順かつ重なり/隣接マージ済みの形に正規化する。
 *
 * - 不正な範囲（start >= end）はスキップ
 * - 元配列は変更しない（浅いコピーを作って sort）
 * - 戻り値の各要素は `{ start, end }` のみ。type 等のメタ情報は失われるので、
 *   メタを保ちたい場合は呼び出し側で type ごとに分けてから本関数を呼ぶ
 *
 * 計算量: O(R log R)（既にソート済みなら sort は実質 O(R) で抜ける）
 */
export function normalizeRanges<R extends Range>(ranges: readonly R[]): Range[] {
  if (ranges.length === 0) {
    return [];
  }

  const filtered: Range[] = [];
  for (const r of ranges) {
    if (r.start < r.end) {
      filtered.push({ start: r.start, end: r.end });
    }
  }
  if (filtered.length === 0) {
    return [];
  }

  let isSorted = true;
  for (let i = 1; i < filtered.length; i++) {
    if (filtered[i - 1].start > filtered[i].start) {
      isSorted = false;
      break;
    }
  }
  if (!isSorted) {
    filtered.sort((a, b) => a.start - b.start);
  }

  const merged: { start: number; end: number }[] = [];
  for (const range of filtered) {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end) {
      merged.push({ start: range.start, end: range.end });
      continue;
    }
    if (range.end > last.end) {
      last.end = range.end;
    }
  }

  return merged;
}

/**
 * ソート済み（=正規化済み）範囲配列に対し、指定区間 `[start, end)` が
 * いずれかの範囲と「重なる (overlap)」かを O(log R) で判定する。
 *
 * - 重なりの定義: `start < range.end && end > range.start`
 * - 長さ 0 の点判定にしたい場合は `anyRangeContainsPoint` を使う
 */
export function anyRangeOverlaps(
  sortedMergedRanges: readonly Range[],
  start: number,
  end: number
): boolean {
  if (sortedMergedRanges.length === 0 || start >= end) {
    return false;
  }

  // start 以下で最大の range.start を持つ要素を二分探索
  let low = 0;
  let high = sortedMergedRanges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sortedMergedRanges[mid].start <= start) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  if (high >= 0 && sortedMergedRanges[high].end > start) {
    return true;
  }
  if (low < sortedMergedRanges.length && sortedMergedRanges[low].start < end) {
    return true;
  }
  return false;
}

/**
 * 点 `position` がいずれかの範囲に「完全包含 (containment)」されるかを判定する。
 * - 包含の定義: `range.start <= position < range.end`
 *
 * 計算量: O(log R)
 */
export function anyRangeContainsPoint(
  sortedMergedRanges: readonly Range[],
  position: number
): boolean {
  if (sortedMergedRanges.length === 0) {
    return false;
  }

  let low = 0;
  let high = sortedMergedRanges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sortedMergedRanges[mid].start <= position) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return high >= 0 && sortedMergedRanges[high].end > position;
}

/**
 * 区間 `[itemStart, itemEnd)` がいずれかの範囲に「完全包含」されるかを判定する。
 * - 包含の定義: `range.start <= itemStart && itemEnd <= range.end`
 *
 * 計算量: O(log R)
 */
export function anyRangeContainsItem(
  sortedMergedRanges: readonly Range[],
  itemStart: number,
  itemEnd: number
): boolean {
  if (sortedMergedRanges.length === 0 || itemStart > itemEnd) {
    return false;
  }

  let low = 0;
  let high = sortedMergedRanges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (sortedMergedRanges[mid].start <= itemStart) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return high >= 0 && sortedMergedRanges[high].end >= itemEnd;
}

/**
 * オフセット昇順の項目群と、ソート済み（=正規化済み）範囲を同時に走査して
 * 「範囲のいずれかと重なる項目」を判定するスイープフィルタ。
 *
 * 計算量: O(N + R) （items が start 昇順の場合）。
 *         start 昇順でない場合は O(N log R) で安全側にフォールバックする。
 *
 * @param items 各項目（start, end）
 * @param sortedMergedRanges normalizeRanges 済みの範囲配列
 * @param keepOverlapping true なら重なる項目を残す。false なら重ならない項目を残す
 */
export function sweepFilterByOverlap<T extends { start: number; end: number }>(
  items: readonly T[],
  sortedMergedRanges: readonly Range[],
  keepOverlapping: boolean
): T[] {
  if (items.length === 0) {
    return [];
  }
  if (sortedMergedRanges.length === 0) {
    return keepOverlapping ? [] : items.slice();
  }

  if (!isMonotonicByStart(items)) {
    return items.filter((item) => {
      const overlaps = anyRangeOverlaps(sortedMergedRanges, item.start, item.end);
      return overlaps === keepOverlapping;
    });
  }

  const result: T[] = [];
  let rangeIndex = 0;

  for (const item of items) {
    while (
      rangeIndex < sortedMergedRanges.length &&
      sortedMergedRanges[rangeIndex].end <= item.start
    ) {
      rangeIndex++;
    }
    const current = sortedMergedRanges[rangeIndex];
    const overlaps = !!current && item.start < current.end && item.end > current.start;
    if (overlaps === keepOverlapping) {
      result.push(item);
    }
  }
  return result;
}

/**
 * 「項目区間 [item.start, item.end) がいずれかの範囲に完全包含されるか」で
 * O(N + R) フィルタリングする。
 *
 * - 用途: documentAnalyzer のコメント token フィルタ等、
 *   「コメント範囲に完全に収まる token のみ残す」セマンティクスを再現する
 * - items が start 昇順なら O(N + R)。順序がない場合は O(N log R) フォールバック
 *
 * @param keepContained true: 包含される項目を残す。false: 包含されない項目を残す
 */
export function sweepFilterByContainment<T extends { start: number; end: number }>(
  items: readonly T[],
  sortedMergedRanges: readonly Range[],
  keepContained: boolean
): T[] {
  if (items.length === 0) {
    return [];
  }
  if (sortedMergedRanges.length === 0) {
    return keepContained ? [] : items.slice();
  }

  if (!isMonotonicByStart(items)) {
    return items.filter((item) => {
      const contained = anyRangeContainsItem(sortedMergedRanges, item.start, item.end);
      return contained === keepContained;
    });
  }

  const result: T[] = [];
  let rangeIndex = 0;

  for (const item of items) {
    while (
      rangeIndex < sortedMergedRanges.length &&
      sortedMergedRanges[rangeIndex].end <= item.start
    ) {
      rangeIndex++;
    }
    const current = sortedMergedRanges[rangeIndex];
    const contained =
      !!current && current.start <= item.start && item.end <= current.end;
    if (contained === keepContained) {
      result.push(item);
    }
  }
  return result;
}

function isMonotonicByStart<T extends { start: number }>(items: readonly T[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (items[i - 1].start > items[i].start) {
      return false;
    }
  }
  return true;
}

/**
 * テキストに対して「指定した keep 範囲だけ原文を残し、他は置換文字（既定: 空白）にする」
 * 操作を O(N) で行う。改行と preserveChars は常に保持し、長さは変えない。
 *
 * 既存実装の `text.split('')` は N 個の小文字列を heap に積むため
 * 巨大文書で GC 圧が増える。本実装は配列を介さず 1 出力バッファに書き出す。
 */
export function buildMaskedTextByKeepRanges(
  text: string,
  keepRanges: readonly Range[],
  preserveChars?: ReadonlySet<string>,
  fillChar: string = ' '
): string {
  if (text.length === 0) {
    return '';
  }
  const merged = normalizeRanges(keepRanges);
  return buildMaskedTextInternal(text, merged, /* keepInsideMerged */ true, preserveChars, fillChar);
}

/**
 * テキストに対して「指定した mask 範囲を置換文字にする」操作を O(N) で行う。
 * 改行と preserveChars は常に保持し、長さは変えない。
 *
 * - `keepOnlyCommentRanges` は keep 用、`maskTableContent` は mask 用。
 *   旧実装と挙動を完全に揃えるため API を分ける。
 */
export function buildMaskedTextByMaskRanges(
  text: string,
  maskRanges: readonly Range[],
  preserveChars?: ReadonlySet<string>,
  fillChar: string = ' '
): string {
  if (text.length === 0) {
    return '';
  }
  const merged = normalizeRanges(maskRanges);
  return buildMaskedTextInternal(text, merged, /* keepInsideMerged */ false, preserveChars, fillChar);
}

function buildMaskedTextInternal(
  text: string,
  merged: readonly Range[],
  keepInsideMerged: boolean,
  preserveChars: ReadonlySet<string> | undefined,
  fillChar: string
): string {
  const out: string[] = [];
  let cursor = 0;

  const emitKeep = (from: number, to: number): void => {
    if (from < to) {
      out.push(text.slice(from, to));
    }
  };
  const emitMask = (from: number, to: number): void => {
    if (from < to) {
      out.push(fillSegment(text, from, to, preserveChars, fillChar));
    }
  };

  for (const range of merged) {
    const start = clamp(range.start, 0, text.length);
    const end = clamp(range.end, start, text.length);

    if (cursor < start) {
      if (keepInsideMerged) {
        emitMask(cursor, start);
      } else {
        emitKeep(cursor, start);
      }
    }

    if (keepInsideMerged) {
      emitKeep(start, end);
    } else {
      emitMask(start, end);
    }

    cursor = end;
  }
  if (cursor < text.length) {
    if (keepInsideMerged) {
      emitMask(cursor, text.length);
    } else {
      emitKeep(cursor, text.length);
    }
  }

  return out.join('');
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

/**
 * `[from, to)` 区間を置換文字で塗りつぶす。
 * 改行と preserveChars に該当する文字は原文を保持する。
 * 改行/保持文字を含まない区間は `fillChar.repeat(len)` で 1 回の割当で済ませる。
 */
function fillSegment(
  text: string,
  from: number,
  to: number,
  preserveChars: ReadonlySet<string> | undefined,
  fillChar: string
): string {
  const len = to - from;
  if (len <= 0) {
    return '';
  }

  let hasPreserved = false;
  for (let i = from; i < to; i++) {
    const ch = text[i];
    if (ch === '\n' || ch === '\r' || (preserveChars && preserveChars.has(ch))) {
      hasPreserved = true;
      break;
    }
  }
  if (!hasPreserved) {
    return fillChar.repeat(len);
  }

  const buf: string[] = [];
  let runStart = from;
  for (let i = from; i < to; i++) {
    const ch = text[i];
    const isPreserved =
      ch === '\n' || ch === '\r' || (preserveChars !== undefined && preserveChars.has(ch));
    if (isPreserved) {
      if (i > runStart) {
        buf.push(fillChar.repeat(i - runStart));
      }
      buf.push(ch);
      runStart = i + 1;
    }
  }
  if (runStart < to) {
    buf.push(fillChar.repeat(to - runStart));
  }
  return buf.join('');
}

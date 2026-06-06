/**
 * 括弧範囲検出器
 * Feature: proofreading-settings-compat
 * タスク5: 括弧内チェックの制御
 *
 * 括弧内範囲の検出と除外を行う
 */

/**
 * 括弧の種類
 */
export type BracketType =
  | 'round'        // 全角丸括弧 （）
  | 'round-half'   // 半角丸括弧 ()
  | 'corner'       // 鉤括弧 「」
  | 'double-corner' // 二重鉤括弧 『』
  | 'square'       // 角括弧 【】
  | 'square-half'; // 半角角括弧 []

/**
 * 括弧の範囲情報
 */
export interface BracketRange {
  /** 開始位置（開き括弧の位置） */
  start: number;
  /** 終了位置（閉じ括弧の次の位置） */
  end: number;
  /** 括弧の種類 */
  type: BracketType;
  /** ネストの深さ（0が最外側） */
  depth: number;
}

/**
 * 内側の範囲情報
 */
export interface InnerRange {
  /** 開始位置（開き括弧の次の位置） */
  start: number;
  /** 終了位置（閉じ括弧の位置） */
  end: number;
}

/**
 * 括弧ペアの定義
 */
interface BracketPair {
  open: string;
  close: string;
  type: BracketType;
}

const BRACKET_PAIRS: BracketPair[] = [
  { open: '（', close: '）', type: 'round' },
  { open: '(', close: ')', type: 'round-half' },
  { open: '「', close: '」', type: 'corner' },
  { open: '『', close: '』', type: 'double-corner' },
  { open: '【', close: '】', type: 'square' },
  { open: '[', close: ']', type: 'square-half' },
];

// 文字 → 括弧ペアの逆引きを 1 度だけ作っておく。
// 旧 detect() は 1 文字ごとに BRACKET_PAIRS を線形走査していたため O(N × 6) だった。
const OPEN_TO_PAIR: Map<string, BracketPair> = new Map(
  BRACKET_PAIRS.map((p) => [p.open, p])
);
const CLOSE_TO_PAIR: Map<string, BracketPair> = new Map(
  BRACKET_PAIRS.map((p) => [p.close, p])
);

/**
 * 「ranges[0..i] のうち最大の end」配列のキャッシュ。
 * isInsideBracket を O(log R) に落とすために使う。
 *
 * - キーは detect() が返す BracketRange[] の参照（解析サイクル単位で新規作成）
 * - WeakMap なので解析サイクル終了とともに GC される
 */
const MAX_END_PREFIX_CACHE: WeakMap<BracketRange[], number[]> = new WeakMap();

/**
 * ranges (start 昇順) に対して maxEndPrefix[i] = max(ranges[0..i].end) を構築する。
 * Returns a cached array if available, otherwise computes and caches it.
 */
function getMaxEndPrefix(ranges: BracketRange[]): number[] {
  const cached = MAX_END_PREFIX_CACHE.get(ranges);
  if (cached) {
    return cached;
  }
  const out = new Array<number>(ranges.length);
  let maxSoFar = -1;
  for (let i = 0; i < ranges.length; i++) {
    const e = ranges[i].end;
    if (e > maxSoFar) {
      maxSoFar = e;
    }
    out[i] = maxSoFar;
  }
  MAX_END_PREFIX_CACHE.set(ranges, out);
  return out;
}

/**
 * 括弧範囲検出器クラス
 */
export class BracketRangeDetector {
  /**
   * テキスト内の括弧範囲を検出
   * @param text テキスト
   * @returns 括弧範囲のリスト
   */
  detect(text: string): BracketRange[] {
    const ranges: BracketRange[] = [];
    const stacks: Map<BracketType, { pos: number; depth: number }[]> = new Map();

    // スタックを初期化
    for (const pair of BRACKET_PAIRS) {
      stacks.set(pair.type, []);
    }

    let globalDepth = 0;

    // 1 文字ごとに OPEN_TO_PAIR / CLOSE_TO_PAIR で O(1) 検索する。
    // 旧実装は BRACKET_PAIRS を毎文字なめており O(N × 6) だった。
    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      const openPair = OPEN_TO_PAIR.get(char);
      if (openPair) {
        const stack = stacks.get(openPair.type)!;
        stack.push({ pos: i, depth: globalDepth });
        globalDepth++;
        continue;
      }

      const closePair = CLOSE_TO_PAIR.get(char);
      if (closePair) {
        const stack = stacks.get(closePair.type)!;
        if (stack.length > 0) {
          const openInfo = stack.pop()!;
          globalDepth = Math.max(0, globalDepth - 1);
          ranges.push({
            start: openInfo.pos,
            end: i + 1,
            type: closePair.type,
            depth: openInfo.depth
          });
        }
      }
    }

    // 開始位置でソート
    ranges.sort((a, b) => a.start - b.start);

    return ranges;
  }

  /**
   * 指定位置が括弧内かどうかを判定
   *
   * 旧実装は O(R) の線形走査だった。ranges は start 昇順なので、
   * 「start < position - 1 を満たす最大の i」を二分探索し、
   * maxEndPrefix[i] が end > position + 1 を満たすかで O(log R) に圧縮する。
   *
   * 包含条件は旧実装と同一: `position > range.start && position < range.end - 1`
   * （つまり `range.start < position && position + 1 < range.end`）
   *
   * @param position 位置
   * @param ranges 括弧範囲のリスト（start 昇順を想定）
   * @returns 括弧内ならtrue
   */
  isInsideBracket(position: number, ranges: BracketRange[]): boolean {
    if (ranges.length === 0) {
      return false;
    }

    // range.start < position を満たす最大の i を二分探索
    let low = 0;
    let high = ranges.length - 1;
    let idx = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (ranges[mid].start < position) {
        idx = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (idx < 0) {
      return false;
    }

    // ranges[0..idx] のいずれかの end が position + 1 より大きければ「中にある」
    const maxEndPrefix = getMaxEndPrefix(ranges);
    return maxEndPrefix[idx] > position + 1;
  }

  /**
   * 括弧を除いた内側の範囲を取得
   * @param ranges 括弧範囲のリスト
   * @returns 内側の範囲のリスト
   */
  getInnerRanges(ranges: BracketRange[]): InnerRange[] {
    return ranges.map(range => ({
      start: range.start + 1,
      end: range.end - 1
    }));
  }

  /**
   * 括弧内の位置をフィルタ
   * @param positions 位置のリスト
   * @param ranges 括弧範囲のリスト
   * @param excludeBracketContent trueの場合、括弧内の位置を除外
   * @returns フィルタ後の位置のリスト
   */
  filterPositions(
    positions: number[],
    ranges: BracketRange[],
    excludeBracketContent: boolean
  ): number[] {
    if (!excludeBracketContent) {
      return positions;
    }

    return positions.filter(pos => !this.isInsideBracket(pos, ranges));
  }
}

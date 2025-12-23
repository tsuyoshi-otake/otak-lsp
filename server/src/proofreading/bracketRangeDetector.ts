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

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      for (const pair of BRACKET_PAIRS) {
        if (char === pair.open) {
          const stack = stacks.get(pair.type)!;
          stack.push({ pos: i, depth: globalDepth });
          globalDepth++;
        } else if (char === pair.close) {
          const stack = stacks.get(pair.type)!;
          if (stack.length > 0) {
            const openInfo = stack.pop()!;
            globalDepth = Math.max(0, globalDepth - 1);
            ranges.push({
              start: openInfo.pos,
              end: i + 1,
              type: pair.type,
              depth: openInfo.depth
            });
          }
        }
      }
    }

    // 開始位置でソート
    ranges.sort((a, b) => a.start - b.start);

    return ranges;
  }

  /**
   * 指定位置が括弧内かどうかを判定
   * @param position 位置
   * @param ranges 括弧範囲のリスト
   * @returns 括弧内ならtrue
   */
  isInsideBracket(position: number, ranges: BracketRange[]): boolean {
    for (const range of ranges) {
      if (position > range.start && position < range.end - 1) {
        return true;
      }
    }
    return false;
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

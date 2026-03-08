/**
 * 行開始位置ユーティリティ
 *
 * テキスト内の各行の開始オフセットを計算し、
 * オフセットから行/文字位置への変換を提供する。
 * プロジェクト全体で共通利用される。
 */

/**
 * テキストから各行の開始オフセット配列を計算する
 *
 * @param text - 対象テキスト
 * @returns 各行の開始オフセット配列（先頭は常に0）
 */
export function computeLineStarts(text: string): number[] {
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}

/**
 * オフセットから行番号と文字位置を計算する（二分探索）
 *
 * @param lineStarts - computeLineStartsで計算した行開始位置配列
 * @param offset - 文字オフセット
 * @returns 行番号と文字位置
 */
export function offsetToLineAndCharacter(
  lineStarts: number[],
  offset: number
): { line: number; character: number } {
  if (lineStarts.length === 0) {
    return { line: 0, character: offset };
  }

  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (lineStarts[mid] <= offset) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const line = Math.max(0, high);
  return { line, character: offset - lineStarts[line] };
}

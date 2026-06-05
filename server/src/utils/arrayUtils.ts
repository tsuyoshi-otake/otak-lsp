/**
 * 配列ユーティリティ
 *
 * 配列操作の共通ヘルパー関数を提供する
 */

/**
 * 配列が空かどうかを判定
 *
 * @param arr - チェックする配列
 * @returns 配列が空の場合true
 */
export function isEmpty<T>(arr: T[] | null | undefined): boolean {
  return !arr || arr.length === 0;
}

/**
 * 配列が空でないかどうかを判定
 *
 * @param arr - チェックする配列
 * @returns 配列が空でない場合true
 */
export function isNotEmpty<T>(arr: T[] | null | undefined): arr is T[] {
  return !!arr && arr.length > 0;
}

/**
 * オブジェクトが空でない（プロパティを持つ）かどうかを判定
 *
 * @param obj - チェックするオブジェクト
 * @returns オブジェクトが空でない場合true
 */
export function isNotEmptyObject(obj: object | null | undefined): boolean {
  return !!obj && Object.keys(obj).length > 0;
}

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
export function isNotEmpty<T>(arr: T[] | null | undefined): boolean {
  return !!arr && arr.length > 0;
}

/**
 * 配列から重複を除去
 * 
 * @param arr - 対象配列
 * @returns 重複を除去した新しい配列
 */
export function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/**
 * 配列を安全に取得（nullやundefinedの場合は空配列を返す）
 * 
 * @param arr - 対象配列
 * @returns 配列または空配列
 */
export function safeArray<T>(arr: T[] | null | undefined): T[] {
  return arr ?? [];
}

/**
 * 配列の最初の要素を取得
 * 
 * @param arr - 対象配列
 * @returns 最初の要素またはundefined
 */
export function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

/**
 * 配列の最後の要素を取得
 * 
 * @param arr - 対象配列
 * @returns 最後の要素またはundefined
 */
export function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

/**
 * 配列を指定サイズのチャンクに分割
 * 
 * @param arr - 対象配列
 * @param size - チャンクサイズ
 * @returns チャンクの配列
 */
export function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * 配列から条件に一致する要素を検索し、見つからない場合はデフォルト値を返す
 * 
 * @param arr - 対象配列
 * @param predicate - 検索条件
 * @param defaultValue - デフォルト値
 * @returns 見つかった要素またはデフォルト値
 */
export function findOrDefault<T>(
  arr: T[],
  predicate: (item: T) => boolean,
  defaultValue: T
): T {
  return arr.find(predicate) ?? defaultValue;
}

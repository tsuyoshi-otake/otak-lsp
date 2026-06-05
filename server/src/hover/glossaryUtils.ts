/**
 * 用語図鑑のユーティリティ関数
 */

/**
 * 検索キーの正規化（NFKC正規化 + 連続空白を1つに + trim + 小文字化）
 */
export function normalizeKey(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

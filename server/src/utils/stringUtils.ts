/**
 * 文字列ユーティリティ
 *
 * 文字列操作の共通ヘルパー関数を提供する
 */

/**
 * 文字列が空または空白のみかどうかを判定
 *
 * @param str - チェックする文字列
 * @returns 空または空白のみの場合true
 */
export function isBlank(str: string | null | undefined): boolean {
  return !str || str.trim().length === 0;
}

/**
 * 文字列が空でなく、空白以外の文字を含むかどうかを判定
 *
 * @param str - チェックする文字列
 * @returns 空白以外の文字を含む場合true
 */
export function isNotBlank(str: string | null | undefined): boolean {
  return !!str && str.trim().length > 0;
}

/**
 * 文字列を改行で分割
 *
 * @param text - 分割する文字列
 * @returns 行の配列
 */
export function splitLines(text: string): string[] {
  return text.split('\n');
}

/**
 * 文字列が指定された最小長以上かどうかを判定
 *
 * @param str - チェックする文字列
 * @param minLength - 最小長
 * @returns 最小長以上の場合true
 */
export function hasMinLength(str: string, minLength: number): boolean {
  return str.trim().length >= minLength;
}

/**
 * カンマ区切りの文字列を配列に分割し、各要素をトリム
 *
 * @param str - カンマ区切りの文字列
 * @returns トリムされた要素の配列
 */
export function splitAndTrimCommas(str: string): string[] {
  return str.split(',').map(s => s.trim()).filter(s => isNotBlank(s));
}

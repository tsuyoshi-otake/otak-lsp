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
 * 文字列を改行で分割し、各行をトリム
 * 
 * @param text - 分割する文字列
 * @returns トリムされた行の配列
 */
export function splitAndTrimLines(text: string): string[] {
  return text.split('\n').map(line => line.trim());
}

/**
 * 文字列を改行で分割し、空行を除外
 * 
 * @param text - 分割する文字列
 * @returns 空行を除いた行の配列
 */
export function splitNonEmptyLines(text: string): string[] {
  return text.split('\n').filter(line => isNotBlank(line));
}

/**
 * 文字列を正規化（NFKC正規化 + 空白正規化 + トリム）
 * 
 * @param str - 正規化する文字列
 * @returns 正規化された文字列
 */
export function normalizeWhitespace(str: string): string {
  return str.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * 文字列を正規化して小文字に変換
 * 
 * @param str - 正規化する文字列
 * @returns 正規化され小文字に変換された文字列
 */
export function normalizeAndLowerCase(str: string): string {
  return str.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * 文字列の末尾から句読点を除去
 * 
 * @param str - 対象文字列
 * @returns 句読点を除去した文字列
 */
export function removePunctuation(str: string): string {
  return str.trim().replace(/[。！？!?]$/, '');
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

/**
 * 文字列を指定された区切り文字で分割し、各要素をトリム
 * 
 * @param str - 分割する文字列
 * @param separator - 区切り文字（正規表現）
 * @returns トリムされた要素の配列
 */
export function splitAndTrim(str: string, separator: string | RegExp): string[] {
  return str.split(separator).map(s => s.trim()).filter(s => isNotBlank(s));
}

/**
 * 文字列の先頭と末尾の空白を除去（null安全）
 * 
 * @param str - トリムする文字列
 * @returns トリムされた文字列、nullまたはundefinedの場合は空文字列
 */
export function safeTrim(str: string | null | undefined): string {
  return str?.trim() ?? '';
}

/**
 * 複数の文字列を結合し、空白で区切る（空文字列は除外）
 * 
 * @param parts - 結合する文字列の配列
 * @returns 結合された文字列
 */
export function joinNonEmpty(parts: (string | null | undefined)[]): string {
  return parts.filter(p => isNotBlank(p)).join(' ');
}

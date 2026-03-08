/**
 * 正規表現パターンユーティリティ
 * 
 * プロジェクト全体で使用される共通の正規表現パターンを提供する
 */

/**
 * Markdownコードブロックパターン（```...```）
 */
export const CODE_BLOCK_PATTERN = /```[\s\S]*?```/g;

/**
 * Markdownインラインコードパターン（`...`）
 */
export const INLINE_CODE_PATTERN = /`[^`\n]+`/g;

/**
 * 日本語文字パターン（ひらがな、カタカナ、漢字）
 */
export const JAPANESE_CHAR_PATTERN = /[ぁ-んァ-ン一-龠]/;

/**
 * 英数字トークンパターン（技術用語向け）
 */
export const TERM_TOKEN_PATTERN = /[A-Za-z0-9.+#/_:-]+/g;

/**
 * 英単語セグメントパターン
 */
export const WORD_SEGMENT_PATTERN = /[A-Za-z0-9_]+/g;

/**
 * 全角数字パターン
 */
export const FULLWIDTH_NUMBER_PATTERN = /[０-９]+/g;

/**
 * 半角数字パターン
 */
export const HALFWIDTH_NUMBER_PATTERN = /[0-9]+/g;

/**
 * 漢数字パターン
 */
export const KANJI_NUMERAL_PATTERN = /[〇零一壱二弐三参四五六七八九十百千万億]+/g;

/**
 * 全角中黒パターン
 */
export const FULLWIDTH_NAKAGURO_PATTERN = /・{2,}/g;

/**
 * 半角中黒パターン
 */
export const HALFWIDTH_NAKAGURO_PATTERN = /･{2,}/g;

/**
 * 中黒混在パターン
 */
export const MIXED_NAKAGURO_PATTERN = /[・･]{2,}/g;

/**
 * 文末記号パターン
 */
export const SENTENCE_ENDING_PATTERN = /(?:です|ます|である|であります|だった|でした|であった|だ|とする|という)$/;

/**
 * 文末句読点パターン
 */
export const END_PUNCTUATION_PATTERN = /([。！？!?])\s*$/;

/**
 * 文分割の終端記号パターン
 */
export const SENTENCE_TERMINATORS = /[。！？!?]/;

/**
 * 段落区切り（空行）パターン
 */
export const PARAGRAPH_BREAK = /\n\s*\n/;

/**
 * 正規表現パターンを複製（グローバルフラグをリセット）
 * 
 * @param pattern - 複製する正規表現
 * @returns 新しい正規表現インスタンス
 */
export function cloneRegex(pattern: RegExp): RegExp {
  return new RegExp(pattern.source, pattern.flags);
}

/**
 * テキスト内のコードブロック範囲を検出
 * 
 * @param text - 対象テキスト
 * @returns コードブロックの範囲配列
 */
export function findCodeBlockRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const regex = cloneRegex(CODE_BLOCK_PATTERN);
  let match;
  while ((match = regex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

/**
 * テキスト内のインラインコード範囲を検出
 * 
 * @param text - 対象テキスト
 * @returns インラインコードの範囲配列
 */
export function findInlineCodeRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  const regex = cloneRegex(INLINE_CODE_PATTERN);
  let match;
  while ((match = regex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

/**
 * テキストに日本語文字が含まれているかチェック
 * 
 * @param text - チェックするテキスト
 * @returns 日本語文字が含まれている場合true
 */
export function containsJapanese(text: string): boolean {
  return JAPANESE_CHAR_PATTERN.test(text);
}

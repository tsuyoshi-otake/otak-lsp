/**
 * 文解析ユーティリティ
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 9.4
 */

import { Sentence } from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Token } from '../../../shared/src/types';
import { parseTextIntoSentences, SentenceSplitMode } from './sentenceSplitter';

/**
 * 文解析ユーティリティクラス
 * 既存APIを保ち、実際の文分割は機能別モジュールへ委譲する
 */
export class SentenceParser {
  /**
   * テキストを文に分割
   * @param text 解析対象のテキスト
   * @param tokens トークンリスト
   * @param excludedRanges Markdown除外範囲（MarkdownFilterの結果）
   * @param splitMode 文分割モード（'strict' | 'normal' | 'loose'）
   * @returns 文のリスト
   */
  static parseSentences(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    splitMode: SentenceSplitMode = 'normal'
  ): Sentence[] {
    return parseTextIntoSentences(text, tokens, excludedRanges, splitMode);
  }

  /**
   * テキストから読点の数をカウント
   * @param text テキスト
   * @returns 読点の数
   */
  static countCommas(text: string): number {
    return (text.match(/、/g) ?? []).length;
  }
}

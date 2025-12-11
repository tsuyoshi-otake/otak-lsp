/**
 * 文解析ユーティリティ
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 9.4
 */

import { Token } from '../../../shared/src/types';
import { Sentence } from '../../../shared/src/advancedTypes';

/**
 * 文分割の終端記号
 */
const SENTENCE_TERMINATORS = /[。！？!?]/;

/**
 * 文解析ユーティリティクラス
 * テキストを文単位に分割し、各文にトークンを割り当てる
 */
export class SentenceParser {
  /**
   * テキストを文に分割
   * @param text 解析対象のテキスト
   * @param tokens トークンリスト
   * @returns 文のリスト
   */
  static parseSentences(text: string, tokens: Token[]): Sentence[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences: Sentence[] = [];
    let currentStart = 0;
    let lastSentenceEnd = 0;

    for (let i = 0; i < text.length; i++) {
      if (SENTENCE_TERMINATORS.test(text[i])) {
        // 連続する終端記号をスキップ
        while (i + 1 < text.length && SENTENCE_TERMINATORS.test(text[i + 1])) {
          i++;
        }

        const sentenceText = text.substring(currentStart, i + 1);

        // 空白のみの文はスキップ
        if (sentenceText.trim().length > 0) {
          const sentenceTokens = SentenceParser.getTokensInRange(
            tokens,
            currentStart,
            i + 1
          );

          sentences.push(new Sentence({
            text: sentenceText,
            tokens: sentenceTokens,
            start: currentStart,
            end: i + 1
          }));
        }

        currentStart = i + 1;
        lastSentenceEnd = i + 1;
      }
    }

    // 最後の文（終端記号なし）
    if (currentStart < text.length) {
      const remainingText = text.substring(currentStart);
      if (remainingText.trim().length > 0) {
        const sentenceTokens = SentenceParser.getTokensInRange(
          tokens,
          currentStart,
          text.length
        );

        sentences.push(new Sentence({
          text: remainingText,
          tokens: sentenceTokens,
          start: currentStart,
          end: text.length
        }));
      }
    }

    return sentences;
  }

  /**
   * 指定範囲内のトークンを取得
   * @param tokens トークンリスト
   * @param start 開始位置
   * @param end 終了位置
   * @returns 範囲内のトークン
   */
  private static getTokensInRange(tokens: Token[], start: number, end: number): Token[] {
    return tokens.filter(token => token.start >= start && token.end <= end);
  }

  /**
   * テキストから読点の数をカウント
   * @param text テキスト
   * @returns 読点の数
   */
  static countCommas(text: string): number {
    return (text.match(/、/g) || []).length;
  }
}

/**
 * Token Filter
 * 除外範囲内のトークンをフィルタリングする機能
 * Feature: semantic-highlight-fix
 * 要件: 2.1, 2.2, 2.3
 */

import { Token } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

/**
 * トークンフィルタークラス
 * 除外範囲（コードブロック、テーブル、URL等）内のトークンを除外する
 */
export class TokenFilter {
  /**
   * 除外範囲内のトークンをフィルタリング
   * @param tokens トークンリスト
   * @param excludedRanges 除外範囲リスト
   * @returns フィルタリングされたトークンリスト
   */
  filterTokens(tokens: Token[], excludedRanges: ExcludedRange[]): Token[] {
    if (tokens.length === 0) {
      return [];
    }

    if (excludedRanges.length === 0) {
      return [...tokens];
    }

    // 有効な除外範囲のみを使用（start < end）
    const validRanges = excludedRanges.filter(range => range.start < range.end);

    return tokens.filter(token => !this.isTokenInExcludedRange(token, validRanges));
  }

  /**
   * トークンが除外範囲内にあるかチェック
   * トークンが除外範囲と部分的にでも重複していればtrue
   * @param token トークン
   * @param excludedRanges 除外範囲リスト
   * @returns 除外範囲内の場合true
   */
  isTokenInExcludedRange(token: Token, excludedRanges: ExcludedRange[]): boolean {
    if (excludedRanges.length === 0) {
      return false;
    }

    return excludedRanges.some(range => {
      // 有効な範囲チェック（start < end）
      if (range.start >= range.end) {
        return false;
      }

      // トークンと除外範囲が重複しているか確認
      // 重複条件: token.start < range.end && token.end > range.start
      return token.start < range.end && token.end > range.start;
    });
  }
}

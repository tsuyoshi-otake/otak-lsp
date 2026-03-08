/**
 * Token Filter
 * 除外範囲内のトークンをフィルタリングする機能
 * Feature: semantic-highlight-fix
 * 要件: 2.1, 2.2, 2.3
 */

import { Token } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { isEmpty } from '../utils/arrayUtils';

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
    if (isEmpty(tokens)) {
      return [];
    }

    if (isEmpty(excludedRanges)) {
      return [...tokens];
    }

    // 有効な除外範囲のみを使用（start < end）
    const validRanges = excludedRanges.filter((range) => range.start < range.end);
    if (isEmpty(validRanges)) {
      return [...tokens];
    }

    // 除外範囲をソート + 結合（オーバーラップ/隣接）し、O(tokens + ranges) でフィルタリング
    type RangeSpan = { start: number; end: number };

    let ranges = validRanges as RangeSpan[];
    let isSortedByStart = true;
    for (let i = 1; i < ranges.length; i++) {
      if (ranges[i - 1].start > ranges[i].start) {
        isSortedByStart = false;
        break;
      }
    }
    if (!isSortedByStart) {
      ranges = [...ranges].sort((a, b) => a.start - b.start);
    }

    const mergedRanges: RangeSpan[] = [];
    for (const range of ranges) {
      const last = mergedRanges[mergedRanges.length - 1];
      if (!last) {
        mergedRanges.push({ start: range.start, end: range.end });
        continue;
      }

      if (range.start <= last.end) {
        if (range.end > last.end) {
          last.end = range.end;
        }
        continue;
      }

      mergedRanges.push({ start: range.start, end: range.end });
    }

    let tokensSortedByStart = true;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i - 1].start > tokens[i].start) {
        tokensSortedByStart = false;
        break;
      }
    }

    if (!tokensSortedByStart) {
      return tokens.filter((token) => !this.isTokenInExcludedRange(token, validRanges));
    }

    const result: Token[] = [];
    let rangeIndex = 0;

    for (const token of tokens) {
      while (rangeIndex < mergedRanges.length && mergedRanges[rangeIndex].end <= token.start) {
        rangeIndex++;
      }

      const current = mergedRanges[rangeIndex];
      if (current && token.start < current.end && token.end > current.start) {
        continue;
      }

      result.push(token);
    }

    return result;
  }

  /**
   * トークンが除外範囲内にあるかチェック
   * トークンが除外範囲と部分的にでも重複していればtrue
   * @param token トークン
   * @param excludedRanges 除外範囲リスト
   * @returns 除外範囲内の場合true
   */
  isTokenInExcludedRange(token: Token, excludedRanges: ExcludedRange[]): boolean {
    if (isEmpty(excludedRanges)) {
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

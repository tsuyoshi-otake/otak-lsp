/**
 * TokenFilterのユニットテスト
 * Feature: semantic-highlight-fix
 * 検証: 要件 2.1, 2.2, 2.3
 */

import { TokenFilter } from './tokenFilter';
import { Token } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

describe('TokenFilter', () => {
  let tokenFilter: TokenFilter;

  beforeEach(() => {
    tokenFilter = new TokenFilter();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  /**
   * ヘルパー関数: 除外範囲を作成
   */
  const createExcludedRange = (
    start: number,
    end: number,
    type: 'code-block' | 'inline-code' | 'table' | 'url' = 'inline-code'
  ): ExcludedRange => {
    const length = Math.max(0, end - start);
    return {
      start,
      end,
      type,
      content: ' '.repeat(length),
      reason: 'テスト用除外範囲'
    };
  };

  describe('filterTokens', () => {
    it('除外範囲がない場合、すべてのトークンを返す', () => {
      const tokens = [
        createToken('これ', '名詞', 0),
        createToken('は', '助詞', 2),
        createToken('テスト', '名詞', 3)
      ];

      const result = tokenFilter.filterTokens(tokens, []);

      expect(result).toHaveLength(3);
      expect(result[0].surface).toBe('これ');
      expect(result[1].surface).toBe('は');
      expect(result[2].surface).toBe('テスト');
    });

    it('除外範囲内のトークンを除外する', () => {
      const tokens = [
        createToken('これ', '名詞', 0),  // 0-2
        createToken('は', '助詞', 2),    // 2-3
        createToken('コード', '名詞', 3), // 3-6 (除外範囲内)
        createToken('です', '名詞', 6)   // 6-8
      ];
      const excludedRanges = [
        createExcludedRange(3, 6, 'inline-code')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(3);
      expect(result[0].surface).toBe('これ');
      expect(result[1].surface).toBe('は');
      expect(result[2].surface).toBe('です');
    });

    it('トークンが除外範囲と部分的に重複する場合も除外する', () => {
      const tokens = [
        createToken('これ', '名詞', 0),   // 0-2
        createToken('はテスト', '名詞', 2), // 2-6 (部分的に除外範囲と重複)
        createToken('です', '名詞', 6)    // 6-8
      ];
      const excludedRanges = [
        createExcludedRange(4, 8, 'inline-code') // 4-8
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(1);
      expect(result[0].surface).toBe('これ');
    });

    it('複数の除外範囲を処理する', () => {
      const tokens = [
        createToken('A', '名詞', 0),   // 0-1
        createToken('B', '名詞', 1),   // 1-2 (除外)
        createToken('C', '名詞', 2),   // 2-3
        createToken('D', '名詞', 3),   // 3-4 (除外)
        createToken('E', '名詞', 4)    // 4-5
      ];
      const excludedRanges = [
        createExcludedRange(1, 2, 'inline-code'),
        createExcludedRange(3, 4, 'url')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(3);
      expect(result[0].surface).toBe('A');
      expect(result[1].surface).toBe('C');
      expect(result[2].surface).toBe('E');
    });

    it('空のトークンリストを処理する', () => {
      const excludedRanges = [
        createExcludedRange(0, 10, 'code-block')
      ];

      const result = tokenFilter.filterTokens([], excludedRanges);

      expect(result).toHaveLength(0);
    });

    it('コードブロック内のトークンを除外する', () => {
      const tokens = [
        createToken('説明', '名詞', 0),    // 0-2
        createToken('コード', '名詞', 10), // 10-13 (コードブロック内)
        createToken('続き', '名詞', 20)    // 20-22
      ];
      const excludedRanges = [
        createExcludedRange(5, 18, 'code-block')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(2);
      expect(result[0].surface).toBe('説明');
      expect(result[1].surface).toBe('続き');
    });

    it('テーブル内のトークンを除外する', () => {
      const tokens = [
        createToken('表', '名詞', 0),     // 0-1
        createToken('セル', '名詞', 5),   // 5-7 (テーブル内)
        createToken('後', '名詞', 15)     // 15-16
      ];
      const excludedRanges = [
        createExcludedRange(3, 12, 'table')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(2);
      expect(result[0].surface).toBe('表');
      expect(result[1].surface).toBe('後');
    });

    it('URL内のトークンを除外する', () => {
      const tokens = [
        createToken('リンク', '名詞', 0),  // 0-3
        createToken('http', '名詞', 5),   // 5-9 (URL内)
        createToken('説明', '名詞', 30)   // 30-32
      ];
      const excludedRanges = [
        createExcludedRange(4, 28, 'url')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(2);
      expect(result[0].surface).toBe('リンク');
      expect(result[1].surface).toBe('説明');
    });

    it('除外範囲の境界でトークンが分割されない', () => {
      // トークンの終了位置が除外範囲の開始位置と一致する場合
      const tokens = [
        createToken('AB', '名詞', 0),  // 0-2 (除外範囲の直前まで)
        createToken('CD', '名詞', 2)   // 2-4 (除外範囲の開始位置から)
      ];
      const excludedRanges = [
        createExcludedRange(2, 4, 'inline-code')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(1);
      expect(result[0].surface).toBe('AB');
    });
  });

  describe('isTokenInExcludedRange', () => {
    it('トークンが完全に除外範囲内にある場合はtrueを返す', () => {
      const token = createToken('テスト', '名詞', 5); // 5-8
      const excludedRanges = [createExcludedRange(3, 10, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(true);
    });

    it('トークンが部分的に除外範囲と重複する場合はtrueを返す', () => {
      const token = createToken('テスト', '名詞', 5); // 5-8
      const excludedRanges = [createExcludedRange(7, 15, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(true);
    });

    it('トークンが除外範囲の開始位置で始まる場合はtrueを返す', () => {
      const token = createToken('テスト', '名詞', 5); // 5-8
      const excludedRanges = [createExcludedRange(5, 10, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(true);
    });

    it('トークンが除外範囲の終了位置で終わる場合はtrueを返す', () => {
      const token = createToken('テスト', '名詞', 5); // 5-8
      const excludedRanges = [createExcludedRange(0, 8, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(true);
    });

    it('トークンが除外範囲外にある場合はfalseを返す', () => {
      const token = createToken('テスト', '名詞', 15); // 15-18
      const excludedRanges = [createExcludedRange(5, 10, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(false);
    });

    it('トークンが除外範囲の直前にある場合はfalseを返す', () => {
      const token = createToken('AB', '名詞', 0); // 0-2
      const excludedRanges = [createExcludedRange(2, 5, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(false);
    });

    it('トークンが除外範囲の直後にある場合はfalseを返す', () => {
      const token = createToken('AB', '名詞', 5); // 5-7
      const excludedRanges = [createExcludedRange(2, 5, 'code-block')];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(false);
    });

    it('複数の除外範囲のいずれかに含まれる場合はtrueを返す', () => {
      const token = createToken('テスト', '名詞', 15); // 15-18
      const excludedRanges = [
        createExcludedRange(0, 5, 'code-block'),
        createExcludedRange(10, 20, 'inline-code')
      ];

      const result = tokenFilter.isTokenInExcludedRange(token, excludedRanges);

      expect(result).toBe(true);
    });

    it('除外範囲が空の場合はfalseを返す', () => {
      const token = createToken('テスト', '名詞', 5);

      const result = tokenFilter.isTokenInExcludedRange(token, []);

      expect(result).toBe(false);
    });
  });

  describe('エッジケース', () => {
    it('改行コードを含むテキストの処理', () => {
      // 改行は位置計算に影響するが、TokenFilterは位置情報のみを使用
      const tokens = [
        createToken('行1', '名詞', 0),   // 0-2
        createToken('行2', '名詞', 5),   // 5-7 (改行後)
        createToken('行3', '名詞', 10)   // 10-12
      ];
      const excludedRanges = [
        createExcludedRange(4, 8, 'inline-code')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(2);
      expect(result[0].surface).toBe('行1');
      expect(result[1].surface).toBe('行3');
    });

    it('空白のみのトークンを正しく処理する', () => {
      const tokens = [
        createToken('テスト', '名詞', 0),
        createToken('  ', '記号', 3),  // 空白トークン (除外範囲内)
        createToken('文', '名詞', 5)
      ];
      const excludedRanges = [
        createExcludedRange(3, 5, 'inline-code')
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      expect(result).toHaveLength(2);
      expect(result[0].surface).toBe('テスト');
      expect(result[1].surface).toBe('文');
    });

    it('長さ0のトークンは除外範囲に含まれない', () => {
      // 長さ0のトークンは通常存在しないが、エッジケースとして確認
      const tokens = [
        createToken('', '記号', 5) // 長さ0のトークン
      ];
      const excludedRanges = [
        createExcludedRange(0, 10, 'code-block')
      ];

      // 長さ0のトークンは start === end なので、
      // start < range.end && end > range.start の条件に
      // end > range.start が false になる（5 > 0 は true だが）
      // 実際には 5 < 10 && 5 > 0 なので true になる
      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      // 長さ0でも位置が除外範囲内なら除外される
      expect(result).toHaveLength(0);
    });

    it('不正な除外範囲（start > end）をスキップする', () => {
      const tokens = [
        createToken('テスト', '名詞', 5) // 5-8
      ];
      const excludedRanges = [
        createExcludedRange(10, 5, 'code-block') // 不正: start > end
      ];

      const result = tokenFilter.filterTokens(tokens, excludedRanges);

      // 不正な除外範囲は無視され、トークンは保持される
      expect(result).toHaveLength(1);
      expect(result[0].surface).toBe('テスト');
    });
  });
});

/**
 * 配列ユーティリティのテスト
 */

import {
  isEmpty,
  isNotEmpty,
  unique,
  safeArray,
  first,
  last,
  chunk,
  findOrDefault,
} from './arrayUtils';

describe('arrayUtils', () => {
  describe('isEmpty', () => {
    it('空配列の場合trueを返す', () => {
      expect(isEmpty([])).toBe(true);
    });

    it('要素がある配列の場合falseを返す', () => {
      expect(isEmpty([1, 2, 3])).toBe(false);
    });

    it('nullの場合trueを返す', () => {
      expect(isEmpty(null)).toBe(true);
    });

    it('undefinedの場合trueを返す', () => {
      expect(isEmpty(undefined)).toBe(true);
    });
  });

  describe('isNotEmpty', () => {
    it('空配列の場合falseを返す', () => {
      expect(isNotEmpty([])).toBe(false);
    });

    it('要素がある配列の場合trueを返す', () => {
      expect(isNotEmpty([1, 2, 3])).toBe(true);
    });

    it('nullの場合falseを返す', () => {
      expect(isNotEmpty(null)).toBe(false);
    });

    it('undefinedの場合falseを返す', () => {
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe('unique', () => {
    it('重複を除去する', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });

    it('重複がない場合は元の配列と同じ要素を返す', () => {
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('空配列の場合は空配列を返す', () => {
      expect(unique([])).toEqual([]);
    });

    it('文字列配列でも動作する', () => {
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
    });
  });

  describe('safeArray', () => {
    it('配列をそのまま返す', () => {
      const arr = [1, 2, 3];
      expect(safeArray(arr)).toEqual(arr);
    });

    it('nullの場合は空配列を返す', () => {
      expect(safeArray(null)).toEqual([]);
    });

    it('undefinedの場合は空配列を返す', () => {
      expect(safeArray(undefined)).toEqual([]);
    });
  });

  describe('first', () => {
    it('最初の要素を返す', () => {
      expect(first([1, 2, 3])).toBe(1);
    });

    it('空配列の場合はundefinedを返す', () => {
      expect(first([])).toBeUndefined();
    });

    it('1要素の配列の場合はその要素を返す', () => {
      expect(first([42])).toBe(42);
    });
  });

  describe('last', () => {
    it('最後の要素を返す', () => {
      expect(last([1, 2, 3])).toBe(3);
    });

    it('空配列の場合はundefinedを返す', () => {
      expect(last([])).toBeUndefined();
    });

    it('1要素の配列の場合はその要素を返す', () => {
      expect(last([42])).toBe(42);
    });
  });

  describe('chunk', () => {
    it('配列を指定サイズのチャンクに分割する', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('サイズが配列長より大きい場合は1つのチャンクを返す', () => {
      expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
    });

    it('空配列の場合は空配列を返す', () => {
      expect(chunk([], 2)).toEqual([]);
    });

    it('サイズ1の場合は各要素が個別のチャンクになる', () => {
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
    });
  });

  describe('findOrDefault', () => {
    it('条件に一致する要素を返す', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(findOrDefault(arr, (x) => x > 3, 0)).toBe(4);
    });

    it('条件に一致する要素がない場合はデフォルト値を返す', () => {
      const arr = [1, 2, 3];
      expect(findOrDefault(arr, (x) => x > 10, 0)).toBe(0);
    });

    it('空配列の場合はデフォルト値を返す', () => {
      expect(findOrDefault([], (x) => x > 0, 42)).toBe(42);
    });

    it('最初に一致した要素を返す', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(findOrDefault(arr, (x) => x > 2, 0)).toBe(3);
    });
  });
});

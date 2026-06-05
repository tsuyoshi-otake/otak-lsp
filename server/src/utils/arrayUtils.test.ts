/**
 * 配列ユーティリティのテスト
 */

import {
  isEmpty,
  isNotEmpty,
  isNotEmptyObject,
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

  describe('isNotEmptyObject', () => {
    it('空オブジェクトの場合falseを返す', () => {
      expect(isNotEmptyObject({})).toBe(false);
    });

    it('プロパティがあるオブジェクトの場合trueを返す', () => {
      expect(isNotEmptyObject({ a: 1 })).toBe(true);
    });

    it('nullの場合falseを返す', () => {
      expect(isNotEmptyObject(null)).toBe(false);
    });

    it('undefinedの場合falseを返す', () => {
      expect(isNotEmptyObject(undefined)).toBe(false);
    });

    it('複数プロパティがあるオブジェクトの場合trueを返す', () => {
      expect(isNotEmptyObject({ a: 1, b: 2, c: 3 })).toBe(true);
    });
  });
});

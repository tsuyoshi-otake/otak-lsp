/**
 * 文字列ユーティリティのテスト
 */

import {
  isBlank,
  isNotBlank,
  splitLines,
  hasMinLength,
  splitAndTrimCommas,
} from './stringUtils';

describe('stringUtils', () => {
  describe('isBlank', () => {
    it('空文字列でtrueを返す', () => {
      expect(isBlank('')).toBe(true);
    });

    it('空白のみの文字列でtrueを返す', () => {
      expect(isBlank('   ')).toBe(true);
      expect(isBlank('\t\n')).toBe(true);
    });

    it('nullでtrueを返す', () => {
      expect(isBlank(null)).toBe(true);
    });

    it('undefinedでtrueを返す', () => {
      expect(isBlank(undefined)).toBe(true);
    });

    it('空白以外の文字を含む場合falseを返す', () => {
      expect(isBlank('text')).toBe(false);
      expect(isBlank('  text  ')).toBe(false);
    });
  });

  describe('isNotBlank', () => {
    it('空白以外の文字を含む場合trueを返す', () => {
      expect(isNotBlank('text')).toBe(true);
      expect(isNotBlank('  text  ')).toBe(true);
    });

    it('空文字列でfalseを返す', () => {
      expect(isNotBlank('')).toBe(false);
    });

    it('空白のみの文字列でfalseを返す', () => {
      expect(isNotBlank('   ')).toBe(false);
    });

    it('nullでfalseを返す', () => {
      expect(isNotBlank(null)).toBe(false);
    });

    it('undefinedでfalseを返す', () => {
      expect(isNotBlank(undefined)).toBe(false);
    });
  });

  describe('splitLines', () => {
    it('改行で文字列を分割する', () => {
      const text = 'line1\nline2\nline3';
      expect(splitLines(text)).toEqual(['line1', 'line2', 'line3']);
    });

    it('空文字列で空配列を返す', () => {
      expect(splitLines('')).toEqual(['']);
    });

    it('改行がない場合は1要素の配列を返す', () => {
      expect(splitLines('single line')).toEqual(['single line']);
    });
  });

  describe('hasMinLength', () => {
    it('最小長以上の場合trueを返す', () => {
      expect(hasMinLength('12345', 5)).toBe(true);
      expect(hasMinLength('123456', 5)).toBe(true);
    });

    it('最小長未満の場合falseを返す', () => {
      expect(hasMinLength('1234', 5)).toBe(false);
    });

    it('空白を除いた長さで判定する', () => {
      expect(hasMinLength('  123  ', 3)).toBe(true);
      expect(hasMinLength('  12  ', 3)).toBe(false);
    });
  });

  describe('splitAndTrimCommas', () => {
    it('カンマで分割し、各要素をトリムする', () => {
      expect(splitAndTrimCommas('a, b, c')).toEqual(['a', 'b', 'c']);
    });

    it('空要素を除外する', () => {
      expect(splitAndTrimCommas('a,  , b')).toEqual(['a', 'b']);
    });

    it('空文字列で空配列を返す', () => {
      expect(splitAndTrimCommas('')).toEqual([]);
    });
  });
});

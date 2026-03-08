/**
 * 文字列ユーティリティのテスト
 */

import {
  isBlank,
  isNotBlank,
  splitLines,
  splitAndTrimLines,
  splitNonEmptyLines,
  normalizeWhitespace,
  normalizeAndLowerCase,
  removePunctuation,
  hasMinLength,
  splitAndTrimCommas,
  splitAndTrim,
  safeTrim,
  joinNonEmpty,
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

  describe('splitAndTrimLines', () => {
    it('改行で分割し、各行をトリムする', () => {
      const text = '  line1  \n  line2  \n  line3  ';
      expect(splitAndTrimLines(text)).toEqual(['line1', 'line2', 'line3']);
    });

    it('空行もトリムされる', () => {
      const text = 'line1\n   \nline2';
      expect(splitAndTrimLines(text)).toEqual(['line1', '', 'line2']);
    });
  });

  describe('splitNonEmptyLines', () => {
    it('空行を除外する', () => {
      const text = 'line1\n\nline2\n   \nline3';
      expect(splitNonEmptyLines(text)).toEqual(['line1', 'line2', 'line3']);
    });

    it('全て空行の場合は空配列を返す', () => {
      const text = '\n\n   \n';
      expect(splitNonEmptyLines(text)).toEqual([]);
    });
  });

  describe('normalizeWhitespace', () => {
    it('連続する空白を1つにまとめる', () => {
      expect(normalizeWhitespace('a  b   c')).toBe('a b c');
    });

    it('先頭と末尾の空白を除去する', () => {
      expect(normalizeWhitespace('  text  ')).toBe('text');
    });

    it('NFKC正規化を適用する', () => {
      expect(normalizeWhitespace('ＡＢＣ')).toBe('ABC');
    });

    it('タブや改行も空白に変換される', () => {
      expect(normalizeWhitespace('a\tb\nc')).toBe('a b c');
    });
  });

  describe('normalizeAndLowerCase', () => {
    it('正規化して小文字に変換する', () => {
      expect(normalizeAndLowerCase('ABC')).toBe('abc');
    });

    it('空白も正規化される', () => {
      expect(normalizeAndLowerCase('  A  B  ')).toBe('a b');
    });

    it('NFKC正規化と小文字化を適用する', () => {
      expect(normalizeAndLowerCase('ＡＢＣ')).toBe('abc');
    });
  });

  describe('removePunctuation', () => {
    it('末尾の句読点を除去する', () => {
      expect(removePunctuation('これはテストです。')).toBe('これはテストです');
      expect(removePunctuation('すごい！')).toBe('すごい');
      expect(removePunctuation('本当？')).toBe('本当');
    });

    it('句読点がない場合はそのまま返す', () => {
      expect(removePunctuation('テスト')).toBe('テスト');
    });

    it('先頭と末尾の空白も除去される', () => {
      expect(removePunctuation('  テスト。  ')).toBe('テスト');
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

  describe('splitAndTrim', () => {
    it('指定された区切り文字で分割し、トリムする', () => {
      expect(splitAndTrim('a|b|c', '|')).toEqual(['a', 'b', 'c']);
    });

    it('正規表現で分割できる', () => {
      expect(splitAndTrim('a/b,c', /[\/,]/)).toEqual(['a', 'b', 'c']);
    });

    it('空要素を除外する', () => {
      expect(splitAndTrim('a||b', '|')).toEqual(['a', 'b']);
    });
  });

  describe('safeTrim', () => {
    it('文字列をトリムする', () => {
      expect(safeTrim('  text  ')).toBe('text');
    });

    it('nullで空文字列を返す', () => {
      expect(safeTrim(null)).toBe('');
    });

    it('undefinedで空文字列を返す', () => {
      expect(safeTrim(undefined)).toBe('');
    });

    it('空文字列で空文字列を返す', () => {
      expect(safeTrim('')).toBe('');
    });
  });

  describe('joinNonEmpty', () => {
    it('空でない要素を結合する', () => {
      expect(joinNonEmpty(['a', 'b', 'c'])).toBe('a b c');
    });

    it('空文字列を除外する', () => {
      expect(joinNonEmpty(['a', '', 'b'])).toBe('a b');
    });

    it('nullとundefinedを除外する', () => {
      expect(joinNonEmpty(['a', null, 'b', undefined, 'c'])).toBe('a b c');
    });

    it('空白のみの要素を除外する', () => {
      expect(joinNonEmpty(['a', '   ', 'b'])).toBe('a b');
    });

    it('全て空の場合は空文字列を返す', () => {
      expect(joinNonEmpty(['', null, undefined, '   '])).toBe('');
    });
  });
});

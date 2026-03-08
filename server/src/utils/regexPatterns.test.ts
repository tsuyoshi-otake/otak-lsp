/**
 * 正規表現パターンユーティリティのテスト
 */

import {
  CODE_BLOCK_PATTERN,
  INLINE_CODE_PATTERN,
  JAPANESE_CHAR_PATTERN,
  TERM_TOKEN_PATTERN,
  WORD_SEGMENT_PATTERN,
  FULLWIDTH_NUMBER_PATTERN,
  HALFWIDTH_NUMBER_PATTERN,
  KANJI_NUMERAL_PATTERN,
  FULLWIDTH_NAKAGURO_PATTERN,
  HALFWIDTH_NAKAGURO_PATTERN,
  MIXED_NAKAGURO_PATTERN,
  SENTENCE_ENDING_PATTERN,
  END_PUNCTUATION_PATTERN,
  SENTENCE_TERMINATORS,
  PARAGRAPH_BREAK,
  cloneRegex,
  findCodeBlockRanges,
  findInlineCodeRanges,
  containsJapanese,
} from './regexPatterns';

describe('regexPatterns', () => {
  describe('CODE_BLOCK_PATTERN', () => {
    it('コードブロックを検出する', () => {
      const text = 'text ```code``` more';
      const regex = new RegExp(CODE_BLOCK_PATTERN.source, CODE_BLOCK_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('```code```');
    });

    it('複数行のコードブロックを検出する', () => {
      const text = 'text ```\ncode\nblock\n``` more';
      const regex = new RegExp(CODE_BLOCK_PATTERN.source, CODE_BLOCK_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('```\ncode\nblock\n```');
    });
  });

  describe('INLINE_CODE_PATTERN', () => {
    it('インラインコードを検出する', () => {
      const text = 'text `code` more';
      const regex = new RegExp(INLINE_CODE_PATTERN.source, INLINE_CODE_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('`code`');
    });

    it('改行を含むコードは検出しない', () => {
      const text = 'text `code\nmore` end';
      const regex = new RegExp(INLINE_CODE_PATTERN.source, INLINE_CODE_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).toBeNull();
    });
  });

  describe('JAPANESE_CHAR_PATTERN', () => {
    it('ひらがなを検出する', () => {
      expect(JAPANESE_CHAR_PATTERN.test('あいうえお')).toBe(true);
    });

    it('カタカナを検出する', () => {
      expect(JAPANESE_CHAR_PATTERN.test('アイウエオ')).toBe(true);
    });

    it('漢字を検出する', () => {
      expect(JAPANESE_CHAR_PATTERN.test('漢字')).toBe(true);
    });

    it('英数字は検出しない', () => {
      expect(JAPANESE_CHAR_PATTERN.test('abc123')).toBe(false);
    });
  });

  describe('TERM_TOKEN_PATTERN', () => {
    it('技術用語トークンを検出する', () => {
      const text = 'vscode-languageclient';
      const regex = new RegExp(TERM_TOKEN_PATTERN.source, TERM_TOKEN_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('vscode-languageclient');
    });

    it('ドット区切りの用語を検出する', () => {
      const text = 'otakLsp.advanced.enableTermNotation';
      const regex = new RegExp(TERM_TOKEN_PATTERN.source, TERM_TOKEN_PATTERN.flags);
      const matches: string[] = [];
      let match;
      while ((match = regex.exec(text)) !== null) {
        matches.push(match[0]);
      }
      expect(matches).toEqual(['otakLsp.advanced.enableTermNotation']);
    });
  });

  describe('FULLWIDTH_NUMBER_PATTERN', () => {
    it('全角数字を検出する', () => {
      const text = '全角１２３４５';
      const regex = new RegExp(FULLWIDTH_NUMBER_PATTERN.source, FULLWIDTH_NUMBER_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('１２３４５');
    });
  });

  describe('HALFWIDTH_NUMBER_PATTERN', () => {
    it('半角数字を検出する', () => {
      const text = '半角12345';
      const regex = new RegExp(HALFWIDTH_NUMBER_PATTERN.source, HALFWIDTH_NUMBER_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('12345');
    });
  });

  describe('KANJI_NUMERAL_PATTERN', () => {
    it('漢数字を検出する', () => {
      const text = '一二三四五';
      const regex = new RegExp(KANJI_NUMERAL_PATTERN.source, KANJI_NUMERAL_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('一二三四五');
    });

    it('大字を検出する', () => {
      const text = '壱弐参';
      const regex = new RegExp(KANJI_NUMERAL_PATTERN.source, KANJI_NUMERAL_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('壱弐参');
    });
  });

  describe('NAKAGURO_PATTERNS', () => {
    it('全角中黒の連続を検出する', () => {
      const text = 'A・・B';
      const regex = new RegExp(FULLWIDTH_NAKAGURO_PATTERN.source, FULLWIDTH_NAKAGURO_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('・・');
    });

    it('半角中黒の連続を検出する', () => {
      const text = 'A･･B';
      const regex = new RegExp(HALFWIDTH_NAKAGURO_PATTERN.source, HALFWIDTH_NAKAGURO_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('･･');
    });

    it('混在中黒を検出する', () => {
      const text = 'A・･B';
      const regex = new RegExp(MIXED_NAKAGURO_PATTERN.source, MIXED_NAKAGURO_PATTERN.flags);
      const match = regex.exec(text);
      expect(match).not.toBeNull();
      expect(match![0]).toBe('・･');
    });
  });

  describe('SENTENCE_ENDING_PATTERN', () => {
    it('です体を検出する', () => {
      expect(SENTENCE_ENDING_PATTERN.test('これはテストです')).toBe(true);
    });

    it('ます体を検出する', () => {
      expect(SENTENCE_ENDING_PATTERN.test('実行します')).toBe(true);
    });

    it('である体を検出する', () => {
      expect(SENTENCE_ENDING_PATTERN.test('これは事実である')).toBe(true);
    });
  });

  describe('END_PUNCTUATION_PATTERN', () => {
    it('文末の句読点を検出する', () => {
      const text = 'これはテストです。';
      const match = END_PUNCTUATION_PATTERN.exec(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('。');
    });

    it('感嘆符を検出する', () => {
      const text = 'すごい！';
      const match = END_PUNCTUATION_PATTERN.exec(text);
      expect(match).not.toBeNull();
      expect(match![1]).toBe('！');
    });
  });

  describe('SENTENCE_TERMINATORS', () => {
    it('文終端記号を検出する', () => {
      expect(SENTENCE_TERMINATORS.test('。')).toBe(true);
      expect(SENTENCE_TERMINATORS.test('！')).toBe(true);
      expect(SENTENCE_TERMINATORS.test('？')).toBe(true);
      expect(SENTENCE_TERMINATORS.test('!')).toBe(true);
      expect(SENTENCE_TERMINATORS.test('?')).toBe(true);
    });
  });

  describe('PARAGRAPH_BREAK', () => {
    it('空行を検出する', () => {
      const text = 'line1\n\nline2';
      expect(PARAGRAPH_BREAK.test(text)).toBe(true);
    });

    it('スペースのみの行も空行として検出する', () => {
      const text = 'line1\n  \nline2';
      expect(PARAGRAPH_BREAK.test(text)).toBe(true);
    });
  });

  describe('cloneRegex', () => {
    it('正規表現を複製する', () => {
      const original = /test/gi;
      const cloned = cloneRegex(original);
      expect(cloned.source).toBe(original.source);
      expect(cloned.flags).toBe(original.flags);
      expect(cloned).not.toBe(original);
    });
  });

  describe('findCodeBlockRanges', () => {
    it('コードブロックの範囲を検出する', () => {
      const text = 'before ```code``` after';
      const ranges = findCodeBlockRanges(text);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({ start: 7, end: 17 });
    });

    it('複数のコードブロックを検出する', () => {
      const text = '```code1``` text ```code2```';
      const ranges = findCodeBlockRanges(text);
      expect(ranges).toHaveLength(2);
      expect(ranges[0]).toEqual({ start: 0, end: 11 });
      expect(ranges[1]).toEqual({ start: 17, end: 28 });
    });

    it('コードブロックがない場合は空配列を返す', () => {
      const text = 'no code blocks here';
      const ranges = findCodeBlockRanges(text);
      expect(ranges).toHaveLength(0);
    });
  });

  describe('findInlineCodeRanges', () => {
    it('インラインコードの範囲を検出する', () => {
      const text = 'before `code` after';
      const ranges = findInlineCodeRanges(text);
      expect(ranges).toHaveLength(1);
      expect(ranges[0]).toEqual({ start: 7, end: 13 });
    });

    it('複数のインラインコードを検出する', () => {
      const text = '`code1` text `code2`';
      const ranges = findInlineCodeRanges(text);
      expect(ranges).toHaveLength(2);
      expect(ranges[0]).toEqual({ start: 0, end: 7 });
      expect(ranges[1]).toEqual({ start: 13, end: 20 });
    });

    it('インラインコードがない場合は空配列を返す', () => {
      const text = 'no inline code here';
      const ranges = findInlineCodeRanges(text);
      expect(ranges).toHaveLength(0);
    });
  });

  describe('containsJapanese', () => {
    it('日本語を含むテキストでtrueを返す', () => {
      expect(containsJapanese('これは日本語です')).toBe(true);
      expect(containsJapanese('カタカナ')).toBe(true);
      expect(containsJapanese('ひらがな')).toBe(true);
      expect(containsJapanese('漢字')).toBe(true);
    });

    it('日本語を含まないテキストでfalseを返す', () => {
      expect(containsJapanese('English text')).toBe(false);
      expect(containsJapanese('123456')).toBe(false);
      expect(containsJapanese('!@#$%')).toBe(false);
    });

    it('混在テキストでtrueを返す', () => {
      expect(containsJapanese('English 日本語 mixed')).toBe(true);
    });
  });
});

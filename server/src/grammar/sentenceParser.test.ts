/**
 * 文解析ユーティリティのユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 9.4
 */

import { SentenceParser } from './sentenceParser';
import { Token } from '../../../shared/src/types';
import { MarkdownFilter } from '../parser/markdownFilter';

describe('SentenceParser', () => {
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

  describe('parseSentences', () => {
    it('should split text into sentences by period', () => {
      const text = 'これはテストです。これもテストです。';
      const tokens: Token[] = [];
      const sentences = SentenceParser.parseSentences(text, tokens);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe('これはテストです。');
      expect(sentences[1].text).toBe('これもテストです。');
    });

    it('should handle single sentence', () => {
      const text = 'これは単一の文です。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences).toHaveLength(1);
      expect(sentences[0].text).toBe('これは単一の文です。');
    });

    it('should handle sentence without period at end', () => {
      const text = 'これはテストです。最後の文には句点がない';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe('これはテストです。');
      expect(sentences[1].text).toBe('最後の文には句点がない');
    });

    it('should handle empty string', () => {
      const sentences = SentenceParser.parseSentences('', []);
      expect(sentences).toHaveLength(0);
    });

    it('should handle text with only whitespace', () => {
      const sentences = SentenceParser.parseSentences('   ', []);
      expect(sentences).toHaveLength(0);
    });

    it('should split by exclamation mark', () => {
      const text = 'これはテストです！これもテストです！';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe('これはテストです！');
      expect(sentences[1].text).toBe('これもテストです！');
    });

    it('should split by question mark', () => {
      const text = 'これはテストですか？はい、そうです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].text).toBe('これはテストですか？');
      expect(sentences[1].text).toBe('はい、そうです。');
    });

    it('should calculate correct start and end positions', () => {
      const text = 'これ。あれ。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].start).toBe(0);
      expect(sentences[0].end).toBe(3);
      expect(sentences[1].start).toBe(3);
      expect(sentences[1].end).toBe(6);
    });

    it('should assign tokens to correct sentences', () => {
      const text = '私は行く。彼は来る。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('行く', '動詞', 2),
        createToken('。', '記号', 4),
        createToken('彼', '名詞', 5),
        createToken('は', '助詞', 6),
        createToken('来る', '動詞', 7),
        createToken('。', '記号', 9)
      ];
      const sentences = SentenceParser.parseSentences(text, tokens);

      expect(sentences).toHaveLength(2);
      expect(sentences[0].tokens).toHaveLength(4);
      expect(sentences[1].tokens).toHaveLength(4);
    });

    describe('markdown specific splitting', () => {
      const markdownFilter = new MarkdownFilter();

      it('should split after heading line even without terminator', () => {
        const markdown = `#### 見出し
本文です。`;
        const { filteredText, excludedRanges } = markdownFilter.filter(markdown);
        const sentences = SentenceParser.parseSentences(filteredText, [], excludedRanges);

        expect(sentences.map(s => s.text.trim())).toEqual(['見出し', '本文です。']);
      });

      it('should split after colon-ended line and separate list items', () => {
        const markdown = `導入:
- 項目Aです。
- 項目Bです。`;
        const { filteredText, excludedRanges } = markdownFilter.filter(markdown);
        const sentences = SentenceParser.parseSentences(filteredText, [], excludedRanges);

        expect(sentences.map(s => s.text.trim())).toEqual(['導入:', '項目Aです。', '項目Bです。']);
      });

      it('should treat bold-only line as independent sentence', () => {
        const markdown = `前文です
**重要**
次文です。`;
        const { filteredText, excludedRanges } = markdownFilter.filter(markdown);
        const sentences = SentenceParser.parseSentences(filteredText, [], excludedRanges);

        expect(sentences.map(s => s.text.trim())).toEqual(['前文です', '**重要**', '次文です。']);
      });

      it('should split around tables without requiring empty lines', () => {
        const markdown = `前文です
| A | B |
|---|---|
| 1 | 2 |
後文です。`;
        const { filteredText, excludedRanges } = markdownFilter.filter(markdown);
        const sentences = SentenceParser.parseSentences(filteredText, [], excludedRanges);

        expect(sentences.map(s => s.text.trim())).toEqual(['前文です', '後文です。']);
      });
    });
  });

  describe('comma counting', () => {
    it('should count commas correctly', () => {
      const text = 'これは、テストで、あります。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].commaCount).toBe(2);
    });

    it('should return 0 for sentence without commas', () => {
      const text = 'これはテストです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].commaCount).toBe(0);
    });

    it('should count multiple commas in long sentence', () => {
      const text = '私は、今日、朝、昼、夜、と、食事、を、しました。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].commaCount).toBe(8);
    });

    it('should reset comma count for each sentence', () => {
      const text = 'これは、テストです。あれは、別の、テストです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].commaCount).toBe(1);
      expect(sentences[1].commaCount).toBe(2);
    });
  });

  describe('style detection', () => {
    it('should detect keigo style (desu ending)', () => {
      const text = 'これはテストです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].endsWithDesuMasu()).toBe(true);
      expect(sentences[0].endsWithDearu()).toBe(false);
    });

    it('should detect keigo style (masu ending)', () => {
      const text = 'テストします。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].endsWithDesuMasu()).toBe(true);
      expect(sentences[0].endsWithDearu()).toBe(false);
    });

    it('should detect joutai style (dearu ending)', () => {
      const text = 'これはテストである。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].endsWithDearu()).toBe(true);
      expect(sentences[0].endsWithDesuMasu()).toBe(false);
    });

    it('should not detect keigo for da ending', () => {
      const text = 'これはテストだ。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences[0].endsWithDesuMasu()).toBe(false);
      expect(sentences[0].endsWithDearu()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle consecutive periods', () => {
      const text = 'これ。。。これ。';
      const sentences = SentenceParser.parseSentences(text, []);

      // 連続する句点は1つの文として処理
      expect(sentences.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle newlines within text', () => {
      const text = 'これはテストです。\nこれもテストです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences).toHaveLength(2);
    });

    it('should handle mixed punctuation', () => {
      const text = 'これは何？！そうです。';
      const sentences = SentenceParser.parseSentences(text, []);

      expect(sentences.length).toBeGreaterThanOrEqual(2);
    });
  });
});

/**
 * ProofreadingDictionaryLoader Unit Tests
 * Feature: proofreading-settings-compat
 * タスク6: 辞書ローダーの実装
 *
 * JSON辞書/単語リスト/ルール辞書の読み込みを検証
 */

import {
  ProofreadingDictionaryLoader,
  DictionaryEntry
} from './proofreadingDictionaryLoader';

describe('ProofreadingDictionaryLoader', () => {
  describe('parseJsonDictionary', () => {
    it('JSON辞書を正しくパースする', () => {
      const json = `[
        {
          "category": "typo",
          "match": "きづく",
          "replace": "気づく",
          "message": "誤字脱字の疑いがあります",
          "mode": "exact"
        }
      ]`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseJsonDictionary(json);

      expect(entries.length).toBe(1);
      expect(entries[0].category).toBe('typo');
      expect(entries[0].match).toBe('きづく');
      expect(entries[0].replace).toBe('気づく');
      expect(entries[0].message).toBe('誤字脱字の疑いがあります');
      expect(entries[0].mode).toBe('exact');
    });

    it('複数のエントリをパースする', () => {
      const json = `[
        { "category": "typo", "match": "A", "replace": "B" },
        { "category": "term", "match": "C", "replace": "D" }
      ]`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseJsonDictionary(json);

      expect(entries.length).toBe(2);
    });

    it('modeが未指定の場合はexactになる', () => {
      const json = `[{ "category": "typo", "match": "test" }]`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseJsonDictionary(json);

      expect(entries[0].mode).toBe('exact');
    });

    it('不正なJSONでは空配列を返す', () => {
      const json = 'invalid json';

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseJsonDictionary(json);

      expect(entries).toEqual([]);
    });

    it('配列でないJSONでは空配列を返す', () => {
      const json = '{"key": "value"}';

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseJsonDictionary(json);

      expect(entries).toEqual([]);
    });
  });

  describe('parseSpellDictionary', () => {
    it('単語リストを正しくパースする', () => {
      const content = `# コメント行
word1
word2

word3`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseSpellDictionary(content);

      expect(entries.length).toBe(3);
      expect(entries[0].word).toBe('word1');
      expect(entries[1].word).toBe('word2');
      expect(entries[2].word).toBe('word3');
    });

    it('コメント行と空行を無視する', () => {
      const content = `# comment
word1
# another comment

word2`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseSpellDictionary(content);

      expect(entries.length).toBe(2);
    });
  });

  describe('parseRuleDictionary', () => {
    it('ルール辞書を正しくパースする', () => {
      const json = `[
        {
          "pattern": "\\\\d{4}年",
          "message": "西暦年の表記です",
          "severity": "info"
        }
      ]`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseRuleDictionary(json);

      expect(entries.length).toBe(1);
      expect(entries[0].pattern).toBe('\\d{4}年');
      expect(entries[0].message).toBe('西暦年の表記です');
      expect(entries[0].severity).toBe('info');
    });

    it('severityが未指定の場合はwarnになる', () => {
      const json = `[{ "pattern": "test", "message": "msg" }]`;

      const loader = new ProofreadingDictionaryLoader();
      const entries = loader.parseRuleDictionary(json);

      expect(entries[0].severity).toBe('warn');
    });
  });

  describe('indexByCategory', () => {
    it('カテゴリ別に索引化する', () => {
      const entries: DictionaryEntry[] = [
        { category: 'typo', match: 'A', mode: 'exact' },
        { category: 'typo', match: 'B', mode: 'exact' },
        { category: 'term', match: 'C', mode: 'exact' }
      ];

      const loader = new ProofreadingDictionaryLoader();
      const indexed = loader.indexByCategory(entries);

      expect(indexed.get('typo')?.length).toBe(2);
      expect(indexed.get('term')?.length).toBe(1);
    });
  });
});

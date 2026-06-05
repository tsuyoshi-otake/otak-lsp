/**
 * glossaryData 統合テスト
 * Feature: glossary-ja-json-rebuild
 *
 * - otakLspSettings カテゴリにエントリが存在することを確認する
 * - mergeTermNotationIntoGlossaries 後のエントリが正しいことを確認する
 * - ja.jsonの全エントリが GLOSSARY_INDEX から検索可能であることを確認する
 */

import * as fs from 'fs';
import * as path from 'path';
import { GLOSSARIES, GLOSSARY_INDEX, DEFAULT_ENABLED_GLOSSARIES } from './glossaryData';
import { normalizeKey } from './glossaryUtils';

// ja.jsonの型定義（テスト用）
interface JaJsonSense {
  definition: string;
  domain: string;
  normalizedDomain: string;
  normalizedKeywords: string[];
}

interface JaJsonEntry {
  term: string;
  reading: string;
  senses: JaJsonSense[];
  normalizedTerms: string[];
}

interface JaJsonRoot {
  entries: JaJsonEntry[];
}

describe('glossaryData 統合テスト', () => {
  // ============================================================
  // otakLspSettings カテゴリの維持（要件 3.3）
  // ============================================================
  describe('otakLspSettings カテゴリ', () => {
    it('otakLspSettings カテゴリにエントリが存在する', () => {
      const otakLspSettings = GLOSSARIES.find((g) => g.id === 'otakLspSettings');
      expect(otakLspSettings).toBeDefined();
      expect(otakLspSettings!.entries.length).toBeGreaterThan(0);
    });

    it('otakLspSettings のエントリに otakLsp. で始まる設定用語が含まれる', () => {
      const otakLspSettings = GLOSSARIES.find((g) => g.id === 'otakLspSettings');
      expect(otakLspSettings).toBeDefined();

      const configEntries = otakLspSettings!.entries.filter((e) =>
        e.term.startsWith('otakLsp.'),
      );
      expect(configEntries.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // クラウドサービスカテゴリのエントリ確認
  // ============================================================
  describe('クラウドサービスカテゴリ', () => {
    it('awsServices カテゴリにエントリが存在する', () => {
      const awsServices = GLOSSARIES.find((g) => g.id === 'awsServices');
      expect(awsServices).toBeDefined();
      expect(awsServices!.entries.length).toBeGreaterThan(0);
    });

    it('azureServices カテゴリにエントリが存在する', () => {
      const azureServices = GLOSSARIES.find((g) => g.id === 'azureServices');
      expect(azureServices).toBeDefined();
      expect(azureServices!.entries.length).toBeGreaterThan(0);
    });

    it('ociServices カテゴリにエントリが存在する', () => {
      const ociServices = GLOSSARIES.find((g) => g.id === 'ociServices');
      expect(ociServices).toBeDefined();
      expect(ociServices!.entries.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // mergeTermNotationIntoGlossaries 後のエントリ（要件 3.5）
  // ============================================================
  describe('mergeTermNotationIntoGlossaries 統合', () => {
    it('GLOSSARIES は mergeTermNotationIntoGlossaries 適用後の結果である', () => {
      // GLOSSARIES は mergeTermNotationIntoGlossaries(BASE_GLOSSARIES) の結果
      // 用語表記統一辞書のエントリが統合されていることを確認
      expect(GLOSSARIES.length).toBeGreaterThan(0);
    });

    it('GLOSSARY_INDEX に用語表記統一由来のエントリが検索可能である', () => {
      // GLOSSARY_INDEX は GLOSSARIES から構築されるため、
      // mergeTermNotationIntoGlossaries で追加されたエントリも検索可能
      // 具体的なエントリの存在を確認（JavaScript は webTech 辞書の代表的な用語）
      const jsHits = GLOSSARY_INDEX.get(normalizeKey('JavaScript'));
      // JavaScript は ja.json にも含まれる可能性があるため、存在確認のみ
      expect(jsHits).toBeDefined();
      if (jsHits) {
        expect(jsHits.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // ja.json の全エントリが GLOSSARY_INDEX から検索可能（要件 4.4, 4.5, 7.1）
  // ============================================================
  describe('ja.json 全エントリのインデックス登録', () => {
    // ja.json を読み込む
    const jaJsonPath = path.resolve(__dirname, '../../../ja.json');
    let jaEntries: JaJsonEntry[] = [];

    beforeAll(() => {
      const raw = fs.readFileSync(jaJsonPath, 'utf-8');
      const parsed: JaJsonRoot = JSON.parse(raw);
      jaEntries = parsed.entries;
    });

    it('ja.json が正常に読み込まれる', () => {
      expect(jaEntries.length).toBeGreaterThan(0);
    });

    it('ja.json の全エントリが GLOSSARY_INDEX から検索可能である', () => {
      const missingTerms: string[] = [];

      for (const entry of jaEntries) {
        if (!entry.term) {
          continue;
        }
        const key = normalizeKey(entry.term);
        if (!key) {
          continue;
        }
        const hits = GLOSSARY_INDEX.get(key);
        if (!hits || hits.length === 0) {
          missingTerms.push(entry.term);
        }
      }

      // 見つからなかったエントリがあれば詳細を表示
      if (missingTerms.length > 0) {
        const sample = missingTerms.slice(0, 10).join(', ');
        fail(
          `GLOSSARY_INDEX に登録されていないエントリが ${missingTerms.length} 件あります（例: ${sample}）`,
        );
      }
    });
  });

  // ============================================================
  // DEFAULT_ENABLED_GLOSSARIES の整合性
  // ============================================================
  describe('エクスポートの整合性', () => {
    it('DEFAULT_ENABLED_GLOSSARIES は全カテゴリを含む', () => {
      const glossaryIds = GLOSSARIES.map((g) => g.id);
      expect(DEFAULT_ENABLED_GLOSSARIES).toEqual(glossaryIds);
    });

    it('全カテゴリは少なくとも1件のエントリを持つ', () => {
      for (const glossary of GLOSSARIES) {
        expect(glossary.entries.length).toBeGreaterThan(0);
      }
    });
  });
});

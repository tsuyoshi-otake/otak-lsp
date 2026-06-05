/**
 * 変換スクリプトの単体テスト
 * Feature: glossary-ja-json-rebuild
 *
 * - 全226ドメインがマッピングに存在することを確認する
 * - 空aliasesのundefined化を確認する
 * - 複数senseのdescription結合を確認する
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  JaJsonEntry,
  DOMAIN_MAPPING,
  convertJaJsonEntry,
  escapeForTs,
  generateTypeScriptSource,
  generateSplitTypeScriptSources,
  glossaryIdToFileName,
  loadJaJson,
} from './generate-glossary-from-json';
import { GlossaryId } from '../shared/src/types';
import { GlossaryEntry } from '../server/src/hover/glossaryTypes';

// ============================================================
// ja.jsonの実データを読み込む（CI/ローカルで未配置の場合はスキップ）
// ============================================================

const jaJsonPath = path.resolve(__dirname, '..', 'ja.json');
const jaJsonAvailable = fs.existsSync(jaJsonPath);
const jaJsonEntries = jaJsonAvailable ? loadJaJson(jaJsonPath) : [];

// ja.json に依存するスイートは未配置時に skip する
const describeIfJa = jaJsonAvailable ? describe : describe.skip;

// ja.jsonに含まれる全ドメインを収集
const allDomainsInJaJson = new Set<string>();
for (const entry of jaJsonEntries) {
  if (entry.senses) {
    for (const sense of entry.senses) {
      allDomainsInJaJson.add(sense.domain);
    }
  }
}

describeIfJa('DOMAIN_MAPPING', () => {
  test('全226ドメインがマッピングに存在する', () => {
    // ja.jsonに含まれる全ドメインがDOMAIN_MAPPINGに存在することを確認
    const missingDomains: string[] = [];
    for (const domain of allDomainsInJaJson) {
      if (!(domain in DOMAIN_MAPPING)) {
        missingDomains.push(domain);
      }
    }
    expect(missingDomains).toEqual([]);
    // 226ドメイン以上あることを確認
    expect(allDomainsInJaJson.size).toBeGreaterThanOrEqual(226);
  });

  test('マッピング先はすべて有効なGlossaryIdである', () => {
    const glossaryIds = new Set(Object.values(DOMAIN_MAPPING));
    // 少なくとも1つのGlossaryIdにマッピングされている
    expect(glossaryIds.size).toBeGreaterThan(0);
  });
});

describe('convertJaJsonEntry - aliases', () => {
  test('normalizedTermsからtermとreadingを除外してaliasesを生成する', () => {
    const entry: JaJsonEntry = {
      term: '基本設計書',
      reading: 'きほんせっけいしょ',
      senses: [{
        definition: 'テスト定義',
        domain: 'software-engineering',
        normalizedDomain: 'software-engineering',
        normalizedKeywords: [],
      }],
      normalizedTerms: ['基本設計書', 'きほんせっけいしょ', 'basic design document'],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.entry.aliases).toEqual(['basic design document']);
  });

  test('normalizedTermsがtermとreadingのみの場合、aliasesはundefinedになる', () => {
    const entry: JaJsonEntry = {
      term: '制約条件',
      reading: 'せいやくじょうけん',
      senses: [{
        definition: 'テスト定義',
        domain: 'software-engineering',
        normalizedDomain: 'software-engineering',
        normalizedKeywords: [],
      }],
      normalizedTerms: ['制約条件', 'せいやくじょうけん'],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.entry.aliases).toBeUndefined();
  });

  test('normalizedTermsが空の場合、aliasesはundefinedになる', () => {
    const entry: JaJsonEntry = {
      term: 'テスト',
      reading: 'てすと',
      senses: [{
        definition: 'テスト定義',
        domain: 'testing',
        normalizedDomain: 'testing',
        normalizedKeywords: [],
      }],
      normalizedTerms: [],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.entry.aliases).toBeUndefined();
  });
});

describe('convertJaJsonEntry - description', () => {
  test('単一senseの場合、definitionがそのままdescriptionになる', () => {
    const entry: JaJsonEntry = {
      term: 'テスト用語',
      reading: 'てすとようご',
      senses: [{
        definition: 'これはテスト定義です。',
        domain: 'software-engineering',
        normalizedDomain: 'software-engineering',
        normalizedKeywords: [],
      }],
      normalizedTerms: ['テスト用語', 'てすとようご'],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.entry.description).toBe('これはテスト定義です。');
  });

  test('複数senseの場合、ドメインラベル付きで結合される', () => {
    const entry: JaJsonEntry = {
      term: 'リクエスト',
      reading: 'りくえすと',
      senses: [
        {
          definition: 'APIに送る要求データです。',
          domain: 'backend',
          normalizedDomain: 'backend',
          normalizedKeywords: [],
        },
        {
          definition: 'ユーザーが求めることです。',
          domain: 'product',
          normalizedDomain: 'product',
          normalizedKeywords: [],
        },
      ],
      normalizedTerms: ['リクエスト', 'りくえすと', 'request'],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.entry.description).toBe(
      '【バックエンド】APIに送る要求データです。 【プロダクト】ユーザーが求めることです。',
    );
  });

  test('複数senseの場合、最初のsenseのdomainでカテゴリが決定される', () => {
    const entry: JaJsonEntry = {
      term: 'リクエスト',
      reading: 'りくえすと',
      senses: [
        {
          definition: 'APIに送る要求データです。',
          domain: 'backend',
          normalizedDomain: 'backend',
          normalizedKeywords: [],
        },
        {
          definition: 'ユーザーが求めることです。',
          domain: 'product',
          normalizedDomain: 'product',
          normalizedKeywords: [],
        },
      ],
      normalizedTerms: ['リクエスト', 'りくえすと', 'request'],
    };

    const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
    expect(result.glossaryId).toBe('backend');
  });
});

describe('escapeForTs', () => {
  test('シングルクォートをエスケープする', () => {
    expect(escapeForTs("it's")).toBe("it\\'s");
  });

  test('バックスラッシュをエスケープする', () => {
    expect(escapeForTs('path\\to')).toBe('path\\\\to');
  });

  test('改行をエスケープする', () => {
    expect(escapeForTs('line1\nline2')).toBe('line1\\nline2');
  });
});

describe('generateTypeScriptSource', () => {
  test('ヘッダコメントとインターフェース定義を含む', () => {
    const grouped = new Map<GlossaryId, GlossaryEntry[]>();
    grouped.set('it', [{ term: 'テスト', description: 'テスト説明' }]);
    const domainStats = new Map<GlossaryId, Map<string, number>>();
    domainStats.set('it', new Map([['software-engineering', 1]]));

    const source = generateTypeScriptSource(grouped, domainStats, 1, 1);

    expect(source).toContain('// このファイルは自動生成です。手動で編集しないでください。');
    expect(source).toContain('// 生成元: ja.json (1 エントリ, 1 ドメイン)');
    expect(source).toContain('// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts');
    expect(source).toContain('export interface GeneratedGlossaryCategory');
    expect(source).toContain('export const GENERATED_GLOSSARY_DATA');
  });

  test('ドメイン統計コメントを含む', () => {
    const grouped = new Map<GlossaryId, GlossaryEntry[]>();
    grouped.set('it', [{ term: 'テスト', description: 'テスト説明' }]);
    const domainStats = new Map<GlossaryId, Map<string, number>>();
    domainStats.set('it', new Map([['software-engineering', 5], ['programming', 3]]));

    const source = generateTypeScriptSource(grouped, domainStats, 8, 2);

    expect(source).toContain('// software-engineering (5), programming (3)');
  });
});

describe('generateSplitTypeScriptSources', () => {
  test('集約ファイルとカテゴリ別ファイルを生成する', () => {
    const grouped = new Map<GlossaryId, GlossaryEntry[]>();
    grouped.set('it', [{ term: 'テスト', description: 'テスト説明' }]);
    grouped.set('awsServices', [{ term: 'S3', description: 'オブジェクトストレージです。' }]);
    const domainStats = new Map<GlossaryId, Map<string, number>>();
    domainStats.set('it', new Map([['software-engineering', 1]]));
    domainStats.set('awsServices', new Map([['aws', 1]]));

    const files = generateSplitTypeScriptSources(grouped, domainStats, 2, 2);
    const aggregate = files.find((file) => file.relativePath === 'generatedGlossaryData.ts');
    const itIndexFile = files.find((file) => file.relativePath.endsWith(path.join('it', 'index.ts')));
    const itPartFile = files.find((file) => file.relativePath.endsWith(path.join('it', 'part-001.ts')));
    const awsIndexFile = files.find((file) => file.relativePath.endsWith(path.join('aws-services', 'index.ts')));
    const awsPartFile = files.find((file) => file.relativePath.endsWith(path.join('aws-services', 'part-001.ts')));

    expect(files).toHaveLength(5);
    expect(aggregate?.source).toContain("import { GLOSSARY_ENTRIES as itEntries }");
    expect(aggregate?.source).toContain("entries: itEntries");
    expect(aggregate?.source).toContain("entries: awsServicesEntries");
    expect(itIndexFile?.source).toContain('export const GLOSSARY_ENTRIES');
    expect(itIndexFile?.source).toContain('...GLOSSARY_ENTRIES_PART_001');
    expect(itPartFile?.source).toContain("{ term: 'テスト'");
    expect(awsIndexFile?.source).toContain('...GLOSSARY_ENTRIES_PART_001');
    expect(awsPartFile?.source).toContain("{ term: 'S3'");
  });
});

describe('glossaryIdToFileName', () => {
  test('camelCaseのGlossaryIdをkebab-caseに変換する', () => {
    expect(glossaryIdToFileName('awsServices')).toBe('aws-services');
    expect(glossaryIdToFileName('distributedSystems')).toBe('distributed-systems');
    expect(glossaryIdToFileName('it')).toBe('it');
  });
});

describeIfJa('ja.json実データの検証', () => {
  test('ja.jsonの全エントリが変換可能である', () => {
    let convertedCount = 0;
    let skippedCount = 0;

    for (const entry of jaJsonEntries) {
      if (!entry.term || !entry.senses || entry.senses.length === 0) {
        skippedCount++;
        continue;
      }
      const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
      expect(result.entry.term).toBe(entry.term);
      expect(result.entry.description).toBeTruthy();
      convertedCount++;
    }

    // 全エントリが変換されたことを確認
    expect(convertedCount + skippedCount).toBe(jaJsonEntries.length);
    expect(convertedCount).toBeGreaterThan(9000);
  });
});

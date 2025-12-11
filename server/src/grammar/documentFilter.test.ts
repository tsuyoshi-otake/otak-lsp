/**
 * Document Filterのユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { JapaneseDocumentFilter, TextDocument } from './documentFilter';
import { DEFAULT_ADVANCED_RULES_CONFIG, AdvancedRulesConfig } from '../../../shared/src/advancedTypes';

/**
 * テスト用のTextDocumentを生成するヘルパー
 */
const createMockDocument = (
  uri: string,
  languageId: string,
  content: string
): TextDocument => ({
  uri,
  languageId,
  getText: () => content
});

describe('JapaneseDocumentFilter', () => {
  const filter = new JapaneseDocumentFilter();

  describe('Untitledファイルの判定', () => {
    /**
     * 要件 13.1: WHEN ユーザーが新規ファイル（Untitled）を開く THEN システムは日本語テキストを解析する
     */
    it('should analyze Untitled files with Japanese content', () => {
      const doc = createMockDocument('untitled:Untitled-1', 'plaintext', 'これはテストです');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should analyze files with untitled URI scheme', () => {
      const doc = createMockDocument('untitled:Test', 'plaintext', '日本語のテキスト');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should not analyze Untitled files when enableUntitledFiles is false', () => {
      const doc = createMockDocument('untitled:Untitled-1', 'untitled', 'これはテストです');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableUntitledFiles: false
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });

    it('should identify untitled language ID as Untitled file', () => {
      const doc = createMockDocument('file:///test.txt', 'untitled', 'テスト');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });
  });

  describe('拡張子のないファイルの判定', () => {
    /**
     * 要件 13.2: WHEN ユーザーが拡張子のないファイルを開く THEN システムは内容に基づいて日本語を解析する
     */
    it('should analyze files without extension that contain Japanese', () => {
      const doc = createMockDocument('file:///path/to/README', 'plaintext', 'これは日本語のREADMEです');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should not analyze files without extension that lack Japanese when using unknown language', () => {
      const doc = createMockDocument('file:///path/to/README', 'unknown', 'This is English README');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });
  });

  describe('プレーンテキストモードの判定', () => {
    /**
     * 要件 13.3: WHEN ユーザーがプレーンテキストモードを選択する THEN システムは日本語テキストを解析する
     */
    it('should analyze plaintext files', () => {
      const doc = createMockDocument('file:///test.txt', 'plaintext', 'テスト');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should analyze markdown files', () => {
      const doc = createMockDocument('file:///test.md', 'markdown', '# 見出し');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });
  });

  describe('内容ベースの日本語検出', () => {
    /**
     * 要件 13.4: WHEN ファイルに日本語が含まれる THEN システムは言語IDに関係なく解析を実行する
     */
    it('should detect hiragana', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', 'これはひらがな');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should detect katakana', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', 'カタカナテスト');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should detect kanji', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', '漢字');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should not detect non-Japanese content', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', 'This is English only');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });

    it('should not use content-based detection when disabled', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', 'これはテストです');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: false
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });
  });

  describe('除外リストの処理', () => {
    /**
     * 要件 13.5: WHEN ユーザーが設定で特定の言語IDを除外する THEN システムはその言語IDのファイルを解析しない
     */
    it('should not analyze excluded language IDs', () => {
      const doc = createMockDocument('file:///test.json', 'json', 'これはテストです');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        excludedLanguageIds: ['json']
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });

    it('should not analyze multiple excluded language IDs', () => {
      const excludedIds = ['json', 'yaml', 'xml'];
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        excludedLanguageIds: excludedIds
      };

      for (const languageId of excludedIds) {
        const doc = createMockDocument(`file:///test.${languageId}`, languageId, 'これはテストです');
        expect(filter.shouldAnalyze(doc, config)).toBe(false);
      }
    });

    it('should analyze non-excluded language IDs', () => {
      const doc = createMockDocument('file:///test.md', 'markdown', 'これはテストです');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        excludedLanguageIds: ['json', 'yaml']
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });
  });

  describe('日本語判定の最適化', () => {
    /**
     * 日本語判定は最初の1000文字で実行される
     */
    it('should detect Japanese in first 1000 characters', () => {
      const prefix = 'a'.repeat(500);
      const japaneseText = 'これはテストです';
      const content = prefix + japaneseText;

      const doc = createMockDocument('file:///test.ts', 'typescript', content);
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should not detect Japanese when it appears after 1000 characters', () => {
      const prefix = 'a'.repeat(1001);
      const japaneseText = 'これはテストです';
      const content = prefix + japaneseText;

      const doc = createMockDocument('file:///test.ts', 'typescript', content);
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });

    it('should handle empty content', () => {
      const doc = createMockDocument('file:///test.ts', 'typescript', '');
      const config: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableContentBasedDetection: true
      };

      expect(filter.shouldAnalyze(doc, config)).toBe(false);
    });
  });

  describe('サポートされている言語ID', () => {
    it('should always analyze markdown files', () => {
      const doc = createMockDocument('file:///test.md', 'markdown', 'English content');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });

    it('should always analyze plaintext files', () => {
      const doc = createMockDocument('file:///test.txt', 'plaintext', 'English content');
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      expect(filter.shouldAnalyze(doc, config)).toBe(true);
    });
  });

  describe('isUntitled判定', () => {
    it('should identify untitled URI scheme', () => {
      expect(filter.isUntitled({ uri: 'untitled:Test', languageId: 'plaintext', getText: () => '' })).toBe(true);
    });

    it('should identify untitled language ID', () => {
      expect(filter.isUntitled({ uri: 'file:///test', languageId: 'untitled', getText: () => '' })).toBe(true);
    });

    it('should identify empty language ID as untitled', () => {
      expect(filter.isUntitled({ uri: 'file:///test', languageId: '', getText: () => '' })).toBe(true);
    });

    it('should not identify regular files as untitled', () => {
      expect(filter.isUntitled({ uri: 'file:///test.md', languageId: 'markdown', getText: () => '' })).toBe(false);
    });
  });

  describe('containsJapanese判定', () => {
    it('should return true for hiragana', () => {
      const doc = createMockDocument('file:///test', 'plaintext', 'あいうえお');
      expect(filter.containsJapanese(doc)).toBe(true);
    });

    it('should return true for katakana', () => {
      const doc = createMockDocument('file:///test', 'plaintext', 'アイウエオ');
      expect(filter.containsJapanese(doc)).toBe(true);
    });

    it('should return true for kanji', () => {
      const doc = createMockDocument('file:///test', 'plaintext', '日本語');
      expect(filter.containsJapanese(doc)).toBe(true);
    });

    it('should return false for English only', () => {
      const doc = createMockDocument('file:///test', 'plaintext', 'Hello World');
      expect(filter.containsJapanese(doc)).toBe(false);
    });

    it('should return false for numbers only', () => {
      const doc = createMockDocument('file:///test', 'plaintext', '12345');
      expect(filter.containsJapanese(doc)).toBe(false);
    });
  });
});

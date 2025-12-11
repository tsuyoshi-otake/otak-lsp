/**
 * Document Filterのプロパティベーステスト
 * Feature: advanced-grammar-rules
 * プロパティ 13: Untitledファイルと拡張子なしファイルの処理
 * 要件: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import * as fc from 'fast-check';
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

describe('Property-Based Tests: Document Filter', () => {
  const filter = new JapaneseDocumentFilter();

  /**
   * Feature: advanced-grammar-rules, Property 13: Untitledファイルと拡張子なしファイルの処理
   * 任意のファイルに対して、ファイルが保存されていない（Untitled）または拡張子がない場合でも、
   * 設定で有効化されていれば、システムは日本語テキストを解析し、診断情報を生成する。
   * 除外リストに含まれる言語IDのファイルは解析しない
   */
  describe('Property 13: Untitledファイルと拡張子なしファイルの処理', () => {
    it('should analyze Untitled files with Japanese content when enabled', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('これはテストです', '日本語のテキスト', 'テスト文章'),
          (japaneseContent) => {
            const doc = createMockDocument('untitled:Untitled-1', 'plaintext', japaneseContent);
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableUntitledFiles: true,
              enableContentBasedDetection: true
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not analyze Untitled files when disabled', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('これはテストです', '日本語のテキスト', 'テスト文章'),
          (japaneseContent) => {
            const doc = createMockDocument('untitled:Untitled-1', 'untitled', japaneseContent);
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableUntitledFiles: false
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should analyze files without extension based on content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('これはテストです', '日本語のテキスト', 'ひらがなカタカナ漢字'),
          (japaneseContent) => {
            const doc = createMockDocument('file:///test/README', 'plaintext', japaneseContent);
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableContentBasedDetection: true
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not analyze excluded language IDs', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('json', 'yaml', 'xml', 'binary'),
          (languageId) => {
            const doc = createMockDocument('file:///test/file.txt', languageId, 'これはテストです');
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              excludedLanguageIds: ['json', 'yaml', 'xml', 'binary']
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should analyze supported language IDs regardless of content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('markdown', 'plaintext'),
          (languageId) => {
            const doc = createMockDocument('file:///test/file.md', languageId, 'This is English text');
            const config = DEFAULT_ADVANCED_RULES_CONFIG;

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not analyze non-Japanese content when content-based detection is used', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('This is English', 'Hello World', 'Test content'),
          (englishContent) => {
            const doc = createMockDocument('file:///test/file.txt', 'typescript', englishContent);
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableContentBasedDetection: true
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should detect Japanese in mixed content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'Hello World これはテスト',
            'Test content with 日本語',
            'English and ひらがな mixed'
          ),
          (mixedContent) => {
            const doc = createMockDocument('file:///test/file.ts', 'typescript', mixedContent);
            const config: AdvancedRulesConfig = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableContentBasedDetection: true
            };

            const result = filter.shouldAnalyze(doc, config);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

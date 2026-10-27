/**
 * Evals Reporter Tests
 * Feature: advanced-grammar-rules
 * Task: 25. Evalsレポート生成機能のテスト
 */

import { EvalsReporter } from './evals-reporter';
import { EvalResult } from './evals-runner';

describe('EvalsReporter', () => {
  const mockEvalResult: EvalResult = {
    totalCategories: 31,
    implementedCategories: 15,
    totalExamples: 60,
    detectedExamples: 45,
    detectionRate: 75,
    timestamp: '2025-12-11T00:00:00.000Z',
    categories: [
      {
        categoryId: 'double-particle',
        categoryName: '二重助詞',
        status: 'PASS',
        total: 4,
        detected: 4,
        detectionRate: 100,
        examples: [
          { text: '私がが行く', detected: true, expectedDetection: true, actualDetected: true, diagnostics: [], expectedRule: 'double-particle' }
        ],
        representativeExample: '私がが行く'
      },
      {
        categoryId: 'ra-nuki',
        categoryName: 'ら抜き言葉',
        status: 'FAIL',
        total: 4,
        detected: 3,
        detectionRate: 75,
        examples: [
          { text: '食べれる', detected: true, expectedDetection: true, actualDetected: true, diagnostics: [], expectedRule: 'ra-nuki' }
        ],
        representativeExample: '食べれる'
      },
      {
        categoryId: 'redundant-expression',
        categoryName: '冗長表現',
        status: 'NOT_IMPL',
        total: 4,
        detected: 0,
        detectionRate: 0,
        examples: [
          { text: '馬から落馬する', detected: false, expectedDetection: true, actualDetected: false, diagnostics: [], expectedRule: 'redundant-expression' }
        ],
        representativeExample: '馬から落馬する'
      }
    ]
  };

  describe('generateMarkdownReport', () => {
    it('should generate a Markdown report', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('# Japanese Grammar Evals Report');
      expect(report).toContain('## Summary');
      expect(report).toContain('## Category Results');
    });

    it('should include total categories count', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('31');
    });

    it('should include detection rate', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('75');
    });

    it('should include category table', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('二重助詞');
      expect(report).toContain('ら抜き言葉');
      expect(report).toContain('冗長表現');
    });

    it('should use PASS/FAIL/NOT_IMPL status indicators', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('PASS');
      expect(report).toContain('FAIL');
      expect(report).toContain('NOT_IMPL');
    });

    it('should include timestamp', () => {
      const report = EvalsReporter.generateMarkdownReport(mockEvalResult);

      expect(report).toContain('2025-12-11');
    });
  });

  describe('generateConsoleSummary', () => {
    it('should generate a console summary', () => {
      const summary = EvalsReporter.generateConsoleSummary(mockEvalResult);

      expect(summary).toContain('=== Japanese Grammar Evals Report ===');
      expect(summary).toContain('Total Categories:');
      expect(summary).toContain('Implemented:');
      expect(summary).toContain('一致:');
    });

    it('should include percentage in summary', () => {
      const summary = EvalsReporter.generateConsoleSummary(mockEvalResult);

      expect(summary).toMatch(/\d+%/);
    });
  });

  describe('generateReadmeSection', () => {
    it('高い一致率でも失敗カテゴリがあれば緑のバッジを表示しない', () => {
      const section = EvalsReporter.generateReadmeSection({ ...mockEvalResult, detectionRate: 99 });
      expect(section).toContain('evals-99%25-red');
    });

    it('未実装カテゴリがある場合は全例一致でも緑のバッジを表示しない', () => {
      const categories = [mockEvalResult.categories[0], mockEvalResult.categories[2]];
      const section = EvalsReporter.generateReadmeSection({ ...mockEvalResult, categories, detectionRate: 100 });
      expect(section).toContain('evals-100%25-yellow');
    });

    it('全カテゴリの全例が一致した場合は緑のバッジを表示する', () => {
      const categories = [mockEvalResult.categories[0]];
      const section = EvalsReporter.generateReadmeSection({ ...mockEvalResult, categories, detectionRate: 100 });
      expect(section).toContain('evals-100%25-brightgreen');
    });

    it('評価した長い例文を途中で省略せず表示する', () => {
      const example = '漢字'.repeat(50) + '終わり。';
      const category = { ...mockEvalResult.categories[0], representativeExample: example };
      const section = EvalsReporter.generateReadmeSection({ ...mockEvalResult, categories: [category] });
      expect(section).toContain(example);
    });

    it('評価例の一致と非検出期待の内訳を示し、コード網羅率と区別する', () => {
      const example = mockEvalResult.categories[0].examples[0];
      const result: EvalResult = {
        ...mockEvalResult,
        totalCategories: 2, implementedCategories: 1, totalExamples: 3,
        detectedExamples: 2, detectionRate: 100,
        categories: [
          { ...mockEvalResult.categories[0], total: 2, detected: 2,
            examples: [example, { ...example, text: '正常な文', expectedDetection: false, actualDetected: false }] },
          { ...mockEvalResult.categories[2], total: 1 },
        ],
      };
      const section = EvalsReporter.generateReadmeSection(result);
      expect(section).toContain('2/2');
      expect(section).toContain('検出期待 1例');
      expect(section).toContain('非検出期待 1例');
      expect(section).toContain('コード網羅率');
      expect(section).toContain('未実装 1カテゴリ');
      expect(section).not.toContain('Detection Coverage');
    });

    it('should generate a README-compatible section', () => {
      const section = EvalsReporter.generateReadmeSection(mockEvalResult);

      expect(section).toContain('## Evals（評価例）');
      expect(section).toContain('Last updated:');
    });

    it('should include an eval match badge', () => {
      const section = EvalsReporter.generateReadmeSection(mockEvalResult);

      expect(section).toContain('![評価例一致率]');
      expect(section).toContain('img.shields.io/badge');
    });

    it('should include category status table', () => {
      const section = EvalsReporter.generateReadmeSection(mockEvalResult);

      expect(section).toContain('| Category |');
      expect(section).toContain('| Status |');
      expect(section).toContain('| Example |');
    });
  });

  describe('getFailedExamples', () => {
    it('should return failed examples from implemented categories', () => {
      const failed = EvalsReporter.getFailedExamples(mockEvalResult);

      // The FAIL category should have some failed examples
      expect(Array.isArray(failed)).toBe(true);
    });
  });
});

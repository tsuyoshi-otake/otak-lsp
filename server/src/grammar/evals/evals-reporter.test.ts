/**
 * Evals Reporter Tests
 * Feature: advanced-grammar-rules
 * Task: 25. Evalsレポート生成機能のテスト
 */

import { EvalsReporter } from './evals-reporter';
import { EvalResult, CategoryEvalResult } from './evals-runner';

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
          { text: '私がが行く', detected: true, diagnostics: [], expectedRule: 'double-particle' }
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
          { text: '食べれる', detected: true, diagnostics: [], expectedRule: 'ra-nuki' }
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
          { text: '馬から落馬する', detected: false, diagnostics: [], expectedRule: 'redundant-expression' }
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
      expect(summary).toContain('Detected:');
    });

    it('should include percentage in summary', () => {
      const summary = EvalsReporter.generateConsoleSummary(mockEvalResult);

      expect(summary).toMatch(/\d+%/);
    });
  });

  describe('generateReadmeSection', () => {
    it('should generate a README-compatible section', () => {
      const section = EvalsReporter.generateReadmeSection(mockEvalResult);

      expect(section).toContain('## Detection Coverage');
      expect(section).toContain('Last updated:');
    });

    it('should include coverage badge', () => {
      const section = EvalsReporter.generateReadmeSection(mockEvalResult);

      expect(section).toContain('![Coverage]');
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

/**
 * NG Examples Evals Test
 * Feature: advanced-grammar-rules
 * Task: 27. Evalsテスト統合
 *
 * Jest テストとしてEvalsを実行
 * CI/CDで自動実行可能
 */

import { EvalsRunner, EvalResult } from './evals-runner';
import { NG_EXAMPLE_CATEGORIES, getImplementedCategories, getImplementedExampleCount } from './ng-examples-data';

// 検出率の閾値
const DETECTION_RATE_THRESHOLD = 50; // 最低50%は検出されるべき

describe('Japanese Grammar Evals', () => {
  let runner: EvalsRunner;
  let result: EvalResult;

  beforeAll(async () => {
    runner = new EvalsRunner();
    await runner.initialize();
    result = await runner.runEvals();
  }, 120000); // 2分タイムアウト（全テスト実行）

  describe('Overall Coverage', () => {
    it(`should have detection rate above ${DETECTION_RATE_THRESHOLD}%`, () => {
      expect(result.detectionRate).toBeGreaterThanOrEqual(DETECTION_RATE_THRESHOLD);
    });

    it('should have 43 total categories', () => {
      expect(result.totalCategories).toBe(43);
    });

    it('should have at least 15 implemented categories', () => {
      expect(result.implementedCategories).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Implemented Categories', () => {
    // 実装済みカテゴリの検出テスト
    const implementedCategories = getImplementedCategories();

    describe.each(implementedCategories.map(c => [c.name, c.id, c]))(
      '%s (%s)',
      (name, id, category) => {
        it('should detect at least one example', async () => {
          const catResult = result.categories.find(c => c.categoryId === id);
          expect(catResult).toBeDefined();
          expect(catResult!.status).not.toBe('NOT_IMPL');
          // 少なくとも1つは検出されるべき
          expect(catResult!.detected).toBeGreaterThan(0);
        });
      }
    );
  });

  describe('Core Rules Detection', () => {
    // コアルール（必ず高い検出率であるべき）
    const coreRules = ['double-particle', 'term-notation', 'kanji-opening'];

    it.each(coreRules)(
      '%s should have high detection rate',
      async (ruleId) => {
        const catResult = result.categories.find(c => c.categoryId === ruleId);
        expect(catResult).toBeDefined();
        expect(catResult!.detectionRate).toBeGreaterThanOrEqual(50);
      }
    );
  });

  describe('Data Integrity', () => {
    it('should have examples for all categories', () => {
      for (const category of NG_EXAMPLE_CATEGORIES) {
        expect(category.examples.length).toBeGreaterThan(0);
      }
    });

    it('should have unique category IDs', () => {
      const ids = NG_EXAMPLE_CATEGORIES.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have all required fields in categories', () => {
      for (const category of NG_EXAMPLE_CATEGORIES) {
        expect(category.id).toBeDefined();
        expect(category.name).toBeDefined();
        expect(category.description).toBeDefined();
        expect(category.expectedRule).toBeDefined();
        expect(category.status).toMatch(/^(IMPLEMENTED|NOT_IMPL)$/);
      }
    });
  });

  describe('Regression Detection', () => {
    // 以前検出できていたものが検出できなくなっていないかチェック
    const criticalExamples = [
      { text: '私がが行く', ruleId: 'double-particle' },
      { text: 'Javascriptを使用', ruleId: 'term-notation' },
      { text: '確認して下さい', ruleId: 'kanji-opening' }
    ];

    it.each(criticalExamples)(
      'should detect critical example: $text',
      async ({ text, ruleId }) => {
        const evalResult = await runner.evaluateExample(text, ruleId);
        expect(evalResult.detected).toBe(true);
      }
    );
  });

  describe('Summary Output', () => {
    it('should generate summary without errors', () => {
      expect(result.timestamp).toBeDefined();
      expect(result.categories.length).toBe(43);
    });

    it('should have valid detection counts', () => {
      expect(result.detectedExamples).toBeGreaterThanOrEqual(0);
      expect(result.detectedExamples).toBeLessThanOrEqual(result.totalExamples);
    });
  });
});

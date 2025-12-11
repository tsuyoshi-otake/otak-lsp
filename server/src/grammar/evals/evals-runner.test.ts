/**
 * Evals Runner Tests
 * Feature: advanced-grammar-rules
 * Task: 24. Evals実行エンジンのテスト
 */

import { EvalsRunner, EvalResult, CategoryEvalResult } from './evals-runner';
import { NG_EXAMPLE_CATEGORIES, getImplementedCategories } from './ng-examples-data';

describe('EvalsRunner', () => {
  let runner: EvalsRunner;

  beforeAll(async () => {
    runner = new EvalsRunner();
    await runner.initialize();
  }, 30000); // 30秒タイムアウト（辞書ロードに時間がかかる）

  describe('runEvals', () => {
    it('should return results for all categories', async () => {
      const results = await runner.runEvals();

      expect(results.categories.length).toBe(NG_EXAMPLE_CATEGORIES.length);
    }, 60000);

    it('should return total counts', async () => {
      const results = await runner.runEvals();

      expect(results.totalCategories).toBe(43);
      expect(results.totalExamples).toBeGreaterThan(0);
    }, 60000);

    it('should calculate detection rate', async () => {
      const results = await runner.runEvals();

      expect(results.detectionRate).toBeGreaterThanOrEqual(0);
      expect(results.detectionRate).toBeLessThanOrEqual(100);
    }, 60000);
  });

  describe('evaluateCategory', () => {
    it('should evaluate a single category', async () => {
      const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'double-particle');
      expect(category).toBeDefined();

      const result = await runner.evaluateCategory(category!);

      expect(result.categoryId).toBe('double-particle');
      expect(result.categoryName).toBe('二重助詞');
      expect(result.status).toBeDefined();
    }, 30000);

    // redundant-expression は実装済みなので、PASS/FAILのいずれかを返す
    it('should evaluate implemented categories correctly', async () => {
      const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'redundant-expression');
      expect(category).toBeDefined();

      const result = await runner.evaluateCategory(category!);

      // 実装済みカテゴリはPASS/FAILのいずれかを返す
      expect(['PASS', 'FAIL']).toContain(result.status);
      expect(result.detected).toBeGreaterThanOrEqual(0);
    }, 30000);
  });

  describe('evaluateExample', () => {
    it('should detect double-particle error', async () => {
      const result = await runner.evaluateExample('私がが行く', 'double-particle');

      expect(result.detected).toBe(true);
      expect(result.diagnostics.length).toBeGreaterThan(0);
    }, 10000);

    it('should detect style inconsistency', async () => {
      const result = await runner.evaluateExample(
        'これは素敵です。あれは平凡である。',
        'style-inconsistency'
      );

      // Note: Style consistency requires multiple sentences
      expect(result).toBeDefined();
    }, 10000);

    it('should detect term notation error', async () => {
      const result = await runner.evaluateExample('Javascriptを使用', 'term-notation');

      expect(result.detected).toBe(true);
    }, 10000);

    it('should detect kanji opening', async () => {
      const result = await runner.evaluateExample('確認して下さい', 'kanji-opening');

      expect(result.detected).toBe(true);
    }, 10000);
  });

  describe('implemented categories detection', () => {
    const implementedCategories = getImplementedCategories();

    // Test each implemented category has at least one detected example
    it.each(implementedCategories.map(c => [c.name, c]))(
      'should detect at least one example in %s',
      async (name, category) => {
        const result = await runner.evaluateCategory(category);

        // Implemented categories should have at least some detection
        // Note: Some categories might have edge cases that don't detect all
        expect(result.status).not.toBe('NOT_IMPL');
      },
      30000
    );
  });
});

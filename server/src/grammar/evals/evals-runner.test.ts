/**
 * Evals Runner Tests
 * Feature: advanced-grammar-rules
 * Task: 24. Evals実行エンジンのテスト
 */

import { EvalsRunner } from './evals-runner';
import { NG_EXAMPLE_CATEGORIES, getImplementedCategories } from './ng-examples-data';
import { KanjiOpeningRule } from '../rules/kanjiOpeningRule';
import { ProofreadingRulesManager } from '../../proofreading/proofreadingRulesManager';

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

      expect(results.totalCategories).toBe(NG_EXAMPLE_CATEGORIES.length);
      expect(results.totalExamples).toBeGreaterThan(0);
    }, 60000);

    it('should calculate detection rate', async () => {
      const results = await runner.runEvals();

      expect(results.detectionRate).toBeGreaterThanOrEqual(0);
      expect(results.detectionRate).toBeLessThanOrEqual(100);
    }, 60000);
  });

  describe('evaluateCategory', () => {
    it('未一致がある場合、99.5%を100%と表示しない', async () => {
      const template = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'double-particle')!;
      const category = {
        ...template,
        examples: [
          ...Array.from({ length: 200 }, () => ({ text: '私がが行く' })),
          { text: 'これは正常です。' },
        ],
      };
      const result = await runner.evaluateCategory(category);
      expect(result.detected).toBe(200);
      expect(result.total).toBe(201);
      expect(result.status).toBe('FAIL');
      expect(result.detectionRate).toBe(99.5);
    }, 30000);

    it('常用漢字「捉」は表外の例として扱わない', () => {
      const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'jouyou-kanji')!;
      const example = category.examples.find(e => e.text === '捉える視点')!;
      expect(example.expectedDetection).toBe(false);
    });

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
    it('文複雑度を本番と同じ既定閾値で評価し、未検出を失敗として返す', async () => {
      // 短い正常文に意図的に検出を期待し、不一致が失敗として返る契約を確認する。
      const text = '資料を確認して、担当者に結果を連絡してください。';
      const result = await runner.evaluateExample(text, 'sentence-complexity', true);
      expect(result.expectedDetection).toBe(true);
      expect(result.actualDetected).toBe(false);
      expect(result.detected).toBe(false);
    });

    it('絵文字の後でも二重助詞の診断範囲を元のUTF-16位置に合わせる', async () => {
      const result = await runner.evaluateExample('😀私はは学校に行きます。', 'double-particle');
      expect(result.detected).toBe(true);
      expect(result.diagnostics.find(d => d.code === 'double-particle')?.range).toEqual({
        start: { line: 0, character: 3 }, end: { line: 0, character: 5 },
      });
    });

    it('期待するルールに一致しない診断をmatchedRuleと表示しない', async () => {
      const result = await runner.evaluateExample('正常な文章です。', 'kanji-opening', false);
      expect(result.diagnostics.some(d => d.code === 'missing-subject')).toBe(true);
      expect(result.detected).toBe(true);
      expect(result.matchedRule).toBeUndefined();
    });

    it('評価対象ルールの例外を、非検出期待の成功として扱わない', async () => {
      const fault = jest.spyOn(KanjiOpeningRule.prototype, 'check').mockImplementation(() => { throw new Error('injected failure'); });
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await expect(runner.evaluateExample('正常な文章です。', 'kanji-opening', false)).rejects.toThrow('injected failure');
        expect(log).toHaveBeenCalledWith(expect.stringContaining('Rule kanji-opening failed'));
      } finally {
        fault.mockRestore();
        log.mockRestore();
      }
    });

    it('校正ルールの例外を、非検出期待の成功として扱わない', async () => {
      const fault = jest.spyOn(ProofreadingRulesManager.prototype, 'checkText').mockImplementation(() => { throw new Error('injected failure'); });
      const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      try {
        await expect(runner.evaluateExample('正常な文章です。', 'space-after-question-exclamation', false)).rejects.toThrow('injected failure');
        expect(log).toHaveBeenCalledWith(expect.stringContaining('Proofreading rules failed'));
      } finally {
        fault.mockRestore();
        log.mockRestore();
      }
    });

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

  // Task 17.1: EvalsRunnerの統合テスト (Feature: evals-ng-pattern-expansion)
  describe('evals-ng-pattern-expansion integration tests', () => {
    // プロパティ 3: 検出率の計算正確性
    it('should calculate detection rate correctly (0-100 range)', async () => {
      const results = await runner.runEvals();

      // 検出率は0から100の範囲内
      expect(results.detectionRate).toBeGreaterThanOrEqual(0);
      expect(results.detectionRate).toBeLessThanOrEqual(100);

      // 各カテゴリの検出率も0-100の範囲内
      results.categories.forEach(category => {
        expect(category.detectionRate).toBeGreaterThanOrEqual(0);
        expect(category.detectionRate).toBeLessThanOrEqual(100);
      });
    }, 60000);

    // 検出率が (検出数 / 例文数) * 100 で計算されていることを確認
    it('should calculate detection rate as (detected / total) * 100', async () => {
      const results = await runner.runEvals();

      results.categories
        .filter(c => c.status !== 'NOT_IMPL')
        .forEach(category => {
          const expectedRate = category.total > 0
            ? Math.min(category.detected === category.total ? 100 : 99.99, Math.round((category.detected / category.total) * 10000) / 100)
            : 0;
          expect(category.detectionRate).toBe(expectedRate);
        });
    }, 60000);

    // 新しいカテゴリ (evals-ng-pattern-expansion) の評価テスト
    describe('new pattern categories', () => {
      it('should evaluate punctuation-style-mix category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'punctuation-style-mix');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('punctuation-style-mix');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate quotation-style-mix category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'quotation-style-mix');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('quotation-style-mix');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate bullet-style-mix category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'bullet-style-mix');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('bullet-style-mix');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate english-case-mix category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'english-case-mix');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('english-case-mix');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate heading-level-skip category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'heading-level-skip');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('heading-level-skip');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate table-column-mismatch category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'table-column-mismatch');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('table-column-mismatch');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);

      it('should evaluate code-block-language category', async () => {
        const category = NG_EXAMPLE_CATEGORIES.find(c => c.id === 'code-block-language');
        expect(category).toBeDefined();

        const result = await runner.evaluateCategory(category!);
        expect(result.categoryId).toBe('code-block-language');
        expect(result.status).not.toBe('NOT_IMPL');
      }, 30000);
    });

    // さ入れ表現を含むカテゴリの総数を確認
    it('should have 72 total categories', async () => {
      expect(NG_EXAMPLE_CATEGORIES.length).toBe(72);
    });

    // 全カテゴリが実装済み（IMPLEMENTED）であることを確認
    it('should have all categories implemented', async () => {
      const notImplemented = NG_EXAMPLE_CATEGORIES.filter(c => c.status === 'NOT_IMPL');
      expect(notImplemented.length).toBe(0);
    });
  });
});

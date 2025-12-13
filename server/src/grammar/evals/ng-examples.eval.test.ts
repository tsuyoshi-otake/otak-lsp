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

    it('should have 54 total categories (44 original + 10 new from evals-ng-pattern-expansion)', () => {
      expect(result.totalCategories).toBe(54);
    });

    it('should have all 54 categories implemented', () => {
      expect(result.implementedCategories).toBe(54);
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
      expect(result.categories.length).toBe(54);
    });

    it('should have valid detection counts', () => {
      expect(result.detectedExamples).toBeGreaterThanOrEqual(0);
      expect(result.detectedExamples).toBeLessThanOrEqual(result.totalExamples);
    });
  });

  // Task 22: 統合テスト - 実際の文書での検出確認 (Feature: evals-ng-pattern-expansion)
  describe('evals-ng-pattern-expansion Document Detection', () => {
    // 新しいルールの検出テスト（実際の文書例）
    const newPatternExamples = [
      // 句読点スタイルの混在
      {
        text: 'これは例文です。しかし，これは混在している。',
        ruleId: 'punctuation-style-mix',
        description: '句読点スタイルの混在'
      },
      // 引用符スタイルの混在
      {
        text: '彼は「こんにちは」と言った。彼女は"さようなら"と答えた。',
        ruleId: 'quotation-style-mix',
        description: '引用符スタイルの混在'
      },
      // 箇条書き記号の混在
      {
        text: '・項目1\n- 項目2\n* 項目3',
        ruleId: 'bullet-style-mix',
        description: '箇条書き記号の混在'
      },
      // 強調記号の混在
      {
        text: '**太字**と__下線強調__の混在。',
        ruleId: 'emphasis-style-mix',
        description: '強調記号の混在'
      },
      // 英語表記の大文字小文字混在
      {
        text: 'APIを使用します。apiの設計は重要です。',
        ruleId: 'english-case-mix',
        description: '英語表記の大文字小文字混在'
      },
      // 単位表記の混在
      {
        text: '速度は100km/hで、距離は50キロメートルです。',
        ruleId: 'unit-notation-mix',
        description: '単位表記の混在'
      },
      // 人称代名詞の混在
      {
        text: '私は開発者です。僕はプログラミングが好きです。',
        ruleId: 'pronoun-mix',
        description: '人称代名詞の混在'
      },
      // 見出しレベルの飛び
      {
        text: '# タイトル\n### サブセクション',
        ruleId: 'heading-level-skip',
        description: '見出しレベルの飛び'
      },
      // テーブル列数の不一致
      {
        text: '| A | B | C |\n|---|---|\n| 1 | 2 | 3 |',
        ruleId: 'table-column-mismatch',
        description: 'テーブル列数の不一致'
      },
      // コードブロック言語指定の欠落
      {
        text: '```\nconst x = 1;\n```',
        ruleId: 'code-block-language',
        description: 'コードブロック言語指定の欠落'
      }
    ];

    it.each(newPatternExamples)(
      'should detect $description: $text',
      async ({ text, ruleId }) => {
        const evalResult = await runner.evaluateExample(text, ruleId);
        expect(evalResult.detected).toBe(true);
      }
    );

    // 複合文書での検出テスト
    describe('Combined Document Detection', () => {
      it('should detect multiple issues in a complex document', async () => {
        const complexDocument = `# 概要

私は開発者です。

## 技術スタック

APIを使用します。apiの設計は重要です。

### 詳細

- 項目1
* 項目2
・項目3

これは例文です。しかし，混在している。`;

        // API/apiの混在
        const caseMixResult = await runner.evaluateExample(complexDocument, 'english-case-mix');
        expect(caseMixResult.detected).toBe(true);

        // 箇条書き記号の混在
        const bulletResult = await runner.evaluateExample(complexDocument, 'bullet-style-mix');
        expect(bulletResult.detected).toBe(true);

        // 句読点の混在
        const punctuationResult = await runner.evaluateExample(complexDocument, 'punctuation-style-mix');
        expect(punctuationResult.detected).toBe(true);
      });
    });
  });
});

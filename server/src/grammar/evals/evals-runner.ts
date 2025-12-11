/**
 * Evals Runner
 * Feature: advanced-grammar-rules
 * Task: 24. Evals実行エンジン
 *
 * NG例データを読み込み、GrammarCheckerで解析し、検出結果を記録する
 */

import { Token, Diagnostic } from '../../../../shared/src/types';
import {
  Sentence,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { GrammarChecker } from '../checker';
import {
  StyleConsistencyRule,
  RaNukiRule,
  DoubleNegationRule,
  ParticleRepetitionRule,
  ConjunctionRepetitionRule,
  AdversativeGaRule,
  AlphabetWidthRule,
  WeakExpressionRule,
  CommaCountRule,
  TermNotationRule,
  KanjiOpeningRule,
  RedundantExpressionRule,
  TautologyRule,
  NoParticleChainRule,
  MonotonousEndingRule,
  LongSentenceRule
} from '../rules';
import { SentenceParser } from '../sentenceParser';
import {
  NGExampleCategory,
  NG_EXAMPLE_CATEGORIES
} from './ng-examples-data';

// kuromoji用の型定義
interface KuromojiToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading?: string;
  pronunciation?: string;
  word_position: number;
}

interface KuromojiTokenizer {
  tokenize(text: string): KuromojiToken[];
}

interface KuromojiBuilder {
  build(callback: (err: Error | null, tokenizer: KuromojiTokenizer) => void): void;
}

interface Kuromoji {
  builder(options: { dicPath: string }): KuromojiBuilder;
}

/**
 * 例文評価ステータス
 */
export type EvalStatus = 'PASS' | 'FAIL' | 'NOT_IMPL';

/**
 * 例文の評価結果
 */
export interface ExampleEvalResult {
  /** 例文テキスト */
  text: string;
  /** 検出されたか */
  detected: boolean;
  /** 検出された診断情報 */
  diagnostics: Diagnostic[];
  /** 期待されるルール */
  expectedRule: string;
  /** マッチしたルール */
  matchedRule?: string;
}

/**
 * カテゴリの評価結果
 */
export interface CategoryEvalResult {
  /** カテゴリID */
  categoryId: string;
  /** カテゴリ名 */
  categoryName: string;
  /** ステータス */
  status: EvalStatus;
  /** 例文数 */
  total: number;
  /** 検出数 */
  detected: number;
  /** 検出率 */
  detectionRate: number;
  /** 各例文の結果 */
  examples: ExampleEvalResult[];
  /** 代表例文（レポート用） */
  representativeExample: string;
}

/**
 * 全体の評価結果
 */
export interface EvalResult {
  /** カテゴリ数 */
  totalCategories: number;
  /** 実装済みカテゴリ数 */
  implementedCategories: number;
  /** 全例文数 */
  totalExamples: number;
  /** 検出した例文数 */
  detectedExamples: number;
  /** 検出率（%） */
  detectionRate: number;
  /** カテゴリ別結果 */
  categories: CategoryEvalResult[];
  /** 実行日時 */
  timestamp: string;
}

/**
 * Evals実行エンジン
 */
export class EvalsRunner {
  private tokenizer: KuromojiTokenizer | null = null;
  private grammarChecker: GrammarChecker;
  private advancedRules: Map<string, {
    check: (tokens: Token[], context: RuleContext) => AdvancedDiagnostic[];
  }>;

  constructor() {
    this.grammarChecker = new GrammarChecker();
    this.advancedRules = new Map();
  }

  /**
   * 初期化（kuromoji辞書のロード）
   */
  async initialize(): Promise<void> {
    // kuromojiのロード
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const kuromoji = require('kuromoji') as Kuromoji;
    const path = require('path');
    const dicPath = path.join(__dirname, '../../../../node_modules/kuromoji/dict');

    return new Promise((resolve, reject) => {
      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) {
          reject(err);
        } else {
          this.tokenizer = tokenizer;
          this.initializeAdvancedRules();
          resolve();
        }
      });
    });
  }

  /**
   * 高度な文法ルールを初期化
   */
  private initializeAdvancedRules(): void {
    // 設定を有効化（Evals用に全て有効）
    const config = {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      enableParticleRepetition: true // デフォルトでは無効だが、Evalsでは有効化
    };

    this.advancedRules.set('style-inconsistency', new StyleConsistencyRule());
    this.advancedRules.set('ra-nuki', new RaNukiRule());
    this.advancedRules.set('double-negation', new DoubleNegationRule());
    this.advancedRules.set('particle-repetition', new ParticleRepetitionRule());
    this.advancedRules.set('conjunction-repetition', new ConjunctionRepetitionRule());
    this.advancedRules.set('adversative-ga', new AdversativeGaRule());
    this.advancedRules.set('alphabet-width', new AlphabetWidthRule());
    this.advancedRules.set('weak-expression', new WeakExpressionRule());
    this.advancedRules.set('comma-count', new CommaCountRule());
    this.advancedRules.set('term-notation', new TermNotationRule());
    this.advancedRules.set('kanji-opening', new KanjiOpeningRule());
    // Additional Grammar Rules
    this.advancedRules.set('redundant-expression', new RedundantExpressionRule());
    this.advancedRules.set('tautology', new TautologyRule());
    this.advancedRules.set('no-particle-chain', new NoParticleChainRule());
    this.advancedRules.set('monotonous-ending', new MonotonousEndingRule());
    this.advancedRules.set('long-sentence', new LongSentenceRule());
  }

  /**
   * 全カテゴリのEvalsを実行
   */
  async runEvals(): Promise<EvalResult> {
    if (!this.tokenizer) {
      await this.initialize();
    }

    const categoryResults: CategoryEvalResult[] = [];
    let totalDetected = 0;
    let totalExamples = 0;
    let implementedCount = 0;

    for (const category of NG_EXAMPLE_CATEGORIES) {
      const result = await this.evaluateCategory(category);
      categoryResults.push(result);

      totalExamples += result.total;
      if (result.status !== 'NOT_IMPL') {
        totalDetected += result.detected;
        implementedCount++;
      }
    }

    const implementedExamples = categoryResults
      .filter(r => r.status !== 'NOT_IMPL')
      .reduce((sum, r) => sum + r.total, 0);

    return {
      totalCategories: NG_EXAMPLE_CATEGORIES.length,
      implementedCategories: implementedCount,
      totalExamples,
      detectedExamples: totalDetected,
      detectionRate: implementedExamples > 0
        ? Math.round((totalDetected / implementedExamples) * 100)
        : 0,
      categories: categoryResults,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * カテゴリを評価
   */
  async evaluateCategory(category: NGExampleCategory): Promise<CategoryEvalResult> {
    if (category.status === 'NOT_IMPL') {
      return {
        categoryId: category.id,
        categoryName: category.name,
        status: 'NOT_IMPL',
        total: category.examples.length,
        detected: 0,
        detectionRate: 0,
        examples: category.examples.map(ex => ({
          text: ex.text,
          detected: false,
          diagnostics: [],
          expectedRule: category.expectedRule
        })),
        representativeExample: category.examples[0]?.text || ''
      };
    }

    const exampleResults: ExampleEvalResult[] = [];
    let detectedCount = 0;

    for (const example of category.examples) {
      const result = await this.evaluateExample(example.text, category.expectedRule);
      exampleResults.push(result);
      if (result.detected) {
        detectedCount++;
      }
    }

    const detectionRate = category.examples.length > 0
      ? Math.round((detectedCount / category.examples.length) * 100)
      : 0;

    const status: EvalStatus = detectedCount === category.examples.length
      ? 'PASS'
      : detectedCount > 0
        ? 'FAIL' // 部分的に検出
        : 'FAIL'; // 全く検出できず

    return {
      categoryId: category.id,
      categoryName: category.name,
      status,
      total: category.examples.length,
      detected: detectedCount,
      detectionRate,
      examples: exampleResults,
      representativeExample: category.examples[0]?.text || ''
    };
  }

  /**
   * 例文を評価
   */
  async evaluateExample(text: string, expectedRule: string): Promise<ExampleEvalResult> {
    if (!this.tokenizer) {
      await this.initialize();
    }

    const tokens = this.tokenize(text);
    const diagnostics: Diagnostic[] = [];

    // 基本文法チェック
    const basicDiagnostics = this.grammarChecker.check(tokens, text);
    diagnostics.push(...basicDiagnostics);

    // 高度な文法チェック
    const sentences = SentenceParser.parseSentences(text, tokens);
    const context: RuleContext = {
      documentText: text,
      sentences,
      config: {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableParticleRepetition: true
      }
    };

    Array.from(this.advancedRules.entries()).forEach(([ruleName, rule]) => {
      try {
        const advancedDiagnostics = rule.check(tokens, context);
        diagnostics.push(...advancedDiagnostics.map(d => d.toDiagnostic()));
      } catch (e) {
        // ルール実行エラーは無視
        console.error(`Rule ${ruleName} failed:`, e);
      }
    });

    // 期待されるルールまたは関連するルールで検出されたかチェック
    const detected = this.isDetected(diagnostics, expectedRule, text);
    const matchedRule = diagnostics.length > 0 ? diagnostics[0].code : undefined;

    return {
      text,
      detected,
      diagnostics,
      expectedRule,
      matchedRule
    };
  }

  /**
   * トークナイズ
   */
  private tokenize(text: string): Token[] {
    if (!this.tokenizer) {
      throw new Error('Tokenizer not initialized');
    }

    const kuromojiTokens = this.tokenizer.tokenize(text);
    let currentPos = 0;

    return kuromojiTokens.map((t: KuromojiToken) => {
      const start = currentPos;
      const end = start + t.surface_form.length;
      currentPos = end;

      return new Token({
        surface: t.surface_form,
        pos: t.pos,
        posDetail1: t.pos_detail_1 || '*',
        posDetail2: t.pos_detail_2 || '*',
        posDetail3: t.pos_detail_3 || '*',
        conjugation: t.conjugated_type || '*',
        conjugationForm: t.conjugated_form || '*',
        baseForm: t.basic_form || t.surface_form,
        reading: t.reading || '',
        pronunciation: t.pronunciation || '',
        start,
        end
      });
    });
  }

  /**
   * 検出されたかどうかを判定
   */
  private isDetected(diagnostics: Diagnostic[], expectedRule: string, text: string): boolean {
    // 診断情報がある場合、期待されるルールまたは関連するルールでの検出をチェック
    if (diagnostics.length === 0) {
      return false;
    }

    // ルールコードのマッピング（エイリアス）
    const ruleAliases: Record<string, string[]> = {
      'double-particle': ['double-particle'],
      'particle-sequence': ['particle-sequence'],
      'verb-particle-mismatch': ['verb-particle-mismatch'],
      'style-inconsistency': ['style-inconsistency'],
      'ra-nuki': ['ra-nuki'],
      'double-negation': ['double-negation'],
      'particle-repetition': ['particle-repetition'],
      'conjunction-repetition': ['conjunction-repetition'],
      'adversative-ga': ['adversative-ga'],
      'alphabet-width': ['alphabet-width'],
      'weak-expression': ['weak-expression'],
      'comma-count': ['comma-count'],
      'term-notation': ['term-notation'],
      'kanji-opening': ['kanji-opening'],
      // Additional Grammar Rules
      'redundant-expression': ['redundant-expression'],
      'tautology': ['tautology'],
      'no-particle-chain': ['no-particle-chain'],
      'monotonous-ending': ['monotonous-ending'],
      'long-sentence': ['long-sentence']
    };

    const expectedRules = ruleAliases[expectedRule] || [expectedRule];

    return diagnostics.some(d =>
      expectedRules.includes(d.code as string)
    );
  }
}

/**
 * Evalsを実行するスタンドアロン関数
 */
export async function runEvals(): Promise<EvalResult> {
  const runner = new EvalsRunner();
  await runner.initialize();
  return runner.runEvals();
}

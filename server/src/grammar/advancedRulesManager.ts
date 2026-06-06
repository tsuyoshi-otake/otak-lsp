/**
 * Advanced Rules Manager
 * 高度な文法ルールを管理し、実行を制御する
 * Feature: advanced-grammar-rules
 * Feature: advanced-rules-tiered-execution
 */

import { Token, Diagnostic } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  RuleProfilingCollector,
  AdvancedRuleSharedContext
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { SentenceParser } from './sentenceParser';
import { Logger } from '../utils/logger';
import {
  filterOutTableSentences,
  maskTableContent
} from './advancedRuleContext';
import { createDefaultAdvancedRules, LIGHTWEIGHT_RULE_NAMES } from './advancedRuleRegistry';
import { buildSharedContext as createSharedContext } from './sharedContextBuilder';
import { DiagnosticRangeFixer } from './diagnosticRangeFixer';
import { RuleExecutionEngine } from './ruleExecutionEngine';
import { ParallelRuleExecutor } from './parallelRuleExecutor';
import { splitLines as splitLinesUtil } from '../utils/stringUtils';
import { WorkerPoolManager } from '../workers/workerPoolManager';

type RuleExecutionOptions = { analyzeTables?: boolean };

interface PreparedRuleContext {
  readonly baseContext: RuleContext;
  readonly originalText: string;
  /**
   * originalText に対する shared context。
   * effectiveText !== originalText のときだけ計算する（テーブルマスク有りの Markdown）。
   * ORIGINAL_TEXT 系ルールの documentText 差し替え時にこれを使い、lines/codeRanges の再計算を抑える。
   */
  readonly originalShared?: AdvancedRuleSharedContext;
  /**
   * この解析サイクル専用のレンジ補正器。effectiveText の行構造から構築され、
   * 各 check メソッドの最終段でオフセットベース range を行/文字ベースへ変換する。
   */
  readonly rangeFixer: DiagnosticRangeFixer;
}

/**
 * Advanced Rules Manager
 * すべての高度な文法ルールを管理・実行する
 */
export class AdvancedRulesManager {
  private rules: AdvancedGrammarRule[];
  private config: AdvancedRulesConfig;

  /** in-process でのルール実行（同期 / 協調 async）を担うエンジン */
  private readonly executionEngine: RuleExecutionEngine;

  /** 並列実行用 worker pool のライフサイクル管理 */
  private readonly workerPoolManager: WorkerPoolManager;

  /** worker pool へルールを分配して並列実行するオーケストレーター */
  private readonly parallelExecutor: ParallelRuleExecutor;

  /**
   * 共有コンテキストを構築する
   * Feature: advanced-rules-shared-preprocessing-cache
   *
   * 複数のルールで共通して使用する前処理結果を1回の解析で計算し、
   * 解析サイクル内で再利用できるようにする。
   *
   * @param text 解析対象のテキスト
   * @param precomputedLineStarts 既に算出済みの lineStarts
   * @param precomputedLines 既に算出済みの lines
   * @returns 共有コンテキスト
   */
  private buildSharedContext(
    text: string,
    precomputedLineStarts?: number[],
    precomputedLines?: string[]
  ): AdvancedRuleSharedContext {
    return createSharedContext(text, precomputedLineStarts, precomputedLines);
  }

  private prepareRuleContext(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    precomputedLineStarts?: number[]
  ): PreparedRuleContext {
    const shouldExcludeTables = Boolean(excludedRanges) && options?.analyzeTables !== true;
    const effectiveText = shouldExcludeTables && excludedRanges
      ? maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）。
    // maskTableContent も MarkdownFilter も改行と長さを保持するため、
    // 上位で算出した lineStarts と effectiveText の lineStarts は一致する。
    // 行構造はレンジ補正器に閉じ込め、共有コンテキスト構築では同じ lineStarts を使い回す。
    const rangeFixer = DiagnosticRangeFixer.fromText(effectiveText, precomputedLineStarts);
    const lineStarts = rangeFixer.getLineStarts();

    // 解析サイクル全体で利用する行配列を 1 度だけ計算する。
    // SentenceParser / 共有コンテキスト / Markdown 構造系ルールがすべて再利用するため、
    // ここで作って明示的に渡すことで splitLines の重複を解析サイクル単位で 1 回にまとめる。
    const effectiveLines = splitLinesUtil(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(
      effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode, effectiveLines
    );
    const sentences = shouldExcludeTables && excludedRanges
      ? filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;

    const baseShared = this.buildSharedContext(effectiveText, lineStarts, effectiveLines);
    const baseContext: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config,
      shared: baseShared
    };

    // originalText !== effectiveText のときのみ originalShared を作る。
    // 行構造は maskTableContent が改行・長さを保持するため lineStarts は共有可能。
    // ただし lines (= 行の中身) と code/inline 範囲は元テキストに依存するため別計算する。
    const originalShared = effectiveText === text
      ? undefined
      : this.buildSharedContext(text, lineStarts);

    return {
      baseContext,
      originalText: text,
      originalShared,
      rangeFixer
    };
  }

  private checkSelectedRules(
    text: string,
    tokens: Token[],
    selectedRules: AdvancedGrammarRule[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const { baseContext, originalText, originalShared, rangeFixer } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );
    const diagnostics = this.executionEngine.runSync(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      originalShared,
      profilingCollector
    );

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => rangeFixer.fix(d.toDiagnostic()));
  }

  /**
   * 非同期協調版: ルールを K 件ごとに区切って `setImmediate` で
   * イベントループに制御を返しながら実行する。
   * 同期版と挙動互換だが、LSP サーバが解析中も他リクエストへ応答できる。
   */
  private async checkSelectedRulesAsync(
    text: string,
    tokens: Token[],
    selectedRules: AdvancedGrammarRule[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const { baseContext, originalText, originalShared, rangeFixer } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );
    const diagnostics = await this.executionEngine.runAsync(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      originalShared,
      profilingCollector
    );

    return diagnostics.map(d => rangeFixer.fix(d.toDiagnostic()));
  }

  constructor(config?: Partial<AdvancedRulesConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config };
    this.rules = createDefaultAdvancedRules();
    this.executionEngine = new RuleExecutionEngine(logger);
    this.workerPoolManager = new WorkerPoolManager(logger);
    this.parallelExecutor = new ParallelRuleExecutor(logger);
  }

  /**
   * ルールを登録
   */
  registerRule(rule: AdvancedGrammarRule): void {
    this.rules.push(rule);
  }

  /**
   * ルールを解除
   */
  unregisterRule(ruleName: string): void {
    this.rules = this.rules.filter(r => r.name !== ruleName);
  }

  /**
   * 有効なルールを取得
   */
  getEnabledRules(): AdvancedGrammarRule[] {
    return this.rules.filter(rule => rule.isEnabled(this.config));
  }

  /**
   * 軽量ルール名リストを取得
   * Feature: advanced-rules-tiered-execution
   */
  getLightweightRuleNames(): readonly string[] {
    return LIGHTWEIGHT_RULE_NAMES;
  }

  /**
   * ルールが軽量ルールかどうかを判定
   * Feature: advanced-rules-tiered-execution
   */
  isLightweightRule(ruleName: string): boolean {
    return LIGHTWEIGHT_RULE_NAMES.includes(ruleName);
  }

  /**
   * 軽量ルールのみでチェック
   * Feature: advanced-rules-tiered-execution
   *
   * 入力中のレスポンス改善のため、コストの低いルールのみを実行する。
   */
  checkLightweightRules(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    return this.checkWithRules(
      text,
      tokens,
      [...LIGHTWEIGHT_RULE_NAMES],
      excludedRanges,
      options,
      profilingCollector,
      precomputedLineStarts
    );
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<AdvancedRulesConfig>): void {
    const prevParallel = this.config.parallelExecution;
    this.config = { ...this.config, ...config };
    // parallelExecution の設定が変わったら worker pool を作り直す。
    // 明示的に破棄しないと「実行中の enabled 切り替え / maxWorkers 変更」が反映されない。
    this.workerPoolManager.onConfigChanged(prevParallel, this.config.parallelExecution);
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): AdvancedRulesConfig {
    return { ...this.config };
  }

  /**
   * テキストをチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   * (Feature: advanced-rules-profiling) - コレクタが渡された場合はルール別計測を実行
   */
  checkText(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const enabledRules = this.getEnabledRules();
    return this.checkSelectedRules(
      text, tokens, enabledRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  /**
   * 特定のルールのみでチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   * (Feature: advanced-rules-profiling) - コレクタが渡された場合はルール別計測を実行
   */
  checkWithRules(
    text: string,
    tokens: Token[],
    ruleNames: string[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const selectedRules = this.rules.filter(r => ruleNames.includes(r.name) && r.isEnabled(this.config));
    return this.checkSelectedRules(
      text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  // ============================================================================
  // 非同期協調スケジューラ版の公開 API
  //
  // - 同期版と挙動互換だが、ルールを K=8 件ごとに `setImmediate` で区切って実行する
  // - これにより解析中も LSP サーバは他リクエスト (hover / didChange / cancel) に
  //   応答できる: Amdahl 法則の「順次部分」を分割して I/O ステージと並走させる
  // - テスト互換性のため同期版 API は据え置き
  // ============================================================================

  /**
   * 非同期協調版: すべての有効ルールでチェックする。
   */
  async checkTextAsync(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const enabledRules = this.getEnabledRules();
    return this.checkSelectedRulesAsync(
      text, tokens, enabledRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  /**
   * 非同期協調版: 軽量ルールのみでチェックする。
   */
  async checkLightweightRulesAsync(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const selectedRules = this.rules.filter(
      (r) => LIGHTWEIGHT_RULE_NAMES.includes(r.name) && r.isEnabled(this.config)
    );
    return this.checkSelectedRulesAsync(
      text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  // ============================================================================
  // 並列実行 API
  // Feature: parallel-advanced-rules
  //
  // worker_threads ベースで N 個のワーカーにルール集合を K-partition 配り、
  // CPU 物理コア数までスケールする。
  //
  // - フィーチャーフラグ: config.parallelExecution.enabled。既定 false なので、
  //   既存テストは無影響
  // - main 側で `prepareRuleContext` を 1 度だけ実行し、その結果を全 worker に共通配布
  //   (sentence parse の重複計算を回避)
  // - フォールバック: worker pool 初期化失敗 / 全 worker 死亡時は `checkSelectedRulesAsync` を呼ぶ
  // ============================================================================

  /**
   * 並列実行: すべての有効ルールでチェックする。
   * フラグ off / 環境不適合の場合は async 協調版へフォールバック。
   */
  async checkTextParallel(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const enabledRules = this.getEnabledRules();
    return this.checkSelectedRulesParallel(
      text, tokens, enabledRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  /**
   * 並列実行: 軽量ルールのみでチェックする。
   */
  async checkLightweightRulesParallel(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const selectedRules = this.rules.filter(
      (r) => LIGHTWEIGHT_RULE_NAMES.includes(r.name) && r.isEnabled(this.config)
    );
    return this.checkSelectedRulesParallel(
      text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }

  /**
   * worker pool を停止する。テストや LSP サーバの shutdown 時に呼ぶ。
   */
  async shutdown(): Promise<void> {
    await this.workerPoolManager.shutdown();
  }

  /**
   * worker pool が現在アクティブ（起動済みかつ未破棄）かどうか。テスト・診断用。
   */
  hasActiveWorkerPool(): boolean {
    return this.workerPoolManager.isActive();
  }

  /**
   * 指定ルール集合を worker pool で並列実行する。
   * pool 不在・失敗時は `checkSelectedRulesAsync` にフォールバックする。
   *
   * pool のライフサイクルは WorkerPoolManager、worker への分配・集約は
   * ParallelRuleExecutor が担い、本メソッドはその配線（フォールバック thunk の供給）だけを行う。
   */
  private async checkSelectedRulesParallel(
    text: string,
    tokens: Token[],
    selectedRules: AdvancedGrammarRule[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Promise<Diagnostic[]> {
    const fallback = (): Promise<Diagnostic[]> => this.checkSelectedRulesAsync(
      text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );

    const pool = this.workerPoolManager.ensure(this.config.parallelExecution);
    if (!pool || selectedRules.length === 0) {
      return fallback();
    }

    const prepared = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );

    return this.parallelExecutor.run(
      pool,
      selectedRules,
      tokens,
      prepared,
      this.config,
      excludedRanges,
      profilingCollector,
      () => this.workerPoolManager.markFailed(),
      fallback
    );
  }
}

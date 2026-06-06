/**
 * Advanced Rules Manager
 * 高度な文法ルールを管理し、実行を制御する
 * Feature: advanced-grammar-rules
 * Feature: advanced-rules-tiered-execution
 */

import * as os from 'os';
import * as path from 'path';

import { Token, Diagnostic, Position } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  AdvancedDiagnostic,
  RuleProfilingEntry,
  RuleProfilingCollector,
  AdvancedRuleSharedContext,
  ParallelExecutionConfig
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { SentenceParser } from './sentenceParser';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { logError, formatError } from '../utils/errorHandler';
import {
  buildRuleContextForRule,
  filterOutTableSentences,
  maskTableContent
} from './advancedRuleContext';
import { createDefaultAdvancedRules, LIGHTWEIGHT_RULE_NAMES } from './advancedRuleRegistry';
import { buildSharedContext as createSharedContext } from './sharedContextBuilder';
import { splitLines as splitLinesUtil } from '../utils/stringUtils';
import { WorkerPool } from '../workers/workerPool';
import {
  serializeSentences,
  serializeTokens,
  SerializedSentence,
  SerializedToken,
} from '../workers/tokenSerializer';
import type {
  RunRulesMessage,
  RunRulesResultPayload,
} from '../workers/advancedRulesWorker';

type RuleExecutionOptions = { analyzeTables?: boolean };

/**
 * イベントループへ制御を返すヘルパー。
 *
 * `setImmediate` は Node.js のマクロタスクとしてキューに積まれるため、
 * I/O コールバック、保留中の LSP リクエスト、他の `setImmediate` 等を
 * 1 回のターンで処理する余地を与える。
 * Promise の microtask だけだと連続して走るため LSP の応答が止まる。
 */
function yieldToEventLoop(): Promise<void> {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

interface PreparedRuleContext {
  readonly baseContext: RuleContext;
  readonly originalText: string;
  /**
   * originalText に対する shared context。
   * effectiveText !== originalText のときだけ計算する（テーブルマスク有りの Markdown）。
   * ORIGINAL_TEXT 系ルールの documentText 差し替え時にこれを使い、lines/codeRanges の再計算を抑える。
   */
  readonly originalShared?: AdvancedRuleSharedContext;
}

/**
 * Worker pool 起動失敗フラグ用センチネル。
 * 一度失敗したら以降は in-process フォールバックする。
 */
const POOL_INIT_FAILED = Symbol('POOL_INIT_FAILED');

type PoolInitResult = WorkerPool<Omit<RunRulesMessage, 'id'>, RunRulesResultPayload> | typeof POOL_INIT_FAILED;

/**
 * Advanced Rules Manager
 * すべての高度な文法ルールを管理・実行する
 */
export class AdvancedRulesManager {
  private rules: AdvancedGrammarRule[];
  private config: AdvancedRulesConfig;
  private lineStarts: number[] = [];
  private firstLineLength: number = 0;
  private logger: Logger | undefined;

  /** 並列実行用 worker pool (lazy init)。POOL_INIT_FAILED の場合は初期化済みかつ失敗 */
  private workerPool: PoolInitResult | null = null;

  /**
   * テキストから行開始位置を計算
   * (Feature: diagnostic-range-fix)
   *
   * 解析サイクルの上位で既に lineStarts が算出済みなら、それを使い回す。
   * テキスト先頭行長 (firstLineLength) も上位から渡せる場合は再計算を避ける。
   */
  private calculateLineStarts(text: string, precomputed?: number[]): void {
    this.lineStarts = precomputed ?? computeLineStarts(text);
    if (this.lineStarts.length >= 2) {
      // computeLineStarts は最初の改行直後の位置を index=1 に持つので、
      // それから 1 を引いた値が「最初の改行までの長さ」になる
      this.firstLineLength = this.lineStarts[1] - 1;
    } else {
      this.firstLineLength = text.length;
    }
  }

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

  /**
   * オフセットから行と文字位置を取得
   * (Feature: diagnostic-range-fix)
   */
  private offsetToPosition(offset: number): Position {
    return offsetToLineAndCharacter(this.lineStarts, offset);
  }

  /**
   * 診断のrangeがオフセットベースかどうかを判定して必要に応じて変換
   * (Feature: diagnostic-range-fix)
   *
   * 判定ロジック:
   * - line: 0 かつ character が最初の行の長さを超えている場合はオフセットベースと判断
   * - それ以外は正しい行/文字ベースと判断してそのまま返す
   *
   * 要件 1.2: 既に正しい範囲を持っている場合は変更しない
   * 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
   */
  private fixDiagnosticRange(diagnostic: Diagnostic): Diagnostic {
    const { start, end } = diagnostic.range;

    // 行番号が0でない場合、または両方の行番号が異なる場合は
    // 既に正しい行/文字ベースの位置を持っていると判断
    if (start.line !== 0 || end.line !== 0 || start.line !== end.line) {
      return diagnostic;
    }

    // line: 0 の場合、character が最初の行の長さを超えているかチェック
    // 超えている場合はオフセットベースと判断して変換
    const maxChar = Math.max(start.character, end.character);
    if (maxChar > this.firstLineLength) {
      // オフセットベースの範囲を行/文字ベースに変換
      const newStart = this.offsetToPosition(start.character);
      const newEnd = this.offsetToPosition(end.character);
      return {
        ...diagnostic,
        range: { start: newStart, end: newEnd }
      };
    }

    // 最初の行の範囲内なので、正しい行/文字ベースと判断
    return diagnostic;
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
    this.calculateLineStarts(effectiveText, precomputedLineStarts);

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

    const baseShared = this.buildSharedContext(effectiveText, this.lineStarts, effectiveLines);
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
      : this.buildSharedContext(text, this.lineStarts);

    return {
      baseContext,
      originalText: text,
      originalShared
    };
  }

  private runRules(
    rules: AdvancedGrammarRule[],
    tokens: Token[],
    baseContext: RuleContext,
    excludedRanges: ExcludedRange[] | undefined,
    originalText: string,
    originalShared: AdvancedRuleSharedContext | undefined,
    profilingCollector?: RuleProfilingCollector
  ): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const rule of rules) {
      this.runSingleRule(
        rule, tokens, baseContext, excludedRanges, originalText, originalShared,
        diagnostics, profilingCollector
      );
    }

    return diagnostics;
  }

  /**
   * 1 つのルールを実行し、結果を `diagnostics` へ追記する。
   * 例外時はログのみ残し処理を継続する。プロファイラ計測も内包する。
   */
  private runSingleRule(
    rule: AdvancedGrammarRule,
    tokens: Token[],
    baseContext: RuleContext,
    excludedRanges: ExcludedRange[] | undefined,
    originalText: string,
    originalShared: AdvancedRuleSharedContext | undefined,
    sinkDiagnostics: AdvancedDiagnostic[],
    profilingCollector?: RuleProfilingCollector
  ): void {
    const startTime = profilingCollector ? Date.now() : 0;
    let ruleDiagnostics: AdvancedDiagnostic[] = [];
    let ruleSuccess = true;
    let ruleErrorMessage: string | undefined;

    try {
      const ruleContext = buildRuleContextForRule(rule, baseContext, excludedRanges, originalText, originalShared);
      ruleDiagnostics = rule.check(tokens, ruleContext);
      sinkDiagnostics.push(...ruleDiagnostics);
    } catch (error) {
      logError(this.logger, `Error in rule ${rule.name}`, error);
      ruleSuccess = false;
      ruleErrorMessage = formatError(error);
    }

    if (profilingCollector) {
      const executionTimeMs = Date.now() - startTime;
      const entry: RuleProfilingEntry = {
        ruleName: rule.name,
        executionTimeMs,
        diagnosticsCount: ruleDiagnostics.length,
        success: ruleSuccess,
        errorMessage: ruleErrorMessage
      };
      profilingCollector.entries.push(entry);
      profilingCollector.totalTimeMs += executionTimeMs;
    }
  }

  /**
   * ルール群を K 件ごとに区切って実行し、各区切りで `setImmediate` により
   * イベントループへ制御を返す協調的スケジューラ。
   *
   * - CPU 総量は同期版と同じ
   * - LSP サーバが解析中も他リクエスト (hover / didChange / cancel) に応答できる
   * - Gustafson 観点: 同じ wall-clock に「より多くの仕事」を載せられる
   */
  private async runRulesAsync(
    rules: AdvancedGrammarRule[],
    tokens: Token[],
    baseContext: RuleContext,
    excludedRanges: ExcludedRange[] | undefined,
    originalText: string,
    originalShared: AdvancedRuleSharedContext | undefined,
    profilingCollector?: RuleProfilingCollector
  ): Promise<AdvancedDiagnostic[]> {
    const diagnostics: AdvancedDiagnostic[] = [];
    const BATCH_SIZE = 8;

    for (let i = 0; i < rules.length; i++) {
      this.runSingleRule(
        rules[i], tokens, baseContext, excludedRanges, originalText, originalShared,
        diagnostics, profilingCollector
      );

      // BATCH_SIZE ルールごとにイベントループへ制御を返す。
      // 最後のバッチでは yield しない (戻り値で即座に解決させる)。
      if ((i + 1) % BATCH_SIZE === 0 && i + 1 < rules.length) {
        await yieldToEventLoop();
      }
    }

    return diagnostics;
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
    const { baseContext, originalText, originalShared } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );
    const diagnostics = this.runRules(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      originalShared,
      profilingCollector
    );

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
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
    const { baseContext, originalText, originalShared } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );
    const diagnostics = await this.runRulesAsync(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      originalShared,
      profilingCollector
    );

    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }

  constructor(config?: Partial<AdvancedRulesConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config };
    this.logger = logger;
    this.rules = createDefaultAdvancedRules();
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
    // ensureWorkerPool() は enabled 判定より前にキャッシュ済みプールを返すため、
    // ここで明示的に破棄しないと「実行中の enabled 切り替え / maxWorkers 変更」が反映されない。
    if (this.parallelConfigChanged(prevParallel, this.config.parallelExecution)) {
      this.resetWorkerPool();
    }
  }

  /**
   * parallelExecution 設定（enabled / maxWorkers / workerScript）に差があるか。
   */
  private parallelConfigChanged(
    prev: ParallelExecutionConfig | undefined,
    next: ParallelExecutionConfig | undefined
  ): boolean {
    return (
      (prev?.enabled ?? false) !== (next?.enabled ?? false) ||
      (prev?.maxWorkers ?? 0) !== (next?.maxWorkers ?? 0) ||
      (prev?.workerScript ?? '') !== (next?.workerScript ?? '')
    );
  }

  /**
   * worker pool を即座に切り離し、バックグラウンドで終了させる。
   * 次回の ensureWorkerPool() で最新の設定に基づき再生成（または無効化）される。
   */
  private resetWorkerPool(): void {
    const pool = this.workerPool;
    this.workerPool = null;
    if (pool && pool !== POOL_INIT_FAILED) {
      pool.shutdown().catch(() => undefined);
    }
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
    const pool = this.workerPool;
    if (pool && pool !== POOL_INIT_FAILED) {
      await pool.shutdown();
    }
    this.workerPool = null;
  }

  /**
   * worker pool が現在アクティブ（起動済みかつ未破棄）かどうか。テスト・診断用。
   */
  hasActiveWorkerPool(): boolean {
    return this.workerPool !== null && this.workerPool !== POOL_INIT_FAILED;
  }

  /**
   * worker pool を lazy init する。失敗したら POOL_INIT_FAILED を入れて以降 fall back。
   *
   * テストで worker bundle が無い環境でも config フラグ off なら呼ばれないので問題ない。
   * フラグ on でも bundle が無ければ Worker constructor が同期 throw するため、catch して
   * フォールバックする。
   */
  private ensureWorkerPool():
    | WorkerPool<Omit<RunRulesMessage, 'id'>, RunRulesResultPayload>
    | null {
    if (this.workerPool && this.workerPool !== POOL_INIT_FAILED) {
      return this.workerPool;
    }
    if (this.workerPool === POOL_INIT_FAILED) {
      return null;
    }

    const cfg = this.config.parallelExecution;
    if (!cfg?.enabled) {
      return null;
    }

    try {
      const defaultMax = Math.max(1, os.cpus().length - 1);
      const requestedMax = cfg.maxWorkers ?? defaultMax;
      const size = Math.max(1, Math.min(requestedMax, defaultMax));
      const workerScript =
        cfg.workerScript ?? path.join(__dirname, 'advancedRulesWorker.js');
      const pool = new WorkerPool<Omit<RunRulesMessage, 'id'>, RunRulesResultPayload>({
        workerScript,
        size,
      });
      this.workerPool = pool;
      return pool;
    } catch (e) {
      logError(this.logger, 'Failed to init worker pool, falling back to in-process', e);
      this.workerPool = POOL_INIT_FAILED;
      return null;
    }
  }

  /**
   * ルールを K パーティションに round-robin で分割する。
   * 同一 worker が同じ ruleNames セットを継続的に受け取るため、ルール内部キャッシュが再利用される。
   */
  private partitionRules(rules: AdvancedGrammarRule[], parts: number): AdvancedGrammarRule[][] {
    const buckets: AdvancedGrammarRule[][] = [];
    for (let i = 0; i < parts; i++) {
      buckets.push([]);
    }
    for (let i = 0; i < rules.length; i++) {
      buckets[i % parts].push(rules[i]);
    }
    return buckets.filter((b) => b.length > 0);
  }

  /**
   * Diagnostic[] を安定ソートする。
   * 並列実行で worker ごとに順序が非決定的に返るため、最終結果は
   * (range.start.line, range.start.character, code) で安定的に並べる。
   */
  private sortDiagnostics(diags: Diagnostic[]): Diagnostic[] {
    const indexed = diags.map((d, idx) => ({ d, idx }));
    indexed.sort((a, b) => {
      const al = a.d.range.start.line;
      const bl = b.d.range.start.line;
      if (al !== bl) return al - bl;
      const ac = a.d.range.start.character;
      const bc = b.d.range.start.character;
      if (ac !== bc) return ac - bc;
      const acode = String(a.d.code);
      const bcode = String(b.d.code);
      if (acode !== bcode) return acode < bcode ? -1 : 1;
      return a.idx - b.idx;
    });
    return indexed.map((x) => x.d);
  }

  /**
   * 指定ルール集合を worker pool で並列実行する。
   * pool 不在・失敗時は `checkSelectedRulesAsync` にフォールバック。
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
    const pool = this.ensureWorkerPool();
    if (!pool || selectedRules.length === 0) {
      return this.checkSelectedRulesAsync(
        text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
      );
    }

    const { baseContext, originalText, originalShared } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );

    const partitions = this.partitionRules(selectedRules, Math.max(1, pool.size));
    const enableProfiling = !!profilingCollector;

    // tokens / sentences は全 partition で共通なので 1 度だけ serialize する
    const serializedTokens: SerializedToken[] = serializeTokens(tokens);
    const serializedSentences: SerializedSentence[] = serializeSentences(baseContext.sentences);
    const baseShared = baseContext.shared;
    if (!baseShared) {
      // shared が無いケースは設計上ないが、念のため async fallback
      return this.checkSelectedRulesAsync(
        text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
      );
    }

    try {
      const responses = await Promise.all(
        partitions.map((bucket) => {
          const ruleNames = bucket.map((r) => r.name);
          const message: Omit<RunRulesMessage, 'id'> = {
            ruleNames,
            config: this.config,
            serializedTokens,
            baseContext: {
              documentText: baseContext.documentText,
              serializedSentences,
              shared: baseShared,
            },
            originalText,
            originalShared,
            excludedRanges,
            enableProfiling,
          };
          return pool.submit(message);
        })
      );

      const merged: Diagnostic[] = [];
      for (const r of responses) {
        merged.push(...r.diagnostics);
      }
      if (profilingCollector) {
        for (const r of responses) {
          if (r.profilingEntries) {
            profilingCollector.entries.push(...r.profilingEntries);
          }
          if (typeof r.totalTimeMs === 'number') {
            profilingCollector.totalTimeMs += r.totalTimeMs;
          }
        }
      }

      // 並列で順序が壊れるので、最終結果は安定ソートしてから返す
      return this.sortDiagnostics(merged).map((d) => this.fixDiagnosticRange(d));
    } catch (e) {
      // worker が全滅したらフラグごと無効化して in-process フォールバック
      logError(this.logger, 'Worker pool execution failed, falling back to in-process', e);
      this.workerPool = POOL_INIT_FAILED;
      return this.checkSelectedRulesAsync(
        text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
      );
    }
  }
}

// WorkerPool は size プロパティを type で expose していないため、
// ensureWorkerPool 内の `pool.size` 参照を満たすためのインターフェース補助。
// 実体は workerPool.ts の WorkerPool クラスの `desiredSize` を public な `size` getter に。

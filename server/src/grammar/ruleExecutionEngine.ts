/**
 * Rule Execution Engine
 * Feature: advanced-grammar-rules / advanced-rules-tiered-execution
 *
 * AdvancedRulesManager から分離した「ルール集合を 1 件ずつ実行する」責務。
 *   - 各ルールの実行と診断の収集
 *   - 例外の隔離（1 ルールが落ちても他ルールは継続）
 *   - プロファイリング計測（任意）
 *   - 協調スケジューリング（async 版で `setImmediate` を挟みイベントループへ制御を返す）
 *
 * worker pool での並列実行・コンテキスト準備・レンジ補正は別コンポーネントの責務であり、
 * このエンジンは「与えられたルールとコンテキストを in-process で回す」ことだけに責任を持つ。
 */

import { Token } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  RuleContext,
  AdvancedDiagnostic,
  RuleProfilingEntry,
  RuleProfilingCollector,
  AdvancedRuleSharedContext,
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Logger } from '../utils/logger';
import { logError, formatError } from '../utils/errorHandler';
import { buildRuleContextForRule } from './advancedRuleContext';

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

export class RuleExecutionEngine {
  private readonly logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * ルール群を同期実行し、収集した診断を返す。
   */
  runSync(
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
   * ルール群を K 件ごとに区切って実行し、各区切りで `setImmediate` により
   * イベントループへ制御を返す協調的スケジューラ。
   *
   * - CPU 総量は同期版と同じ
   * - LSP サーバが解析中も他リクエスト (hover / didChange / cancel) に応答できる
   * - Gustafson 観点: 同じ wall-clock に「より多くの仕事」を載せられる
   */
  async runAsync(
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

  /**
   * 1 つのルールを実行し、結果を `sinkDiagnostics` へ追記する。
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
}

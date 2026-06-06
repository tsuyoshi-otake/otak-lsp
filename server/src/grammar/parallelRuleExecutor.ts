/**
 * Parallel Rule Executor
 * Feature: parallel-advanced-rules
 *
 * AdvancedRulesManager から分離した「ルール集合を worker pool へ分配して並列実行する」責務。
 *   - ルールの K パーティション分割（round-robin）
 *   - tokens / sentences の直列化（全 partition 共通なので 1 度だけ）
 *   - worker への submit と結果のマージ・プロファイリング集約
 *   - worker ごとに非決定的な順序を安定ソートで吸収し、最後にレンジ補正
 *   - 失敗時は呼び出し側の in-process フォールバックへ委譲
 *
 * worker pool の生存管理は WorkerPoolManager、in-process 実行は RuleExecutionEngine、
 * コンテキスト準備は呼び出し側（manager）の責務であり、このクラスは
 * 「準備済みコンテキストを worker へ配って集約する」ことだけに責任を持つ。
 */

import { Token, Diagnostic } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  RuleProfilingCollector,
  AdvancedRuleSharedContext,
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { DiagnosticRangeFixer } from './diagnosticRangeFixer';
import { ManagedWorkerPool } from '../workers/workerPoolManager';
import {
  serializeSentences,
  serializeTokens,
  SerializedSentence,
  SerializedToken,
} from '../workers/tokenSerializer';
import type { RunRulesMessage } from '../workers/advancedRulesWorker';

/**
 * 並列実行に必要な、準備済みのルールコンテキスト。
 * manager 側の prepareRuleContext が生成して渡す。
 */
export interface PreparedParallelContext {
  readonly baseContext: RuleContext;
  readonly originalText: string;
  readonly originalShared?: AdvancedRuleSharedContext;
  readonly rangeFixer: DiagnosticRangeFixer;
}

export class ParallelRuleExecutor {
  private readonly logger: Logger | undefined;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * 指定ルール集合を worker pool で並列実行する。
   *
   * @param fallback shared 欠落 / worker 全滅時に呼ぶ in-process フォールバック
   * @param onFatal worker 全滅など、以降の並列実行を諦めるべき致命的失敗の通知
   */
  async run(
    pool: ManagedWorkerPool,
    selectedRules: AdvancedGrammarRule[],
    tokens: Token[],
    prepared: PreparedParallelContext,
    config: AdvancedRulesConfig,
    excludedRanges: ExcludedRange[] | undefined,
    profilingCollector: RuleProfilingCollector | undefined,
    onFatal: () => void,
    fallback: () => Promise<Diagnostic[]>
  ): Promise<Diagnostic[]> {
    const { baseContext, originalText, originalShared, rangeFixer } = prepared;

    const partitions = this.partitionRules(selectedRules, Math.max(1, pool.size));
    const enableProfiling = !!profilingCollector;

    // tokens / sentences は全 partition で共通なので 1 度だけ serialize する
    const serializedTokens: SerializedToken[] = serializeTokens(tokens);
    const serializedSentences: SerializedSentence[] = serializeSentences(baseContext.sentences);
    const baseShared = baseContext.shared;
    if (!baseShared) {
      // shared が無いケースは設計上ないが、念のため async fallback
      return fallback();
    }

    try {
      const responses = await Promise.all(
        partitions.map((bucket) => {
          const ruleNames = bucket.map((r) => r.name);
          const message: Omit<RunRulesMessage, 'id'> = {
            ruleNames,
            config,
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
      return this.sortDiagnostics(merged).map((d) => rangeFixer.fix(d));
    } catch (e) {
      // worker が全滅したらフラグごと無効化して in-process フォールバック
      logError(this.logger, 'Worker pool execution failed, falling back to in-process', e);
      onFatal();
      return fallback();
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
}

/**
 * Profiler Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.6
 *
 * プロファイリングとログ出力を担当
 */

import { RuleProfilingCollector } from '../../../shared/src/advancedTypes';

/**
 * プロファイル計測ステップ
 */
export interface ProfileStep {
  name: string;
  ms: number;
  meta?: string;
}

/**
 * プロファイラーインターフェース
 */
export interface Profiler {
  /**
   * プロファイリングが有効かどうかを返す
   */
  isEnabled(): boolean;

  /**
   * ステップを記録（内部使用用、主にrecordStepのために保持）
   */
  recordStep(name: string, startTime: number, meta?: string): ProfileStep | null;

  /**
   * プロファイルブロックをログ出力
   */
  logBlock(title: string, headerMeta: string, steps: ProfileStep[], totalMs: number): void;

  /**
   * ルール別プロファイルログを出力
   * Feature: advanced-rules-profiling
   */
  logRuleProfilingBlock(uri: string, version: number, collector: RuleProfilingCollector): void;
}

/**
 * ミリ秒をフォーマット
 */
function formatMs(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

/**
 * パーセンテージをフォーマット
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * プロファイラーを作成
 *
 * @param logger ログ出力関数
 * @param isEnabledFn プロファイリングが有効かどうかを返す関数
 */
export function createProfiler(
  logger: (message: string) => void,
  isEnabledFn: () => boolean
): Profiler {
  return {
    isEnabled(): boolean {
      return isEnabledFn();
    },

    recordStep(name: string, startTime: number, meta?: string): ProfileStep | null {
      if (!isEnabledFn()) {
        return null;
      }
      return { name, ms: Date.now() - startTime, meta };
    },

    logBlock(title: string, headerMeta: string, steps: ProfileStep[], totalMs: number): void {
      if (!isEnabledFn()) {
        return;
      }

      logger(`[PROFILE] ${title} ${headerMeta} total=${formatMs(totalMs)}`);

      if (steps.length === 0) {
        return;
      }

      for (const step of steps) {
        const ratio = totalMs > 0 ? (step.ms / totalMs) * 100 : 0;
        const meta = step.meta ? ` ${step.meta}` : '';
        logger(`  ${step.name}=${formatMs(step.ms)} (${formatPercent(ratio)})${meta}`);
      }
    },

    logRuleProfilingBlock(uri: string, version: number, collector: RuleProfilingCollector): void {
      if (!isEnabledFn()) {
        return;
      }

      if (collector.entries.length === 0) {
        return;
      }

      // 実行時間の降順でソート
      const sortedEntries = [...collector.entries].sort(
        (a, b) => b.executionTimeMs - a.executionTimeMs
      );

      // ヘッダーを出力
      logger(
        `[PROFILE] 高度ルール内訳 uri=${uri} version=${version} total=${formatMs(collector.totalTimeMs)}`
      );

      for (const entry of sortedEntries) {
        const ratio = collector.totalTimeMs > 0
          ? (entry.executionTimeMs / collector.totalTimeMs) * 100
          : 0;

        let logLine = `  rule=${entry.ruleName} ${formatMs(entry.executionTimeMs)} (${formatPercent(ratio)}) diagnostics=${entry.diagnosticsCount}`;

        // 失敗したルールは error=... を付与
        if (!entry.success && entry.errorMessage) {
          logLine += ` error=${entry.errorMessage}`;
        }

        logger(logLine);
      }
    },
  };
}

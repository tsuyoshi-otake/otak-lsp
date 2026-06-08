/**
 * AnalysisScheduler Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.3, 4.3
 *
 * 解析スケジューリング（デバウンス、段階実行、解析状態管理）を担当
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { AnalysisStateManager } from './languageServer';
import { ConfigManager } from './configManager';
import { Logger } from '../utils/logger';
import { ConcurrencyLimiter, DEFAULT_MAX_CONCURRENT_ANALYSES } from '../utils/concurrencyLimiter';

/**
 * 解析実行関数の型
 */
export type ExecuteAnalysisFn = (uri: string, lightweightOnly: boolean) => Promise<void>;

/**
 * AnalysisSchedulerインターフェース
 */
export interface AnalysisScheduler {
  /**
   * 文書解析をスケジュール（デバウンス付き）
   */
  scheduleAnalysis(document: TextDocument): void;

  /**
   * 全ルール解析をスケジュール
   */
  scheduleFullAnalysis(uri: string): void;

  /**
   * 指定URIの解析をキャンセル
   */
  cancelAnalysis(uri: string): void;

  /**
   * すべてのタイマーをクリア
   */
  clearAllTimers(): void;

  /**
   * 解析実行関数を後から設定する（循環依存の解消用）
   */
  setExecuteAnalysis(fn: ExecuteAnalysisFn): void;
}

/**
 * AnalysisSchedulerを作成
 */
export function createAnalysisScheduler(
  analysisStates: AnalysisStateManager,
  configManager: ConfigManager,
  logger?: Logger
): AnalysisScheduler {
  function debugLog(message: string): void {
    logger?.debug(message);
  }

  // 解析実行関数（setExecuteAnalysisで後から設定）
  let executeAnalysis: ExecuteAnalysisFn = async () => {};

  // デバウンスタイマー
  const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  // アイドルタイマー（段階実行用）
  const idleTimers: Map<string, NodeJS.Timeout> = new Map();

  // 全ルール解析待機中のURI
  const pendingFullAnalysis: Set<string> = new Set();

  // 同時解析数の上限ガード（メモリ安全）。
  // 設定変更や大量 didOpen で全文書が一斉にスケジュールされても、実際に
  // executeAnalysis が並走する数を maxConcurrentAnalyses 件までに抑え、
  // ピーク時のヒープ使用量を構造的に有界化する。上限は都度 config を参照する。
  const analysisLimiter = new ConcurrencyLimiter(
    () => configManager.getConfig().maxConcurrentAnalyses ?? DEFAULT_MAX_CONCURRENT_ANALYSES
  );

  /**
   * 解析を実行（直列化）
   */
  async function runAnalysis(uri: string, lightweightOnly: boolean): Promise<void> {
    const state = analysisStates.getState(uri);
    const document = state.latestDocument;

    if (!document) {
      debugLog(`No document found for ${uri}, skipping analysis`);
      return;
    }

    // 解析開始: running = true
    const analysisVersion = state.latestVersion;
    analysisStates.updateState(uri, {
      running: true,
      pending: false,
    });

    debugLog(`Starting analysis for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);

    try {
      // 同時実行スロットを取得してから解析本体を実行する（メモリ安全のための上限ガード）。
      // running フラグは取得前に立てているため、待機中に同一 URI へ来た要求は
      // 重複起動せず pending に集約され、スロット獲得時に最新文書で解析される。
      await analysisLimiter.run(() => executeAnalysis(uri, lightweightOnly));
    } finally {
      // 解析完了: running = false
      analysisStates.updateState(uri, { running: false });

      debugLog(`Analysis completed for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);

      // 全ルール解析が待機中なら実行
      if (pendingFullAnalysis.has(uri)) {
        debugLog(`Pending full analysis found for ${uri}, starting now`);
        pendingFullAnalysis.delete(uri);
        runAnalysis(uri, false);
      } else {
        // 待機中の解析要求があれば次の解析を開始
        const stateAfterComplete = analysisStates.getState(uri);
        if (stateAfterComplete.pending) {
          const config = configManager.getConfig();
          const elapsed = Date.now() - stateAfterComplete.lastChangeAt;
          const remainingDelay = Math.max(0, config.debounceDelay - elapsed);

          debugLog(`Pending analysis found for ${uri}, rescheduling (remaining delay: ${remainingDelay}ms)`);

          // 既存タイマーをクリア
          const existingTimer = debounceTimers.get(uri);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          // 段階実行の場合は軽量ルールのみでスケジュール
          const advancedConfig = configManager.getAdvancedConfig();
          const timer = setTimeout(() => {
            runAnalysis(uri, advancedConfig.tieredExecution.enabled);
            debounceTimers.delete(uri);
          }, remainingDelay);

          debounceTimers.set(uri, timer);
        }
      }
    }
  }

  return {
    scheduleAnalysis(document: TextDocument): void {
      const config = configManager.getConfig();

      debugLog(`scheduleAnalysis called: uri=${document.uri}, grammarCheck=${config.enableGrammarCheck}, semanticHighlight=${config.enableSemanticHighlight}`);

      if (!config.enableGrammarCheck && !config.enableSemanticHighlight) {
        debugLog(`Skipping analysis: both grammar and semantic disabled (uri=${document.uri})`);
        return;
      }

      const uri = document.uri;
      const now = Date.now();

      // 現在の解析状態を取得
      const currentState = analysisStates.getState(uri);

      // 実行中の場合は待機状態に設定
      if (currentState.running) {
        analysisStates.updateState(uri, {
          pending: true,
          latestDocument: document,
          latestVersion: document.version,
          lastChangeAt: now,
        });
        debugLog(`Analysis running for ${uri}, queuing request (version: ${document.version})`);
        return;
      }

      // 最新の文書状態を記録
      analysisStates.updateState(uri, {
        latestDocument: document,
        latestVersion: document.version,
        lastChangeAt: now,
      });

      // 既存タイマーをクリア
      const existingTimer = debounceTimers.get(uri);
      if (existingTimer) {
        clearTimeout(existingTimer);
        debugLog(`Cleared existing debounce timer for ${uri}`);
      }

      // 段階実行設定を確認
      const advancedConfig = configManager.getAdvancedConfig();
      const tieredConfig = advancedConfig.tieredExecution;

      if (tieredConfig.enabled) {
        // アイドルタイマーをクリア・リセット
        const existingIdleTimer = idleTimers.get(uri);
        if (existingIdleTimer) {
          clearTimeout(existingIdleTimer);
        }

        // 軽量ルールのみの解析をスケジュール
        debugLog(`Tiered execution: scheduling lightweight analysis for ${uri}`);
        const timer = setTimeout(() => {
          runAnalysis(uri, true);
          debounceTimers.delete(uri);
        }, config.debounceDelay);
        debounceTimers.set(uri, timer);

        // アイドル後に全ルール実行をスケジュール
        const idleTimer = setTimeout(() => {
          debugLog(`Tiered execution: idle timeout, scheduling full analysis for ${uri}`);
          this.scheduleFullAnalysis(uri);
          idleTimers.delete(uri);
        }, tieredConfig.idleDelayMs);
        idleTimers.set(uri, idleTimer);

        return;
      }

      // 通常のデバウンス解析（全ルール）
      debugLog(`Setting debounce timer for ${uri} (delay: ${config.debounceDelay}ms, version: ${document.version})`);
      const timer = setTimeout(() => {
        runAnalysis(uri, false);
        debounceTimers.delete(uri);
      }, config.debounceDelay);

      debounceTimers.set(uri, timer);
    },

    scheduleFullAnalysis(uri: string): void {
      const state = analysisStates.getState(uri);
      if (!state.latestDocument) {
        return;
      }

      // 実行中の解析がある場合は待機状態に設定
      if (state.running) {
        pendingFullAnalysis.add(uri);
        debugLog(`Full analysis pending for ${uri}, waiting for current analysis to complete`);
        return;
      }

      // 即座に全ルール解析を開始（待機リストには追加しない）
      runAnalysis(uri, false);
    },

    cancelAnalysis(uri: string): void {
      // デバウンスタイマーをクリア
      const debounceTimer = debounceTimers.get(uri);
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimers.delete(uri);
        debugLog(`Cancelled debounce timer for ${uri}`);
      }

      // アイドルタイマーをクリア
      const idleTimer = idleTimers.get(uri);
      if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimers.delete(uri);
        debugLog(`Cancelled idle timer for ${uri}`);
      }

      // 待機中の全ルール解析をクリア
      pendingFullAnalysis.delete(uri);
    },

    clearAllTimers(): void {
      // すべてのデバウンスタイマーをクリア
      for (const timer of debounceTimers.values()) {
        clearTimeout(timer);
      }
      debounceTimers.clear();

      // すべてのアイドルタイマーをクリア
      for (const timer of idleTimers.values()) {
        clearTimeout(timer);
      }
      idleTimers.clear();

      // 待機中の全ルール解析をクリア
      pendingFullAnalysis.clear();

      debugLog('Cleared all timers');
    },

    setExecuteAnalysis(fn: ExecuteAnalysisFn): void {
      executeAnalysis = fn;
    },
  };
}

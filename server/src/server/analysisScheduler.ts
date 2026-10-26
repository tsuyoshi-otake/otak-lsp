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
 * 1回の解析実行の最終結果。
 * 「スケジュールが受理された」こととは別に、解析が実際にどう終端したかを表す。
 */
export type AnalysisRunOutcome =
  | { status: 'completed'; diagnostics: number; omittedDiagnostics: number }
  | { status: 'skipped'; reason: string }
  | { status: 'stale' }
  | { status: 'failed'; error: string }
  | { status: 'cancelled' };

/**
 * runFullAnalysis の戻り値。outcome は解析終端で解決され、
 * cancel() はこの待機だけを登録解除する（解析そのものは止めない）。
 */
export interface FullAnalysisRequest {
  outcome: Promise<AnalysisRunOutcome>;
  cancel(): void;
}

/**
 * 解析実行関数の型
 */
export type ExecuteAnalysisFn = (uri: string, lightweightOnly: boolean) => Promise<AnalysisRunOutcome>;

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
   * 全ルール解析をスケジュールし、その解析の最終結果を待つ。
   * cancel/close/世代交代でも待ち続けず、明確な終端で解決される。
   * 戻り値の cancel() でこの待機だけを解除できる（他の待機には影響しない）。
   */
  runFullAnalysis(uri: string): FullAnalysisRequest;

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
  let executeAnalysis: ExecuteAnalysisFn = async () => ({ status: 'skipped', reason: 'not-configured' });

  // デバウンスタイマー
  const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  // アイドルタイマー（段階実行用）
  const idleTimers: Map<string, NodeJS.Timeout> = new Map();

  // 全ルール解析待機中のURI
  const pendingFullAnalysis: Set<string> = new Set();

  // runFullAnalysis の完了待ち。世代(Generation)を保持し、
  // close→再オープンで旧世代の完了通知が新世代の待機者を解決しないようにする。
  const analysisWaiters = new Map<string, Set<{
    gen: object;
    minVersion: number;
    resolve: (o: AnalysisRunOutcome) => void;
  }>>();

  /**
   * 待機者を解決する。
   * gen 指定時は同世代の待機者のみ、minVersion 指定時は「依頼時点の文書versionが
   * 完了した解析の対象version以下」の待機者のみを解決する。
   * （古いversionの解析完了で新しいversionを待つ依頼を早期解決しないため）
   */
  function resolveWaiters(uri: string, outcome: AnalysisRunOutcome, gen?: object, runVersion?: number): void {
    const set = analysisWaiters.get(uri);
    if (!set) return;
    for (const waiter of [...set]) {
      const genMatch = gen === undefined || waiter.gen === gen;
      const versionMatch = runVersion === undefined || waiter.minVersion <= runVersion;
      if (genMatch && versionMatch) {
        set.delete(waiter);
        waiter.resolve(outcome);
      }
    }
    if (set.size === 0) {
      analysisWaiters.delete(uri);
    }
  }

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
    const state = analysisStates.getExistingState(uri);
    const document = state?.latestDocument;

    if (!document) {
      debugLog(`No document found for ${uri}, skipping analysis`);
      return;
    }

    if (state!.running) {
      if (lightweightOnly) {
        analysisStates.updateState(uri, { pending: true });
      } else {
        pendingFullAnalysis.add(uri);
      }
      return;
    }

    const generation = analysisStates.getGeneration(uri);

    // 解析開始: running = true
    const analysisVersion = state!.latestVersion;
    analysisStates.updateState(uri, {
      running: true,
      pending: false,
    });

    debugLog(`Starting analysis for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);

    let outcome: AnalysisRunOutcome = { status: 'skipped', reason: 'not-run' };
    try {
      // 同時実行スロットを取得してから解析本体を実行する（メモリ安全のための上限ガード）。
      // running フラグは取得前に立てているため、待機中に同一 URI へ来た要求は
      // 重複起動せず pending に集約され、スロット獲得時に最新文書で解析される。
      await analysisLimiter.run(async () => {
        if (analysisStates.getGeneration(uri) === generation) {
          outcome = await executeAnalysis(uri, lightweightOnly);
        } else {
          outcome = { status: 'stale' };
        }
      });
    } catch (error) {
      outcome = { status: 'failed', error: String(error) };
      logger?.error(`Analysis failed for ${uri}: ${String(error)}`);
    } finally {
      if (analysisStates.getGeneration(uri) === generation) {
        // 解析完了: running = false
        analysisStates.updateState(uri, { running: false });

        // 全ルール解析の終端は runFullAnalysis の待機者へ通知する。
        // 軽量解析では待機者を解決しない（この後に全ルール解析が続く）。
        // この実行が対象とした文書version未満を待つ依頼だけを解決する
        // （別versionの解析で早期解決しないため）。
        if (!lightweightOnly) {
          resolveWaiters(uri, outcome, generation, analysisVersion);
        }

        debugLog(`Analysis completed for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);

        // 全ルール解析が待機中なら実行
        if (pendingFullAnalysis.has(uri)) {
          debugLog(`Pending full analysis found for ${uri}, starting now`);
          pendingFullAnalysis.delete(uri);
          void runAnalysis(uri, false);
        } else {
          // 待機中の解析要求があれば次の解析を開始
          const stateAfterComplete = analysisStates.getState(uri);
          if (stateAfterComplete.pending) {
            const config = configManager.getConfig(uri);
            const elapsed = Date.now() - stateAfterComplete.lastChangeAt;
            const remainingDelay = Math.max(0, config.debounceDelay - elapsed);

            debugLog(`Pending analysis found for ${uri}, rescheduling (remaining delay: ${remainingDelay}ms)`);

            // 既存タイマーをクリア
            const existingTimer = debounceTimers.get(uri);
            if (existingTimer) {
              clearTimeout(existingTimer);
            }

            // 段階実行の場合は軽量ルールのみでスケジュール
            const advancedConfig = configManager.getAdvancedConfig(uri);
            const timer = setTimeout(() => {
              void runAnalysis(uri, advancedConfig.tieredExecution.enabled);
              debounceTimers.delete(uri);
            }, remainingDelay);

            debounceTimers.set(uri, timer);
          }
        }
      } else {
        // 世代が交代した（close→再オープン等）。旧世代の実行で新世代の待機者を
        // 解決しないよう、旧世代に属する待機者だけをキャンセルで解決する。
        resolveWaiters(uri, { status: 'cancelled' }, generation);
      }
    }
  }

  return {
    scheduleAnalysis(document: TextDocument): void {
      const config = configManager.getConfig(document.uri);

      debugLog(`scheduleAnalysis called: uri=${document.uri}, grammarCheck=${config.enableGrammarCheck}, semanticHighlight=${config.enableSemanticHighlight}`);

      if (!config.enableGrammarCheck && !config.enableSemanticHighlight) {
        debugLog(`Skipping analysis: both grammar and semantic disabled (uri=${document.uri})`);
        return;
      }

      const uri = document.uri;
      const now = Date.now();

      // 現在の解析状態を取得
      const currentState = analysisStates.getState(uri);

      // 実行中の変更でも、最後の変更から全ルール解析までの待ち時間を更新する。
      const advancedConfig = configManager.getAdvancedConfig(uri);
      const tieredConfig = advancedConfig.tieredExecution;
      const existingIdleTimer = idleTimers.get(uri);
      if (existingIdleTimer) {
        clearTimeout(existingIdleTimer);
        idleTimers.delete(uri);
      }
      pendingFullAnalysis.delete(uri);
      if (tieredConfig.enabled) {
        const idleTimer = setTimeout(() => {
          idleTimers.delete(uri);
          this.scheduleFullAnalysis(uri);
        }, tieredConfig.idleDelayMs);
        idleTimers.set(uri, idleTimer);
      }

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
      if (tieredConfig.enabled) {
        // 軽量ルールのみの解析をスケジュール
        debugLog(`Tiered execution: scheduling lightweight analysis for ${uri}`);
        const timer = setTimeout(() => {
          runAnalysis(uri, true);
          debounceTimers.delete(uri);
        }, config.debounceDelay);
        debounceTimers.set(uri, timer);

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
      const state = analysisStates.getExistingState(uri);
      if (!state?.latestDocument) {
        return;
      }

      // 全ルール解析が軽量予約とアイドル予約を包含する。
      const debounceTimer = debounceTimers.get(uri);
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimers.delete(uri);
      const idleTimer = idleTimers.get(uri);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimers.delete(uri);

      // 実行中の解析がある場合は待機状態に設定
      if (state.running) {
        pendingFullAnalysis.add(uri);
        debugLog(`Full analysis pending for ${uri}, waiting for current analysis to complete`);
        return;
      }

      // 即座に全ルール解析を開始（待機リストには追加しない）
      runAnalysis(uri, false);
    },

    runFullAnalysis(uri: string): FullAnalysisRequest {
      let resolveOutcome!: (o: AnalysisRunOutcome) => void;
      const outcome = new Promise<AnalysisRunOutcome>((resolve) => {
        resolveOutcome = resolve;
      });
      const state = analysisStates.getExistingState(uri);
      const gen = state?.latestDocument ? analysisStates.getGeneration(uri) : undefined;
      if (!state?.latestDocument || !gen) {
        resolveOutcome({ status: 'skipped', reason: state?.latestDocument ? 'no-generation' : 'no-document' });
        return { outcome, cancel: () => undefined };
      }
      let set = analysisWaiters.get(uri);
      if (!set) {
        set = new Set();
        analysisWaiters.set(uri, set);
      }
      const waiter = {
        gen,
        minVersion: state.latestVersion,
        resolve: resolveOutcome,
      };
      set.add(waiter);
      const cancel = () => {
        if (set.delete(waiter)) {
          resolveOutcome({ status: 'cancelled' });
        }
      };
      try {
        this.scheduleFullAnalysis(uri);
      } catch (error) {
        set.delete(waiter);
        resolveOutcome({ status: 'failed', error: String(error) });
      }
      return { outcome, cancel };
    },

    cancelAnalysis(uri: string): void {
      // runFullAnalysis の待機者へ明確な終端を通知
      resolveWaiters(uri, { status: 'cancelled' });

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
      if (analysisStates.hasState(uri)) {
        analysisStates.updateState(uri, { pending: false });
      }
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
      for (const uri of analysisStates.getUris()) {
        analysisStates.updateState(uri, { pending: false });
      }

      // すべての完了待ちをキャンセルで解決
      for (const uri of [...analysisWaiters.keys()]) {
        resolveWaiters(uri, { status: 'cancelled' });
      }

      debugLog('Cleared all timers');
    },

    setExecuteAnalysis(fn: ExecuteAnalysisFn): void {
      executeAnalysis = fn;
    },
  };
}

/**
 * 解析の実行
 *
 * analysisScheduler から呼び出される executeAnalysis を組み立てる。
 * - 解析を実行
 * - stale判定（解析開始後にバージョンが進んでいたら破棄）
 * - キャッシュ更新、診断送信、セマンティックトークンのリフレッシュ
 * - プロファイルログ出力
 */

import { Connection } from 'vscode-languageserver/node';
import { ConfigManager } from './configManager';
import { DocumentAnalyzer } from './documentAnalyzer';
import { DiagnosticsPublisher } from './diagnosticsPublisher';
import { Profiler } from './profiler';
import { AnalysisStateManager } from './languageServer';
import { DocumentCacheStore } from './documentCacheStore';
import { RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';

export interface AnalysisRunnerDeps {
  connection: Connection;
  cacheStore: DocumentCacheStore;
  analysisStates: AnalysisStateManager;
  configManager: ConfigManager;
  documentAnalyzer: DocumentAnalyzer;
  diagnosticsPublisher: DiagnosticsPublisher;
  profiler: Profiler;
  isProfileLogsEnabled: () => boolean;
  logger?: Logger;
}

export function createExecuteAnalysis(
  deps: AnalysisRunnerDeps
): (uri: string, lightweightOnly: boolean) => Promise<void> {
  const {
    connection, cacheStore, analysisStates, configManager,
    documentAnalyzer, diagnosticsPublisher, profiler, isProfileLogsEnabled, logger,
  } = deps;

  function debugLog(message: string): void {
    logger?.debug(message);
  }

  return async function executeAnalysis(uri: string, lightweightOnly: boolean): Promise<void> {
    debugLog(`executeAnalysis called: uri=${uri}, lightweightOnly=${lightweightOnly}`);

    const state = analysisStates.getState(uri);
    const document = state.latestDocument;

    if (!document) {
      debugLog(`No document found for ${uri}`);
      return;
    }

    const config = configManager.getConfig();
    const advancedConfig = configManager.getAdvancedConfig();
    const analysisVersion = state.latestVersion;

    const profileEnabled = isProfileLogsEnabled();
    const ruleProfilingCollector: RuleProfilingCollector | undefined = profileEnabled
      ? { entries: [], totalTimeMs: 0 }
      : undefined;

    const analysisStart = profileEnabled ? Date.now() : 0;

    try {
      const result = await documentAnalyzer.analyze(
        document, config, advancedConfig, lightweightOnly, profiler, ruleProfilingCollector
      );

      const currentState = analysisStates.getState(uri);
      if (currentState.latestVersion > analysisVersion) {
        debugLog(`Discarding stale analysis result for ${uri} (analysis version: ${analysisVersion}, current version: ${currentState.latestVersion})`);
        return;
      }

      cacheStore.setAnalysisResult(
        uri, result.tokens, document.getText(), result.excludedRanges, result.lineStarts
      );

      diagnosticsPublisher.publish(uri, result.diagnostics);

      if (config.enableSemanticHighlight) {
        connection.sendRequest('workspace/semanticTokens/refresh').catch(() => undefined);
      }

      if (ruleProfilingCollector) {
        profiler.logRuleProfilingBlock(uri, analysisVersion, ruleProfilingCollector);
      }

      if (profileEnabled && analysisStart > 0) {
        const totalMs = Date.now() - analysisStart;
        profiler.logBlock(
          '解析',
          `uri=${uri} version=${analysisVersion} stale=false tokens=${result.tokens.length} diagnostics=${result.diagnostics.length}`,
          result.profileSteps,
          totalMs
        );
      }
    } catch (error) {
      logError(logger, `Analysis failed for ${uri}`, error);
      cacheStore.clear(uri);
      diagnosticsPublisher.clear(uri);
    }
  };
}

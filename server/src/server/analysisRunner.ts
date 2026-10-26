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
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ConfigManager } from './configManager';
import { DocumentAnalyzer } from './documentAnalyzer';
import { DiagnosticsPublisher } from './diagnosticsPublisher';
import { Profiler } from './profiler';
import { AnalysisStateManager } from './languageServer';
import { DocumentCacheStore } from './documentCacheStore';
import { RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { AnalysisRunOutcome } from './analysisScheduler';

/** クライアントへ送る解析結果通知の種別 */
export type AnalysisNoticeKind = 'analysis-skipped' | 'diagnostics-truncated' | 'analysis-failed';

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
): (uri: string, lightweightOnly: boolean) => Promise<AnalysisRunOutcome> {
  const {
    connection, cacheStore, analysisStates, configManager,
    documentAnalyzer, diagnosticsPublisher, profiler, isProfileLogsEnabled, logger,
  } = deps;

  function debugLog(message: string): void {
    logger?.debug(message);
  }

  /**
   * 解析スキップ・診断切り捨て・解析失敗をクライアントへ通知する。
   * 通知の重複抑制（文書単位のデバウンス）はクライアント側で行う。
   */
  function sendAnalysisNotice(uri: string, kind: AnalysisNoticeKind, detail: { reason?: string; omitted?: number; total?: number }): void {
    connection.sendNotification('otakLsp/analysisNotice', { uri, kind, ...detail }).catch(() => undefined);
  }

  return async function executeAnalysis(uri: string, lightweightOnly: boolean): Promise<AnalysisRunOutcome> {
    debugLog(`executeAnalysis called: uri=${uri}, lightweightOnly=${lightweightOnly}`);

    const state = analysisStates.getExistingState(uri);
    const generation = analysisStates.getGeneration(uri);
    const document = state?.latestDocument;

    if (!document) {
      debugLog(`No document found for ${uri}`);
      return { status: 'skipped', reason: 'no-document' };
    }

    const snapshot = configManager.getSnapshot?.(uri);
    const configRevision = configManager.getRevision?.(uri);
    const config = snapshot?.config ?? configManager.getConfig(uri);
    const advancedConfig = snapshot?.advancedConfig ?? configManager.getAdvancedConfig(uri);
    const analysisVersion = state!.latestVersion;
    const analysisDocument = TextDocument.create(uri, document.languageId, document.version, document.getText());
    const isCurrent = (): boolean =>
      analysisStates.getGeneration(uri) === generation &&
      analysisStates.getExistingState(uri)?.latestVersion === analysisVersion &&
      document.version === analysisDocument.version &&
      configManager.getRevision?.(uri) === configRevision;

    const profileEnabled = isProfileLogsEnabled();
    const ruleProfilingCollector: RuleProfilingCollector | undefined = profileEnabled
      ? { entries: [], totalTimeMs: 0 }
      : undefined;

    const analysisStart = profileEnabled ? Date.now() : 0;

    try {
      const result = await documentAnalyzer.analyze(
        analysisDocument, config, advancedConfig, lightweightOnly, profiler, ruleProfilingCollector, snapshot?.proofreadingConfig
      );

      if (!isCurrent()) {
        debugLog(`Discarding stale analysis result for ${uri} (analysis version: ${analysisVersion})`);
        return { status: 'stale' };
      }

      cacheStore.setAnalysisResult(
        uri, result.tokens, analysisDocument.getText(), result.excludedRanges, result.lineStarts,
        result.includedRanges
      );

      diagnosticsPublisher.publish(uri, result.diagnostics);

      if (result.status === 'skipped' && result.skipReason === 'document-too-large') {
        sendAnalysisNotice(uri, 'analysis-skipped', { reason: result.skipReason });
      } else if (result.omittedDiagnostics > 0) {
        sendAnalysisNotice(uri, 'diagnostics-truncated', {
          omitted: result.omittedDiagnostics,
          total: result.diagnostics.filter(diagnostic => diagnostic.code !== 'diagnostics-truncated').length
            + result.omittedDiagnostics,
        });
      }

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

      if (result.status === 'skipped') {
        return { status: 'skipped', reason: result.skipReason ?? 'unknown' };
      }
      return {
        status: 'completed',
        diagnostics: result.diagnostics.length,
        omittedDiagnostics: result.omittedDiagnostics,
      };
    } catch (error) {
      logError(logger, `Analysis failed for ${uri}`, error);
      if (!isCurrent()) {
        return { status: 'stale' };
      }
      cacheStore.clear(uri);
      diagnosticsPublisher.clear(uri);
      sendAnalysisNotice(uri, 'analysis-failed', { reason: error instanceof Error ? error.message : String(error) });
      return { status: 'failed', error: error instanceof Error ? error.message : String(error) };
    }
  };
}

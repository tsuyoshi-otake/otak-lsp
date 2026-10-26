/**
 * Connection Module
 * Feature: main-ts-refactoring
 *
 * LSP接続の初期化とハンドラ登録のオーケストレーション。
 * 個別の責務は以下のモジュールに委譲する：
 *  - documentCacheStore: 解析結果キャッシュ
 *  - hoverComposer: ホバーレスポンス組み立て
 *  - workspaceConfigLoader: ワークスペース設定の取得とマージ
 *  - analysisRunner: 解析実行（executeAnalysis）
 */

import {
  Connection,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  DidChangeConfigurationNotification,
  SemanticTokensParams,
  SemanticTokens,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CodeActionKind } from 'vscode-languageserver/node';
import { ConfigManager } from './configManager';
import { AnalysisRunOutcome, AnalysisScheduler } from './analysisScheduler';
import { buildCodeActions } from './codeActionProvider';
import { SupportedLanguage } from '../../../shared/src/types';
import { DocumentAnalyzer } from './documentAnalyzer';
import { DiagnosticsPublisher } from './diagnosticsPublisher';
import { createProfiler } from './profiler';
import { HoverProvider } from '../hover/provider';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from '../semantic/tokenProvider';
import { AnalysisStateManager } from './languageServer';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { computeLineStarts } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { isNotEmpty } from '../utils/arrayUtils';
import { DocumentCacheStore, DocumentCacheEntry } from './documentCacheStore';
import { composeHoverResponse } from './hoverComposer';
import { loadWorkspaceConfiguration, ResourceConfigurationStore } from './workspaceConfigLoader';
import { createExecuteAnalysis } from './analysisRunner';

export { DocumentCacheEntry };

/**
 * ConnectionHandlerインターフェース
 */
export interface ConnectionHandler {
  initialize(): void;
  getCapabilities(): ServerCapabilities;
  setDocumentCache(uri: string, cache: DocumentCacheEntry): void;
  getDocumentCache(uri: string): DocumentCacheEntry | undefined;
  clearDocumentCache(uri: string): void;
  getExecuteAnalysis(): (uri: string, lightweightOnly: boolean) => Promise<AnalysisRunOutcome>;
}

function getCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    hoverProvider: true,
    semanticTokensProvider: {
      legend: { tokenTypes, tokenModifiers },
      full: true,
    },
    codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
  };
}

export function createConnectionHandler(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
  configManager: ConfigManager,
  analysisScheduler: AnalysisScheduler,
  documentAnalyzer: DocumentAnalyzer,
  diagnosticsPublisher: DiagnosticsPublisher,
  hoverProvider: HoverProvider,
  semanticTokenProvider: SemanticTokenProvider,
  analysisStates: AnalysisStateManager,
  advancedRulesManager?: AdvancedRulesManager,
  logger?: Logger,
  resourceConfigurations?: ResourceConfigurationStore
): ConnectionHandler {
  const PROFILE_LOGS_ENV = process.env.OTAK_LCP_PROFILE === '1';
  const cacheStore = new DocumentCacheStore();
  const sentenceComplexityRule = new SentenceComplexityRule();
  let supportsResourceConfiguration = false;
  let supportsDynamicConfiguration = false;
  let configurationRevision = 0;

  function debugLog(message: string): void {
    logger?.debug(message);
  }

  function isProfileLogsEnabled(): boolean {
    return configManager.getConfig().enableProfileLogs || PROFILE_LOGS_ENV;
  }

  const profiler = createProfiler(
    (msg) => logger?.info(msg),
    isProfileLogsEnabled
  );

  const executeAnalysis = createExecuteAnalysis({
    connection,
    cacheStore,
    analysisStates,
    configManager,
    documentAnalyzer,
    diagnosticsPublisher,
    profiler,
    isProfileLogsEnabled,
    logger,
  });

  function provideSemanticTokens(params: SemanticTokensParams): SemanticTokens {
    if (!configManager.getConfig(params.textDocument.uri).enableSemanticHighlight) {
      return { data: [] };
    }

    const uri = params.textDocument.uri;
    const tokens = cacheStore.getTokens(uri);
    const text = cacheStore.getText(uri);

    if (!isNotEmpty(tokens) || !text) {
      return { data: [] };
    }

    let lineStarts = cacheStore.getLineStarts(uri);
    if (!lineStarts) {
      lineStarts = computeLineStarts(text);
      cacheStore.setLineStarts(uri, lineStarts);
    }

    const cached = cacheStore.getSemanticTokensCache(uri);
    if (cached && cached.tokens === tokens && cached.lineStarts === lineStarts) {
      return cached.semanticTokens;
    }

    const semanticTokens = semanticTokenProvider.provideSemanticTokens(tokens, text, lineStarts);
    cacheStore.setSemanticTokensCache(uri, { tokens, lineStarts, semanticTokens });
    return semanticTokens;
  }

  async function reloadWorkspaceConfiguration(): Promise<void> {
    if (!supportsResourceConfiguration) return;
    const merged = await loadWorkspaceConfiguration(connection, logger);
    if (merged) {
      configManager.handleLspConfigChange(merged);
    }
  }

  async function getConfiguredDocument(uri: string): Promise<TextDocument | undefined> {
    if (supportsResourceConfiguration && resourceConfigurations && !await resourceConfigurations.load(uri)) {
      return undefined;
    }
    return documents.get(uri);
  }

  async function scheduleDocument(uri: string, full = false): Promise<void> {
    const document = await getConfiguredDocument(uri);
    if (!document) return;
    const config = configManager.getConfig(uri);
    if (full && !configManager.getAdvancedConfig(uri).tieredExecution.enabled) return;
    if (!config.enableGrammarCheck) diagnosticsPublisher.clear(uri);
    if (!config.enableSemanticHighlight) cacheStore.clear(uri);
    if (!config.enableGrammarCheck && !config.enableSemanticHighlight) {
      analysisScheduler.cancelAnalysis(uri);
      return;
    }
    analysisScheduler.scheduleAnalysis(document);
    if (full && configManager.getAdvancedConfig(uri).tieredExecution.enabled) {
      analysisScheduler.scheduleFullAnalysis(uri);
    }
  }

  async function handleConfigurationChange(change: { settings?: { otakLsp?: unknown } }): Promise<void> {
    const revision = ++configurationRevision;
    resourceConfigurations?.clear();
    analysisScheduler.clearAllTimers();
    const previousConfig = configManager.getConfig();
    const wasGrammarEnabled = previousConfig.enableGrammarCheck;
    const wasSemanticEnabled = previousConfig.enableSemanticHighlight;

    const incomingSettings = change.settings?.otakLsp ?? await loadWorkspaceConfiguration(connection, logger);
    if (!incomingSettings || revision !== configurationRevision) {
      return;
    }

    configManager.handleLspConfigChange(incomingSettings);
    const config = configManager.getConfig();
    const advancedConfig = configManager.getAdvancedConfig();
    logger?.info(`Configuration updated: grammarCheck=${config.enableGrammarCheck}, semanticHighlight=${config.enableSemanticHighlight}, sentenceSplitMode=${advancedConfig.sentenceSplitMode}`);

    if (wasGrammarEnabled && !config.enableGrammarCheck) {
      logger?.info('Grammar check disabled, clearing diagnostics');
      for (const doc of documents.all()) {
        diagnosticsPublisher.clear(doc.uri);
      }
    }

    if (wasSemanticEnabled && !config.enableSemanticHighlight) {
      logger?.info('Semantic highlight disabled, clearing tokens');
      cacheStore.clearAll();
      connection.sendRequest('workspace/semanticTokens/refresh').catch(() => undefined);
    }

    await Promise.all(documents.all().map(doc => scheduleDocument(doc.uri)));
  }

  function registerHandlers(): void {
    connection.onInitialize((params: InitializeParams): InitializeResult => {
      supportsResourceConfiguration = params.capabilities.workspace?.configuration === true;
      supportsDynamicConfiguration = params.capabilities.workspace?.didChangeConfiguration?.dynamicRegistration === true;
      logger?.info('otak-lsp Language Server initializing...');
      return { capabilities: getCapabilities() };
    });

    connection.onInitialized(() => {
      logger?.info('otak-lsp Language Server initialized');
      if (supportsDynamicConfiguration) {
        void connection.client.register(DidChangeConfigurationNotification.type, undefined).catch(error => {
          logError(logger, 'Failed to register configuration notifications', error);
        });
      }
      void reloadWorkspaceConfiguration().catch((error) => {
        logError(logger, 'Failed to load workspace configuration', error);
      });
    });

    connection.onDidChangeConfiguration(handleConfigurationChange);

    connection.onHover(async (params) => {
      if (!await getConfiguredDocument(params.textDocument.uri)) return null;
      const snapshot = configManager.getSnapshot?.(params.textDocument.uri);
      return composeHoverResponse(params, {
        documents,
        cacheStore,
        hoverProvider,
        sentenceComplexityRule,
        advancedRulesManager,
        getAdvancedConfig: () => configManager.getAdvancedConfig(params.textDocument.uri),
        getConfig: (u) => configManager.getConfig(u),
        hoverOptions: snapshot ? { ...snapshot.config.hover, glossariesExplicitlySet: snapshot.glossariesExplicitlySet } : undefined,
      });
    });

    connection.onRequest('textDocument/semanticTokens/full', provideSemanticTokens);

    connection.onCodeAction((params) => {
      const document = documents.get(params.textDocument.uri);
      if (!document) return [];
      return buildCodeActions(document, params.context?.diagnostics ?? []);
    });

    // クライアントの「現在のファイルを解析」コマンド用。
    // 「スケジュールを受理した」ことと「解析が完了した」ことを区別するため、
    // 実際の解析終端を待って結果を返す（cancel/close/世代交代でも待ち続けない）。
    connection.onRequest('otakLsp/analyzeDocument', async (
      params: { uri?: string }
    ): Promise<{ ok: boolean; status: string; reason?: string; diagnostics?: number }> => {
      const uri = params?.uri;
      if (!uri) {
        return { ok: false, status: 'rejected', reason: 'no-uri' };
      }
      // resource 別設定のロードを待ってから設定を読む（didOpen 直後に
      // グローバル設定で誤判定しない）。ロード中に close された場合は
      // documents.get が undefined を返し unknown-document で終端する。
      const document = await getConfiguredDocument(uri);
      if (!document) {
        logger?.info(`analyzeDocument requested for unknown document: ${uri}`);
        return { ok: false, status: 'rejected', reason: 'unknown-document' };
      }

      const config = configManager.getConfig(uri);
      if (!config.enableGrammarCheck && !config.enableSemanticHighlight) {
        return { ok: false, status: 'skipped', reason: 'disabled' };
      }
      if (!config.targetLanguages.includes(document.languageId as SupportedLanguage)) {
        return { ok: false, status: 'skipped', reason: 'not-target-language' };
      }
      const maxChars = config.maxDocumentChars;
      if (typeof maxChars === 'number' && maxChars > 0 && document.getText().length > maxChars) {
        return { ok: false, status: 'skipped', reason: 'document-too-large' };
      }

      // 既存の解析状態が無ければ最新文書を記録してから実行する
      const state = analysisStates.getExistingState(uri);
      if (!state?.latestDocument) {
        analysisStates.updateState(uri, {
          latestDocument: document,
          latestVersion: document.version,
          lastChangeAt: Date.now(),
        });
      }

      logger?.info(`Manual analysis requested for: ${uri}`);
      // タイムアウトと waiter 登録解除の所有者はこのハンドラ。
      // どの終端でも timer を解放し、timeout 時は自分の待機だけを解除する。
      const request = analysisScheduler.runFullAnalysis(uri);
      let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
      const outcome = await Promise.race<AnalysisRunOutcome | { status: 'timeout' }>([
        request.outcome,
        new Promise((resolve) => {
          timeoutHandle = setTimeout(() => resolve({ status: 'timeout' }), 30_000);
          (timeoutHandle as unknown as { unref?: () => void }).unref?.();
        }),
      ]);
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
      if (outcome.status === 'timeout') {
        request.cancel();
      }

      switch (outcome.status) {
        case 'completed':
          return { ok: true, status: 'completed', diagnostics: outcome.diagnostics };
        case 'skipped':
          return { ok: false, status: 'skipped', reason: outcome.reason };
        case 'failed':
          return { ok: false, status: 'failed', reason: outcome.error };
        case 'stale':
        case 'cancelled':
          return { ok: false, status: 'cancelled', reason: outcome.status };
        case 'timeout':
          return { ok: false, status: 'failed', reason: 'timeout' };
        default:
          return { ok: false, status: 'failed', reason: 'unknown' };
      }
    });

    documents.onDidOpen((event) => {
      logger?.info(`Document opened: ${event.document.uri}`);
      void scheduleDocument(event.document.uri);
    });

    documents.onDidChangeContent((change) => {
      void scheduleDocument(change.document.uri);
    });

    documents.onDidSave((event) => {
      const uri = event.document.uri;
      debugLog(`Document saved: ${uri}, triggering full analysis`);
      void scheduleDocument(uri, true);
    });

    documents.onDidClose((event) => {
      const uri = event.document.uri;
      logger?.info(`Document closed: ${uri}`);
      analysisScheduler.cancelAnalysis(uri);
      resourceConfigurations?.forget(uri);
      analysisStates.deleteState(uri);
      cacheStore.clear(uri);
      diagnosticsPublisher.clear(uri);
    });
  }

  return {
    initialize: registerHandlers,
    getCapabilities,
    setDocumentCache(uri, cache) {
      cacheStore.setEntry(uri, cache);
    },
    getDocumentCache(uri) {
      return cacheStore.getEntry(uri);
    },
    clearDocumentCache(uri) {
      cacheStore.clear(uri);
    },
    getExecuteAnalysis() {
      return executeAnalysis;
    },
  };
}

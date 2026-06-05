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
import { ConfigManager } from './configManager';
import { AnalysisScheduler } from './analysisScheduler';
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
import { loadWorkspaceConfiguration } from './workspaceConfigLoader';
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
  getExecuteAnalysis(): (uri: string, lightweightOnly: boolean) => Promise<void>;
}

function getCapabilities(): ServerCapabilities {
  return {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    hoverProvider: true,
    semanticTokensProvider: {
      legend: { tokenTypes, tokenModifiers },
      full: true,
    },
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
  logger?: Logger
): ConnectionHandler {
  const PROFILE_LOGS_ENV = process.env.OTAK_LCP_PROFILE === '1';
  const cacheStore = new DocumentCacheStore();
  const sentenceComplexityRule = new SentenceComplexityRule();

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
    if (!configManager.getConfig().enableSemanticHighlight) {
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
    const merged = await loadWorkspaceConfiguration(connection, logger);
    if (merged) {
      configManager.handleLspConfigChange(merged);
    }
  }

  async function handleConfigurationChange(change: { settings?: { otakLsp?: unknown } }): Promise<void> {
    const previousConfig = configManager.getConfig();
    const wasGrammarEnabled = previousConfig.enableGrammarCheck;
    const wasSemanticEnabled = previousConfig.enableSemanticHighlight;

    const incomingSettings = change.settings?.otakLsp ?? await loadWorkspaceConfiguration(connection, logger);
    if (!incomingSettings) {
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

    if (config.enableGrammarCheck || config.enableSemanticHighlight) {
      for (const doc of documents.all()) {
        analysisScheduler.scheduleAnalysis(doc);
      }
    }
  }

  function registerHandlers(): void {
    connection.onInitialize((_params: InitializeParams): InitializeResult => {
      logger?.info('otak-lsp Language Server initializing...');
      return { capabilities: getCapabilities() };
    });

    connection.onInitialized(() => {
      logger?.info('otak-lsp Language Server initialized');
      connection.client.register(DidChangeConfigurationNotification.type, undefined);
      void reloadWorkspaceConfiguration().catch((error) => {
        logError(logger, 'Failed to load workspace configuration', error);
      });
    });

    connection.onDidChangeConfiguration(handleConfigurationChange);

    connection.onHover((params) => composeHoverResponse(params, {
      documents,
      cacheStore,
      hoverProvider,
      sentenceComplexityRule,
      advancedRulesManager,
      getAdvancedConfig: () => configManager.getAdvancedConfig(),
    }));

    connection.onRequest('textDocument/semanticTokens/full', provideSemanticTokens);

    documents.onDidOpen((event) => {
      logger?.info(`Document opened: ${event.document.uri}`);
      analysisScheduler.scheduleAnalysis(event.document);
    });

    documents.onDidChangeContent((change) => {
      analysisScheduler.scheduleAnalysis(change.document);
    });

    documents.onDidSave((event) => {
      if (!configManager.getAdvancedConfig().tieredExecution.enabled) {
        return;
      }
      const uri = event.document.uri;
      debugLog(`Document saved: ${uri}, triggering full analysis`);
      analysisScheduler.scheduleFullAnalysis(uri);
    });

    documents.onDidClose((event) => {
      const uri = event.document.uri;
      logger?.info(`Document closed: ${uri}`);
      analysisScheduler.cancelAnalysis(uri);
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

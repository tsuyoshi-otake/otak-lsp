/**
 * Connection Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.1
 *
 * LSP接続の初期化とリクエストハンドラの登録を担当
 */

import {
  Connection,
  TextDocuments,
  TextDocumentSyncKind,
  InitializeParams,
  InitializeResult,
  ServerCapabilities,
  DidChangeConfigurationNotification,
  TextDocumentPositionParams,
  Hover,
  SemanticTokensParams,
  SemanticTokens,
  Diagnostic as LSPDiagnostic,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ConfigManager } from './configManager';
import { AnalysisScheduler } from './analysisScheduler';
import { DocumentAnalyzer } from './documentAnalyzer';
import { DiagnosticsPublisher, convertSeverity } from './diagnosticsPublisher';
import { Profiler, createProfiler } from './profiler';
import { HoverProvider } from '../hover/provider';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from '../semantic/tokenProvider';
import { Token, Diagnostic, SupportedLanguage } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { AnalysisStateManager } from './languageServer';
import { SentenceParser } from '../grammar/sentenceParser';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { computeLineStarts } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { logError } from '../utils/errorHandler';
import { hasMinLength } from '../utils/stringUtils';
import { isNotEmpty } from '../utils/arrayUtils';

/**
 * ドキュメントキャッシュのエントリ
 */
export interface DocumentCacheEntry {
  tokens: Token[];
  text: string;
  excludedRanges: ExcludedRange[];
  lineStarts: number[];
}

/**
 * ConnectionHandlerインターフェース
 */
export interface ConnectionHandler {
  /**
   * ハンドラを初期化して登録
   */
  initialize(): void;

  /**
   * LSP機能を取得
   */
  getCapabilities(): ServerCapabilities;

  /**
   * ドキュメントキャッシュを設定（テスト用）
   */
  setDocumentCache(uri: string, cache: DocumentCacheEntry): void;

  /**
   * ドキュメントキャッシュを取得（テスト用）
   */
  getDocumentCache(uri: string): DocumentCacheEntry | undefined;

  /**
   * ドキュメントキャッシュをクリア
   */
  clearDocumentCache(uri: string): void;

  /**
   * 解析実行関数を取得（analysisSchedulerから呼び出される）
   */
  getExecuteAnalysis(): (uri: string, lightweightOnly: boolean) => Promise<void>;
}

/**
 * ConnectionHandlerを作成
 */
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

  // ドキュメントキャッシュ
  const documentTokens: Map<string, Token[]> = new Map();
  const documentTexts: Map<string, string> = new Map();
  const documentExcludedRanges: Map<string, ExcludedRange[]> = new Map();
  const documentLineStarts: Map<string, number[]> = new Map();
  const documentSemanticTokensCache: Map<string, { tokens: Token[]; lineStarts: number[]; semanticTokens: SemanticTokens }> = new Map();

  // 文複雑度ルール
  const sentenceComplexityRule = new SentenceComplexityRule();

  function debugLog(message: string): void {
    if (logger) {
      logger.debug(message);
    }
  }

  function isProfileLogsEnabled(): boolean {
    const config = configManager.getConfig();
    return config.enableProfileLogs || PROFILE_LOGS_ENV;
  }

  // プロファイラを作成
  const profiler = createProfiler(
    (msg) => logger.info(msg),
    isProfileLogsEnabled
  );

  /**
   * LSP機能を取得
   */
  function getCapabilities(): ServerCapabilities {
    return {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes,
          tokenModifiers,
        },
        full: true,
      },
    };
  }

  /**
   * 文書解析を実行
   */
  async function executeAnalysis(uri: string, lightweightOnly: boolean): Promise<void> {
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

    // プロファイリング用コレクタ
    const ruleProfilingCollector: RuleProfilingCollector | undefined = isProfileLogsEnabled()
      ? { entries: [], totalTimeMs: 0 }
      : undefined;

    const analysisStart = isProfileLogsEnabled() ? Date.now() : 0;

    try {
      const result = await documentAnalyzer.analyze(
        document,
        config,
        advancedConfig,
        lightweightOnly,
        profiler,
        ruleProfilingCollector
      );

      // バージョンチェック（stale判定）
      const currentState = analysisStates.getState(uri);
      const isStale = currentState.latestVersion > analysisVersion;

      if (isStale) {
        debugLog(`Discarding stale analysis result for ${uri} (analysis version: ${analysisVersion}, current version: ${currentState.latestVersion})`);
        return;
      }

      // キャッシュを更新
      documentTokens.set(uri, result.tokens);
      documentTexts.set(uri, document.getText());
      if (isNotEmpty(result.excludedRanges)) {
        documentExcludedRanges.set(uri, result.excludedRanges);
      }
      documentLineStarts.set(uri, result.lineStarts);
      documentSemanticTokensCache.delete(uri);

      // 診断を送信
      diagnosticsPublisher.publish(uri, result.diagnostics);

      // セマンティックトークンのリフレッシュをリクエスト
      if (config.enableSemanticHighlight) {
        connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {});
      }

      // ルール別プロファイルログ
      if (ruleProfilingCollector) {
        profiler.logRuleProfilingBlock(uri, analysisVersion, ruleProfilingCollector);
      }

      // 全体プロファイルログ（ステップ別内訳付き）
      if (isProfileLogsEnabled() && analysisStart > 0) {
        const totalMs = Date.now() - analysisStart;
        const steps = result.profileSteps.map(s => ({
          name: s.name,
          ms: s.ms,
          meta: s.meta
        }));
        profiler.logBlock(
          '解析',
          `uri=${uri} version=${analysisVersion} stale=false tokens=${result.tokens.length} diagnostics=${result.diagnostics.length}`,
          steps,
          totalMs
        );
      }
    } catch (error) {
      logError(logger, `Analysis failed for ${uri}`, error);
      clearDocumentCache(uri);
      diagnosticsPublisher.clear(uri);
    }
  }

  /**
   * ドキュメントキャッシュをクリア
   */
  function clearDocumentCache(uri: string): void {
    documentTokens.delete(uri);
    documentTexts.delete(uri);
    documentExcludedRanges.delete(uri);
    documentLineStarts.delete(uri);
    documentSemanticTokensCache.delete(uri);
  }

  return {
    initialize(): void {
      // onInitialize
      connection.onInitialize((params: InitializeParams): InitializeResult => {
        if (logger) {
          logger.info('otak-lsp Language Server initializing...');
        }

        return {
          capabilities: getCapabilities(),
        };
      });

      // onInitialized
      connection.onInitialized(() => {
        if (logger) {
          logger.info('otak-lsp Language Server initialized');
        }
        connection.client.register(DidChangeConfigurationNotification.type, undefined);

        // 初期設定を読み込み
        void (async () => {
          try {
            const [base, advanced, official, proofreading] = await Promise.all([
              connection.workspace.getConfiguration({ section: 'otakLsp' }),
              connection.workspace.getConfiguration({ section: 'otakLsp.advanced' }),
              connection.workspace.getConfiguration({ section: 'otakLsp.official' }),
              connection.workspace.getConfiguration({ section: 'otakLsp.proofreading' }),
            ]);

            const merged = mergeConfigurations(base, advanced, official, proofreading);
            if (merged) {
              configManager.handleLspConfigChange(merged);
            }
          } catch (error) {
            logError(logger, 'Failed to load workspace configuration', error);
          }
        })();
      });

      // onDidChangeConfiguration
      connection.onDidChangeConfiguration(async (change) => {
        const wasGrammarEnabled = configManager.getConfig().enableGrammarCheck;
        const wasSemanticEnabled = configManager.getConfig().enableSemanticHighlight;

        const incomingSettings = change.settings?.otakLsp ?? await getWorkspaceSettings();
        if (!incomingSettings) {
          return;
        }

        configManager.handleLspConfigChange(incomingSettings);

        const config = configManager.getConfig();
        const advancedConfig = configManager.getAdvancedConfig();

        if (logger) {
          logger.info(`Configuration updated: grammarCheck=${config.enableGrammarCheck}, semanticHighlight=${config.enableSemanticHighlight}, sentenceSplitMode=${advancedConfig.sentenceSplitMode}`);
        }

        // 文法チェックが無効になった場合、診断をクリア
        if (wasGrammarEnabled && !config.enableGrammarCheck) {
          if (logger) {
            logger.info('Grammar check disabled, clearing diagnostics');
          }
          for (const doc of documents.all()) {
            diagnosticsPublisher.clear(doc.uri);
          }
        }

        // セマンティックハイライトが無効になった場合、トークンをクリア
        if (wasSemanticEnabled && !config.enableSemanticHighlight) {
          if (logger) {
            logger.info('Semantic highlight disabled, clearing tokens');
          }
          documentTokens.clear();
          documentTexts.clear();
          documentExcludedRanges.clear();
          documentLineStarts.clear();
          documentSemanticTokensCache.clear();
          connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {});
        }

        // 有効になった場合、再解析
        if (config.enableGrammarCheck || config.enableSemanticHighlight) {
          for (const doc of documents.all()) {
            analysisScheduler.scheduleAnalysis(doc);
          }
        }
      });

      // onHover
      connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
        const uri = params.textDocument.uri;
        const tokens = documentTokens.get(uri) ?? [];
        const document = documents.get(uri);

        if (!document) {
          return null;
        }

        const offset = document.offsetAt(params.position);
        const documentText = documentTexts.get(uri) ?? document.getText();
        const hoverResult = await hoverProvider.provideHover(tokens, offset, documentText);

        // 文複雑度を計算して追加
        let complexityInfo = '';
        if (isNotEmpty(tokens) && documentText && advancedRulesManager) {
          const sentences = SentenceParser.parseSentences(documentText, tokens);
          const currentSentence = sentences.find(s => offset >= s.start && offset < s.end);
          if (currentSentence && hasMinLength(currentSentence.text, 10)) {
            const advConfig = configManager.getAdvancedConfig();
            const metrics = sentenceComplexityRule.calculateMetrics(currentSentence, advConfig);

            let level: string;
            if (metrics.score <= 25) {
              level = '低';
            } else if (metrics.score <= 50) {
              level = '中';
            } else if (metrics.score <= 75) {
              level = '高';
            } else {
              level = '非常に高';
            }

            const details: string[] = [];
            details.push(`文字数: ${metrics.characterCount}`);
            details.push(`読点: ${metrics.commaCount}`);
            if (metrics.clauseDepth > 0) {
              details.push(`節深度: ${metrics.clauseDepth}`);
            }
            if (metrics.maxNoChainLength > 1) {
              details.push(`の連続: ${metrics.maxNoChainLength}`);
            }
            if (metrics.maxNounChainLength > 2) {
              details.push(`名詞連続: ${metrics.maxNounChainLength}`);
            }

            complexityInfo = `\n\n---\n\n**文複雑度**: ${metrics.score}/100（${level}）\n\n${details.join(' | ')}`;
          }
        }

        if (!hoverResult && !complexityInfo) {
          return null;
        }

        const contents = (hoverResult?.contents ?? '') + complexityInfo;

        let range = hoverResult?.range;
        if (!range && isNotEmpty(tokens)) {
          const token = tokens.find(t => offset >= t.start && offset < t.end);
          if (token) {
            range = { start: token.start, end: token.end };
          }
        }

        if (!range) {
          return null;
        }

        return {
          contents: {
            kind: 'markdown',
            value: contents,
          },
          range: {
            start: document.positionAt(range.start),
            end: document.positionAt(range.end),
          },
        };
      });

      // Semantic tokens request
      connection.onRequest(
        'textDocument/semanticTokens/full',
        (params: SemanticTokensParams): SemanticTokens => {
          const config = configManager.getConfig();
          if (!config.enableSemanticHighlight) {
            return { data: [] };
          }

          const uri = params.textDocument.uri;
          const tokens = documentTokens.get(uri);
          const text = documentTexts.get(uri);

          if (!isNotEmpty(tokens) || !text) {
            return { data: [] };
          }

          const lineStarts = documentLineStarts.get(uri) ?? computeLineStarts(text);
          if (!documentLineStarts.has(uri)) {
            documentLineStarts.set(uri, lineStarts);
          }

          // キャッシュチェック
          const cached = documentSemanticTokensCache.get(uri);
          if (cached && cached.tokens === tokens && cached.lineStarts === lineStarts) {
            return cached.semanticTokens;
          }

          const semanticTokens = semanticTokenProvider.provideSemanticTokens(tokens, text, lineStarts);
          documentSemanticTokensCache.set(uri, { tokens, lineStarts, semanticTokens });

          return semanticTokens;
        }
      );

      // Document events
      documents.onDidOpen((event) => {
        if (logger) {
          logger.info(`Document opened: ${event.document.uri}`);
        }
        analysisScheduler.scheduleAnalysis(event.document);
      });

      documents.onDidChangeContent((change) => {
        analysisScheduler.scheduleAnalysis(change.document);
      });

      documents.onDidSave((event) => {
        const advancedConfig = configManager.getAdvancedConfig();
        if (!advancedConfig.tieredExecution.enabled) {
          return;
        }

        const uri = event.document.uri;
        debugLog(`Document saved: ${uri}, triggering full analysis`);
        analysisScheduler.scheduleFullAnalysis(uri);
      });

      documents.onDidClose((event) => {
        const uri = event.document.uri;
        if (logger) {
          logger.info(`Document closed: ${uri}`);
        }

        analysisScheduler.cancelAnalysis(uri);
        analysisStates.deleteState(uri);
        clearDocumentCache(uri);
        diagnosticsPublisher.clear(uri);
      });

      // analysisScheduler用のexecuteAnalysis関数を設定
      // 注: これはfactoryパターンの制限で、後から設定する必要がある
    },

    getCapabilities,

    setDocumentCache(uri: string, cache: DocumentCacheEntry): void {
      documentTokens.set(uri, cache.tokens);
      documentTexts.set(uri, cache.text);
      documentExcludedRanges.set(uri, cache.excludedRanges);
      documentLineStarts.set(uri, cache.lineStarts);
    },

    getDocumentCache(uri: string): DocumentCacheEntry | undefined {
      const tokens = documentTokens.get(uri);
      const text = documentTexts.get(uri);
      const excludedRanges = documentExcludedRanges.get(uri);
      const lineStarts = documentLineStarts.get(uri);

      if (!tokens || !text) {
        return undefined;
      }

      return {
        tokens,
        text,
        excludedRanges: excludedRanges ?? [],
        lineStarts: lineStarts ?? [0],
      };
    },

    clearDocumentCache,

    getExecuteAnalysis(): (uri: string, lightweightOnly: boolean) => Promise<void> {
      return executeAnalysis;
    },
  };

  /**
   * ワークスペース設定をマージ
   */
  function mergeConfigurations(base: unknown, advanced: unknown, official: unknown, proofreading: unknown): Record<string, unknown> | null {
    if (base && typeof base === 'object') {
      const merged = { ...(base as Record<string, unknown>) };
      if (advanced && typeof advanced === 'object') {
        const baseAdvanced = merged.advanced;
        merged.advanced = {
          ...(baseAdvanced && typeof baseAdvanced === 'object' ? (baseAdvanced as Record<string, unknown>) : {}),
          ...(advanced as Record<string, unknown>),
        };
      }
      if (official && typeof official === 'object') {
        const baseOfficial = merged.official;
        merged.official = {
          ...(baseOfficial && typeof baseOfficial === 'object' ? (baseOfficial as Record<string, unknown>) : {}),
          ...(official as Record<string, unknown>),
        };
      }
      if (proofreading && typeof proofreading === 'object') {
        const baseProofreading = merged.proofreading;
        merged.proofreading = {
          ...(baseProofreading && typeof baseProofreading === 'object' ? (baseProofreading as Record<string, unknown>) : {}),
          ...(proofreading as Record<string, unknown>),
        };
      }
      return merged;
    }
    return { advanced, official, proofreading };
  }

  /**
   * ワークスペース設定を取得
   */
  async function getWorkspaceSettings(): Promise<unknown> {
    try {
      const [base, advanced, official, proofreading] = await Promise.all([
        connection.workspace.getConfiguration({ section: 'otakLsp' }),
        connection.workspace.getConfiguration({ section: 'otakLsp.advanced' }),
        connection.workspace.getConfiguration({ section: 'otakLsp.official' }),
        connection.workspace.getConfiguration({ section: 'otakLsp.proofreading' }),
      ]);

      return mergeConfigurations(base, advanced, official, proofreading);
    } catch (error) {
      logError(logger, 'Failed to load workspace configuration', error);
      return undefined;
    }
  }
}

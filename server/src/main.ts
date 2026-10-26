/**
 * Language Server Entry Point
 * otak-lsp - Japanese Grammar Analyzer
 * Feature: main-ts-refactoring
 *
 * このファイルはエントリーポイントとして、コンポーネントの初期化と接続のみを行う
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from './mecab/analyzer';
import { CommentExtractor } from './parser/commentExtractor';
import { MarkdownFilter } from './parser/markdownFilter';
import { GrammarChecker } from './grammar/checker';
import { AdvancedRulesManager } from './grammar/advancedRulesManager';
import { ProofreadingRulesManager } from './proofreading/proofreadingRulesManager';
import { SemanticTokenProvider } from './semantic/tokenProvider';
import { TokenFilter } from './semantic/tokenFilter';
import { HoverProvider } from './hover/provider';
import { WikipediaClient } from './wikipedia/client';
import { AnalysisStateManager } from './server/languageServer';
import { createConfigManager, ConfigManager } from './server/configManager';
import { createDiagnosticsPublisher } from './server/diagnosticsPublisher';
import { createDocumentAnalyzer } from './server/documentAnalyzer';
import { createAnalysisScheduler } from './server/analysisScheduler';
import { createConnectionHandler } from './server/connection';
import { createLogger, isDebugEnabled } from './utils/logger';
import { ResourceConfigurationStore } from './server/workspaceConfigLoader';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// configManager は logger 生成より後に生成される。遅延参照用のホルダーを
// 先に用意することで、初期化中（manager 未設定）に logger.debug が
// 呼ばれても TDZ 例外にならないようにする。
const configManagerRef: { manager?: ConfigManager } = {};

// Create logger
// デバッグ出力は呼び出し時に評価し、環境変数と otakLsp.debugLog 設定の
// どちらでも有効化できるようにする（configManager は後に生成されるため遅延参照）。
const logger = createLogger(
  (msg) => connection.console.log(msg),
  () => isDebugEnabled() || (configManagerRef.manager?.getConfig().debugLog ?? false)
);

// Initialize components
const mecabAnalyzer = new MeCabAnalyzer();
const commentExtractor = new CommentExtractor();
const markdownFilter = new MarkdownFilter();
const tokenFilter = new TokenFilter();
const grammarChecker = new GrammarChecker();
const advancedRulesManager = new AdvancedRulesManager(undefined, logger);
const proofreadingRulesManager = new ProofreadingRulesManager(undefined, logger);
const semanticTokenProvider = new SemanticTokenProvider();
const wikipediaClient = new WikipediaClient();
const hoverProvider = new HoverProvider(wikipediaClient);

// Analysis state management
const analysisStates = new AnalysisStateManager();

// Set debug log callback
analysisStates.setDebugLogCallback((message: string) => {
  logger.debug(message);
});

// Create managers
const baseConfigManager = createConfigManager(
  advancedRulesManager,
  proofreadingRulesManager,
  hoverProvider,
  logger
);
const resourceConfigurations = new ResourceConfigurationStore(connection, baseConfigManager, logger);
const configManager = resourceConfigurations.manager;
configManagerRef.manager = configManager;

const diagnosticsPublisher = createDiagnosticsPublisher(
  (params) => connection.sendDiagnostics(params)
);

const documentAnalyzer = createDocumentAnalyzer(
  mecabAnalyzer,
  commentExtractor,
  markdownFilter,
  tokenFilter,
  grammarChecker,
  advancedRulesManager,
  proofreadingRulesManager,
  logger
);

// 解析スケジューラーを作成
const analysisScheduler = createAnalysisScheduler(
  analysisStates,
  configManager,
  logger
);

// Create connection handler
const connectionHandler = createConnectionHandler(
  connection,
  documents,
  configManager,
  analysisScheduler,
  documentAnalyzer,
  diagnosticsPublisher,
  hoverProvider,
  semanticTokenProvider,
  analysisStates,
  advancedRulesManager,
  logger,
  resourceConfigurations
);

// Connect executeAnalysis function from connectionHandler to analysisScheduler
analysisScheduler.setExecuteAnalysis(connectionHandler.getExecuteAnalysis());

// Initialize connection handlers
connectionHandler.initialize();

// Listen for document events
documents.listen(connection);

// Feature: parallel-advanced-rules
// LSP shutdown / exit で worker pool を停止し、worker_threads がリークしないようにする。
// onShutdown は client からの明示的な shutdown 要求、onExit はプロセス終了直前にコールされる。
connection.onShutdown(async () => {
  analysisScheduler.clearAllTimers();
  analysisStates.clear();
  resourceConfigurations.clear();
  try {
    await advancedRulesManager.shutdown();
  } catch (error) {
    logger.error(`Failed to shutdown advancedRulesManager: ${String(error)}`);
  }
});
connection.onExit(() => {
  // onExit は同期コールバック想定なので、fire-and-forget で終了
  advancedRulesManager.shutdown().catch(() => undefined);
});

// Start server
connection.listen();

logger.info('otak-lsp Language Server started');

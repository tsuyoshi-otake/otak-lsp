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
import { createConfigManager } from './server/configManager';
import { createDiagnosticsPublisher } from './server/diagnosticsPublisher';
import { createDocumentAnalyzer } from './server/documentAnalyzer';
import { createAnalysisScheduler } from './server/analysisScheduler';
import { createConnectionHandler } from './server/connection';
import { createLogger, isDebugEnabled } from './utils/logger';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create logger
const logger = createLogger(
  (msg) => connection.console.log(msg),
  isDebugEnabled()
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
const configManager = createConfigManager(
  advancedRulesManager,
  proofreadingRulesManager,
  hoverProvider,
  logger
);

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
  logger
);

// Connect executeAnalysis function from connectionHandler to analysisScheduler
analysisScheduler.setExecuteAnalysis(connectionHandler.getExecuteAnalysis());

// Initialize connection handlers
connectionHandler.initialize();

// Listen for document events
documents.listen(connection);

// Start server
connection.listen();

logger.info('otak-lsp Language Server started');

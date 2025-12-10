/**
 * Language Server Entry Point
 * Japanese Grammar Analyzer - MeCabを使用した日本語形態素解析
 * Feature: japanese-grammar-analyzer
 */

import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  Diagnostic,
  DiagnosticSeverity as LSPDiagnosticSeverity,
  TextDocumentPositionParams,
  Hover,
  SemanticTokensParams,
  SemanticTokens,
  DidChangeConfigurationNotification,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from './mecab/analyzer';
import { CommentExtractor } from './parser/commentExtractor';
import { GrammarChecker } from './grammar/checker';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from './semantic/tokenProvider';
import { HoverProvider } from './hover/provider';
import { WikipediaClient } from './wikipedia/client';
import { Configuration, Token, SupportedLanguage } from '../../shared/src/types';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Components
let mecabAnalyzer: MeCabAnalyzer;
let commentExtractor: CommentExtractor;
let grammarChecker: GrammarChecker;
let semanticTokenProvider: SemanticTokenProvider;
let hoverProvider: HoverProvider;
let wikipediaClient: WikipediaClient;

// Document analysis cache
const documentTokens: Map<string, Token[]> = new Map();
const documentTexts: Map<string, string> = new Map();

// Configuration
let configuration: Configuration = {
  enableGrammarCheck: true,
  enableSemanticHighlight: true,
  targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'] as SupportedLanguage[],
  debounceDelay: 500,
};

// Debounce timers
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Initialize server
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('Japanese Grammar Analyzer Language Server initializing...');

  // Initialize components (kuromoji.js - no external dependencies)
  mecabAnalyzer = new MeCabAnalyzer();
  commentExtractor = new CommentExtractor();
  grammarChecker = new GrammarChecker();
  semanticTokenProvider = new SemanticTokenProvider();
  wikipediaClient = new WikipediaClient();
  hoverProvider = new HoverProvider(wikipediaClient);

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      semanticTokensProvider: {
        legend: {
          tokenTypes,
          tokenModifiers,
        },
        full: true,
      },
    },
  };
});

/**
 * Server initialized
 */
connection.onInitialized(() => {
  connection.console.log('Japanese Grammar Analyzer Language Server initialized');

  // Register for configuration changes
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

/**
 * Configuration changed
 */
connection.onDidChangeConfiguration((change) => {
  if (change.settings?.japaneseGrammarAnalyzer) {
    const newConfig = change.settings.japaneseGrammarAnalyzer as Partial<Configuration>;
    const wasGrammarEnabled = configuration.enableGrammarCheck;
    const wasSemanticEnabled = configuration.enableSemanticHighlight;

    configuration = {
      ...configuration,
      ...newConfig,
    };

    connection.console.log(`Configuration updated: grammarCheck=${configuration.enableGrammarCheck}, semanticHighlight=${configuration.enableSemanticHighlight}`);

    // 文法チェックが無効になった場合、診断をクリア
    if (wasGrammarEnabled && !configuration.enableGrammarCheck) {
      connection.console.log('Grammar check disabled, clearing diagnostics');
      documents.all().forEach((doc) => {
        connection.sendDiagnostics({ uri: doc.uri, diagnostics: [] });
      });
    }

    // セマンティックハイライトが無効になった場合、トークンをクリア
    if (wasSemanticEnabled && !configuration.enableSemanticHighlight) {
      connection.console.log('Semantic highlight disabled, clearing tokens');
      documentTokens.clear();
      documentTexts.clear();
      connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {});
    }

    // 有効になった場合、再解析
    if (configuration.enableGrammarCheck || configuration.enableSemanticHighlight) {
      documents.all().forEach((doc) => {
        scheduleAnalysis(doc);
      });
    }
  }
});

/**
 * Schedule document analysis with debounce
 */
function scheduleAnalysis(document: TextDocument): void {
  const uri = document.uri;

  // Clear existing timer
  const existingTimer = debounceTimers.get(uri);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Set new timer
  const timer = setTimeout(() => {
    analyzeDocument(document);
    debounceTimers.delete(uri);
  }, configuration.debounceDelay);

  debounceTimers.set(uri, timer);
}

/**
 * Analyze document
 */
async function analyzeDocument(document: TextDocument): Promise<void> {
  const uri = document.uri;
  const text = document.getText();
  const languageId = document.languageId as SupportedLanguage;

  connection.console.log(`[DEBUG] Analyzing document: ${uri}`);
  connection.console.log(`[DEBUG] Language ID: ${languageId}`);
  connection.console.log(`[DEBUG] Text length: ${text.length}`);

  // Check if language is supported
  if (!configuration.targetLanguages.includes(languageId)) {
    connection.console.log(`[DEBUG] Language ${languageId} not in target languages, skipping`);
    return;
  }

  try {
    // Extract text to analyze (comments for code, full text for markdown/plaintext)
    let textToAnalyze = text;

    if (languageId !== 'markdown' && languageId !== 'plaintext') {
      const comments = commentExtractor.extract(text, languageId);
      textToAnalyze = comments.map((c) => c.text).join('\n');
      connection.console.log(`[DEBUG] Extracted ${comments.length} comments`);
    }

    // Skip if no text to analyze
    if (!textToAnalyze.trim()) {
      connection.console.log(`[DEBUG] No text to analyze, skipping`);
      documentTokens.set(uri, []);
      connection.sendDiagnostics({ uri, diagnostics: [] });
      return;
    }

    connection.console.log(`[DEBUG] Text to analyze (first 100 chars): ${textToAnalyze.substring(0, 100)}`);

    // Analyze with kuromoji
    connection.console.log(`[DEBUG] Starting morphological analysis...`);
    const tokens = await mecabAnalyzer.analyze(textToAnalyze);
    connection.console.log(`[DEBUG] Analysis complete, ${tokens.length} tokens found`);
    documentTokens.set(uri, tokens);
    documentTexts.set(uri, textToAnalyze);

    // Grammar check
    const diagnostics: Diagnostic[] = [];
    if (configuration.enableGrammarCheck) {
      connection.console.log(`[DEBUG] Running grammar check...`);
      const grammarDiagnostics = grammarChecker.check(tokens, textToAnalyze);
      connection.console.log(`[DEBUG] Grammar check found ${grammarDiagnostics.length} issues`);
      for (const diag of grammarDiagnostics) {
        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range: {
            start: { line: diag.range.start.line, character: diag.range.start.character },
            end: { line: diag.range.end.line, character: diag.range.end.character },
          },
          message: diag.message,
          source: 'japanese-grammar-analyzer',
          code: diag.code,
        });
      }
    }

    // Send diagnostics
    connection.console.log(`[DEBUG] Sending ${diagnostics.length} diagnostics`);
    connection.sendDiagnostics({ uri, diagnostics });

    // Request semantic tokens refresh
    if (configuration.enableSemanticHighlight) {
      connection.console.log(`[DEBUG] Requesting semantic tokens refresh`);
      connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {
        // Client might not support this request
      });
    }
  } catch (error) {
    connection.console.error(`[ERROR] Analysis failed for ${uri}: ${error}`);
    documentTokens.delete(uri);
    connection.sendDiagnostics({ uri, diagnostics: [] });
  }
}

/**
 * Convert diagnostic severity
 */
function convertSeverity(severity: number): LSPDiagnosticSeverity {
  switch (severity) {
    case 0:
      return LSPDiagnosticSeverity.Error;
    case 1:
      return LSPDiagnosticSeverity.Warning;
    case 2:
      return LSPDiagnosticSeverity.Information;
    case 3:
      return LSPDiagnosticSeverity.Hint;
    default:
      return LSPDiagnosticSeverity.Warning;
  }
}

/**
 * Document opened
 */
documents.onDidOpen((event) => {
  connection.console.log(`Document opened: ${event.document.uri}`);
  scheduleAnalysis(event.document);
});

/**
 * Document changed
 */
documents.onDidChangeContent((change) => {
  scheduleAnalysis(change.document);
});

/**
 * Document closed
 */
documents.onDidClose((event) => {
  const uri = event.document.uri;
  connection.console.log(`Document closed: ${uri}`);

  // Clear timer
  const timer = debounceTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(uri);
  }

  // Clear cache
  documentTokens.delete(uri);
  documentTexts.delete(uri);

  // Clear diagnostics
  connection.sendDiagnostics({ uri, diagnostics: [] });
});

/**
 * Hover request
 */
connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
  const uri = params.textDocument.uri;
  const tokens = documentTokens.get(uri);

  if (!tokens || tokens.length === 0) {
    return null;
  }

  const document = documents.get(uri);
  if (!document) {
    return null;
  }

  // Convert position to character offset
  const offset = document.offsetAt(params.position);

  const hoverResult = await hoverProvider.provideHover(tokens, offset);
  if (!hoverResult) {
    return null;
  }

  return {
    contents: {
      kind: 'markdown',
      value: hoverResult.contents,
    },
    range: {
      start: document.positionAt(hoverResult.range.start),
      end: document.positionAt(hoverResult.range.end),
    },
  };
});

/**
 * Semantic tokens request
 */
connection.onRequest(
  'textDocument/semanticTokens/full',
  (params: SemanticTokensParams): SemanticTokens => {
    if (!configuration.enableSemanticHighlight) {
      return { data: [] };
    }

    const uri = params.textDocument.uri;
    const tokens = documentTokens.get(uri);
    const text = documentTexts.get(uri);

    if (!tokens || tokens.length === 0 || !text) {
      return { data: [] };
    }

    connection.console.log(`[DEBUG] Providing semantic tokens for ${tokens.length} tokens`);
    const semanticTokens = semanticTokenProvider.provideSemanticTokens(tokens, text);
    connection.console.log(`[DEBUG] Semantic tokens data length: ${semanticTokens.data.length}`);
    return semanticTokens;
  }
);

// Listen for document events
documents.listen(connection);

// Start server
connection.listen();

connection.console.log('Japanese Grammar Analyzer Language Server started');

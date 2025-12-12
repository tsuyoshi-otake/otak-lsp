/**
 * Language Server Entry Point
 * otak-lcp - Japanese Grammar Analyzer
 * kuromoji.jsを使用した日本語形態素解析
 * Feature: package-name-refactoring
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
import { MarkdownFilter } from './parser/markdownFilter';
import { PositionMapper } from './parser/positionMapper';
import { GrammarChecker } from './grammar/checker';
import { AdvancedRulesManager } from './grammar/advancedRulesManager';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from './semantic/tokenProvider';
import { TokenFilter } from './semantic/tokenFilter';
import { HoverProvider } from './hover/provider';
import { WikipediaClient } from './wikipedia/client';
import { Configuration, Token, SupportedLanguage } from '../../shared/src/types';
import { ExcludedRange } from '../../shared/src/markdownFilterTypes';

// Create connection
const connection = createConnection(ProposedFeatures.all);

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Components
let mecabAnalyzer: MeCabAnalyzer;
let commentExtractor: CommentExtractor;
let markdownFilter: MarkdownFilter;
let tokenFilter: TokenFilter;
let grammarChecker: GrammarChecker;
let advancedRulesManager: AdvancedRulesManager;
let semanticTokenProvider: SemanticTokenProvider;
let hoverProvider: HoverProvider;
let wikipediaClient: WikipediaClient;

// Document analysis cache
const documentTokens: Map<string, Token[]> = new Map();
const documentTexts: Map<string, string> = new Map();
const positionMappers: Map<string, PositionMapper> = new Map();
const documentExcludedRanges: Map<string, ExcludedRange[]> = new Map();

// Configuration
let configuration: Configuration = {
  enableGrammarCheck: true,
  enableSemanticHighlight: true,
  excludeTableDelimiters: true,
  targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'] as SupportedLanguage[],
  debounceDelay: 500,
};

// Debounce timers
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

/**
 * Initialize server
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('otak-lcp Language Server initializing...');

  // Initialize components (kuromoji.js - no external dependencies)
  mecabAnalyzer = new MeCabAnalyzer();
  commentExtractor = new CommentExtractor();
  markdownFilter = new MarkdownFilter();
  tokenFilter = new TokenFilter();
  grammarChecker = new GrammarChecker();
  advancedRulesManager = new AdvancedRulesManager();
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
  connection.console.log('otak-lcp Language Server initialized');

  // Register for configuration changes
  connection.client.register(DidChangeConfigurationNotification.type, undefined);
});

/**
 * Configuration changed
 */
connection.onDidChangeConfiguration((change) => {
  if (change.settings?.otakLcp) {
    const newConfig = change.settings.otakLcp as Partial<Configuration>;
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
      positionMappers.clear();
      documentExcludedRanges.clear();
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
    let positionMapper: PositionMapper | null = null;
    let excludedRanges: ExcludedRange[] = [];
    let semanticExcludedRanges: ExcludedRange[] = [];
    let grammarExcludedRanges: ExcludedRange[] = [];

    if (languageId !== 'markdown' && languageId !== 'plaintext') {
      const comments = commentExtractor.extract(text, languageId);
      textToAnalyze = comments.map((c) => c.text).join('\n');
      connection.console.log(`[DEBUG] Extracted ${comments.length} comments`);
    } else if (languageId === 'markdown') {
      // Apply markdown filtering to exclude code blocks, URLs, table delimiters, etc.
      const filterResult = markdownFilter.filter(textToAnalyze);
      textToAnalyze = filterResult.filteredText;
      excludedRanges = filterResult.excludedRanges;

      // セマンティックハイライト用: table 範囲を除外せずにセル内テキストを残す（デフォルト）
      const baseSemanticRanges = excludedRanges.filter((r) => r.type !== 'table');
      semanticExcludedRanges = configuration.excludeTableDelimiters === false
        ? excludedRanges
        : baseSemanticRanges;

      // 文法チェック用: すべての除外範囲を使用（table 全体も含む）
      grammarExcludedRanges = excludedRanges;

      // PositionMapper は実際にスペース置換された範囲のみを使用
      positionMapper = new PositionMapper(text, textToAnalyze, baseSemanticRanges);
      positionMappers.set(uri, positionMapper);
      documentExcludedRanges.set(uri, excludedRanges);
      connection.console.log(`[DEBUG] Markdown filtered: ${excludedRanges.length} ranges excluded`);
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
    const allTokens = await mecabAnalyzer.analyze(textToAnalyze);
    let semanticTokensList = allTokens;
    let grammarTokensList = allTokens;
    connection.console.log(`[DEBUG] Analysis complete, ${allTokens.length} tokens found`);

    // Filter tokens that fall within excluded ranges (for Markdown files)
    if (languageId === 'markdown') {
      if (semanticExcludedRanges.length > 0) {
        semanticTokensList = tokenFilter.filterTokens(allTokens, semanticExcludedRanges);
      }
      if (grammarExcludedRanges.length > 0) {
        grammarTokensList = tokenFilter.filterTokens(allTokens, grammarExcludedRanges);
      }

      connection.console.log(`[DEBUG] Token filtering (semantic): ${allTokens.length} -> ${semanticTokensList.length} tokens (${allTokens.length - semanticTokensList.length} filtered out)`);
      connection.console.log(`[DEBUG] Token filtering (grammar): ${allTokens.length} -> ${grammarTokensList.length} tokens (${allTokens.length - grammarTokensList.length} filtered out)`);

      documentTokens.set(uri, semanticTokensList);
    } else {
      documentTokens.set(uri, allTokens);
      semanticTokensList = allTokens;
      grammarTokensList = allTokens;
    }
    // Store the original text for semantic token generation
    // (MarkdownFilter uses space replacement, so positions are preserved)
    documentTexts.set(uri, text);

    // Grammar check
    const diagnostics: Diagnostic[] = [];
    if (configuration.enableGrammarCheck) {
      // Basic grammar rules
      connection.console.log(`[DEBUG] Running basic grammar check...`);
      const grammarDiagnostics = grammarChecker.check(grammarTokensList, textToAnalyze);
      connection.console.log(`[DEBUG] Basic grammar check found ${grammarDiagnostics.length} issues`);
      for (const diag of grammarDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

        // Markdownの場合は位置マッピングを適用
        if (positionMapper && languageId === 'markdown') {
          const startOffset = getOffsetFromPosition(textToAnalyze, diag.range.start.line, diag.range.start.character);
          const endOffset = getOffsetFromPosition(textToAnalyze, diag.range.end.line, diag.range.end.character);
          
          const mappedRange = positionMapper.mapRangeToOriginal(startOffset, endOffset);
          if (mappedRange) {
            range = mappedRange;
          }
        }

        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range,
          message: diag.message,
          source: 'otak-lcp',
          code: diag.code,
        });
      }

      // Advanced grammar rules
      connection.console.log(`[DEBUG] Running advanced grammar check...`);
      const advancedDiagnostics = languageId === 'markdown'
        ? advancedRulesManager.checkText(textToAnalyze, grammarTokensList, excludedRanges)
        : advancedRulesManager.checkText(textToAnalyze, grammarTokensList);
      connection.console.log(`[DEBUG] Advanced grammar check found ${advancedDiagnostics.length} issues`);
      for (const diag of advancedDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

        // Markdownの場合は位置マッピングを適用
        if (positionMapper && languageId === 'markdown') {
          const startOffset = getOffsetFromPosition(textToAnalyze, diag.range.start.line, diag.range.start.character);
          const endOffset = getOffsetFromPosition(textToAnalyze, diag.range.end.line, diag.range.end.character);
          
          const mappedRange = positionMapper.mapRangeToOriginal(startOffset, endOffset);
          if (mappedRange) {
            range = mappedRange;
          }
        }

        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range,
          message: diag.message,
          source: 'otak-lcp',
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
    documentTexts.delete(uri);
    positionMappers.delete(uri);
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
 * Get character offset from line and character position
 */
function getOffsetFromPosition(text: string, line: number, character: number): number {
  const lines = text.split('\n');
  let offset = 0;
  
  for (let i = 0; i < line && i < lines.length; i++) {
    offset += lines[i].length + 1; // +1 for newline
  }
  
  return offset + character;
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
  positionMappers.delete(uri);
  documentExcludedRanges.delete(uri);

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

connection.console.log('otak-lcp Language Server started');

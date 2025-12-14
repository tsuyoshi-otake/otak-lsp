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
import { GrammarChecker } from './grammar/checker';
import { AdvancedRulesManager } from './grammar/advancedRulesManager';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from './semantic/tokenProvider';
import { TokenFilter } from './semantic/tokenFilter';
import { HoverProvider } from './hover/provider';
import { DEFAULT_ENABLED_GLOSSARIES } from './hover/glossary';
import { WikipediaClient } from './wikipedia/client';
import { Configuration, Token, SupportedLanguage } from '../../shared/src/types';
import { ExcludedRange } from '../../shared/src/markdownFilterTypes';
import { AdvancedRulesConfig, SentenceSplitMode, WeakExpressionLevel } from '../../shared/src/advancedTypes';

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
const documentExcludedRanges: Map<string, ExcludedRange[]> = new Map();

// Configuration
let configuration: Configuration = {
  enableGrammarCheck: true,
  enableSemanticHighlight: true,
  excludeTableDelimiters: true,
  markdown: {
    analyzeCodeBlocks: true,
    analyzeTables: false,
  },
  targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'] as SupportedLanguage[],
  debounceDelay: 250,
  hover: {
    enableWikipedia: true,
    enableGlossary: true,
    enabledGlossaries: [...DEFAULT_ENABLED_GLOSSARIES],
  },
};

// Debounce timers
const debounceTimers: Map<string, NodeJS.Timeout> = new Map();

function getSetting(config: unknown, keyPath: string): unknown {
  if (!config || typeof config !== 'object') {
    return undefined;
  }

  const record = config as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, keyPath)) {
    return record[keyPath];
  }

  const parts = keyPath.split('.');
  let cursor: unknown = config;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }
    const asRecord = cursor as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(asRecord, part)) {
      return undefined;
    }
    cursor = asRecord[part];
  }

  return cursor;
}

function isSentenceSplitMode(v: unknown): v is SentenceSplitMode {
  return v === 'strict' || v === 'normal' || v === 'loose';
}

function isWeakExpressionLevel(v: unknown): v is WeakExpressionLevel {
  return v === 'strict' || v === 'normal' || v === 'loose';
}

function applyAdvancedConfigFromSettings(settings: unknown): void {
  const current = advancedRulesManager.getConfig();
  const patch: Partial<AdvancedRulesConfig> = {};

  for (const [key, currentValue] of Object.entries(current)) {
    if (key === 'customNotationRules') {
      continue;
    }

    const incoming = getSetting(settings, `advanced.${key}`);

    if (typeof currentValue === 'boolean' && typeof incoming === 'boolean') {
      (patch as any)[key] = incoming;
      continue;
    }
    if (typeof currentValue === 'number' && typeof incoming === 'number' && Number.isFinite(incoming)) {
      (patch as any)[key] = incoming;
      continue;
    }

    if (key === 'sentenceSplitMode') {
      if (isSentenceSplitMode(incoming)) {
        patch.sentenceSplitMode = incoming;
      }
      continue;
    }
    if (key === 'weakExpressionLevel') {
      if (isWeakExpressionLevel(incoming)) {
        patch.weakExpressionLevel = incoming;
      }
      continue;
    }
    if (key === 'excludedLanguageIds') {
      if (Array.isArray(incoming) && incoming.every((x) => typeof x === 'string')) {
        patch.excludedLanguageIds = incoming as string[];
      }
      continue;
    }
  }

  // 互換: advanced.sentenceSplitMode ではなく sentenceSplitMode が来るケース
  const legacySentenceSplitMode = getSetting(settings, 'sentenceSplitMode');
  if (patch.sentenceSplitMode === undefined && isSentenceSplitMode(legacySentenceSplitMode)) {
    patch.sentenceSplitMode = legacySentenceSplitMode;
  }

  if (Object.keys(patch).length > 0) {
    advancedRulesManager.updateConfig(patch);
  }
}

function applyBaseConfigFromSettings(settings: unknown): void {
  const enableGrammarCheck = getSetting(settings, 'enableGrammarCheck');
  const enableSemanticHighlight = getSetting(settings, 'enableSemanticHighlight');
  const excludeTableDelimiters = getSetting(settings, 'excludeTableDelimiters');
  const analyzeCodeBlocks = getSetting(settings, 'markdown.analyzeCodeBlocks');
  const analyzeTables = getSetting(settings, 'markdown.analyzeTables');
  const targetLanguages = getSetting(settings, 'targetLanguages');
  const debounceDelay = getSetting(settings, 'debounceDelay');
  const enableWikipedia = getSetting(settings, 'hover.enableWikipedia');
  const enableGlossary = getSetting(settings, 'hover.enableGlossary');
  const enabledGlossaries = getSetting(settings, 'hover.enabledGlossaries');

  configuration = {
    ...configuration,
    enableGrammarCheck: typeof enableGrammarCheck === 'boolean' ? enableGrammarCheck : configuration.enableGrammarCheck,
    enableSemanticHighlight: typeof enableSemanticHighlight === 'boolean' ? enableSemanticHighlight : configuration.enableSemanticHighlight,
    excludeTableDelimiters: typeof excludeTableDelimiters === 'boolean' ? excludeTableDelimiters : configuration.excludeTableDelimiters,
    markdown: {
      ...configuration.markdown,
      analyzeCodeBlocks: typeof analyzeCodeBlocks === 'boolean' ? analyzeCodeBlocks : configuration.markdown.analyzeCodeBlocks,
      analyzeTables: typeof analyzeTables === 'boolean' ? analyzeTables : configuration.markdown.analyzeTables,
    },
    targetLanguages: Array.isArray(targetLanguages) ? (targetLanguages as SupportedLanguage[]) : configuration.targetLanguages,
    debounceDelay: typeof debounceDelay === 'number' && Number.isFinite(debounceDelay) ? debounceDelay : configuration.debounceDelay,
    hover: {
      ...configuration.hover,
      enableWikipedia: typeof enableWikipedia === 'boolean' ? enableWikipedia : configuration.hover.enableWikipedia,
      enableGlossary: typeof enableGlossary === 'boolean' ? enableGlossary : configuration.hover.enableGlossary,
      enabledGlossaries: Array.isArray(enabledGlossaries) ? (enabledGlossaries as any) : configuration.hover.enabledGlossaries,
    },
  };

  hoverProvider.setWikipediaEnabled(configuration.hover.enableWikipedia);
  hoverProvider.setGlossaryEnabled(configuration.hover.enableGlossary);
  hoverProvider.setEnabledGlossaries(configuration.hover.enabledGlossaries);
}

async function getWorkspaceOtakLcpSettings(): Promise<unknown> {
  try {
    const [base, advanced] = await Promise.all([
      connection.workspace.getConfiguration({ section: 'otakLcp' } as any),
      connection.workspace.getConfiguration({ section: 'otakLcp.advanced' } as any),
    ]);

    if (base && typeof base === 'object') {
      const merged = { ...(base as Record<string, unknown>) } as Record<string, unknown>;
      if (advanced && typeof advanced === 'object') {
        const baseAdvanced = getSetting(merged, 'advanced');
        merged.advanced = {
          ...(baseAdvanced && typeof baseAdvanced === 'object' ? (baseAdvanced as Record<string, unknown>) : {}),
          ...(advanced as Record<string, unknown>),
        };
      }
      return merged;
    }

    return { advanced };
  } catch (error) {
    connection.console.error(`[ERROR] Failed to load workspace configuration: ${error}`);
    return undefined;
  }
}

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
  hoverProvider.setWikipediaEnabled(configuration.hover.enableWikipedia);
  hoverProvider.setGlossaryEnabled(configuration.hover.enableGlossary);
  hoverProvider.setEnabledGlossaries(configuration.hover.enabledGlossaries);

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

  // Load initial configuration (VS Code は起動時に didChangeConfiguration を送らないことがある)
  void (async () => {
    const settings = await getWorkspaceOtakLcpSettings();
    if (settings) {
      applyBaseConfigFromSettings(settings);
      applyAdvancedConfigFromSettings(settings);
    }
  })();
});

/**
 * Configuration changed
 */
connection.onDidChangeConfiguration(async (change) => {
  const wasGrammarEnabled = configuration.enableGrammarCheck;
  const wasSemanticEnabled = configuration.enableSemanticHighlight;

  const incomingSettings = change.settings?.otakLcp ?? await getWorkspaceOtakLcpSettings();
  if (!incomingSettings) {
    return;
  }

  applyBaseConfigFromSettings(incomingSettings);
  applyAdvancedConfigFromSettings(incomingSettings);

  connection.console.log(`Configuration updated: grammarCheck=${configuration.enableGrammarCheck}, semanticHighlight=${configuration.enableSemanticHighlight}, sentenceSplitMode=${advancedRulesManager.getConfig().sentenceSplitMode}`);

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
    documentExcludedRanges.clear();
    connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {});
  }

  // 有効になった場合、再解析
  if (configuration.enableGrammarCheck || configuration.enableSemanticHighlight) {
    documents.all().forEach((doc) => {
      scheduleAnalysis(doc);
    });
  }
});

/**
 * Schedule document analysis with debounce
 */
function scheduleAnalysis(document: TextDocument): void {
  if (!configuration.enableGrammarCheck && !configuration.enableSemanticHighlight) {
    return;
  }

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
  if (!configuration.enableGrammarCheck && !configuration.enableSemanticHighlight) {
    return;
  }

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
    let excludedRanges: ExcludedRange[] = [];
    let semanticExcludedRanges: ExcludedRange[] = [];
    let grammarExcludedRanges: ExcludedRange[] = [];

    if (languageId !== 'markdown' && languageId !== 'plaintext') {
      const comments = commentExtractor.extract(text, languageId);
      textToAnalyze = comments.map((c) => c.text).join('\n');
      connection.console.log(`[DEBUG] Extracted ${comments.length} comments`);
    } else if (languageId === 'markdown') {
      // Apply markdown filtering to exclude code blocks, URLs, table delimiters, etc.
      const filterResult = markdownFilter.filter(textToAnalyze, {
        ...markdownFilter.getConfig(),
        preserveCodeBlockContent: configuration.markdown.analyzeCodeBlocks,
      });
      textToAnalyze = filterResult.filteredText;
      excludedRanges = filterResult.excludedRanges;

      // セマンティックハイライト用: table 範囲を除外せずにセル内テキストを残す（デフォルト）
      const baseSemanticRanges = excludedRanges.filter((r) => r.type !== 'table');
      semanticExcludedRanges = configuration.excludeTableDelimiters === false
        ? excludedRanges
        : baseSemanticRanges;

      // 文法チェック用: すべての除外範囲を使用（table 全体も含む）
      grammarExcludedRanges = configuration.markdown.analyzeCodeBlocks
        ? excludedRanges.filter((r) => r.type !== 'code-block')
        : excludedRanges;
      if (configuration.markdown.analyzeTables) {
        grammarExcludedRanges = grammarExcludedRanges.filter((r) => r.type !== 'table');
      }

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
        ? advancedRulesManager.checkText(textToAnalyze, grammarTokensList, excludedRanges, {
          analyzeTables: configuration.markdown.analyzeTables,
        })
        : advancedRulesManager.checkText(textToAnalyze, grammarTokensList);
      connection.console.log(`[DEBUG] Advanced grammar check found ${advancedDiagnostics.length} issues`);
      for (const diag of advancedDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

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
  documentExcludedRanges.delete(uri);

  // Clear diagnostics
  connection.sendDiagnostics({ uri, diagnostics: [] });
});

/**
 * Hover request
 */
connection.onHover(async (params: TextDocumentPositionParams): Promise<Hover | null> => {
  const uri = params.textDocument.uri;
  const tokens = documentTokens.get(uri) ?? [];

  const document = documents.get(uri);
  if (!document) {
    return null;
  }

  // Convert position to character offset
  const offset = document.offsetAt(params.position);

  const documentText = documentTexts.get(uri) ?? document.getText();
  const hoverResult = await hoverProvider.provideHover(tokens, offset, documentText);
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

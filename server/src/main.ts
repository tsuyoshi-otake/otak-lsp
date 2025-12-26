/**
 * Language Server Entry Point
 * otak-lsp - Japanese Grammar Analyzer
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
import {
  AdvancedRulesConfig,
  SentenceSplitMode,
  WeakExpressionLevel,
  RuleProfilingCollector,
  RuleProfilingEntry
} from '../../shared/src/advancedTypes';
import { AnalysisState, AnalysisStateManager, createInitialAnalysisState } from './server/languageServer';
import { ProofreadingRulesManager } from './proofreading/proofreadingRulesManager';
import {
  parseProofreadingSettingsFromRaw,
  applyProofreadingSettings,
  ProofreadingSettingsConfig,
  DEFAULT_PROOFREADING_CONFIG
} from './proofreading/proofreadingConfig';

// Create connection
const connection = createConnection(ProposedFeatures.all);

const DEBUG_LOGS = process.env.OTAK_LCP_DEBUG === '1';
const PROFILE_LOGS_ENV = process.env.OTAK_LCP_PROFILE === '1';

type ProfileStep = {
  name: string;
  ms: number;
  meta?: string;
};

function formatMs(ms: number): string {
  return `${ms.toFixed(1)}ms`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function logProfileBlock(
  title: string,
  headerMeta: string,
  steps: ProfileStep[],
  totalMs: number
): void {
  if (!isProfileLogsEnabled()) {
    return;
  }

  connection.console.log(`[PROFILE] ${title} ${headerMeta} total=${formatMs(totalMs)}`);

  if (steps.length === 0) {
    return;
  }

  for (const step of steps) {
    const ratio = totalMs > 0 ? (step.ms / totalMs) * 100 : 0;
    const meta = step.meta ? ` ${step.meta}` : '';
    connection.console.log(`  ${step.name}=${formatMs(step.ms)} (${formatPercent(ratio)})${meta}`);
  }
}

function isProfileLogsEnabled(): boolean {
  return configuration.enableProfileLogs || PROFILE_LOGS_ENV;
}

/**
 * ルール別プロファイルログを出力
 * Feature: advanced-rules-profiling
 * 要件: 3.1, 3.2, 3.3, 3.4 - 1回の解析ごとに1まとまり、降順、URI・バージョン、比率表示
 */
function logRuleProfilingBlock(
  uri: string,
  version: number,
  collector: RuleProfilingCollector
): void {
  if (!isProfileLogsEnabled()) {
    return;
  }

  if (collector.entries.length === 0) {
    return;
  }

  // 要件 3.2: 実行時間の降順でソート
  const sortedEntries = [...collector.entries].sort(
    (a, b) => b.executionTimeMs - a.executionTimeMs
  );

  // 要件 3.3, 3.4: URI、バージョン、合計時間をヘッダに
  connection.console.log(
    `[PROFILE] 高度ルール内訳 uri=${uri} version=${version} total=${formatMs(collector.totalTimeMs)}`
  );

  for (const entry of sortedEntries) {
    const ratio = collector.totalTimeMs > 0
      ? (entry.executionTimeMs / collector.totalTimeMs) * 100
      : 0;

    let logLine = `  rule=${entry.ruleName} ${formatMs(entry.executionTimeMs)} (${formatPercent(ratio)}) diagnostics=${entry.diagnosticsCount}`;

    // 要件 4.2: 失敗したルールは error=... を付与
    if (!entry.success && entry.errorMessage) {
      logLine += ` error=${entry.errorMessage}`;
    }

    connection.console.log(logLine);
  }
}

// Create document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Components
let mecabAnalyzer: MeCabAnalyzer;
let commentExtractor: CommentExtractor;
let markdownFilter: MarkdownFilter;
let tokenFilter: TokenFilter;
let grammarChecker: GrammarChecker;
let advancedRulesManager: AdvancedRulesManager;
let proofreadingRulesManager: ProofreadingRulesManager;
let semanticTokenProvider: SemanticTokenProvider;
let hoverProvider: HoverProvider;
let wikipediaClient: WikipediaClient;

// Document analysis cache
const documentTokens: Map<string, Token[]> = new Map();
const documentTexts: Map<string, string> = new Map();
const documentExcludedRanges: Map<string, ExcludedRange[]> = new Map();
const documentLineStarts: Map<string, number[]> = new Map();
const documentSemanticTokensCache: Map<string, { tokens: Token[]; lineStarts: number[]; semanticTokens: SemanticTokens }> = new Map();

// Configuration
let configuration: Configuration = {
  enableGrammarCheck: true,
  enableSemanticHighlight: true,
  excludeTableDelimiters: true,
  enableProfileLogs: false,
  markdown: {
    analyzeCodeBlocks: true,
    analyzeTables: true,
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

// Idle timers for tiered execution (Feature: advanced-rules-tiered-execution)
// 編集停止後に全ルールを実行するためのタイマー
const idleTimers: Map<string, NodeJS.Timeout> = new Map();

// 軽量ルールのみ実行済みの文書を追跡（全ルール実行待ち）
const pendingFullAnalysis: Set<string> = new Set();

// Analysis state management (Feature: input-lag-improvement)
// 要件: 3.1, 3.3 - 各文書URIに対して解析状態を管理
const analysisStates: AnalysisStateManager = new AnalysisStateManager();

// デバッグログコールバックの設定（Feature: input-lag-improvement タスク7）
// DEBUG_LOGS有効時に解析状態の変化をログ出力
if (DEBUG_LOGS) {
  analysisStates.setDebugLogCallback((message: string) => {
    connection.console.log(`[DEBUG] ${message}`);
  });
}

function computeLineStarts(text: string): number[] {
  const lineStarts: number[] = [0];
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) {
      lineStarts.push(i + 1);
    }
  }
  return lineStarts;
}

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
    const incoming = getSetting(settings, `advanced.${key}`);

    if (key === 'customNotationRules') {
      if (incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
        const record = incoming as Record<string, unknown>;
        const entries: Array<[string, string]> = [];
        for (const [k, v] of Object.entries(record)) {
          if (typeof v === 'string') {
            entries.push([k, v]);
          }
        }
        patch.customNotationRules = new Map(entries);
      } else if (incoming && Array.isArray(incoming)) {
        // 互換: [{ incorrect, correct }] 形式も受け付ける
        const entries: Array<[string, string]> = [];
        for (const item of incoming) {
          if (!item || typeof item !== 'object') {
            continue;
          }
          const asRecord = item as Record<string, unknown>;
          const incorrect = asRecord.incorrect;
          const correct = asRecord.correct;
          if (typeof incorrect === 'string' && typeof correct === 'string') {
            entries.push([incorrect, correct]);
          }
        }
        patch.customNotationRules = new Map(entries);
      }
      continue;
    }

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

  // 段階実行設定を読み込み（Feature: advanced-rules-tiered-execution）
  applyTieredExecutionConfigFromSettings(settings, patch);

  // 公文書ルールの設定を読み込み（Feature: official-document-rules）
  // 要件: 4.2, 4.3 - VSCode設定（otakLsp.official.*）から設定を読み込み、即座に反映
  applyOfficialConfigFromSettings(settings, patch);

  if (Object.keys(patch).length > 0) {
    advancedRulesManager.updateConfig(patch);
  }
}

/**
 * 段階実行設定を読み込む
 * Feature: advanced-rules-tiered-execution
 * 要件: 1 - VSCode設定（otakLsp.advanced.tieredExecution.*）から設定を読み込む
 */
function applyTieredExecutionConfigFromSettings(settings: unknown, patch: Partial<AdvancedRulesConfig>): void {
  const enabled = getSetting(settings, 'advanced.tieredExecution.enabled');
  const idleDelayMs = getSetting(settings, 'advanced.tieredExecution.idleDelayMs');

  // 現在の設定を基に更新
  const currentConfig = advancedRulesManager.getConfig();
  const newTieredExecution = { ...currentConfig.tieredExecution };

  if (typeof enabled === 'boolean') {
    newTieredExecution.enabled = enabled;
  }
  if (typeof idleDelayMs === 'number' && Number.isFinite(idleDelayMs) && idleDelayMs >= 500) {
    newTieredExecution.idleDelayMs = idleDelayMs;
  }

  // どちらかが変更されていれば更新
  if (newTieredExecution.enabled !== currentConfig.tieredExecution.enabled ||
      newTieredExecution.idleDelayMs !== currentConfig.tieredExecution.idleDelayMs) {
    patch.tieredExecution = newTieredExecution;
  }
}

/**
 * 公文書ルールの設定を読み込む
 * Feature: official-document-rules
 * 要件: 4.2, 4.3 - VSCode設定（otakLsp.official.*）から設定を読み込み、即座に反映
 */
function applyOfficialConfigFromSettings(settings: unknown, patch: Partial<AdvancedRulesConfig>): void {
  // 「及び/並びに」使い分けチェック
  const enableOyobiNarabini = getSetting(settings, 'official.enableOyobiNarabini');
  if (typeof enableOyobiNarabini === 'boolean') {
    patch.enableOyobiNarabini = enableOyobiNarabini;
  }

  // 「又は/若しくは」使い分けチェック
  const enableMatawaWakushikuwa = getSetting(settings, 'official.enableMatawaWakushikuwa');
  if (typeof enableMatawaWakushikuwa === 'boolean') {
    patch.enableMatawaWakushikuwa = enableMatawaWakushikuwa;
  }

  // 常用漢字外検出
  const enableJouyouKanji = getSetting(settings, 'official.enableJouyouKanji');
  if (typeof enableJouyouKanji === 'boolean') {
    patch.enableJouyouKanji = enableJouyouKanji;
  }

  // 固有名詞除外オプション
  const excludeProperNounsFromJouyouKanji = getSetting(settings, 'official.excludeProperNounsFromJouyouKanji');
  if (typeof excludeProperNounsFromJouyouKanji === 'boolean') {
    patch.excludeProperNounsFromJouyouKanji = excludeProperNounsFromJouyouKanji;
  }

  // 箇条書き句点運用チェック
  const enableBulletPunctuation = getSetting(settings, 'official.enableBulletPunctuation');
  if (typeof enableBulletPunctuation === 'boolean') {
    patch.enableBulletPunctuation = enableBulletPunctuation;
  }
}

/**
 * 校正設定を読み込んで適用
 * Feature: proofreading-settings-compat
 * 要件: 1.3 - VS Code設定（otakLsp.proofreading.*）から設定を読み込み、即座に反映
 */
function applyProofreadingConfigFromSettings(settings: unknown): void {
  const proofreadingSetting = getSetting(settings, 'proofreading');
  if (!proofreadingSetting || typeof proofreadingSetting !== 'object') {
    return;
  }

  // VS Code設定からProofreadingSettingsConfigを生成
  const proofreadingConfig = parseProofreadingSettingsFromRaw(proofreadingSetting as Record<string, unknown>);

  // ProofreadingRulesManagerの設定を更新
  proofreadingRulesManager.updateConfig(proofreadingConfig);

  // AdvancedRulesConfigにパッチを適用
  const currentAdvancedConfig = advancedRulesManager.getConfig();
  const mergedConfig = applyProofreadingSettings(proofreadingConfig, currentAdvancedConfig);
  advancedRulesManager.updateConfig(mergedConfig);

  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Proofreading config applied: preset=${proofreadingConfig.preset}, mergeMode=${proofreadingConfig.mergeMode}`);
  }
}

function applyBaseConfigFromSettings(settings: unknown): void {
  const enableGrammarCheck = getSetting(settings, 'enableGrammarCheck');
  const enableSemanticHighlight = getSetting(settings, 'enableSemanticHighlight');
  const excludeTableDelimiters = getSetting(settings, 'excludeTableDelimiters');
  const enableProfileLogs = getSetting(settings, 'enableProfileLogs');
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
    enableProfileLogs: typeof enableProfileLogs === 'boolean' ? enableProfileLogs : configuration.enableProfileLogs,
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

async function getWorkspaceOtakLspSettings(): Promise<unknown> {
  try {
    const [base, advanced, official, proofreading] = await Promise.all([
      connection.workspace.getConfiguration({ section: 'otakLsp' } as any),
      connection.workspace.getConfiguration({ section: 'otakLsp.advanced' } as any),
      connection.workspace.getConfiguration({ section: 'otakLsp.official' } as any),
      connection.workspace.getConfiguration({ section: 'otakLsp.proofreading' } as any),
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
      // 公文書ルールの設定をマージ（Feature: official-document-rules）
      if (official && typeof official === 'object') {
        const baseOfficial = getSetting(merged, 'official');
        merged.official = {
          ...(baseOfficial && typeof baseOfficial === 'object' ? (baseOfficial as Record<string, unknown>) : {}),
          ...(official as Record<string, unknown>),
        };
      }
      // 校正設定をマージ（Feature: proofreading-settings-compat）
      if (proofreading && typeof proofreading === 'object') {
        const baseProofreading = getSetting(merged, 'proofreading');
        merged.proofreading = {
          ...(baseProofreading && typeof baseProofreading === 'object' ? (baseProofreading as Record<string, unknown>) : {}),
          ...(proofreading as Record<string, unknown>),
        };
      }
      return merged;
    }

    return { advanced, official, proofreading };
  } catch (error) {
    connection.console.error(`[ERROR] Failed to load workspace configuration: ${error}`);
    return undefined;
  }
}

/**
 * Initialize server
 */
connection.onInitialize((params: InitializeParams): InitializeResult => {
  connection.console.log('otak-lsp Language Server initializing...');

  // Initialize components (kuromoji.js - no external dependencies)
  mecabAnalyzer = new MeCabAnalyzer();
  commentExtractor = new CommentExtractor();
  markdownFilter = new MarkdownFilter();
  tokenFilter = new TokenFilter();
  grammarChecker = new GrammarChecker();
  advancedRulesManager = new AdvancedRulesManager();
  proofreadingRulesManager = new ProofreadingRulesManager();
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
  connection.console.log('otak-lsp Language Server initialized');

  // Register for configuration changes
  connection.client.register(DidChangeConfigurationNotification.type, undefined);

  // Load initial configuration (VS Code は起動時に didChangeConfiguration を送らないことがある)
  void (async () => {
    const settings = await getWorkspaceOtakLspSettings();
    if (settings) {
      applyBaseConfigFromSettings(settings);
      applyAdvancedConfigFromSettings(settings);
      applyProofreadingConfigFromSettings(settings);
    }
  })();
});

/**
 * Configuration changed
 */
connection.onDidChangeConfiguration(async (change) => {
  const wasGrammarEnabled = configuration.enableGrammarCheck;
  const wasSemanticEnabled = configuration.enableSemanticHighlight;

  const incomingSettings = change.settings?.otakLsp ?? await getWorkspaceOtakLspSettings();
  if (!incomingSettings) {
    return;
  }

  applyBaseConfigFromSettings(incomingSettings);
  applyAdvancedConfigFromSettings(incomingSettings);
  applyProofreadingConfigFromSettings(incomingSettings);

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
    documentLineStarts.clear();
    documentSemanticTokensCache.clear();
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
 * Feature: input-lag-improvement
 * Feature: advanced-rules-tiered-execution
 * 要件: 1.1, 1.3, 3.3 - 解析の直列化と最新要求の優先
 */
function scheduleAnalysis(document: TextDocument): void {
  if (!configuration.enableGrammarCheck && !configuration.enableSemanticHighlight) {
    return;
  }

  const uri = document.uri;
  const now = Date.now();

  // 解析状態を更新（最新文書情報と変更時刻を記録）
  // 要件: 3.3 - 最新の文書情報と変更時刻を記録
  const currentState = analysisStates.getState(uri);

  // 要件: 1.1 - 解析が実行中の場合、新しい解析要求を待機状態にする
  if (currentState.running) {
    // 実行中の場合は待機状態に設定し、最新の文書情報を記録
    analysisStates.updateState(uri, {
      pending: true,
      latestDocument: document,
      latestVersion: document.version,
      lastChangeAt: now,
    });

    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Analysis running for ${uri}, queuing request (version: ${document.version})`);
    }
    return;
  }

  // 要件: 1.3 - 最新の文書状態のみを解析対象とする
  analysisStates.updateState(uri, {
    latestDocument: document,
    latestVersion: document.version,
    lastChangeAt: now,
  });

  // Clear existing timer
  const existingTimer = debounceTimers.get(uri);
  if (existingTimer) {
    clearTimeout(existingTimer);
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Cleared existing debounce timer for ${uri}`);
    }
  }

  // Feature: advanced-rules-tiered-execution
  // 段階実行が有効な場合、アイドルタイマーをリセットして軽量ルールのみの解析をスケジュール
  const tieredConfig = advancedRulesManager.getConfig().tieredExecution;
  if (tieredConfig.enabled) {
    // アイドルタイマーをクリア・リセット
    const existingIdleTimer = idleTimers.get(uri);
    if (existingIdleTimer) {
      clearTimeout(existingIdleTimer);
    }

    // 軽量ルールのみの解析をスケジュール
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Tiered execution: scheduling lightweight analysis for ${uri}`);
    }
    const timer = setTimeout(() => {
      runAnalysis(uri, true); // lightweightOnly = true
      debounceTimers.delete(uri);
    }, configuration.debounceDelay);
    debounceTimers.set(uri, timer);

    // アイドル後に全ルール実行をスケジュール
    const idleTimer = setTimeout(() => {
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Tiered execution: idle timeout, scheduling full analysis for ${uri}`);
      }
      scheduleFullAnalysis(uri);
      idleTimers.delete(uri);
    }, tieredConfig.idleDelayMs);
    idleTimers.set(uri, idleTimer);

    return;
  }

  // Set new timer (従来の全ルール実行)
  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Setting debounce timer for ${uri} (delay: ${configuration.debounceDelay}ms, version: ${document.version})`);
  }
  const timer = setTimeout(() => {
    runAnalysis(uri, false);
    debounceTimers.delete(uri);
  }, configuration.debounceDelay);

  debounceTimers.set(uri, timer);
}

/**
 * Schedule full analysis (all rules)
 * Feature: advanced-rules-tiered-execution
 * アイドル時または保存時に全ルールを実行
 */
function scheduleFullAnalysis(uri: string): void {
  const state = analysisStates.getState(uri);
  if (!state.latestDocument) {
    return;
  }

  // 全ルール解析が待機中であることを記録
  pendingFullAnalysis.add(uri);

  // 実行中の解析がある場合は完了を待つ
  if (state.running) {
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Full analysis pending for ${uri}, waiting for current analysis to complete`);
    }
    return;
  }

  // 即座に全ルール解析を開始
  runAnalysis(uri, false).then(() => {
    pendingFullAnalysis.delete(uri);
  });
}

/**
 * Run serialized analysis
 * Feature: input-lag-improvement
 * Feature: advanced-rules-tiered-execution
 * 要件: 1.2, 4.3 - 解析完了後の再スケジューリング
 *
 * @param uri 文書URI
 * @param lightweightOnly 軽量ルールのみ実行するかどうか（段階実行用）
 */
async function runAnalysis(uri: string, lightweightOnly: boolean = false): Promise<void> {
  const state = analysisStates.getState(uri);
  const document = state.latestDocument;

  if (!document) {
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] No document found for ${uri}, skipping analysis`);
    }
    return;
  }

  // 解析開始: running = true に設定
  const analysisVersion = state.latestVersion;
  const analysisChangeAt = state.lastChangeAt;
  analysisStates.updateState(uri, {
    running: true,
    pending: false,
  });

  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Starting analysis for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);
  }

  try {
    // 解析実行（バージョン情報と軽量モードを渡す）
    await analyzeDocument(document, analysisVersion, lightweightOnly);
  } finally {
    // 解析完了: running = false に設定
    analysisStates.updateState(uri, { running: false });

    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Analysis completed for ${uri} (version: ${analysisVersion}, lightweightOnly: ${lightweightOnly})`);
    }

    // Feature: advanced-rules-tiered-execution
    // 全ルール解析が待機中なら実行
    if (pendingFullAnalysis.has(uri)) {
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Pending full analysis found for ${uri}, starting now`);
      }
      pendingFullAnalysis.delete(uri);
      runAnalysis(uri, false);
      return;
    }

    // 要件: 1.2, 4.3 - 待機中の解析要求があれば次の解析を開始
    const stateAfterComplete = analysisStates.getState(uri);
    if (stateAfterComplete.pending) {
      // 要件: 4.3 - 残り遅延時間を計算してタイマーを設定
      const elapsed = Date.now() - stateAfterComplete.lastChangeAt;
      const remainingDelay = Math.max(0, configuration.debounceDelay - elapsed);

      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Pending analysis found for ${uri}, rescheduling (remaining delay: ${remainingDelay}ms, pending version: ${stateAfterComplete.latestVersion})`);
      }

      // Clear existing timer if any
      const existingTimer = debounceTimers.get(uri);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 段階実行の場合は軽量ルールのみでスケジュール
      const tieredConfig = advancedRulesManager.getConfig().tieredExecution;
      const timer = setTimeout(() => {
        runAnalysis(uri, tieredConfig.enabled);
        debounceTimers.delete(uri);
      }, remainingDelay);

      debounceTimers.set(uri, timer);
    }
  }
}

/**
 * Analyze document
 * Feature: input-lag-improvement
 * Feature: advanced-rules-tiered-execution
 * 要件: 2.1, 2.2, 2.3, 2.4 - 古い解析結果の破棄
 *
 * @param document 解析対象の文書
 * @param analysisVersion 解析開始時の文書バージョン（stale判定用）
 * @param lightweightOnly 軽量ルールのみ実行するかどうか（段階実行用）
 */
async function analyzeDocument(document: TextDocument, analysisVersion?: number, lightweightOnly: boolean = false): Promise<void> {
  if (!configuration.enableGrammarCheck && !configuration.enableSemanticHighlight) {
    return;
  }

  const profileEnabled = isProfileLogsEnabled();
  const profileSteps: ProfileStep[] = [];
  const analysisStart = profileEnabled ? Date.now() : 0;
  const recordStep = (name: string, start: number, meta?: string): void => {
    if (!profileEnabled) {
      return;
    }
    profileSteps.push({ name, ms: Date.now() - start, meta });
  };

  const uri = document.uri;
  const text = document.getText();
  const languageId = document.languageId as SupportedLanguage;
  let analyzedTokenCount = 0;
  let diagnosticsCount = 0;

  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Analyzing document: ${uri}`);
    connection.console.log(`[DEBUG] Language ID: ${languageId}`);
    connection.console.log(`[DEBUG] Text length: ${text.length}`);
  }

  // Check if language is supported
  if (!configuration.targetLanguages.includes(languageId)) {
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Language ${languageId} not in target languages, skipping`);
    }
    return;
  }

  try {
    // Extract text to analyze (comments for code, full text for markdown/plaintext)
    let textToAnalyze = text;
    let excludedRanges: ExcludedRange[] = [];

    if (languageId !== 'markdown' && languageId !== 'plaintext') {
      const comments = commentExtractor.extract(text, languageId);
      textToAnalyze = comments.map((c) => c.text).join('\n');
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Extracted ${comments.length} comments`);
      }
    } else if (languageId === 'markdown') {
      // Apply markdown filtering to exclude code blocks, URLs, table delimiters, etc.
      const markdownStart = profileEnabled ? Date.now() : 0;
      const filterResult = markdownFilter.filter(textToAnalyze, {
        ...markdownFilter.getConfig(),
        preserveCodeBlockContent: configuration.markdown.analyzeCodeBlocks,
      });
      textToAnalyze = filterResult.filteredText;
      excludedRanges = filterResult.excludedRanges;
      recordStep('Markdownフィルタ', markdownStart, `除外=${excludedRanges.length}`);

      documentExcludedRanges.set(uri, excludedRanges);
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Markdown filtered: ${excludedRanges.length} ranges excluded`);
      }
    }

    // Skip if no text to analyze
    if (!textToAnalyze.trim()) {
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] No text to analyze, skipping`);
      }
      documentTokens.set(uri, []);
      connection.sendDiagnostics({ uri, diagnostics: [] });
      return;
    }

    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Text to analyze (first 100 chars): ${textToAnalyze.substring(0, 100)}`);
    }

    // Analyze with kuromoji
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Starting morphological analysis...`);
    }
    const mecabStart = profileEnabled ? Date.now() : 0;
    const allTokens = await mecabAnalyzer.analyze(textToAnalyze);
    recordStep('形態素解析', mecabStart, `tokens=${allTokens.length}`);
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Analysis complete, ${allTokens.length} tokens found`);
    }
    analyzedTokenCount = allTokens.length;

    let semanticTokensList: Token[] | null = configuration.enableSemanticHighlight ? allTokens : null;
    let grammarTokensList: Token[] | null = configuration.enableGrammarCheck ? allTokens : null;

    // Filter tokens that fall within excluded ranges (for Markdown files)
    // 注: キャッシュ更新は isStale チェック後に行う（要件 2.4）
    let tokensToCache: Token[] = allTokens;
    let hoverTokensList: Token[] | null = null;
    
    if (languageId === 'markdown') {
      const tokenFilterStart = profileEnabled ? Date.now() : 0;
      if (configuration.enableSemanticHighlight) {
        // セマンティックハイライト用:
        // - table: 既定では table 範囲を除外せずにセル内テキストを残す
        // - code-block: 既定ではコードブロック内もハイライト対象にする
        let semanticExcludedRanges = excludedRanges;
        if (configuration.excludeTableDelimiters !== false) {
          semanticExcludedRanges = semanticExcludedRanges.filter((r) => r.type !== 'table');
        }
        if (configuration.markdown.analyzeCodeBlocks) {
          semanticExcludedRanges = semanticExcludedRanges.filter((r) => r.type !== 'code-block');
        }

        if (semanticExcludedRanges.length > 0) {
          semanticTokensList = tokenFilter.filterTokens(allTokens, semanticExcludedRanges);
        }

        if (DEBUG_LOGS && semanticTokensList) {
          connection.console.log(
            `[DEBUG] Token filtering (semantic): ${allTokens.length} -> ${semanticTokensList.length} tokens (${allTokens.length - semanticTokensList.length} filtered out)`
          );
        }

        tokensToCache = semanticTokensList ?? [];
      } else {
        // セマンティックハイライトが無効でも Hover ではトークンが必要なため保持する。
        // ただし Markdown の除外範囲（URL/コード/構造マーカー等）は Hover でもノイズになるため除外する。
        let hoverExcludedRanges = excludedRanges;
        if (configuration.excludeTableDelimiters !== false) {
          hoverExcludedRanges = hoverExcludedRanges.filter((r) => r.type !== 'table');
        }
        if (configuration.markdown.analyzeCodeBlocks) {
          hoverExcludedRanges = hoverExcludedRanges.filter((r) => r.type !== 'code-block');
        }

        hoverTokensList = hoverExcludedRanges.length > 0
          ? tokenFilter.filterTokens(allTokens, hoverExcludedRanges)
          : allTokens;
        tokensToCache = hoverTokensList;
      }

      if (configuration.enableGrammarCheck) {
        // 文法チェック用: すべての除外範囲を使用（table 全体も含む）
        let grammarExcludedRanges = configuration.markdown.analyzeCodeBlocks
          ? excludedRanges.filter((r) => r.type !== 'code-block')
          : excludedRanges;
        if (configuration.markdown.analyzeTables) {
          grammarExcludedRanges = grammarExcludedRanges.filter((r) => r.type !== 'table');
        }

        if (grammarExcludedRanges.length > 0) {
          grammarTokensList = tokenFilter.filterTokens(allTokens, grammarExcludedRanges);
        }

        if (DEBUG_LOGS && grammarTokensList) {
          connection.console.log(
            `[DEBUG] Token filtering (grammar): ${allTokens.length} -> ${grammarTokensList.length} tokens (${allTokens.length - grammarTokensList.length} filtered out)`
          );
        }
      }
      recordStep('トークンフィルタ', tokenFilterStart);
    } else {
      // セマンティックハイライトが無効でも Hover ではトークンが必要なため保持する
      tokensToCache = allTokens;
      semanticTokensList = allTokens;
      grammarTokensList = allTokens;
    }

    // Grammar check
    const diagnostics: Diagnostic[] = [];
    if (configuration.enableGrammarCheck) {
      // Basic grammar rules
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Running basic grammar check...`);
      }
      const basicStart = profileEnabled ? Date.now() : 0;
      const grammarDiagnostics = grammarChecker.check(grammarTokensList ?? [], textToAnalyze);
      recordStep('基本ルール評価', basicStart, `件数=${grammarDiagnostics.length}`);
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Basic grammar check found ${grammarDiagnostics.length} issues`);
      }
      for (const diag of grammarDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range,
          message: diag.message,
          source: 'otak-lsp',
          code: diag.code,
        });
      }

      // Advanced grammar rules
      // Feature: advanced-rules-tiered-execution - lightweightOnly の場合は軽量ルールのみ
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Running advanced grammar check... (lightweightOnly: ${lightweightOnly})`);
      }
      const advancedStart = profileEnabled ? Date.now() : 0;
      // Feature: advanced-rules-profiling - プロファイル有効時のみコレクタを生成
      const ruleProfilingCollector: RuleProfilingCollector | undefined = profileEnabled
        ? { entries: [], totalTimeMs: 0 }
        : undefined;
      let advancedDiagnostics: Diagnostic[];
      if (lightweightOnly) {
        // 段階実行: 軽量ルールのみ実行
        advancedDiagnostics = languageId === 'markdown'
          ? advancedRulesManager.checkLightweightRules(textToAnalyze, grammarTokensList ?? [], excludedRanges, {
            analyzeTables: configuration.markdown.analyzeTables,
          }, ruleProfilingCollector)
          : advancedRulesManager.checkLightweightRules(textToAnalyze, grammarTokensList ?? [], undefined, undefined, ruleProfilingCollector);
        recordStep('軽量ルール評価', advancedStart, `件数=${advancedDiagnostics.length}`);
      } else {
        // 全ルール実行
        advancedDiagnostics = languageId === 'markdown'
          ? advancedRulesManager.checkText(textToAnalyze, grammarTokensList ?? [], excludedRanges, {
            analyzeTables: configuration.markdown.analyzeTables,
          }, ruleProfilingCollector)
          : advancedRulesManager.checkText(textToAnalyze, grammarTokensList ?? [], undefined, undefined, ruleProfilingCollector);
        recordStep('高度ルール評価', advancedStart, `件数=${advancedDiagnostics.length}`);
      }
      // Feature: advanced-rules-profiling - ルール別ログ出力
      if (ruleProfilingCollector) {
        logRuleProfilingBlock(uri, analysisVersion ?? document.version, ruleProfilingCollector);
      }
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Advanced grammar check found ${advancedDiagnostics.length} issues`);
      }
      for (const diag of advancedDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range,
          message: diag.message,
          source: 'otak-lsp',
          code: diag.code,
        });
      }

      // Proofreading rules (Feature: proofreading-settings-compat)
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Running proofreading rules check...`);
      }
      const proofreadingStart = profileEnabled ? Date.now() : 0;
      const proofreadingDiagnostics = proofreadingRulesManager.checkText(textToAnalyze, grammarTokensList ?? []);
      recordStep('校正ルール評価', proofreadingStart, `件数=${proofreadingDiagnostics.length}`);
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Proofreading rules check found ${proofreadingDiagnostics.length} issues`);
      }
      for (const diag of proofreadingDiagnostics) {
        let range = {
          start: { line: diag.range.start.line, character: diag.range.start.character },
          end: { line: diag.range.end.line, character: diag.range.end.character },
        };

        diagnostics.push({
          severity: convertSeverity(diag.severity),
          range,
          message: diag.message,
          source: 'otak-lsp-proofreading',
          code: diag.code,
        });
      }
    }

    // 要件: 2.1, 2.2, 2.3, 2.4 - 解析完了時に文書バージョンが変更されている場合、結果を破棄
    const currentState = analysisStates.getState(uri);
    const isStale = analysisVersion !== undefined && currentState.latestVersion > analysisVersion;
    
    if (isStale) {
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Discarding stale analysis result for ${uri} (analysis version: ${analysisVersion}, current version: ${currentState.latestVersion})`);
      }
      if (profileEnabled) {
        const totalMs = Date.now() - analysisStart;
        logProfileBlock(
          '解析',
          `uri=${uri} version=${analysisVersion ?? document.version} stale=true tokens=${analyzedTokenCount} diagnostics=${diagnostics.length}`,
          profileSteps,
          totalMs
        );
      }
      // 古い結果は破棄（キャッシュ更新・診断送信・セマンティック更新を行わない）
      // 要件: 2.2 - 診断情報の送信を行わない
      // 要件: 2.3 - セマンティックハイライトの更新を行わない
      // 要件: 2.4 - キャッシュの更新を行わない
      return;
    }

    // 要件: 2.4 - 最新の結果のみキャッシュを更新
    // Store tokens for hover and semantic highlighting
    documentTokens.set(uri, tokensToCache);
    // Store the original text for semantic token generation
    // (MarkdownFilter uses space replacement, so positions are preserved)
    documentTexts.set(uri, text);
    if (languageId === 'markdown') {
      documentExcludedRanges.set(uri, excludedRanges);
    }
    if (configuration.enableSemanticHighlight) {
      documentLineStarts.set(uri, computeLineStarts(text));
      documentSemanticTokensCache.delete(uri);
    }

    // 要件: 2.2 - 最新の結果のみ診断情報を送信
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Sending ${diagnostics.length} diagnostics`);
    }
    const notifyStart = profileEnabled ? Date.now() : 0;
    connection.sendDiagnostics({ uri, diagnostics });

    // Request semantic tokens refresh
    if (configuration.enableSemanticHighlight) {
      if (DEBUG_LOGS) {
        connection.console.log(`[DEBUG] Requesting semantic tokens refresh`);
      }
      connection.sendRequest('workspace/semanticTokens/refresh').catch(() => {
        // Client might not support this request
      });
    }
    if (profileEnabled) {
      recordStep('診断/セマンティック更新', notifyStart, `diagnostics=${diagnostics.length}`);
      diagnosticsCount = diagnostics.length;
      const totalMs = Date.now() - analysisStart;
      logProfileBlock(
        '解析',
        `uri=${uri} version=${analysisVersion ?? document.version} stale=false tokens=${analyzedTokenCount} diagnostics=${diagnosticsCount}`,
        profileSteps,
        totalMs
      );
    }
  } catch (error) {
    connection.console.error(`[ERROR] Analysis failed for ${uri}: ${error}`);
    documentTokens.delete(uri);
    documentTexts.delete(uri);
    documentLineStarts.delete(uri);
    documentSemanticTokensCache.delete(uri);
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
 * Document saved
 * Feature: advanced-rules-tiered-execution
 * 保存時に全ルールを即時実行
 */
documents.onDidSave((event) => {
  const tieredConfig = advancedRulesManager.getConfig().tieredExecution;
  if (!tieredConfig.enabled) {
    return;
  }

  const uri = event.document.uri;
  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Document saved: ${uri}, triggering full analysis`);
  }

  // アイドルタイマーをクリア（保存で全ルール実行するので不要）
  const existingIdleTimer = idleTimers.get(uri);
  if (existingIdleTimer) {
    clearTimeout(existingIdleTimer);
    idleTimers.delete(uri);
  }

  // 全ルール解析をスケジュール
  scheduleFullAnalysis(uri);
});

/**
 * Document closed
 * Feature: input-lag-improvement
 * Feature: advanced-rules-tiered-execution
 * 要件: 3.2 - 文書クローズ時に解析状態を削除
 */
documents.onDidClose((event) => {
  const uri = event.document.uri;
  connection.console.log(`Document closed: ${uri}`);

  // Clear timer
  const timer = debounceTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(uri);
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Cleared debounce timer on document close for ${uri}`);
    }
  }

  // Feature: advanced-rules-tiered-execution - アイドルタイマーをクリア
  const idleTimer = idleTimers.get(uri);
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimers.delete(uri);
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Cleared idle timer on document close for ${uri}`);
    }
  }
  pendingFullAnalysis.delete(uri);

  // Clear analysis state (要件: 3.2)
  // デバッグログはAnalysisStateManager内で出力される
  analysisStates.deleteState(uri);

  // Clear cache
  documentTokens.delete(uri);
  documentTexts.delete(uri);
  documentExcludedRanges.delete(uri);
  documentLineStarts.delete(uri);
  documentSemanticTokensCache.delete(uri);

  if (DEBUG_LOGS) {
    connection.console.log(`[DEBUG] Cleared all caches for ${uri}`);
  }

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

    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Providing semantic tokens for ${tokens.length} tokens`);
    }
    const lineStarts = documentLineStarts.get(uri) ?? computeLineStarts(text);
    if (!documentLineStarts.has(uri)) {
      documentLineStarts.set(uri, lineStarts);
    }

    const cached = documentSemanticTokensCache.get(uri);
    if (cached && cached.tokens === tokens && cached.lineStarts === lineStarts) {
      if (isProfileLogsEnabled()) {
        logProfileBlock(
          'セマンティックトークン',
          `uri=${uri} tokens=${tokens.length} cache=hit`,
          [],
          0
        );
      }
      return cached.semanticTokens;
    }

    const profileEnabled = isProfileLogsEnabled();
    const semanticStart = profileEnabled ? Date.now() : 0;
    const semanticTokens = semanticTokenProvider.provideSemanticTokens(tokens, text, lineStarts);
    documentSemanticTokensCache.set(uri, { tokens, lineStarts, semanticTokens });
    if (DEBUG_LOGS) {
      connection.console.log(`[DEBUG] Semantic tokens data length: ${semanticTokens.data.length}`);
    }
    if (profileEnabled) {
      const totalMs = Date.now() - semanticStart;
      logProfileBlock(
        'セマンティックトークン',
        `uri=${uri} tokens=${tokens.length} cache=miss`,
        [{ name: '生成', ms: totalMs }],
        totalMs
      );
    }
    return semanticTokens;
  }
);

// Listen for document events
documents.listen(connection);

// Start server
connection.listen();

connection.console.log('otak-lsp Language Server started');

/**
 * 漢字の読み方を取得する
 * @param char 漢字文字（複数文字の場合は最初の文字のみ処理）
 * @returns 読み方の配列（漢字でない場合は空配列）
 */
export function getKanjiReadings(char: string): string[] {
  // 空文字列の場合は空配列を返す
  if (!char || char.length === 0) {
    return [];
  }

  // 最初の文字のみを処理
  const firstChar = char.charAt(0);
  const codePoint = firstChar.codePointAt(0);

  // 漢字の範囲をチェック（CJK統合漢字: U+4E00-U+9FFF）
  if (codePoint === undefined || codePoint < 0x4E00 || codePoint > 0x9FFF) {
    return [];
  }

  // 基本的な漢字の読み方データ（一部の常用漢字）
  const kanjiReadings: Record<string, string[]> = {
    '日': ['ニチ', 'ジツ', 'ひ', 'か'],
    '月': ['ゲツ', 'ガツ', 'つき'],
    '火': ['カ', 'ひ', 'ほ'],
    '水': ['スイ', 'みず'],
    '木': ['モク', 'ボク', 'き', 'こ'],
    '金': ['キン', 'コン', 'かね', 'かな'],
    '土': ['ド', 'ト', 'つち'],
    '山': ['サン', 'やま'],
    '川': ['セン', 'かわ'],
    '田': ['デン', 'た'],
    '人': ['ジン', 'ニン', 'ひと'],
    '口': ['コウ', 'ク', 'くち'],
    '目': ['モク', 'ボク', 'め', 'ま'],
    '手': ['シュ', 'て', 'た'],
    '足': ['ソク', 'あし', 'た'],
    '本': ['ホン', 'もと'],
    '文': ['ブン', 'モン', 'ふみ'],
    '字': ['ジ', 'あざ'],
    '学': ['ガク', 'まな'],
    '校': ['コウ'],
    '先': ['セン', 'さき'],
    '生': ['セイ', 'ショウ', 'い', 'う', 'は', 'なま'],
    '年': ['ネン', 'とし'],
    '大': ['ダイ', 'タイ', 'おお'],
    '小': ['ショウ', 'ちい', 'こ', 'お'],
    '中': ['チュウ', 'なか'],
    '上': ['ジョウ', 'ショウ', 'うえ', 'うわ', 'かみ', 'あ', 'のぼ'],
    '下': ['カ', 'ゲ', 'した', 'しも', 'もと', 'さ', 'くだ', 'お'],
    '左': ['サ', 'ひだり'],
    '右': ['ウ', 'ユウ', 'みぎ'],
    '男': ['ダン', 'ナン', 'おとこ', 'お'],
    '女': ['ジョ', 'ニョ', 'ニョウ', 'おんな', 'め'],
    '子': ['シ', 'ス', 'こ'],
    '父': ['フ', 'ちち'],
    '母': ['ボ', 'はは'],
    '王': ['オウ'],
    '玉': ['ギョク', 'たま'],
    '国': ['コク', 'くに'],
    '花': ['カ', 'はな'],
    '草': ['ソウ', 'くさ'],
    '虫': ['チュウ', 'むし'],
    '犬': ['ケン', 'いぬ'],
    '空': ['クウ', 'そら', 'あ', 'から'],
    '雨': ['ウ', 'あめ', 'あま'],
    '天': ['テン', 'あめ', 'あま'],
    '気': ['キ', 'ケ'],
    '夕': ['セキ', 'ゆう'],
    '名': ['メイ', 'ミョウ', 'な'],
    '音': ['オン', 'イン', 'おと', 'ね'],
    '休': ['キュウ', 'やす'],
    '見': ['ケン', 'み'],
    '早': ['ソウ', 'サッ', 'はや'],
    '耳': ['ジ', 'みみ'],
    '出': ['シュツ', 'スイ', 'で', 'だ'],
    '入': ['ニュウ', 'い', 'はい'],
    '立': ['リツ', 'リュウ', 'た'],
    '正': ['セイ', 'ショウ', 'ただ', 'まさ'],
    '白': ['ハク', 'ビャク', 'しろ', 'しら'],
    '赤': ['セキ', 'シャク', 'あか'],
    '青': ['セイ', 'ショウ', 'あお'],
    '百': ['ヒャク'],
    '千': ['セン', 'ち'],
    '万': ['マン', 'バン', 'よろず'],
    '円': ['エン', 'まる'],
    '力': ['リョク', 'リキ', 'ちから'],
    '林': ['リン', 'はやし'],
    '森': ['シン', 'もり'],
    '石': ['セキ', 'シャク', 'コク', 'いし'],
    '竹': ['チク', 'たけ'],
    '糸': ['シ', 'いと'],
    '貝': ['バイ', 'かい'],
    '車': ['シャ', 'くるま'],
    '町': ['チョウ', 'まち'],
    '村': ['ソン', 'むら'],
  };

  return kanjiReadings[firstChar] || [];
}

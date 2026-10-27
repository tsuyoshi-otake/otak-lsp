/**
 * ConfigManager Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.2, 4.1, 4.2
 *
 * 設定の読み込み・適用・変更通知を管理
 */

import { Configuration, SupportedLanguage, GlossaryId, GlossaryGroupId, GLOSSARY_GROUPS } from '../../../shared/src/types';
import {
  AdvancedRulesConfig,
  SentenceSplitMode,
  WeakExpressionLevel,
  DEFAULT_ADVANCED_RULES_CONFIG,
} from '../../../shared/src/advancedTypes';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import {
  parseProofreadingSettingsFromRaw,
  applyProofreadingSettings,
  DEFAULT_PROOFREADING_CONFIG,
  ProofreadingSettingsConfig,
} from '../proofreading/proofreadingConfig';
import { HoverProvider } from '../hover/provider';
import { DEFAULT_ENABLED_GLOSSARIES } from '../hover/glossary';
import { Logger } from '../utils/logger';
import { isNotEmptyObject } from '../utils/arrayUtils';
import { DEFAULT_MAX_CONCURRENT_ANALYSES } from '../utils/concurrencyLimiter';
import { getSetting } from '../utils/configValue';

/**
 * 設定変更コールバック型
 */
export type ConfigChangeCallback = (config: Configuration) => void;

/** 解析開始時に固定し、他文書の設定変更から分離する設定一式。 */
export interface ConfigurationSnapshot {
  config: Configuration;
  advancedConfig: AdvancedRulesConfig;
  proofreadingConfig: ProofreadingSettingsConfig;
  glossariesExplicitlySet: boolean;
}

/**
 * ConfigManagerインターフェース
 */
export interface ConfigManager {
  /**
   * 現在の基本設定を取得
   */
  getConfig(uri?: string): Configuration;

  /**
   * 高度ルール設定を取得
   */
  getAdvancedConfig(uri?: string): AdvancedRulesConfig;

  getSnapshot?(uri?: string): ConfigurationSnapshot;
  getRevision?(uri: string): object | undefined;

  /**
   * 設定を適用（内部API）
   */
  applySettings(settings: unknown): void;

  /**
   * 設定変更時のコールバックを登録
   */
  onConfigChange(callback: ConfigChangeCallback): void;

  /**
   * LSP設定変更ハンドラ（onDidChangeConfigurationから呼び出し）
   */
  handleLspConfigChange(settings: unknown): void;
}

/**
 * SentenceSplitMode型ガード
 */
function isSentenceSplitMode(v: unknown): v is SentenceSplitMode {
  return v === 'strict' || v === 'normal' || v === 'loose';
}

/**
 * WeakExpressionLevel型ガード
 */
function isWeakExpressionLevel(v: unknown): v is WeakExpressionLevel {
  return v === 'strict' || v === 'normal' || v === 'loose';
}

/**
 * ConfigManagerを作成
 */
export function createConfigManager(
  advancedRulesManager: Pick<AdvancedRulesManager, 'getConfig' | 'updateConfig'>,
  proofreadingRulesManager: Pick<ProofreadingRulesManager, 'getConfig' | 'updateConfig'>,
  hoverProvider: Pick<HoverProvider, 'setWikipediaEnabled' | 'setGlossaryEnabled' | 'setEnabledGlossaries' | 'setEnabledGlossaryGroups'>,
  logger?: Logger
): ConfigManager {
  // 基本設定
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
    maxDocumentChars: 1_000_000,
    maxNumberOfProblems: 2_000,
    maxConcurrentAnalyses: DEFAULT_MAX_CONCURRENT_ANALYSES,
    hover: {
      enableWikipedia: true,
      enableGlossary: true,
      enabledGlossaries: [...DEFAULT_ENABLED_GLOSSARIES],
      enabledGlossaryGroups: GLOSSARY_GROUPS.map(g => g.id),
    },
  };

  // 設定変更コールバック
  const changeCallbacks: ConfigChangeCallback[] = [];
  let glossariesExplicitlySet = false;

  /**
   * 基本設定を適用
   */
  function applyBaseConfigFromSettings(settings: unknown): void {
    const enableGrammarCheck = getSetting(settings, 'enableGrammarCheck');
    const enableSemanticHighlight = getSetting(settings, 'enableSemanticHighlight');
    const excludeTableDelimiters = getSetting(settings, 'excludeTableDelimiters');
    const enableProfileLogs = getSetting(settings, 'enableProfileLogs');
    const debugLog = getSetting(settings, 'debugLog');
    const analyzeCodeBlocks = getSetting(settings, 'markdown.analyzeCodeBlocks');
    const analyzeTables = getSetting(settings, 'markdown.analyzeTables');
    const targetLanguages = getSetting(settings, 'targetLanguages');
    const debounceDelay = getSetting(settings, 'debounceDelay');
    const maxDocumentChars = getSetting(settings, 'maxDocumentChars');
    const maxNumberOfProblems = getSetting(settings, 'maxNumberOfProblems');
    const maxConcurrentAnalyses = getSetting(settings, 'maxConcurrentAnalyses');
    const enableWikipedia = getSetting(settings, 'hover.enableWikipedia');
    const enableGlossary = getSetting(settings, 'hover.enableGlossary');
    const enabledGlossaries = getSetting(settings, 'hover.enabledGlossaries');
    const enabledGlossaryGroups = getSetting(settings, 'hover.enabledGlossaryGroups');
    const hasExplicitGlossaries = Array.isArray(enabledGlossaries);
    glossariesExplicitlySet = hasExplicitGlossaries;

    configuration = {
      ...configuration,
      enableGrammarCheck: typeof enableGrammarCheck === 'boolean' ? enableGrammarCheck : configuration.enableGrammarCheck,
      enableSemanticHighlight: typeof enableSemanticHighlight === 'boolean' ? enableSemanticHighlight : configuration.enableSemanticHighlight,
      excludeTableDelimiters: typeof excludeTableDelimiters === 'boolean' ? excludeTableDelimiters : configuration.excludeTableDelimiters,
      enableProfileLogs: typeof enableProfileLogs === 'boolean' ? enableProfileLogs : configuration.enableProfileLogs,
      debugLog: typeof debugLog === 'boolean' ? debugLog : configuration.debugLog,
      markdown: {
        ...configuration.markdown,
        analyzeCodeBlocks: typeof analyzeCodeBlocks === 'boolean' ? analyzeCodeBlocks : configuration.markdown.analyzeCodeBlocks,
        analyzeTables: typeof analyzeTables === 'boolean' ? analyzeTables : configuration.markdown.analyzeTables,
      },
      targetLanguages: Array.isArray(targetLanguages) ? (targetLanguages as SupportedLanguage[]) : configuration.targetLanguages,
      debounceDelay: typeof debounceDelay === 'number' && Number.isFinite(debounceDelay) ? debounceDelay : configuration.debounceDelay,
      maxDocumentChars: typeof maxDocumentChars === 'number' && Number.isFinite(maxDocumentChars) ? maxDocumentChars : configuration.maxDocumentChars,
      maxNumberOfProblems: typeof maxNumberOfProblems === 'number' && Number.isFinite(maxNumberOfProblems) ? maxNumberOfProblems : configuration.maxNumberOfProblems,
      maxConcurrentAnalyses: typeof maxConcurrentAnalyses === 'number' && Number.isFinite(maxConcurrentAnalyses) ? maxConcurrentAnalyses : configuration.maxConcurrentAnalyses,
      hover: {
        ...configuration.hover,
        enableWikipedia: typeof enableWikipedia === 'boolean' ? enableWikipedia : configuration.hover.enableWikipedia,
        enableGlossary: typeof enableGlossary === 'boolean' ? enableGlossary : configuration.hover.enableGlossary,
        enabledGlossaries: Array.isArray(enabledGlossaries) ? enabledGlossaries as GlossaryId[] : configuration.hover.enabledGlossaries,
        enabledGlossaryGroups: Array.isArray(enabledGlossaryGroups) ? enabledGlossaryGroups as GlossaryGroupId[] : configuration.hover.enabledGlossaryGroups,
      },
    };

    hoverProvider.setWikipediaEnabled(configuration.hover.enableWikipedia);
    hoverProvider.setGlossaryEnabled(configuration.hover.enableGlossary);
    hoverProvider.setEnabledGlossaries(configuration.hover.enabledGlossaries, hasExplicitGlossaries);
    hoverProvider.setEnabledGlossaryGroups(configuration.hover.enabledGlossaryGroups);
  }

  /**
   * 設定キーから AdvancedRulesConfig 用の値を抽出して patch に書き込む
   */
  type AdvancedFieldHandler = (
    incoming: unknown,
    patch: Partial<AdvancedRulesConfig>,
    currentValue: unknown
  ) => void;

  function parseCustomNotationRules(incoming: unknown): Map<string, string> | undefined {
    if (!incoming || typeof incoming !== 'object') {
      return undefined;
    }

    if (Array.isArray(incoming)) {
      const entries: Array<[string, string]> = [];
      for (const item of incoming) {
        if (!item || typeof item !== 'object') {
          continue;
        }
        const asRecord = item as Record<string, unknown>;
        if (typeof asRecord.incorrect === 'string' && typeof asRecord.correct === 'string') {
          entries.push([asRecord.incorrect, asRecord.correct]);
        }
      }
      return new Map(entries);
    }

    const entries: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(incoming as Record<string, unknown>)) {
      if (typeof v === 'string') {
        entries.push([k, v]);
      }
    }
    return new Map(entries);
  }

  const ADVANCED_FIELD_HANDLERS: Partial<Record<keyof AdvancedRulesConfig, AdvancedFieldHandler>> = {
    sentenceComplexityThreshold: (incoming, patch) => {
      if (typeof incoming === 'number' && Number.isFinite(incoming) && incoming >= 0 && incoming <= 100) {
        patch.sentenceComplexityThreshold = incoming;
      }
    },
    customNotationRules: (incoming, patch) => {
      const parsed = parseCustomNotationRules(incoming);
      if (parsed !== undefined) {
        patch.customNotationRules = parsed;
      }
    },
    sentenceSplitMode: (incoming, patch) => {
      if (isSentenceSplitMode(incoming)) {
        patch.sentenceSplitMode = incoming;
      }
    },
    weakExpressionLevel: (incoming, patch) => {
      if (isWeakExpressionLevel(incoming)) {
        patch.weakExpressionLevel = incoming;
      }
    },
    excludedLanguageIds: (incoming, patch) => {
      if (Array.isArray(incoming) && incoming.every((x) => typeof x === 'string')) {
        patch.excludedLanguageIds = incoming as string[];
      }
    },
  };

  function applyPrimitivePatch(
    key: keyof AdvancedRulesConfig,
    incoming: unknown,
    currentValue: unknown,
    patch: Partial<AdvancedRulesConfig>
  ): void {
    if (typeof currentValue === 'boolean' && typeof incoming === 'boolean') {
      patch[key] = incoming as never;
      return;
    }
    if (typeof currentValue === 'number' && typeof incoming === 'number' && Number.isFinite(incoming)) {
      patch[key] = incoming as never;
    }
  }

  /**
   * 高度ルール設定を適用
   */
  function applyAdvancedConfigFromSettings(settings: unknown): void {
    const current = advancedRulesManager.getConfig();
    const patch: Partial<AdvancedRulesConfig> = {};

    for (const [key, currentValue] of Object.entries(current)) {
      const incoming = getSetting(settings, `advanced.${key}`);
      const handler = ADVANCED_FIELD_HANDLERS[key as keyof AdvancedRulesConfig];
      if (handler) {
        handler(incoming, patch, currentValue);
      } else {
        applyPrimitivePatch(key as keyof AdvancedRulesConfig, incoming, currentValue, patch);
      }
    }

    // 互換: advanced.sentenceSplitMode ではなく sentenceSplitMode が来るケース
    const legacySentenceSplitMode = getSetting(settings, 'sentenceSplitMode');
    if (patch.sentenceSplitMode === undefined && isSentenceSplitMode(legacySentenceSplitMode)) {
      patch.sentenceSplitMode = legacySentenceSplitMode;
    }

    applyTieredExecutionConfigFromSettings(settings, patch);
    applyParallelExecutionConfigFromSettings(settings, patch);
    applyOfficialConfigFromSettings(settings, patch);

    if (isNotEmptyObject(patch)) {
      advancedRulesManager.updateConfig(patch);
    }
  }

  /**
   * 段階実行設定を適用
   */
  function applyTieredExecutionConfigFromSettings(settings: unknown, patch: Partial<AdvancedRulesConfig>): void {
    const enabled = getSetting(settings, 'advanced.tieredExecution.enabled');
    const idleDelayMs = getSetting(settings, 'advanced.tieredExecution.idleDelayMs');

    const currentConfig = advancedRulesManager.getConfig();
    const newTieredExecution = { ...currentConfig.tieredExecution };

    if (typeof enabled === 'boolean') {
      newTieredExecution.enabled = enabled;
    }
    if (typeof idleDelayMs === 'number' && Number.isFinite(idleDelayMs) && idleDelayMs >= 500) {
      newTieredExecution.idleDelayMs = idleDelayMs;
    }

    if (newTieredExecution.enabled !== currentConfig.tieredExecution.enabled ||
        newTieredExecution.idleDelayMs !== currentConfig.tieredExecution.idleDelayMs) {
      patch.tieredExecution = newTieredExecution;
    }
  }

  /**
   * 並列実行設定を適用
   * Feature: parallel-advanced-rules
   *
   * - `enabled`: フラグ on/off
   * - `maxWorkers`: 0 は「自動」(cpus-1) として扱うため undefined に正規化する
   */
  function applyParallelExecutionConfigFromSettings(settings: unknown, patch: Partial<AdvancedRulesConfig>): void {
    const enabled = getSetting(settings, 'advanced.parallelExecution.enabled');
    const maxWorkers = getSetting(settings, 'advanced.parallelExecution.maxWorkers');

    const currentConfig = advancedRulesManager.getConfig();
    const newParallel = { ...(currentConfig.parallelExecution ?? { enabled: false }) };
    let changed = false;

    if (typeof enabled === 'boolean' && enabled !== newParallel.enabled) {
      newParallel.enabled = enabled;
      changed = true;
    }
    if (typeof maxWorkers === 'number' && Number.isFinite(maxWorkers)) {
      // 0 は「自動」と読み替えるため undefined を入れる
      const normalized = maxWorkers > 0 ? Math.floor(maxWorkers) : undefined;
      if (normalized !== newParallel.maxWorkers) {
        newParallel.maxWorkers = normalized;
        changed = true;
      }
    }

    if (changed) {
      patch.parallelExecution = newParallel;
    }
  }

  /**
   * 公文書ルール設定を適用
   */
  function applyOfficialConfigFromSettings(settings: unknown, patch: Partial<AdvancedRulesConfig>): void {
    const enableOyobiNarabini = getSetting(settings, 'official.enableOyobiNarabini');
    if (typeof enableOyobiNarabini === 'boolean') {
      patch.enableOyobiNarabini = enableOyobiNarabini;
    }

    const enableMatawaWakushikuwa = getSetting(settings, 'official.enableMatawaWakushikuwa');
    if (typeof enableMatawaWakushikuwa === 'boolean') {
      patch.enableMatawaWakushikuwa = enableMatawaWakushikuwa;
    }

    const enableJouyouKanji = getSetting(settings, 'official.enableJouyouKanji');
    if (typeof enableJouyouKanji === 'boolean') {
      patch.enableJouyouKanji = enableJouyouKanji;
    }

    const excludeProperNounsFromJouyouKanji = getSetting(settings, 'official.excludeProperNounsFromJouyouKanji');
    if (typeof excludeProperNounsFromJouyouKanji === 'boolean') {
      patch.excludeProperNounsFromJouyouKanji = excludeProperNounsFromJouyouKanji;
    }

    const enableBulletPunctuation = getSetting(settings, 'official.enableBulletPunctuation');
    if (typeof enableBulletPunctuation === 'boolean') {
      patch.enableBulletPunctuation = enableBulletPunctuation;
    }
  }

  /**
   * 校正設定を適用
   */
  function applyProofreadingConfigFromSettings(settings: unknown): void {
    const proofreadingSetting = getSetting(settings, 'proofreading');
    if (!proofreadingSetting || typeof proofreadingSetting !== 'object') {
      return;
    }

    const proofreadingConfig = parseProofreadingSettingsFromRaw(proofreadingSetting as Record<string, unknown>);
    proofreadingRulesManager.updateConfig(proofreadingConfig);

    const currentAdvancedConfig = advancedRulesManager.getConfig();
    const mergedConfig = applyProofreadingSettings(proofreadingConfig, currentAdvancedConfig);
    advancedRulesManager.updateConfig(mergedConfig);

    logger?.debug(`Proofreading config applied: preset=${proofreadingConfig.preset}, mergeMode=${proofreadingConfig.mergeMode}`);
  }

  /**
   * コールバックを発火
   */
  function notifyConfigChange(): void {
    for (const callback of changeCallbacks) {
      callback(configuration);
    }
  }

  return {
    getConfig(): Configuration {
      return { ...configuration };
    },

    getAdvancedConfig(): AdvancedRulesConfig {
      return advancedRulesManager.getConfig();
    },

    getSnapshot(): ConfigurationSnapshot {
      return {
        config: { ...configuration },
        advancedConfig: advancedRulesManager.getConfig(),
        proofreadingConfig: proofreadingRulesManager.getConfig(),
        glossariesExplicitlySet,
      };
    },

    applySettings(settings: unknown): void {
      applyBaseConfigFromSettings(settings);
      applyAdvancedConfigFromSettings(settings);
      applyProofreadingConfigFromSettings(settings);
    },

    onConfigChange(callback: ConfigChangeCallback): void {
      changeCallbacks.push(callback);
    },

    handleLspConfigChange(settings: unknown): void {
      applyBaseConfigFromSettings(settings);
      applyAdvancedConfigFromSettings(settings);
      applyProofreadingConfigFromSettings(settings);
      notifyConfigChange();
    },
  };
}

/** 設定の解釈だけを再利用し、共有ルールやホバーの状態は変更しない。 */
export function resolveConfiguration(settings: unknown): ConfigurationSnapshot {
  let advanced = structuredClone(DEFAULT_ADVANCED_RULES_CONFIG);
  let proofreading = structuredClone(DEFAULT_PROOFREADING_CONFIG);
  const manager = createConfigManager(
    { getConfig: () => advanced, updateConfig: patch => { advanced = { ...advanced, ...patch }; } },
    { getConfig: () => proofreading, updateConfig: config => { proofreading = config; } },
    { setWikipediaEnabled() {}, setGlossaryEnabled() {}, setEnabledGlossaries() {}, setEnabledGlossaryGroups() {} }
  );
  manager.applySettings(settings);
  return manager.getSnapshot!();
}

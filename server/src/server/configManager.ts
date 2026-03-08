/**
 * ConfigManager Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.2, 4.1, 4.2
 *
 * 設定の読み込み・適用・変更通知を管理
 */

import { Configuration, SupportedLanguage } from '../../../shared/src/types';
import {
  AdvancedRulesConfig,
  SentenceSplitMode,
  WeakExpressionLevel,
} from '../../../shared/src/advancedTypes';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import {
  parseProofreadingSettingsFromRaw,
  applyProofreadingSettings,
} from '../proofreading/proofreadingConfig';
import { HoverProvider } from '../hover/provider';
import { DEFAULT_ENABLED_GLOSSARIES } from '../hover/glossary';
import { Logger } from '../utils/logger';

/**
 * 設定変更コールバック型
 */
export type ConfigChangeCallback = (config: Configuration) => void;

/**
 * ConfigManagerインターフェース
 */
export interface ConfigManager {
  /**
   * 現在の基本設定を取得
   */
  getConfig(): Configuration;

  /**
   * 高度ルール設定を取得
   */
  getAdvancedConfig(): AdvancedRulesConfig;

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
 * 設定値を取得するユーティリティ
 */
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
  advancedRulesManager: AdvancedRulesManager,
  proofreadingRulesManager: ProofreadingRulesManager,
  hoverProvider: HoverProvider,
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
    hover: {
      enableWikipedia: true,
      enableGlossary: true,
      enabledGlossaries: [...DEFAULT_ENABLED_GLOSSARIES],
    },
  };

  // 設定変更コールバック
  const changeCallbacks: ConfigChangeCallback[] = [];

  /**
   * 基本設定を適用
   */
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
        enabledGlossaries: Array.isArray(enabledGlossaries) ? enabledGlossaries as string[] : configuration.hover.enabledGlossaries,
      },
    };

    hoverProvider.setWikipediaEnabled(configuration.hover.enableWikipedia);
    hoverProvider.setGlossaryEnabled(configuration.hover.enableGlossary);
    hoverProvider.setEnabledGlossaries(configuration.hover.enabledGlossaries);
  }

  /**
   * 高度ルール設定を適用
   */
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
        patch[key as keyof AdvancedRulesConfig] = incoming as never;
        continue;
      }
      if (typeof currentValue === 'number' && typeof incoming === 'number' && Number.isFinite(incoming)) {
        patch[key as keyof AdvancedRulesConfig] = incoming as never;
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

    // 段階実行設定
    applyTieredExecutionConfigFromSettings(settings, patch);

    // 公文書ルール設定
    applyOfficialConfigFromSettings(settings, patch);

    if (Object.keys(patch).length > 0) {
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

    if (logger) {
      logger.debug(`Proofreading config applied: preset=${proofreadingConfig.preset}, mergeMode=${proofreadingConfig.mergeMode}`);
    }
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

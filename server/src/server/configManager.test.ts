/**
 * ConfigManager Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createConfigManager, ConfigManager } from './configManager';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { HoverProvider } from '../hover/provider';
import { WikipediaClient } from '../wikipedia/client';
import { Configuration } from '../../../shared/src/types';

describe('configManager', () => {
  let advancedRulesManager: AdvancedRulesManager;
  let proofreadingRulesManager: ProofreadingRulesManager;
  let hoverProvider: HoverProvider;
  let configManager: ConfigManager;
  const logs: string[] = [];
  const logger = (msg: string) => logs.push(msg);

  beforeEach(() => {
    logs.length = 0;
    advancedRulesManager = new AdvancedRulesManager();
    proofreadingRulesManager = new ProofreadingRulesManager();
    const wikipediaClient = new WikipediaClient();
    hoverProvider = new HoverProvider(wikipediaClient);
    configManager = createConfigManager(
      advancedRulesManager,
      proofreadingRulesManager,
      hoverProvider,
      logger
    );
  });

  describe('createConfigManager', () => {
    it('should create a config manager instance', () => {
      expect(configManager).toBeDefined();
      expect(typeof configManager.getConfig).toBe('function');
      expect(typeof configManager.getAdvancedConfig).toBe('function');
      expect(typeof configManager.applySettings).toBe('function');
      expect(typeof configManager.onConfigChange).toBe('function');
      expect(typeof configManager.handleLspConfigChange).toBe('function');
    });

    it('should return default config initially', () => {
      const config = configManager.getConfig();
      expect(config.enableGrammarCheck).toBe(true);
      expect(config.enableSemanticHighlight).toBe(true);
      expect(config.debounceDelay).toBe(250);
    });
  });

  describe('ConfigManager.getConfig', () => {
    it('should return current configuration', () => {
      const config = configManager.getConfig();
      expect(config).toBeDefined();
      expect(typeof config.enableGrammarCheck).toBe('boolean');
      expect(typeof config.enableSemanticHighlight).toBe('boolean');
      expect(Array.isArray(config.targetLanguages)).toBe(true);
    });
  });

  describe('ConfigManager.getAdvancedConfig', () => {
    it('should return advanced rules configuration', () => {
      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig).toBeDefined();
      expect(typeof advancedConfig.enableStyleConsistency).toBe('boolean');
    });
  });

  describe('ConfigManager.applySettings', () => {
    it('should apply basic settings', () => {
      configManager.applySettings({
        enableGrammarCheck: false,
        debounceDelay: 500,
      });

      const config = configManager.getConfig();
      expect(config.enableGrammarCheck).toBe(false);
      expect(config.debounceDelay).toBe(500);
    });

    it('should apply advanced settings', () => {
      configManager.applySettings({
        advanced: {
          enableStyleConsistency: false,
          sentenceSplitMode: 'strict',
        },
      });

      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig.enableStyleConsistency).toBe(false);
      expect(advancedConfig.sentenceSplitMode).toBe('strict');
    });

    it('should apply tiered execution settings', () => {
      configManager.applySettings({
        advanced: {
          tieredExecution: {
            enabled: true,
            idleDelayMs: 2000,
          },
        },
      });

      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig.tieredExecution.enabled).toBe(true);
      expect(advancedConfig.tieredExecution.idleDelayMs).toBe(2000);
    });

    it('should ignore invalid tiered execution idleDelayMs below 500', () => {
      const initialConfig = configManager.getAdvancedConfig();
      const initialIdleDelay = initialConfig.tieredExecution.idleDelayMs;

      configManager.applySettings({
        advanced: {
          tieredExecution: {
            idleDelayMs: 100, // Below 500, should be ignored
          },
        },
      });

      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig.tieredExecution.idleDelayMs).toBe(initialIdleDelay);
    });

    it('should apply official document settings', () => {
      configManager.applySettings({
        official: {
          enableOyobiNarabini: true,
          enableJouyouKanji: true,
        },
      });

      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig.enableOyobiNarabini).toBe(true);
      expect(advancedConfig.enableJouyouKanji).toBe(true);
    });
  });

  describe('ConfigManager.onConfigChange', () => {
    it('should call callback when config changes', () => {
      const changes: Configuration[] = [];
      configManager.onConfigChange((config) => {
        changes.push(config);
      });

      configManager.handleLspConfigChange({
        enableGrammarCheck: false,
      });

      expect(changes).toHaveLength(1);
      expect(changes[0].enableGrammarCheck).toBe(false);
    });

    it('should support multiple subscribers', () => {
      let count1 = 0;
      let count2 = 0;

      configManager.onConfigChange(() => count1++);
      configManager.onConfigChange(() => count2++);

      configManager.handleLspConfigChange({ enableGrammarCheck: false });

      expect(count1).toBe(1);
      expect(count2).toBe(1);
    });
  });

  describe('ConfigManager.handleLspConfigChange', () => {
    it('should handle complete LSP configuration change', () => {
      configManager.handleLspConfigChange({
        enableGrammarCheck: false,
        enableSemanticHighlight: false,
        debounceDelay: 300,
        advanced: {
          enableStyleConsistency: false,
        },
      });

      const config = configManager.getConfig();
      expect(config.enableGrammarCheck).toBe(false);
      expect(config.enableSemanticHighlight).toBe(false);
      expect(config.debounceDelay).toBe(300);

      const advancedConfig = configManager.getAdvancedConfig();
      expect(advancedConfig.enableStyleConsistency).toBe(false);
    });

    it('should handle hover settings', () => {
      configManager.handleLspConfigChange({
        hover: {
          enableWikipedia: false,
          enableGlossary: false,
        },
      });

      const config = configManager.getConfig();
      expect(config.hover.enableWikipedia).toBe(false);
      expect(config.hover.enableGlossary).toBe(false);
    });
  });

  describe('getSetting utility', () => {
    it('should handle nested settings with dot notation', () => {
      configManager.handleLspConfigChange({
        markdown: {
          analyzeCodeBlocks: true,
          analyzeTables: false,
        },
      });

      const config = configManager.getConfig();
      expect(config.markdown.analyzeCodeBlocks).toBe(true);
      expect(config.markdown.analyzeTables).toBe(false);
    });
  });
});

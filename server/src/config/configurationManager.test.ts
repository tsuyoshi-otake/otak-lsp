/**
 * Configuration Manager Unit Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { ConfigurationManager, ConfigurationChangeEvent } from './configurationManager';

describe('Configuration Manager', () => {
  let manager: ConfigurationManager;

  beforeEach(() => {
    manager = new ConfigurationManager();
  });

  describe('getConfiguration', () => {
    it('should return default configuration', () => {
      const config = manager.getConfiguration();

      expect(config.enableGrammarCheck).toBe(true);
      expect(config.enableSemanticHighlight).toBe(true);
      expect(config.excludeTableDelimiters).toBe(true);
      expect(config.targetLanguages).toContain('markdown');
      expect(config.debounceDelay).toBe(500);
    });

    it('should return a copy of configuration', () => {
      const config1 = manager.getConfiguration();
      const config2 = manager.getConfiguration();

      expect(config1).not.toBe(config2);
      expect(config1).toEqual(config2);
    });
  });

  describe('updateConfiguration', () => {
    // MeCab関連のテストは削除（kuromoji.jsに移行したため）

    it('should update enableGrammarCheck', () => {
      manager.updateConfiguration({ enableGrammarCheck: false });

      const config = manager.getConfiguration();
      expect(config.enableGrammarCheck).toBe(false);
    });

    it('should update enableSemanticHighlight', () => {
      manager.updateConfiguration({ enableSemanticHighlight: false });

      const config = manager.getConfiguration();
      expect(config.enableSemanticHighlight).toBe(false);
    });

    it('should update excludeTableDelimiters', () => {
      manager.updateConfiguration({ excludeTableDelimiters: false });

      const config = manager.getConfiguration();
      expect(config.excludeTableDelimiters).toBe(false);
    });

    it('should update targetLanguages', () => {
      manager.updateConfiguration({ targetLanguages: ['markdown', 'python'] });

      const config = manager.getConfiguration();
      expect(config.targetLanguages).toEqual(['markdown', 'python']);
    });

    it('should update debounceDelay', () => {
      manager.updateConfiguration({ debounceDelay: 1000 });

      const config = manager.getConfiguration();
      expect(config.debounceDelay).toBe(1000);
    });

    it('should update multiple settings at once', () => {
      manager.updateConfiguration({
        enableGrammarCheck: false,
        debounceDelay: 750
      });

      const config = manager.getConfiguration();
      expect(config.enableGrammarCheck).toBe(false);
      expect(config.debounceDelay).toBe(750);
      // 未変更の設定は保持される
      expect(config.enableSemanticHighlight).toBe(true);
    });
  });

  describe('onDidChangeConfiguration', () => {
    it('should notify listener when configuration changes', () => {
      const listener = jest.fn();
      manager.onDidChangeConfiguration(listener);

      manager.updateConfiguration({ enableGrammarCheck: false });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should pass changed configuration to listener', () => {
      const listener = jest.fn();
      manager.onDidChangeConfiguration(listener);

      manager.updateConfiguration({ enableGrammarCheck: false });

      const event: ConfigurationChangeEvent = listener.mock.calls[0][0];
      expect(event.configuration.enableGrammarCheck).toBe(false);
    });

    it('should pass affected keys to listener', () => {
      const listener = jest.fn();
      manager.onDidChangeConfiguration(listener);

      manager.updateConfiguration({ enableGrammarCheck: false, debounceDelay: 100 });

      const event: ConfigurationChangeEvent = listener.mock.calls[0][0];
      expect(event.affectedKeys).toContain('enableGrammarCheck');
      expect(event.affectedKeys).toContain('debounceDelay');
    });

    it('should support multiple listeners', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      manager.onDidChangeConfiguration(listener1);
      manager.onDidChangeConfiguration(listener2);

      manager.updateConfiguration({ enableGrammarCheck: false });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it('should return disposable to unsubscribe', () => {
      const listener = jest.fn();
      const disposable = manager.onDidChangeConfiguration(listener);

      manager.updateConfiguration({ enableGrammarCheck: false });
      expect(listener).toHaveBeenCalledTimes(1);

      disposable.dispose();

      manager.updateConfiguration({ debounceDelay: 1000 });
      expect(listener).toHaveBeenCalledTimes(1); // 増えていない
    });
  });

  describe('getValue', () => {
    it('should get specific configuration value', () => {
      expect(manager.getValue('enableGrammarCheck')).toBe(true);
      expect(manager.getValue('debounceDelay')).toBe(500);
    });

    it('should reflect updated values', () => {
      manager.updateConfiguration({ debounceDelay: 1000 });

      expect(manager.getValue('debounceDelay')).toBe(1000);
    });
  });

  describe('reset', () => {
    it('should reset to default configuration', () => {
      manager.updateConfiguration({
        enableGrammarCheck: false,
        debounceDelay: 1000
      });

      manager.reset();

      const config = manager.getConfiguration();
      expect(config.enableGrammarCheck).toBe(true);
      expect(config.debounceDelay).toBe(500);
    });

    it('should notify listeners on reset', () => {
      const listener = jest.fn();
      manager.onDidChangeConfiguration(listener);

      manager.updateConfiguration({ enableGrammarCheck: false });
      listener.mockClear();

      manager.reset();

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('isLanguageEnabled', () => {
    it('should return true for enabled languages', () => {
      expect(manager.isLanguageEnabled('markdown')).toBe(true);
      expect(manager.isLanguageEnabled('typescript')).toBe(true);
    });

    it('should return false for disabled languages', () => {
      manager.updateConfiguration({ targetLanguages: ['markdown'] });

      expect(manager.isLanguageEnabled('typescript')).toBe(false);
    });

    it('should return false for unsupported language', () => {
      expect(manager.isLanguageEnabled('unknown' as any)).toBe(false);
    });
  });
});

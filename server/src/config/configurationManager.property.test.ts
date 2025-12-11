/**
 * Configuration Manager Property-Based Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 6.5
 */

import * as fc from 'fast-check';
import { ConfigurationManager } from './configurationManager';
import { SupportedLanguage } from '../../../shared/src/types';

describe('Property-Based Tests: Configuration Manager', () => {
  /**
   * Feature: japanese-grammar-analyzer, Property 12: 設定変更の反映
   * 任意の設定項目に対して、値が変更されたとき、
   * システムは新しい設定値に基づいて動作を更新する
   */
  describe('Property 12: 設定変更の反映', () => {
    // MeCab関連のテストは削除（kuromoji.jsに移行したため）

    it('should always reflect enableGrammarCheck changes', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const manager = new ConfigurationManager();
            manager.updateConfiguration({ enableGrammarCheck: enabled });

            expect(manager.getValue('enableGrammarCheck')).toBe(enabled);
            expect(manager.getConfiguration().enableGrammarCheck).toBe(enabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reflect enableSemanticHighlight changes', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const manager = new ConfigurationManager();
            manager.updateConfiguration({ enableSemanticHighlight: enabled });

            expect(manager.getValue('enableSemanticHighlight')).toBe(enabled);
            expect(manager.getConfiguration().enableSemanticHighlight).toBe(enabled);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reflect debounceDelay changes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5000 }),
          (delay) => {
            const manager = new ConfigurationManager();
            manager.updateConfiguration({ debounceDelay: delay });

            expect(manager.getValue('debounceDelay')).toBe(delay);
            expect(manager.getConfiguration().debounceDelay).toBe(delay);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always reflect targetLanguages changes', () => {
      const supportedLanguages: SupportedLanguage[] = [
        'c', 'cpp', 'java', 'python', 'javascript', 'typescript', 'rust', 'markdown'
      ];

      fc.assert(
        fc.property(
          fc.shuffledSubarray(supportedLanguages, { minLength: 1, maxLength: 8 }),
          (languages) => {
            const manager = new ConfigurationManager();
            manager.updateConfiguration({ targetLanguages: languages });

            const config = manager.getConfiguration();
            expect(config.targetLanguages).toEqual(languages);

            // 各言語が正しく有効化されていることを確認
            for (const lang of languages) {
              expect(manager.isLanguageEnabled(lang)).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should notify listeners for any configuration change', () => {
      fc.assert(
        fc.property(
          fc.record({
            enableGrammarCheck: fc.option(fc.boolean()),
            enableSemanticHighlight: fc.option(fc.boolean()),
            debounceDelay: fc.option(fc.integer({ min: 100, max: 2000 }))
          }),
          (changes) => {
            const manager = new ConfigurationManager();
            const listener = jest.fn();
            manager.onDidChangeConfiguration(listener);

            // 少なくとも1つの変更を含むオブジェクトを作成
            const updateObj: Record<string, any> = {};
            let hasChanges = false;

            // MeCab関連の設定は削除（kuromoji.jsに移行したため）
            if (changes.enableGrammarCheck !== null) {
              updateObj.enableGrammarCheck = changes.enableGrammarCheck;
              hasChanges = true;
            }
            if (changes.enableSemanticHighlight !== null) {
              updateObj.enableSemanticHighlight = changes.enableSemanticHighlight;
              hasChanges = true;
            }
            if (changes.debounceDelay !== null) {
              updateObj.debounceDelay = changes.debounceDelay;
              hasChanges = true;
            }

            if (hasChanges) {
              manager.updateConfiguration(updateObj);
              expect(listener).toHaveBeenCalled();
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain other settings when one is changed', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.integer({ min: 100, max: 2000 }),
          (newGrammarCheck, newDelay) => {
            const manager = new ConfigurationManager();

            // 初期設定を保存
            const initialConfig = manager.getConfiguration();

            // debounceDelayのみを変更
            manager.updateConfiguration({ debounceDelay: newDelay });

            // 他の設定は変わっていないことを確認
            expect(manager.getValue('enableGrammarCheck')).toBe(initialConfig.enableGrammarCheck);
            expect(manager.getValue('enableSemanticHighlight')).toBe(initialConfig.enableSemanticHighlight);

            // enableGrammarCheckを変更
            manager.updateConfiguration({ enableGrammarCheck: newGrammarCheck });

            // debounceDelayは保持されている
            expect(manager.getValue('debounceDelay')).toBe(newDelay);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide accurate affected keys in change events', () => {
      fc.assert(
        fc.property(
          fc.subarray(['enableGrammarCheck', 'enableSemanticHighlight', 'debounceDelay'] as const, { minLength: 1 }),
          (keysToChange) => {
            const manager = new ConfigurationManager();
            const listener = jest.fn();
            manager.onDidChangeConfiguration(listener);

            const updateObj: Record<string, any> = {};
            for (const key of keysToChange) {
              switch (key) {
                case 'enableGrammarCheck':
                case 'enableSemanticHighlight':
                  updateObj[key] = false;
                  break;
                case 'debounceDelay':
                  updateObj[key] = 1000;
                  break;
              }
            }

            manager.updateConfiguration(updateObj);

            const event = listener.mock.calls[0][0];
            for (const key of keysToChange) {
              expect(event.affectedKeys).toContain(key);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

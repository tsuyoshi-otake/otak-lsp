/**
 * Additional Rules Configのプロパティベーステスト
 * Feature: additional-grammar-rules
 * プロパティ 6: 設定変更の即時反映
 * 検証: 要件 6.5
 */

import * as fc from 'fast-check';
import { Token } from '../../../../shared/src/types';
import { AdvancedRulesManager } from '../advancedRulesManager';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: AdditionalRulesConfig', () => {

  const createToken = (surface: string, pos: string, start: number): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  /**
   * Feature: additional-grammar-rules, Property 6: 設定変更の即時反映
   * 任意の追加ルール設定項目に対して、値が変更されたとき、
   * システムは新しい設定値に基づいて即座に動作を更新する
   *
   * 検証: 要件 6.5
   */
  describe('Property 6: 設定変更の即時反映', () => {
    it('should disable redundant expression rule when config is changed', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const manager = new AdvancedRulesManager({
              enableRedundantExpression: enabled
            });

            const text = '馬から落馬した';
            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = manager.checkText(text, tokens);

            const hasRedundantDiagnostic = diagnostics.some(d => d.code === 'redundant-expression');

            if (enabled) {
              expect(hasRedundantDiagnostic).toBe(true);
            } else {
              expect(hasRedundantDiagnostic).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should disable tautology rule when config is changed', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const manager = new AdvancedRulesManager({
              enableTautology: enabled
            });

            const text = '頭痛が痛い';
            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = manager.checkText(text, tokens);

            const hasTautologyDiagnostic = diagnostics.some(d => d.code === 'tautology');

            if (enabled) {
              expect(hasTautologyDiagnostic).toBe(true);
            } else {
              expect(hasTautologyDiagnostic).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should update config immediately when updateConfig is called', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          (threshold) => {
            const manager = new AdvancedRulesManager();
            manager.updateConfig({ noParticleChainThreshold: threshold });

            const config = manager.getConfig();
            expect(config.noParticleChainThreshold).toBe(threshold);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should apply new threshold values immediately', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }),
          (threshold) => {
            const manager = new AdvancedRulesManager({
              longSentenceThreshold: threshold
            });

            const config = manager.getConfig();
            expect(config.longSentenceThreshold).toBe(threshold);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

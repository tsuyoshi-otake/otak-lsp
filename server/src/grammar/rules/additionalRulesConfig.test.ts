/**
 * Additional Rules Configのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 6.1, 6.2, 6.3, 6.4
 */

import { Token } from '../../../../shared/src/types';
import { AdvancedRulesManager } from '../advancedRulesManager';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('AdditionalRulesConfig', () => {

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

  describe('default config values', () => {
    it('should have default enableRedundantExpression as true', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableRedundantExpression).toBe(true);
    });

    it('should have default enableTautology as true', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableTautology).toBe(true);
    });

    it('should have default enableNoParticleChain as true', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableNoParticleChain).toBe(true);
    });

    it('should have default enableMonotonousEnding as true', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableMonotonousEnding).toBe(true);
    });

    it('should have default enableLongSentence as true', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableLongSentence).toBe(true);
    });

    it('should have default noParticleChainThreshold as 3 (要件 6.2)', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.noParticleChainThreshold).toBe(3);
    });

    it('should have default monotonousEndingThreshold as 3 (要件 6.3)', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.monotonousEndingThreshold).toBe(3);
    });

    it('should have default longSentenceThreshold as 120 (要件 6.4)', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.longSentenceThreshold).toBe(120);
    });
  });

  describe('rule enable/disable (要件 6.1)', () => {
    it('should disable redundant expression rule when config is false', () => {
      const manager = new AdvancedRulesManager({
        enableRedundantExpression: false
      });

      const text = '馬から落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = manager.checkText(text, tokens);

      const hasRedundantDiagnostic = diagnostics.some(d => d.code === 'redundant-expression');
      expect(hasRedundantDiagnostic).toBe(false);
    });

    it('should enable redundant expression rule when config is true', () => {
      const manager = new AdvancedRulesManager({
        enableRedundantExpression: true
      });

      const text = '馬から落馬した';
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = manager.checkText(text, tokens);

      const hasRedundantDiagnostic = diagnostics.some(d => d.code === 'redundant-expression');
      expect(hasRedundantDiagnostic).toBe(true);
    });

    it('should disable tautology rule when config is false', () => {
      const manager = new AdvancedRulesManager({
        enableTautology: false
      });

      const text = '頭痛が痛い';
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = manager.checkText(text, tokens);

      const hasTautologyDiagnostic = diagnostics.some(d => d.code === 'tautology');
      expect(hasTautologyDiagnostic).toBe(false);
    });

    it('should disable no particle chain rule when config is false', () => {
      const manager = new AdvancedRulesManager({
        enableNoParticleChain: false
      });

      const text = '東京の会社の部長の息子';
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = manager.checkText(text, tokens);

      const hasNoChainDiagnostic = diagnostics.some(d => d.code === 'no-particle-chain');
      expect(hasNoChainDiagnostic).toBe(false);
    });
  });

  describe('threshold settings', () => {
    it('should respect custom noParticleChainThreshold (要件 6.2)', () => {
      const manager = new AdvancedRulesManager({
        noParticleChainThreshold: 5
      });

      const config = manager.getConfig();
      expect(config.noParticleChainThreshold).toBe(5);
    });

    it('should respect custom monotonousEndingThreshold (要件 6.3)', () => {
      const manager = new AdvancedRulesManager({
        monotonousEndingThreshold: 5
      });

      const config = manager.getConfig();
      expect(config.monotonousEndingThreshold).toBe(5);
    });

    it('should respect custom longSentenceThreshold (要件 6.4)', () => {
      const manager = new AdvancedRulesManager({
        longSentenceThreshold: 150
      });

      const config = manager.getConfig();
      expect(config.longSentenceThreshold).toBe(150);
    });
  });

  describe('config update', () => {
    it('should update config using updateConfig method', () => {
      const manager = new AdvancedRulesManager();

      manager.updateConfig({
        enableRedundantExpression: false,
        longSentenceThreshold: 200
      });

      const config = manager.getConfig();
      expect(config.enableRedundantExpression).toBe(false);
      expect(config.longSentenceThreshold).toBe(200);
    });

    it('should preserve other config values when updating', () => {
      const manager = new AdvancedRulesManager();

      manager.updateConfig({
        enableRedundantExpression: false
      });

      const config = manager.getConfig();
      expect(config.enableTautology).toBe(true); // Should preserve default
      expect(config.noParticleChainThreshold).toBe(3); // Should preserve default
    });
  });
});

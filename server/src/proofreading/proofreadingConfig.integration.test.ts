/**
 * ProofreadingConfig Integration Tests
 * Feature: proofreading-settings-compat
 * タスク3: 設定読込の統合
 *
 * VS Code設定からの読込と即時反映を検証
 */

import {
  ProofreadingSettingsConfig,
  DEFAULT_PROOFREADING_CONFIG,
  ProofreadingConfigMapper,
  applyProofreadingSettings,
  parseProofreadingSettingsFromRaw
} from './proofreadingConfig';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

describe('parseProofreadingSettingsFromRaw', () => {
  it('VS Code設定形式からProofreadingSettingsConfigを生成する', () => {
    const rawSettings = {
      preset: 'video-default',
      mergeMode: 'merge',
      'typo.enable': true,
      'typo.raNuki': false,
      'length.sentence': 150,
      'bracket.maxDepth': 5
    };

    const config = parseProofreadingSettingsFromRaw(rawSettings);
    expect(config.preset).toBe('video-default');
    expect(config.mergeMode).toBe('merge');
    expect(config.categories.typo.enable).toBe(true);
    expect(config.categories.typo.raNuki).toBe(false);
    expect(config.categories.length.sentence).toBe(150);
    expect(config.categories.bracket.maxDepth).toBe(5);
  });

  it('未指定の設定はデフォルト値を使用する', () => {
    const rawSettings = {};

    const config = parseProofreadingSettingsFromRaw(rawSettings);
    expect(config.preset).toBe(DEFAULT_PROOFREADING_CONFIG.preset);
    expect(config.categories.typo.enable).toBe(DEFAULT_PROOFREADING_CONFIG.categories.typo.enable);
  });

  it('quoteLine.markersを文字列から配列に変換する', () => {
    const rawSettings = {
      'quoteLine.markers': '>,|,#'
    };

    const config = parseProofreadingSettingsFromRaw(rawSettings);
    expect(config.categories.quoteLine.markers).toEqual(['>', '|', '#']);
  });

  it('無効な値はデフォルト値にフォールバックする', () => {
    const rawSettings = {
      'length.sentence': 'invalid',
      'bracket.maxDepth': -5
    };

    const config = parseProofreadingSettingsFromRaw(rawSettings);
    expect(config.categories.length.sentence).toBe(DEFAULT_PROOFREADING_CONFIG.categories.length.sentence);
    expect(config.categories.bracket.maxDepth).toBe(DEFAULT_PROOFREADING_CONFIG.categories.bracket.maxDepth);
  });
});

describe('applyProofreadingSettings', () => {
  it('既存のAdvancedRulesConfigにパッチを適用する', () => {
    const proofreadingConfig: ProofreadingSettingsConfig = {
      ...DEFAULT_PROOFREADING_CONFIG,
      categories: {
        ...DEFAULT_PROOFREADING_CONFIG.categories,
        typo: {
          ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
          raNuki: false
        }
      }
    };

    const baseConfig = { ...DEFAULT_ADVANCED_RULES_CONFIG };
    const result = applyProofreadingSettings(proofreadingConfig, baseConfig);

    expect(result.enableRaNukiDetection).toBe(false);
  });

  it('設定変更は即時反映される', () => {
    const config1: ProofreadingSettingsConfig = {
      ...DEFAULT_PROOFREADING_CONFIG,
      categories: {
        ...DEFAULT_PROOFREADING_CONFIG.categories,
        length: {
          ...DEFAULT_PROOFREADING_CONFIG.categories.length,
          sentence: 100
        }
      }
    };

    const config2: ProofreadingSettingsConfig = {
      ...DEFAULT_PROOFREADING_CONFIG,
      categories: {
        ...DEFAULT_PROOFREADING_CONFIG.categories,
        length: {
          ...DEFAULT_PROOFREADING_CONFIG.categories.length,
          sentence: 200
        }
      }
    };

    const baseConfig = { ...DEFAULT_ADVANCED_RULES_CONFIG };

    const result1 = applyProofreadingSettings(config1, baseConfig);
    expect(result1.longSentenceThreshold).toBe(100);

    const result2 = applyProofreadingSettings(config2, baseConfig);
    expect(result2.longSentenceThreshold).toBe(200);
  });
});

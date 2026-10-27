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
  applyProofreadingSettings,
  parseProofreadingSettingsFromRaw
} from './proofreadingConfig';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import * as fc from 'fast-check';

describe('parseProofreadingSettingsFromRaw', () => {
  it('入れ子設定のfalse、数値、列挙値、配列と文字列を読み取る', () => {
    const config = parseProofreadingSettingsFromRaw({
      typo: { enable: false, raNuki: false },
      length: { sentence: 50 },
      termBase: { okuriganaMode: 'custom' },
      envDependent: { mode: 'partial' },
      quoteLine: { markers: '>,#' },
      dictionaries: { proofreading: ['terms.json'] },
      description: '',
    });
    expect(config.categories.typo.enable).toBe(false);
    expect(config.categories.typo.raNuki).toBe(false);
    expect(config.categories.length.sentence).toBe(50);
    expect(config.categories.termBase.okuriganaMode).toBe('custom');
    expect(config.categories.envDependent.mode).toBe('partial');
    expect(config.categories.quoteLine.markers).toEqual(['>', '#']);
    expect(config.dictionaries.proofreading).toEqual(['terms.json']);
    expect(config.description).toBe('');
  });

  it('旧形式の明示値を優先し、削除後は既定値へ戻す', () => {
    const config = parseProofreadingSettingsFromRaw({
      'typo.enable': false, typo: { enable: true },
      'length.sentence': 50, length: { sentence: 200 },
      'quoteLine.markers': [], quoteLine: { markers: ['#'] },
    });
    expect(config.categories.typo.enable).toBe(false);
    expect(config.categories.length.sentence).toBe(50);
    expect(config.categories.quoteLine.markers).toEqual([]);
    const reset = parseProofreadingSettingsFromRaw({});
    expect(reset.categories.typo.enable).toBe(DEFAULT_PROOFREADING_CONFIG.categories.typo.enable);
    expect(reset.categories.length.sentence).toBe(DEFAULT_PROOFREADING_CONFIG.categories.length.sentence);
  });

  it('旧形式の明示値が無効なら既定値を使い、継承値は読まない', () => {
    const raw = Object.assign(Object.create({ typo: { enable: false } }), {
      'length.sentence': null, length: { sentence: 50 },
      quoteLine: { markers: ['#', '>'] },
      dictionaries: { rule: [] },
    });
    const config = parseProofreadingSettingsFromRaw(raw);
    expect(config.categories.typo.enable).toBe(DEFAULT_PROOFREADING_CONFIG.categories.typo.enable);
    expect(config.categories.length.sentence).toBe(DEFAULT_PROOFREADING_CONFIG.categories.length.sentence);
    expect(config.categories.quoteLine.markers).toEqual(['#', '>']);
    expect(config.dictionaries.rule).toEqual([]);
  });

  it('入れ子と旧形式は入力値を変更せず同じ設定を生成する', () => {
    fc.assert(fc.property(fc.boolean(), fc.integer({ min: 1, max: 999 }), (enabled, length) => {
      const nested = { typo: { enable: enabled }, length: { sentence: length } };
      const result = parseProofreadingSettingsFromRaw(nested);
      expect(result.categories.typo.enable).toBe(enabled);
      expect(result.categories.length.sentence).toBe(length);
      expect(result).toEqual(parseProofreadingSettingsFromRaw({ 'typo.enable': enabled, 'length.sentence': length }));
      expect(nested).toEqual({ typo: { enable: enabled }, length: { sentence: length } });
    }), { seed: 20261027, numRuns: 50 });
  });
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

  it('数字・英字の優先幅を入れ子とドット形式から読み、無効値は既定値にする', () => {
    const nested = parseProofreadingSettingsFromRaw({ charType: { preferredNumeral: 'mix', preferredAlphabet: 'full' } });
    expect(nested.categories.charType.preferred.numeral).toBe('mix');
    expect(nested.categories.charType.preferred.alphabet).toBe('full');
    const dotted = parseProofreadingSettingsFromRaw({ 'charType.preferredNumeral': 'full', 'charType.preferredAlphabet': 'half', charType: { preferredNumeral: 'half', preferredAlphabet: 'full' } });
    expect(dotted.categories.charType.preferred.numeral).toBe('full');
    expect(dotted.categories.charType.preferred.alphabet).toBe('half');
    const invalid = parseProofreadingSettingsFromRaw({ charType: { preferredNumeral: 'other', preferredAlphabet: 'mix' } });
    expect(invalid.categories.charType.preferred.numeral).toBe(DEFAULT_PROOFREADING_CONFIG.categories.charType.preferred.numeral);
    expect(invalid.categories.charType.preferred.alphabet).toBe(DEFAULT_PROOFREADING_CONFIG.categories.charType.preferred.alphabet);
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

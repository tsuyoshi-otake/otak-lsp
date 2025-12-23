/**
 * ProofreadingConfig Unit Tests
 * Feature: proofreading-settings-compat
 * タスク1: 校正設定レイヤーの追加
 *
 * 設定型/デフォルト値/プリセット適用/mergeModeの挙動を検証
 */

import {
  ProofreadingSettingsConfig,
  DEFAULT_PROOFREADING_CONFIG,
  VIDEO_DEFAULT_PRESET,
  ProofreadingConfigMapper,
  applyPreset
} from './proofreadingConfig';
import { AdvancedRulesConfig, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

describe('ProofreadingSettingsConfig', () => {
  describe('DEFAULT_PROOFREADING_CONFIG', () => {
    it('デフォルト設定が存在する', () => {
      expect(DEFAULT_PROOFREADING_CONFIG).toBeDefined();
    });

    it('デフォルトのpresetはcustomである', () => {
      expect(DEFAULT_PROOFREADING_CONFIG.preset).toBe('custom');
    });

    it('デフォルトのmergeModeはoverride', () => {
      expect(DEFAULT_PROOFREADING_CONFIG.mergeMode).toBe('override');
    });

    it('各カテゴリの設定が存在する', () => {
      expect(DEFAULT_PROOFREADING_CONFIG.categories).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.typo).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.termBase).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.expression).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.charType).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.length).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.envDependent).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.punctuation).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.spell).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.notationVariant).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.bracket).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.categories.quoteLine).toBeDefined();
    });

    it('辞書設定が存在する', () => {
      expect(DEFAULT_PROOFREADING_CONFIG.dictionaries).toBeDefined();
      expect(DEFAULT_PROOFREADING_CONFIG.dictionaries.proofreading).toEqual([]);
      expect(DEFAULT_PROOFREADING_CONFIG.dictionaries.spell).toEqual([]);
      expect(DEFAULT_PROOFREADING_CONFIG.dictionaries.rule).toEqual([]);
    });

    it('descriptionが空文字列', () => {
      expect(DEFAULT_PROOFREADING_CONFIG.description).toBe('');
    });
  });

  describe('VIDEO_DEFAULT_PRESET', () => {
    it('動画のチェック状態を再現するプリセットが存在する', () => {
      expect(VIDEO_DEFAULT_PRESET).toBeDefined();
    });

    it('presetはvideo-default', () => {
      expect(VIDEO_DEFAULT_PRESET.preset).toBe('video-default');
    });
  });
});

describe('applyPreset', () => {
  it('presetがvideo-defaultの場合、VIDEO_DEFAULT_PRESETが適用される', () => {
    const config: ProofreadingSettingsConfig = {
      ...DEFAULT_PROOFREADING_CONFIG,
      preset: 'video-default'
    };

    const result = applyPreset(config);
    expect(result.preset).toBe('video-default');
    // video-defaultのプリセット値が反映されていることを確認
    expect(result.categories.typo.enable).toBe(VIDEO_DEFAULT_PRESET.categories.typo.enable);
  });

  it('presetがcustomの場合、元の設定がそのまま返される', () => {
    const config: ProofreadingSettingsConfig = {
      ...DEFAULT_PROOFREADING_CONFIG,
      preset: 'custom',
      description: 'カスタム説明'
    };

    const result = applyPreset(config);
    expect(result.preset).toBe('custom');
    expect(result.description).toBe('カスタム説明');
  });
});

describe('ProofreadingConfigMapper', () => {
  describe('mapToAdvancedConfig', () => {
    it('校正設定からAdvancedRulesConfigへのパッチを生成する', () => {
      const proofreadingConfig: ProofreadingSettingsConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: true,
            raNuki: true
          }
        }
      };

      const patch = ProofreadingConfigMapper.mapToAdvancedConfig(proofreadingConfig);
      expect(patch).toBeDefined();
      expect(patch.enableRaNukiDetection).toBe(true);
    });

    it('カテゴリが無効の場合、関連ルールも無効になる', () => {
      const proofreadingConfig: ProofreadingSettingsConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: false,
            raNuki: true
          }
        }
      };

      const patch = ProofreadingConfigMapper.mapToAdvancedConfig(proofreadingConfig);
      expect(patch.enableRaNukiDetection).toBe(false);
    });
  });

  describe('mergeWithAdvanced', () => {
    it('mergeMode=overrideの場合、校正設定を優先する', () => {
      const proofreadingConfig: ProofreadingSettingsConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        mergeMode: 'override',
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: true,
            raNuki: false
          }
        }
      };

      const advancedConfig: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableRaNukiDetection: true
      };

      const result = ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);
      expect(result.enableRaNukiDetection).toBe(false); // 校正設定が優先
    });

    it('mergeMode=mergeの場合、advanced設定とORで統合する', () => {
      const proofreadingConfig: ProofreadingSettingsConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        mergeMode: 'merge',
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: true,
            raNuki: false
          }
        }
      };

      const advancedConfig: AdvancedRulesConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableRaNukiDetection: true
      };

      const result = ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);
      expect(result.enableRaNukiDetection).toBe(true); // ORで統合（advanced設定が有効なので有効）
    });
  });
});

describe('ProofreadingSettingsConfig - カテゴリ設定', () => {
  describe('typo (誤字チェック)', () => {
    it('デフォルト値が正しく設定されている', () => {
      const typo = DEFAULT_PROOFREADING_CONFIG.categories.typo;
      expect(typo.enable).toBe(true);
      expect(typo.checkInBrackets).toBe(true);
      expect(typo.raNuki).toBe(true);
      expect(typo.saIre).toBe(true);
      expect(typo.doubleHonorific).toBe(true);
      expect(typo.adverbAgreement).toBe(true);
      expect(typo.eraFirstYear).toBe(true);
    });
  });

  describe('termBase (用語基準)', () => {
    it('デフォルト値が正しく設定されている', () => {
      const termBase = DEFAULT_PROOFREADING_CONFIG.categories.termBase;
      expect(termBase.enable).toBe(true);
      expect(termBase.okurigana).toBe(true);
      expect(termBase.jouyouKanji).toBe(true);
      expect(termBase.oldKanji).toBe(true);
      expect(termBase.kanjiOpening).toBe(true);
      expect(termBase.excludeProperNouns).toBe(true);
    });
  });

  describe('expression (表現洗練)', () => {
    it('デフォルト値が正しく設定されている', () => {
      const expression = DEFAULT_PROOFREADING_CONFIG.categories.expression;
      expect(expression.enable).toBe(true);
      expect(expression.styleConsistency).toBe(true);
      expect(expression.redundant).toBe(true);
      expect(expression.particleRepetition).toBe(true);
      expect(expression.doubleNegation).toBe(true);
      expect(expression.twistedSentence).toBe(true);
    });
  });

  describe('length (長さチェック)', () => {
    it('デフォルトの閾値が1-999の範囲内', () => {
      const length = DEFAULT_PROOFREADING_CONFIG.categories.length;
      expect(length.sentence).toBeGreaterThanOrEqual(1);
      expect(length.sentence).toBeLessThanOrEqual(999);
      expect(length.comma).toBeGreaterThanOrEqual(1);
      expect(length.comma).toBeLessThanOrEqual(999);
    });
  });

  describe('bracket (括弧)', () => {
    it('maxDepthの閾値が1-10の範囲内', () => {
      const bracket = DEFAULT_PROOFREADING_CONFIG.categories.bracket;
      expect(bracket.maxDepth).toBeGreaterThanOrEqual(1);
      expect(bracket.maxDepth).toBeLessThanOrEqual(10);
    });
  });
});

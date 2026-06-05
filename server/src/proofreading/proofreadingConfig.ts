/**
 * 校正設定モジュールの公開API（バレル）
 * Feature: proofreading-settings-compat
 *
 * - 型定義: proofreadingTypes
 * - デフォルト値・プリセット: proofreadingDefaults
 * - AdvancedRulesConfig へのマッピング: proofreadingConfigMapper
 * - VS Code 設定形式からのパース: proofreadingConfigParser
 */

export * from './proofreadingTypes';
export {
  DEFAULT_PROOFREADING_CONFIG,
  VIDEO_DEFAULT_PRESET,
  applyPreset,
} from './proofreadingDefaults';
export {
  ProofreadingConfigMapper,
  applyProofreadingSettings,
} from './proofreadingConfigMapper';
export { parseProofreadingSettingsFromRaw } from './proofreadingConfigParser';

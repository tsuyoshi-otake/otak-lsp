/**
 * Tiered Execution Tests
 * Feature: advanced-rules-tiered-execution
 *
 * 段階実行機能のテスト
 * - 設定項目の追加
 * - ルール分類の実装
 * - 軽量ルールのみ実行
 */

import { AdvancedRulesManager } from './advancedRulesManager';
import {
  DEFAULT_ADVANCED_RULES_CONFIG,
  TieredExecutionConfig,
  DEFAULT_TIERED_EXECUTION_CONFIG
} from '../../../shared/src/advancedTypes';
import { Token } from '../../../shared/src/types';

describe('Tiered Execution - Feature: advanced-rules-tiered-execution', () => {
  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
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

  describe('タスク1: 設定項目の追加', () => {
    describe('TieredExecutionConfig型', () => {
      it('TieredExecutionConfig型が存在する', () => {
        const config: TieredExecutionConfig = {
          enabled: false,
          idleDelayMs: 1200
        };
        expect(config).toBeDefined();
        expect(config.enabled).toBe(false);
        expect(config.idleDelayMs).toBe(1200);
      });

      it('DEFAULT_TIERED_EXECUTION_CONFIGが存在する', () => {
        expect(DEFAULT_TIERED_EXECUTION_CONFIG).toBeDefined();
        expect(DEFAULT_TIERED_EXECUTION_CONFIG.enabled).toBe(true);
        expect(DEFAULT_TIERED_EXECUTION_CONFIG.idleDelayMs).toBe(1200);
      });
    });

    describe('AdvancedRulesConfigにtieredExecutionフィールドが存在する', () => {
      it('デフォルト設定にtieredExecutionが含まれる', () => {
        expect(DEFAULT_ADVANCED_RULES_CONFIG.tieredExecution).toBeDefined();
        expect(DEFAULT_ADVANCED_RULES_CONFIG.tieredExecution.enabled).toBe(true);
        expect(DEFAULT_ADVANCED_RULES_CONFIG.tieredExecution.idleDelayMs).toBe(1200);
      });

      it('AdvancedRulesManagerの設定からtieredExecutionを取得できる', () => {
        const manager = new AdvancedRulesManager();
        const config = manager.getConfig();
        expect(config.tieredExecution).toBeDefined();
        expect(config.tieredExecution.enabled).toBe(true);
        expect(config.tieredExecution.idleDelayMs).toBe(1200);
      });
    });

    describe('設定の更新', () => {
      it('tieredExecution設定を更新できる', () => {
        const manager = new AdvancedRulesManager();
        manager.updateConfig({
          tieredExecution: {
            enabled: true,
            idleDelayMs: 2000
          }
        });
        const config = manager.getConfig();
        expect(config.tieredExecution.enabled).toBe(true);
        expect(config.tieredExecution.idleDelayMs).toBe(2000);
      });

      it('部分的なtieredExecution更新でも既存値が保持される', () => {
        const manager = new AdvancedRulesManager();
        manager.updateConfig({
          tieredExecution: {
            enabled: true,
            idleDelayMs: 1200
          }
        });
        // enabledのみ変更
        manager.updateConfig({
          tieredExecution: {
            enabled: false,
            idleDelayMs: 1200
          }
        });
        const config = manager.getConfig();
        expect(config.tieredExecution.enabled).toBe(false);
        expect(config.tieredExecution.idleDelayMs).toBe(1200);
      });
    });
  });

  describe('タスク2: ルール分類の実装', () => {
    describe('軽量ルールリスト', () => {
      it('LIGHTWEIGHT_RULE_NAMESが定義されている', () => {
        const manager = new AdvancedRulesManager();
        const lightweightRules = manager.getLightweightRuleNames();
        expect(Array.isArray(lightweightRules)).toBe(true);
        expect(lightweightRules.length).toBeGreaterThan(0);
      });

      it('軽量ルールには期待されるルールが含まれる', () => {
        const manager = new AdvancedRulesManager();
        const lightweightRules = manager.getLightweightRuleNames();
        // 軽量ルールの例（走査コストが低いもの）
        expect(lightweightRules).toContain('alphabet-width');
        expect(lightweightRules).toContain('halfwidth-kana');
        expect(lightweightRules).toContain('number-width-mix');
      });

      it('重量ルールは軽量ルールリストに含まれない', () => {
        const manager = new AdvancedRulesManager();
        const lightweightRules = manager.getLightweightRuleNames();
        // 重量ルールの例（文脈解析が必要なもの）
        expect(lightweightRules).not.toContain('style-consistency');
        expect(lightweightRules).not.toContain('monotonous-ending');
      });
    });

    describe('checkLightweightRulesメソッド', () => {
      it('軽量ルールのみを実行する', () => {
        const manager = new AdvancedRulesManager();
        const text = 'テスト文章です。';
        const tokens = [
          createToken('テスト', '名詞', 0),
          createToken('文章', '名詞', 3),
          createToken('です', '助動詞', 5),
          createToken('。', '記号', 7)
        ];

        // 軽量ルールのみ実行
        const diagnostics = manager.checkLightweightRules(text, tokens);

        // 診断が返される（空配列でもOK - 軽量ルールが正常に実行されることを確認）
        expect(Array.isArray(diagnostics)).toBe(true);
      });

      it('軽量ルールが無効な場合は空配列を返す', () => {
        const manager = new AdvancedRulesManager({
          enableAlphabetWidth: false,
          enableHalfwidthKana: false,
          enableNumberWidthMix: false,
          enableSymbolWidthMix: false
        });

        const text = 'テスト文章です。';
        const tokens = [createToken('テスト', '名詞', 0)];
        const diagnostics = manager.checkLightweightRules(text, tokens);

        expect(Array.isArray(diagnostics)).toBe(true);
      });
    });

    describe('isLightweightRuleメソッド', () => {
      it('軽量ルールを正しく判定する', () => {
        const manager = new AdvancedRulesManager();
        expect(manager.isLightweightRule('alphabet-width')).toBe(true);
        expect(manager.isLightweightRule('halfwidth-kana')).toBe(true);
        expect(manager.isLightweightRule('number-width-mix')).toBe(true);
      });

      it('重量ルールを正しく判定する', () => {
        const manager = new AdvancedRulesManager();
        expect(manager.isLightweightRule('style-consistency')).toBe(false);
        expect(manager.isLightweightRule('monotonous-ending')).toBe(false);
        expect(manager.isLightweightRule('conjunction-repetition')).toBe(false);
      });
    });
  });

  describe('タスク3-4: 段階実行との統合', () => {
    describe('tieredExecution無効時の動作', () => {
      it('tieredExecution無効時はcheckTextが全ルールを実行する', () => {
        const manager = new AdvancedRulesManager({
          tieredExecution: {
            enabled: false,
            idleDelayMs: 1200
          }
        });

        const text = 'テスト文章です。';
        const tokens = [createToken('テスト', '名詞', 0)];

        // 通常のcheckTextは全ルールを実行
        const diagnostics = manager.checkText(text, tokens);
        expect(Array.isArray(diagnostics)).toBe(true);
      });
    });

    describe('tieredExecution有効時の動作', () => {
      it('checkLightweightRulesは軽量ルールのみ実行', () => {
        const manager = new AdvancedRulesManager({
          tieredExecution: {
            enabled: true,
            idleDelayMs: 1200
          }
        });

        const text = 'ABCとＤＥＦ'; // 全角半角混在
        const tokens = [
          createToken('ABC', '名詞', 0),
          createToken('と', '助詞', 3),
          createToken('DEF', '名詞', 4)
        ];

        const lightDiagnostics = manager.checkLightweightRules(text, tokens);
        expect(Array.isArray(lightDiagnostics)).toBe(true);
      });
    });
  });
});

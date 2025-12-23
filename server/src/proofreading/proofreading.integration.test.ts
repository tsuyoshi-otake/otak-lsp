/**
 * Proofreading Integration Tests
 * Feature: proofreading-settings-compat
 * タスク18: 統合テストの追加
 *
 * Markdownフィルタ + 引用行フィルタの併用、既存Advancedルールとの競合を検証
 */

import { QuoteLineFilter } from './quoteLineFilter';
import { ProofreadingRulesManager } from './proofreadingRulesManager';
import { ProofreadingConfigMapper, DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import { Token } from '../../../shared/src/types';

describe('Proofreading Integration Tests', () => {
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

  describe('QuoteLineFilter + ProofreadingRulesManager', () => {
    it('引用行はチェック対象から除外される', () => {
      const filter = new QuoteLineFilter();
      const manager = new ProofreadingRulesManager();

      const text = '通常行です。\n> 令和1年の引用\n通常行です。';
      const filterResult = filter.filter(text, ['>']);

      // 引用行がフィルタされていることを確認
      expect(filterResult.excludedRanges.length).toBe(1);
      expect(filterResult.excludedRanges[0].type).toBe('quote-line');

      // フィルタ後のテキストでチェック
      const tokens = [createToken(filterResult.filteredText, '名詞', 0)];
      const diagnostics = manager.checkText(filterResult.filteredText, tokens);

      // 引用行内の「令和1年」は検出されない（スペースで置換されているため）
      const eraDiag = diagnostics.find(d => d.message.includes('令和'));
      expect(eraDiag).toBeUndefined();
    });

    it('引用行以外はチェック対象になる', () => {
      const filter = new QuoteLineFilter();
      const manager = new ProofreadingRulesManager();

      const text = '令和1年に制定。\n> 引用行\n別の通常行。';
      const filterResult = filter.filter(text, ['>']);

      const tokens = [createToken(filterResult.filteredText, '名詞', 0)];
      const diagnostics = manager.checkText(filterResult.filteredText, tokens);

      // 通常行の「令和1年」は検出される
      const eraDiag = diagnostics.find(d => d.message.includes('元年'));
      expect(eraDiag).toBeDefined();
    });
  });

  describe('ProofreadingConfigMapper と AdvancedRulesConfig の統合', () => {
    it('校正設定とAdvanced設定が競合しない', () => {
      const proofreadingConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        mergeMode: 'merge' as const,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            raNuki: true
          }
        }
      };

      const advancedConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableRaNukiDetection: false // Advanced設定では無効
      };

      // merge モードでは OR で統合
      const merged = ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);

      // 校正設定でraNukiが有効なので、結果も有効
      expect(merged.enableRaNukiDetection).toBe(true);
    });

    it('overrideモードでは校正設定が優先される', () => {
      const proofreadingConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        mergeMode: 'override' as const,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            raNuki: false
          }
        }
      };

      const advancedConfig = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableRaNukiDetection: true // Advanced設定では有効
      };

      const merged = ProofreadingConfigMapper.mergeWithAdvanced(proofreadingConfig, advancedConfig);

      // 校正設定で無効なので、結果も無効
      expect(merged.enableRaNukiDetection).toBe(false);
    });
  });

  describe('複数のフィルタの併用', () => {
    it('引用行フィルタと括弧内除外が正しく機能する', () => {
      const filter = new QuoteLineFilter();
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            checkInBrackets: false // 括弧内はチェックしない
          }
        }
      };
      const manager = new ProofreadingRulesManager(config);

      const text = '令和1年（括弧内の令和1年）です。\n> 引用行の令和1年';
      const filterResult = filter.filter(text, ['>']);

      const tokens = [createToken(filterResult.filteredText, '名詞', 0)];
      const diagnostics = manager.checkText(filterResult.filteredText, tokens);

      // 括弧外の「令和1年」のみ検出される
      const eraDiags = diagnostics.filter(d => d.message.includes('元年'));
      expect(eraDiags.length).toBe(1);
    });
  });

  describe('位置保持の検証', () => {
    it('フィルタ後もテキストの長さが維持される', () => {
      const filter = new QuoteLineFilter();

      const text = '通常行です。\n> 引用行です。\n別の通常行。';
      const filterResult = filter.filter(text, ['>']);

      // テキストの長さが維持されている
      expect(filterResult.filteredText.length).toBe(text.length);
    });
  });
});

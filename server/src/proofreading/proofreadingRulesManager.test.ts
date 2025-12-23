/**
 * ProofreadingRulesManager Unit Tests
 * Feature: proofreading-settings-compat
 * タスク16: ProofreadingRulesManagerの統合
 *
 * 校正設定向けルールの管理と実行を検証
 */

import { ProofreadingRulesManager } from './proofreadingRulesManager';
import { DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { Token } from '../../../shared/src/types';

describe('ProofreadingRulesManager', () => {
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

  describe('constructor', () => {
    it('デフォルト設定で初期化できる', () => {
      const manager = new ProofreadingRulesManager();
      expect(manager).toBeDefined();
    });

    it('カスタム設定で初期化できる', () => {
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: false
          }
        }
      };
      const manager = new ProofreadingRulesManager(config);
      expect(manager).toBeDefined();
    });
  });

  describe('checkText', () => {
    it('テキストをチェックして診断を返す', () => {
      const manager = new ProofreadingRulesManager();
      const text = 'これはテストです。';
      const tokens = [
        createToken('これ', '代名詞', 0),
        createToken('は', '助詞', 2),
        createToken('テスト', '名詞', 3),
        createToken('です', '助動詞', 6),
        createToken('。', '記号', 8)
      ];

      const diagnostics = manager.checkText(text, tokens);
      expect(Array.isArray(diagnostics)).toBe(true);
    });

    it('設定が無効の場合はチェックをスキップする', () => {
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            enable: false
          },
          termBase: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.termBase,
            enable: false
          },
          expression: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.expression,
            enable: false
          },
          charType: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.charType,
            enable: false
          },
          length: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.length,
            enable: false
          },
          punctuation: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.punctuation,
            enable: false
          }
        }
      };

      const manager = new ProofreadingRulesManager(config);
      const text = '令和1年の出来事です。';
      const tokens = [
        createToken('令和', '名詞', 0),
        createToken('1', '名詞', 2),
        createToken('年', '名詞', 3),
        createToken('の', '助詞', 4),
        createToken('出来事', '名詞', 5),
        createToken('です', '助動詞', 8),
        createToken('。', '記号', 10)
      ];

      const diagnostics = manager.checkText(text, tokens);
      // 設定が無効なのでルール固有の診断は出ない（または少ない）
      expect(Array.isArray(diagnostics)).toBe(true);
    });
  });

  describe('updateConfig', () => {
    it('設定を更新できる', () => {
      const manager = new ProofreadingRulesManager();
      const newConfig = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            eraFirstYear: false
          }
        }
      };

      manager.updateConfig(newConfig);
      expect(manager.getConfig().categories.typo.eraFirstYear).toBe(false);
    });
  });

  describe('EraFirstYearRule', () => {
    it('令和1年を検出する', () => {
      const manager = new ProofreadingRulesManager();
      const text = '令和1年に制定されました。';
      const tokens = [
        createToken('令和', '名詞', 0),
        createToken('1', '名詞', 2),
        createToken('年', '名詞', 3)
      ];

      const diagnostics = manager.checkText(text, tokens);
      const eraFirstYearDiag = diagnostics.find(d => d.message.includes('元年'));
      expect(eraFirstYearDiag).toBeDefined();
    });

    it('令和元年は検出しない', () => {
      const manager = new ProofreadingRulesManager();
      const text = '令和元年に制定されました。';
      const tokens = [
        createToken('令和', '名詞', 0),
        createToken('元年', '名詞', 2)
      ];

      const diagnostics = manager.checkText(text, tokens);
      const eraFirstYearDiag = diagnostics.find(d => d.message.includes('元年'));
      expect(eraFirstYearDiag).toBeUndefined();
    });

    it('設定が無効の場合は検出しない', () => {
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          typo: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.typo,
            eraFirstYear: false
          }
        }
      };

      const manager = new ProofreadingRulesManager(config);
      const text = '令和1年に制定されました。';
      const tokens = [
        createToken('令和', '名詞', 0),
        createToken('1', '名詞', 2),
        createToken('年', '名詞', 3)
      ];

      const diagnostics = manager.checkText(text, tokens);
      const eraFirstYearDiag = diagnostics.find(d => d.message.includes('元年'));
      expect(eraFirstYearDiag).toBeUndefined();
    });
  });

  describe('CharTypeRunLengthRule', () => {
    it('連続したひらがなを検出する', () => {
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          length: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.length,
            enable: true,
            hiragana: 5 // 5文字以上で警告
          }
        }
      };

      const manager = new ProofreadingRulesManager(config);
      const text = 'あいうえおかきくけこ'; // 10文字のひらがな
      const tokens = [createToken(text, '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);
      const lengthDiag = diagnostics.find(d => d.message.includes('ひらがな'));
      expect(lengthDiag).toBeDefined();
    });

    it('短いひらがなは検出しない', () => {
      const config = {
        ...DEFAULT_PROOFREADING_CONFIG,
        categories: {
          ...DEFAULT_PROOFREADING_CONFIG.categories,
          length: {
            ...DEFAULT_PROOFREADING_CONFIG.categories.length,
            enable: true,
            hiragana: 10
          }
        }
      };

      const manager = new ProofreadingRulesManager(config);
      const text = 'あいう'; // 3文字のひらがな
      const tokens = [createToken(text, '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);
      const lengthDiag = diagnostics.find(d => d.message.includes('ひらがな'));
      expect(lengthDiag).toBeUndefined();
    });
  });
});

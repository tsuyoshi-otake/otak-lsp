/**
 * ProofreadingRulesManager Property-Based Tests
 * Feature: proofreading-settings-compat
 * タスク19: プロパティベーステストの追加
 *
 * 文字種連続長、括弧階層のしきい値判定をPBTで検証
 */

import * as fc from 'fast-check';
import { ProofreadingRulesManager } from './proofreadingRulesManager';
import { DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { Token } from '../../../shared/src/types';

describe('ProofreadingRulesManager - Property-Based Tests', () => {
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

  describe('CharTypeRunLengthRule - PBT', () => {
    it('閾値以下のひらがな連続は検出されない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (threshold) => {
            const config = {
              ...DEFAULT_PROOFREADING_CONFIG,
              categories: {
                ...DEFAULT_PROOFREADING_CONFIG.categories,
                length: {
                  ...DEFAULT_PROOFREADING_CONFIG.categories.length,
                  enable: true,
                  hiragana: threshold
                }
              }
            };

            const manager = new ProofreadingRulesManager(config);

            // 閾値ちょうどのひらがな文字列を生成
            const hiraganaChars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
            const text = hiraganaChars.slice(0, Math.min(threshold, hiraganaChars.length));
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);
            const lengthDiag = diagnostics.find(d => d.code === 'hiragana-run-length');

            // 閾値以下なので検出されない
            return lengthDiag === undefined;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('閾値を超えるひらがな連続は検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }),
          (threshold) => {
            const config = {
              ...DEFAULT_PROOFREADING_CONFIG,
              categories: {
                ...DEFAULT_PROOFREADING_CONFIG.categories,
                length: {
                  ...DEFAULT_PROOFREADING_CONFIG.categories.length,
                  enable: true,
                  hiragana: threshold
                }
              }
            };

            const manager = new ProofreadingRulesManager(config);

            // 閾値 + 1 のひらがな文字列を生成
            const text = 'あ'.repeat(threshold + 1);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);
            const lengthDiag = diagnostics.find(d => d.code === 'hiragana-run-length');

            // 閾値を超えているので検出される
            return lengthDiag !== undefined;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('BracketDepthRule - PBT', () => {
    it('閾値未満の括弧階層は検出されない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          (maxDepth) => {
            const config = {
              ...DEFAULT_PROOFREADING_CONFIG,
              categories: {
                ...DEFAULT_PROOFREADING_CONFIG.categories,
                bracket: {
                  ...DEFAULT_PROOFREADING_CONFIG.categories.bracket,
                  enable: true,
                  maxDepth
                }
              }
            };

            const manager = new ProofreadingRulesManager(config);

            // 閾値-1の深さの括弧を生成
            const depth = maxDepth - 1;
            let text = '';
            for (let i = 0; i < depth; i++) {
              text += '（';
            }
            text += '中身';
            for (let i = 0; i < depth; i++) {
              text += '）';
            }

            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = manager.checkText(text, tokens);
            const depthDiag = diagnostics.find(d => d.code === 'bracket-depth');

            // 閾値未満なので検出されない
            return depthDiag === undefined;
          }
        ),
        { numRuns: 30 }
      );
    });

    it('閾値以上の括弧階層は検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (maxDepth) => {
            const config = {
              ...DEFAULT_PROOFREADING_CONFIG,
              categories: {
                ...DEFAULT_PROOFREADING_CONFIG.categories,
                bracket: {
                  ...DEFAULT_PROOFREADING_CONFIG.categories.bracket,
                  enable: true,
                  maxDepth
                }
              }
            };

            const manager = new ProofreadingRulesManager(config);

            // 閾値を超える深さの括弧を生成（maxDepth + 1）
            const depth = maxDepth + 1;
            let text = '';
            for (let i = 0; i < depth; i++) {
              text += '（';
            }
            text += '中身';
            for (let i = 0; i < depth; i++) {
              text += '）';
            }

            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = manager.checkText(text, tokens);
            const depthDiag = diagnostics.find(d => d.code === 'bracket-depth');

            // 閾値を超えているので検出される
            return depthDiag !== undefined;
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('EraFirstYearRule - PBT', () => {
    it('全ての元号で1年が検出される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('令和', '平成', '昭和', '大正', '明治'),
          (era) => {
            const manager = new ProofreadingRulesManager();
            const text = `${era}1年に制定された。`;
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);
            const eraDiag = diagnostics.find(d => d.code === 'era-first-year');

            return eraDiag !== undefined && eraDiag.message.includes('元年');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

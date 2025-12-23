/**
 * QuoteLineFilter Unit Tests
 * Feature: proofreading-settings-compat
 * タスク4: 引用行フィルタの追加
 *
 * 引用行を除外範囲として処理する機能を検証
 */

import { QuoteLineFilter } from './quoteLineFilter';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

describe('QuoteLineFilter', () => {
  describe('filter', () => {
    it('> で始まる行を引用行として検出する', () => {
      const filter = new QuoteLineFilter();
      const text = '通常の行です。\n> これは引用行です。\n別の通常行です。';

      const result = filter.filter(text, ['>']);
      expect(result.excludedRanges.length).toBe(1);
      expect(result.excludedRanges[0].type).toBe('quote-line');
      // '通常の行です。' = 7文字 (0-6), '\n' = 位置7
      // '> これは引用行です。' = 11文字 (8-18)
      expect(result.excludedRanges[0].start).toBe(8);
      expect(result.excludedRanges[0].end).toBe(19);
    });

    it('| で始まる行を引用行として検出する', () => {
      const filter = new QuoteLineFilter();
      const text = '通常の行です。\n| これは引用行です。\n別の通常行です。';

      const result = filter.filter(text, ['|']);
      expect(result.excludedRanges.length).toBe(1);
      expect(result.excludedRanges[0].type).toBe('quote-line');
    });

    it('複数の引用行を検出する', () => {
      const filter = new QuoteLineFilter();
      const text = '> 引用1\n通常行\n> 引用2\n> 引用3';

      const result = filter.filter(text, ['>']);
      expect(result.excludedRanges.length).toBe(3);
    });

    it('複数のマーカーを同時に使用できる', () => {
      const filter = new QuoteLineFilter();
      const text = '> 引用1\n| 引用2\n通常行';

      const result = filter.filter(text, ['>', '|']);
      expect(result.excludedRanges.length).toBe(2);
    });

    it('引用行がスペースで置換される', () => {
      const filter = new QuoteLineFilter();
      const text = '通常行\n> 引用行\n通常行';

      const result = filter.filter(text, ['>']);
      // 引用行がスペースで置換されていることを確認
      expect(result.filteredText.length).toBe(text.length);
      expect(result.filteredText).not.toContain('> 引用行');
    });

    it('空のマーカーリストでは何も除外しない', () => {
      const filter = new QuoteLineFilter();
      const text = '> 引用行\n通常行';

      const result = filter.filter(text, []);
      expect(result.excludedRanges.length).toBe(0);
      expect(result.filteredText).toBe(text);
    });

    it('行頭のスペースの後にマーカーがある場合も検出する', () => {
      const filter = new QuoteLineFilter();
      const text = '通常行\n  > 引用行\n通常行';

      const result = filter.filter(text, ['>']);
      expect(result.excludedRanges.length).toBe(1);
    });

    it('改行コードCRLFにも対応する', () => {
      const filter = new QuoteLineFilter();
      const text = '通常行\r\n> 引用行\r\n通常行';

      const result = filter.filter(text, ['>']);
      expect(result.excludedRanges.length).toBe(1);
    });

    it('マーカーがテキスト中にあっても行頭でなければ除外しない', () => {
      const filter = new QuoteLineFilter();
      const text = 'これは > 通常の文です。';

      const result = filter.filter(text, ['>']);
      expect(result.excludedRanges.length).toBe(0);
    });
  });

  describe('applyFilter', () => {
    it('既存の除外範囲とマージできる', () => {
      const filter = new QuoteLineFilter();
      const text = '通常行\n> 引用行\n```\ncode\n```';

      const existingRanges: ExcludedRange[] = [
        { type: 'code-block', start: 19, end: 30, content: '```\ncode\n```', reason: 'コードブロック' }
      ];

      const result = filter.applyFilter(text, ['>'], existingRanges);
      expect(result.excludedRanges.length).toBe(2);
    });
  });
});

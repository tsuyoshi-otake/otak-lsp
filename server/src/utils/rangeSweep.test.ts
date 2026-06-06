/**
 * 範囲スイープユーティリティのユニットテスト
 *
 * 「重なり (overlap)」と「完全包含 (containment)」の区別、
 * `buildMaskedTextByKeepRanges` / `buildMaskedTextByMaskRanges` の
 * 旧実装互換 (改行・特定文字保持・長さ不変) を検証する。
 */

import {
  normalizeRanges,
  anyRangeOverlaps,
  anyRangeContainsPoint,
  anyRangeContainsItem,
  sweepFilterByOverlap,
  sweepFilterByContainment,
  buildMaskedTextByKeepRanges,
  buildMaskedTextByMaskRanges,
  Range,
} from './rangeSweep';

const r = (start: number, end: number): Range => ({ start, end });

describe('rangeSweep', () => {
  describe('normalizeRanges', () => {
    it('空配列を返す: 入力が空', () => {
      expect(normalizeRanges([])).toEqual([]);
    });

    it('不正範囲 (start >= end) を除外する', () => {
      expect(normalizeRanges([r(5, 5), r(10, 3)])).toEqual([]);
    });

    it('単一範囲はそのまま返す', () => {
      expect(normalizeRanges([r(0, 5)])).toEqual([r(0, 5)]);
    });

    it('重なり/隣接をマージする', () => {
      expect(normalizeRanges([r(0, 3), r(3, 6), r(5, 9)])).toEqual([r(0, 9)]);
    });

    it('離れた範囲はマージしない', () => {
      expect(normalizeRanges([r(0, 3), r(5, 8)])).toEqual([r(0, 3), r(5, 8)]);
    });

    it('未ソートでも正しくマージする', () => {
      expect(normalizeRanges([r(10, 15), r(0, 5), r(4, 12)])).toEqual([r(0, 15)]);
    });

    it('元配列を変更しない', () => {
      const input = [r(5, 8), r(0, 3)];
      normalizeRanges(input);
      expect(input).toEqual([r(5, 8), r(0, 3)]);
    });
  });

  describe('anyRangeOverlaps', () => {
    const ranges = [r(0, 5), r(10, 15), r(20, 25)];

    it('完全に内側', () => {
      expect(anyRangeOverlaps(ranges, 2, 4)).toBe(true);
    });

    it('境界またぎ', () => {
      expect(anyRangeOverlaps(ranges, 3, 12)).toBe(true);
    });

    it('範囲外', () => {
      expect(anyRangeOverlaps(ranges, 7, 9)).toBe(false);
    });

    it('start が範囲の end と等しい (半開区間)', () => {
      expect(anyRangeOverlaps(ranges, 5, 8)).toBe(false);
      expect(anyRangeOverlaps(ranges, 4, 5)).toBe(true);
    });

    it('start >= end は false', () => {
      expect(anyRangeOverlaps(ranges, 5, 5)).toBe(false);
    });

    it('空範囲リスト', () => {
      expect(anyRangeOverlaps([], 0, 10)).toBe(false);
    });
  });

  describe('anyRangeContainsPoint', () => {
    const ranges = [r(0, 5), r(10, 15)];

    it('範囲内の点', () => {
      expect(anyRangeContainsPoint(ranges, 3)).toBe(true);
    });

    it('範囲の start に等しい点 (半開区間で含まれる)', () => {
      expect(anyRangeContainsPoint(ranges, 0)).toBe(true);
      expect(anyRangeContainsPoint(ranges, 10)).toBe(true);
    });

    it('範囲の end に等しい点 (半開区間で含まれない)', () => {
      expect(anyRangeContainsPoint(ranges, 5)).toBe(false);
      expect(anyRangeContainsPoint(ranges, 15)).toBe(false);
    });

    it('範囲外の点', () => {
      expect(anyRangeContainsPoint(ranges, 7)).toBe(false);
    });
  });

  describe('anyRangeContainsItem', () => {
    const ranges = [r(0, 10), r(20, 30)];

    it('完全包含される', () => {
      expect(anyRangeContainsItem(ranges, 2, 8)).toBe(true);
    });

    it('境界を含む完全包含', () => {
      expect(anyRangeContainsItem(ranges, 0, 10)).toBe(true);
    });

    it('部分的に範囲を超える (包含されない)', () => {
      expect(anyRangeContainsItem(ranges, 5, 15)).toBe(false);
    });

    it('完全に外側', () => {
      expect(anyRangeContainsItem(ranges, 12, 18)).toBe(false);
    });

    it('複数範囲またぎは包含されない', () => {
      expect(anyRangeContainsItem(ranges, 5, 25)).toBe(false);
    });
  });

  describe('sweepFilterByOverlap', () => {
    const items = [
      { start: 0, end: 2, name: 'A' },
      { start: 3, end: 5, name: 'B' },
      { start: 6, end: 9, name: 'C' },
      { start: 10, end: 12, name: 'D' },
    ];
    const ranges = normalizeRanges([r(4, 7)]);

    it('重なる項目を残す', () => {
      const result = sweepFilterByOverlap(items, ranges, true);
      expect(result.map((i) => i.name)).toEqual(['B', 'C']);
    });

    it('重ならない項目を残す', () => {
      const result = sweepFilterByOverlap(items, ranges, false);
      expect(result.map((i) => i.name)).toEqual(['A', 'D']);
    });

    it('範囲が空のとき keep=true は []', () => {
      expect(sweepFilterByOverlap(items, [], true)).toEqual([]);
    });

    it('範囲が空のとき keep=false は全部', () => {
      expect(sweepFilterByOverlap(items, [], false)).toEqual(items);
    });

    it('items が未ソートでも結果が正しい', () => {
      const shuffled = [items[2], items[0], items[3], items[1]];
      const result = sweepFilterByOverlap(shuffled, ranges, false);
      const names = result.map((i) => i.name).sort();
      expect(names).toEqual(['A', 'D']);
    });
  });

  describe('sweepFilterByContainment', () => {
    const items = [
      { start: 0, end: 2, name: 'A' }, // 完全外
      { start: 5, end: 8, name: 'B' }, // 完全包含
      { start: 9, end: 12, name: 'C' }, // 境界またぎ
      { start: 13, end: 15, name: 'D' }, // 完全外
    ];
    const ranges = normalizeRanges([r(4, 10)]);

    it('完全包含される項目を残す', () => {
      const result = sweepFilterByContainment(items, ranges, true);
      expect(result.map((i) => i.name)).toEqual(['B']);
    });

    it('完全包含されない項目を残す', () => {
      const result = sweepFilterByContainment(items, ranges, false);
      expect(result.map((i) => i.name)).toEqual(['A', 'C', 'D']);
    });

    it('範囲が空のとき keep=true は []', () => {
      expect(sweepFilterByContainment(items, [], true)).toEqual([]);
    });

    it('境界が一致 (start, end の両方が range の境界) は包含 (半開区間)', () => {
      const item = [{ start: 4, end: 10 }];
      expect(
        sweepFilterByContainment(item, ranges, true).length
      ).toBe(1);
    });
  });

  describe('buildMaskedTextByKeepRanges', () => {
    it('keep 範囲のみ原文、外はスペース、改行は保持', () => {
      const text = 'abc\ndef\nghi';
      // keep "def" only
      const result = buildMaskedTextByKeepRanges(text, [r(4, 7)]);
      expect(result).toBe('   \ndef\n   ');
      expect(result.length).toBe(text.length);
    });

    it('空テキストは空文字を返す', () => {
      expect(buildMaskedTextByKeepRanges('', [r(0, 3)])).toBe('');
    });

    it('keep 範囲なしは全マスク (改行は保持)', () => {
      const text = 'abc\ndef';
      const result = buildMaskedTextByKeepRanges(text, []);
      expect(result).toBe('   \n   ');
    });

    it('preserveChars に指定した文字は保持される', () => {
      const text = 'a|b|c';
      const result = buildMaskedTextByKeepRanges(text, [], new Set(['|']));
      expect(result).toBe(' | | ');
    });

    it('範囲がテキスト境界を超えても安全', () => {
      const text = 'abc';
      const result = buildMaskedTextByKeepRanges(text, [r(-5, 100)]);
      expect(result).toBe('abc');
    });
  });

  describe('buildMaskedTextByMaskRanges', () => {
    it('mask 範囲をスペースに置換、外は原文', () => {
      const text = 'abc def ghi';
      // mask "def"
      const result = buildMaskedTextByMaskRanges(text, [r(4, 7)]);
      expect(result).toBe('abc     ghi');
      expect(result.length).toBe(text.length);
    });

    it('改行と preserveChars はマスク範囲内でも保持', () => {
      const text = '|a|\n|b|';
      // mask 全体
      const result = buildMaskedTextByMaskRanges(text, [r(0, 7)], new Set(['|']));
      expect(result).toBe('| |\n| |');
    });

    it('複数の mask 範囲', () => {
      const text = 'abcdefghij';
      const result = buildMaskedTextByMaskRanges(text, [r(0, 2), r(5, 8)]);
      expect(result).toBe('  cde   ij');
    });

    it('未ソートでも正しくマスクできる', () => {
      const text = 'abcdefghij';
      const result = buildMaskedTextByMaskRanges(text, [r(5, 8), r(0, 2)]);
      expect(result).toBe('  cde   ij');
    });
  });
});

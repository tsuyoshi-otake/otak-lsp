/**
 * BracketRangeDetector Unit Tests
 * Feature: proofreading-settings-compat
 * タスク5: 括弧内チェックの制御
 *
 * 括弧内範囲の検出と除外を検証
 */

import { BracketRangeDetector, BracketRange } from './bracketRangeDetector';

describe('BracketRangeDetector', () => {
  describe('detect', () => {
    it('丸括弧の範囲を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは（括弧内）です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(1);
      expect(ranges[0].type).toBe('round');
      expect(ranges[0].start).toBe(3); // '（'の位置
      expect(ranges[0].end).toBe(8); // '）'の位置 + 1
    });

    it('鉤括弧の範囲を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは「括弧内」です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(1);
      expect(ranges[0].type).toBe('corner');
    });

    it('二重鉤括弧の範囲を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは『括弧内』です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(1);
      expect(ranges[0].type).toBe('double-corner');
    });

    it('半角丸括弧の範囲を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = 'This is (text) here.';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(1);
      expect(ranges[0].type).toBe('round-half');
    });

    it('角括弧の範囲を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは【括弧内】です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(1);
      expect(ranges[0].type).toBe('square');
    });

    it('ネストした括弧を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = '外側（内側「入れ子」あり）です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(2); // 外側と内側の両方
    });

    it('対応する閉じ括弧がない場合は範囲として含めない', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは（開きっぱなし';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(0);
    });

    it('複数の独立した括弧を検出する', () => {
      const detector = new BracketRangeDetector();
      const text = '一つ目（A）、二つ目（B）です。';

      const ranges = detector.detect(text);
      expect(ranges.length).toBe(2);
    });
  });

  describe('isInsideBracket', () => {
    it('括弧内の位置を判定する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは（括弧内）です。';
      const ranges = detector.detect(text);

      expect(detector.isInsideBracket(4, ranges)).toBe(true); // '括'の位置
      expect(detector.isInsideBracket(0, ranges)).toBe(false); // 'こ'の位置
      expect(detector.isInsideBracket(9, ranges)).toBe(false); // 'で'の位置
    });
  });

  describe('getInnerRanges', () => {
    it('括弧を除いた内側の範囲を取得する', () => {
      const detector = new BracketRangeDetector();
      const text = 'これは（括弧内）です。';
      const ranges = detector.detect(text);

      const innerRanges = detector.getInnerRanges(ranges);
      expect(innerRanges.length).toBe(1);
      expect(innerRanges[0].start).toBe(4); // '括'の位置
      expect(innerRanges[0].end).toBe(7); // '）'の位置（含まない）
    });
  });
});

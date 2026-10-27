import * as fc from 'fast-check';
import { BracketRangeDetector } from '../bracketRangeDetector';
import { DictionaryEntry } from '../../dictionaries/proofreadingDictionaryLoader';
import { checkDictionaryEntries } from './proofreadingDictionaryRule';
import { computeLineStarts, offsetToLineAndCharacter } from '../../utils/lineStarts';

function dictionaryDiagnostics(text: string, entries: DictionaryEntry[], checkInBrackets = true, excluded: Array<{ start: number; end: number }> = []) {
  const detector = new BracketRangeDetector();
  const lineStarts = computeLineStarts(text);
  return checkDictionaryEntries({
    text,
    bracketRanges: detector.detect(text),
    bracketDetector: detector,
    checkInBrackets,
    offsetToPosition: offset => offsetToLineAndCharacter(lineStarts, offset),
  }, entries, Number.POSITIVE_INFINITY, excluded);
}

describe('校正辞書の一致と終了', () => {
  it('空文字とゼロ幅は診断せず、以降の通常エントリも実行する', () => {
    const diagnostics = dictionaryDiagnostics('ab ab', [
      { category: 'empty', match: '', mode: 'exact' },
      { category: 'lookahead', match: '(?=a)', mode: 'regex' },
      { category: 'valid', match: 'ab', mode: 'exact', replace: 'AB' },
    ]);
    expect(diagnostics.map(d => d.code)).toEqual(['dictionary-valid', 'dictionary-valid']);
    expect(diagnostics.map(d => d.range)).toEqual([
      { start: { line: 0, character: 0 }, end: { line: 0, character: 2 } },
      { start: { line: 0, character: 3 }, end: { line: 0, character: 5 } },
    ]);
    expect(diagnostics[0].message).toContain('AB');
  });

  it('括弧内のゼロ幅でも進行し、同じ正規表現の後続の通常一致を検出する', () => {
    const diagnostics = dictionaryDiagnostics('(a)b', [
      { category: 'mixed', match: '(?=a)|b', mode: 'regex' },
    ], false);
    expect(diagnostics.map(d => d.range)).toEqual([
      { start: { line: 0, character: 3 }, end: { line: 0, character: 4 } },
    ]);
  });

  it('入力が変わっても終端のゼロ幅を無視し、後続エントリの位置を維持する', () => {
    fc.assert(fc.property(fc.array(fc.constantFrom('a', 'b', '😀'), { maxLength: 30 }), chars => {
      const text = chars.join('');
      const diagnostics = dictionaryDiagnostics(text, [
        { category: 'end', match: '$', mode: 'regex' },
        { category: 'valid', match: 'b', mode: 'exact' },
      ]);
      const positions = [...text.matchAll(/b/g)].map(match => match.index);
      expect(diagnostics.map(d => d.range.start.character)).toEqual(positions);
      expect(diagnostics.every(d => d.code === 'dictionary-valid')).toBe(true);
    }), { seed: 20261027, numRuns: 50 });
  });

  it('除外範囲の順序や重なりに関係なく本文の一致だけを返す', () => {
    fc.assert(fc.property(
      fc.array(fc.constantFrom('a', 'b'), { maxLength: 35 }),
      fc.array(fc.tuple(fc.integer({ min: 0, max: 35 }), fc.integer({ min: 0, max: 35 })), { maxLength: 12 }),
      (chars, pairs) => {
        const text = chars.join('');
        const excluded = pairs.map(([a, b]) => ({ start: Math.min(a, b), end: Math.max(a, b) }));
        const diagnostics = dictionaryDiagnostics(text, [{ category: 'term', match: 'a', mode: 'exact' }], true, excluded);
        const expected = chars.flatMap((char, index) =>
          char === 'a' && !excluded.some(range => range.start <= index && index < range.end) ? [index] : []);
        expect(diagnostics.map(d => d.range.start.character)).toEqual(expected);
      },
    ), { seed: 20261027, numRuns: 50 });
  });
});

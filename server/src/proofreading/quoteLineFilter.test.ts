import fc from 'fast-check';
import { findQuoteLineRanges } from './quoteLineFilter';

describe('引用行の位置と境界', () => {
  it('有効な記号で始まる行のみ除外し、改行と空記号を誤認しない', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ quoted: fc.boolean(), indent: fc.constantFrom('', ' ', '\t'), body: fc.constantFrom('資料', '😀かな', 'plain') }), { minLength: 1, maxLength: 30 }),
      fc.constantFrom('\n', '\r\n'), fc.boolean(),
      (lines, newline, trailing) => {
        const text = lines.map(line => `${line.indent}${line.quoted ? '>>' : ''}${line.body}`).join(newline) + (trailing ? newline : '');
        const ranges = findQuoteLineRanges(text, 'plaintext', [], [], { enable: true, markers: ['', '>>'] });
        const expected = lines.filter(line => line.quoted).map(line => `${line.indent}>>${line.body}`);
        expect(ranges.map(range => text.slice(range.start, range.end).replace(/\r$/, ''))).toEqual(expected);
        expect(findQuoteLineRanges(text, 'plaintext', [], [], { enable: false, markers: ['>>'] })).toEqual([]);
      },
    ), { seed: 20261027, numRuns: 100 });
  });

  it('複数文字の記号は正規表現ではなく文字列として扱う', () => {
    const text = '.* 引用\n.X 本文';
    const ranges = findQuoteLineRanges(text, 'plaintext', [], [], { enable: true, markers: ['.*'] });
    expect(ranges.map(range => text.slice(range.start, range.end))).toEqual(['.* 引用']);
  });
});

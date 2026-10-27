import * as fc from 'fast-check';
import { MarkdownFilter } from '../markdownFilter';
import { findHtmlTagRanges } from './htmlTagRanges';

describe('Markdown HTMLタグの境界', () => {
  it('タグと属性のみを除外し、本文とUTF-16位置を保持する', () => {
    const text = '<a title="1 > 0。注意！" disabled href="/path">案内😀資料</a>を確認。';
    const filtered = new MarkdownFilter().filter(text);
    const tags = filtered.excludedRanges.filter(r => r.type === 'html-tag');
    expect(tags.map(r => text.slice(r.start, r.end))).toEqual([
      '<a title="1 > 0。注意！" disabled href="/path">', '</a>'
    ]);
    expect(filtered.filteredText.length).toBe(text.length);
    const start = text.indexOf('案内😀資料');
    expect(filtered.filteredText.slice(start, start + '案内😀資料'.length)).toBe('案内😀資料');
    for (const tag of tags) expect(filtered.filteredText.slice(tag.start, tag.end)).toBe(' '.repeat(tag.end - tag.start));
  });

  it('コード、エスケープ、コメント、未完成タグ、自動リンクはタグとして扱わない', () => {
    const text = '`<a title="x">` \\<b> <!-- <i> --> <a title="未完了\n<https://example.com> 1 < 2';
    const result = new MarkdownFilter().filter(text);
    expect(result.excludedRanges.filter(r => r.type === 'html-tag')).toEqual([]);
    expect(result.filteredText).toContain('1 < 2');
  });

  it('属性値が変わっても表示文と位置が変化しない', () => {
    fc.assert(fc.property(fc.stringMatching(/^[a-z0-9]{0,80}$/), value => {
      const text = `<a title="${value}">案内資料</a>を確認。`;
      const ranges = findHtmlTagRanges(text, []);
      expect(ranges.map(r => text.slice(r.start, r.end))).toEqual([`<a title="${value}">`, '</a>']);
      const filtered = new MarkdownFilter().filter(text).filteredText;
      const pos = text.indexOf('案内資料');
      expect(filtered.slice(pos, pos + 4)).toBe('案内資料');
      expect(filtered.length).toBe(text.length);
    }), { numRuns: 50, seed: 20261027 });
  });
});

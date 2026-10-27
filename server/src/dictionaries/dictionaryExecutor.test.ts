import * as path from 'node:path';
import * as fc from 'fast-check';
import { DictionaryExecutor } from './dictionaryExecutor';

const worker = path.resolve('server/out/dictionaryWorker.js');
const request = (text: string, match: string, mode: 'exact' | 'regex' = 'exact') => ({
  text,
  entries: [{ category: 'term', match, mode }],
  checkInBrackets: true,
});

describe('辞書Workerの実行境界', () => {
  it('生成した英単語列を実Workerへ渡し、既知の正誤と位置を照合する', async () => {
    const words = fc.sample(fc.constantFrom('hello', 'environment', 'reasearch'), { seed: 20261027, numRuns: 60 });
    words.push('reasearch', 'hello');
    const text = words.join(' ');
    let offset = 0;
    const expected: Array<{ start: { line: number; character: number }; end: { line: number; character: number } }> = [];
    for (const word of words) {
      if (word === 'reasearch') expected.push({ start: { line: 0, character: offset }, end: { line: 0, character: offset + word.length } });
      offset += word.length + 1;
    }
    const result = await new DictionaryExecutor(worker).runSpell({ kind: 'spell', text, words: [], excludedRanges: [] });
    expect(result.truncated).toBe(false);
    expect(result.diagnostics.map(d => d.range)).toEqual(expected);
    expect(result.diagnostics.every(d => d.suggestions?.includes('research'))).toBe(true);
  }, 10000);

  it('スペル診断の1000件境界と超過を区別する', async () => {
    const executor = new DictionaryExecutor(worker);
    const run = (count: number) => executor.runSpell({ kind: 'spell', text: Array(count).fill('reasearch').join(' '), words: [], excludedRanges: [] });
    const exact = await run(1000);
    expect(exact.diagnostics).toHaveLength(1000);
    expect(exact.truncated).toBe(false);
    const excess = await run(1001);
    expect(excess.diagnostics).toHaveLength(1000);
    expect(excess.truncated).toBe(true);
  }, 10000);

  it('生成した繰り返しと区切りを実Workerで照合し、除外範囲を跨がない', async () => {
    const cases = fc.sample(fc.record({
      first: fc.constantFrom('hello', 'Hello', 'world'),
      second: fc.constantFrom('hello', 'HELLO', 'world'),
      gap: fc.constantFrom(' ', '\t', ', ', '       '),
    }), { seed: 20261027, numRuns: 50 });
    cases.push({ first: 'Hello', second: 'hello', gap: ' ' }, { first: 'hello', second: 'hello', gap: '       ' });
    let offset = 0;
    const excludedRanges: Array<{ start: number; end: number }> = [];
    const expected: Array<{ line: number; character: number }> = [];
    const text = cases.map((item, line) => {
      if (item.gap === '       ') excludedRanges.push({ start: offset + item.first.length + 1, end: offset + item.first.length + 6 });
      else if ((item.gap === ' ' || item.gap === '\t') && item.first.toLowerCase() === item.second.toLowerCase()) {
        expected.push({ line, character: item.first.length + item.gap.length });
      }
      const value = `${item.first}${item.gap}${item.second}\n`;
      offset += value.length;
      return value;
    }).join('');
    const result = await new DictionaryExecutor(worker).runSpell({ kind: 'spell', text, words: [], excludedRanges, checkRepeat: true });
    expect(result.diagnostics.filter(d => d.code === 'spell-repeat').map(d => d.range.start)).toEqual(expected);
  }, 10000);

  it('生成したファイル名を実Workerで除外し、文末の誤字とUTF-16位置を維持する', async () => {
    const names = fc.sample(fc.array(fc.constantFrom('a', 'b', 'c', 'd', 'x'), { minLength: 3, maxLength: 20 })
      .map(chars => chars.join('')), { seed: 20261027, numRuns: 60 });
    const extensions = ['json', 'yaml', 'txt'];
    const lines = names.map((name, index) => `😀${name}.${extensions[index % extensions.length]} reasearch.`);
    const result = await new DictionaryExecutor(worker).runSpell({
      kind: 'spell', text: lines.join('\n'), words: [], excludedRanges: [], checkRepeat: true,
    });
    expect(result.truncated).toBe(false);
    expect(result.diagnostics.map(d => d.range.start)).toEqual(lines.map((line, index) => ({ line: index, character: line.indexOf('reasearch') })));
    expect(result.diagnostics.every(d => d.code === 'spell-unknown-word' && d.suggestions?.includes('research'))).toBe(true);
  }, 10000);

  it('ファイル名を挟む同じ単語は連続した繰り返しにしない', async () => {
    const result = await new DictionaryExecutor(worker).runSpell({
      kind: 'spell', text: 'hello tsconfig.json hello. hello hello.', words: [], excludedRanges: [], checkRepeat: true,
    });
    expect(result.diagnostics.filter(d => d.code === 'spell-repeat').map(d => d.range.start.character)).toEqual([33]);
    expect(result.diagnostics.filter(d => d.code === 'spell-unknown-word')).toEqual([]);
  }, 10000);

  it('長い記号列の後も実Workerが終了し、後続の誤字を検出する', async () => {
    const text = '.'.repeat(200000) + ' reasearch.';
    const result = await new DictionaryExecutor(worker).runSpell({ kind: 'spell', text, words: [], excludedRanges: [] });
    expect(result.truncated).toBe(false);
    expect(result.diagnostics.map(d => [d.code, d.range.start.character])).toEqual([['spell-unknown-word', 200001]]);
    expect(result.diagnostics[0].suggestions).toContain('research');
  }, 10000);

  it('メールアドレス全体を除外し、形式が不足する宛先と通常文の誤字は検査する', async () => {
    const text = 'reasearch+tag@example.com! reasearch@foo.co.jp reasearch@localhost reasearch.';
    const result = await new DictionaryExecutor(worker).runSpell({ kind: 'spell', text, words: [], excludedRanges: [] });
    const offsets = result.diagnostics.filter(d => text.slice(d.range.start.character, d.range.end.character) === 'reasearch')
      .map(d => d.range.start.character);
    expect(offsets).toEqual([text.indexOf('reasearch@localhost'), text.lastIndexOf('reasearch.')]);
    expect(result.truncated).toBe(false);
  }, 10000);

  it('生成したメール形式と通常文を実Workerで区別する', async () => {
    const cases = fc.sample(fc.constantFrom(
      { domain: 'example.com', valid: true }, { domain: 'foo.co.jp', valid: true },
      { domain: 'localhost', valid: false }, { domain: 'example.c', valid: false },
    ), { seed: 20261027, numRuns: 60 });
    const lines = cases.map(item => `reasearch@${item.domain} reasearch.`);
    const expected = cases.flatMap((item, line) => [
      ...(!item.valid ? [{ line, character: 0 }] : []),
      { line, character: lines[line].lastIndexOf('reasearch.') },
    ]);
    const result = await new DictionaryExecutor(worker).runSpell({ kind: 'spell', text: lines.join('\n'), words: [], excludedRanges: [] });
    const actual = result.diagnostics.filter(d => lines[d.range.start.line].slice(d.range.start.character, d.range.end.character) === 'reasearch')
      .map(d => d.range.start);
    expect(result.truncated).toBe(false);
    expect(actual).toEqual(expected);
  }, 10000);

  it('繰り返し診断でも1000件境界と超過を区別する', async () => {
    const executor = new DictionaryExecutor(worker);
    const run = (count: number) => executor.runSpell({ kind: 'spell', text: Array(count).fill('hello').join(' '), words: [], excludedRanges: [], checkRepeat: true });
    const exact = await run(1001);
    expect(exact.diagnostics.filter(d => d.code === 'spell-repeat')).toHaveLength(1000);
    expect(exact.truncated).toBe(false);
    const excess = await run(1002);
    expect(excess.diagnostics.filter(d => d.code === 'spell-repeat')).toHaveLength(1000);
    expect(excess.truncated).toBe(true);
  }, 10000);
  it('実Workerで通常一致と元文書の範囲を返す', async () => {
    const result = await new DictionaryExecutor(worker).run(request('😀資料\n資料', '資料'));
    expect(result.truncated).toBe(false);
    expect(result.diagnostics.map(d => d.range)).toEqual([
      { start: { line: 0, character: 2 }, end: { line: 0, character: 4 } },
      { start: { line: 1, character: 0 }, end: { line: 1, character: 2 } },
    ]);
    expect(result.diagnostics.map(d => d.code)).toEqual(['dictionary-term', 'dictionary-term']);
  });

  it('結果数に達した場合は切捨てを明示し、境界ちょうどは切捨てとしない', async () => {
    const executor = new DictionaryExecutor(worker);
    const exact = await executor.run(request('a'.repeat(1000), 'a'));
    expect(exact.diagnostics).toHaveLength(1000);
    expect(exact.truncated).toBe(false);
    const over = await executor.run(request('a'.repeat(1001), 'a'));
    expect(over.diagnostics).toHaveLength(1000);
    expect(over.truncated).toBe(true);
  });

  it('過大な正規表現を期限内に停止し、後続の正常実行は成功する', async () => {
    const executor = new DictionaryExecutor(worker, 1000);
    let eventLoopRan = false;
    const tick = setTimeout(() => { eventLoopRan = true; }, 50);
    try {
      await expect(executor.run(request('a'.repeat(40000) + '!', '(a+)+$', 'regex')))
        .rejects.toThrow(/timed out/);
      expect(eventLoopRan).toBe(true);
      const recovered = await new DictionaryExecutor(worker).run(request('資料', '資料'));
      expect(recovered.diagnostics).toHaveLength(1);
    } finally {
      clearTimeout(tick);
    }
  }, 10000);

  it('Worker起動失敗を成功扱いせず、次の正常要求は成功する', async () => {
    await expect(new DictionaryExecutor(path.resolve('server/out/no-such-worker.js')).run(request('資料', '資料')))
      .rejects.toThrow();
    expect((await new DictionaryExecutor(worker).run(request('資料', '資料'))).diagnostics).toHaveLength(1);
  }, 10000);

  it('空き待ちの期限切れを通知し、Worker終了後は正常要求が進む', async () => {
    const slow = new DictionaryExecutor(worker, 1200);
    const bad = request('a'.repeat(40000) + '!', '(a+)+$', 'regex');
    const first = slow.run(bad).then(() => 'unexpected', () => 'timeout');
    const second = slow.run(bad).then(() => 'unexpected', () => 'timeout');
    await expect(new DictionaryExecutor(worker, 150).run(request('資料', '資料')))
      .rejects.toThrow(/timed out while queued/);
    expect(await Promise.all([first, second])).toEqual(['timeout', 'timeout']);
    expect((await new DictionaryExecutor(worker).run(request('資料', '資料'))).diagnostics).toHaveLength(1);
  }, 10000);
});

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProofreadingDictionaryLoader } from './proofreadingDictionaryLoader';

describe('校正辞書の読込上限', () => {
  let directory: string;
  beforeAll(async () => {
    const parent = path.join(os.homedir(), 'tmp');
    await fs.mkdir(parent, { recursive: true });
    directory = await fs.mkdtemp(path.join(parent, 'otak-issue8-dictionary-'));
  });
  afterAll(async () => {
    if (directory && path.dirname(directory) === path.join(os.homedir(), 'tmp') && path.basename(directory).startsWith('otak-issue8-dictionary-')) {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });

  it('各形式は2 MiBを超えるファイルを読み込まず失敗を返す', async () => {
    const file = path.join(directory, 'oversize.txt');
    await fs.writeFile(file, Buffer.alloc(2 * 1024 * 1024 + 1, 'a'));
    const loader = new ProofreadingDictionaryLoader();
    for (const result of await Promise.all([
      loader.loadJsonDictionary(file), loader.loadRuleDictionary(file), loader.loadSpellDictionary(file),
    ])) {
      expect(result.success).toBe(false);
      expect(result.entries).toEqual([]);
      expect(result.error).toMatch(/2097152/);
    }
  });

  it('2 MiBちょうどは受理する', async () => {
    const file = path.join(directory, 'boundary.txt');
    await fs.writeFile(file, Buffer.alloc(2 * 1024 * 1024, ' '));
    const result = await new ProofreadingDictionaryLoader().loadSpellDictionary(file);
    expect(result.success).toBe(true);
    expect(result.entries).toEqual([]);
  });

  it('小さい3種類の辞書は実ファイルから読み、欠落ファイルは失敗を返す', async () => {
    const json = path.join(directory, 'proofreading.json');
    const rules = path.join(directory, 'rules.json');
    const spell = path.join(directory, 'spell.txt');
    await Promise.all([
      fs.writeFile(json, JSON.stringify([{ category: 'term', match: '資料', replace: '文書' }])),
      fs.writeFile(rules, JSON.stringify([{ pattern: 'abc', message: '禁止', severity: 'warn' }])),
      fs.writeFile(spell, 'alpha\nbeta\n'),
    ]);
    const loader = new ProofreadingDictionaryLoader();
    expect((await loader.loadJsonDictionary(json)).entries.map(entry => entry.match)).toEqual(['資料']);
    expect((await loader.loadRuleDictionary(rules)).entries.map(entry => entry.pattern)).toEqual(['abc']);
    expect((await loader.loadSpellDictionary(spell)).entries.map(entry => entry.word)).toEqual(['alpha', 'beta']);
    expect((await loader.loadJsonDictionary(path.join(directory, 'missing.json'))).success).toBe(false);
  });

  it('壊れたJSONと配列以外のJSONを成功として扱わない', async () => {
    const invalid = path.join(directory, 'invalid.json');
    const object = path.join(directory, 'object.json');
    await Promise.all([fs.writeFile(invalid, '{'), fs.writeFile(object, '{}')]);
    const loader = new ProofreadingDictionaryLoader();
    for (const file of [invalid, object]) {
      expect((await loader.loadJsonDictionary(file)).success).toBe(false);
      expect((await loader.loadRuleDictionary(file)).success).toBe(false);
    }
  });

  it('空配列と、全項目が不正な配列を区別する', async () => {
    const empty = path.join(directory, 'empty-array.json');
    const invalid = path.join(directory, 'invalid-entries.json');
    await Promise.all([fs.writeFile(empty, '[]'), fs.writeFile(invalid, '[null,{}]')]);
    const loader = new ProofreadingDictionaryLoader();
    for (const load of [loader.loadJsonDictionary.bind(loader), loader.loadRuleDictionary.bind(loader)]) {
      expect(await load(empty)).toMatchObject({ success: true, entries: [], invalidEntries: 0 });
      expect(await load(invalid)).toMatchObject({ success: true, entries: [], invalidEntries: 2 });
    }
  });

  it('読込失敗を警告し、他の有効な辞書は読み込む', async () => {
    const valid = path.join(directory, 'valid.json');
    await fs.writeFile(valid, JSON.stringify([{ category: 'term', match: '資料' }]));
    const logger = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const result = await new ProofreadingDictionaryLoader(logger).loadAndMergeDictionaries([
      path.join(directory, 'missing.json'), valid,
    ]);
    expect(result.map(entry => entry.match)).toEqual(['資料']);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    expect(logger.warn.mock.calls[0][0]).toContain('missing.json');
  });

  it('上限内の多数の項目をマージしても引数数上限で失敗しない', async () => {
    const file = path.join(directory, 'many-entries.json');
    await fs.writeFile(file, `[${Array(130000).fill('{"match":"a"}').join(',')}]`);
    const result = await new ProofreadingDictionaryLoader().loadAndMergeDictionaries([file]);
    expect(result).toHaveLength(130000);
    expect(result[0].match).toBe('a');
    expect(result[result.length - 1].match).toBe('a');
  });
});

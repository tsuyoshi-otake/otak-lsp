import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { DictionaryExecutor } from '../dictionaries/dictionaryExecutor';
import { createDocumentAnalyzer } from './documentAnalyzer';
import { resolveConfiguration } from './configManager';
import { buildCodeActions } from './codeActionProvider';

describe('Issue #8: 文書別の校正辞書', () => {
  let directory: string;
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
    new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager(), undefined,
    new DictionaryExecutor(path.resolve('server/out/dictionaryWorker.js'), 1500),
  );
  beforeAll(async () => {
    const parent = path.join(os.homedir(), 'tmp');
    await fs.mkdir(parent, { recursive: true });
    directory = await fs.mkdtemp(path.join(parent, 'otak-issue8-integration-'));
  });
  afterAll(async () => {
    if (directory && path.dirname(directory) === path.join(os.homedir(), 'tmp') && path.basename(directory).startsWith('otak-issue8-integration-')) {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
  async function analyze(text: string, files: string[], name = 'document.txt') {
    const config = resolveConfiguration({ proofreading: { dictionaries: { proofreading: files } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, name)).href, 'plaintext', 1, text);
    return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
  }

  it('送り仮名チェックを公開設定で切り替え、mergeでは高度設定を維持する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'okurigana-enable.txt')).href, 'plaintext', 1,
      '文章を表わす。');
    const run = async (enabled: boolean, mode: 'override' | 'merge', advanced: boolean) => {
      const config = resolveConfiguration({
        advanced: { enableOkuriganaVariant: advanced },
        proofreading: { mergeMode: mode, termBase: { enable: true, okurigana: enabled } },
      });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => d.code === 'okurigana-variant').map(d => document.getText(d.range));
    };
    expect(await run(true, 'override', false)).toEqual(['表わす']);
    expect(await run(false, 'override', true)).toEqual([]);
    expect(await run(false, 'merge', false)).toEqual([]);
    expect(await run(false, 'merge', true)).toEqual(['表わす']);
  }, 20000);

  it('公用文や送り仮名の付け方で許容される表記を誤りとして警告しない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'okurigana-accepted.txt')).href, 'plaintext', 1,
      '表わす。行なう。売上げ。取扱い。贈物。');
    const config = resolveConfiguration({ proofreading: { termBase: { enable: true, okurigana: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'okurigana-variant');
    expect(diagnostics.map(d => document.getText(d.range))).toEqual(['表わす', '行なう', '売上げ', '取扱い', '贈物']);
    for (const diagnostic of diagnostics) {
      expect(diagnostic.severity).toBe(3);
      expect(diagnostic.message).toContain('許容');
    }
  }, 20000);

  it('送り仮名の有効設定と許容形は実並列Workerにも反映する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'okurigana-worker.txt')).href, 'plaintext', 1, '表わす。贈物。');
      const run = async (enabled: boolean) => {
        const config = resolveConfiguration({ proofreading: { termBase: { enable: true, okurigana: enabled } } });
        config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
        const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
        expect(manager.hasActiveWorkerPool()).toBe(true);
        return result.diagnostics.filter(d => d.code === 'okurigana-variant')
          .map(d => [document.getText(d.range), d.severity]);
      };
      expect(await run(true)).toEqual([['表わす', 3], ['贈物', 3]]);
      expect(await run(false)).toEqual([]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('旧字体と常用漢字の設定は独立し、旧字体だけの選択は別の表記ゆれを有効にしない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'old-kanji.txt')).href, 'plaintext', 1,
      '鑛山と噂。出来る。');
    const run = async (oldKanji: boolean, jouyouKanji: boolean) => {
      const config = resolveConfiguration({
        proofreading: {
          termBase: { enable: true, oldKanji, jouyouKanji, excludeProperNouns: false },
          notationVariant: { enable: false },
        },
      });
      config.advancedConfig.excludeJinmeiKanji = false;
      config.advancedConfig.excludePlaceNames = false;
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => ['jouyou-kanji', 'orthography-variant'].includes(String(d.code)))
        .map(d => [d.code, document.getText(d.range), d.message]);
    };
    const oldOnly = await run(true, false);
    expect(oldOnly.map(([code, text]) => [code, text])).toEqual([['jouyou-kanji', '鑛']]);
    expect(oldOnly[0][2]).toContain('鉱');
    expect(await run(false, false)).toEqual([]);
    const all = await run(true, true);
    expect(all.map(([code, text]) => [code, text])).toEqual([['jouyou-kanji', '鑛'], ['jouyou-kanji', '噂']]);
    expect(all[0][2]).toContain('常用漢字表の索引');
    expect((await run(false, true)).map(([code, text]) => [code, text])).toEqual([['jouyou-kanji', '鑛'], ['jouyou-kanji', '噂']]);
  }, 20000);

  it('旧字体の参考字体と固有名詞の除外を実文書の設定から判定する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'old-kanji-names.md')).href, 'markdown', 1,
      '鑛山。漢字。澤田さん。廣島市。`鑛山` [表示](https://example.test/鑛山)');
    const run = async (excludeProperNouns: boolean) => {
      const config = resolveConfiguration({ proofreading: {
        termBase: { enable: true, oldKanji: true, jouyouKanji: false, excludeProperNouns },
        notationVariant: { enable: false },
      } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const unfiltered = (await run(false)).diagnostics.filter(d => d.code === 'jouyou-kanji');
    expect(unfiltered.map(d => document.getText(d.range))).toEqual(['鑛', '漢', '澤', '廣']);
    expect(unfiltered.map(d => d.data.suggestions[0])).toEqual([
      '「鉱」に変更する（常用漢字表の字体）', '「漢」に変更する（常用漢字表の字体）',
      '「沢」に変更する（常用漢字表の字体）', '「広」に変更する（常用漢字表の字体）',
    ]);
    expect(buildCodeActions(document, unfiltered).some(action => action.title === '修正案: 「鉱」に変更する（常用漢字表の字体）')).toBe(true);
    const filtered = (await run(true)).diagnostics.filter(d => d.code === 'jouyou-kanji');
    expect(filtered.map(d => document.getText(d.range))).not.toContain('澤');
    expect(filtered.map(d => document.getText(d.range))).not.toContain('廣');
    expect(filtered.map(d => document.getText(d.range))).toContain('鑛');
  }, 20000);

  it('異体字セレクターが続く旧字体を基底文字だけのクイックフィックスで置換しない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'old-kanji-ivs.txt')).href, 'plaintext', 1,
      '鑛\uFE00山。鑛\u{E0100}山。鑛山。');
    const config = resolveConfiguration({ proofreading: {
      termBase: { enable: true, oldKanji: true, jouyouKanji: false, excludeProperNouns: false },
      notationVariant: { enable: false },
    } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'jouyou-kanji');
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0].data.suggestions ?? []).toEqual([]);
    expect(diagnostics[1].data.suggestions ?? []).toEqual([]);
    const actions = buildCodeActions(document, diagnostics.slice(0, 2));
    expect(actions).toHaveLength(2);
    expect(actions.every(action => action.title === 'この行の診断を抑制: jouyou-kanji')).toBe(true);
    expect(diagnostics[2].data.suggestions).toContain('「鉱」に変更する（常用漢字表の字体）');
  }, 20000);

  it('mergeでは高度側の常用漢字チェックが有効なら旧字体以外も維持する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'old-kanji-merge.txt')).href, 'plaintext', 1, '鑛山と噂。');
    const run = async (advanced: boolean) => {
      const config = resolveConfiguration({
        official: { enableJouyouKanji: advanced, excludeProperNounsFromJouyouKanji: false },
        proofreading: { mergeMode: 'merge', termBase: { enable: true, oldKanji: true, jouyouKanji: false, excludeProperNouns: false } },
      });
      config.advancedConfig.excludeJinmeiKanji = false;
      config.advancedConfig.excludePlaceNames = false;
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.filter(d => d.code === 'jouyou-kanji').map(d => document.getText(d.range));
    };
    expect(await run(false)).toEqual(['鑛']);
    expect(await run(true)).toEqual(['鑛', '噂']);
  }, 20000);

  it('旧字体だけの設定と候補は実並列Workerにも反映する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'old-kanji-worker.txt')).href, 'plaintext', 1, '鑛山と噂。出来る。');
      const config = resolveConfiguration({ proofreading: {
        termBase: { enable: true, oldKanji: true, jouyouKanji: false, excludeProperNouns: false },
        notationVariant: { enable: false },
      } });
      config.advancedConfig.excludeJinmeiKanji = false;
      config.advancedConfig.excludePlaceNames = false;
      config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
      const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(manager.hasActiveWorkerPool()).toBe(true);
      const diagnostics = result.diagnostics.filter(d => ['jouyou-kanji', 'orthography-variant'].includes(String(d.code)));
      expect(diagnostics.map(d => [d.code, document.getText(d.range)])).toEqual([['jouyou-kanji', '鑛']]);
      expect(diagnostics[0].data.suggestions).toContain('「鉱」に変更する（常用漢字表の字体）');
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('表記ゆれをカタカナ語のみに限定し、他カテゴリとmergeの優先順位を維持する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'notation-scope.txt')).href, 'plaintext', 1,
      '出来る。サーバを使う。ｶﾀｶﾅ。3カ月。');
    const run = async (katakanaOnly: boolean, mode: 'override' | 'merge', advanced: boolean, oldKanji: boolean) => {
      const config = resolveConfiguration({
        advanced: { enableOrthographyVariant: advanced },
        proofreading: { mergeMode: mode, termBase: { enable: true, oldKanji }, notationVariant: { enable: true, katakanaOnly } },
      });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => ['orthography-variant', 'katakana-chouon', 'halfwidth-kana'].includes(String(d.code)))
        .map(d => [d.code, document.getText(d.range)]);
    };
    const all = [['orthography-variant', '出来る'], ['katakana-chouon', 'サーバ'], ['halfwidth-kana', 'ｶﾀｶﾅ'], ['orthography-variant', 'カ月']];
    const kana = [['katakana-chouon', 'サーバ'], ['halfwidth-kana', 'ｶﾀｶﾅ']];
    expect(await run(false, 'override', false, true)).toEqual(all);
    expect(await run(true, 'override', true, true)).toEqual(kana);
    expect(await run(true, 'override', true, false)).toEqual(kana);
    expect(await run(true, 'merge', false, true)).toEqual(kana);
    expect(await run(true, 'merge', true, true)).toEqual(all);
  }, 20000);

  it('表記ゆれのカタカナ語限定はMarkdown除外と独立した英字幅の診断を保つ', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'notation-scope.md')).href, 'markdown', 1,
      'サーバ。出来る。ＡＢＣ ABCD。 `サーバ 出来る` [表示](https://example.test/サーバ)');
    const config = resolveConfiguration({ proofreading: { notationVariant: { enable: true, katakanaOnly: true }, charType: { preferredAlphabet: 'full' } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'katakana-chouon').map(d => document.getText(d.range))).toEqual(['サーバ']);
    expect(result.diagnostics.filter(d => d.code === 'orthography-variant')).toEqual([]);
    expect(result.diagnostics.filter(d => d.code === 'alphabet-width').map(d => document.getText(d.range))).toEqual(['ABCD']);
  }, 20000);

  it('カタカナ語限定では半角句読点や単独の長音・濁点を語として扱わない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'kana-punctuation.txt')).href, 'plaintext', 1,
      '｡ ｶﾀ｡ ｰ ﾞ ｱ');
    const run = async (katakanaOnly: boolean, mode: 'override' | 'merge' = 'override', advancedKana = false, advancedOrthography = false) => {
      const config = resolveConfiguration({ advanced: { enableHalfwidthKana: advancedKana, enableOrthographyVariant: advancedOrthography }, proofreading: { mergeMode: mode, notationVariant: { enable: true, katakanaOnly } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.filter(d => d.code === 'halfwidth-kana').map(d => document.getText(d.range));
    };
    expect(await run(false)).toEqual(['｡', 'ｶﾀ｡', 'ｰ', 'ﾞ', 'ｱ']);
    expect(await run(true)).toEqual(['ｶﾀ', 'ｱ']);
    expect(await run(true, 'merge', false, true)).toEqual(['ｶﾀ', 'ｱ']);
    expect(await run(true, 'merge', true, false)).toEqual(['｡', 'ｶﾀ｡', 'ｰ', 'ﾞ', 'ｱ']);
  }, 20000);

  it('表記ゆれのカタカナ語限定は実並列Workerにも反映する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'notation-worker.txt')).href, 'plaintext', 1, '出来る。サーバ。ｶﾀｶﾅ｡ ｰ。3カ月。');
      const run = async (katakanaOnly: boolean) => {
        const config = resolveConfiguration({ proofreading: { notationVariant: { enable: true, katakanaOnly } } });
        config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
        const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
        expect(manager.hasActiveWorkerPool()).toBe(true);
        return result.diagnostics.filter(d => ['orthography-variant', 'katakana-chouon', 'halfwidth-kana'].includes(String(d.code)))
          .map(d => [d.code, document.getText(d.range)]);
      };
      expect(await run(false)).toEqual([['orthography-variant', '出来る'], ['katakana-chouon', 'サーバ'], ['halfwidth-kana', 'ｶﾀｶﾅ｡'], ['halfwidth-kana', 'ｰ'], ['orthography-variant', 'カ月']]);
      expect(await run(true)).toEqual([['katakana-chouon', 'サーバ'], ['halfwidth-kana', 'ｶﾀｶﾅ']]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('私用領域の境界とUTF-16位置を検出し、設定で無効にできる', async () => {
    // Unicode の私用領域の両端。補助面の文字は UTF-16 で2単位。
    const points = [0xE000, 0xF8FF, 0xF0000, 0xFFFFD, 0x100000, 0x10FFFD];
    const chars = points.map(point => String.fromCodePoint(point));
    const outside = [0xD7FF, 0xF900, 0xEFFFD, 0xFFFFE, 0x10FFFE, 0x1F600].map(point => String.fromCodePoint(point));
    const text = `😀${chars.join('')}${outside.join('')}`;
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'private-use.txt')).href, 'plaintext', 1, text);
    const run = async (enable: boolean, checkUserCreatedGaiji: boolean, mode: 'all' | 'partial') => {
      const config = resolveConfiguration({ proofreading: { envDependent: { enable, checkUserCreatedGaiji, mode } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => d.code === 'private-use-character');
    };
    for (const mode of ['all', 'partial'] as const) {
      const diagnostics = await run(true, true, mode);
      expect(diagnostics.map(d => document.getText(d.range))).toEqual(chars);
      let offset = '😀'.length;
      for (const [index, char] of chars.entries()) {
        expect(diagnostics[index].range).toEqual({ start: document.positionAt(offset), end: document.positionAt(offset + char.length) });
        offset += char.length;
      }
    }
    expect(await run(false, true, 'all')).toEqual([]);
    expect(await run(true, false, 'all')).toEqual([]);
  }, 20000);

  it('私用領域の検査はMarkdownのコード・リンク先と引用行を除外する', async () => {
    const text = '本文\uE000 `\uE001` [表示](https://example.test/\uE002)\n> 引用\uE003\n本文\u{F0000}';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'private-use.md')).href, 'markdown', 1, text);
    const config = resolveConfiguration({ proofreading: { envDependent: { enable: true, checkUserCreatedGaiji: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.filter(d => d.code === 'private-use-character').map(d => document.getText(d.range)))
      .toEqual(['\uE000', '\u{F0000}']);
  }, 20000);

  it('私用領域はコード文字列を除外し、コメントと括弧内を検査する', async () => {
    const text = 'const value = "\uE000"; // 注記（\uE001）';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'private-use.js')).href, 'javascript', 1, text);
    const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets: false }, envDependent: { enable: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.filter(d => d.code === 'private-use-character').map(d => document.getText(d.range))).toEqual(['\uE001']);
  }, 20000);

  it('上限内の多数の私用領域でも解析が完了し、診断上限と省略件数を通知する', async () => {
    const text = '\uE000'.repeat(130000);
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'many-private-use.txt')).href, 'plaintext', 1, text);
    const config = resolveConfiguration({ maxNumberOfProblems: 3, proofreading: { envDependent: { enable: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, true, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.filter(d => d.code === 'private-use-character').map(d => d.range.start.character)).toEqual([0, 1, 2]);
    expect(result.omittedDiagnostics).toBe(129997);
    expect(result.diagnostics.find(d => d.code === 'diagnostics-truncated')?.message).toContain('129,997');
  }, 60000);

  it('スペル検査を有効にすると誤記を検出し、正しい英単語には診断しない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell.txt')).href, 'plaintext', 1, 'hello reasearch environment');
    const run = async (enable: boolean) => {
      const config = resolveConfiguration({ proofreading: { spell: { enable } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const enabled = await run(true);
    const diagnostics = enabled.diagnostics.filter(d => d.code === 'spell-unknown-word');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range).toEqual({ start: { line: 0, character: 6 }, end: { line: 0, character: 15 } });
    expect(diagnostics[0].data.suggestions).toContain('research');
    expect(buildCodeActions(document, diagnostics).some(action => action.title === '修正案: research')).toBe(true);
    expect((await run(false)).diagnostics.some(d => d.code === 'spell-unknown-word')).toBe(false);
  }, 20000);

  it('既存用語辞書の正規表記を受け入れ、誤表記は未知語として検出する', async () => {
    // 用語辞書の契約: nginx / Kubernetes は正規表記、ngnix / kubernates は誤表記。
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'technical-spell.txt')).href, 'plaintext', 1, 'nginx ngnix kubernetes kubernates reasearch');
    const config = resolveConfiguration({ proofreading: { spell: { enable: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.filter(d => d.code === 'spell-unknown-word').map(d => document.getText(d.range)))
      .toEqual(['ngnix', 'kubernates', 'reasearch']);
  }, 20000);

  it('ファイル名・パスの断片を指摘せず、文末の英語の誤字は検出する', async () => {
    const text = '😀 tsconfig.json notes.txt .env config.yaml src/tsconfig.json README.md archive.tar.gz\n' +
      'See reasearch. reasearch, then research. user@example.com https://example.com/reasearch';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell-filenames.txt')).href, 'plaintext', 1, text);
    const config = resolveConfiguration({ proofreading: { spell: { enable: true, checkRepeat: false, checkUppercase: true, checkAllCaps: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    const diagnostics = result.diagnostics.filter(d => d.code === 'spell-unknown-word');
    expect(diagnostics.map(d => document.getText(d.range))).toEqual(['reasearch', 'reasearch']);
    for (const diagnostic of diagnostics) expect(diagnostic.data.suggestions).toContain('research');
    const offsets = [text.indexOf('reasearch. '), text.indexOf('reasearch,')];
    expect(diagnostics.map(d => d.range.start)).toEqual(offsets.map(offset => document.positionAt(offset)));
  }, 20000);

  it('英単語の先頭大文字と全大文字を独立した公開設定で検査する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell-case.md')).href, 'markdown', 1,
      'Reasearch REASEARCH reasearch Research RESEARCH Nginx NGINX. `Reasearch` [参照](https://example.com/REASEARCH)');
    const run = async (checkUppercase: boolean, checkAllCaps: boolean) => {
      const config = resolveConfiguration({ proofreading: { spell: { enable: true, checkRepeat: false, checkUppercase, checkAllCaps } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => d.code === 'spell-unknown-word');
    };
    const both = await run(true, true);
    expect(both.map(d => document.getText(d.range))).toEqual(['Reasearch', 'REASEARCH', 'reasearch']);
    expect(both[0].data.suggestions).toContain('Research');
    expect(both[1].data.suggestions).toContain('RESEARCH');
    expect(both[2].data.suggestions).toContain('research');
    expect((await run(false, true)).map(d => document.getText(d.range))).toEqual(['REASEARCH', 'reasearch']);
    expect((await run(true, false)).map(d => document.getText(d.range))).toEqual(['Reasearch', 'reasearch']);
    expect((await run(false, false)).map(d => document.getText(d.range))).toEqual(['reasearch']);
  }, 20000);

  it('大文字設定は文書ごとに独立し、繰り返し検査に影響しない', async () => {
    const text = 'Reasearch REASEARCH. Hello hello.';
    const run = async (name: string, enabled: boolean) => {
      const document = TextDocument.create(pathToFileURL(path.join(directory, name)).href, 'plaintext', 1, text);
      const config = resolveConfiguration({ proofreading: { spell: {
        enable: true, checkRepeat: true, checkUppercase: enabled, checkAllCaps: enabled,
      } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => ['spell-unknown-word', 'spell-repeat'].includes(String(d.code)))
        .map(d => [d.code, document.getText(d.range)]);
    };
    const [enabled, disabled] = await Promise.all([run('spell-case-on.txt', true), run('spell-case-off.txt', false)]);
    expect(enabled).toEqual([['spell-unknown-word', 'Reasearch'], ['spell-repeat', 'REASEARCH'], ['spell-unknown-word', 'REASEARCH'], ['spell-repeat', 'hello']]);
    expect(disabled).toEqual([['spell-repeat', 'REASEARCH'], ['spell-repeat', 'hello']]);
  }, 20000);

  it('追加辞書は先頭大文字と全大文字の検査にも適用する', async () => {
    await fs.writeFile(path.join(directory, 'spell-case-user.txt'), 'codexword\n');
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell-case-dictionary.txt')).href, 'plaintext', 1,
      'Codexword CODEXWORD Reasearch');
    const config = resolveConfiguration({ proofreading: {
      spell: { enable: true, checkUppercase: true, checkAllCaps: true }, dictionaries: { spell: ['spell-case-user.txt'] },
    } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'spell-unknown-word').map(d => document.getText(d.range))).toEqual(['Reasearch']);
  }, 20000);

  it('数字と英字の混在時に設定された優先幅を提案し、数字の混在許容とカテゴリ無効を反映する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'width.txt')).href, 'plaintext', 1, 'ＡＢＣ ABCD １２３ 1234');
    const run = async (preferredNumeral: string, preferredAlphabet: string, enable = true) => {
      const config = resolveConfiguration({ proofreading: { charType: { enable, preferredNumeral, preferredAlphabet } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.filter(d => d.code === 'number-width-mix' || d.code === 'alphabet-width')
        .map(d => ({ code: d.code, text: document.getText(d.range), suggestions: d.data.suggestions }));
    };
    expect(await run('full', 'full')).toEqual([
      { code: 'alphabet-width', text: 'ABCD', suggestions: ['「ＡＢＣＤ」に変更する'] },
      { code: 'number-width-mix', text: '1234', suggestions: ['「１２３４」に変更して統一する'] },
    ]);
    expect(await run('half', 'half')).toEqual([
      { code: 'alphabet-width', text: 'ＡＢＣ', suggestions: ['「ABC」に変更する'] },
      { code: 'number-width-mix', text: '１２３', suggestions: ['「123」に変更して統一する'] },
    ]);
    expect(await run('mix', 'half')).toEqual([
      { code: 'alphabet-width', text: 'ＡＢＣ', suggestions: ['「ABC」に変更する'] },
    ]);
    expect(await run('full', 'full', false)).toEqual([]);
  }, 20000);

  it('優先幅はmerge設定でも反映し、修正候補をCode Actionに渡す', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'width-merge.txt')).href, 'plaintext', 1, 'ＡＢＣ ABCD １２３ 1234');
    const config = resolveConfiguration({ proofreading: { mergeMode: 'merge', charType: { preferredNumeral: 'full', preferredAlphabet: 'full' } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'number-width-mix' || d.code === 'alphabet-width');
    expect(diagnostics.map(d => document.getText(d.range))).toEqual(['ABCD', '1234']);
    expect(buildCodeActions(document, diagnostics).map(action => action.title)).toEqual(expect.arrayContaining([
      '修正案: 「ＡＢＣＤ」に変更する', '修正案: 「１２３４」に変更して統一する',
    ]));
  }, 20000);

  it('数字と英字がそれぞれ単一幅のときは混在を指摘しない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'one-width.txt')).href, 'plaintext', 1, 'ＡＢＣ １２３');
    const config = resolveConfiguration({ proofreading: { charType: { preferredNumeral: 'half', preferredAlphabet: 'half' } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'number-width-mix' || d.code === 'alphabet-width')).toEqual([]);
  }, 20000);

  it('優先幅の診断はMarkdownコードとリンク先を除外し、表示本文を検査する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'width.md')).href, 'markdown', 1,
      'ＡＢＣ ABCD １２３ 1234 `ＸＹＺ 999` [参照](https://example.com/ＡＢＣ１２３)');
    const config = resolveConfiguration({ proofreading: { charType: { preferredNumeral: 'full', preferredAlphabet: 'full' } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'number-width-mix' || d.code === 'alphabet-width').map(d => document.getText(d.range)))
      .toEqual(['ABCD', '1234']);
  }, 20000);

  it('引用行設定のON/OFFで本文だけを診断し、位置とハイライト用トークンを維持する', async () => {
    const text = '私はは学校へ行く。\r\n> 私はは学校へ行く。\r\n| 私はは学校へ行く。\r\n私はは学校へ行く。';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'quotes.txt')).href, 'plaintext', 1, text);
    const run = async (enable: boolean) => {
      const config = resolveConfiguration({ proofreading: { quoteLine: { enable, markers: '>,|' } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const enabled = await run(true);
    const disabled = await run(false);
    expect(enabled.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([0, 3]);
    expect(disabled.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([0, 1, 2, 3]);
    expect(enabled.tokens.map(t => [t.surface, t.start, t.end])).toEqual(disabled.tokens.map(t => [t.surface, t.start, t.end]));
  }, 20000);

  it('引用記号の変更をMarkdownとコードコメントの実診断へ反映する', async () => {
    const config = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '>' } } });
    const markdown = TextDocument.create(pathToFileURL(path.join(directory, 'quotes.md')).href, 'markdown', 1,
      '> 私はは学校へ行く。\n私はは学校へ行く。');
    const code = TextDocument.create(pathToFileURL(path.join(directory, 'quotes.js')).href, 'javascript', 1,
      '// > 私はは学校へ行く。\n// 私はは学校へ行く。');
    for (const document of [markdown, code]) {
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([1]);
    }
    const custom = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '##' } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'custom-quotes.txt')).href, 'plaintext', 1,
      '## 私はは学校へ行く。\n> 私はは学校へ行く。');
    const result = await analyzer.analyze(document, custom.config, custom.advancedConfig, false, undefined, undefined, custom.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([1]);
  }, 20000);

  it('引用行では辞書とスペルも診断せず、前後で境界をまたぐ辞書一致を作らない', async () => {
    await fs.writeFile(path.join(directory, 'quote-dictionary.json'), JSON.stringify([
      { category: 'visible', match: '資料' }, { category: 'cross', match: '前[\\s\\S]*後', mode: 'regex' },
    ]));
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'quote-dictionary.txt')).href, 'plaintext', 1,
      '前\n> 資料 reasearch\n後\n資料 reasearch');
    const config = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '>' }, spell: { enable: true }, dictionaries: { proofreading: ['quote-dictionary.json'] } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'dictionary-visible').map(d => d.range.start.line)).toEqual([3]);
    expect(result.diagnostics.filter(d => d.code === 'dictionary-cross')).toEqual([]);
    expect(result.diagnostics.filter(d => d.code === 'spell-unknown-word').map(d => d.range.start.line)).toEqual([3]);
  }, 20000);

  it('引用内の抑制指示は後続本文に適用しない', async () => {
    const config = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '>' } } });
    for (const [language, text] of [
      ['plaintext', '> otak-lsp-disable\n私はは学校へ行く。'],
      ['markdown', '> <!-- otak-lsp-disable -->\n私はは学校へ行く。'],
      ['javascript', '// > otak-lsp-disable\n// 私はは学校へ行く。'],
    ]) {
      const document = TextDocument.create(pathToFileURL(path.join(directory, `quote-directive.${language}`)).href, language, 1, text);
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(result.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([1]);
    }
  }, 20000);

  it('Markdown表は引用行と区別し、表の解析設定を維持する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'quote-table.md')).href, 'markdown', 1,
      '| 見出し |\n| --- |\n| 私はは学校へ行く。 |\n\n| 私はは学校へ行く。');
    const config = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '|' } } });
    config.config.markdown.analyzeTables = true;
    const enabled = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(enabled.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([2]);
    config.config.markdown.analyzeTables = false;
    const disabled = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(disabled.diagnostics.filter(d => d.code === 'double-particle')).toEqual([]);
  }, 20000);

  it('引用の本文とトークンの除外を実際の並列Workerにも反映する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(), undefined,
        new DictionaryExecutor(path.resolve('server/out/dictionaryWorker.js'), 1500),
      );
      const config = resolveConfiguration({ proofreading: { quoteLine: { enable: true, markers: '>' }, charType: { preferredAlphabet: 'full' } } });
      config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'quote-parallel.txt')).href, 'plaintext', 1,
        '> ＡＢＣ ABCD\nＡＢＣ ABCD');
      const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      expect(manager.hasActiveWorkerPool()).toBe(true);
      expect(result.diagnostics.filter(d => d.code === 'alphabet-width').map(d => [d.range.start.line, document.getText(d.range)]))
        .toEqual([[1, 'ABCD']]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('五段動詞のさ入れを検出し、正しい使役形と区別する', async () => {
    // 文化庁の共通語の用例に基づく。正しい一段動詞の「見させる」等は対象外。
    const text = '休まさせていただきます。帰らさせてください。伺わさせます。読まさせていただく。泳がさせる。\n'
      + '休ませてください。見させてください。食べさせてもらう。連絡させてください。生かさせる。';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'saire.txt')).href, 'plaintext', 1, text);
    const run = async (saIre: boolean, enable = true) => {
      const config = resolveConfiguration({ proofreading: { typo: { enable, saIre } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const result = await run(true);
    const diagnostics = result.diagnostics.filter(d => d.code === 'sa-ire');
    expect(diagnostics.map(d => document.getText(d.range))).toEqual(['休まさせ', '帰らさせ', '伺わさせ', '読まさせ', '泳がさせる']);
    expect(diagnostics.map(d => d.data.suggestions[0])).toEqual(['休ませ', '帰らせ', '伺わせ', '読ませ', '泳がせる']);
    expect(buildCodeActions(document, diagnostics).some(action => action.title === '修正案: 休ませ')).toBe(true);
    expect((await run(false)).diagnostics.some(d => d.code === 'sa-ire')).toBe(false);
    expect((await run(true, false)).diagnostics.some(d => d.code === 'sa-ire')).toBe(false);
  }, 20000);

  it('さ入れの括弧内設定とMarkdown・引用行の除外を維持する', async () => {
    const text = '休まさせてください。（読まさせてください。）\n`帰らさせてください。`\n> 伺わさせます。';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'saire.md')).href, 'markdown', 1, text);
    const run = async (checkInBrackets: boolean) => {
      const config = resolveConfiguration({ proofreading: { typo: { saIre: true, checkInBrackets } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    expect((await run(true)).diagnostics.filter(d => d.code === 'sa-ire').map(d => document.getText(d.range))).toEqual(['休まさせ', '読まさせ']);
    expect((await run(false)).diagnostics.filter(d => d.code === 'sa-ire').map(d => document.getText(d.range))).toEqual(['休まさせ']);
  }, 20000);

  it('誤字の括弧設定はら抜き・二重敬語・副詞呼応だけに反映される', async () => {
    const text = '食べれる。\n（食べれる。）\nおっしゃられました。\n（おっしゃられました。）\n決して行きます。\n（決して行きます。）\n（私はは学校へ行く。）';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'typo-brackets.txt')).href, 'plaintext', 1, text);
    const run = async (checkInBrackets: boolean) => {
      const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const enabled = await run(true);
    const disabled = await run(false);
    for (const [code, outside, inside] of [
      ['ra-nuki', 0, 1], ['honorific-error', 2, 3], ['adverb-agreement', 4, 5],
    ] as const) {
      expect(enabled.diagnostics.filter(d => d.code === code).map(d => d.range.start.line)).toEqual([outside, inside]);
      expect(disabled.diagnostics.filter(d => d.code === code).map(d => d.range.start.line)).toEqual([outside]);
    }
    expect(disabled.diagnostics.filter(d => d.code === 'double-particle').map(d => d.range.start.line)).toEqual([6]);
  }, 20000);

  it('誤字の括弧設定を無効にしても長さと約物の括弧内診断は維持する', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'other-brackets.txt')).href, 'plaintext', 1,
      '（あいうえお！次）\n（検査です）');
    const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets: false }, length: { hiragana: 3 }, punctuation: { spaceAfterQE: true, periodBeforeCloseBracket: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    for (const code of ['hiragana-run-length', 'space-after-question-exclamation', 'period-before-close-bracket']) {
      expect(result.diagnostics.some(d => d.code === code)).toBe(true);
    }
  }, 20000);

  it('副詞呼応は括弧内の副詞や述語を括弧外の判定に混ぜない', async () => {
    const text = '（決して）決して行きます。\n決して（参考）行きます。\n決して（行きます。）';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'adverb-brackets.txt')).href, 'plaintext', 1, text);
    const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets: false } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'adverb-agreement').map(d => d.range.start))
      .toEqual([{ line: 0, character: 5 }, { line: 1, character: 0 }]);
  }, 20000);

  it('各種括弧と入れ子の内外で誤字の検出範囲を保つ', async () => {
    const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets: false } } });
    for (const [open, close] of [['（', '）'], ['(', ')'], ['「', '」'], ['『', '』'], ['【', '】'], ['[', ']'], ['（「', '」）']]) {
      const text = `😀食べれる。${open}食べれる。${close}食べれる。`;
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'bracket-kinds.txt')).href, 'plaintext', 1, text);
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      const actual = result.diagnostics.filter(d => d.code === 'ra-nuki').map(d => d.range.start.character);
      expect(actual).toEqual([2, text.lastIndexOf('食べれる')]);
    }
  }, 20000);

  it('誤字の括弧設定は実並列Workerでも反映される', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'typo-brackets-worker.txt')).href, 'plaintext', 1,
        '食べれる。\n（食べれる。）\nおっしゃられました。\n（おっしゃられました。）\n（決して）決して行きます。\n決して（行きます。）');
      const run = async (checkInBrackets: boolean) => {
        const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets } } });
        config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
        const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
        expect(manager.hasActiveWorkerPool()).toBe(true);
        return result.diagnostics;
      };
      const enabled = await run(true);
      const disabled = await run(false);
      expect(enabled.filter(d => d.code === 'ra-nuki').map(d => d.range.start.line)).toEqual([0, 1]);
      expect(disabled.filter(d => d.code === 'ra-nuki').map(d => d.range.start.line)).toEqual([0]);
      expect(enabled.filter(d => d.code === 'honorific-error').map(d => d.range.start.line)).toEqual([2, 3]);
      expect(disabled.filter(d => d.code === 'honorific-error').map(d => d.range.start.line)).toEqual([2]);
      expect(disabled.filter(d => d.code === 'adverb-agreement').map(d => d.range.start)).toEqual([{ line: 4, character: 5 }]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('同音語は正常文を置換せず、人事の誤記には候補を示す', async () => {
    const text = '完了の報告をします。家庭で作る料理。移動の制約があります。異動の制約があります。過程が良い。被害は東京以外に多い。\n人事の移動の辞令を受け取った。結果は以外に多い。';
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'homophone.txt')).href, 'plaintext', 1, text);
    const config = resolveConfiguration({ proofreading: { typo: { enable: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'homophone');
    expect(diagnostics.map(d => [document.getText(d.range), d.data.suggestions])).toEqual([
      ['移動の辞令', ['異動の辞令']], ['以外に多い', ['意外に多い']],
    ]);
    expect(result.diagnostics.filter(d => document.getText(d.range) === '移動の辞令').map(d => d.code)).toEqual(['homophone']);
    expect(result.diagnostics.filter(d => ['完了の報告', '家庭で作る', '移動の制約', '異動の制約', '過程が良い']
      .includes(document.getText(d.range)))).toEqual([]);
  }, 20000);

  it('同音語の誤字設定と括弧設定が実文書の診断に反映される', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'homophone-settings.txt')).href, 'plaintext', 1,
      '人事の移動の辞令を受け取った。\n（人事の移動の辞令を受け取った。）');
    const run = async (enable: boolean, homophone: boolean, checkInBrackets: boolean) => {
      const config = resolveConfiguration({ proofreading: { typo: { enable, homophone, checkInBrackets } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.filter(d => d.code === 'homophone').map(d => d.range.start.line);
    };
    expect(await run(true, true, true)).toEqual([0, 1]);
    expect(await run(true, true, false)).toEqual([0]);
    expect(await run(true, false, true)).toEqual([]);
    expect(await run(false, true, true)).toEqual([]);
  }, 20000);

  it('同音語はoverride・merge・プリセットの設定優先順位を守る', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'homophone-merge.txt')).href, 'plaintext', 1, '人事の移動の辞令を受け取った。');
    const run = async (mode: 'override' | 'merge', advanced: boolean, typo: boolean, preset: 'custom' | 'video-default' = 'custom') => {
      const config = resolveConfiguration({ advanced: { enableHomophone: advanced }, proofreading: { preset, mergeMode: mode, typo: { homophone: typo } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.some(d => d.code === 'homophone');
    };
    expect(await run('override', true, false)).toBe(false);
    expect(await run('override', false, true)).toBe(true);
    expect(await run('merge', true, false)).toBe(true);
    expect(await run('merge', false, false)).toBe(false);
    expect(await run('merge', false, true)).toBe(true);
    expect(await run('override', false, false, 'video-default')).toBe(true);
  }, 20000);

  it('同音語は実並列Workerでも正常文・誤記・括弧を区別する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'homophone-worker.txt')).href, 'plaintext', 1,
        '完了の報告。家庭で作る。移動の制約。異動の制約。\n移動の辞令。\n（移動の辞令。）');
      const run = async (homophone: boolean, checkInBrackets: boolean) => {
        const config = resolveConfiguration({ proofreading: { typo: { homophone, checkInBrackets } } });
        config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
        const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
        expect(manager.hasActiveWorkerPool()).toBe(true);
        return result.diagnostics.filter(d => d.code === 'homophone').map(d => [d.range.start.line, document.getText(d.range), d.data.suggestions]);
      };
      expect(await run(true, true)).toEqual([[1, '移動の辞令', ['異動の辞令']], [2, '移動の辞令', ['異動の辞令']]]);
      expect(await run(true, false)).toEqual([[1, '移動の辞令', ['異動の辞令']]]);
      expect(await run(false, true)).toEqual([]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('mergeでも公開されていない高度設定に阻まれずさ入れを切り替える', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'saire-merge.txt')).href, 'plaintext', 1, '休まさせてください。');
    const run = async (saIre: boolean) => {
      const config = resolveConfiguration({ proofreading: { mergeMode: 'merge', typo: { saIre } } });
      const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
      return result.diagnostics.filter(d => d.code === 'sa-ire').map(d => document.getText(d.range));
    };
    expect(await run(true)).toEqual(['休まさせ']);
    expect(await run(false)).toEqual([]);
  }, 20000);

  it('実並列Workerでもさ入れの正例・正しい使役形・設定を区別する', async () => {
    const workerScript = path.resolve('server/out/advancedRulesWorker.js');
    const manager = new AdvancedRulesManager({ parallelExecution: { enabled: true, maxWorkers: 2, workerScript } });
    try {
      const parallelAnalyzer = createDocumentAnalyzer(
        new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
        new GrammarChecker(), manager, new ProofreadingRulesManager(),
      );
      const document = TextDocument.create(pathToFileURL(path.join(directory, 'saire-parallel.md')).href, 'markdown', 1,
        '休まさせてください。（読まさせてください。）見させてください。\n`帰らさせる`\n> 伺わさせる');
      const run = async (saIre: boolean, checkInBrackets: boolean) => {
        const config = resolveConfiguration({ proofreading: { typo: { saIre, checkInBrackets } } });
        config.advancedConfig.parallelExecution = { enabled: true, maxWorkers: 2, workerScript };
        const result = await parallelAnalyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
        expect(manager.hasActiveWorkerPool()).toBe(true);
        return result.diagnostics.filter(d => d.code === 'sa-ire').map(d => [document.getText(d.range), d.data.suggestions[0]]);
      };
      expect(await run(true, true)).toEqual([['休まさせ', '休ませ'], ['読まさせ', '読ませ']]);
      expect(await run(true, false)).toEqual([['休まさせ', '休ませ']]);
      expect(await run(false, true)).toEqual([]);
    } finally {
      await manager.shutdown();
    }
  }, 20000);

  it('英単語の繰り返しを検出し、個別設定で無効にできる', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'repeat.txt')).href, 'plaintext', 1, 'The the cat. hello there.');
    const run = async (checkRepeat: boolean) => {
      const config = resolveConfiguration({ proofreading: { spell: { enable: true, checkRepeat } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const diagnostics = (await run(true)).diagnostics.filter(d => d.code === 'spell-repeat');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range).toEqual({ start: { line: 0, character: 4 }, end: { line: 0, character: 7 } });
    expect((await run(false)).diagnostics.some(d => d.code === 'spell-repeat')).toBe(false);
  }, 20000);

  it('繰り返し判定では句読点、改行、Markdownの除外範囲を跨がない', async () => {
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'repeat.md')).href, 'markdown', 1,
      'the the. the, the\nthe `code` the\nthe\nthe\nhello hello');
    const config = resolveConfiguration({ proofreading: { spell: { enable: true, checkRepeat: true } } });
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'spell-repeat').map(d => d.range.start)).toEqual([
      { line: 0, character: 4 }, { line: 4, character: 6 },
    ]);
  }, 20000);

  it('スペル用の追加辞書は文書ごとに適用され、別の文書に漏れない', async () => {
    await fs.writeFile(path.join(directory, 'spelling.txt'), '# 技術用語\nkuromoji\n');
    const run = async (name: string, files: string[]) => {
      const document = TextDocument.create(pathToFileURL(path.join(directory, name)).href, 'plaintext', 1, 'kuromoji');
      const config = resolveConfiguration({ proofreading: { spell: { enable: true }, dictionaries: { spell: files } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    };
    const [withWord, withoutWord] = await Promise.all([run('one.txt', ['spelling.txt']), run('two.txt', [])]);
    expect(withWord.diagnostics.some(d => d.code === 'spell-unknown-word')).toBe(false);
    expect(withoutWord.diagnostics.some(d => d.code === 'spell-unknown-word')).toBe(true);
  }, 20000);

  it('追加辞書の変更と欠落を次の解析に反映し、基礎辞書の検査を続ける', async () => {
    const file = path.join(directory, 'updated-spelling.txt');
    await fs.writeFile(file, 'kuromoji\n');
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'reload.txt')).href, 'plaintext', 1, 'kuromoji reasearch');
    const config = resolveConfiguration({ proofreading: { spell: { enable: true }, dictionaries: { spell: ['updated-spelling.txt'] } } });
    const run = () => analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect((await run()).diagnostics.filter(d => d.code === 'spell-unknown-word')).toHaveLength(1);
    await fs.writeFile(file, 'reasearch\n');
    const changed = await run();
    expect(changed.diagnostics.filter(d => d.code === 'spell-unknown-word').map(d => d.message)).toEqual(['英語辞書に「kuromoji」がありません。']);
    await fs.unlink(file);
    const missing = await run();
    expect(missing.diagnostics.filter(d => d.code === 'spell-unknown-word')).toHaveLength(2);
    expect(missing.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('updated-spelling.txt');
  }, 20000);

  it('スペル辞書は3ファイルまで読み、超過を通知する', async () => {
    for (let index = 1; index <= 4; index++) {
      await fs.writeFile(path.join(directory, `spelling-${index}.txt`), ['kuromoji', 'openai', 'devops', 'mispeling'][index - 1]);
    }
    const config = resolveConfiguration({ proofreading: { spell: { enable: true }, dictionaries: { spell: ['spelling-1.txt', 'spelling-2.txt', 'spelling-3.txt', 'spelling-4.txt'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell-limit.txt')).href, 'plaintext', 1, 'kuromoji openai devops mispeling');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'spell-unknown-word');
    expect(diagnostics).toHaveLength(1);
    expect(document.getText(diagnostics[0].range)).toBe('mispeling');
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('3件');
  }, 20000);

  it('サイズ上限内で多数の単語を含む追加辞書でも解析を完了する', async () => {
    await fs.writeFile(path.join(directory, 'many-spelling.txt'), `${'a\n'.repeat(150000)}kuromoji\n`);
    const config = resolveConfiguration({ proofreading: { spell: { enable: true }, dictionaries: { spell: ['many-spelling.txt'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'large-spell.txt')).href, 'plaintext', 1, 'kuromoji reasearch');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.filter(d => d.code === 'spell-unknown-word').map(d => document.getText(d.range))).toEqual(['reasearch']);
    expect(result.diagnostics.some(d => d.code === 'dictionary-check-failed')).toBe(false);
  }, 20000);

  it('サイズ上限内で多数の校正項目を含む辞書でも解析を完了し、診断上限を通知する', async () => {
    await fs.writeFile(path.join(directory, 'many-entries.json'), `[${Array(130000).fill('{"match":"a"}').join(',')}]`);
    const result = await analyze('a', ['many-entries.json']);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.some(d => d.code === 'dictionary-truncated')).toBe(true);
    expect(result.diagnostics.some(d => d.code === 'dictionary-check-failed')).toBe(false);
  }, 20000);

  it('スペル検査はMarkdownのコード、リンク先、URLを検査せず表示本文を検査する', async () => {
    const config = resolveConfiguration({ proofreading: { spell: { enable: true } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell.md')).href, 'markdown', 1,
      'reasearch `mispeling` [hello](https://example.com/mispeling) https://example.com/mispeling');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'spell-unknown-word');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start.character).toBe(0);
    expect(diagnostics[0].data.suggestions).toContain('research');
  }, 20000);

  it('コード言語ではコメントのみ検査し、識別子・数字・メールを分割して誤検出しない', async () => {
    const config = resolveConfiguration({ proofreading: { spell: { enable: true } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'spell.js')).href, 'javascript', 1,
      'const mispeling = 1;\n// reasearch user@example.com reasearch123 mispeling_name CamelCase');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const diagnostics = result.diagnostics.filter(d => d.code === 'spell-unknown-word');
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].range.start).toEqual({ line: 1, character: 3 });
  }, 20000);

  it('ルール辞書の正規表現と重要度を実文書に反映し、独立して無効化できる', async () => {
    await fs.writeFile(path.join(directory, 'rules.json'), JSON.stringify([
      { pattern: '禁止[0-9]+', message: '禁止表現', severity: 'warn' },
      { pattern: '注意', message: '確認事項', severity: 'info' },
    ]));
    await fs.writeFile(path.join(directory, 'ordinary.json'), JSON.stringify([{ category: 'term', match: '資料' }]));
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'rule.txt')).href, 'plaintext', 1, '資料、禁止12、注意。');
    async function check(enabled: boolean) {
      const config = resolveConfiguration({ proofreading: { rule: { enable: enabled }, dictionaries: { rule: ['rules.json'], proofreading: ['ordinary.json'] } } });
      return analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    }
    const enabled = await check(true);
    const ruleDiagnostics = enabled.diagnostics.filter(d => d.code === 'dictionary-rule');
    expect(ruleDiagnostics.map(d => ({ message: d.message, severity: d.severity, start: d.range.start.character, end: d.range.end.character }))).toEqual([
      { message: '禁止表現', severity: 2, start: 3, end: 7 },
      { message: '確認事項', severity: 3, start: 8, end: 10 },
    ]);
    expect(enabled.diagnostics.some(d => d.code === 'dictionary-term')).toBe(true);
    const disabled = await check(false);
    expect(disabled.diagnostics.some(d => d.code === 'dictionary-rule')).toBe(false);
    expect(disabled.diagnostics.some(d => d.code === 'dictionary-term')).toBe(true);
  }, 20000);

  it('ルール辞書が読めなくても校正用辞書と通常の解析を継続する', async () => {
    await fs.writeFile(path.join(directory, 'other.json'), JSON.stringify([{ category: 'term', match: '資料' }]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['missing-rule.json'], proofreading: ['other.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'failure.txt')).href, 'plaintext', 1, '資料。私はは学校へ行く。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['dictionary-check-failed', 'dictionary-term', 'double-particle']));
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('missing-rule.json');
  }, 20000);

  it('不正な正規表現を通知し、有効なルールは引き続き検出する', async () => {
    await fs.writeFile(path.join(directory, 'invalid-rule.json'), JSON.stringify([
      { pattern: '[', message: '不正', severity: 'warn' },
      { pattern: '資料', message: '有効', severity: 'warn' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['invalid-rule.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'invalid.txt')).href, 'plaintext', 1, '資料。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.find(d => d.code === 'dictionary-rule')?.message).toBe('有効');
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('正規表現');
  }, 20000);

  it('形式不正の辞書項目をファイルごとに通知し、有効な項目を検査する', async () => {
    await fs.writeFile(path.join(directory, 'partial-rules.json'), JSON.stringify([
      { pattern: '注意', message: '有効' }, { pattern: '無効' }, null,
    ]));
    await fs.writeFile(path.join(directory, 'partial-proof.json'), JSON.stringify([
      { category: 'term', match: '資料' }, { category: 'bad' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['partial-rules.json'], proofreading: ['partial-proof.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'partial.txt')).href, 'plaintext', 1, '資料と注意。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['dictionary-rule', 'dictionary-term']));
    const notices = result.diagnostics.filter(d => d.code === 'dictionary-check-failed').map(d => d.message);
    expect(notices).toHaveLength(2);
    expect(notices.some(message => message.includes('partial-rules.json') && message.includes('2件'))).toBe(true);
    expect(notices.some(message => message.includes('partial-proof.json') && message.includes('1件'))).toBe(true);
  }, 20000);

  it('有効項目がない不正辞書も失敗通知を残す', async () => {
    await fs.writeFile(path.join(directory, 'all-invalid.json'), '[null,{}]');
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['all-invalid.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'all-invalid.txt')).href, 'plaintext', 1, '注意。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('2件');
  }, 20000);

  it('誤字カテゴリの括弧設定は独立したルール辞書に影響しない', async () => {
    await fs.writeFile(path.join(directory, 'brackets-rule.json'), JSON.stringify([{ pattern: '注意', message: '独自ルール' }]));
    const config = resolveConfiguration({ proofreading: { typo: { checkInBrackets: false }, dictionaries: { rule: ['brackets-rule.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'brackets.txt')).href, 'plaintext', 1, '（注意）');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.some(d => d.code === 'dictionary-rule' && d.message === '独自ルール')).toBe(true);
  }, 20000);

  it('同じファイルを異なる辞書種別で指定しても、形式ごとの読み込みを混同しない', async () => {
    await fs.writeFile(path.join(directory, 'both.json'), JSON.stringify([
      { category: 'term', match: '資料', pattern: '注意', message: 'ルール側', severity: 'info' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { proofreading: ['both.json'], rule: ['both.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'both.txt')).href, 'plaintext', 1, '資料と注意。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => String(d.code).startsWith('dictionary-')).map(d => d.code)).toEqual(['dictionary-term', 'dictionary-rule']);
  }, 20000);

  it('ルール辞書もMarkdownの除外範囲をまたぐ一致を診断しない', async () => {
    await fs.writeFile(path.join(directory, 'markdown-rule.json'), JSON.stringify([
      { pattern: '資料\\s+情報', message: '除外範囲を跨ぐ' },
      { pattern: '本文', message: '表示本文' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['markdown-rule.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'rule.md')).href, 'markdown', 1, '資料 `コード` 情報。本文。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'dictionary-rule').map(d => d.message)).toEqual(['表示本文']);
  }, 20000);

  it('ルール辞書の実行期限超過でも校正用辞書と通常診断は継続する', async () => {
    await fs.writeFile(path.join(directory, 'slow-rule.json'), JSON.stringify([{ pattern: '(a+)+$', message: '遅い' }]));
    await fs.writeFile(path.join(directory, 'safe-proof.json'), JSON.stringify([{ category: 'term', match: '資料' }]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['slow-rule.json'], proofreading: ['safe-proof.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'slow-rule.txt')).href, 'plaintext', 1, `${'a'.repeat(60)}!\n資料。私はは学校へ行く。`);
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['dictionary-check-failed', 'dictionary-term', 'double-particle']));
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('ルール辞書');
  }, 20000);

  it('ルール辞書の上限3件を守り、超過を通知する', async () => {
    for (let index = 1; index <= 4; index++) {
      await fs.writeFile(path.join(directory, `rule-${index}.json`), JSON.stringify([{ pattern: `語${index}`, message: `検出${index}` }]));
    }
    const config = resolveConfiguration({ proofreading: { dictionaries: { rule: ['rule-1.json', 'rule-2.json', 'rule-3.json', 'rule-4.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'limit-rule.txt')).href, 'plaintext', 1, '語1、語2、語3、語4。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(result.diagnostics.filter(d => d.code === 'dictionary-rule').map(d => d.message)).toEqual(['検出1', '検出2', '検出3']);
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('3件');
  }, 20000);

  it('実ファイルと文書別設定を通し、異なる辞書を並行して混同しない', async () => {
    await fs.writeFile(path.join(directory, 'a.json'), JSON.stringify([{ category: 'first', match: '資料' }]));
    await fs.writeFile(path.join(directory, 'b.json'), JSON.stringify([{ category: 'second', match: '情報' }]));
    const [a, b] = await Promise.all([
      analyze('資料と情報。', ['a.json'], 'a.txt'),
      analyze('資料と情報。', [path.join(directory, 'b.json')], 'b.txt'),
    ]);
    expect(a.diagnostics.filter(d => String(d.code).startsWith('dictionary-')).map(d => d.code)).toEqual(['dictionary-first']);
    expect(b.diagnostics.filter(d => String(d.code).startsWith('dictionary-')).map(d => d.code)).toEqual(['dictionary-second']);
    await fs.writeFile(path.join(directory, 'a.json'), JSON.stringify([{ category: 'updated', match: '情報' }]));
    const updated = await analyze('資料と情報。', ['a.json'], 'a.txt');
    expect(updated.diagnostics.filter(d => String(d.code).startsWith('dictionary-')).map(d => d.code)).toEqual(['dictionary-updated']);
    expect((await analyze('資料と情報。', [])).diagnostics.some(d => String(d.code).startsWith('dictionary-'))).toBe(false);
  }, 20000);

  it('読込失敗を利用者に知らせ、他の辞書と通常診断を継続する', async () => {
    await fs.writeFile(path.join(directory, 'valid.json'), JSON.stringify([{ category: 'term', match: '資料' }]));
    const result = await analyze('資料。私はは学校へ行く。', ['missing.json', 'valid.json']);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['dictionary-check-failed', 'dictionary-term', 'double-particle']));
  }, 20000);

  it('Markdownのインラインコードを挟む一致を作らず、表示本文は検査する', async () => {
    await fs.writeFile(path.join(directory, 'markdown.json'), JSON.stringify([
      { category: 'cross', match: '資料\\s+情報', mode: 'regex' },
      { category: 'visible', match: '本文', mode: 'exact' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { proofreading: ['markdown.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'sample.md')).href, 'markdown', 1, '資料 `コード` 情報。本文。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const codes = result.diagnostics.map(d => d.code);
    expect(codes).toContain('dictionary-visible');
    expect(codes).not.toContain('dictionary-cross');
  }, 20000);

  it('表の解析設定に従って辞書診断を除外または表示する', async () => {
    await fs.writeFile(path.join(directory, 'table.json'), JSON.stringify([{ category: 'term', match: '資料' }]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { proofreading: ['table.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'table.md')).href, 'markdown', 1, '| 資料 |\n| --- |\n| 資料 |\n');
    config.config.markdown.analyzeTables = false;
    const disabled = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(disabled.diagnostics.some(d => d.code === 'dictionary-term')).toBe(false);
    config.config.markdown.analyzeTables = true;
    const enabled = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    expect(enabled.diagnostics.filter(d => d.code === 'dictionary-term')).toHaveLength(2);
  }, 20000);

  it('コード言語ではコメント間の実コードをまたぐ一致を作らない', async () => {
    await fs.writeFile(path.join(directory, 'comments.json'), JSON.stringify([
      { category: 'cross', match: '資料[\\s\\S]*情報', mode: 'regex' },
      { category: 'visible', match: '本文', mode: 'exact' },
    ]));
    const config = resolveConfiguration({ proofreading: { dictionaries: { proofreading: ['comments.json'] } } });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'sample.js')).href, 'javascript', 1, '// 資料\nconst value = 1;\n// 情報と本文。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const codes = result.diagnostics.map(d => d.code);
    expect(codes).toContain('dictionary-visible');
    expect(codes).not.toContain('dictionary-cross');
  }, 20000);

  it('過大な正規表現の失敗を通知し、他の文法診断は残す', async () => {
    await fs.writeFile(path.join(directory, 'slow.json'), JSON.stringify([{ category: 'slow', match: '(a+)+$', mode: 'regex' }]));
    const result = await analyze(`${'a'.repeat(60)}!\n私はは学校へ行く。`, ['slow.json']);
    expect(result.status).toBe('completed');
    expect(result.diagnostics.map(d => d.code)).toEqual(expect.arrayContaining(['dictionary-check-failed', 'double-particle']));
    expect(result.diagnostics.find(d => d.code === 'dictionary-check-failed')?.message).toContain('timed out');
  }, 20000);

  it('全ルール抑制中も辞書失敗を通知し、同名の通常診断は抑制する', async () => {
    await fs.writeFile(path.join(directory, 'same-code.json'), JSON.stringify([{ category: 'check-failed', match: '資料' }]));
    const result = await analyze('otak-lsp-disable\n資料。', ['missing.json', 'same-code.json']);
    const sameCode = result.diagnostics.filter(d => d.code === 'dictionary-check-failed');
    expect(sameCode.map(d => d.source)).toEqual(['otak-lsp']);
  }, 20000);

  it('通常診断の件数上限を超えても辞書の各読込失敗を知らせる', async () => {
    const config = resolveConfiguration({
      maxNumberOfProblems: 1,
      proofreading: { dictionaries: { proofreading: ['missing-a.json', 'missing-b.json'] } },
    });
    const document = TextDocument.create(pathToFileURL(path.join(directory, 'limit.txt')).href, 'plaintext', 1, '私はは学校へ行く。');
    const result = await analyzer.analyze(document, config.config, config.advancedConfig, false, undefined, undefined, config.proofreadingConfig);
    const notices = result.diagnostics.filter(d => d.code === 'dictionary-check-failed');
    expect(notices).toHaveLength(2);
    expect(notices.some(d => d.message.includes('missing-a.json'))).toBe(true);
    expect(notices.some(d => d.message.includes('missing-b.json'))).toBe(true);
  }, 20000);

  it('辞書診断の打切りを、全ルール抑制中も通知する', async () => {
    await fs.writeFile(path.join(directory, 'many.json'), JSON.stringify([{ category: 'term', match: 'a' }]));
    const result = await analyze(`otak-lsp-disable\n${'a'.repeat(1001)}`, ['many.json']);
    expect(result.diagnostics.some(d => d.code === 'dictionary-truncated' && d.source === 'otak-lsp')).toBe(true);
    expect(result.diagnostics.some(d => d.code === 'dictionary-term')).toBe(false);
  }, 20000);
});

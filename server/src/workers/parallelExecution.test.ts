/**
 * Parallel Execution Identity Tests
 * Feature: parallel-advanced-rules
 *
 * - sequential (`checkText`) と parallel (`checkTextParallel`) が、
 *   代表的な日本語サンプルに対して **同じ診断集合** を返すことを担保する。
 * - 順序は parallel 側で安定ソートされるので、それと整合するように
 *   sequential 結果も同じソートで比較する。
 * - worker bundle が無い環境 (まだビルドしていない CI 等) では skip する。
 *
 * 形態素解析は時間がかかるので、テストでは MeCabAnalyzer を使わず、
 * **トークン未指定 (空配列)** で text/sentence ベースのルール群が動く範囲だけを比較する。
 * トークン依存ルール (ら抜き、二重否定、サ変動詞等) は両方とも空配列で同じ挙動になるため、
 * 同一性比較には影響しない。
 */

import * as fs from 'fs';
import * as path from 'path';

import { Diagnostic } from '../../../shared/src/types';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import { MarkdownFilter } from '../parser/markdownFilter';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { TokenFilter } from '../semantic/tokenFilter';

const WORKER_BUNDLE = path.resolve(__dirname, '../../out/advancedRulesWorker.js');
const HAS_WORKER_BUNDLE = fs.existsSync(WORKER_BUNDLE);
const describeIfHasBundle = HAS_WORKER_BUNDLE ? describe : describe.skip;

function diagKey(d: Diagnostic): string {
  return [
    d.range.start.line,
    d.range.start.character,
    d.range.end.line,
    d.range.end.character,
    String(d.code),
    d.message,
  ].join('|');
}

function sortByKey(diags: Diagnostic[]): Diagnostic[] {
  return [...diags].sort((a, b) => {
    const ak = diagKey(a);
    const bk = diagKey(b);
    return ak < bk ? -1 : ak > bk ? 1 : 0;
  });
}

const SAMPLES: { name: string; text: string }[] = [
  {
    name: 'mixed style markdown',
    text: `# サンプル文書

今日は晴れです。明日も晴れです。明後日も晴れです。
私が買った本がとても面白い。

- りんご
- バナナ
* みかん

| 列1 | 列2 |
|------|------|
| ABC  | abc  |
`,
  },
  {
    name: 'particle and width mix',
    text: 'これは API/api/Api の例です。\n123 と １２３ の混在もテストします。\n',
  },
  {
    name: 'empty document',
    text: '',
  },
  {
    name: 'single sentence',
    text: 'これは単一の文です。',
  },
];

describeIfHasBundle('AdvancedRulesManager parallel identity', () => {
  let sequentialManager: AdvancedRulesManager;
  let parallelManager: AdvancedRulesManager;

  beforeAll(() => {
    sequentialManager = new AdvancedRulesManager();
    parallelManager = new AdvancedRulesManager({
      parallelExecution: {
        enabled: true,
        maxWorkers: 2,
        workerScript: WORKER_BUNDLE,
      },
    });
  });

  afterAll(async () => {
    await parallelManager.shutdown();
    await sequentialManager.shutdown();
  });

  for (const sample of SAMPLES) {
    it(`同一性: ${sample.name}`, async () => {
      const expected = sortByKey(sequentialManager.checkText(sample.text, []));
      const actual = sortByKey(await parallelManager.checkTextParallel(sample.text, []));

      expect(actual.length).toBe(expected.length);
      expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
    }, 30_000);
  }

  it('並列Workerにも校正設定の優先幅を渡し、正しい候補を返す', async () => {
    const text = 'ＡＢＣ ABCD １２３ 1234';
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, proofreadingPreferredAlphabet: 'full' as const, proofreadingPreferredNumeral: 'full' as const,
      parallelExecution: { enabled: true, maxWorkers: 2, workerScript: WORKER_BUNDLE } } };
    const result = await parallelManager.checkTextParallel(text, [], undefined, options);
    expect(parallelManager.hasActiveWorkerPool()).toBe(true);
    expect(result.filter(d => d.code === 'alphabet-width' || d.code === 'number-width-mix')
      .map(d => ({ code: d.code, text: text.slice(d.range.start.character, d.range.end.character), suggestions: d.suggestions })))
      .toEqual(expect.arrayContaining([
        { code: 'alphabet-width', text: 'ABCD', suggestions: ['「ＡＢＣＤ」に変更する'] },
        { code: 'number-width-mix', text: '1234', suggestions: ['「１２３４」に変更して統一する'] },
      ]));
  }, 30000);

  it('Issue #29: 実トークンとMarkdown範囲をworkerへ渡し、表示長と本動詞を保つ', async () => {
    const text = `[案内](https://example.com/${'a'.repeat(150)})です。\n資料を見る。容量は10GBです。`;
    const filtered = new MarkdownFilter().filter(text);
    const tokens = new TokenFilter().filterTokens(await new MeCabAnalyzer().analyze(filtered.filteredText), filtered.excludedRanges);
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, longSentenceThreshold: 20 } };
    const expected = sortByKey(sequentialManager.checkText(filtered.filteredText, tokens, filtered.excludedRanges, options));
    const actual = sortByKey(await parallelManager.checkTextParallel(filtered.filteredText, tokens, filtered.excludedRanges, options));
    expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
    expect(actual.some(d => d.code === 'long-sentence')).toBe(false);
    expect(actual.some(d => d.code === 'orthography-variant')).toBe(false);
    expect(actual.some(d => d.code === 'space-around-unit')).toBe(true);
  }, 30_000);

  it('表の各セルと行間の連続検出はworkerと通常経路で一致する', async () => {
    const text = [
      '| ルール | 例 |', '| --- | --- |',
      '| 接続詞連続 | `しかし、Aです` |', '| 接続詞連続 | `しかし、Bです` |',
      '| 文末コロン | これはテストです： |',
      '| 「及び/並びに」 | A並びにBを確認する |',
    ].join('\n');
    const filtered = new MarkdownFilter().filter(text);
    const tokens = new TokenFilter().filterTokens(await new MeCabAnalyzer().analyze(filtered.filteredText), filtered.excludedRanges.filter(r => r.type !== 'table'));
    const options = { analyzeTables: true };
    const expected = sortByKey(sequentialManager.checkText(filtered.filteredText, tokens, filtered.excludedRanges, options));
    const actual = sortByKey(await parallelManager.checkTextParallel(filtered.filteredText, tokens, filtered.excludedRanges, options));
    expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
    expect(actual.some(d => d.code === 'conjunction-repetition')).toBe(true);
    expect(actual.some(d => d.code === 'sentence-ending-colon')).toBe(true);
    expect(actual.some(d => d.code === 'oyobi-narabini')).toBe(true);
  }, 30_000);

  it.each([
    ['三人で5本の飲料を買った。', true],
    ['一方、2人が出発した。', false],
  ] as const)('一文字の数詞の診断と修正案がworkerと通常経路で一致する: %s', async (text, expectedDetected) => {
    const tokens = await new MeCabAnalyzer().analyze(text);
    const expected = sequentialManager.checkText(text, tokens).filter(d => d.code === 'numeral-style-mix');
    const actual = (await parallelManager.checkTextParallel(text, tokens)).filter(d => d.code === 'numeral-style-mix');
    expect(actual).toEqual(expected);
    expect(actual.length > 0).toBe(expectedDetected);
  }, 30_000);

  it.each([
    ['私は朝食を食べて、学校に行って、本を読んで、友人と話して、家に帰って、夕食を作りました。', false],
    ['昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。', true],
  ] as const)('文複雑度の実トークンによる診断がworkerと通常経路で一致する: %s', async (text, expectedDetected) => {
    const tokens = await new MeCabAnalyzer().analyze(text);
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, sentenceComplexityThreshold: 35 } };
    const expected = sequentialManager.checkText(text, tokens, undefined, options).filter(d => d.code === 'sentence-complexity');
    const actual = (await parallelManager.checkTextParallel(text, tokens, undefined, options)).filter(d => d.code === 'sentence-complexity');
    expect(actual).toEqual(expected);
    expect(actual.length > 0).toBe(expectedDetected);
  }, 30_000);

  it('非表示リンクを含む文複雑度の診断がworkerと通常経路で一致する', async () => {
    const text = `[案内](https://example.com/${'a'.repeat(300)})資料を確認してください。`;
    const filtered = new MarkdownFilter().filter(text);
    const tokens = new TokenFilter().filterTokens(await new MeCabAnalyzer().analyze(filtered.filteredText), filtered.excludedRanges);
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, sentenceComplexityThreshold: 20 } };
    const expected = sequentialManager.checkText(filtered.filteredText, tokens, filtered.excludedRanges, options).filter(d => d.code === 'sentence-complexity');
    const actual = (await parallelManager.checkTextParallel(filtered.filteredText, tokens, filtered.excludedRanges, options)).filter(d => d.code === 'sentence-complexity');
    expect(expected).toHaveLength(0);
    expect(actual).toEqual(expected);
  }, 30_000);

  it('HTMLタグの除外範囲を実workerにも渡し、表示文と同じ複雑度にする', async () => {
    const plain = '案内資料を確認してください。';
    const text = `<a href="https://example.com/${'a'.repeat(300)}">案内資料</a>を確認してください。`;
    const filtered = new MarkdownFilter().filter(text);
    const mecab = new MeCabAnalyzer();
    const tokens = new TokenFilter().filterTokens(await mecab.analyze(filtered.filteredText), filtered.excludedRanges);
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, sentenceComplexityThreshold: 0 } };
    const oracle = sequentialManager.checkText(plain, await mecab.analyze(plain), undefined, options)
      .filter(d => d.code === 'sentence-complexity');
    const expected = sequentialManager.checkText(filtered.filteredText, tokens, filtered.excludedRanges, options)
      .filter(d => d.code === 'sentence-complexity');
    const actual = (await parallelManager.checkTextParallel(filtered.filteredText, tokens, filtered.excludedRanges, options))
      .filter(d => d.code === 'sentence-complexity');
    expect(oracle).toHaveLength(1);
    expect(expected).toHaveLength(1);
    expect(expected[0].message).toBe(oracle[0].message);
    expect(actual).toEqual(expected);
  }, 30_000);

  it('読点のない並列動作と入れ子を実workerでも区別する', async () => {
    const options = { config: { ...DEFAULT_ADVANCED_RULES_CONFIG, sentenceComplexityThreshold: 25 } };
    const samples = [
      ['私は朝食を食べて学校に行って本を読んで友人と話して家に帰って夕食を作りました。', false],
      ['昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。', true],
    ] as const;
    for (const [text, detected] of samples) {
      const tokens = await new MeCabAnalyzer().analyze(text);
      const expected = sequentialManager.checkText(text, tokens, undefined, options).filter(d => d.code === 'sentence-complexity');
      const observed = (await parallelManager.checkTextParallel(text, tokens, undefined, options)).filter(d => d.code === 'sentence-complexity');
      expect(observed).toEqual(expected);
      expect(observed.length > 0).toBe(detected);
    }
  }, 30_000);

  it.each([
    ['本契約に基づき甲が乙に対して負担する債務の履行に関連して生じた損害については、甲は乙に対して、その損害の発生原因の如何を問わず、一切の責任を負わないものとする。', true],
    ['私の友人の妹の会社の社長の息子の学校の先生の家の庭の木の葉が落ちた。', true],
    ['東京都港区六本木一丁目交差点付近高層ビル群地下駐車場入口案内標識設置工事完了報告書', true],
    ['昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。', true],
    ['2026年10月27日火曜日午前10時30分に会議を開始します。', false],
    ['申請者は、提出した書類に変更が生じた場合、速やかに担当窓口へ届け出なければなりません。', false],
  ] as const)('既定の複雑度を実workerと通常経路で確認する: %s', async (text, detected) => {
    const tokens = await new MeCabAnalyzer().analyze(text);
    const expected = sequentialManager.checkText(text, tokens).filter(d => d.code === 'sentence-complexity');
    const actual = (await parallelManager.checkTextParallel(text, tokens)).filter(d => d.code === 'sentence-complexity');
    expect(expected.length > 0).toBe(detected);
    expect(actual).toEqual(expected);
  }, 30_000);

  it('英字表記の各代表位置を実workerと通常経路で確認する', async () => {
    const text = '😀APIを説明。\nAPIを確認。\napiを使用。';
    const tokens = await new MeCabAnalyzer().analyze(text);
    const expected = sequentialManager.checkText(text, tokens).filter(d => d.code === 'english-case-mix');
    const actual = (await parallelManager.checkTextParallel(text, tokens)).filter(d => d.code === 'english-case-mix');
    expect(expected.map(d => d.range.start)).toEqual([{ line: 0, character: 2 }, { line: 2, character: 0 }]);
    expect(actual).toEqual(expected);
  }, 30_000);

  it('軽量ルール並列も sequential と同一', async () => {
    const text = SAMPLES[0].text;
    const expected = sortByKey(sequentialManager.checkLightweightRules(text, []));
    const actual = sortByKey(await parallelManager.checkLightweightRulesParallel(text, []));
    expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
  }, 30_000);

  it('parallel disabled では in-process フォールバック (= async 版と同一)', async () => {
    const disabled = new AdvancedRulesManager({
      parallelExecution: { enabled: false },
    });
    try {
      const text = SAMPLES[1].text;
      const expected = sortByKey(await disabled.checkTextAsync(text, []));
      const actual = sortByKey(await disabled.checkTextParallel(text, []));
      expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
    } finally {
      await disabled.shutdown();
    }
  }, 30_000);

  it('updateConfig で parallelExecution を無効化すると worker pool が破棄される', async () => {
    const m = new AdvancedRulesManager({
      parallelExecution: { enabled: true, maxWorkers: 2, workerScript: WORKER_BUNDLE },
    });
    try {
      await m.checkTextParallel(SAMPLES[0].text, []);
      expect(m.hasActiveWorkerPool()).toBe(true);

      // 実行中に無効化 → プールは即座に切り離される
      m.updateConfig({ parallelExecution: { enabled: false } });
      expect(m.hasActiveWorkerPool()).toBe(false);

      // 無効化後の結果は in-process async と同一
      const expected = sortByKey(await m.checkTextAsync(SAMPLES[0].text, []));
      const actual = sortByKey(await m.checkTextParallel(SAMPLES[0].text, []));
      expect(actual.map(diagKey)).toEqual(expected.map(diagKey));
      // 無効化されたままなので再起動もしない
      expect(m.hasActiveWorkerPool()).toBe(false);
    } finally {
      await m.shutdown();
    }
  }, 30_000);

  it('updateConfig で maxWorkers を変えると worker pool が作り直される', async () => {
    const m = new AdvancedRulesManager({
      parallelExecution: { enabled: true, maxWorkers: 2, workerScript: WORKER_BUNDLE },
    });
    try {
      await m.checkTextParallel(SAMPLES[0].text, []);
      expect(m.hasActiveWorkerPool()).toBe(true);

      // maxWorkers 変更で旧プールを切り離す
      m.updateConfig({
        parallelExecution: { enabled: true, maxWorkers: 1, workerScript: WORKER_BUNDLE },
      });
      expect(m.hasActiveWorkerPool()).toBe(false);

      // 次回呼び出しで新設定のプールが再生成される
      await m.checkTextParallel(SAMPLES[0].text, []);
      expect(m.hasActiveWorkerPool()).toBe(true);
    } finally {
      await m.shutdown();
    }
  }, 30_000);

  it('updateConfig で parallelExecution 以外を変えても worker pool は維持される', async () => {
    const m = new AdvancedRulesManager({
      parallelExecution: { enabled: true, maxWorkers: 2, workerScript: WORKER_BUNDLE },
    });
    try {
      await m.checkTextParallel(SAMPLES[0].text, []);
      expect(m.hasActiveWorkerPool()).toBe(true);

      // 無関係な設定変更ではプールを壊さない
      m.updateConfig({ enableLongSentence: false });
      expect(m.hasActiveWorkerPool()).toBe(true);
    } finally {
      await m.shutdown();
    }
  }, 30_000);
});

describe('AdvancedRulesManager parallel skip reason', () => {
  it('worker bundle がビルドされていない場合は parallel test は skip される', () => {
    if (!HAS_WORKER_BUNDLE) {
      console.warn(
        `[parallelExecution.test] worker bundle missing at ${WORKER_BUNDLE}, parallel identity tests are skipped. Run 'node esbuild.js' to build.`
      );
    }
    expect(true).toBe(true);
  });
});

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

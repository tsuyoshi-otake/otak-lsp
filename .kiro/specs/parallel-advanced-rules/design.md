# 設計: parallel-advanced-rules

## 全体方針

- **境界戦略**: ルール実行のみを worker で並列化する。`prepareRuleContext` (sentences 構築 + originalShared 計算 + lineStarts) は main で 1 度だけ行い、その結果を worker に配ることで N workers × T sentences の重複計算を回避する。
- **シリアライゼーション**: Token / Sentence はメソッドを持つクラスのため、構造化複製では復元できない。`{...token}` で構造体に潰した上で、worker 内で `new Token(params)` / `new Sentence(params)` で再構築する。
- **状態共有**: AdvancedRulesConfig 中の `customNotationRules: Map` は postMessage の構造化複製がそのまま扱える (Map は対応済み)。AdvancedRuleSharedContext はメソッドなしの POD なので問題なし。
- **ルール状態**: 各 worker は自前に `createDefaultAdvancedRules()` で 55 ルールを生成し、stateful な内部キャッシュ (TermNotationRule の compiledTrie, JouyouKanjiRule の internal table 等) は worker ごとに独立に持つ。WeakMap / static state も worker ごとにリセットされるため、main と衝突しない。
- **fallback**: worker 起動・通信エラーは catch し、in-process の async 版にフォールバック。これにより並列化はベストエフォート、解析が止まることはない。

## モジュール構成

```
server/src/workers/
  tokenSerializer.ts          - Token / Sentence の直列化・復元
  contextSerializer.ts        - RuleContext / SharedContext の直列化・復元
  advancedRulesWorker.ts      - worker_threads エントリ
  workerPool.ts               - worker pool マネージャ
  workerPool.test.ts          - WorkerPool の単体テスト
  tokenSerializer.test.ts     - シリアライザの単体テスト
  parallelExecution.test.ts   - 並列 vs 直列の同一性テスト
```

## TokenSerializer

```ts
export type SerializedToken = TokenParams;   // 既存型と同一
export type SerializedSentence = {
  text: string;
  tokens: SerializedToken[];
  start: number;
  end: number;
};

export const serializeToken = (t: Token): SerializedToken => ({ ...t });
export const deserializeToken = (p: SerializedToken): Token => new Token(p);
export const serializeTokens = (ts: Token[]): SerializedToken[] => ts.map(serializeToken);
export const deserializeTokens = (ps: SerializedToken[]): Token[] => ps.map(deserializeToken);

export const serializeSentence = (s: Sentence): SerializedSentence => ({
  text: s.text,
  tokens: serializeTokens(s.tokens),
  start: s.start,
  end: s.end,
});
export const deserializeSentence = (p: SerializedSentence): Sentence => new Sentence({
  text: p.text,
  tokens: deserializeTokens(p.tokens),
  start: p.start,
  end: p.end,
});
```

ポイント: `Token` クラスは `TokenParams` を constructor に取るため、フィールドのスプレッドだけで往復可能。同様に `Sentence` も。

## Worker Entry (advancedRulesWorker.ts)

```ts
// parentPort.on('message', async ({type, ...payload}) => {...})
//
// type:
//   'init'    -> AdvancedRulesManager の lazy 初期化用設定を受け取る。
//                (configデフォルトを保持し、毎リクエストで partial 上書き)
//   'run'     -> 1 回のルール実行を行い、結果を返す。
//   'shutdown'-> postMessage 後 process.exit(0)
//
// 'run' の payload:
//   requestId: number
//   ruleNames: string[]              // 担当ルール
//   config: AdvancedRulesConfig      // 上書き
//   serializedTokens: SerializedToken[]
//   baseContext: {
//     documentText: string,
//     serializedSentences: SerializedSentence[],
//     shared: AdvancedRuleSharedContext,
//   }
//   originalText: string,
//   originalShared?: AdvancedRuleSharedContext,
//   excludedRanges?: ExcludedRange[]
//
// レスポンス:
//   { requestId, diagnostics: SerializedDiagnostic[] }  // 正常
//   { requestId, error: string }                        // 異常
```

Worker 側のフローは:
1. tokens / sentences を deserialize
2. `AdvancedRulesManager` のインスタンスを 1 回作る (init 時)、config だけ毎回上書き
3. `runSingleRule` を担当ルールごとに直列実行
4. 結果の `AdvancedDiagnostic` を `toDiagnostic()` → Diagnostic に変換して返す

注: `AdvancedRulesManager` を worker 内で再利用するが、ルール内部の state は前回呼び出しで構築済みのキャッシュが残る (これは性能上望ましい)。stateful ルールは「同一プロセス内のキャッシュ」を WeakMap で持っており、別 worker でキャッシュが共有されない件は性能の問題のみで正確性に影響しない。

## WorkerPool

```ts
class WorkerPool {
  constructor(workerScript: string, size: number)

  // 起動: lazy (最初の submit で worker を作成)
  // size = max(1, min(cpus().length - 1, configMaxWorkers))

  submit<T>(message: WorkerRequest): Promise<T>
  // round-robin で空き worker に投げる。空きがなければキューに積み、worker が空いたら処理する。

  shutdown(): Promise<void>

  size: number
}
```

リクエスト割当: round-robin + busy 検知。最大同時実行 = size。

エラー: worker が `error` または `exit code != 0` で死んだ場合は、その worker を解雇して残りで動かす。pending promise は `reject` する (呼出側は in-process フォールバック)。

## AdvancedRulesManager 統合

新規 API:

```ts
async checkTextParallel(text, tokens, excludedRanges?, options?, profilingCollector?, precomputedLineStarts?): Promise<Diagnostic[]>
async checkLightweightRulesParallel(text, tokens, excludedRanges?, options?, profilingCollector?, precomputedLineStarts?): Promise<Diagnostic[]>
```

内部:
1. `prepareRuleContext(...)` を 1 度呼ぶ → `{ baseContext, originalText, originalShared }`
2. 担当ルール集合 (`getEnabledRules()` or LIGHTWEIGHT) を取得
3. ルールを K = poolSize パーティションに分割 (`partitionRules`)。負荷の偏り対策として、過去の `RuleProfilingEntry` があればコストでヒューリスティック配分するが、初期実装は単純な round-robin。
4. 各パーティションを `pool.submit({...})` に投げる
5. `Promise.all` で待機、結果を結合
6. ソート (REQ-4) して返す
7. pool 不在時 (initialization 失敗) は `checkSelectedRulesAsync` にフォールバック

## AdvancedRulesConfig の拡張

```ts
parallelExecution?: {
  enabled: boolean;          // default false
  maxWorkers?: number;       // default max(1, cpus().length - 1)
}
```

既定値は disabled なので、既存テスト挙動には影響しない。

## ビルド設定 (esbuild.js)

`buildServer` の後ろに `buildAdvancedRulesWorker` を追加:

```js
async function buildAdvancedRulesWorker() {
  const ctx = await esbuild.context({
    entryPoints: ['server/src/workers/advancedRulesWorker.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'server/out/advancedRulesWorker.js',
    external: ['vscode', 'kuromoji'],
    logLevel: 'warning',
  });
  // ...
}
```

worker bundle は `vscode-languageserver` 等の重い依存を含まないため、main bundle より大幅に軽い。

## テスト戦略

- **tokenSerializer.test.ts**: Token / Sentence ラウンドトリップ、メソッド復元、空配列、特殊文字
- **workerPool.test.ts**: 起動・shutdown、複数同時 submit、worker クラッシュ時の reject、size 上限
- **parallelExecution.test.ts**: 同一テキストで sequential と parallel が同じ診断を返すこと (代表的 markdown サンプル × 5 件)

既存テスト 2768 件: `parallelExecution.enabled = false` がデフォルトなので影響なし。

## デプロイ戦略

- 初期は config 上では disabled。デバッグログで「parallel mode available, currently disabled」と表示。
- ユーザが `otakLsp.advanced.parallelExecution.enabled = true` を設定したときのみ有効化。
- 将来のラウンドでベンチマーク後、デフォルト有効化を検討。

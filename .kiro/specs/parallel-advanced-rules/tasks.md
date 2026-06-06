# タスク: parallel-advanced-rules

## Phase 1: Token / Sentence 直列化基盤

- [ ] Task 1.1: `server/src/workers/tokenSerializer.ts` 作成
  - `serializeToken` / `deserializeToken`
  - `serializeSentence` / `deserializeSentence`
  - 配列版ラッパ
- [ ] Task 1.2: `server/src/workers/tokenSerializer.test.ts` 作成
  - Token メソッド復元 (`isParticle()` 等) の往復確認
  - Sentence メソッド復元 (`endsWithDesuMasu()` 等) の往復確認
  - 大量トークン (1000+) の整合性確認

## Phase 2: WorkerPool

- [ ] Task 2.1: `server/src/workers/workerPool.ts` 作成
  - lazy init、round-robin、shutdown、エラーハンドリング
- [ ] Task 2.2: `server/src/workers/workerPool.test.ts` 作成
  - 起動・shutdown
  - 同時 submit
  - worker クラッシュ時の挙動
  - size 上限

## Phase 3: Worker entry

- [ ] Task 3.1: `server/src/workers/advancedRulesWorker.ts` 作成
  - init / run / shutdown handler
  - tokens / sentences の deserialize
  - 担当ルールのみ実行
  - 結果を serialize して送信
- [ ] Task 3.2: esbuild 設定追加 (`esbuild.js`)
  - `buildAdvancedRulesWorker()` を追加し並行ビルド

## Phase 4: AdvancedRulesManager 統合

- [ ] Task 4.1: `AdvancedRulesConfig` に `parallelExecution` を追加
- [ ] Task 4.2: `AdvancedRulesManager` に `checkTextParallel` / `checkLightweightRulesParallel` を追加
- [ ] Task 4.3: in-process フォールバック
- [ ] Task 4.4: `parallelExecution.test.ts` で sequential と parallel の同一性確認

## Phase 5: 統合とビルド

- [ ] Task 5.1: `tsc -b` パス
- [ ] Task 5.2: 既存全 2768 テスト pass
- [ ] Task 5.3: esbuild ビルド成功
- [ ] Task 5.4: README / TasksDoc に追記 (今回はスコープ外)

## スコープ外 (次仕様)

- ユーザ設定 UI (`otakLsp.advanced.parallelExecution.*` の package.json 追加)
- `documentAnalyzer` での parallel パス有効化
- ベンチマーク・性能チューニング

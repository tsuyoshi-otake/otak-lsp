# 要件定義: parallel-advanced-rules

## 背景

高度ルール (advancedRulesManager) は約 55 件のルールを直列実行している。先行ラウンドで `setImmediate` 協調スケジューリングを導入し LSP の応答性は改善したが、Node.js のシングルスレッドモデルのため CPU 総量は変わらず、Amdahl 法則上の最大の順次部分はそのまま残っている。

本仕様は `worker_threads` を用いて高度ルールを物理コア数までスケールさせる基盤を追加する。

## 受入条件 (EARS)

1. **REQ-1**: テキスト・トークン・除外範囲を worker 境界で構造化複製で渡せる Token 直列化基盤を提供する。Token / Sentence は worker 内でクラスメソッドを伴って再構築できなければならない。
2. **REQ-2**: 高度ルール用の worker pool を提供する。初期化は遅延、ワーカー数は既定で `max(1, cpus().length - 1)` を上限とし、設定で上書き可能とする。
3. **REQ-3**: 状態共有戦略として、main 側で `prepareRuleContext` を 1 度だけ実行し、その結果 (`baseContext`, `originalShared`, `excludedRanges`, `ruleNames` のパーティション) を worker に配ること。Sentence parse をワーカーで重複実行してはならない。
4. **REQ-4**: ルール間の状態依存はないため、ルール集合を K パーティションに均等分割して並列実行し、結果を再結合できなければならない。診断のソート順序は (range.start.line, range.start.character, code) で安定でなければならない。
5. **REQ-5**: 既存の同期 API (`checkText`, `checkLightweightRules`) と非同期協調 API (`checkTextAsync`, `checkLightweightRulesAsync`) は不変。並列実行は新規 API (`checkTextParallel`, `checkLightweightRulesParallel`) として追加する。
6. **REQ-6**: 並列実行はフィーチャーフラグ `parallelExecution.enabled` で制御され、デフォルトは `false`。既存テスト 2768 件はフラグ off で全 pass を維持する。
7. **REQ-7**: worker bundle は esbuild の独立 entrypoint としてビルドされ、`server/out/advancedRulesWorker.js` に出力されること。LSP server バンドルとの循環参照を起こさないこと。
8. **REQ-8**: parallel 実行と sequential 実行は、同一入力に対して同一の診断集合 (msg/code/range が一致) を返さなければならない。
9. **REQ-9**: worker pool は正常 shutdown と異常終了の双方を扱える。worker クラッシュ時は in-process フォールバックで完走させる。
10. **REQ-10**: 解析パイプラインのプロファイルログ (`enableProfileLogs`) で「高度ルール評価 (parallel: N workers)」のような形で測定可能であること。

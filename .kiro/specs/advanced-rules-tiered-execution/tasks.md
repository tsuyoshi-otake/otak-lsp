# 実装計画: 高度ルール段階実行

## タスク

- [x] 1. 設定項目の追加
  - `package.json` に `otakLsp.advanced.tieredExecution.enabled` と `idleDelayMs` を追加
  - `shared/src/advancedTypes.ts` に設定値を保持するフィールドを追加
  - `applyAdvancedConfigFromSettings` で設定を読み込む

- [x] 2. ルール分類の実装
  - `AdvancedRulesManager` に軽量ルール名リストを追加
  - `checkWithRules` で軽量ルールのみ実行できるようにする

- [x] 3. 段階実行のスケジューリング
  - `server/src/main.ts` にアイドル用タイマーを追加
  - 編集時は軽量ルール、アイドル/保存時は全ルールを実行
  - 解析競合（stale判定）ロジックを維持する

- [x] 4. 診断の更新制御
  - 軽量ルールのみの診断送信と、全ルール実行時の上書きを整理
  - ルール種別に応じた診断のソース/コードは維持

- [ ] 5. 手動確認
  - 入力中は軽量ルールのみ、停止後に全ルールが更新されることを確認
  - 保存時に全ルールが実行されることを確認

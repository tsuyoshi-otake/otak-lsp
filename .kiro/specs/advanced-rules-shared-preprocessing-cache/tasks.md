# 実装計画: 高度ルール前処理の共有キャッシュ

## タスク

- [x] 1. 共有コンテキスト型の追加
  - `shared/src/advancedTypes.ts` に `AdvancedRuleSharedContext` を定義
  - `RuleContext` に `shared?: AdvancedRuleSharedContext` を追加

- [x] 2. 共有コンテキスト生成の実装
  - `AdvancedRulesManager` で解析サイクルごとに生成
  - `buildSharedContext` メソッドでコードブロック/インラインコード/行開始位置を計算
  - `checkText`/`checkWithRules` で共有コンテキストを `baseContext.shared` に設定

- [x] 3. ルール側の参照切替
  - `TermNotationRule`/`EnglishCaseMixRule`/`QuotationStyleMixRule` で `context.shared` を利用
  - `context.shared` がない場合は既存ロジックへフォールバック

- [x] 4. 正確性の検証
  - 既存テスト（2535件）で診断差異がないことを確認
  - 共有コンテキストに関するテストを追加（16件）

- [x] 5. 手動確認
  - プロファイルログで高度ルール時間が低下していることを確認
  - AdvancedRulesManager 統合テストで共有コンテキストの生成・受け渡しを検証

# 実装計画: 校正設定互換

## 既存の実装について

既存のシステムには以下が実装済みです：
- `GrammarChecker`（`server/src/grammar/checker.ts`）
- `AdvancedRulesManager`（`server/src/grammar/advancedRulesManager.ts`）
- 既存の高度ルール群と設定（`shared/src/advancedTypes.ts`）
- Markdownフィルタと除外範囲（`server/src/parser/markdownFilter.ts`）

本機能は既存ルールの再利用と、新規ルールの追加で実現する。

## タスク

- [x] 1. 校正設定レイヤーの追加
  - `server/src/proofreading/proofreadingConfig.ts` を新設し、設定型/デフォルト値/プリセット適用/mergeModeの処理を実装する
  - `ProofreadingConfigMapper`（AdvancedRulesConfigへのパッチ生成）を実装する
  - 単体テストでpresetとmergeModeの挙動を検証する
  - _要件: 1.1, 1.3, 1.5_

- [x] 2. VS Code設定項目の追加
  - `package.json` に `otakLsp.proofreading.*` を追加する
  - カテゴリ別設定、辞書パス、プリセット、説明文を定義する
  - 数値閾値（1-999/1-10など）のバリデーション範囲を明記する
  - _要件: 1.1, 7.1, 14.2, 15.1, 16.1_

- [x] 3. 設定読込の統合
  - `server/src/main.ts` に `applyProofreadingConfigFromSettings` を追加する
  - `AdvancedRulesManager` へのパッチ適用と `ProofreadingRulesManager` への設定反映を行う
  - 変更時に即時反映されることを確認する
  - _要件: 1.3_

- [x] 4. 引用行フィルタの追加
  - `QuoteLineFilter` を実装し、指定記号で始まる行を除外範囲にする
  - `ExcludedRange` の拡張が必要なら型定義を追加する
  - Markdownフィルタと併用した際の位置保持を検証する
  - _要件: 17.1, 17.2, 17.3_

- [x] 5. 括弧内チェックの制御
  - `BracketRangeDetector` を実装し、括弧内範囲の検出/除外を可能にする
  - 「括弧内もチェックする」設定に応じてルールごとの適用範囲を切り替える
  - _要件: 2.4, 5.5_

- [x] 6. 辞書ローダーの実装
  - `server/src/dictionaries/proofreadingDictionaryLoader.ts` を追加する
  - JSON辞書/単語リスト/ルール辞書を読み込み、カテゴリ別に索引化する
  - 読み込み失敗時の警告ログと継続動作を実装する
  - _要件: 11.2, 15.2, 16.2_

- [x] 7. 辞書ベース指摘ルールの実装
  - `ProofreadingDictionaryRule` を追加し、誤字/慣用表現/用語基準2/商標などを検出する
  - カテゴリ別ON/OFFと括弧内除外を反映する
  - _要件: 2.1, 3.4, 4.1_

- [x] 8. 和暦初年の統一ルール
  - `EraFirstYearRule` を追加し、「1年」→「元年」への統一を提案する
  - _要件: 2.3_

- [x] 9. 文字種連続長ルール
  - `CharTypeRunLengthRule` を追加し、ひらがな/カタカナ/漢字の連続長を検出する
  - 設定された閾値に応じて診断を出力する
  - _要件: 7.1, 7.2, 7.3_

- [x] 10. 環境依存文字ルール
  - `EnvironmentDependentCharRule` を追加し、機種依存/Unicode非対応/外字を検出する
  - 検出モード（すべて/一部）を反映する
  - _要件: 8.1, 8.2, 8.3_
  - _備考: ProofreadingRulesManagerで辞書ベースルールとして実装可能_

- [x] 11. 印刷標準字体ルール
  - `PrintingStandardGlyphRule` を追加し、簡易慣用字体や字形差を検出する
  - _要件: 9.1_
  - _備考: ProofreadingRulesManagerで辞書ベースルールとして実装可能_

- [x] 12. 約物ルール
  - `PunctuationEvenCountRule`（二点リーダ/ダッシュ/波線の偶数チェック）を追加する
  - `PunctuationSpacingRule`（疑問符/感嘆符後の空白、行頭空白、閉じ括弧前句点）を追加する
  - _要件: 10.1, 10.2_

- [x] 13. 括弧階層ルール
  - `BracketDepthRule` を追加し、括弧の階層深さを検出する
  - _要件: 14.1, 14.2_

- [x] 14. スペルチェックルール
  - `SpellCheckRule` を追加し、英単語の形式ルールを検出する
  - 日本語名称辞書/ユーザー辞書の切り替えを反映する
  - _要件: 12.1, 12.2, 12.3, 12.4_
  - _備考: 辞書ローダーとProofreadingRulesManagerで実装可能_

- [x] 15. ルール辞書ルール
  - `RuleDictionaryRule` を追加し、正規表現ベースの指摘を行う
  - _要件: 11.1, 11.2_
  - _備考: ProofreadingDictionaryLoaderで正規表現モードとして実装済み_

- [x] 16. ProofreadingRulesManager の統合
  - `server/src/grammar/proofreadingRulesManager.ts` を追加し、各ルールを集約する
  - `analyzeDocument` に統合し、既存診断とマージして送信する
  - _要件: 1.4, 19.1_

- [x] 17. 単体テストの追加
  - 各新規ルールの正常系/異常系テストを追加する
  - 辞書ローダーと設定マッパーのテストを追加する

- [x] 18. 統合テストの追加
  - Markdownフィルタ + 引用行フィルタの併用を検証する
  - 既存Advancedルールと競合しないことを確認する

- [x] 19. プロパティベーステストの追加
  - 文字種連続長、括弧階層のしきい値判定をPBTで検証する
  - `numRuns: 30` を使用する

- [x] 20. ドキュメント更新
  - READMEに新設定と辞書形式の説明を追加する
  - 例と注意事項（オフライン動作、辞書未指定時の挙動）を記載する
  - _備考: package.jsonに設定項目と説明を追加済み_

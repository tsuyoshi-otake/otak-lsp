# 実装計画

- [x] 1. NGパターンデータの拡張
  - `ng-examples-data.ts` に新しいカテゴリを追加
  - 各カテゴリに複数の例文を定義
  - _要件: 1.1, 1.2, 1.3, 1.4_

- [x] 1.1 句読点スタイル混在のNGパターンを追加
  - カテゴリID: `punctuation-style-mix`
  - 例文: 「、。」と「，．」の混在パターン
  - _要件: 5.1_

- [x] 1.2 引用符スタイル混在のNGパターンを追加
  - カテゴリID: `quotation-style-mix`
  - 例文: 「「」」と「""」と「''」の混在パターン
  - _要件: 5.2_

- [x] 1.3 箇条書き記号混在のNGパターンを追加
  - カテゴリID: `bullet-style-mix`
  - 例文: 「・」と「-」と「*」の混在パターン
  - _要件: 5.3_

- [x] 1.4 強調記号混在のNGパターンを追加
  - カテゴリID: `emphasis-style-mix`
  - 例文: 「**」と「__」の混在パターン
  - _要件: 5.4_

- [x] 1.5 英語表記混在のNGパターンを追加
  - カテゴリID: `english-case-mix`
  - 例文: api/API/Apiなどの大文字小文字混在パターン
  - _要件: 7.1_

- [x] 1.6 単位表記混在のNGパターンを追加
  - カテゴリID: `unit-notation-mix`
  - 例文: km/h と キロメートル毎時 の混在パターン
  - _要件: 7.2_

- [x] 1.7 人称代名詞混在のNGパターンを追加
  - カテゴリID: `pronoun-mix`
  - 例文: 私/僕/自分/当方の混在パターン
  - _要件: 7.3_

- [x] 1.8 見出しレベル飛びのNGパターンを追加
  - カテゴリID: `heading-level-skip`
  - 例文: h1の次にh3などのパターン
  - _要件: 6.1_

- [x] 1.9 テーブル列数不一致のNGパターンを追加
  - カテゴリID: `table-column-mismatch`
  - 例文: 列数が行ごとに異なるテーブル
  - _要件: 6.2_

- [x] 1.10 コードブロック言語指定欠落のNGパターンを追加
  - カテゴリID: `code-block-language`
  - 例文: 言語指定のないコードブロック
  - _要件: 6.3_

- [x] 2. 混在検出ルールの基底クラスを実装
  - `server/src/grammar/rules/mixDetectionRule.ts` を作成
  - `MixDetectionRule` 抽象クラスを実装
  - パターン収集、混在検出、診断メッセージ生成の共通機能を提供
  - _要件: 2.1, 2.2, 2.3_

- [x] 2.1 混在検出ルール基底クラスのユニットテストを作成
  - `mixDetectionRule.test.ts` を作成
  - パターン収集のテスト
  - 混在検出のテスト
  - _要件: 2.2, 2.3_

- [x] 3. 句読点スタイル混在ルールを実装
  - `server/src/grammar/rules/punctuationStyleMixRule.ts` を作成
  - `PunctuationStyleMixRule` クラスを実装
  - 「、。」と「，．」の混在を検出
  - _要件: 2.1, 2.2, 2.3, 5.1_

- [x] 3.1 句読点スタイル混在ルールのプロパティテストを作成
  - **プロパティ 5: 混在検出の対称性**
  - **検証: 要件 5.1**
  - _要件: 5.1_

- [x] 4. 引用符スタイル混在ルールを実装
  - `server/src/grammar/rules/quotationStyleMixRule.ts` を作成
  - `QuotationStyleMixRule` クラスを実装
  - 「「」」と「""」と「''」の混在を検出
  - _要件: 2.1, 2.2, 2.3, 5.2_

- [x] 4.1 引用符スタイル混在ルールのプロパティテストを作成
  - **プロパティ 5: 混在検出の対称性**
  - **検証: 要件 5.2**
  - _要件: 5.2_

- [x] 5. 箇条書き記号混在ルールを実装
  - `server/src/grammar/rules/bulletStyleMixRule.ts` を作成
  - `BulletStyleMixRule` クラスを実装
  - 「・」と「-」と「*」の混在を検出
  - _要件: 2.1, 2.2, 2.3, 5.3_

- [x] 5.1 箇条書き記号混在ルールのプロパティテストを作成
  - **プロパティ 5: 混在検出の対称性**
  - **検証: 要件 5.3**
  - _要件: 5.3_

- [x] 6. 強調記号混在ルールを実装
  - `server/src/grammar/rules/emphasisStyleMixRule.ts` を作成
  - `EmphasisStyleMixRule` クラスを実装
  - 「**」と「__」の混在を検出
  - _要件: 2.1, 2.2, 2.3, 5.4_

- [x] 6.1 強調記号混在ルールのプロパティテストを作成
  - **プロパティ 5: 混在検出の対称性**
  - **検証: 要件 5.4**
  - _要件: 5.4_

- [x] 7. チェックポイント - フェーズ1の完了確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 8. 英語表記混在ルールを実装
  - `server/src/grammar/rules/englishCaseMixRule.ts` を作成
  - `EnglishCaseMixRule` クラスを実装
  - 同じ英単語の大文字小文字混在を検出
  - _要件: 2.1, 2.2, 2.3, 7.1_

- [x] 8.1 英語表記混在ルールのユニットテストを作成
  - api/API/Apiの混在を検出するテスト
  - _要件: 7.1_

- [x] 9. 単位表記混在ルールを実装
  - `server/src/grammar/rules/unitNotationMixRule.ts` を作成
  - `UnitNotationMixRule` クラスを実装
  - km/h と キロメートル毎時 の混在を検出
  - _要件: 2.1, 2.2, 2.3, 7.2_

- [x] 9.1 単位表記混在ルールのユニットテストを作成
  - 単位表記の混在を検出するテスト
  - _要件: 7.2_

- [x] 10. 人称代名詞混在ルールを実装
  - `server/src/grammar/rules/pronounMixRule.ts` を作成
  - `PronounMixRule` クラスを実装
  - 私/僕/自分/当方の混在を検出
  - _要件: 2.1, 2.2, 2.3, 7.3_

- [x] 10.1 人称代名詞混在ルールのユニットテストを作成
  - 人称代名詞の混在を検出するテスト
  - _要件: 7.3_

- [x] 11. チェックポイント - フェーズ2の完了確認
  - すべてのテストが通ることを確認
  - ユーザーに質問があれば確認

- [x] 12. 見出しレベル飛びルールを実装
  - `server/src/grammar/rules/headingLevelSkipRule.ts` を作成
  - `HeadingLevelSkipRule` クラスを実装
  - h1の次にh3などのパターンを検出
  - _要件: 2.1, 2.2, 2.3, 6.1_

- [x] 12.1 見出しレベル飛びルールのユニットテストを作成
  - 見出しレベルの飛びを検出するテスト
  - _要件: 6.1_

- [x] 13. テーブル列数不一致ルールを実装
  - `server/src/grammar/rules/tableColumnMismatchRule.ts` を作成
  - `TableColumnMismatchRule` クラスを実装
  - 列数が行ごとに異なるテーブルを検出
  - _要件: 2.1, 2.2, 2.3, 6.2_

- [x] 13.1 テーブル列数不一致ルールのユニットテストを作成
  - テーブル列数の不一致を検出するテスト
  - _要件: 6.2_

- [x] 14. コードブロック言語指定欠落ルールを実装
  - `server/src/grammar/rules/codeBlockLanguageRule.ts` を作成
  - `CodeBlockLanguageRule` クラスを実装
  - 言語指定のないコードブロックを検出
  - _要件: 2.1, 2.2, 2.3, 6.3_

- [x] 14.1 コードブロック言語指定欠落ルールのユニットテストを作成
  - 言語指定のないコードブロックを検出するテスト
  - _要件: 6.3_

- [x] 15. ルールをAdvancedRulesManagerに登録
  - `server/src/grammar/advancedRulesManager.ts` を更新
  - すべての新しいルールを登録
  - _要件: 2.4_

- [x] 16. ルールをindex.tsにエクスポート
  - `server/src/grammar/rules/index.ts` を更新
  - すべての新しいルールをエクスポート
  - _要件: 2.4_

- [x] 17. EvalsRunnerに新しいルールを追加
  - `server/src/grammar/evals/evals-runner.ts` を更新
  - `initializeAdvancedRules()` に新しいルールを追加
  - _要件: 3.1_

- [x] 17.1 EvalsRunnerの統合テストを作成
  - 新しいカテゴリが評価されることを確認
  - **プロパティ 3: 検出率の計算正確性**
  - **検証: 要件 3.2**
  - _要件: 3.1, 3.2_

- [x] 18. package.jsonに設定項目を追加
  - `package.json` の `contributes.configuration` を更新
  - 各ルールのON/OFF設定を追加
  - _要件: 4.3_

- [x] 19. DEFAULT_ADVANCED_RULES_CONFIGを更新
  - `shared/src/advancedTypes.ts` を更新
  - 新しいルールのデフォルト設定を追加
  - _要件: 4.3_

- [x] 20. Evalsを実行してレポートを生成
  - `npm run evals` を実行
  - `evals-report.md` が生成されることを確認
  - 新しいカテゴリの検出率を確認
  - _要件: 3.3_

- [x] 21. READMEを更新
  - `npm run evals:update-readme` を実行
  - README.mdに新しいカテゴリが追加されることを確認
  - _要件: 3.4_

- [x] 22. 統合テスト - 実際の文書での検出確認
  - 新しいNGパターンを含むテスト文書を作成
  - 各ルールが正しく検出することを確認
  - _要件: 4.1, 4.2_

- [x] 23. 最終チェックポイント
  - すべてのテストが通ることを確認
  - Evalsの検出率が期待通りであることを確認
  - ユーザーに質問があれば確認

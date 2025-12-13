# 実装計画

- [x] 1. 型定義の更新
  - `shared/src/advancedTypes.ts`を更新して、新しいエラータイプと設定を追加する
  - `AdvancedGrammarErrorType`に`'sentence-ending-colon'`を追加
  - `AdvancedRulesConfig`に`enableSentenceEndingColon: boolean`を追加
  - `DEFAULT_ADVANCED_RULES_CONFIG`に`enableSentenceEndingColon: true`を追加
  - `SentenceEndingColon`インターフェースを追加
  - _要件: 4.1, 4.2, 4.3_

- [x] 2. SentenceEndingColonRuleの実装
  - `server/src/grammar/rules/sentenceEndingColonRule.ts`を作成する
  - `AdvancedGrammarRule`インターフェースを実装
  - `endsWithColon()`メソッドを実装（文末の全角コロンを検出）
  - `isBulletListPrefix()`メソッドを実装（箇条書き前置き文を判定）
  - `check()`メソッドを実装（文末コロンを検出し診断を生成）
  - `isEnabled()`メソッドを実装（設定に基づいて有効/無効を判定）
  - _要件: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3_

- [x] 2.1 プロパティテストを実装
  - **プロパティ 1: 文末コロンの検出**
  - **検証: 要件 1.1**
  - _要件: 5.2_

- [x] 2.2 プロパティテストを実装
  - **プロパティ 2: 修正提案の提供**
  - **検証: 要件 1.2, 3.2**
  - _要件: 5.2_

- [x] 2.3 プロパティテストを実装
  - **プロパティ 3: 文中コロンの除外**
  - **検証: 要件 1.3**
  - _要件: 5.2_

- [x] 2.4 プロパティテストを実装
  - **プロパティ 4: 箇条書き前置きの除外**
  - **検証: 要件 1.4**
  - _要件: 5.2_

- [x] 2.5 プロパティテストを実装
  - **プロパティ 5: 半角コロンの除外**
  - **検証: 要件 1.5**
  - _要件: 5.2_

- [x] 2.6 プロパティテストを実装
  - **プロパティ 6: 設定による制御**
  - **検証: 要件 2.2**
  - _要件: 5.2_

- [x] 3. ルールの登録
  - `server/src/grammar/rules/index.ts`に`SentenceEndingColonRule`をエクスポート
  - `server/src/grammar/advancedRulesManager.ts`に`SentenceEndingColonRule`をインポート
  - `AdvancedRulesManager`のコンストラクタで`SentenceEndingColonRule`を登録
  - _要件: 4.4_

- [x] 4. VS Code設定の追加
  - `package.json`の`contributes.configuration.properties`に設定を追加
  - 設定キー: `otakLcp.advanced.enableSentenceEndingColon`
  - デフォルト値: `true`
  - 説明文を日本語で記述
  - _要件: 2.1, 2.2, 2.3_

- [x] 5. ユニットテストの実装
  - `server/src/grammar/rules/sentenceEndingColonRule.test.ts`を作成
  - 基本的な文末コロンの検出テスト
  - 文中のコロンは検出しないテスト
  - 箇条書き前置きのコロンは検出しないテスト
  - 半角コロンは検出しないテスト
  - 空の文の処理テスト
  - 設定による有効/無効の切り替えテスト
  - _要件: 5.1_

- [x] 6. 評価データの追加
  - `server/src/grammar/evals/ng-examples-data.ts`に評価データを追加
  - 文末コロンのテストケースを追加
  - 文中のコロンのテストケースを追加
  - 箇条書き前置きのテストケースを追加
  - 半角コロンのテストケースを追加
  - _要件: 5.3, 5.4_

- [x] 7. 評価の実行と検証
  - `npm run evals`を実行して検出率を確認
  - 検出率が100%であることを確認
  - 誤検出がないことを確認
  - _要件: 5.3, 5.4_

- [x] 8. READMEの更新
  - README.mdに新しいルールの説明を追加
  - 高度な文法チェックルールのセクションに追加
  - 設定表に新しい設定項目を追加
  - 使用例を追加
  - _要件: 3.1, 3.2_

- [x] 9. 評価結果のREADME反映
  - `npm run evals:update-readme`を実行
  - README.mdの評価表に「文末コロン」の行が追加されることを確認
  - _要件: 5.3_

- [x] 10. チェックポイント - すべてのテストが通ることを確認
  - すべてのテストが通ることを確認し、問題があればユーザーに質問する

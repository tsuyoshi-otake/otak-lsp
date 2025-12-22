# Implementation Plan: 公文書表記ルール

## Overview

公文書（公用文）作成における表記・用語ルールをチェックする3つのルールを実装する。既存の `AdvancedRulesManager` に統合し、VSCode設定で個別にON/OFF可能とする。

## Tasks

- [x] 1. 型定義とデータの追加
  - [x] 1.1 advancedTypes.tsにエラータイプと設定を追加
    - `AdvancedGrammarErrorType`に3つのタイプを追加
    - `AdvancedRulesConfig`に4つの設定を追加
    - `DEFAULT_ADVANCED_RULES_CONFIG`にデフォルト値を追加
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 1.2 常用漢字データファイルを作成
    - `shared/src/jouyouKanjiData.ts`を作成
    - 常用漢字表（2136字）をSetとして定義
    - 代替提案マップを定義（主要な常用漢字外の漢字に対して）
    - _Requirements: 3.5_

  - [x] 1.3 常用漢字データのプロパティテスト
    - **Property 3: 常用漢字判定の正確性**
    - **Validates: Requirements 3.1, 3.2, 3.5**

- [x] 2. 「及び/並びに」ルールの実装
  - [x] 2.1 OyobiNarabiniRuleを実装
    - `server/src/grammar/rules/oyobiNarabiniRule.ts`を作成
    - 文中の「及び」「並びに」を検出
    - 「並びに」単独使用を警告
    - 3つ以上の並列で「並びに」使用を提案
    - 診断メッセージに根拠を含める
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 2.2 OyobiNarabiniRuleのプロパティテスト
    - **Property 1: 接続詞検出の完全性（及び/並びに）**
    - **Property 2: 単独使用警告の正確性（並びに）**
    - **Validates: Requirements 1.1, 1.3**

- [x] 3. 「又は/若しくは」ルールの実装
  - [x] 3.1 MatawaWakushikuwaRuleを実装
    - `server/src/grammar/rules/matawaWakushikuwaRule.ts`を作成
    - 文中の「又は」「若しくは」を検出
    - 「若しくは」単独使用を警告
    - 3つ以上の選択肢で「若しくは」使用を提案
    - 診断メッセージに根拠を含める
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 MatawaWakushikuwaRuleのプロパティテスト
    - **Property 1: 接続詞検出の完全性（又は/若しくは）**
    - **Property 2: 単独使用警告の正確性（若しくは）**
    - **Validates: Requirements 2.1, 2.3**

- [x] 4. 常用漢字外検出ルールの実装
  - [x] 4.1 JouyouKanjiRuleを実装
    - `server/src/grammar/rules/jouyouKanjiRule.ts`を作成
    - テキスト中の漢字を抽出
    - 常用漢字表との照合
    - 固有名詞除外オプションの実装
    - 代替提案の出力
    - 診断メッセージに根拠を含める
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 4.2 JouyouKanjiRuleのプロパティテスト
    - **Property 3: 常用漢字判定の正確性**
    - **Property 4: 固有名詞除外オプションの動作**
    - **Validates: Requirements 3.1, 3.2, 3.4**

- [x] 5. ルールの統合
  - [x] 5.1 index.tsにエクスポートを追加
    - `server/src/grammar/rules/index.ts`に3つのルールを追加
    - _Requirements: 4.1_

  - [x] 5.2 AdvancedRulesManagerにルールを登録
    - `server/src/grammar/advancedRulesManager.ts`に3つのルールを登録
    - _Requirements: 4.1, 4.3_

  - [x] 5.3 設定によるルール有効/無効のプロパティテスト
    - **Property 5: 設定によるルール有効/無効の切り替え**
    - **Validates: Requirements 4.1**

- [x] 6. VSCode設定の追加
  - [x] 6.1 package.jsonに設定項目を追加
    - `otakLsp.official.enableOyobiNarabini`
    - `otakLsp.official.enableMatawaWakushikuwa`
    - `otakLsp.official.enableJouyouKanji`
    - `otakLsp.official.excludeProperNounsFromJouyouKanji`
    - デフォルト値: ルールは無効、固有名詞除外は有効
    - _Requirements: 4.2, 4.4, 4.5_

  - [x] 6.2 main.tsで設定を読み込み
    - 設定変更時の反映処理を追加
    - _Requirements: 4.3_

- [x] 7. Checkpoint - 全テスト実行
  - すべてのテストが通ることを確認
  - 問題があればユーザーに確認

- [x] 8. 診断メッセージ品質のプロパティテスト
  - [x] 8.1 診断メッセージの品質テスト
    - **Property 6: 診断メッセージの品質**
    - **Validates: Requirements 5.1, 5.2, 5.3**

  - [x] 8.2 診断の重要度テスト
    - **Property 7: 診断の重要度**
    - **Validates: Requirements 5.4**

- [x] 9. Evalsデータの追加
  - [x] 9.1 公文書ルール用のNGパターンデータを追加
    - `server/src/grammar/evals/ng-examples-data.ts`に追加
    - 「及び/並びに」の誤用パターン
    - 「又は/若しくは」の誤用パターン
    - 常用漢字外使用パターン
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 10. Final Checkpoint
  - すべてのテストが通ることを確認
  - `npm run evals`で検出率を確認
  - 問題があればユーザーに確認

## Notes

- すべてのタスクは必須（プロパティテストを含む）
- 各ルールは既存のルールパターン（`ConjunctionRepetitionRule`など）を参考に実装
- 常用漢字データは2136字すべてを含める（ファイルサイズは約10KB程度）
- 診断メッセージは日本語で、根拠（「公用文作成の考え方」「常用漢字表」など）を明記

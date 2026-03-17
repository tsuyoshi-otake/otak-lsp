# 実装計画: glossary-ja-json-rebuild

## 概要

ja.json（9,552エントリ、226ドメイン）を唯一のデータソースとして、既存の手動定義辞書データを置き換える。変換スクリプトでTypeScriptソースコードを生成し、既存の検索・表示APIとの互換性を維持する。

## タスク

- [x] 1. 変換スクリプトのコアロジック実装
  - [x] 1.1 `scripts/generate-glossary-from-json.ts` を作成し、ja.jsonの読み込み・パース処理を実装する
    - `JaJsonEntry` インターフェースを定義する
    - `ja.json` をファイルシステムから読み込みパースする関数を実装する
    - エラーハンドリング: ファイル不在・パースエラー時にexit code 1で終了
    - _Requirements: 6.1, 6.2_

  - [x] 1.2 `convertJaJsonEntry` 関数を実装する
    - `term` フィールドをそのまま `GlossaryEntry.term` に設定する
    - `normalizedTerms` から `term` と `reading` を除外した残りを `aliases` に設定する（空なら `undefined`）
    - 単一senseの場合は `senses[0].definition` を `description` に設定する
    - 複数senseの場合は各senseの `definition` をドメイン日本語ラベル付き（`【ラベル】`形式）で結合する
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 6.6_

  - [x] 1.3 ドメインマッピングテーブル（`DOMAIN_MAPPING: Record<string, GlossaryId>`）を定義する
    - 設計書のマッピング表に基づき、226ドメインすべてを既存の `GlossaryId` に対応付ける
    - 未知ドメインは `'it'` にフォールバックし、警告メッセージを標準エラーに出力する
    - _Requirements: 2.1, 2.2, 2.3, 2.5, 6.4_

  - [x] 1.4 カテゴリ決定ロジックを実装する
    - 複数senseを持つエントリは最初のsense（`senses[0]`）の `domain` でカテゴリを決定する
    - `DOMAIN_MAPPING` を参照して `GlossaryId` を返す
    - _Requirements: 2.6_

  - [x] 1.5 Property 1のプロパティテストを作成する（`scripts/generate-glossary-from-json.property.test.ts`）
    - **Property 1: エントリ変換のaliases生成正確性**
    - ランダムなja.jsonエントリを生成し、`convertJaJsonEntry` の `aliases` 変換が正確であることを検証する
    - fast-check `numRuns: 30`
    - **Validates: Requirements 1.1, 1.2, 1.5, 1.6**

  - [x] 1.6 Property 2のプロパティテストを作成する（`scripts/generate-glossary-from-json.property.test.ts`）
    - **Property 2: description生成の正確性**
    - ランダムなsense数のエントリを生成し、`description` 生成ロジックを検証する
    - fast-check `numRuns: 30`
    - **Validates: Requirements 1.3, 1.4, 6.6**

  - [x] 1.7 Property 3〜5のプロパティテストを作成する（`scripts/generate-glossary-from-json.property.test.ts`）
    - **Property 3: ドメインマッピングの1対1制約** — `Record<string, GlossaryId>` 型の構造的保証を検証
    - **Property 4: 最初のsenseによるカテゴリ決定** — 複数senseエントリのカテゴリ決定ロジックを検証
    - **Property 5: 未知ドメインのフォールバック** — マッピングに存在しないドメインが `'it'` を返すことを検証
    - fast-check `numRuns: 30`
    - **Validates: Requirements 2.5, 2.6, 6.4**

- [x] 2. チェックポイント - 変換ロジックの検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 3. TypeScriptコード生成とファイル出力
  - [x] 3.1 `scripts/generate-glossary-from-json.ts` にTypeScriptコード生成ロジックを実装する
    - `GlossaryId` ごとにエントリをグルーピングする
    - `server/src/hover/generatedGlossaryData.ts` を出力する
    - 自動生成ヘッダコメント、ドメインマッピング情報コメントを含める
    - `GeneratedGlossaryCategory` インターフェースと `GENERATED_GLOSSARY_DATA` 定数をエクスポートする
    - エントリにtermがない/sensesがない場合は警告を出力してスキップする
    - _Requirements: 6.2, 6.3, 6.5, 4.6_

  - [x] 3.2 変換スクリプトを実行して `server/src/hover/generatedGlossaryData.ts` を生成する
    - `npx ts-node scripts/generate-glossary-from-json.ts` で実行
    - 生成されたファイルの内容を確認する
    - _Requirements: 6.1, 6.2_

  - [x] 3.3 変換スクリプトの単体テストを作成する（`scripts/generate-glossary-from-json.test.ts`）
    - 全226ドメインがマッピングに存在することを確認する
    - 空aliasesのundefined化を確認する
    - 複数senseのdescription結合を確認する
    - _Requirements: 2.1, 1.6, 1.4_

- [x] 4. glossaryData.tsの再構築と個別辞書ファイルの削除
  - [x] 4.1 `server/src/hover/glossaryData.ts` を変更する
    - 17個の個別辞書ファイルのインポートをすべて削除する
    - `GENERATED_GLOSSARY_DATA` をインポートする
    - BASE_GLOSSARIESの構築ロジックを変更: 生成データからカテゴリを構築し、`otakLspSettings` は手動定義を維持する
    - クラウドサービス系カテゴリは `consoleGlossaryBuilder` との `mergeGlossaryEntries` 統合を維持する
    - `mergeTermNotationIntoGlossaries`、`GLOSSARIES`、`DEFAULT_ENABLED_GLOSSARIES`、`GLOSSARY_INDEX` のエクスポートは維持する
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 5.4_

  - [x] 4.2 個別辞書ファイル17個を削除する
    - `gitGlossary.ts`, `npmGlossary.ts`, `dockerGlossary.ts`, `linuxGlossary.ts`, `windowsGlossary.ts`, `powershellGlossary.ts`, `oracleGlossary.ts`, `mysqlGlossary.ts`, `javaCliGlossary.ts`, `mavenGlossary.ts`, `gradleGlossary.ts`, `devProcessGlossary.ts`, `ipaMetricsGlossary.ts`, `enterpriseArchGlossary.ts`, `yarnGlossary.ts`, `pnpmGlossary.ts`, `pipGlossary.ts`
    - _Requirements: 3.2_

  - [x] 4.3 `npm run compile` でビルドが通ることを確認する
    - 削除したファイルへの参照が残っていないことを確認する
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. チェックポイント - ビルドとデータ統合の検証
  - すべてのテストが通ることを確認し、不明点があればユーザーに質問する。

- [x] 6. 統合テストとプロパティテスト
  - [x] 6.1 `server/src/hover/glossaryData.test.ts` に統合テストを作成する
    - `otakLspSettings` カテゴリにエントリが存在することを確認する
    - `consoleGlossaryBuilder` 由来のエントリが含まれることを確認する
    - `mergeTermNotationIntoGlossaries` 後のエントリが正しいことを確認する
    - ja.jsonの全エントリが `GLOSSARY_INDEX` から検索可能であることを確認する
    - _Requirements: 3.3, 3.4, 3.5, 4.4, 4.5, 7.1, 7.3_

  - [x] 6.2 Property 6のプロパティテストを作成する（`server/src/hover/glossaryData.property.test.ts`）
    - **Property 6: GLOSSARY_INDEXラウンドトリップ**
    - `GLOSSARIES` 内の全 `GlossaryEntry` について、`normalizeKey(entry.term)` で `GLOSSARY_INDEX` を検索した結果が当該エントリを含むことを検証する
    - fast-check `numRuns: 30`
    - **Validates: Requirements 4.4, 7.3, 7.5**

  - [x] 6.3 Property 7のプロパティテストを作成する（`server/src/hover/glossaryData.property.test.ts`）
    - **Property 7: 全カテゴリのエントリ存在**
    - 全 `GlossaryId` について、`getGlossaryDefinitions()` の結果に当該カテゴリが含まれ、`entryCount` が0より大きいことを検証する
    - fast-check `numRuns: 30`
    - **Validates: Requirements 7.2, 7.6**

- [x] 7. 最終チェックポイント - 全テスト通過確認
  - `npm test` で全テストが通ることを確認し、`npm run compile` でビルドが成功することを確認する。不明点があればユーザーに質問する。

## 備考

- `*` 付きタスクはオプションであり、スキップ可能
- 各タスクは具体的な要件番号を参照しトレーサビリティを確保
- `glossary.ts`、`glossaryTypes.ts`、`glossaryUtils.ts` は変更しない（要件5.1〜5.3）
- プロパティテストは fast-check `numRuns: 30` で実行

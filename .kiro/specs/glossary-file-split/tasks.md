# 実装計画: glossary.ts ファイル分割

## 概要

`server/src/hover/glossary.ts`（2591行）を責務ごとに5つのファイルに分割するリファクタリング。外部インポートパスの完全互換を維持し、一方向依存（glossaryTypes → glossaryUtils → consoleGlossaryBuilder → glossaryData → glossary）を厳守する。

## タスク

- [x] 1. 型定義ファイルの作成
  - `server/src/hover/glossaryTypes.ts` を作成
  - GlossaryHit, GlossaryMatch, GlossaryEntry, GlossaryDefinition, ConsoleProviderId の型定義を移動
  - 既存の shared/src/types.ts からの GlossaryId インポートを維持
  - _要件: 1.1, 1.2, 1.3_

- [x] 2. ユーティリティ関数ファイルの作成
  - [x] 2.1 glossaryUtils.ts の作成と基本ユーティリティの移動
    - `server/src/hover/glossaryUtils.ts` を作成
    - normalizeWhitespace, normalizeKey 関数を移動
    - glossaryTypes.ts から必要な型をインポート
    - _要件: 2.1, 2.2_

  - [x] 2.2 配列操作ユーティリティの移動
    - mergeStringArrays, mergeGlossaryEntries 関数を glossaryUtils.ts に移動
    - _要件: 2.1_

  - [x] 2.3 文字列解析ユーティリティの移動
    - parseParens, extractAcronymAliases 関数を glossaryUtils.ts に移動
    - _要件: 2.1_

- [x] 3. コンソール用語ビルド関数ファイルの作成
  - [x] 3.1 consoleGlossaryBuilder.ts の作成と補助関数の移動
    - `server/src/hover/consoleGlossaryBuilder.ts` を作成
    - fallbackConsoleTermDescription, resolveConsoleTermDefinition, movedConsoleTermFallbackCategory, resolveConsoleTermDefinitionForMoved 関数を移動
    - glossaryTypes.ts と glossaryUtils.ts から必要な型・関数をインポート
    - consoleGlossaryData.ts と consoleGlossaryDefinitions.ts からのインポートを維持
    - _要件: 3.1, 3.2_

  - [x] 3.2 プロバイダー別ビルド関数の移動
    - buildAwsConsoleGlossaryEntries, buildCloudflareConsoleGlossaryEntries, buildAzureConsoleGlossaryEntries, buildOciConsoleGlossaryEntries, splitCloudflareConsoleGlossaryEntries 関数を consoleGlossaryBuilder.ts に移動
    - _要件: 3.1_

- [x] 4. データ定義ファイルの作成
  - [x] 4.1 glossaryData.ts の作成と BASE_GLOSSARIES の移動
    - `server/src/hover/glossaryData.ts` を作成
    - BASE_GLOSSARIES 配列定義（約2000行）を移動
    - 全ドメイン別 Glossary ファイル（gitGlossary.ts, dockerGlossary.ts 等16ファイル）からのインポートを集約
    - glossaryTypes.ts, glossaryUtils.ts, consoleGlossaryBuilder.ts から必要な型・関数をインポート
    - _要件: 4.1, 4.3_

  - [x] 4.2 CLOUDFLARE_CONSOLE_SPLIT と統合関数の移動
    - CLOUDFLARE_CONSOLE_SPLIT 定数を glossaryData.ts に移動
    - mergeTermNotationIntoGlossaries 関数を glossaryData.ts に移動
    - dictionaries/termNotationDictionary.ts からのインポートを維持
    - _要件: 4.1_

  - [x] 4.3 GLOSSARIES と DEFAULT_ENABLED_GLOSSARIES の移動
    - GLOSSARIES 定数を glossaryData.ts に移動
    - DEFAULT_ENABLED_GLOSSARIES 定数を glossaryData.ts に移動
    - _要件: 4.1_

  - [x] 4.4 GLOSSARY_INDEX の構築ロジックの移動
    - GLOSSARY_INDEX の構築ロジックを glossaryData.ts に移動
    - インデックス構築に必要な normalizeKey 関数を glossaryUtils.ts からインポート
    - _要件: 4.2_

- [x] 5. 検索・マッチングロジックの整理と再エクスポート
  - [x] 5.1 glossary.ts の検索ロジックの維持
    - 正規表現定数（PHRASE_REGEX, WORD_REGEX, ASCII_TERM_CHAR_RE, CJK_TERM_CHAR_RE, MIXED_ASCII_TERM_CHAR_RE, MIXED_CJK_TERM_CHAR_RE）を glossary.ts に残す
    - createGlossaryRank, findGlossaryHitWithRank, findGlossaryMatchWithRank, bestHitForCandidate, expandRun 関数を glossary.ts に残す
    - glossaryData.ts から GLOSSARY_INDEX, GLOSSARIES をインポート
    - _要件: 5.1_

  - [x] 5.2 公開クエリ関数の維持
    - hasGlossaryEntry, getGlossaryEntryCount, getGlossaryDefinitions 関数を glossary.ts に残す
    - findGlossaryHit, findGlossaryMatch 関数を glossary.ts に残す
    - _要件: 5.2_

  - [x] 5.3 全エクスポートの再エクスポート設定
    - glossaryTypes.ts から GlossaryHit, GlossaryMatch を再エクスポート
    - glossaryData.ts から DEFAULT_ENABLED_GLOSSARIES を再エクスポート
    - 全ての公開関数（createGlossaryRank, findGlossaryHitWithRank, findGlossaryMatchWithRank, hasGlossaryEntry, getGlossaryEntryCount, getGlossaryDefinitions, findGlossaryHit, findGlossaryMatch）をエクスポート
    - _要件: 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 6. チェックポイント - ビルドとテストの確認
  - TypeScript コンパイル（`npm run compile`）が成功することを確認
  - 既存テスト（`npm test`）が全て成功することを確認
  - 循環依存がないことを確認
  - 外部インポートパス（provider.ts, languageServer.ts, configManager.ts, configurationManager.ts, documentAnalyzer.test.ts, glossary.test.ts, scripts/check-glossary-*.ts）が変更なく動作することを確認
  - 質問があればユーザーに確認
  - _要件: 7.1, 7.2, 7.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. ファイルサイズの検証
  - 分割後の glossary.ts が500行以下であることを確認
  - glossaryTypes.ts, glossaryUtils.ts, consoleGlossaryBuilder.ts が各500行以下であることを確認
  - glossaryData.ts にロジックコードが最小限であることを確認
  - _要件: 8.1, 8.2, 8.3_

## 注意事項

- 各タスクは前のタスクに依存しているため、順番に実行すること
- コード移動のみを行い、ロジック変更は一切行わない
- 一方向依存（glossaryTypes → glossaryUtils → consoleGlossaryBuilder → glossaryData → glossary）を厳守
- 外部インポートパスは全て glossary.ts を経由するため、他ファイルの変更は不要

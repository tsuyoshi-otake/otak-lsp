# 要件定義書

## はじめに

`server/src/hover/glossary.ts`（2591行）は、型定義、コンソール用語ビルド関数、BASE_GLOSSARIESデータ定義（約2000行）、検索・マッチングロジック、ユーティリティ関数の5つの責務が混在している。このリファクタリングでは、責務ごとにファイルを分割し、保守性と可読性を向上させる。既存の公開APIとランタイム動作は一切変更しない。

## 用語集

- **Glossary_Module**: `server/src/hover/glossary.ts` およびリファクタリング後の分割ファイル群
- **GlossaryEntry**: 用語辞書の1エントリ（term, aliases, synonyms, antonyms, description）
- **GlossaryDefinition**: カテゴリID・タイトル・エントリ配列を持つ辞書定義
- **GlossaryHit**: 検索結果として返される用語情報（id, title, term, description等）
- **GlossaryMatch**: GlossaryHitにテキスト上の範囲（start, end）を付加した検索結果
- **BASE_GLOSSARIES**: 全カテゴリの用語辞書定義を集約した配列（約2000行分のデータ）
- **GLOSSARY_INDEX**: BASE_GLOSSARIESから構築される正規化キー→GlossaryHit配列の検索インデックス
- **Console_Builder**: AWS/Azure/OCI/Cloudflareのコンソール用語データからGlossaryEntryを構築する関数群
- **Public_API**: 外部モジュールがglossary.tsからインポートしている関数・型・定数の集合

## 要件

### 要件 1: 型定義の分離

**ユーザーストーリー:** 開発者として、用語図鑑の型定義を独立したファイルで管理したい。型の変更時に影響範囲を限定し、他モジュールからの型インポートを明確にするため。

#### 受け入れ基準

1. THE Glossary_Module SHALL エクスポートする型定義（GlossaryHit, GlossaryMatch）とモジュール内部の型定義（GlossaryEntry, GlossaryDefinition, ConsoleProviderId）を `glossaryTypes.ts` に配置する
2. THE Glossary_Module SHALL 分割後も全ての型定義を `glossary.ts` から再エクスポートし、既存のインポートパスを維持する
3. THE Glossary_Module SHALL 型定義ファイルに実行時ロジックを含めない

### 要件 2: ユーティリティ関数の分離

**ユーザーストーリー:** 開発者として、正規化やマージなどの汎用ユーティリティ関数を独立したファイルで管理したい。関数の再利用性を高め、テスト対象を明確にするため。

#### 受け入れ基準

1. THE Glossary_Module SHALL 以下のユーティリティ関数を `glossaryUtils.ts` に配置する: normalizeWhitespace, normalizeKey, mergeStringArrays, mergeGlossaryEntries, parseParens, extractAcronymAliases
2. THE Glossary_Module SHALL ユーティリティ関数が型定義ファイルのみに依存し、検索ロジックやデータ定義に依存しない構造を維持する

### 要件 3: コンソール用語ビルド関数の分離

**ユーザーストーリー:** 開発者として、クラウドプロバイダー別のコンソール用語ビルド関数を独立したファイルで管理したい。プロバイダー追加時の変更箇所を限定するため。

#### 受け入れ基準

1. THE Glossary_Module SHALL コンソール用語ビルド関数群（buildAwsConsoleGlossaryEntries, buildCloudflareConsoleGlossaryEntries, buildAzureConsoleGlossaryEntries, buildOciConsoleGlossaryEntries, splitCloudflareConsoleGlossaryEntries）およびそれらの補助関数（fallbackConsoleTermDescription, resolveConsoleTermDefinition, movedConsoleTermFallbackCategory, resolveConsoleTermDefinitionForMoved）を `consoleGlossaryBuilder.ts` に配置する
2. THE Glossary_Module SHALL コンソール用語ビルド関数が既存の `consoleGlossaryData.ts` と `consoleGlossaryDefinitions.ts` からデータを取得する構造を維持する

### 要件 4: BASE_GLOSSARIESデータ定義の分離

**ユーザーストーリー:** 開発者として、全カテゴリの用語辞書データ定義（約2000行）を独立したファイルで管理したい。辞書データの追加・編集時にロジック部分への影響を排除するため。

#### 受け入れ基準

1. THE Glossary_Module SHALL BASE_GLOSSARIES配列の定義、CLOUDFLARE_CONSOLE_SPLIT定数、mergeTermNotationIntoGlossaries関数、GLOSSARIES定数、DEFAULT_ENABLED_GLOSSARIES定数を `glossaryData.ts` に配置する
2. THE Glossary_Module SHALL GLOSSARY_INDEXの構築ロジックを `glossaryData.ts` に配置し、検索ロジックからはインデックスを参照する形にする
3. THE Glossary_Module SHALL 各ドメイン別Glossaryファイル（gitGlossary.ts, dockerGlossary.ts等）からのインポートを `glossaryData.ts` に集約する

### 要件 5: 検索・マッチングロジックの維持

**ユーザーストーリー:** 開発者として、検索・マッチング・ランク付けロジックを `glossary.ts` に残し、このファイルをモジュールのファサードとして機能させたい。外部モジュールのインポートパスを変更せずに済むようにするため。

#### 受け入れ基準

1. THE Glossary_Module SHALL 検索・マッチング関数（createGlossaryRank, findGlossaryHitWithRank, findGlossaryMatchWithRank, bestHitForCandidate, expandRun, findGlossaryHit, findGlossaryMatch）と正規表現定数（PHRASE_REGEX, WORD_REGEX, ASCII_TERM_CHAR_RE, CJK_TERM_CHAR_RE, MIXED_ASCII_TERM_CHAR_RE, MIXED_CJK_TERM_CHAR_RE）を `glossary.ts` に配置する
2. THE Glossary_Module SHALL 公開クエリ関数（hasGlossaryEntry, getGlossaryEntryCount, getGlossaryDefinitions）を `glossary.ts` に配置する
3. THE Glossary_Module SHALL 分割後の `glossary.ts` から全ての既存エクスポート（GlossaryHit, GlossaryMatch, DEFAULT_ENABLED_GLOSSARIES, createGlossaryRank, findGlossaryHitWithRank, findGlossaryMatchWithRank, hasGlossaryEntry, getGlossaryEntryCount, getGlossaryDefinitions, findGlossaryHit, findGlossaryMatch）を維持する

### 要件 6: 外部インポートパスの互換性維持

**ユーザーストーリー:** 開発者として、リファクタリング後も既存の全インポートパスが変更なく動作することを保証したい。他モジュールへの影響をゼロにするため。

#### 受け入れ基準

1. THE Glossary_Module SHALL `provider.ts` からの `import { createGlossaryRank, DEFAULT_ENABLED_GLOSSARIES, findGlossaryHitWithRank, findGlossaryMatchWithRank } from './glossary'` が変更なく動作する
2. THE Glossary_Module SHALL `languageServer.ts`, `configManager.ts`, `configurationManager.ts`, `documentAnalyzer.test.ts` からの `import { DEFAULT_ENABLED_GLOSSARIES } from '../hover/glossary'` が変更なく動作する
3. THE Glossary_Module SHALL `glossary.test.ts` からの `import { getGlossaryDefinitions } from './glossary'` が変更なく動作する
4. THE Glossary_Module SHALL `scripts/check-glossary-coverage.ts` からの `import { hasGlossaryEntry } from '../server/src/hover/glossary'` が変更なく動作する
5. THE Glossary_Module SHALL `scripts/check-glossary-all.ts` からの `import { getGlossaryDefinitions } from '../server/src/hover/glossary'` が変更なく動作する

### 要件 7: ビルドとテストの成功

**ユーザーストーリー:** 開発者として、リファクタリング後にビルドと既存テストが全て成功することを保証したい。リグレッションを防止するため。

#### 受け入れ基準

1. WHEN リファクタリングが完了した場合, THE Glossary_Module SHALL TypeScriptコンパイル（`npm run compile`）がエラーなく成功する
2. WHEN リファクタリングが完了した場合, THE Glossary_Module SHALL 既存テスト（`npm test`）が全て成功する
3. THE Glossary_Module SHALL 循環依存を含まない（glossaryTypes → glossaryUtils → consoleGlossaryBuilder → glossaryData → glossary の一方向依存）

### 要件 8: ファイルサイズの適正化

**ユーザーストーリー:** 開発者として、分割後の各ファイルが適切なサイズに収まることを確認したい。巨大ファイルの問題を再発させないため。

#### 受け入れ基準

1. WHEN リファクタリングが完了した場合, THE Glossary_Module SHALL 分割後の `glossary.ts` を500行以下にする
2. WHEN リファクタリングが完了した場合, THE Glossary_Module SHALL 新規作成する各ファイル（glossaryTypes.ts, glossaryUtils.ts, consoleGlossaryBuilder.ts）を個別に500行以下にする
3. THE Glossary_Module SHALL `glossaryData.ts` についてはデータ定義の性質上、行数制限を設けないが、ロジックコードを最小限に抑える

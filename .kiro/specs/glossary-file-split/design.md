# 設計ドキュメント: glossary.ts ファイル分割

## 概要（Overview）

`server/src/hover/glossary.ts`（2591行）は、用語図鑑システムの全責務を単一ファイルに集約しており、保守性・可読性に課題がある。本設計では、このファイルを責務ごとに5つのファイルに分割する。

### 分割方針

| ファイル | 責務 | 推定行数 |
|---------|------|---------|
| `glossaryTypes.ts` | 型定義（GlossaryHit, GlossaryMatch, GlossaryEntry, GlossaryDefinition, ConsoleProviderId） | ~40行 |
| `glossaryUtils.ts` | 汎用ユーティリティ関数（normalizeWhitespace, normalizeKey, mergeStringArrays, mergeGlossaryEntries, parseParens, extractAcronymAliases） | ~150行 |
| `consoleGlossaryBuilder.ts` | クラウドプロバイダー別コンソール用語ビルド関数（buildAwsConsoleGlossaryEntries等）と補助関数 | ~500行 |
| `glossaryData.ts` | BASE_GLOSSARIES定義、CLOUDFLARE_CONSOLE_SPLIT、mergeTermNotationIntoGlossaries、GLOSSARIES、DEFAULT_ENABLED_GLOSSARIES、GLOSSARY_INDEX | ~2000行（大部分がデータ） |
| `glossary.ts` | 検索・マッチングロジック、正規表現定数、公開クエリ関数、再エクスポート（ファサード） | ~350行 |

### 設計原則

1. **外部インポートパスの完全互換**: 既存の全インポートは `glossary.ts` を経由しており、分割後も `glossary.ts` から再エクスポートすることで一切変更不要
2. **一方向依存**: 循環依存を避けるため `glossaryTypes → glossaryUtils → consoleGlossaryBuilder → glossaryData → glossary` の一方向依存を厳守
3. **ランタイム動作の不変**: 分割はコード移動のみで、ロジック変更は一切行わない

## アーキテクチャ

### 現在のアーキテクチャ

```mermaid
graph TD
    A[shared/src/types.ts<br/>GlossaryId, GLOSSARY_GROUPS] --> G[glossary.ts<br/>2591行]
    B[consoleGlossaryData.ts] --> G
    C[consoleGlossaryDefinitions.ts] --> G
    D[*Glossary.ts<br/>ドメイン別辞書16ファイル] --> G
    E[dictionaries/termNotationDictionary.ts] --> G
    G --> F[provider.ts]
    G --> H[languageServer.ts]
    G --> I[configManager.ts]
    G --> J[configurationManager.ts]
    G --> K[scripts/check-glossary-*.ts]
    G --> L[glossary.test.ts]

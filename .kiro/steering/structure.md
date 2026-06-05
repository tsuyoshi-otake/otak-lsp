---
inclusion: always
---

# プロジェクト構造

## 組織パターン

**レイヤードアーキテクチャ + 機能モジュール方式**

クライアント、サーバー、共有の3層構造で、サーバー側は機能ごとにモジュール化

## ディレクトリパターン

### クライアント (`client/src/`)
**目的**: VSCode拡張機能のエントリーポイント
**例**: `extension.ts` - 拡張機能の初期化、コマンド登録、ステータスバー管理

### サーバー (`server/src/`)
**目的**: 言語サーバーのコア実装
**構成パターン**:
- `main.ts`: サーバーエントリーポイント
- 機能別ディレクトリ: `grammar/`, `mecab/`, `parser/`, `semantic/`, `hover/`, `proofreading/`, `wikipedia/`, `dictionaries/`
- インフラストラクチャ: `server/`, `utils/`

### 共有 (`shared/src/`)
**目的**: クライアント・サーバー間の共有型定義
**例**: `types.ts`, `advancedTypes.ts`, `markdownFilterTypes.ts`

### 文法ルール (`server/src/grammar/rules/`)
**目的**: 個別の文法チェックルール
**命名規則**: `[ルール名]Rule.ts`
**例**: `styleConsistencyRule.ts`, `raNukiRule.ts`

## 命名規則

- **ファイル**: camelCase（`advancedRulesManager.ts`）
- **クラス**: PascalCase（`AdvancedRulesManager`）
- **関数**: camelCase（`analyzeDocument`）
- **定数**: UPPER_SNAKE_CASE（`DEFAULT_CONFIG`）
- **型/インターフェース**: PascalCase（`Token`, `Configuration`）

## インポート構成

```typescript
// 外部ライブラリ
import { createConnection } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

// 同一パッケージ内
import { MeCabAnalyzer } from './mecab/analyzer';
import { AdvancedRulesManager } from './grammar/advancedRulesManager';

// 共有パッケージ
import { Token, Configuration } from '../../shared/src/types';
```

**パス規則**:
- 外部ライブラリは絶対パス
- 同一パッケージ内は相対パス（`./`）
- 共有パッケージは`../../shared/src/`

## テストファイル配置

テストファイルは対象ファイルと同じディレクトリに配置

```
server/src/grammar/rules/
  styleConsistencyRule.ts              # 実装
  styleConsistencyRule.test.ts         # 単体テスト
  styleConsistencyRule.property.test.ts # プロパティベーステスト
```

## 文法ルール追加パターン

新しい文法ルールを追加する際のパターン:

1. `server/src/grammar/rules/[名前]Rule.ts` に実装
2. `server/src/grammar/rules/[名前]Rule.test.ts` にテスト
3. `server/src/grammar/rules/index.ts` にエクスポート追加
4. `server/src/grammar/advancedRulesManager.ts` にルール登録
5. `shared/src/advancedTypes.ts` に設定型追加
6. `package.json` に設定項目追加

### ルールの設定名前空間パターン
- **基本/高度ルール**: `otakLsp.advanced.enable[ルール名]`
- **公文書ルール**: `otakLsp.official.enable[ルール名]`
- **校正ルール**: `otakLsp.proofreading.[カテゴリ].[設定名]`

### サーバーインフラ (`server/src/server/`)
**目的**: 言語サーバーの責務分割（main.tsから抽出）
**構成パターン**:
- `languageServer.ts`: サーバーライフサイクル管理
- `analysisScheduler.ts`: 段階実行スケジューリング
- `configManager.ts`: 設定管理
- `connection.ts`: LSP接続管理
- `diagnosticsPublisher.ts`: 診断情報の発行
- `documentAnalyzer.ts`: ドキュメント解析オーケストレーション
- `profiler.ts`: パフォーマンス計測

### ユーティリティ (`server/src/utils/`)
**目的**: ログ・エラー整形・文字列/正規表現/配列の汎用ヘルパー
**例**: `logger.ts`, `errorHandler.ts`, `stringUtils.ts`, `regexPatterns.ts`, `arrayUtils.ts`, `lineStarts.ts`

### 校正 (`server/src/proofreading/`)
**目的**: 校正ルールの管理と設定
**構成パターン**:
- `proofreadingRulesManager.ts`: 校正ルール管理
- `proofreadingConfig.ts`: 校正設定の解釈（バレル）
- `proofreadingConfigMapper.ts`: AdvancedRulesConfig へのマッピング
- `proofreadingConfigParser.ts`: VS Code 設定形式からのパース
- `proofreadingDefaults.ts`: デフォルト値・プリセット
- `proofreadingTypes.ts`: 型定義
- `bracketRangeDetector.ts`: 括弧範囲の検出

### 辞書 (`server/src/dictionaries/`)
**目的**: 校正・表記統一用辞書のロード
**例**: `proofreadingDictionaryLoader.ts`, `termNotationDictionary.ts`

### Wikipedia (`server/src/wikipedia/`)
**目的**: ホバー時のWikipediaサマリー取得
**例**: `client.ts` - Wikipedia API呼び出し

### ホバー用語図鑑 (`server/src/hover/`)
**目的**: 品詞情報表示とドメイン別オフライン用語辞書
**構成パターン**:
- `provider.ts`: ホバー情報統合
- `glossary.ts`: 用語図鑑管理
- `[ドメイン名]Glossary.ts`: ドメイン別辞書データ（例: `gitGlossary.ts`, `dockerGlossary.ts`）
**命名規則**: `[ドメイン名]Glossary.ts`

## 評価システム (`server/src/grammar/evals/`)

文法ルールの検出精度を評価するためのシステム

- `ng-examples-data.ts`: NGパターンデータ
- `evals-runner.ts`: 評価実行ロジック
- `evals-runner.test.ts`: 評価テスト

---
_パターンと規則に焦点。ファイルの網羅的リストではない_

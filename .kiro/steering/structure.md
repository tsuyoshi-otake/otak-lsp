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
- 機能別ディレクトリ: `grammar/`, `mecab/`, `parser/`, `semantic/`, `hover/`

### 共有 (`shared/src/`)
**目的**: クライアント・サーバー間の共有型定義
**例**: `types.ts`, `advancedTypes.ts`, `markdownFilterTypes.ts`

### 文法ルール (`server/src/grammar/rules/`)
**目的**: 個別の文法チェックルール
**命名規則**: `[ルール名]Rule.ts`
**例**: `styleConsistencyRule.ts`, `raNukiRule.ts`

## 命名規則

- **ファイル**: camelCase（`advancedRulesManager.ts`）
- **クラス**: PascalCase（`GrammarChecker`）
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
import { GrammarChecker } from './grammar/checker';

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
server/src/grammar/
  checker.ts              # 実装
  checker.test.ts         # 単体テスト
  checker.property.test.ts # プロパティベーステスト
  checker.integration.test.ts # 統合テスト
```

## 文法ルール追加パターン

新しい文法ルールを追加する際のパターン:

1. `server/src/grammar/rules/[名前]Rule.ts` に実装
2. `server/src/grammar/rules/[名前]Rule.test.ts` にテスト
3. `server/src/grammar/rules/index.ts` にエクスポート追加
4. `server/src/grammar/advancedRulesManager.ts` にルール登録
5. `shared/src/advancedTypes.ts` に設定型追加
6. `package.json` に設定項目追加

## 評価システム (`server/src/grammar/evals/`)

文法ルールの検出精度を評価するためのシステム

- `ng-examples-data.ts`: NGパターンデータ
- `evals-runner.ts`: 評価実行ロジック
- `evals-runner.test.ts`: 評価テスト

---
_パターンと規則に焦点。ファイルの網羅的リストではない_

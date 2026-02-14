---
inclusion: always
---

# 技術スタック

## アーキテクチャ

**Language Server Protocol (LSP)** ベースのクライアント/サーバーアーキテクチャ

- **クライアント**: VSCode拡張機能（extension.ts）
- **サーバー**: 言語サーバー（main.ts）
- **共有**: 型定義とインターフェース
- **MCP**: stdio MCPサーバー（LSP診断のプロキシ）

## コア技術

- **言語**: TypeScript 5.3+
- **ランタイム**: Node.js 18+
- **ビルドツール**: esbuild
- **形態素解析**: kuromoji-optimized（kuromoji.jsフォーク版、IPA辞書内蔵、高速化済み）

## 主要ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| vscode-languageserver | LSPサーバー実装 |
| vscode-languageclient | LSPクライアント実装 |
| kuromoji-optimized | 日本語形態素解析（高速化フォーク版） |

## 開発標準

### 型安全性
- TypeScript strict mode使用
- 明示的な型定義（`shared/src/types.ts`）
- `any`型の使用禁止

### コード品質
- ESLint + TypeScript ESLint
- Jest + ts-jest によるテスト
- Property-Based Testing（fast-check）

### テストパターン
- 単体テスト: `*.test.ts`
- 統合テスト: `*.integration.test.ts`
- プロパティベーステスト: `*.property.test.ts`
- PBT実行回数: 30回（fast-check numRuns: 30）

## 開発環境

### 必須ツール
- Node.js 18+
- VSCode 1.60+

### 主要コマンド
```bash
# ビルド
npm run compile

# テスト
npm test

# 開発モード（ファイル監視）
npm run watch

# パッケージ作成
npm run package

# Evals実行
npm run evals
```

## 重要な技術的決定

### kuromoji.js位置計算
- `word_position`はUTF-8バイトオフセットを返す
- 日本語文字は3バイト（UTF-8）のため位置ズレが発生
- 解決策: トークンのsurfaceから順次位置を計算

### セマンティックトークン
- 品詞タイプ: noun, verb, adjective, particle, adverb, other
- 非同期解析完了後に`workspace/semanticTokens/refresh`を発行

### 文分割モード
- strict: 改行を常に区切りとして扱う
- normal: 文脈を考慮（推奨）
- loose: 段落区切り（空行）のみ

### 段階実行（Tiered Execution）
- 入力中（typing）: 軽量ルールのみ実行（低レイテンシ）
- アイドル/保存時: 全ルールを実行（完全な解析）
- `analysisScheduler.ts`がスケジューリングを管理
- 設定: `tieredExecution.enabled`, `tieredExecution.idleDelayMs`

### 校正設定システム（Proofreading）
- プリセット（`video-default`, `custom`）による一括設定
- カテゴリ別の細粒度制御（typo, termBase, expression, charType, length等）
- advanced設定との統合方式: `override`（校正優先）/ `merge`（OR統合）

### 用語図鑑（Glossary）
- 30以上のドメイン別オフラインIT用語辞書
- ホバー時にWikipediaサマリーと併せて表示
- カテゴリ単位での有効/無効制御

---
_技術標準とパターンに焦点。全依存関係のリストではない_

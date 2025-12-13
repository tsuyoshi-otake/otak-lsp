---
inclusion: always
---

# 技術スタック

## アーキテクチャ

**Language Server Protocol (LSP)** ベースのクライアント/サーバーアーキテクチャ

- **クライアント**: VSCode拡張機能（extension.ts）
- **サーバー**: 言語サーバー（main.ts）
- **共有**: 型定義とインターフェース

## コア技術

- **言語**: TypeScript 5.3+
- **ランタイム**: Node.js 18+
- **ビルドツール**: esbuild
- **形態素解析**: kuromoji.js 0.1.2（IPA辞書内蔵）

## 主要ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| vscode-languageserver | LSPサーバー実装 |
| vscode-languageclient | LSPクライアント実装 |
| kuromoji | 日本語形態素解析 |

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

---
_技術標準とパターンに焦点。全依存関係のリストではない_

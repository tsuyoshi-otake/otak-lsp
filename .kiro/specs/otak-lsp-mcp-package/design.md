# 設計文書

## 概要

`otak-mcp-lsp` をnpmパッケージとして提供する。MCPサーバーとLSPサーバーのビルド済み成果物を同梱し、`bin` からstdioで起動できるようにする。

## パッケージ構成

新規に `packages/otak-mcp-lsp/` を追加する。

```
packages/otak-mcp-lsp/
  package.json
  README.md
  LICENSE
  bin/
    otak-mcp-lsp.js
  mcp/
    out/
      main.js
  server/
    out/
      main.js
```

### ポイント

- `mcp/out/main.js` から `server/out/main.js` を相対参照するため、同一構成で同梱する
- VS Code拡張の `client/` は含めない

## `bin` エントリ

`packages/otak-mcp-lsp/package.json` に以下を追加する。

```json
{
  "bin": {
    "otak-mcp-lsp": "bin/otak-mcp-lsp.js"
  }
}
```

`bin/otak-mcp-lsp.js` は `mcp/out/main.js` を実行するだけの薄い起動ラッパーとする（shebang付き）。

## 依存関係

- `kuromoji` をランタイム依存として追加
- `mcp/out`/`server/out` はesbuildのbundle成果物を同梱し、追加ビルド不要にする

## ビルド/パッケージ生成

### ビルド手順

1. ルートで `npm run compile` を実行し `mcp/out` と `server/out` を生成
2. `scripts/build-mcp-package.js` を追加し、成果物を `packages/otak-mcp-lsp/` にコピー

### パッケージ作成例

```
cd packages/otak-mcp-lsp
npm pack
```

## バージョン管理

- `packages/otak-mcp-lsp/package.json` の `version` はルートの `package.json` に合わせて同期する
- 同期は `scripts/build-mcp-package.js` で行う

## VSIXへの影響抑制

VS Code拡張パッケージにMCP成果物が混入しないよう、`.vscodeignore` に以下を追加する。

- `mcp/**`
- `packages/**`

## ドキュメント

`packages/otak-mcp-lsp/README.md` に以下を記載する。

- `npm install -g otak-mcp-lsp` / `npm install otak-mcp-lsp`
- Claude Code向けの起動設定例
- `analyze` ツールの入力/出力例

## 互換性

- Node.js 18+ で動作
- stdioのみ使用
- LSP解析結果と同一フォーマットを維持する

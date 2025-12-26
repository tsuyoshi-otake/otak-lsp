# 実装計画: otak-mcp-lsp パッケージ

## タスク

- [x] 1. パッケージ構成の追加
  - `packages/otak-mcp-lsp/` を追加
  - `package.json` / `README.md` / `LICENSE` / `bin/otak-mcp-lsp.js` を作成

- [x] 2. ビルド成果物のコピー手順を追加
  - `scripts/build-mcp-package.js` を追加
  - `mcp/out` と `server/out` をパッケージへコピー
  - バージョン同期を行う

- [x] 3. `bin` 起動の実装
  - shebang付きの起動スクリプトで `mcp/out/main.js` を起動

- [x] 4. 依存関係の整理
  - `kuromoji` などのランタイム依存を設定
  - 不要な依存が入らないことを確認

- [x] 5. 既存パッケージへの影響回避
  - `.vscodeignore` に `mcp/**` と `packages/**` を追加

- [x] 6. ドキュメント整備
  - `packages/otak-mcp-lsp/README.md` に導入/設定例を記載
  - Claude Code向けの設定例を含める

## 注意事項

- Node.js 18+ で動作すること
- stdioでMCPを起動すること
- VS Code拡張の挙動に影響を出さないこと

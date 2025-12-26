# 実装計画: MCP経由のLSPプロキシ

## タスク

- [x] 1. MCPサーバー基盤の追加
  - `mcp/src/main.ts` を追加しstdioのJSON-RPCループを実装
  - `initialize` / `tools/list` / `tools/call` を最低限対応

- [x] 2. LSPプロキシクライアントの実装
  - `mcp/src/lspClient.ts` を追加しLSPプロセスの起動と終了を管理
  - `initialize` / `initialized` / `textDocument/didOpen` / `textDocument/didClose` を送信
  - `publishDiagnostics` を待機するPromise APIを用意

- [x] 3. `analyze` ツールの実装
  - 必須入力（text, languageId）を検証
  - URI自動生成と診断待機、タイムアウト処理を実装
  - LSP診断をMCPレスポンスに整形

- [x] 4. LSP設定の固定化
  - `workspace/didChangeConfiguration`で段階実行無効とデバウンス0を送信
  - 既存拡張機能の設定には影響しない構成にする

- [x] 5. ビルドとパッケージ統合
  - `esbuild.js` にMCPビルドを追加
  - 出力先を `mcp/out/main.js` に統一

- [x] 6. テスト追加
  - LSP診断待機ロジックの単体テスト
  - `tools/call` -> 診断取得の結合テスト（最小1ケース）

- [x] 7. ドキュメント追記
  - READMEにMCPの起動方法と`analyze`入力/出力例を追記

## 注意事項

- MCPはstdioのみ、ネットワークは使用しない
- 既存LSP/拡張機能の動作を変えない

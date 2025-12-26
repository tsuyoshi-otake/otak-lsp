# otak-mcp-lsp

otak-lspのLSPサーバーを同梱したMCPサーバーです。VS Code拡張は不要で単体動作し、stdioで起動して`analyze`ツールで診断結果を返します。

## インストール

```bash
npm install -g otak-mcp-lsp
```

プロジェクトローカルに入れる場合:

```bash
npm install otak-mcp-lsp
```

## 起動

```bash
otak-mcp-lsp
```

## Claude Code 設定例

Claude CodeのMCP設定で、以下のようにコマンドを指定してください。

```json
{
  "command": "otak-mcp-lsp",
  "args": []
}
```

Codex CLIの設定例（`~/.codex/config.toml`）:

```toml
[mcp_servers.otak-mcp-lsp]
command = "otak-mcp-lsp"
args = []
```

インストールしていない場合は `npx` で起動:

```toml
[mcp_servers.otak-mcp-lsp]
command = "npx"
args = ["-y", "otak-mcp-lsp"]
```

## analyze ツール

入力例:

```json
{
  "name": "analyze",
  "arguments": {
    "text": "私はがが行きます。",
    "languageId": "markdown"
  }
}
```

出力例:

```json
{
  "diagnostics": [
    {
      "range": {
        "start": { "line": 0, "character": 2 },
        "end": { "line": 0, "character": 4 }
      },
      "severity": 1,
      "message": "二重助詞が検出されました。",
      "code": "double-particle",
      "source": "otak-lsp"
    }
  ]
}
```

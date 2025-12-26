# 設計文書

## 概要

MCP（stdio）サーバーを追加し、内部で既存のLSPサーバーを起動して診断結果を取得・返却する。MCP側は最小限のツール（`analyze`）を公開し、LSPの診断生成ロジックを再利用する。

## 目的

- 既存LSPの解析結果と互換な診断をMCP経由で取得できるようにする
- LSP側の解析ロジックを複製しない
- VS Code拡張の挙動に影響を与えない

## 全体構成

```
MCP Client
   |
   | stdio (MCP JSON-RPC)
   v
MCP Server (new)
   |
   | stdio (LSP JSON-RPC)
   v
otak-lsp LSP Server (existing)
```

## 追加モジュール

- `mcp/src/main.ts` (新規): MCPサーバーエントリ
- `mcp/src/lspClient.ts` (新規): LSPプロキシ用クライアント
- `mcp/src/types.ts` (新規): MCP入出力型定義（最小）

## MCPサーバー設計

### MCPプロトコル対応

- JSON-RPC 2.0（stdio）
- 実装対象: `initialize`, `tools/list`, `tools/call`
- `initialize`応答には`tools`機能を宣言する

### `tools/list`

1ツールのみ公開する。

- name: `analyze`
- description: 解析診断を返却
- inputSchema: `{ text: string, languageId: string, uri?: string }`

### `tools/call`

#### 入力

- `name`: `analyze`
- `arguments`:
  - `text` (string, 必須)
  - `languageId` (string, 必須)
  - `uri` (string, 任意)

#### 出力

`content`配列に`json`形式で診断結果を格納する。

```json
{
  "content": [
    {
      "type": "json",
      "json": {
        "diagnostics": [
          {
            "range": {
              "start": { "line": 0, "character": 0 },
              "end": { "line": 0, "character": 5 }
            },
            "severity": 1,
            "message": "..."
          }
        ]
      }
    }
  ]
}
```

## LSPプロキシ設計

### LSP起動

- MCPサーバープロセスから`node server/out/main.js`を子プロセス起動
- stdioでLSP JSON-RPC通信を行う
- MCPサーバー起動時にLSPを初期化し、`initialize` -> `initialized`を送る

### LSP設定の初期化

MCP用途では解析結果の確定性を優先するため、以下を`workspace/didChangeConfiguration`で設定する。

- `otakLsp.advanced.tieredExecution.enabled = false`（軽量/全ルールの二段階実行を無効化）
- `otakLsp.debounceDelay = 0`（即時解析）

既存の拡張機能側の設定は変更しない。

### 解析フロー

1. MCP `tools/call`受信
2. `uri`が未指定ならMCP側で一意なURIを生成
3. LSPへ`textDocument/didOpen`を送信
4. `textDocument/publishDiagnostics`通知を待機
5. 受信した診断をMCPレスポンスに変換して返却
6. `textDocument/didClose`を送信しLSP側の状態を解放

### 診断待機

- `publishDiagnostics`は複数回届く可能性があるため、対象URIの最初の通知で解決する
- 解析タイムアウト（例: 5s）を設定し、超過時はMCP側でエラーを返す

## 例外処理

- LSPプロセスが終了した場合、MCPはエラーを返す
- 必須入力が欠けている場合、MCPは`InvalidParams`相当のエラーを返す
- LSPが診断を返さない場合、空配列を返す

## ログ

- MCPサーバー側はstderrに簡易ログを出力（起動・停止・LSPクラッシュ）
- MCPレスポンス本文にはログを含めない

## ビルド/配布

- `esbuild.js`にMCPビルドを追加し`mcp/out/main.js`を生成する
- `npm run compile`でMCPもビルド対象にする
- VSIXへの同梱可否は実装時に判断（既存拡張に影響しない前提）

## テスト方針

- 単体テスト: `mcp/src/lspClient.ts`の診断待機ロジック
- 結合テスト: MCP `tools/call` -> LSP診断取得のフロー（最低1ケース）
- 既存テストの挙動は維持する

## 互換性・制約

- Node.js 18+で動作
- stdioのみ使用（ネットワーク不要）
- MCP側は単一ファイル解析のみ対応

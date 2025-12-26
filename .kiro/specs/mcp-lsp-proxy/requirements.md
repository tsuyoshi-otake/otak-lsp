# 要件定義書

## 概要

MCP（Model Context Protocol）向けのstdioサーバーを追加し、既存のLSPサーバーをプロキシして解析診断結果を返却する。MCPクライアントからテキストと言語IDを渡すと、LSP互換の診断情報を返す。

## 用語集

- **MCP**: Model Context Protocol。stdioのJSON-RPCでツールを公開するためのプロトコル。
- **LSP**: Language Server Protocol。otak-lspの解析エンジンを提供する。
- **プロキシ**: MCPサーバーが内部でLSPサーバーと通信し、結果を中継すること。
- **診断**: LSP `Diagnostic` に相当する情報（range、severity、message、code、source）。

## 要件

### 要件1: MCPサーバーの提供

**ユーザーストーリー:** MCPクライアントからotak-lspの解析結果を利用したい。

#### 受入基準

1. THE System SHALL stdioで動作するMCPサーバーを提供する
2. THE System SHALL MCPの`initialize`、`tools/list`、`tools/call`に応答する
3. THE System SHALL 解析診断を返す`analyze`ツールを公開する

### 要件2: LSPプロキシによる解析

**ユーザーストーリー:** 既存のLSP解析ロジックを再利用して結果の互換性を保ちたい。

#### 受入基準

1. THE System SHALL MCPサーバー内部で既存のLSPサーバーと通信し、解析を実行する
2. THE System SHALL 診断生成ロジックを複製せず、LSPの`publishDiagnostics`結果を使用する
3. THE System SHALL LSPがエラー終了した場合、MCP側で明示的なエラーを返す

### 要件3: `analyze`ツールの入力

**ユーザーストーリー:** テキストと対象言語を渡して診断を取得したい。

#### 受入基準

1. THE System SHALL `text`（解析対象テキスト）と`languageId`を必須入力として受け付ける
2. THE System SHALL `uri`が未指定の場合、MCP側で一意なURIを生成する
3. THE System SHALL 必須項目が不足している場合、MCPはエラーを返す

### 要件4: `analyze`ツールの出力

**ユーザーストーリー:** LSP互換の診断情報を受け取りたい。

#### 受入基準

1. THE System SHALL LSP `Diagnostic` に相当する配列を返す
2. THE System SHALL 各診断に`range`（0-based line/character）、`severity`、`message`、`code`、`source`を含める
3. THE System SHALL LSPが診断を返さなかった場合、空配列を返す

### 要件5: 既存機能への影響なし

**ユーザーストーリー:** VS Code拡張の挙動を変えずにMCPを追加したい。

#### 受入基準

1. THE System SHALL 既存のLSP/拡張機能の挙動や設定を変更しない
2. THE System SHALL MCP向け追加が既存ビルド/テストを破壊しない

## 非機能要件

- MCPサーバーはNode.js 18+で動作する
- stdio通信のみを使用し、ネットワーク接続を必須としない
- 解析結果の位置情報は既存LSPと同じ基準（0-basedのline/character）を維持する

## スコープ外

- LSPの差分更新（`textDocument/didChange`）の公開
- セマンティックトークンやホバー情報のMCP化
- ワークスペース管理や複数ファイル解析

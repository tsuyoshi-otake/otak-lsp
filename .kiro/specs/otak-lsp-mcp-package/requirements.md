# 要件定義書

## 概要

otak-lspのMCPサーバーを、`npm install` で利用可能なパッケージ（`otak-mcp-lsp`）として提供する。Claude CodeなどのMCPクライアントから「設定だけ」で起動できるように、`bin`エントリを持つ実行形式を同梱する。

## 用語集

- **MCPパッケージ**: `otak-mcp-lsp` のnpmパッケージ
- **binエントリ**: `otak-lsp-mcp` コマンドを提供するnpmの`bin`設定
- **同梱成果物**: MCPサーバーとLSPサーバーのビルド済みファイル

## 要件

### 要件1: npmインストール可能なパッケージ

**ユーザーストーリー:** `npm install` でMCPサーバーを導入したい。

#### 受入基準

1. THE System SHALL `otak-mcp-lsp` というnpmパッケージを提供する
2. THE System SHALL `npm install -g` または `npm install` で実行コマンドが利用できる
3. THE System SHALL ローカルパス/ターボールでの `npm install` に対応する

### 要件2: 実行コマンド（bin）

**ユーザーストーリー:** MCPクライアントの設定でコマンドを指定するだけで起動したい。

#### 受入基準

1. THE System SHALL `otak-lsp-mcp` を `bin` コマンドとして提供する
2. THE System SHALL stdioでMCPサーバーを起動する
3. THE System SHALL 追加のビルドを要求しない（ビルド済み成果物を同梱する）

### 要件3: 解析エンジンの同梱

**ユーザーストーリー:** MCPパッケージ単体で解析が動作してほしい。

#### 受入基準

1. THE System SHALL LSPサーバーのビルド成果物をパッケージに含める
2. THE System SHALL `kuromoji` 辞書を含む依存パッケージをnpm依存として解決する
3. THE System SHALL VS Code拡張のUI/クライアントは含めない

### 要件4: 既存拡張機能への影響なし

**ユーザーストーリー:** VS Code拡張に影響を出さずにMCPパッケージを追加したい。

#### 受入基準

1. THE System SHALL VS Code拡張の挙動/設定に影響しない
2. THE System SHALL VSIXの内容を不要に増やさない

### 要件5: ドキュメント

**ユーザーストーリー:** MCPクライアントの設定方法を把握したい。

#### 受入基準

1. THE System SHALL `otak-lsp-mcp` のREADMEにインストール/起動方法を記載する
2. THE System SHALL Claude Code向けの設定例を記載する

## 非機能要件

- Node.js 18+ で動作する
- stdioのみ使用（ネットワーク不要）
- 既存のLSP解析結果と互換性を維持する

## スコープ外

- npmレジストリへの公開作業（公開自体は別途）
- VS Code拡張からMCPを自動起動する機能

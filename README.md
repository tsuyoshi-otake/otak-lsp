# Japanese Grammar Analyzer

日本語形態素解析VSCode拡張機能です。**外部依存なし**で、文法チェック、セマンティックハイライト、ホバー情報表示などの機能を提供します。

## 特徴

- **外部依存なし**: kuromoji.jsを内蔵しており、MeCabのインストールは不要です
- **IPA辞書内蔵**: npm installだけですぐに使えます
- **軽量**: 純粋なJavaScript実装

## 主な機能

### 日本語文法チェック

プログラミング言語のコメントやMarkdownファイル内の日本語テキストを解析し、以下の文法エラーを検出します：

- **二重助詞**: 「私がが行く」のような同じ助詞の重複
- **助詞連続**: 「彼がを見た」のような不適切な助詞の連続
- **動詞-助詞不整合**: 自動詞に「を」を使用するような不自然な組み合わせ

### セマンティックハイライト

品詞に基づいて日本語テキストを色分け表示します：

| 品詞 | 色 |
|------|-----|
| 名詞 | 緑系 |
| 動詞 | 黄色系 |
| 形容詞 | 水色 |
| 助詞 | 青系 |
| 副詞 | 紫系 |

### ホバー情報

単語にマウスカーソルを合わせると、以下の情報を表示します：

- 表層形
- 品詞情報
- 原形
- 読み
- Wikipediaサマリー（オプション）

### 対応ファイル形式

- **Markdown** (.md): ファイル全体を解析
- **JavaScript/TypeScript** (.js, .ts): コメント内の日本語を解析
- **Python** (.py): `#` コメントと `"""` ドキュメント文字列を解析
- **C/C++** (.c, .cpp, .h): `//` と `/* */` コメントを解析
- **Java** (.java): `//` と `/* */` コメントを解析
- **Rust** (.rs): `//` と `/* */` コメント、ドキュメントコメントを解析

## インストール

### Visual Studio Code Marketplace から

1. VSCodeを開く
2. 拡張機能ビュー (Ctrl+Shift+X) を開く
3. "Japanese Grammar Analyzer" を検索
4. 「インストール」をクリック

### .vsix ファイルから

1. [リリースページ](https://github.com/tsuyoshi-otake-system-exe-jp/otak-lsp/releases)から `.vsix` ファイルをダウンロード
2. VSCodeを開く
3. コマンドパレット (Ctrl+Shift+P) を開く
4. "Extensions: Install from VSIX..." を選択
5. ダウンロードした `.vsix` ファイルを選択

## 設定

設定画面（ファイル > 基本設定 > 設定）から以下の項目を設定できます：

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `japaneseGrammarAnalyzer.enableGrammarCheck` | 文法チェックの有効/無効 | `true` |
| `japaneseGrammarAnalyzer.enableSemanticHighlight` | セマンティックハイライトの有効/無効 | `true` |
| `japaneseGrammarAnalyzer.targetLanguages` | 解析対象のファイルタイプ | `["markdown", "javascript", ...]` |
| `japaneseGrammarAnalyzer.debounceDelay` | 解析のデバウンス遅延（ミリ秒） | `500` |

### 設定例

```json
{
  "japaneseGrammarAnalyzer.enableGrammarCheck": true,
  "japaneseGrammarAnalyzer.enableSemanticHighlight": true,
  "japaneseGrammarAnalyzer.targetLanguages": [
    "markdown",
    "javascript",
    "typescript"
  ],
  "japaneseGrammarAnalyzer.debounceDelay": 300
}
```

## 使い方

1. 拡張機能をインストール
2. Markdownファイルまたはサポートされているプログラミング言語のファイルを開く
3. 日本語テキストを入力すると自動的に解析が開始されます

### 文法チェックの例

```markdown
# テスト

これはは文法エラーです。  ← 「はは」で警告
私がが行きます。          ← 「がが」で警告
彼をを見た。              ← 「をを」で警告
```

## トラブルシューティング

### 文法チェックが動作しない

1. `enableGrammarCheck` が `true` になっているか確認
2. ファイルタイプが `targetLanguages` に含まれているか確認
3. 出力パネル（表示 > 出力 > Japanese Grammar Analyzer）でエラーを確認

### 初回起動時に時間がかかる

初回起動時にkuromoji.jsの辞書を読み込むため、数秒かかる場合があります。2回目以降は高速に動作します。

## 開発

### ビルド

```bash
npm install
npm run compile
```

### テスト

```bash
npm test
```

### 開発モード（ファイル変更監視）

```bash
npm run watch
```

### パッケージ作成

```bash
npm run package
```

## 技術仕様

- **形態素解析**: kuromoji.js 0.1.2 (IPA辞書内蔵)
- **Language Server Protocol**: vscode-languageserver 9.0
- **対応VSCodeバージョン**: 1.60.0以上

## ライセンス

MIT License

## 謝辞

- [kuromoji.js](https://github.com/takuyaa/kuromoji.js) - JavaScript形態素解析エンジン
- [VSCode Language Server Protocol](https://microsoft.github.io/language-server-protocol/) - LSP実装

## 関連リンク

- [GitHub リポジトリ](https://github.com/tsuyoshi-otake-system-exe-jp/otak-lsp)
- [バグ報告](https://github.com/tsuyoshi-otake-system-exe-jp/otak-lsp/issues)

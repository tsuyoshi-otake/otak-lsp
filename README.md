# Japanese Grammar Analyzer

日本語形態素解析VSCode拡張機能です。**外部依存なし**で、文法チェック、セマンティックハイライト、ホバー情報表示などの機能を提供します。

## 特徴

- **外部依存なし**: kuromoji.jsを内蔵しており、MeCabのインストールは不要です
- **IPA辞書内蔵**: npm installだけですぐに使えます
- **軽量**: 純粋なJavaScript実装
- **高度な文法チェック**: 文体統一、ら抜き言葉、技術用語表記など11種類のルールをサポート

## 主な機能

### 日本語文法チェック（基本ルール）

プログラミング言語のコメントやMarkdownファイル内の日本語テキストを解析し、以下の文法エラーを検出します：

- **二重助詞**: 「私がが行く」のような同じ助詞の重複
- **助詞連続**: 「彼がを見た」のような不適切な助詞の連続
- **動詞-助詞不整合**: 自動詞に「を」を使用するような不自然な組み合わせ

### 高度な文法チェックルール

基本ルールに加えて、より高度な文法チェック機能を提供します：

#### 1. 文体の混在検出（Style Consistency）

文書内で「です・ます調」（敬体）と「である調」（常体）が混在している場合に警告します。

```
これはテストです。      <- 敬体（です・ます調）
これはテストである。    <- 常体（である調）
-> 文体混在の警告が表示されます
```

#### 2. ら抜き言葉の検出（Ra-nuki Detection）

「食べれる」「見れる」などのら抜き言葉を検出し、正しい形を提案します。

```
食べれる -> 食べられる
見れる   -> 見られる
起きれる -> 起きられる
```

#### 3. 二重否定の検出（Double Negation）

「ないわけではない」「ないことはない」などの二重否定を検出します。

```
できないわけではない -> 「できる」への書き換えを提案
知らないことはない   -> 「知っている」への書き換えを提案
```

#### 4. 同じ助詞の連続使用検出（Particle Repetition）

同じ文中で同じ助詞が繰り返し使用されている場合に警告します。

```
私は本を彼は読む -> 「は」が2回使用されています
```

**注意**: この機能は初期設定で無効化されています。

#### 5. 同じ接続詞の連続使用検出（Conjunction Repetition）

連続する文で同じ接続詞が使用されている場合に警告し、代替案を提示します。

```
しかし、Aです。しかし、Bです。
-> 「しかし」の連続使用を検出し、「ところが」「けれども」などの代替案を提示
```

対象となる接続詞: しかし、また、そして、それで、だから、ところが、すると、それから、さらに

#### 6. 逆接の「が」の連続使用検出（Adversative Ga）

逆接の「が」が連続する文で使用されている場合に警告します。

```
行きますが、Aです。行きますが、Bです。
-> 「が」の連続使用を検出し、文の分割を提案
```

#### 7. 全角/半角アルファベットの混在検出（Alphabet Width）

文書内で全角アルファベットと半角アルファベットが混在している場合に警告します。

```
これはＡＢＣとabcの混在です
-> 全角「ＡＢＣ」を半角「ABC」に変換することを提案
```

#### 8. 弱い日本語表現の検出（Weak Expression）

曖昧で弱い表現を検出し、より断定的な表現を提案します。

| 検出パターン | 提案 |
|-------------|------|
| かもしれない | 可能性がある |
| と思われる | と考えられる |
| ような気がする | と推測される |

#### 9. 読点の数チェック（Comma Count）

1文中の読点（、）が多すぎる場合に警告し、文の分割を提案します。

```
私は、今日、朝、昼、夜、と、食事をしました。
-> 読点が6個あります（閾値: 4個）。文の分割を検討してください。
```

#### 10. 技術用語の表記統一（Term Notation）

技術用語の誤った表記を検出し、正しい表記を提案します。

**基本ウェブ技術用語**

| 誤った表記 | 正しい表記 |
|-----------|-----------|
| Javascript, javascript | JavaScript |
| Typescript, typescript | TypeScript |
| Github, github | GitHub |
| Nodejs, nodejs | Node.js |
| Vscode, vscode | VS Code |
| Nextjs, nextjs | Next.js |
| Vuejs, vuejs | Vue.js |

**生成AI関連用語**

| 誤った表記 | 正しい表記 |
|-----------|-----------|
| chatgpt, Chatgpt, chat-gpt | ChatGPT |
| openai, Openai, Open AI | OpenAI |
| claude | Claude |
| gpt-4, gpt4, GPT4 | GPT-4 |
| llm, Llm | LLM |
| rag, Rag | RAG |
| gemini | Gemini |
| copilot, Co-pilot | Copilot |
| anthropic | Anthropic |
| midjourney, Mid Journey | Midjourney |
| stable diffusion, StableDiffusion | Stable Diffusion |

**AWS関連用語**

| 誤った表記 | 正しい表記 |
|-----------|-----------|
| aws, Aws | AWS |
| ec2 | EC2 |
| s3 | S3 |
| lambda | Lambda |
| dynamodb, Dynamodb | DynamoDB |
| rds | RDS |
| cloudformation, Cloud Formation | CloudFormation |
| cloudwatch, Cloud Watch | CloudWatch |
| ecs | ECS |
| eks | EKS |
| fargate | Fargate |
| sagemaker, Sagemaker, Sage Maker | SageMaker |
| bedrock | Bedrock |

**Azure関連用語**

| 誤った表記 | 正しい表記 |
|-----------|-----------|
| azure, AZURE | Azure |
| azure functions | Azure Functions |
| azure devops, AzureDevOps | Azure DevOps |
| azure ad, AzureAD | Azure AD |
| cosmos db, CosmosDB | Cosmos DB |
| app service | App Service |
| azure openai, AzureOpenAI | Azure OpenAI |

**OCI関連用語**

| 誤った表記 | 正しい表記 |
|-----------|-----------|
| oci, Oci | OCI |
| oracle cloud infrastructure | Oracle Cloud Infrastructure |
| oracle cloud | Oracle Cloud |
| compute instance | Compute Instance |
| object storage | Object Storage |
| autonomous database | Autonomous Database |
| oci generative ai | OCI Generative AI |

#### 11. 漢字の開き方の統一（Kanji Opening）

ひらがなで書くべき漢字を検出し、開いた（ひらがなの）表記を提案します。

| 漢字表記 | ひらがな表記 |
|---------|------------|
| 下さい | ください |
| 出来る | できる |
| 出来ます | できます |
| 有難う | ありがとう |
| 宜しく | よろしく |
| 致します | いたします |
| 頂く | いただく |
| 頂きます | いただきます |

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

### 基本設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `japaneseGrammarAnalyzer.enableGrammarCheck` | 文法チェックの有効/無効 | `true` |
| `japaneseGrammarAnalyzer.enableSemanticHighlight` | セマンティックハイライトの有効/無効 | `true` |
| `japaneseGrammarAnalyzer.targetLanguages` | 解析対象のファイルタイプ | `["markdown", "javascript", ...]` |
| `japaneseGrammarAnalyzer.debounceDelay` | 解析のデバウンス遅延（ミリ秒） | `500` |

### 高度な文法ルール設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `japaneseGrammarAnalyzer.advanced.enableStyleConsistency` | 文体混在チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableRaNukiDetection` | ら抜き言葉チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableDoubleNegation` | 二重否定チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableParticleRepetition` | 助詞連続使用チェック | `false` |
| `japaneseGrammarAnalyzer.advanced.enableConjunctionRepetition` | 接続詞連続使用チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableAdversativeGa` | 逆接「が」連続使用チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableAlphabetWidth` | 全角/半角混在チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableWeakExpression` | 弱い表現チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableCommaCount` | 読点数チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableTermNotation` | 技術用語表記チェック | `true` |
| `japaneseGrammarAnalyzer.advanced.enableKanjiOpening` | 漢字開きチェック | `true` |

### 技術用語辞典設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `japaneseGrammarAnalyzer.advanced.enableWebTechDictionary` | ウェブ技術用語辞典 | `true` |
| `japaneseGrammarAnalyzer.advanced.enableGenerativeAIDictionary` | 生成AI用語辞典 | `true` |
| `japaneseGrammarAnalyzer.advanced.enableAWSDictionary` | AWS用語辞典 | `true` |
| `japaneseGrammarAnalyzer.advanced.enableAzureDictionary` | Azure用語辞典 | `true` |
| `japaneseGrammarAnalyzer.advanced.enableOCIDictionary` | OCI用語辞典 | `true` |

### その他の設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `japaneseGrammarAnalyzer.advanced.commaCountThreshold` | 読点の警告閾値 | `4` |
| `japaneseGrammarAnalyzer.advanced.weakExpressionLevel` | 弱い表現の検出レベル（strict/normal/loose） | `normal` |

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
  "japaneseGrammarAnalyzer.debounceDelay": 300,
  "japaneseGrammarAnalyzer.advanced.enableStyleConsistency": true,
  "japaneseGrammarAnalyzer.advanced.enableRaNukiDetection": true,
  "japaneseGrammarAnalyzer.advanced.enableParticleRepetition": false,
  "japaneseGrammarAnalyzer.advanced.enableTermNotation": true,
  "japaneseGrammarAnalyzer.advanced.enableGenerativeAIDictionary": true,
  "japaneseGrammarAnalyzer.advanced.enableAWSDictionary": true,
  "japaneseGrammarAnalyzer.advanced.commaCountThreshold": 5
}
```

## 使い方

1. 拡張機能をインストール
2. Markdownファイルまたはサポートされているプログラミング言語のファイルを開く
3. 日本語テキストを入力すると自動的に解析が開始されます

### 文法チェックの例

#### 基本ルール

```markdown
# テスト

これはは文法エラーです。  <- 「はは」で警告
私がが行きます。          <- 「がが」で警告
彼をを見た。              <- 「をを」で警告
```

#### 高度なルール

```markdown
# 技術文書の例

## ら抜き言葉
この機能は簡単に使えれる。  <- 「使えれる」-> 「使えられる」

## 技術用語
Javascriptでコードを書きます。  <- 「JavaScript」に修正
awsのサービスを使います。       <- 「AWS」に修正
chatgptで文章を生成します。     <- 「ChatGPT」に修正

## 漢字開き
確認して下さい。  <- 「ください」に修正
それは出来ます。  <- 「できます」に修正

## 弱い表現
これは正しいかもしれない。  <- 「可能性がある」に修正提案

## 読点過多
私は、今日、朝、昼、夜、と、食事をしました。  <- 読点が多すぎます
```

## トラブルシューティング

### 文法チェックが動作しない

1. `enableGrammarCheck` が `true` になっているか確認
2. ファイルタイプが `targetLanguages` に含まれているか確認
3. 出力パネル（表示 > 出力 > Japanese Grammar Analyzer）でエラーを確認

### 特定のルールを無効にしたい

設定画面で対応するルールの設定を `false` に変更してください。
例: 技術用語チェックを無効にする場合は `japaneseGrammarAnalyzer.advanced.enableTermNotation` を `false` に設定

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

<!-- EVALS-START -->
## Detection Coverage

![Coverage](https://img.shields.io/badge/coverage-86%25-green)

| Category | Status | Example |
|----------|--------|---------|
| 二重助詞 | PASS | 私がが行く |
| 助詞連続 | FAIL | 彼がを見た |
| 動詞-助詞不整合 | PASS | 公園を行く |
| 冗長な助動詞 | FAIL | 問題でです |
| 文体混在 | FAIL | これは素敵です。あれは平凡である。 |
| ら抜き言葉 | FAIL | 食べれる |
| 二重否定 | PASS | できないわけではない |
| 同じ助詞の連続使用 | PASS | 私は本を彼は読む |
| 接続詞連続使用 | PASS | しかし、Aです。しかし、Bです。 |
| 逆接「が」連続使用 | PASS | 行きますが、Aです。行きますが、Bです。 |
| 全角半角アルファベット混在 | PASS | これはＡＢＣとabcの混在です |
| 弱い表現 | PASS | これは正しいかもしれない |
| 読点過多 | PASS | 私は、今日、朝、昼、夜、と、食事をしました。 |
| 技術用語表記 | PASS | Javascriptを使用します |
| 漢字開き | PASS | 確認して下さい |
| 冗長表現 | NOT_IMPL | 馬から落馬する |
| 重複表現（同語反復） | NOT_IMPL | 頭痛が痛い |
| サ変動詞 | NOT_IMPL | 勉強をする |
| 主語の欠如 | NOT_IMPL | 昨日、買いました。 |
| ねじれ文 | NOT_IMPL | 私の夢は医者になりたいです |
| 長すぎる文 | NOT_IMPL | 私は昨日の朝早く起きて朝食を食べてから会社に向かい午前中は会議に出席して午後は資料を作成し夕方には上 |
| 同音異義語 | NOT_IMPL | 意志が低い |
| 敬語の誤用 | NOT_IMPL | お客様がおっしゃられました |
| 副詞の呼応 | NOT_IMPL | 決して行きます |
| 助詞「の」の連続 | NOT_IMPL | 東京の会社の部長の息子の友達 |
| 修飾語の位置 | NOT_IMPL | 赤い大きな花 |
| 曖昧な指示語 | NOT_IMPL | それは問題だ。しかし、それも重要だ。 |
| 受身の多用 | NOT_IMPL | 報告書が作成された。結果が分析された。結論が導かれた。 |
| 名詞の連続 | NOT_IMPL | 東京都渋谷区松濤一丁目住所 |
| 接続詞の誤用 | NOT_IMPL | 晴れた。しかし、外出した。 |
| 文末表現の単調さ | NOT_IMPL | Aです。Bです。Cです。Dです。 |

Last updated: 2025-12-11
<!-- EVALS-END -->

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

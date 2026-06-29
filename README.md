<div align="center">

# otak-lsp

**VS Codeで日本語の文法チェック、校正、セマンティックハイライト、ホバー情報をまとめて扱うLanguage Server拡張です。**  
kuromoji-optimizedを内蔵しているため、MeCabや外部辞書のインストールなしで使えます。

[![VS Marketplace](https://img.shields.io/visual-studio-marketplace/v/odangoo.otak-lsp?label=Marketplace&color=1d4ed8)](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-lsp)
[![VS Code engine](https://img.shields.io/badge/VS%20Code-%5E1.60.0-007acc)](https://code.visualstudio.com/)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-otak--lsp-24292f)](https://github.com/tsuyoshi-otake/otak-lsp)

![No MeCab required](https://img.shields.io/badge/MeCab-not%20required-0f766e)
![Bundled dictionary](https://img.shields.io/badge/dictionary-bundled-2563eb)
![Grammar checks](https://img.shields.io/badge/grammar%20rules-60%2B-7c3aed)
![Works offline](https://img.shields.io/badge/offline-ready-334155)

[**インストール**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-lsp) ·
[**GitHub**](https://github.com/tsuyoshi-otake/otak-lsp) ·
[**問題を報告**](https://github.com/tsuyoshi-otake/otak-lsp/issues)

</div>

---

日本語を含む技術文書、README、仕様書、コードコメントでは、文法だけでなく表記ゆれ、弱い表現、用語の揺れ、公文書ルール、Markdown構造の乱れも見落としやすくなります。**otak-lspはVS CodeのLanguage Serverとして編集中の日本語を解析し、診断、品詞ハイライト、ホバー辞書を同じ編集画面で提供します。**

![otak-lsp セマンティックハイライト例](https://raw.githubusercontent.com/tsuyoshi-otake/otak-lsp/main/images/01.png)

## クイックスタート

1. [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-lsp) からインストールします。
2. Markdown、プレーンテキスト、または対応言語のソースファイルを開きます。
3. 日本語を入力すると、文書変更に合わせて自動解析されます。
4. 必要に応じてコマンドパレットから `otak-lsp: 現在のファイルを解析` を実行します。

手元のVSIXから入れる場合は、リポジトリでパッケージを生成してからインストールします。

```bash
npm install
npm run package
code --install-extension otak-lsp-1.0.26.vsix
```

## 主な機能

- **日本語文法チェック**: 二重助詞、助詞連続、動詞と助詞の不整合、文体混在、ら抜き言葉、二重否定、ねじれ文などを検出します。
- **高度ルール57種**: 表現、表記、約物、Markdown構造、公文書向けルールまで、実装済みの高度ルールをまとめて提供します。
- **校正ルール**: 誤字、用語基準、表現洗練、字種統一、長さ、環境依存文字、約物、括弧、表記ゆれをカテゴリ別に制御できます。
- **公文書対応**: 常用漢字外、「及び/並びに」「又は/若しくは」、箇条書き句点運用をチェックします。
- **技術用語の表記統一**: JavaScript、GitHub、Node.js、AWS、Azure、OCI、生成AI関連語などの揺れを検出します。
- **Markdown構造チェック**: 見出しレベルの飛び、テーブル列数不一致、コードブロック言語指定欠落を検出します。
- **セマンティックハイライト**: 名詞、動詞、形容詞、助詞、副詞を品詞別に色分けします。
- **ホバー情報**: 形態素情報、読み、原形、Wikipediaサマリー、オフライン用語図鑑を表示します。
- **段階実行**: 入力中は軽量ルール、アイドル時や保存時は全ルールを実行して体感速度を保ちます。
- **外部依存なし**: kuromoji-optimizedとIPA辞書を同梱し、MeCabのセットアップなしで動作します。

## 仕組み

otak-lspはVS Code拡張のクライアントとTypeScript製Language Serverで構成されています。文書が開かれた、または変更されたタイミングで解析をスケジュールし、対象テキストを抽出してからkuromoji-optimizedで形態素解析します。

Markdownではコードブロック、URL、テーブル、リスト記号など、診断対象から外すべき範囲をスペース置換で除外します。文字数を保ったまま解析するため、診断位置とセマンティックトークンの位置が元テキストに戻せます。

## 対応シナリオ

| otak-lspが解析するもの | 主な扱い |
| --- | --- |
| Markdown | 本文、見出し、テーブル、コードブロック内の日本語を設定に応じて解析 |
| JavaScript / TypeScript | コメント内の日本語を解析 |
| Python | `#` コメントとドキュメント文字列内の日本語を解析 |
| C / C++ / Java / Rust | 行コメント、ブロックコメント、ドキュメントコメント内の日本語を解析 |
| Plain Text | 文書全体を解析 |

## コマンド

コマンドパレットから実行できます。ステータスバーの項目からON/OFFを切り替えることもできます。

| コマンド | ID | 説明 |
| --- | --- | --- |
| otak-lsp: ON/OFF切り替え | `otakLsp.toggle` | 文法チェックとセマンティックハイライトをまとめて切り替えます。 |
| otak-lsp: ステータス表示 | `otakLsp.showStatus` | 出力パネルに現在の状態、設定、アクティブファイル情報を表示します。 |
| otak-lsp: 現在のファイルを解析 | `otakLsp.analyzeCurrentFile` | アクティブなファイルを即時に全ルールで再解析します。 |
| otak-lsp: セマンティックテーマを選択 | `otakLsp.selectTheme` | `default` / `pastel` / `vivid` / `monochrome` / `nature` から配色を選びます。 |

## 設定

設定の完全な一覧は [docs/configuration.md](docs/configuration.md) に自動生成されています。READMEには代表的な設定だけを載せています。

| 設定 | 既定値 | 説明 |
| --- | --- | --- |
| `otakLsp.enableGrammarCheck` | `true` | 文法チェックを有効にします。 |
| `otakLsp.enableSemanticHighlight` | `true` | 品詞ベースのセマンティックハイライトを有効にします。 |
| `otakLsp.targetLanguages` | `["markdown", "javascript", ...]` | 解析対象の言語IDを指定します。 |
| `otakLsp.markdown.analyzeCodeBlocks` | `true` | Markdownのコードブロック内も解析します。 |
| `otakLsp.markdown.analyzeTables` | `true` | Markdownテーブル内も文法チェック対象にします。 |
| `otakLsp.hover.enableWikipedia` | `true` | ホバーにWikipediaサマリーを表示します。 |
| `otakLsp.hover.enableGlossary` | `true` | ホバーにオフライン用語図鑑を表示します。 |
| `otakLsp.advanced.tieredExecution.enabled` | `true` | 入力中は軽量ルール、アイドル時は全ルールを実行します。 |
| `otakLsp.advanced.parallelExecution.enabled` | `false` | worker_threadsによる高度ルールの並列実行を有効にします。 |
| `otakLsp.maxDocumentChars` | `1000000` | 解析対象にする最大文字数を制限します。 |
| `otakLsp.maxNumberOfProblems` | `2000` | 1文書あたりの診断数を制限します。 |

ルールの完全な一覧は [docs/rules.md](docs/rules.md) に自動生成されています。

## ルールグループ

| グループ | 例 |
| --- | --- |
| 基本文法 | 二重助詞、助詞連続、動詞-助詞不整合、冗長な助動詞 |
| 文体・構文 | 文体混在、ら抜き、二重否定、助詞の連続、ねじれ文、受身の多用 |
| 表記・字種 | 技術用語表記、漢字開き、送り仮名、全角半角、カタカナ長音、日付表記 |
| 約物・括弧 | 括弧と引用符の不一致、二点リーダ、ダッシュ、疑問符/感嘆符後の空白 |
| 公文書 | 常用漢字、「及び/並びに」「又は/若しくは」、箇条書き句点運用 |
| Markdown構造 | 見出しレベル、テーブル列数、コードブロック言語指定 |

### インライン抑制

一部の行だけ警告を消したい場合は、Markdownコメントや各言語のコメントに抑制ディレクティブを書きます。

| ディレクティブ | 効果 |
| --- | --- |
| `otak-lsp-disable-next-line [コード ...]` | 次の行の診断を抑制 |
| `otak-lsp-disable-line [コード ...]` | 同じ行の診断を抑制 |
| `otak-lsp-disable [コード ...]` | この行以降を抑制 |
| `otak-lsp-enable [コード ...]` | 抑制を解除 |

```markdown
<!-- otak-lsp-disable-next-line orthography-variant -- 法令用語をそのまま引用 -->
「及び」「並びに」「又は」「若しくは」は公用文の接続表現です。

行末で抑制することもできます。 <!-- otak-lsp-disable-line term-notation -->
```

## ホバー用語図鑑

ホバーでは品詞、原形、読みを表示し、設定に応じてWikipediaサマリーとオフライン用語図鑑を追加します。Wikipedia取得に失敗しても、ホバー全体は壊れず、サマリー部分だけ省略されます。

#### 用語図鑑カテゴリ（オフライン）

`otakLsp.hover.enabledGlossaries` で表示するカテゴリを選べます。

| ID | 名称 | 説明 |
|---|---|---|
| `it` | IT用語図鑑 | 開発・運用の基本IT用語（ツール/プロトコル/手法など）。 |
| `otakLspSettings` | otak-lsp設定用語図鑑 | 拡張機能の設定キー/挙動に関する用語。 |
| `cloud` | クラウド用語図鑑 | クラウド全般の概念（IaaS/PaaS、リージョン/AZ、ネットワーク等）。 |
| `backend` | バックエンド用語図鑑 | サーバ/API/バッチ/分散処理などバックエンド実装の用語。 |
| `frontend` | フロントエンド用語図鑑 | ブラウザ/DOM/CSS/ビルドなどフロントエンド実装の用語。 |
| `ddd` | DDD用語図鑑 | ドメイン駆動設計（ユビキタス言語、境界づけられたコンテキスト等）。 |
| `tdd` | TDD用語図鑑 | テスト手法（TDD、モック、テストピラミッド等）。 |
| `pmbok` | PMBOK用語図鑑 | プロジェクト管理（スコープ/品質/リスク/調達など）。 |
| `java` | Java用語図鑑 | Java言語/エコシステム（JVM、Spring等）の用語。 |
| `nextjs` | Next.js用語図鑑 | Next.js固有の概念（ルーティング、RSC等）の用語。 |
| `dotnet` | .NET用語図鑑 | .NET/ASP.NET/CLRなど .NET エコシステムの用語。 |
| `pip` | pip・Python用語図鑑 | Python/pip（パッケージ管理、仮想環境等）の用語。 |
| `npm` | npm用語図鑑 | npm（パッケージ管理、scripts、依存解決等）の用語。 |
| `git` | Git用語図鑑 | Git（ブランチ、マージ、リベース等）の用語。 |
| `security` | セキュリティ用語図鑑 | 脅威/対策の基本（暗号、脆弱性、攻撃手法など）。 |
| `networkHttp` | ネットワーク・HTTP用語図鑑 | ネットワーク/HTTPの基礎（DNS、TLS、ヘッダ等）。 |
| `dbSqlTx` | DB・SQL・トランザクション用語図鑑 | DB/SQL/トランザクション/インデックス等の用語。 |
| `oracle` | Oracle用語図鑑 | Oracle Database（PL/SQL、表領域等）の用語。 |
| `apiDesign` | API設計用語図鑑 | API設計の用語（REST、エラーハンドリング、バージョニング等）。 |
| `devopsCicd` | DevOps・CI/CD・リリース用語図鑑 | CI/CD、リリース、運用改善（DevOps）の用語。 |
| `containersK8s` | コンテナ・Kubernetes用語図鑑 | コンテナとKubernetes（Pod、Service、Ingress等）の用語。 |
| `linux` | Linux用語図鑑 | Linux（シェル、プロセス、パーミッション等）の用語。 |
| `windows` | Windows用語図鑑 | Windows（PowerShell、レジストリ、サービス等）の用語。 |
| `observabilitySre` | 監視・Observability・SRE用語図鑑 | 監視/ログ/トレースとSRE（SLI/SLO等）の用語。 |
| `distributedSystems` | 分散システム用語図鑑 | 分散システムの基礎（整合性、レプリケーション等）の用語。 |
| `enterpriseArch` | エンタープライズアーキテクチャ用語図鑑 | 全体最適/ガバナンス/標準化などEAの用語。 |
| `performanceCache` | パフォーマンス・キャッシュ用語図鑑 | 性能/キャッシュ（レイテンシ、スループット等）の用語。 |
| `architecturePatterns` | 設計パターン・アーキテクチャ用語図鑑 | 設計パターン/アーキテクチャ（レイヤード、CQRS等）の用語。 |
| `agileProduct` | アジャイル・Scrum・プロダクト用語図鑑 | アジャイル/Scrum/プロダクト開発（Backlog等）の用語。 |
| `aiLlm` | AI/LLM用語図鑑 | AI/LLMの基礎用語（プロンプト、埋め込み等）。 |
| `contractLegal` | 契約・法務（準委任・請負・SLA等）用語図鑑 | 開発委託/契約・法務（SLA、責任分界等）の用語。 |
| `iotEmbedded` | IoT・組み込み用語図鑑 | IoT/組み込み（センサ、通信、MCU等）の用語。 |
| `awsServices` | AWSサービス用語図鑑 | AWSのサービス名と代表的なコンソール用語（リソース/設定項目等）。 |
| `azureServices` | Azureサービス用語図鑑 | Azureのサービス名と代表的なコンソール用語（リソース/設定項目等）。 |
| `gcpServices` | GCPサービス用語図鑑 | GCPのサービス名と代表的なコンソール用語（リソース/設定項目等）。 |
| `ociServices` | OCIサービス用語図鑑 | OCIのサービス名と代表的なコンソール用語（リソース/設定項目等）。 |

この一覧は同梱辞書データと一致しており、`npm run audit:glossary` で整合性を検証できます。設定型には整備中のカテゴリも含まれますが、データ提供までは表示対象になりません。

## セキュリティとプライバシー

- **MeCab不要**: 形態素解析エンジンとIPA辞書を同梱しています。
- **ローカル優先**: 文法チェック、校正、用語図鑑はローカルで処理されます。
- **Wikipediaは任意**: `otakLsp.hover.enableWikipedia` が有効な場合のみ、ホバー対象語を日本語版Wikipedia REST APIへ問い合わせます。
- **APIキー不要**: 外部サービスのアカウントやAPIキーは必要ありません。
- **テレメトリなし**: 拡張機能独自の分析イベント送信は行いません。
- **大規模文書への上限**: `otakLsp.maxDocumentChars` と `otakLsp.maxNumberOfProblems` で解析負荷を制御できます。

## 要件

- VS Code **1.60.0** 以上
- 日本語テキストを含むMarkdown、プレーンテキスト、または対応言語のソースファイル
- Wikipediaホバーを使う場合のみネットワーク接続

## トラブルシューティング

- **文法チェックが動かない**: `otakLsp.enableGrammarCheck` が `true` か、対象ファイルの言語IDが `otakLsp.targetLanguages` に含まれているかを確認してください。
- **セマンティックハイライトが表示されない**: `otakLsp.enableSemanticHighlight` とVS Codeの `editor.semanticHighlighting.enabled` を確認してください。
- **コードブロックやテーブルを対象外にしたい**: `otakLsp.markdown.analyzeCodeBlocks` または `otakLsp.markdown.analyzeTables` を `false` にしてください。
- **特定ルールだけ無効化したい**: 設定画面で該当する `otakLsp.advanced.*`、`otakLsp.official.*`、`otakLsp.proofreading.*` を `false` にしてください。
- **初回起動が遅い**: 初回はkuromoji-optimizedの辞書ロードに数秒かかる場合があります。2回目以降は高速に動作します。

## 開発

```bash
npm install
npm run compile
npm test
npm run package
```

ドキュメント整合性は実装を真実源として検証します。

```bash
npm run docs:all
npm run check:consistency
```

## 品質評価

評価データとランナーは `server/src/grammar/evals/` にあります。`npm run evals:update-readme` で以下のブロックを更新できます。

<!-- EVALS-START -->
## Detection Coverage

![Coverage](https://img.shields.io/badge/coverage-100%25-brightgreen)

| Category | Status | Example |
|----------|--------|---------|
| 二重助詞 | PASS | 私がが行く |
| 助詞連続 | PASS | 彼がを見た |
| 動詞-助詞不整合 | PASS | 公園を行く |
| 冗長な助動詞 | PASS | 問題でです |
| 文体混在 | PASS | これは素敵です。あれは平凡である。 |
| ら抜き言葉 | PASS | 食べれる |
| 二重否定 | PASS | できないわけではない |
| 同じ助詞の連続使用 | PASS | 私は本を彼は読む |
| 接続詞連続使用 | PASS | しかし、Aです。しかし、Bです。 |
| 逆接「が」連続使用 | PASS | 行きますが、Aです。行きますが、Bです。 |
| 全角半角アルファベット混在 | PASS | これはＡＢＣとabcの混在です |
| 弱い表現 | PASS | これは正しいかもしれない |
| 読点過多 | PASS | 私は、今日、朝、昼、夜、と、食事をしました。 |
| 技術用語表記 | PASS | Javascriptを使用します |
| 漢字開き | PASS | 確認して下さい |
| 冗長表現 | PASS | 馬から落馬する |
| 重複表現（同語反復） | PASS | 頭痛が痛い |
| サ変動詞 | PASS | 勉強をする |
| 主語の欠如 | PASS | 昨日、買いました。 |
| ねじれ文 | PASS | 私の夢は医者になりたいです |
| 長すぎる文 | PASS | 私は昨日の朝早く起きて朝食を食べてから会社に向かい午前中は会議に出席して午後は資料を作成し夕方には上司に報告して帰宅したが、その日はとても忙しくて大変だったので、帰宅後はすぐに寝てしまい、翌朝目覚めたときには疲れが残っていたのでコーヒーを飲んだ。 |
| 同音異義語 | PASS | 意志が低い |
| 敬語の誤用 | PASS | お客様がおっしゃられました |
| 副詞の呼応 | PASS | 決して行きます |
| 助詞「の」の連続 | PASS | 東京の会社の部長の息子の友達 |
| 修飾語の位置 | PASS | 赤い大きな花 |
| 曖昧な指示語 | PASS | それは問題だ。しかし、それも重要だ。 |
| 曖昧語 | PASS | 早めに提出してください。 |
| 「べき」用法 | PASS | 申請者は本人確認書類を提出するべき。 |
| 受身の多用 | PASS | 報告書が作成された。結果が分析された。結論が導かれた。 |
| 名詞の連続 | PASS | 東京都渋谷区松濤一丁目住所 |
| 接続詞の誤用 | PASS | 晴れた。しかし、外出した。 |
| 文末表現の単調さ | PASS | Aです。Bです。Cです。Dです。 |
| 送り仮名の揺れ | PASS | 愛でる心を表わす |
| 表記ゆれ | PASS | 出来るだけ早く対応します |
| 全角半角数字・記号混在 | PASS | ２０２５年に25件の案件を受注 |
| カタカナ長音 | PASS | メイルを送る |
| 半角カナ | PASS | ﾃｽﾄｱｶｳﾝﾄを作成 |
| 数字表記の混在 | PASS | 二〇二五年に20件受注 |
| スペースと単位 | PASS | CPUは3.2GHzで動作 |
| 括弧・引用符の不一致 | PASS | 彼は「すぐ戻ると言った。 |
| 日付表記ゆれ | PASS | 2025/12/11のデータと2025年12月10日を比較 |
| ハイフン・ダッシュ・チルダ不統一 | PASS | 受付時間 9:00-18:00 |
| 中黒の過不足 | PASS | 設計・・実装・テスト |
| 全角記号混在 | PASS | 時間：10時/場所:会議室 |
| 文末コロン | PASS | これはテストです： |
| 句読点スタイルの混在 | PASS | これは例文です。しかし，これは混在している。 |
| 引用符スタイルの混在 | PASS | 彼は「こんにちは」と言った。彼女は"さようなら"と答えた。 |
| 箇条書き記号の混在 | PASS | ・項目1 - 項目2 * 項目3 |
| 強調記号の混在 | PASS | **太字**と__下線強調__の混在。 |
| 英語表記の大文字小文字混在 | PASS | APIを使用します。apiの設計は重要です。 |
| 単位表記の混在 | PASS | 速度は100km/hで、距離は50キロメートルです。 |
| 人称代名詞の混在 | PASS | 私は開発者です。僕はプログラミングが好きです。 |
| 見出しレベルの飛び | PASS | # タイトル ### サブセクション |
| テーブル列数の不一致 | PASS | \| A \| B \| C \| \|---\|---\| \| 1 \| 2 \| 3 \| |
| コードブロック言語指定の欠落 | PASS | ``` const x = 1; ``` |
| 「及び/並びに」使い分け | PASS | A並びにBを確認する |
| 「又は/若しくは」使い分け | PASS | A若しくはBを選択する |
| 常用漢字外使用 | PASS | 斡旋を依頼する |
| 常用漢字外使用（除外） | PASS | 澤田さん |
| 和暦初年の統一 | PASS | 令和1年に設立 |
| ひらがな連続 | PASS | これはとてもながいひらがなのれんぞくぶんしょうでありますがこのぶんしょうはさらにながくつづきますので… |
| カタカナ連続 | PASS | コレハトテモナガイカタカナノレンゾクブンショウデアリマスモット |
| 漢字連続 | PASS | 東京都渋谷区松濤一丁目 |
| 二点リーダ偶数 | PASS | これは‥テストです |
| ダッシュ偶数 | PASS | これは―テストです |
| 疑問符/感嘆符後の空白 | PASS | 申請期限を知っていますか？次のページをご覧ください。 |
| 括弧内句点 | PASS | （以下「基本計画」という） |
| 括弧の入れ子深さ | PASS | （（（（深い括弧）））） |
| 箇条書き句点運用 | PASS | - 項目。 |
| 文複雑度 | PASS | 本契約に基づき甲が乙に対して負担する債務の履行に関連して生じた損害については、甲は乙に対して、その損… |

Last updated: 2026-06-29
<!-- EVALS-END -->

## 関連拡張機能

[odangoo](https://marketplace.visualstudio.com/publishers/odangoo) のVS Code拡張機能:

| 拡張機能 | 説明 |
| --- | --- |
| [**otak-proxy**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-proxy) | VS Code、Git、npm、統合ターミナルのプロキシを切り替えます。 |
| [**otak-monitor**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-monitor) | CPU、メモリ、ディスク使用率をステータスバーに表示します。 |
| [**otak-committer**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-committer) | AI支援でコミットメッセージ、Pull Request、Issueを作成します。 |
| [**otak-clipboard**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clipboard) | フォルダや現在のタブをクリップボードへ素早くコピーします。 |
| [**otak-clock**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-clock) | 2つのタイムゾーンをステータスバーに表示します。 |
| [**otak-paste**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-paste) | Markdownへ貼り付けたPNGをassetsへ保存し、ロスレス最適化します。 |
| [**otak-pomodoro**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-pomodoro) | VS Code内で使えるPomodoroタイマーです。 |
| [**otak-restart**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-restart) | Extension Hostやウィンドウを素早く再起動します。 |
| [**otak-zen**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-zen) | 集中用のZenモードを提供します。 |
| [**otak-usage**](https://marketplace.visualstudio.com/items?itemName=odangoo.otak-usage) | VS Codeの利用統計をすぐ確認できます。 |

## ライセンス

[MIT License](LICENSE) のもとで公開しています。

<div align="center">
<br>
<sub>Built by <a href="https://github.com/tsuyoshi-otake">tsuyoshi-otake</a> · <a href="https://marketplace.visualstudio.com/items?itemName=odangoo.otak-lsp">Marketplace</a> · <a href="https://github.com/tsuyoshi-otake/otak-lsp">GitHub</a> · <a href="https://github.com/tsuyoshi-otake/otak-lsp/issues">Issues</a></sub>
</div>

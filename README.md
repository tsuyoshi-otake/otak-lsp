# otak-lsp

日本語形態素解析VSCode拡張機能です。**外部依存なし**で、文法チェック、セマンティックハイライト、ホバー情報表示などの機能を提供します。

## 特徴
- **外部依存なし**: kuromoji.jsを内蔵しており、MeCabのインストールは不要です
- **辞書内蔵**: 様々なの辞書を内蔵
- **軽量**: 純粋なJavaScript実装
- **高度な文法チェック**: 文体統一、ら抜き言葉、技術用語表記など50種類以上のルールをサポート
- **公文書対応**: 常用漢字チェック、「及び/並びに」「又は/若しくは」使い分け、箇条書き句点運用、人名・地名自動除外
- **高速な解析**: 段階実行・事前検索キャッシュにより、入力中もスムーズに動作

![otak-lsp セマンティックハイライト例](https://raw.githubusercontent.com/tsuyoshi-otake/otak-lsp/main/images/01.png)

## 主な機能

### 日本語文法チェック（基本ルール）

プログラミング言語のコメントやMarkdownファイル内にある日本語テキストを解析し、以下の文法エラーを検出します：

- **二重助詞**: 「私がが行く」のような同じ助詞の重複
- **助詞連続**: 「彼がを見た」のような不適切な助詞の連続
- **動詞-助詞不整合**: 自動詞に「を」を使用するような不自然な組み合わせ

### 高度な文法チェックルール

基本ルールに加えて、より高度な文法チェック機能を提供します：

#### 1. 文体の混在検出（Style Consistency）

文書内で「です・ます調」（敬体）と「である調」（常体）が混在している場合に警告します。

```markdown
これはテストです。      <- 敬体（です・ます調）
これはテストである。    <- 常体（である調）
-> 文体混在の警告が表示されます
```

#### 2. ら抜き言葉の検出（Ra-nuki Detection）

「食べれる」「見れる」などのら抜き言葉を検出し、正しい形を提案します。

```markdown
食べれる -> 食べられる
見れる   -> 見られる
起きれる -> 起きられる
```

※ Markdownのコードブロック（コードフェンス）内も既定で解析対象（文法チェック/セマンティックハイライト）です。接続詞連続（Conjunction Repetition）や逆接「が」連続（Adversative Ga）など、文脈依存で誤検出しやすい一部ルールは「コード（例: ` ```javascript `）」では対象外としますが、` ```markdown ` / ` ```text ` のような「例文」コードブロックでは検出対象になります。コードブロック自体を対象外にしたい場合は `otakLsp.markdown.analyzeCodeBlocks` を無効にしてください。
※ Markdownのテーブル（`|...|`）内も既定で文法チェック対象です。テーブル内を対象外にしたい場合は `otakLsp.markdown.analyzeTables` を無効にしてください（無効にしても、弱い表現（Weak Expression）/ 技術用語表記（Term Notation）/ 漢字開き（Kanji Opening）/ 冗長表現（Redundant Expression）/ 重複表現（Tautology）に加えて、箇条書き記号の混在/強調記号の混在/見出しレベルの飛び/テーブル列数の不一致/コードブロック言語指定の欠落は対象のままです）。

#### 3. 二重否定の検出（Double Negation）

「ないわけではない」「ないことはない」などの二重否定を検出します。

```markdown
できないわけではない -> 「できる」への書き換えを提案
知らないことはない   -> 「知っている」への書き換えを提案
```

#### 4. 同じ助詞の連続使用検出（Particle Repetition）

同じ文中で同じ助詞が繰り返し使用されている場合に警告します。

```markdown
私は本を彼は読む。
```

（必要に応じて `otakLsp.advanced.enableParticleRepetition` で無効化できます）

#### 5. 同じ接続詞の連続使用検出（Conjunction Repetition）

連続する文で同じ接続詞が使用されている場合に警告し、代替案を提示します。

```markdown
しかし、Aです。しかし、Bです。
-> 「しかし」の連続使用を検出し、「ところが」「けれども」などの代替案を提示
```

対象となる接続詞: しかし、また、そして、それで、だから、ところが、すると、それから、さらに

#### 6. 逆接の「が」の連続使用検出（Adversative Ga）

逆接の「が」が連続する文で使用されている場合に警告します。

```markdown
行きますが、Aです。行きますが、Bです。
-> 「が」の連続使用を検出し、文の分割を提案
```

#### 7. 全角/半角アルファベットの混在検出（Alphabet Width）

文書内で全角アルファベットと半角アルファベットが混在している場合に警告します。

```markdown
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

```markdown
私は、今日、朝、昼、夜、と、食事をしました。
-> 読点が6個あります（閾値: 4個）。文の分割を検討してください。
```

#### 10. 技術用語の表記統一（Term Notation）

技術用語の誤った表記を検出し、正しい表記を提案します。
※ この辞書の表記ゆれはホバーの用語図鑑（オフライン）にも反映されます（例: `Nodejs` → `Node.js`）。
※ 辞書は継続的に拡充しており、READMEの表は代表例の抜粋です（全件は `server/src/dictionaries/termNotationDictionary.ts` を参照）。

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

#### 12. 冗長表現の検出（Redundant Expression）

「馬から落馬する」「後で後悔する」など、意味が重複した冗長表現を検出します。

| 冗長表現 | 簡潔な表現 |
|---------|-----------|
| 馬から落馬 | 落馬 |
| 後で後悔 | 後悔 |
| 一番最初 | 最初 |
| 各々それぞれ | それぞれ |
| まず最初に | 最初に |
| 過半数を超える | 過半数 |
| 元旦の朝 | 元旦 |

#### 13. 重複表現（同語反復）の検出（Tautology）

「頭痛が痛い」「違和感を感じる」など、同じ意味の言葉が重複した表現を検出します。

| 重複表現 | 適切な表現 |
|---------|-----------|
| 頭痛が痛い | 頭が痛い / 頭痛がする |
| 違和感を感じる | 違和感がある / 違和感を覚える |
| 被害を被る | 被害を受ける / 被害にあう |
| 犯罪を犯す | 罪を犯す / 犯罪を行う |
| 危険が危ない | 危険がある / 危ない |
| 歌を歌う | 歌う / 歌を披露する |

#### 14. 助詞「の」の連続使用検出（No Particle Chain）

助詞「の」が3回以上連続して使用されている場合に警告します。

```markdown
東京の会社の部長の息子
-> 「の」が3回連続しています。文の書き換えを検討してください。
```

閾値は設定で変更可能です（デフォルト: 3回）。

#### 15. 文末表現の単調さ検出（Monotonous Ending）

同じ文末表現（「です」「ます」「である」など）が3回以上連続する場合に警告します。

```markdown
これはAです。これはBです。これはCです。
-> 「です」が3回連続しています。表現を多様化してください。

提案: 「である」「だ」「になります」などへの変更
```

閾値は設定で変更可能です（デフォルト: 3回）。

#### 16. 長すぎる文の検出（Long Sentence）

1文が120文字を超える場合に警告し、文の分割を提案します。

```markdown
私は昨日の朝早く起きて朝食を食べてから会社に向かい午前中は会議に出席して午後は資料を作成し夕方には上司に報告して帰宅したが、その日はとても忙しくて大変だったので、帰宅後はすぐに寝てしまい、翌朝目覚めたときには疲れが残っていたのでコーヒーを飲んだ。
-> 文が長すぎます（123文字、閾値: 120文字）。文の分割を検討してください。
```

閾値は設定で変更可能です（デフォルト: 120文字）。

#### 17. 文末コロンの検出（Sentence Ending Colon）

日本語文の末尾にコロン（：）が使用されている場合に警告します。コロンは箇条書きの前置きや説明の導入に使用されますが、文末には使用しません。

```markdown
これはテストです：
-> 「句点（。）に変更するか、文を続けてください」と提案
```

**注意**: 箇条書きの前置き文（次の行が箇条書きの場合）は対象外です。

```markdown
以下の項目を確認してください：
- 項目1
- 項目2
```

#### その他の高度ルール（一覧）

| カテゴリ | ルール | 内容 | 設定キー |
|---|---|---|---|
| 構文/文体 | サ変動詞の誤用 | 「勉強をする」など不要な「を」を指摘 | `otakLsp.advanced.enableSahenVerb` |
| 構文/文体 | 主語の欠如 | 主語が省略されすぎて読みづらい文を検出 | `otakLsp.advanced.enableMissingSubject` |
| 構文/文体 | ねじれ文 | 主語と述語の対応が崩れた文を検出 | `otakLsp.advanced.enableTwistedSentence` |
| 構文/文体 | 同音異義語 | 文脈に合わない同音異義語の使用を検出 | `otakLsp.advanced.enableHomophone` |
| 構文/文体 | 敬語の誤用 | 二重敬語・誤用・不統一を検出 | `otakLsp.advanced.enableHonorificError` |
| 構文/文体 | 副詞の呼応 | 「決して〜ない」など呼応の不一致を検出 | `otakLsp.advanced.enableAdverbAgreement` |
| 構文/文体 | 修飾語の位置 | 修飾語と被修飾語の順序不整合を検出 | `otakLsp.advanced.enableModifierPosition` |
| 構文/文体 | 曖昧な指示語 | 「それ」「これ」などの参照が不明瞭なケースを検出 | `otakLsp.advanced.enableAmbiguousDemonstrative` |
| 構文/文体 | 曖昧語 | 「早めに」「だいたい」「少人数」など曖昧な表現を検出 | `otakLsp.advanced.enableAmbiguousTerm` |
| 構文/文体 | 「べき」の用法 | 「するべき」や文末「べき」を検出 | `otakLsp.advanced.enableBekiUsage` |
| 構文/文体 | 受身表現の多用 | 受身表現の過剰な連続を検出 | `otakLsp.advanced.enablePassiveOveruse` |
| 構文/文体 | 名詞の連続 | 名詞の過度な連結を検出 | `otakLsp.advanced.enableNounChain` |
| 構文/文体 | 接続詞の誤用 | 逆接/順接など関係に合わない接続詞を検出 | `otakLsp.advanced.enableConjunctionMisuse` |
| 表記/字種 | 送り仮名の揺れ | 「表わす/表す」などの揺れを検出 | `otakLsp.advanced.enableOkuriganaVariant` |
| 表記/字種 | 表記ゆれ | 「出来る/できる」などの揺れを検出 | `otakLsp.advanced.enableOrthographyVariant` |
| 表記/字種 | 数字の全角/半角混在 | 数字の表記ゆれを検出 | `otakLsp.advanced.enableNumberWidthMix` |
| 表記/字種 | カタカナ長音 | 「サーバ/サーバー」などの揺れを検出 | `otakLsp.advanced.enableKatakanaChouon` |
| 表記/字種 | 半角カナ | 半角カナの使用を検出 | `otakLsp.advanced.enableHalfwidthKana` |
| 表記/字種 | 数字表記の混在 | 漢数字とアラビア数字の混在を検出 | `otakLsp.advanced.enableNumeralStyleMix` |
| 表記/字種 | 単位前後スペース | 数字/単位間のスペース過不足を検出 | `otakLsp.advanced.enableSpaceAroundUnit` |
| 表記/字種 | 括弧・引用符の不一致 | 括弧/引用符の対応ミスを検出 | `otakLsp.advanced.enableBracketQuoteMismatch` |
| 表記/字種 | 日付表記ゆれ | 日付表記の混在を検出 | `otakLsp.advanced.enableDateFormatVariant` |
| 表記/字種 | ダッシュ/チルダ不統一 | 記号の揺れを検出 | `otakLsp.advanced.enableDashTildeNormalization` |
| 表記/字種 | 中黒の過不足 | 中黒の連続/不足を検出 | `otakLsp.advanced.enableNakaguroUsage` |
| 表記/字種 | 記号の全角/半角混在 | 記号の表記ゆれを検出 | `otakLsp.advanced.enableSymbolWidthMix` |
| 混在検出 | 句読点スタイル混在 | 「、/，」「。/．」の混在を検出 | `otakLsp.advanced.enablePunctuationStyleMix` |
| 混在検出 | 引用符スタイル混在 | 「」/"" の混在を検出 | `otakLsp.advanced.enableQuotationStyleMix` |
| 混在検出 | 箇条書き記号混在 | 「・/-/*」などの混在を検出 | `otakLsp.advanced.enableBulletStyleMix` |
| 混在検出 | 強調記号混在 | ** と __ の混在を検出 | `otakLsp.advanced.enableEmphasisStyleMix` |
| 混在検出 | 英語表記大小文字混在 | api/API/Api などの混在を検出 | `otakLsp.advanced.enableEnglishCaseMix` |
| 混在検出 | 単位表記混在 | km/h と キロメートル などの混在を検出 | `otakLsp.advanced.enableUnitNotationMix` |
| 混在検出 | 人称代名詞混在 | 私/僕/当方 などの混在を検出 | `otakLsp.advanced.enablePronounMix` |
| Markdown構造 | 見出しレベル飛び | h1→h3 などの飛びを検出 | `otakLsp.advanced.enableHeadingLevelSkip` |
| Markdown構造 | テーブル列数不一致 | Markdownテーブルの列数不一致を検出 | `otakLsp.advanced.enableTableColumnMismatch` |
| Markdown構造 | コードブロック言語指定欠落 | 言語指定のないコードブロックを検出 | `otakLsp.advanced.enableCodeBlockLanguage` |

### 公文書対応ルール

公用文・行政文書作成に特化したルールを提供します。

#### 18. 常用漢字チェック（Jouyou Kanji）

常用漢字表（2136字）に含まれない漢字を検出し、ひらがなまたは代替漢字への書き換えを提案します。

```markdown
噂話をする   -> 「噂」は常用漢字外。「うわさ話」への書き換えを提案
斡旋する     -> 「斡」は常用漢字外。「あっせん」への書き換えを提案
```

**人名・地名の自動除外**: 人名や地名に含まれる常用漢字外は自動的に除外されます。

| パターン | 動作 | 例 |
|----------|------|-----|
| 姓 + 敬称 | 除外 | 澤田さん、濱口様、齋藤先生 |
| フルネーム | 除外 | 澤田翔太、濱口 颯、齋藤 凛 |
| 地名 | 除外 | 渋谷駅、埼玉県、横浜市 |
| 住所表記 | 除外 | 〒100-0001 東京都千代田区 |
| 一般語 | 検出 | 噂話、斡旋、煌めく |

**対応する旧字体姓**: 澤、濱、齋、邊、邉、廣、國、龍、嶋、髙 など

**設定オプション**:
- `otakLsp.official.excludeProperNounsFromJouyouKanji`: 固有名詞（人名・地名・組織名）を除外（デフォルト: true）

※ 人名・地名の自動除外は内部ロジックで有効化されており、現状は個別の設定項目として公開していません。

#### 19.「及び/並びに」使い分け（Oyobi Narabini）

法律文書・公文書での「及び」「並びに」の正しい使い分けを検出します。

```markdown
A並びにBを確認する（2項目の場合）
-> 「及び」を使用することを提案

A、B及びC並びにD、E及びFを確認する（正しい使用例）
-> 小さなグループは「及び」、大きなグループは「並びに」
```

#### 20.「又は/若しくは」使い分け（Matawa Wakushikuwa）

法律文書・公文書での「又は」「若しくは」の正しい使い分けを検出します。

```markdown
A若しくはBを選択する（2項目の場合）
-> 「又は」を使用することを提案

A、B又はC若しくはD、E又はFを選択する（正しい使用例）
-> 小さなグループは「又は」、大きなグループは「若しくは」
```

#### 21. 箇条書き句点運用（Bullet Punctuation）

名詞句の箇条書きは句点なし、文の箇条書きは句点ありを推奨します。曖昧な場合や末尾が「：」/括弧/引用符閉じの場合は対象外です。

```markdown
- 提出書類。 -> 名詞句なので句点を外す提案
- 必要書類を提出する -> 文なので句点を付ける提案
```

※ 既定で有効です。無効にする場合は `otakLsp.official.enableBulletPunctuation` を `false` に設定してください。

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

単語にマウスカーソルを合わせると、以下の情報を表示します。

- 表層形
- 品詞情報
- 原形
- 読み
- Wikipediaサマリー（オプション）
- 用語図鑑（オフライン、Wikipediaの下に表示）

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
| `security` | セキュリティ用語図鑑 | 脅威/対策の基本（暗号、脆弱性、攻撃手法など）。 |
| `networkHttp` | ネットワーク・HTTP用語図鑑 | ネットワーク/HTTPの基礎（DNS、TLS、ヘッダ等）。 |
| `authIam` | 認証認可・IAM用語図鑑 | 認証/認可/IAM（SSO、OIDC、ロール等）の用語。 |
| `dbSqlTx` | DB・SQL・トランザクション用語図鑑 | DB/SQL/トランザクション/インデックス等の用語。 |
| `apiDesign` | API設計用語図鑑 | API設計の用語（REST、エラーハンドリング、バージョニング等）。 |
| `devopsCicd` | DevOps・CI/CD・リリース用語図鑑 | CI/CD、リリース、運用改善（DevOps）の用語。 |
| `containersK8s` | コンテナ・Kubernetes用語図鑑 | コンテナとKubernetes（Pod、Service、Ingress等）の用語。 |
| `observabilitySre` | 監視・Observability・SRE用語図鑑 | 監視/ログ/トレースとSRE（SLI/SLO等）の用語。 |
| `distributedSystems` | 分散システム用語図鑑 | 分散システムの基礎（整合性、レプリケーション等）の用語。 |
| `messagingEda` | メッセージング・イベント駆動用語図鑑 | キュー/ストリーム等のメッセージングとEDAの用語。 |
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
| `cloudflareServices` | Cloudflareサービス用語図鑑 | Cloudflareの機能名とコンソール用語（画面項目/設定等）。 |

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
3. "otak-lsp" を検索
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
| `otakLsp.enableGrammarCheck` | 文法チェックの有効/無効 | `true` |
| `otakLsp.enableSemanticHighlight` | セマンティックハイライトの有効/無効 | `true` |
| `otakLsp.excludeTableDelimiters` | Markdownテーブル内のセマンティックハイライトの有効/無効（falseでテーブル全体をハイライト対象外） | `true` |
| `otakLsp.markdown.analyzeCodeBlocks` | Markdownのコードブロック（コードフェンス）内も文法チェック/セマンティックハイライト対象にする（※一部ルールは本文のみ） | `true` |
| `otakLsp.markdown.analyzeTables` | Markdownのテーブル（\|...\|）内も文法チェック対象にする | `true` |
| `otakLsp.targetLanguages` | 解析対象のファイルタイプ | `["markdown", "javascript", ...]` |
| `otakLsp.debounceDelay` | 解析のデバウンス遅延（ミリ秒） | `250` |
| `otakLsp.enableProfileLogs` | 解析パイプラインの計測ログを出力（開発者向け） | `false` |
| `otakLsp.hover.enableWikipedia` | ホバーにWikipediaサマリーを表示 | `true` |
| `otakLsp.hover.enableGlossary` | ホバーに用語図鑑（オフライン）を表示（Wikipediaの下に表示） | `true` |
| `otakLsp.hover.enabledGlossaries` | ホバーで表示する用語図鑑カテゴリ（デフォルトは全カテゴリ） | `["it", "cloud", ...]` |

### 高度な文法ルール設定

#### 文体・構文・表現

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.enableStyleConsistency` | 文体混在チェック | `true` |
| `otakLsp.advanced.enableRaNukiDetection` | ら抜き言葉チェック | `true` |
| `otakLsp.advanced.enableDoubleNegation` | 二重否定チェック | `true` |
| `otakLsp.advanced.enableParticleRepetition` | 助詞連続使用チェック | `true` |
| `otakLsp.advanced.enableConjunctionRepetition` | 接続詞連続使用チェック | `true` |
| `otakLsp.advanced.enableAdversativeGa` | 逆接「が」連続使用チェック | `true` |
| `otakLsp.advanced.enableWeakExpression` | 弱い表現チェック | `true` |
| `otakLsp.advanced.enableCommaCount` | 読点数チェック | `true` |
| `otakLsp.advanced.enableRedundantExpression` | 冗長表現チェック | `true` |
| `otakLsp.advanced.enableTautology` | 重複表現（同語反復）チェック | `true` |
| `otakLsp.advanced.enableNoParticleChain` | 助詞「の」連続チェック | `true` |
| `otakLsp.advanced.enableMonotonousEnding` | 文末単調さチェック | `true` |
| `otakLsp.advanced.enableLongSentence` | 長文チェック | `true` |
| `otakLsp.advanced.enableSahenVerb` | サ変動詞誤用チェック | `true` |
| `otakLsp.advanced.enableMissingSubject` | 主語欠如チェック | `true` |
| `otakLsp.advanced.enableTwistedSentence` | ねじれ文チェック | `true` |
| `otakLsp.advanced.enableHomophone` | 同音異義語チェック | `true` |
| `otakLsp.advanced.enableHonorificError` | 敬語誤用チェック | `true` |
| `otakLsp.advanced.enableAdverbAgreement` | 副詞呼応チェック | `true` |
| `otakLsp.advanced.enableModifierPosition` | 修飾語位置チェック | `true` |
| `otakLsp.advanced.enableAmbiguousDemonstrative` | 曖昧な指示語チェック | `true` |
| `otakLsp.advanced.enableAmbiguousTerm` | 曖昧語チェック | `true` |
| `otakLsp.advanced.enableBekiUsage` | 「べき」用法チェック | `true` |
| `otakLsp.advanced.enablePassiveOveruse` | 受身表現多用チェック | `true` |
| `otakLsp.advanced.enableNounChain` | 名詞連続チェック | `true` |
| `otakLsp.advanced.enableConjunctionMisuse` | 接続詞誤用チェック | `true` |
| `otakLsp.advanced.enableSentenceEndingColon` | 文末コロン検出 | `true` |

#### 表記・字種・表記ゆれ

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.enableAlphabetWidth` | 全角/半角アルファベット混在チェック | `true` |
| `otakLsp.advanced.enableTermNotation` | 技術用語表記チェック | `true` |
| `otakLsp.advanced.enableKanjiOpening` | 漢字開きチェック | `true` |
| `otakLsp.advanced.enableOkuriganaVariant` | 送り仮名の揺れチェック | `true` |
| `otakLsp.advanced.enableOrthographyVariant` | 表記ゆれチェック | `true` |
| `otakLsp.advanced.enableNumberWidthMix` | 数字の全角/半角混在チェック | `true` |
| `otakLsp.advanced.enableKatakanaChouon` | カタカナ長音チェック | `true` |
| `otakLsp.advanced.enableHalfwidthKana` | 半角カナ検出 | `true` |
| `otakLsp.advanced.enableNumeralStyleMix` | 数字表記混在チェック | `true` |
| `otakLsp.advanced.enableSpaceAroundUnit` | 単位前後スペースチェック | `true` |
| `otakLsp.advanced.enableBracketQuoteMismatch` | 括弧・引用符不一致チェック | `true` |
| `otakLsp.advanced.enableDateFormatVariant` | 日付表記ゆれチェック | `true` |
| `otakLsp.advanced.enableDashTildeNormalization` | ダッシュ・チルダ不統一チェック | `true` |
| `otakLsp.advanced.enableNakaguroUsage` | 中黒の過不足チェック | `true` |
| `otakLsp.advanced.enableSymbolWidthMix` | 記号の全角/半角混在チェック | `true` |

#### 混在検出・Markdown構造

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.enablePunctuationStyleMix` | 句読点スタイル混在チェック | `true` |
| `otakLsp.advanced.enableQuotationStyleMix` | 引用符スタイル混在チェック | `true` |
| `otakLsp.advanced.enableBulletStyleMix` | 箇条書き記号混在チェック | `true` |
| `otakLsp.advanced.enableEmphasisStyleMix` | 強調記号混在チェック | `true` |
| `otakLsp.advanced.enableEnglishCaseMix` | 英語表記大小文字混在チェック | `true` |
| `otakLsp.advanced.enableUnitNotationMix` | 単位表記混在チェック | `true` |
| `otakLsp.advanced.enablePronounMix` | 人称代名詞混在チェック | `true` |
| `otakLsp.advanced.enableHeadingLevelSkip` | 見出しレベル飛びチェック | `true` |
| `otakLsp.advanced.enableTableColumnMismatch` | テーブル列数不一致チェック | `true` |
| `otakLsp.advanced.enableCodeBlockLanguage` | コードブロック言語指定欠落チェック | `true` |

### パフォーマンス設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.tieredExecution.enabled` | 段階実行の有効/無効。入力中は軽量ルールのみ実行し、アイドル/保存時に全ルールを実行 | `true` |
| `otakLsp.advanced.tieredExecution.idleDelayMs` | アイドル判定までの遅延（ミリ秒） | `1200` |

### 公文書対応設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.official.enableJouyouKanji` | 常用漢字チェック | `true` |
| `otakLsp.official.enableOyobiNarabini` | 「及び/並びに」使い分けチェック | `true` |
| `otakLsp.official.enableMatawaWakushikuwa` | 「又は/若しくは」使い分けチェック | `true` |
| `otakLsp.official.enableBulletPunctuation` | 箇条書き句点運用チェック（名詞句は句点なし、文は句点あり） | `true` |
| `otakLsp.official.excludeProperNounsFromJouyouKanji` | 固有名詞を常用漢字チェックから除外 | `true` |

### 技術用語辞典設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.enableWebTechDictionary` | ウェブ技術用語辞典 | `true` |
| `otakLsp.advanced.enableGenerativeAIDictionary` | 生成AI用語辞典 | `true` |
| `otakLsp.advanced.enableAWSDictionary` | AWS用語辞典 | `true` |
| `otakLsp.advanced.enableAzureDictionary` | Azure用語辞典 | `true` |
| `otakLsp.advanced.enableOCIDictionary` | OCI用語辞典 | `true` |
| `otakLsp.advanced.customNotationRules` | 技術用語表記統一のカスタム辞書（`{ "誤表記": "正表記" }`） | `{}` |

### その他の設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.advanced.commaCountThreshold` | 読点の警告閾値 | `4` |
| `otakLsp.advanced.weakExpressionLevel` | 弱い表現の検出レベル（strict/normal/loose） | `normal` |
| `otakLsp.advanced.noParticleChainThreshold` | 助詞「の」連続の閾値 | `3` |
| `otakLsp.advanced.monotonousEndingThreshold` | 文末表現連続の閾値 | `3` |
| `otakLsp.advanced.longSentenceThreshold` | 長文と判定する文字数 | `120` |

### 校正設定

校正ソフトの設定画面に相当する詳細なチェック項目を提供します。既存の高度な文法ルール設定と併用できます。

#### 基本設定

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.preset` | プリセット（`video-default` / `custom`） | `custom` |
| `otakLsp.proofreading.mergeMode` | 既存設定とのマージモード（`override` / `merge`） | `override` |

#### 誤字チェック

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.typo.enable` | 誤字チェック全体の有効/無効 | `true` |
| `otakLsp.proofreading.typo.checkInBrackets` | 括弧内もチェックする | `true` |
| `otakLsp.proofreading.typo.eraFirstYear` | 和暦初年を「元年」に統一 | `true` |

#### 長さチェック

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.length.enable` | 長さチェック全体の有効/無効 | `true` |
| `otakLsp.proofreading.length.sentence` | 1文の最大文字数 | `120` |
| `otakLsp.proofreading.length.comma` | 1文の最大読点数 | `4` |
| `otakLsp.proofreading.length.hiragana` | ひらがな連続の閾値 | `18` |
| `otakLsp.proofreading.length.katakana` | カタカナ連続の閾値 | `18` |
| `otakLsp.proofreading.length.kanji` | 漢字連続の閾値 | `10` |

#### 約物チェック

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.punctuation.enable` | 約物チェック全体の有効/無効 | `true` |
| `otakLsp.proofreading.punctuation.evenLeader` | 二点リーダは偶数個で使用 | `true` |
| `otakLsp.proofreading.punctuation.evenDash` | ダッシュは偶数個で使用 | `true` |
| `otakLsp.proofreading.punctuation.evenWave` | 波線は偶数個で使用 | `true` |
| `otakLsp.proofreading.punctuation.spaceAfterQE` | 疑問符/感嘆符の後の空白をチェック | `true` |
| `otakLsp.proofreading.punctuation.periodBeforeCloseBracket` | 括弧内が文のときに句点を付ける | `true` |

#### 括弧チェック

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.bracket.enable` | 括弧チェック全体の有効/無効 | `true` |
| `otakLsp.proofreading.bracket.checkPairing` | 括弧の対応チェック | `true` |
| `otakLsp.proofreading.bracket.maxDepth` | 括弧の最大入れ子深さ | `3` |

#### 引用行

| 設定項目 | 説明 | デフォルト値 |
|---------|------|-------------|
| `otakLsp.proofreading.quoteLine.enable` | 引用行の除外を有効化 | `true` |
| `otakLsp.proofreading.quoteLine.markers` | 引用行の開始記号（配列またはカンマ区切り文字列） | `[">", "|"]` |

### 設定例

```json
{
  "otakLsp.enableGrammarCheck": true,
  "otakLsp.enableSemanticHighlight": true,
  "otakLsp.excludeTableDelimiters": true,
  "otakLsp.markdown.analyzeCodeBlocks": true,
  "otakLsp.markdown.analyzeTables": true,
  "otakLsp.targetLanguages": [
    "markdown",
    "javascript",
    "typescript"
  ],
  "otakLsp.debounceDelay": 300,
  "otakLsp.advanced.enableStyleConsistency": true,
  "otakLsp.advanced.enableRaNukiDetection": true,
  "otakLsp.advanced.enableParticleRepetition": true,
  "otakLsp.advanced.enableTermNotation": true,
  "otakLsp.advanced.enableGenerativeAIDictionary": true,
  "otakLsp.advanced.enableAWSDictionary": true,
  "otakLsp.advanced.commaCountThreshold": 5,
  "otakLsp.official.enableBulletPunctuation": true,
  "otakLsp.official.excludeProperNounsFromJouyouKanji": true
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

## MCP連携（stdio）

MCPクライアントから診断を取得する場合は、stdioサーバーを起動します。
otak-mcp-lspはLSPサーバーを同梱しているため、VS Code拡張なしで単体起動できます。

### npmパッケージ版（公開済み）

```bash
npm install -g otak-mcp-lsp
otak-mcp-lsp
```

一時利用なら `npx -y otak-mcp-lsp` でも起動できます。

Claude CodeのMCP設定例:

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

### analyze ツール

入力例:

```json
{
  "name": "analyze",
  "arguments": {
    "text": "私はがが行きます。",
    "languageId": "markdown",
    "uri": "untitled:example"
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

## トラブルシューティング

### 文法チェックが動作しない

1. `enableGrammarCheck` が `true` になっているか確認
2. ファイルタイプが `targetLanguages` に含まれているか確認
3. 出力パネル（表示 > 出力 > otak-lsp）でエラーを確認

### セマンティックハイライトが表示されない

1. `otakLsp.enableSemanticHighlight` が `true` になっているか確認
2. VS Code の `editor.semanticHighlighting.enabled` が `true` になっているか確認（テーマによっては `configuredByTheme` だと無効になることがあります）
3. Markdown の ``` コードブロック内も既定でハイライト対象です。対象外にしたい場合は `otakLsp.markdown.analyzeCodeBlocks` を `false` にしてください（インラインコード（`...`）/ URL は仕様上ハイライト対象外です）
4. 出力パネル（表示 > 出力 > otak-lsp）や `otakLsp.showStatus` コマンドで言語サーバの状態を確認

### 特定のルールを無効にしたい

設定画面で対応するルールの設定を `false` に変更してください。
例: 技術用語チェックを無効にする場合は `otakLsp.advanced.enableTermNotation` を `false` に設定

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

Last updated: 2025-12-26
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

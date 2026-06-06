<!-- このファイルは scripts/generate-config-doc.ts による自動生成です。手動で編集しないでください。 -->
<!-- 再生成: npm run docs:config / 検査: npm run check:config -->

# 設定リファレンス

otak-lsp v1.0.21 の全設定項目（139件）の完全な一覧です。
真実源は `package.json` の `contributes.configuration` です。READMEには代表的な設定のみを掲載しています。

## Markdown

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.markdown.analyzeCodeBlocks` | boolean | `true` |  | Markdownのコードブロック（```）内も文法チェック/セマンティックハイライト対象にします（※一部の文脈依存ルールは本文のみ）。 |
| `otakLsp.markdown.analyzeTables` | boolean | `true` |  | Markdownのテーブル（\|...\|）内も文法チェック対象にします。 |

## ホバー（用語図鑑・Wikipedia）

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.hover.enableWikipedia` | boolean | `true` |  | ホバーにWikipediaサマリーを表示します（取得失敗時は表示しません）。 |
| `otakLsp.hover.enableGlossary` | boolean | `true` |  | ホバーに用語図鑑（オフライン）を表示します。Wikipediaサマリーの下に表示されます。 |
| `otakLsp.hover.enabledGlossaries` | string[] | `["it", "otakLspSettings", "backend", …（全48件）]` | 列挙: it / otakLspSettings / cloud / awsServices / azureServices / gcpServices / ociServices / iotEmbedded …（全48種） | ホバーで表示する用語図鑑のカテゴリ。 |
| `otakLsp.hover.enabledGlossaryGroups` | string[] | `["general", "webDevelopment", "designArchitecture", …（全15件）]` | 列挙: general / webDevelopment / designArchitecture / languagesFrameworks / packageManagersBuild / versionControl / databases / securityAuth …（全15種） | ホバーで有効にする用語図鑑のカテゴリグループ。グループ単位で一括ON/OFFが可能。 |

## 高度な文法ルール

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.advanced.enableStyleConsistency` | boolean | `true` |  | 文体の混在検出（敬体/常体）の有効/無効 |
| `otakLsp.advanced.enableRaNukiDetection` | boolean | `true` |  | ら抜き言葉検出の有効/無効 |
| `otakLsp.advanced.enableDoubleNegation` | boolean | `true` |  | 二重否定検出の有効/無効 |
| `otakLsp.advanced.enableParticleRepetition` | boolean | `true` |  | 同じ助詞の連続使用検出の有効/無効 |
| `otakLsp.advanced.enableConjunctionRepetition` | boolean | `true` |  | 同じ接続詞の連続使用検出の有効/無効 |
| `otakLsp.advanced.enableAdversativeGa` | boolean | `true` |  | 逆接「が」の連続使用検出の有効/無効 |
| `otakLsp.advanced.enableAlphabetWidth` | boolean | `true` |  | 全角/半角アルファベット混在検出の有効/無効 |
| `otakLsp.advanced.enableWeakExpression` | boolean | `true` |  | 弱い表現検出の有効/無効 |
| `otakLsp.advanced.enableCommaCount` | boolean | `true` |  | 読点数チェックの有効/無効 |
| `otakLsp.advanced.enableTermNotation` | boolean | `true` |  | 技術用語表記統一の有効/無効 |
| `otakLsp.advanced.customNotationRules` | object | `{}` |  | 技術用語表記統一（Term Notation）のカスタム辞書。キーが誤った表記、値が正しい表記（例: { "Nodejs": "Node.js" }）。 |
| `otakLsp.advanced.enableKanjiOpening` | boolean | `true` |  | 漢字開き検出の有効/無効 |
| `otakLsp.advanced.enableWebTechDictionary` | boolean | `true` |  | ウェブ技術用語辞典の有効/無効 |
| `otakLsp.advanced.enableGenerativeAIDictionary` | boolean | `true` |  | 生成AI関連用語辞典の有効/無効 |
| `otakLsp.advanced.enableAWSDictionary` | boolean | `true` |  | AWS関連用語辞典の有効/無効 |
| `otakLsp.advanced.enableAzureDictionary` | boolean | `true` |  | Azure関連用語辞典の有効/無効 |
| `otakLsp.advanced.enableOCIDictionary` | boolean | `true` |  | OCI関連用語辞典の有効/無効 |
| `otakLsp.advanced.commaCountThreshold` | number | `4` | 範囲: 1〜20 | 1文中の読点数の閾値（この値を超えると警告） |
| `otakLsp.advanced.weakExpressionLevel` | string | `normal` | 列挙: strict / normal / loose | 弱い表現の検出レベル（strict: 厳格、normal: 標準、loose: 緩め） |
| `otakLsp.advanced.enableRedundantExpression` | boolean | `true` |  | 冗長表現検出の有効/無効（「馬から落馬する」「一番最初」など） |
| `otakLsp.advanced.enableTautology` | boolean | `true` |  | 重複表現（同語反復）検出の有効/無効（「頭痛が痛い」「違和感を感じる」など） |
| `otakLsp.advanced.enableNoParticleChain` | boolean | `true` |  | 助詞「の」連続使用検出の有効/無効 |
| `otakLsp.advanced.enableMonotonousEnding` | boolean | `true` |  | 文末表現の単調さ検出の有効/無効 |
| `otakLsp.advanced.enableLongSentence` | boolean | `true` |  | 長すぎる文の検出の有効/無効 |
| `otakLsp.advanced.enableSahenVerb` | boolean | `true` |  | サ変動詞の誤用検出（「勉強をする」→「勉強する」など）の有効/無効 |
| `otakLsp.advanced.enableMissingSubject` | boolean | `true` |  | 主語の欠如検出の有効/無効 |
| `otakLsp.advanced.enableTwistedSentence` | boolean | `true` |  | ねじれ文の検出の有効/無効 |
| `otakLsp.advanced.enableHomophone` | boolean | `true` |  | 同音異義語の誤用検出の有効/無効 |
| `otakLsp.advanced.enableHonorificError` | boolean | `true` |  | 敬語の誤用検出の有効/無効 |
| `otakLsp.advanced.enableAdverbAgreement` | boolean | `true` |  | 副詞の呼応エラー検出の有効/無効 |
| `otakLsp.advanced.enableModifierPosition` | boolean | `true` |  | 修飾語の位置の問題検出の有効/無効 |
| `otakLsp.advanced.enableAmbiguousDemonstrative` | boolean | `true` |  | 曖昧な指示語の検出の有効/無効 |
| `otakLsp.advanced.enableAmbiguousTerm` | boolean | `true` |  | 曖昧語（早めに/だいたい/少人数など）の検出の有効/無効 |
| `otakLsp.advanced.enableBekiUsage` | boolean | `true` |  | 「べき」の表現（するべき/文末べき）チェックの有効/無効 |
| `otakLsp.advanced.enablePassiveOveruse` | boolean | `true` |  | 受身表現の多用検出の有効/無効 |
| `otakLsp.advanced.enableNounChain` | boolean | `true` |  | 名詞の連続使用検出の有効/無効 |
| `otakLsp.advanced.enableConjunctionMisuse` | boolean | `true` |  | 接続詞の誤用検出の有効/無効 |
| `otakLsp.advanced.enableOkuriganaVariant` | boolean | `true` |  | 送り仮名の揺れ（「表わす」→「表す」など）の検出の有効/無効 |
| `otakLsp.advanced.enableOrthographyVariant` | boolean | `true` |  | 表記ゆれ（「出来る」→「できる」など）の検出の有効/無効 |
| `otakLsp.advanced.enableNumberWidthMix` | boolean | `true` |  | 全角/半角数字の混在検出の有効/無効 |
| `otakLsp.advanced.enableKatakanaChouon` | boolean | `true` |  | カタカナ長音の揺れ（「サーバ」→「サーバー」など）の検出の有効/無効 |
| `otakLsp.advanced.enableHalfwidthKana` | boolean | `true` |  | 半角カナの検出の有効/無効 |
| `otakLsp.advanced.enableNumeralStyleMix` | boolean | `true` |  | 漢数字とアラビア数字の混在検出の有効/無効 |
| `otakLsp.advanced.enableSpaceAroundUnit` | boolean | `true` |  | 英字・数字・単位間のスペースの過不足検出の有効/無効 |
| `otakLsp.advanced.enableBracketQuoteMismatch` | boolean | `true` |  | 括弧・引用符の不一致検出の有効/無効 |
| `otakLsp.advanced.enableDateFormatVariant` | boolean | `true` |  | 日付表記の揺れの検出の有効/無効 |
| `otakLsp.advanced.enableDashTildeNormalization` | boolean | `true` |  | ダッシュ・チルダの不統一検出の有効/無効 |
| `otakLsp.advanced.enableNakaguroUsage` | boolean | `true` |  | 中黒の過不足（「・・」など）の検出の有効/無効 |
| `otakLsp.advanced.enableSymbolWidthMix` | boolean | `true` |  | 全角/半角記号の混在検出の有効/無効 |
| `otakLsp.advanced.noParticleChainThreshold` | number | `3` | 範囲: 2〜10 | 助詞「の」連続の閾値（この値以上で警告） |
| `otakLsp.advanced.monotonousEndingThreshold` | number | `3` | 範囲: 2〜10 | 文末表現の連続の閾値（この値以上で警告） |
| `otakLsp.advanced.longSentenceThreshold` | number | `120` | 範囲: 50〜500 | 長文と判定する文字数の閾値 |
| `otakLsp.advanced.nounChainThreshold` | number | `5` | 範囲: 2〜20 | 名詞の連続使用の閾値（この値以上で警告） |
| `otakLsp.advanced.passiveOveruseThreshold` | number | `3` | 範囲: 2〜10 | 受身表現の多用の閾値（この値以上で警告） |
| `otakLsp.advanced.enableSentenceEndingColon` | boolean | `true` |  | 文末コロン検出の有効/無効（日本語文の末尾に全角コロンが使用されている場合に警告） |
| `otakLsp.advanced.enablePunctuationStyleMix` | boolean | `true` |  | 句読点スタイル混在検出の有効/無効（、。と，．の混在を検出） |
| `otakLsp.advanced.enableQuotationStyleMix` | boolean | `true` |  | 引用符スタイル混在検出の有効/無効（「」と""と''の混在を検出） |
| `otakLsp.advanced.enableBulletStyleMix` | boolean | `true` |  | 箇条書き記号混在検出の有効/無効（・と-と*の混在を検出） |
| `otakLsp.advanced.enableEmphasisStyleMix` | boolean | `true` |  | 強調記号混在検出の有効/無効（**と__の混在を検出） |
| `otakLsp.advanced.enableEnglishCaseMix` | boolean | `true` |  | 英語表記大文字小文字混在検出の有効/無効（api/API/Apiなどの混在を検出） |
| `otakLsp.advanced.enableUnitNotationMix` | boolean | `true` |  | 単位表記混在検出の有効/無効（km/hとキロメートルの混在を検出） |
| `otakLsp.advanced.enablePronounMix` | boolean | `true` |  | 人称代名詞混在検出の有効/無効（私/僕/自分/当方の混在を検出） |
| `otakLsp.advanced.enableHeadingLevelSkip` | boolean | `true` |  | 見出しレベル飛び検出の有効/無効（h1の次にh3などの飛びを検出） |
| `otakLsp.advanced.enableTableColumnMismatch` | boolean | `true` |  | テーブル列数不一致検出の有効/無効（Markdownテーブルの列数不一致を検出） |
| `otakLsp.advanced.enableCodeBlockLanguage` | boolean | `true` |  | コードブロック言語指定欠落検出の有効/無効（言語指定のないコードブロックを検出） |

## パフォーマンス（段階実行・並列実行）

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.advanced.tieredExecution.enabled` | boolean | `true` |  | 段階実行の有効/無効。有効にすると入力中は軽量ルールのみ実行し、アイドル/保存時に全ルールを実行します。 |
| `otakLsp.advanced.tieredExecution.idleDelayMs` | number | `1200` | 範囲: 500〜10000 | アイドル判定までの遅延時間（ミリ秒）。編集停止からこの時間経過後に全ルールを実行します。 |
| `otakLsp.advanced.parallelExecution.enabled` | boolean | `false` |  | 並列実行の有効/無効。worker_threads を使って高度ルールを物理コア数までスケールします。大規模な文書での解析を高速化しますが、メモリ使用量が増加します。 |
| `otakLsp.advanced.parallelExecution.maxWorkers` | number | `0` | 範囲: 0〜16 | 並列実行で起動する worker 数の上限。0 を指定すると CPU コア数 - 1 が自動採用されます。 |

## 公文書対応

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.official.enableOyobiNarabini` | boolean | `true` |  | 公文書ルール：「及び/並びに」使い分けチェックの有効/無効（公用文作成の考え方に基づく） |
| `otakLsp.official.enableMatawaWakushikuwa` | boolean | `true` |  | 公文書ルール：「又は/若しくは」使い分けチェックの有効/無効（公用文作成の考え方に基づく） |
| `otakLsp.official.enableJouyouKanji` | boolean | `true` |  | 公文書ルール：常用漢字外検出の有効/無効（常用漢字表に基づく） |
| `otakLsp.official.excludeProperNounsFromJouyouKanji` | boolean | `true` |  | 公文書ルール：常用漢字外検出で固有名詞（人名・地名・組織名）を除外する |
| `otakLsp.official.enableBulletPunctuation` | boolean | `true` |  | 公文書ルール：箇条書き句点運用チェックの有効/無効（名詞句は句点なし、文は句点あり） |

## 校正設定

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.proofreading.preset` | string | `custom` | 列挙: video-default / custom | 校正設定のプリセット。video-default: 動画のチェック状態を一括適用、custom: カスタム設定 |
| `otakLsp.proofreading.mergeMode` | string | `override` | 列挙: override / merge | advanced設定との統合方式。override: 校正設定を優先、merge: ORで統合 |
| `otakLsp.proofreading.typo.enable` | boolean | `true` |  | 誤字チェックカテゴリの有効/無効 |
| `otakLsp.proofreading.typo.checkInBrackets` | boolean | `true` |  | 括弧内もチェックする |
| `otakLsp.proofreading.typo.raNuki` | boolean | `true` |  | ら抜き表現の検出 |
| `otakLsp.proofreading.typo.saIre` | boolean | `true` |  | さ入れ表現の検出 |
| `otakLsp.proofreading.typo.doubleHonorific` | boolean | `true` |  | 二重敬語の検出 |
| `otakLsp.proofreading.typo.adverbAgreement` | boolean | `true` |  | 呼応表現（副詞呼応）の検出 |
| `otakLsp.proofreading.typo.eraFirstYear` | boolean | `true` |  | 和暦の初年を「元年」に統一するオプション |
| `otakLsp.proofreading.termBase.enable` | boolean | `true` |  | 用語基準カテゴリの有効/無効 |
| `otakLsp.proofreading.termBase.okuriganaMode` | string | `public-text` | 列挙: public-text / public-text-honkoku / custom | 送り仮名チェックモード。public-text: 公用文（解説・広報）、public-text-honkoku: 公用文（本則） |
| `otakLsp.proofreading.termBase.jouyouKanji` | boolean | `true` |  | 常用漢字チェックの有効/無効 |
| `otakLsp.proofreading.termBase.oldKanji` | boolean | `true` |  | 旧字体検出の有効/無効 |
| `otakLsp.proofreading.termBase.kanjiOpening` | boolean | `true` |  | 難しい語の言い換え（漢字開き）の有効/無効 |
| `otakLsp.proofreading.termBase.excludeProperNouns` | boolean | `true` |  | 固有名詞を常用漢字チェックから除外 |
| `otakLsp.proofreading.termJournalist.enable` | boolean | `false` |  | 用語基準（記者ハンドブック）カテゴリの有効/無効 |
| `otakLsp.proofreading.termJournalist.journalistHandbook` | boolean | `false` |  | 記者ハンドブック準拠チェック |
| `otakLsp.proofreading.expression.enable` | boolean | `true` |  | 表現洗練カテゴリの有効/無効 |
| `otakLsp.proofreading.expression.styleConsistency` | boolean | `true` |  | 文体の統一チェック |
| `otakLsp.proofreading.expression.redundant` | boolean | `true` |  | 冗長な表現（重ね言葉）の検出 |
| `otakLsp.proofreading.expression.particleRepetition` | boolean | `true` |  | 同一助詞の連続の検出 |
| `otakLsp.proofreading.expression.doubleNegation` | boolean | `true` |  | 二重否定の検出 |
| `otakLsp.proofreading.expression.twistedSentence` | boolean | `true` |  | 回りくどい表現の検出 |
| `otakLsp.proofreading.charType.enable` | boolean | `true` |  | 字種統一カテゴリの有効/無効 |
| `otakLsp.proofreading.charType.preferredNumeral` | string | `half` | 列挙: full / half / mix | 数字の優先表記（全角/半角/混在） |
| `otakLsp.proofreading.charType.preferredAlphabet` | string | `half` | 列挙: full / half | アルファベットの優先表記（全角/半角） |
| `otakLsp.proofreading.length.enable` | boolean | `true` |  | 長さチェックカテゴリの有効/無効 |
| `otakLsp.proofreading.length.sentence` | number | `120` | 範囲: 1〜999 | 文の長さの閾値（文字数） |
| `otakLsp.proofreading.length.comma` | number | `4` | 範囲: 1〜999 | 句読点の閾値（1文中の読点数） |
| `otakLsp.proofreading.length.hiragana` | number | `18` | 範囲: 1〜999 | ひらがな連続の閾値（文字数） |
| `otakLsp.proofreading.length.katakana` | number | `18` | 範囲: 1〜999 | カタカナ連続の閾値（文字数） |
| `otakLsp.proofreading.length.kanji` | number | `10` | 範囲: 1〜999 | 漢字連続の閾値（文字数） |
| `otakLsp.proofreading.envDependent.enable` | boolean | `true` |  | 環境依存文字カテゴリの有効/無効 |
| `otakLsp.proofreading.envDependent.mode` | string | `all` | 列挙: all / partial | 機種依存文字の検出モード。all: すべて指摘、partial: 一部のみ指摘 |
| `otakLsp.proofreading.punctuation.enable` | boolean | `true` |  | 約物チェックカテゴリの有効/無効 |
| `otakLsp.proofreading.punctuation.evenLeader` | boolean | `true` |  | 二点リーダは偶数個を要求 |
| `otakLsp.proofreading.punctuation.evenDash` | boolean | `true` |  | ダッシュは偶数個を要求 |
| `otakLsp.proofreading.punctuation.evenWave` | boolean | `true` |  | 波線は偶数個を要求 |
| `otakLsp.proofreading.punctuation.spaceAfterQE` | boolean | `true` |  | 疑問符/感嘆符後の空白チェック |
| `otakLsp.proofreading.punctuation.periodBeforeCloseBracket` | boolean | `true` |  | 括弧内が文のときに句点を付けるチェック |
| `otakLsp.proofreading.spell.enable` | boolean | `false` |  | スペルチェックカテゴリの有効/無効 |
| `otakLsp.proofreading.notationVariant.enable` | boolean | `true` |  | 表記ゆれカテゴリの有効/無効 |
| `otakLsp.proofreading.notationVariant.katakanaOnly` | boolean | `false` |  | カタカナ語のみをチェック |
| `otakLsp.proofreading.bracket.enable` | boolean | `true` |  | 括弧カテゴリの有効/無効 |
| `otakLsp.proofreading.bracket.checkPairing` | boolean | `true` |  | 括弧の対応チェック |
| `otakLsp.proofreading.bracket.maxDepth` | number | `3` | 範囲: 1〜10 | 括弧階層の深さの閾値 |
| `otakLsp.proofreading.quoteLine.enable` | boolean | `true` |  | 引用行の除外を有効にする |
| `otakLsp.proofreading.quoteLine.markers` | string | `>,\|` |  | 引用行とみなす記号（半角カンマ区切り） |
| `otakLsp.proofreading.dictionaries.rule` | string[] | `[]` | 最大3件 | ルール辞書のファイルパス（最大3つ） |
| `otakLsp.proofreading.dictionaries.proofreading` | string[] | `[]` | 最大5件 | 校正用辞書の拡張辞書パス（最大5つ） |
| `otakLsp.proofreading.dictionaries.spell` | string[] | `[]` | 最大3件 | スペルチェック用辞書のパス（最大3つ） |
| `otakLsp.proofreading.description` | string | `""` |  | 校正設定の詳細説明 |

## 基本設定

| 設定キー | 型 | 既定値 | 制約 | 説明 |
|---|---|---|---|---|
| `otakLsp.enableGrammarCheck` | boolean | `true` |  | 文法チェック機能の有効/無効。二重助詞、助詞連続、動詞-助詞不整合を検出します。 |
| `otakLsp.enableSemanticHighlight` | boolean | `true` |  | 品詞ベースのセマンティックハイライト機能の有効/無効 |
| `otakLsp.excludeTableDelimiters` | boolean | `true` |  | Markdownテーブル内のセマンティックハイライトを有効にします。falseにすると従来通りテーブル全体をハイライト対象外にします。 |
| `otakLsp.targetLanguages` | string[] | `["markdown", "javascript", "typescript", …（全9件）]` | 列挙: markdown / javascript / typescript / python / c / cpp / java / rust …（全9種） | 解析対象のファイルタイプ。プログラミング言語ではコメント内の日本語を解析します。 |
| `otakLsp.debounceDelay` | number | `250` | 範囲: 100〜5000 | テキスト編集後に解析を開始するまでの遅延時間（ミリ秒） |
| `otakLsp.enableProfileLogs` | boolean | `false` |  | 解析パイプラインの計測ログを出力します（開発者向け）。 |
| `otakLsp.sentenceSplitMode` | string | `normal` | 列挙: strict / normal / loose | 文分割モード。strict: 改行を常に文の区切りとして扱う、normal: 文脈を考慮して判断（推奨）、loose: 段落区切り（空行）のみを文の区切りとして扱う |


<!-- このファイルは scripts/generate-rules-doc.ts による自動生成です。手動で編集しないでください。 -->
<!-- 再生成: npm run docs:rules / 検査: npm run check:rules -->

# ルールリファレンス

otak-lsp v1.0.21 に同梱される文法・文体・表記ルールの一覧です。
真実源は `server/src/grammar/advancedRuleRegistry.ts`（高度ルール）と `server/src/grammar/checker.ts`（基本ルール）です。

| 種別 | 件数 |
|---|---|
| 基本ルール | 4 |
| 高度ルール（うち公文書 4） | 57 |
| 合計 | 61 |

> このほかに校正設定（`otakLsp.proofreading.*`）のチェック群があります。検出カテゴリの実測一覧は README の「Detection Coverage」（evalsから自動生成）を参照してください。

## 基本ルール

`server/src/grammar/checker.ts`（レガシーな基本チェッカ）。

| ルールID | 診断コード | 説明 |
|---|---|---|
| `double-particle` | `double-particle` | 二重助詞（「がが」「をを」など同じ助詞の連続）を検出 |
| `particle-sequence` | `particle-sequence` | 不適切な助詞連続（「がを」など）を検出 |
| `verb-particle-mismatch` | `verb-particle-mismatch` | 自動詞に「を」を使う動詞-助詞不整合を検出 |
| `redundant-copula` | `particle-sequence` | 冗長な助動詞（「でです」「にです」など）を検出（診断コードは particle-sequence を共有） |

## 高度ルール

| ルールID | 説明 | 設定キー | 軽量 |
|---|---|---|---|
| `style-consistency` | 文体の混在（敬体/常体）を検出します | `otakLsp.advanced.enableStyleConsistency` |  |
| `ra-nuki-detection` | ら抜き言葉を検出します | `otakLsp.advanced.enableRaNukiDetection` |  |
| `double-negation` | 二重否定を検出します | `otakLsp.advanced.enableDoubleNegation` |  |
| `particle-repetition` | 同じ助詞の連続使用を検出します | `otakLsp.advanced.enableParticleRepetition` |  |
| `conjunction-repetition` | 同じ接続詞の連続使用を検出します | `otakLsp.advanced.enableConjunctionRepetition` |  |
| `adversative-ga` | 逆接の「が」の連続使用を検出します | `otakLsp.advanced.enableAdversativeGa` |  |
| `alphabet-width` | 全角と半角アルファベットの混在を検出します | `otakLsp.advanced.enableAlphabetWidth` | ✓ |
| `weak-expression` | 弱い日本語表現を検出します | `otakLsp.advanced.enableWeakExpression` |  |
| `comma-count` | 1文中の読点の数をチェックします | `otakLsp.advanced.enableCommaCount` |  |
| `term-notation` | 技術用語の表記を統一します | `otakLsp.advanced.enableTermNotation` |  |
| `kanji-opening` | 漢字の開き方を統一します | `otakLsp.advanced.enableKanjiOpening` |  |
| `redundant-expression` | 冗長表現を検出します | `otakLsp.advanced.enableRedundantExpression` |  |
| `tautology` | 重複表現（同語反復）を検出します | `otakLsp.advanced.enableTautology` |  |
| `no-particle-chain` | 助詞「の」の連続使用を検出します | `otakLsp.advanced.enableNoParticleChain` |  |
| `monotonous-ending` | 文末表現の単調さを検出します | `otakLsp.advanced.enableMonotonousEnding` |  |
| `long-sentence` | 長すぎる文を検出します | `otakLsp.advanced.enableLongSentence` |  |
| `sahen-verb` | サ変動詞の「〜をする」パターンを検出します | `otakLsp.advanced.enableSahenVerb` |  |
| `missing-subject` | 主語が欠如している文を検出します | `otakLsp.advanced.enableMissingSubject` |  |
| `twisted-sentence` | ねじれ文（主語と述語の不対応）を検出します | `otakLsp.advanced.enableTwistedSentence` |  |
| `homophone` | 同音異義語の誤用を検出します | `otakLsp.advanced.enableHomophone` |  |
| `honorific-error` | 敬語の誤用（二重敬語など）を検出します | `otakLsp.advanced.enableHonorificError` |  |
| `adverb-agreement` | 副詞と述語の呼応の誤りを検出します | `otakLsp.advanced.enableAdverbAgreement` |  |
| `modifier-position` | 修飾語の位置による曖昧さを検出します | `otakLsp.advanced.enableModifierPosition` |  |
| `ambiguous-demonstrative` | 曖昧な指示語の使用を検出します | `otakLsp.advanced.enableAmbiguousDemonstrative` |  |
| `passive-overuse` | 受身表現の多用を検出します | `otakLsp.advanced.enablePassiveOveruse` |  |
| `noun-chain` | 名詞の連続による読みにくさを検出します | `otakLsp.advanced.enableNounChain` |  |
| `conjunction-misuse` | 接続詞の誤用を検出します | `otakLsp.advanced.enableConjunctionMisuse` |  |
| `ambiguous-term` | 曖昧な表現を検出します | `otakLsp.advanced.enableAmbiguousTerm` | ✓ |
| `beki-usage` | 「べき」の表現を整える | `otakLsp.advanced.enableBekiUsage` | ✓ |
| `okurigana-variant` | 送り仮名の揺れを検出し、標準形を提案します | `otakLsp.advanced.enableOkuriganaVariant` | ✓ |
| `orthography-variant` | 表記ゆれを検出し、統一された表記を提案します | `otakLsp.advanced.enableOrthographyVariant` | ✓ |
| `number-width-mix` | 全角半角数字の混在を検出し、統一を提案します | `otakLsp.advanced.enableNumberWidthMix` | ✓ |
| `katakana-chouon` | カタカナ長音の欠落・過剰を検出し、標準形を提案します | `otakLsp.advanced.enableKatakanaChouon` | ✓ |
| `halfwidth-kana` | 半角カナを検出し、全角カナへの変換を提案します | `otakLsp.advanced.enableHalfwidthKana` | ✓ |
| `numeral-style-mix` | 漢数字とアラビア数字の混在を検出し、統一を提案します | `otakLsp.advanced.enableNumeralStyleMix` | ✓ |
| `space-around-unit` | 英字・数字・単位間のスペースの過不足を検出します | `otakLsp.advanced.enableSpaceAroundUnit` | ✓ |
| `bracket-quote-mismatch` | 括弧・引用符の不一致を検出し、正しい対応を提案します | `otakLsp.advanced.enableBracketQuoteMismatch` | ✓ |
| `date-format-variant` | 日付表記の揺れを検出し、統一を提案します | `otakLsp.advanced.enableDateFormatVariant` | ✓ |
| `dash-tilde-normalization` | ダッシュ・チルダの不統一を検出し、統一を提案します | `otakLsp.advanced.enableDashTildeNormalization` | ✓ |
| `nakaguro-usage` | 中黒の過不足を検出し、適切な使用を提案します | `otakLsp.advanced.enableNakaguroUsage` | ✓ |
| `symbol-width-mix` | 全角半角記号の混在を検出し、統一を提案します | `otakLsp.advanced.enableSymbolWidthMix` | ✓ |
| `sentence-ending-colon` | 文末のコロン（：）をチェックします | `otakLsp.advanced.enableSentenceEndingColon` | ✓ |
| `punctuation-style-mix` | 句読点スタイルの混在（、。と，．）を検出します | `otakLsp.advanced.enablePunctuationStyleMix` | ✓ |
| `quotation-style-mix` | 引用符スタイルの混在（「」と""と''）を検出します | `otakLsp.advanced.enableQuotationStyleMix` | ✓ |
| `bullet-style-mix` | 箇条書き記号の混在（・と-と*）を検出します | `otakLsp.advanced.enableBulletStyleMix` | ✓ |
| `emphasis-style-mix` | 強調記号スタイルの混在（**と__）を検出します | `otakLsp.advanced.enableEmphasisStyleMix` | ✓ |
| `english-case-mix` | 英語表記の大文字小文字混在を検出します | `otakLsp.advanced.enableEnglishCaseMix` |  |
| `unit-notation-mix` | 単位表記の混在（記号とカタカナ）を検出します | `otakLsp.advanced.enableUnitNotationMix` |  |
| `pronoun-mix` | 人称代名詞の混在（私/僕/自分/当方）を検出します | `otakLsp.advanced.enablePronounMix` |  |
| `heading-level-skip` | 見出しレベルの飛び（h1の次にh3など）を検出します | `otakLsp.advanced.enableHeadingLevelSkip` |  |
| `table-column-mismatch` | Markdownテーブルの列数不一致を検出します | `otakLsp.advanced.enableTableColumnMismatch` |  |
| `code-block-language` | コードブロックの言語指定欠落を検出します | `otakLsp.advanced.enableCodeBlockLanguage` |  |
| `sentence-complexity` | 文単位の複雑度を計測し、複雑すぎる文を検出します | `enableSentenceComplexity` |  |

## 公文書ルール

| ルールID | 説明 | 設定キー | 軽量 |
|---|---|---|---|
| `oyobi-narabini` | 「及び」「並びに」の使い分けをチェックします | `otakLsp.official.enableOyobiNarabini` |  |
| `matawa-wakushikuwa` | 「又は」「若しくは」の使い分けをチェックします | `otakLsp.official.enableMatawaWakushikuwa` |  |
| `jouyou-kanji` | 常用漢字表にない漢字を検出します | `otakLsp.official.enableJouyouKanji` |  |
| `bullet-punctuation` | 箇条書き項目の句点運用をチェックします | `otakLsp.official.enableBulletPunctuation` |  |


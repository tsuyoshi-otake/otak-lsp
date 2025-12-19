# issue01: README.md Problems 再確認

## 対象
- README.md の Problems 出力（提示リスト）を再確認
- ルールコードごとに誤検知/未検出を整理

## ルール別チェック
| ルールコード | 誤検知 (代表) | 未検出 | 補足 |
| --- | --- | --- | --- |
| english-case-mix | README.md:1 (otak-lsp/LSP), README.md:365 (.vsix/VSIX), README.md:446 (language ID) | なし | 誤表記例の表/識別子/拡張子を除外したい |
| noun-chain | README.md:3 (複合名詞), README.md:514 (機能説明), README.md:599 (日付表記) | なし | 複合語・日付の誤検知 |
| missing-subject | README.md:3, README.md:310 | なし | 説明文・短文で過検知 |
| symbol-width-mix | README.md:15 | なし | コード/URLの半角記号混在で誤検知疑い |
| sentence-ending-colon | なし | なし |  |
| double-particle | なし | なし |  |
| particle-sequence | なし | なし |  |
| verb-particle-mismatch | なし | なし |  |
| style-inconsistency | なし | なし |  |
| ra-nuki | なし | なし |  |
| bracket-quote-mismatch | README.md:41 (`->`), README.md:73 (`->`), README.md:362 (`"`), README.md:508 (括弧内 `>`), README.md:473 (`<-`) | なし | 矢印/コード/引用符を括弧扱い |
| long-sentence | なし | なし |  |
| particle-repetition | なし | README.md:567 (EVALS表の例文「私は本を彼は読む」) | 表セル内が解析対象外の可能性 |
| no-particle-chain | README.md:46 (非連続の「の」を連続扱い) | なし | 連続判定の条件見直し |
| double-negation | なし | なし |  |
| conjunction-repetition | なし | なし |  |
| comma-count | なし | なし |  |
| adversative-ga | なし | なし |  |
| alphabet-width | なし | なし |  |
| weak-expression | なし | なし |  |
| orthography-variant | README.md:111 (食事), README.md:250 (多様化), README.md:524 (起動時), README.md:588 (住所), README.md:602 (時間/場所) | なし | 複合語中の漢字を誤判定 |
| term-notation | README.md:446, README.md:447 (language ID), README.md:621 (パッケージ名), README.md:123 (誤表記例の表) | なし | コード/辞書表の誤検知 |
| kanji-opening | なし | なし |  |
| okurigana-variant | README.md:605 (メッセージが同一表記) | なし | 文言/辞書の不整合疑い |
| redundant-expression | なし | なし |  |
| tautology | なし | なし |  |
| katakana-chouon | README.md:308, README.md:317, README.md:318, README.md:331, README.md:340 | なし | 表記方針次第で誤検知扱い |
| quotation-style-mix | README.md:362, README.md:370, README.md:423, README.md:439 | なし | UIラベル/JSON/コードの引用符 |
| number-width-mix | なし | なし |  |
| halfwidth-kana | なし | なし |  |
| numeral-style-mix | なし | なし |  |
| space-around-unit | なし | なし |  |
| unit-notation-mix | なし | なし |  |
| date-format-variant | なし | なし |  |
| dash-tilde-normalization | なし | なし |  |
| nakaguro-usage | なし | なし |  |
| punctuation-style-mix | なし | なし |  |
| bullet-style-mix | なし | なし |  |
| emphasis-style-mix | なし | なし |  |
| pronoun-mix | なし | なし |  |
| heading-level-skip | なし | なし |  |
| table-column-mismatch | なし | なし |  |
| code-block-language | なし | なし |  |
| honorific-error | なし | なし |  |
| adverb-agreement | なし | なし |  |
| sahen-verb | なし | なし |  |
| twisted-sentence | なし | なし |  |
| passive-overuse | なし | なし |  |
| modifier-position | なし | なし |  |
| conjunction-misuse | なし | なし |  |
| homophone | なし | なし |  |
| monotonous-ending | なし | なし |  |

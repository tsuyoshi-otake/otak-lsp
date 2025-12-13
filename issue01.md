# Issue01: Markdown全般の見直しで見つかった問題点

## 概要
Markdown 解析（除外・文法チェック・セマンティックハイライト）において、CommonMark/GFM の主要な書式を「ある程度」カバーしている一方で、いくつかの記法で除外が効かず、誤検出やノイズ（本来コード/構造として扱うべき部分が解析対象になる）が起きうる。

## 対応状況（2025-12-13）
- [x] A. 引用（`>`）内の Markdown 構造を `MarkdownFilter` が扱えない
  - `server/src/parser/markdownFilter.ts` で blockquote プレフィックスを考慮して `code-block` / `table` / `heading` / `list-marker` を検出するよう修正
- [x] B. インデントが深い fenced code block が除外されない
  - `server/src/parser/markdownFilter.ts` のフェンス検出を深いインデントでも扱えるよう修正
- [x] C. 複数バッククォートの code span（``like this``）を正しく扱えない可能性
  - `server/src/parser/markdownFilter.ts` のインラインコード検出を複数バッククォートに対応
- [x] D. テーブル検出ロジックの不一致（Filter とルール側で判定が違う）
  - `shared/src/markdownSyntax.ts` に table / blockquote の共通判定を集約し、`MarkdownFilter` と `TableColumnMismatchRule` で共有
  - 末尾 `|` 省略（`| A` / `|---` など）や blockquote（`>`）を含む行も同一ロジックで扱う
- [x] E. URL/リンク除外の取りこぼしが起きやすい
  - `server/src/parser/markdownFilter.ts` の URL 検出を見直し、括弧を含む URL や Markdown リンク（`[text](...)`）の取りこぼしを低減
  - プレーンURLの末尾句読点（`.`/`。` 等）をトリムして過剰除外を抑制
- [x] F. Markdown構造ルール側でも「引用/インデント」を前提にしていない箇所がある
  - `server/src/grammar/rules/bulletStyleMixRule.ts` を blockquote に対応（`> -` / `> ・` なども検出対象に含める）
  - 既存対応（`codeBlockLanguageRule` / `headingLevelSkipRule` / `tableColumnMismatchRule`）と合わせて、主要な Markdown 構造系ルールで blockquote/indent を扱える状態にした

## 影響（ユーザー体験）
- 引用（`>`）内のコードブロック/テーブル/見出し/箇条書きが除外されず、本文と同じ扱いで文法警告・ハイライトが出る可能性がある
- ネスト（リスト配下など）でインデントが深い fenced code block が除外されず、コード内の日本語が文法チェック対象になる可能性がある
- インラインコード（code span）で複数バッククォートを使うケースで部分一致の誤除外が起きうる
- テーブル検出ロジックが箇所によって異なり、ある処理ではテーブルとして扱われるのに別の処理では扱われない、が起きうる

## 再現例（抜粋）
### 1) 引用内 fenced code block が除外されない
```md
> ```js
> const x = 1;
> ```
```
- 期待: 引用内でも fenced code block は `code-block` として除外される
- 修正前: `MarkdownFilter.filter()` の `excludedRanges` が空になり得る（引用 `>` があると行頭フェンス扱いにならないため）
- 修正後: 引用内でも fenced code block が `code-block` として検出される

### 2) 引用内テーブルが除外されない
```md
> | A | B |
> |---|---|
> | 1 | 2 |
```
- 期待: 引用内でもテーブルとして検出され、文法チェックでは対象外にできる
- 修正前: `MarkdownFilter.findTables()` の判定が `|...|` 行頭前提のため、引用 `>` があると検出されない
- 修正後: 引用内テーブルも `table` として検出される

## 問題点と問題箇所
### A. 引用（`>`）内の Markdown 構造を `MarkdownFilter` が扱えない
- 修正前の根本: 行頭が `>` のときに blockquote プレフィックスを剥がした上で構造判定する処理がない
- 影響: 引用内 fenced code block / テーブル / 見出し / リストマーカーが `excludedRanges` に入らない
- 関連箇所（修正後）
  - `server/src/parser/markdownFilter.ts` の `stripBlockquotePrefix()` / `findCodeBlocks()` / `findTables()` / `findHeadings()` / `findListMarkers()`

### B. インデントが深い fenced code block が除外されない
- 修正前の根本: フェンス開始の許容インデントが `0〜3` スペースに固定
- 影響: リスト配下などで 4 以上インデントされた fenced code block が本文扱いになる可能性
- 関連箇所（修正後）
  - `server/src/parser/markdownFilter.ts` の `findCodeBlocks()`

### C. 複数バッククォートの code span（``like this``）を正しく扱えない可能性
- 修正前の根本: インラインコード検出が「1バッククォート」固定で、複数バッククォートの範囲を表現できない
- 影響: ``code spans`` を部分一致で誤除外し、残りが解析対象として残る可能性
- 関連箇所（修正後）
  - `server/src/parser/markdownFilter.ts` の `findInlineCode()`

### D. テーブル検出ロジックの不一致（Filter とルール側で判定が違う）
- 修正前の根本: `MarkdownFilter` は `|...|` 形式を強く前提にする一方、列数不一致ルールは `startsWith('|')` を前提にしている
- 影響: 「テーブル除外されないのに列数不一致だけ出る」などの不整合が起きうる
- 関連箇所（修正後）
  - `server/src/parser/markdownFilter.ts` の `findTables()`
  - `server/src/grammar/rules/tableColumnMismatchRule.ts` の `findTables()`

### E. URL/リンク除外の取りこぼしが起きやすい
- 根本: 正規表現ベースで、括弧を含む URL など一般的なケースを完全にはカバーできない
- 影響: URL の一部が解析対象として残る可能性
- 関連箇所
  - `server/src/parser/markdownFilter.ts:227` `plainUrlPattern`
  - `server/src/parser/markdownFilter.ts:243` `mdLinkPattern`
  - `server/src/parser/markdownFilter.ts:259` `autoLinkPattern`

### F. Markdown構造ルール側でも「引用/インデント」を前提にしていない箇所がある
- 影響: `MarkdownFilter` を拡張しても、ルール側が引用/インデントに追従しないと検出が欠ける可能性
- 関連箇所（修正後）
  - `server/src/grammar/rules/codeBlockLanguageRule.ts` / `server/src/grammar/rules/headingLevelSkipRule.ts` / `server/src/grammar/rules/tableColumnMismatchRule.ts`

## 次アクション案（残）
- （必要に応じて）Markdown構造系ルールの追加追従

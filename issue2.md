# Issue 2: Markdown 文分割/高度文法チェックの基本設計見直し案

## 背景

Issue1 では `SentenceParser` に Markdown 構造を考慮した強制分割（見出し/表/コードブロック/太字単独行/コロン行など）を追加し、README の「読点数誤検出」をある程度抑制できました。  
ただし、現在の改善は **除外範囲 `excludedRanges` に対する場当たり的なヒューリスティック追加**であり、設計上の根本課題が残っています。

## 現状整理（Issue1 後）

### 処理フロー
1. `MarkdownFilter.filter(text)`  
   - コードブロック/表/URL 等を **スペース置換**して `filteredText` を生成（長さ維持）
   - `excludedRanges` を返す
2. `MeCabAnalyzer.analyze(filteredText)` → `tokens`
3. `TokenFilter.filterTokens(tokens, excludedRanges)`  
   - 除外範囲に重なるトークンを除去
4. `AdvancedRulesManager.checkText(filteredText, tokens, excludedRanges)`  
   - `SentenceParser.parseSentences(filteredText, tokens, excludedRanges)` を実行
   - `sentences` を各高度ルールへ渡す

### Issue1 で追加した分割条件
- `heading` / `table` / `code-block` 範囲の前後で強制区切り
- `**...**` のみの単独行を独立文として扱う
- `:` / `：` で終わる行の後で区切り

## 残る課題

1. **Markdown 構造認識が `SentenceParser` に漏れている**  
   - 本来は Markdown ブロック境界（見出し・リスト・引用・水平線など）で「文の連結禁止」を決めたいが、  
     いまは `excludedRanges` と個別の正規表現で後付けしている。
2. **リスト/引用など “非空行の改行境界” が未対応**  
   - 例:  
     ```
     - A
     - B
     ```
     句点も空行もないため 1 文に結合され得る。  
     読点数/長文/文体混在など “文単位のルール” で誤検出を誘発する。
3. **`filteredText` 依存の限界**  
   - スペース置換により **構造マーカーの実体が失われる**ため、  
     文分割や文脈ルールが「本来の Markdown ブロック」を正しく復元できない。
4. **SentenceParser の責務肥大**  
   - 言語非依存の文分割（句点/空行）と Markdown 固有のブロック判定が混在し、拡張・保守コストが上がる。
5. **性能面の伸びしろ**  
   - `getTokensInRange` が文ごとに `filter` するため O(tokens × sentences) になり、長文で無駄が出る。

## 基本設計の見直し方針

### 目標
- Markdown 文書で **ブロック境界を跨いだ文結合をゼロに近づける**
- 既存前提（スペース置換で位置保持）を壊さない
- 高度ルールが「文＝自然言語のまとまり」を前提にできるよう、`sentences` の意味を安定させる

### 設計の中心アイデア
**「Markdown のブロック境界検出」と「自然言語の文分割」を分離する。**

1. **Markdown ブロック境界検出（新モジュール）**
   - `filteredText` と `excludedRanges` から **文の連結禁止境界（block boundaries）** を計算する専用クラスを追加  
     例: `MarkdownBlockBoundaryDetector`
   - ここで扱う境界:
     - 見出し行（`#` 系）
     - リスト項目の開始/終了（`list-marker`）
     - 引用ブロック開始（`>`）
     - 水平線（`---`, `***`）
     - 表/コードブロックの前後（`table`, `code-block`）
     - 空行、コロン導入行、太字単独行 など既存条件もここへ集約

2. **自然言語の文分割（SentenceParser の純化）**
   - `SentenceParser` は
     - 句点/感嘆/疑問（`。！？!?`）
     - 段落区切り（空行）
     - **外部から渡された境界オフセット**
     のみで文を切るように整理
   - Markdown 固有の正規表現や範囲解釈を持たない。

3. **上位の統合コンテキスト化**
   - `MarkdownFilter.filter` の戻り値に以下を追加する案:
     ```ts
     interface MarkdownParseResult extends FilterResult {
       blockBoundaries: number[]; // filteredText 上の強制区切り位置
     }
     ```
   - `analyzeDocument` は Markdown 時に
     - `filterResult.blockBoundaries`
     - `filterResult.excludedRanges`
     を **一度だけ**計算し、Semantic/Grammar の両方へ渡す。

## 具体案（ブロック境界の定義）

### ブロック単位
Markdown を「自然言語のまとまり（block）」に分割し、block 内でのみ文分割する。

- **block を分ける条件**
  - 見出し行の前後
  - リスト項目の開始位置
  - 引用ブロック（`>` 連続部分）開始/終了
  - 表/コードブロックの前後
  - 水平線行
  - 空行
  - `:` / `：` で終わる導入行の後
  - `**...**` のみの単独行の前後

- **block 内の改行の扱い**
  - 「同一 block の単純改行」は空白相当として連結  
    （例: 長い説明が改行されているだけの段落）
  - これにより “行末に句点が無いだけで別文扱いになる” 過分割を防ぐ。

### Sentence の生成
1. block を抽出（start/end offset）
2. block 内テキストを SentenceParser で分割
3. sentence の start/end は **全文オフセット**で保持（位置マッピングは現状維持）

## 変更タスク案
1. `server/src/parser/markdownBlockBoundaryDetector.ts` を追加  
   - `filteredText` と `excludedRanges` を入力  
   - `blockBoundaries` または `blockRanges` を出力
2. `MarkdownFilter` の `FilterResult` 拡張 or 新結果型追加  
3. `SentenceParser` を boundary‑driven な純粋ロジックへ整理  
4. `AdvancedRulesManager` の入力を `MarkdownParseResult` へ寄せ、引数を簡素化  
5. テスト追加
   - boundary detector のユニットテスト
   - README 形式/リスト/引用/水平線/表を含む Markdown の E2E テスト

## 受け入れ基準
- Markdown 文書で
  - 見出し・表・リスト・引用を跨いだ文結合が発生しない
  - 「対象となる接続詞: ...」のような行が独立文として扱われ、読点数が正しく算出される
- 非 Markdown（plaintext/コードコメント）では従来の文分割挙動を維持
- 位置情報（diagnostics / semantic tokens）のズレが出ない


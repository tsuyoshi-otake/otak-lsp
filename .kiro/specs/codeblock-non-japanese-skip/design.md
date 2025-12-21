# 設計文書

## 概要

Markdownフィルタのコードブロック処理に、日本語有無判定を追加する。`analyzeCodeBlocks=true` の場合でも、日本語を含まないコードブロックは内容をスペース置換して解析対象から外す。これにより、コードブロックの文字量が多い文書でも形態素解析の負荷を削減する。

## 設計方針

- 既存の `MarkdownFilter` に判定ロジックを追加し、フィルタリング段階でスキップする
- 判定はコードブロックの本文（フェンス行を除く）に対して行う
- 改行とテキスト長を維持し、位置ずれを起こさない
- `analyzeCodeBlocks=false` の挙動は変更しない

## 追加ロジック

### 日本語判定関数

- 対象文字種: ひらがな・カタカナ・漢字・半角カナ
- 正規表現で短時間判定（`/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF65-\uFF9F]/`）
- 判定対象はコードブロック本文のみ

### コードブロック変換

`transformCodeBlockSegment` 内で以下を追加する。

- フェンス行（オープン/クローズ）は従来通り保持
- 本文に日本語が含まれる場合:
  - `preserveCodeBlockContent=true` なら既存挙動（本文保持）
  - `preserveCodeBlockContent=false` なら既存挙動（本文マスク）
- 本文に日本語が含まれない場合:
  - `preserveCodeBlockContent` に関係なく本文をマスク

## ログ/デバッグ

- 設計時点では追加ログは不要
- 必要であれば `MarkdownFilter` の `debugMode` でスキップ数を確認可能

## 影響範囲

- 変更対象: `server/src/parser/markdownFilter.ts`
- 既存テストの調整が必要な場合は最小限に留める

## テスト戦略

- 既存の `markdownFilter` 系テストにケース追加
  - 日本語なしコードブロックがマスクされる
  - 日本語ありコードブロックは `analyzeCodeBlocks=true` で保持される
- 既存の位置保持テストに影響がないことを確認

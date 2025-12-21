# 実装計画: 日本語を含まないコードブロックの解析スキップ

## 概要

Markdownコードブロック内に日本語が含まれない場合、`analyzeCodeBlocks=true` でも本文をスペース置換して解析対象から外す。

## タスク

- [x] 1. 日本語判定ユーティリティの追加
  - ひらがな/カタカナ/漢字/半角カナを判定する正規表現を用意
  - コードブロック本文の判定関数を実装

- [x] 2. Markdownフィルタのコードブロック処理を更新
  - `transformCodeBlockSegment` に日本語判定を追加
  - 日本語なしの場合は `preserveCodeBlockContent` に関係なく本文をマスク

- [x] 3. テスト追加
  - 日本語なしコードブロックは `analyzeCodeBlocks=true` でもマスクされる
  - 日本語ありコードブロックは `analyzeCodeBlocks=true` で保持される

- [x] 4. 動作確認
  - 既存のMarkdownフィルタテストが通ること

## 注意事項

- 改行と文字数は保持する
- 設定 `otakLsp.markdown.analyzeCodeBlocks` の既存挙動を崩さない

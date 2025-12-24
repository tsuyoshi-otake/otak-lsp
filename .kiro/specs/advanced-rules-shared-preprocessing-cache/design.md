# 設計文書

## 概要

高度文法ルールで重複して行われている前処理（コード範囲検出や行開始位置の計算など）を共有コンテキストとしてまとめ、1回の解析サイクルで再利用できるようにする。診断の正確性を維持しつつ、重複走査を削減する。

## 共有コンテキスト

### データ構造

`RuleContext` に任意の共有コンテキストを追加する。

- `RuleContext.shared?: AdvancedRuleSharedContext`
- `AdvancedRuleSharedContext` には以下を含める
  - `codeBlockRanges`: フェンスコードブロック範囲
  - `inlineCodeRanges`: インラインコード範囲
  - `codeRanges`: 上記の結合範囲
  - `lineStarts`: 行開始位置配列
  - `lines`: 行テキスト配列（必要なルールのみ利用）

※型安全のため `shared/src/advancedTypes.ts` に `AdvancedRuleSharedContext` を追加する。

## 生成タイミング

- `AdvancedRulesManager.checkText` 内で解析サイクルごとに共有コンテキストを構築する
- `buildRuleContextForRule` で `documentText` を差し替えるルールがあるため、必要に応じて `documentText` ごとの共有コンテキストを遅延生成できるようにする
- 共有コンテキストは解析サイクル内だけで保持し、文書間で再利用しない

## 参照方法

- 共有コンテキストは `context.shared` から参照する
- `context.shared` が未設定の場合は既存のロジックにフォールバックする
- 初期適用対象ルールの例:
  - `TermNotationRule`
  - `EnglishCaseMixRule`
  - `QuotationStyleMixRule`

## 実装方針

- `server/src/grammar/advancedRulesManager.ts` に共有コンテキスト生成を集約する
- `server/src/grammar/rules/*` で個別に走査しているコード範囲検出を `context.shared` から参照する
- ルールごとの既存挙動は維持し、共有コンテキストの導入は段階的に行う

## 正確性の維持

- 共有コンテキストは `documentText`（マスク後）に対して生成する
- `buildRuleContextForRule` で原文 `originalText` を使うルールは、そのテキストに対応した共有コンテキストを生成して渡す
- 診断の範囲・メッセージは現行と同じ結果になることを確認する

## テスト戦略

- 既存ルールのテストを流用し、診断内容の差異が無いことを確認する
- 共有コンテキストを利用するルールに対し、必要に応じて追加テストを作成する

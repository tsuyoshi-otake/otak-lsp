# 設計文書

## 概要

解析パイプラインの各ステップに計測ポイントを設け、処理時間と比率をログ出力する。計測はオプトインとし、無効時は追加コストを最小化する。ログは1回の解析につき1ブロックでまとめ、文書URIとバージョンを含める。

## 計測の有効化

- 環境変数 `OTAK_LCP_PROFILE=1` を有効化条件とする
- 既存の `OTAK_LCP_DEBUG=1` とは独立に制御する
- 計測が無効な場合は計測コードが実行されないように分岐する

## 計測対象ステップ

解析パイプライン（`analyzeDocument`）:

1. Markdownフィルタ（Markdownのみ）
2. 形態素解析（kuromoji）
3. トークンフィルタリング（セマンティック/文法）
4. 基本文法ルール評価（`GrammarChecker.check`）
5. 高度文法ルール評価（`AdvancedRulesManager.checkText`）
6. 診断反映とセマンティック更新通知
7. 解析全体

セマンティックトークン生成（`textDocument/semanticTokens/full`）:

- `SemanticTokenProvider.provideSemanticTokens` の処理時間
- キャッシュヒット時は計測をスキップし、ログにヒットを明記

## ログ形式

- 1回の解析につき1ブロックで出力
- 文書URIとバージョンを必須で含める
- 合計時間と各ステップの処理時間と比率（%）を出力
- 追加情報としてトークン数・診断数を含める

例:

```
[PROFILE] analyze uri=... version=12 total=123.4ms
  markdownFilter=5.1ms (4.1%)
  mecabAnalyze=60.2ms (48.8%)
  tokenFilter=8.4ms (6.8%)
  grammarBasic=12.1ms (9.8%) count=3
  grammarAdvanced=25.0ms (20.3%) count=5
  diagnostics=3.2ms (2.6%)
  tokens=1024
```

セマンティックトークン生成:

```
[PROFILE] semanticTokens uri=... tokens=1024 total=18.7ms cache=miss
```

## 実装方針

- `server/src/main.ts` に計測ユーティリティを追加する
- `analyzeDocument` の各主要ブロックの前後で `Date.now()` を使って経過時間を計測する
- 計測ログは `connection.console.log` で出力する
- 計測の有無で処理フローは変わらない（副作用なし）

## 例外と注意点

- 計測はミリ秒精度で十分とする
- 解析結果の破棄（stale判定）時は、ログに `stale=true` を含め、診断送信は行わない
- Markdown以外では `markdownFilter` の計測は省略する

## テスト戦略

- 計測はログ出力が主目的のため、既存テストの変更は不要
- 手動で `OTAK_LCP_PROFILE=1` を設定し、ログが出力されることを確認する

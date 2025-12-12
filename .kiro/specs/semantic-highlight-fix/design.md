# 設計ドキュメント

## 概要

otak-lcpのセマンティックハイライト機能において、Markdownファイル内の日本語テキストが不完全にしか色付けされない問題を修正します。この問題は、フィルタリング後のテキストに対してトークン化を行っているものの、セマンティックトークンの位置情報が元のドキュメントに正しくマッピングされていないことが原因です。

現在の実装では：
- `MarkdownFilter`が除外範囲をスペースで置換してフィルタリング後のテキストを生成
- `MeCabAnalyzer`がフィルタリング後のテキストを解析してトークンを生成
- `SemanticTokenProvider`がトークンからセマンティックトークンを生成
- しかし、トークンの位置情報はフィルタリング後のテキスト基準のまま

修正後は：
- トークンの位置情報を元のドキュメントの位置にマッピングしてからセマンティックトークンを生成

## アーキテクチャ

### 現在のフロー

```
元のMarkdownテキスト
  ↓
MarkdownFilter (除外範囲をスペースで置換)
  ↓
フィルタリング後のテキスト (長さは元と同じ)
  ↓
MeCabAnalyzer (形態素解析)
  ↓
Token[] (位置情報はフィルタリング後のテキスト基準)
  ↓
SemanticTokenProvider (セマンティックトークン生成)
  ↓
SemanticTokens (位置情報がフィルタリング後のまま) ← 問題
```

### 修正後のフロー

```
元のMarkdownテキスト
  ↓
MarkdownFilter (除外範囲をスペースで置換)
  ↓
フィルタリング後のテキスト + ExcludedRange[]
  ↓
MeCabAnalyzer (形態素解析)
  ↓
Token[] (位置情報はフィルタリング後のテキスト基準)
  ↓
TokenFilter (除外範囲内のトークンを除外) ← 新規
  ↓
Token[] (除外範囲外のトークンのみ)
  ↓
SemanticTokenProvider (セマンティックトークン生成)
  ↓
SemanticTokens (位置情報は元のドキュメント基準) ← 修正
```

## コンポーネントとインターフェース

### 1. TokenFilter (新規)

除外範囲内のトークンをフィルタリングするコンポーネント。

```typescript
/**
 * トークンフィルター
 * 除外範囲内のトークンを除外する
 */
export class TokenFilter {
  /**
   * 除外範囲内のトークンをフィルタリング
   * @param tokens トークンリスト
   * @param excludedRanges 除外範囲リスト
   * @returns フィルタリングされたトークンリスト
   */
  filterTokens(tokens: Token[], excludedRanges: ExcludedRange[]): Token[];

  /**
   * トークンが除外範囲内にあるかチェック
   * @param token トークン
   * @param excludedRanges 除外範囲リスト
   * @returns 除外範囲内の場合true
   */
  isTokenInExcludedRange(token: Token, excludedRanges: ExcludedRange[]): boolean;
}
```

### 2. SemanticTokenProvider (修正)

セマンティックトークン生成時に、トークンの位置情報がすでに元のドキュメント基準であることを前提とする。

```typescript
export class SemanticTokenProvider {
  /**
   * トークンリストからセマンティックトークンを生成
   * @param tokens トークンリスト (位置情報は元のドキュメント基準)
   * @param originalText 元のドキュメントテキスト
   * @returns セマンティックトークン
   */
  provideSemanticTokens(tokens: Token[], originalText: string): SemanticTokens;
}
```

### 3. main.ts (修正)

解析フローを修正して、TokenFilterを使用する。

```typescript
async function analyzeDocument(document: TextDocument): Promise<void> {
  // ... (既存のコード)

  // Markdownフィルタリング
  const filterResult = markdownFilter.filter(textToAnalyze);
  const filteredText = filterResult.filteredText;
  const excludedRanges = filterResult.excludedRanges;

  // 形態素解析
  const tokens = await mecabAnalyzer.analyze(filteredText);

  // トークンフィルタリング (除外範囲内のトークンを除外)
  const filteredTokens = tokenFilter.filterTokens(tokens, excludedRanges);

  // セマンティックトークン生成 (元のテキストを渡す)
  const semanticTokens = semanticTokenProvider.provideSemanticTokens(
    filteredTokens,
    originalText  // フィルタリング前の元のテキスト
  );

  // ... (既存のコード)
}
```

## データモデル

### Token

```typescript
interface Token {
  surface: string;      // 表層形
  pos: string;          // 品詞
  pos_detail_1: string; // 品詞細分類1
  pos_detail_2: string; // 品詞細分類2
  pos_detail_3: string; // 品詞細分類3
  conjugated_type: string;  // 活用型
  conjugated_form: string;  // 活用形
  basic_form: string;   // 基本形
  reading: string;      // 読み
  pronunciation: string; // 発音
  start: number;        // 開始位置 (文字オフセット)
  end: number;          // 終了位置 (文字オフセット)
}
```

### ExcludedRange

```typescript
interface ExcludedRange {
  start: number;        // 開始位置
  end: number;          // 終了位置
  type: ExcludeType;    // 除外タイプ
  content: string;      // 除外されたコンテンツ
  reason: string;       // 除外理由
}
```

## 正確性プロパティ

*プロパティは、システムのすべての有効な実行において真であるべき特性または動作です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: トークンフィルタリングの完全性

*すべての*トークンリストと除外範囲リストに対して、フィルタリング後のトークンはすべて除外範囲外に存在しなければならない

このプロパティは、コードブロック、テーブル、URL内のトークンが正しく除外されることを保証します。ランダムなトークンリストと除外範囲リスト（コードブロック、テーブル、URLを含む）を生成し、フィルタリング後のすべてのトークンが除外範囲外にあることを確認します。

**検証: 要件 2.1, 2.2, 2.3**

### プロパティ 2: セマンティックトークンの位置正確性

*すべての*セマンティックトークンに対して、その位置情報は元のドキュメント内の対応するテキストの位置と一致しなければならない

このプロパティは、セマンティックトークンの位置が正しくマッピングされ、クライアントに送信されることを保証します。ランダムなトークンリストとテキストを生成し、各セマンティックトークンの位置が元のテキスト内の対応する位置と一致することを確認します。

**検証: 要件 1.2, 1.3**

### プロパティ 3: セマンティックトークンの完全性

*すべての*フィルタリング後のトークンに対して、対応するセマンティックトークンが生成されなければならない

このプロパティは、フィルタリング対象外のすべての日本語テキストに色付けが適用されることを保証します。ランダムなMarkdownテキストを生成し、解析後にフィルタリング後のすべてのトークンに対応するセマンティックトークンが存在することを確認します。

**検証: 要件 1.1, 1.4**

### プロパティ 4: Position Mapperの正確性

*すべての*フィルタリングされたテキストのオフセットに対して、Position Mapperは対応する元のドキュメントのオフセットを正しく返さなければならない。また、除外範囲内のオフセットに対してはnullを返さなければならない

このプロパティは、Position Mapperが正確に動作することを保証します。ランダムなテキストと除外範囲を生成し、マッピングが正しく行われること、および除外範囲内のオフセットに対してnullが返されることを確認します。

**検証: 要件 3.1, 3.2, 3.3**

## エラーハンドリング

### 1. トークンフィルタリングエラー

- **エラー**: 除外範囲リストが不正（開始位置 > 終了位置）
- **対応**: エラーログを出力し、該当する除外範囲をスキップ

### 2. セマンティックトークン生成エラー

- **エラー**: トークンの位置情報がテキスト範囲外
- **対応**: エラーログを出力し、該当するトークンをスキップ

### 3. 空のトークンリスト

- **エラー**: トークンリストが空
- **対応**: 空のセマンティックトークンを返す

## テスト戦略

### ユニットテスト

1. **TokenFilter.filterTokens**
   - 除外範囲内のトークンが正しく除外されることを確認
   - 除外範囲外のトークンが保持されることを確認
   - 空のトークンリストを処理できることを確認

2. **TokenFilter.isTokenInExcludedRange**
   - トークンが完全に除外範囲内にある場合にtrueを返すことを確認
   - トークンが部分的に除外範囲と重複する場合にtrueを返すことを確認
   - トークンが除外範囲外にある場合にfalseを返すことを確認

3. **SemanticTokenProvider.provideSemanticTokens**
   - 正しいセマンティックトークンが生成されることを確認
   - 位置情報が正しく計算されることを確認

### プロパティベーステスト

1. **プロパティ 1: トークンフィルタリングの完全性**
   - ランダムなトークンリストと除外範囲リストを生成
   - フィルタリング後のすべてのトークンが除外範囲外にあることを確認

2. **プロパティ 2: セマンティックトークンの位置正確性**
   - ランダムなトークンリストとテキストを生成
   - 各セマンティックトークンの位置が元のテキスト内の対応する位置と一致することを確認

3. **プロパティ 3: セマンティックトークンの完全性**
   - ランダムなトークンリストを生成
   - すべてのトークンに対応するセマンティックトークンが生成されることを確認

### 統合テスト

1. **Markdownファイルの解析**
   - 実際のMarkdownファイルを解析
   - すべての日本語テキストが色付けされることを確認
   - コードブロック、テーブル、URL内のテキストが色付けされないことを確認

2. **大規模ドキュメントの処理**
   - 大規模なMarkdownファイルを解析
   - パフォーマンスが許容範囲内であることを確認
   - メモリ使用量が許容範囲内であることを確認

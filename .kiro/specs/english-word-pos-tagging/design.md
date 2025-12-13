# 設計書

## 概要

日本語テキスト内に含まれる英単語の品詞タグ付けを改善し、ユーザーに対してより正確で有用な情報を提供します。現在、kuromoji.jsは英単語を解析する際に、辞書に基づいて品詞を割り当てますが、その結果がユーザーの期待と異なる場合があります（例：「install」が「名詞」として認識される）。

この設計では、英単語を特別なカテゴリとして識別し、ホバー情報で明示的に「英単語」であることを示すことで、ユーザーの混乱を防ぎます。

## アーキテクチャ

### 現在の処理フロー

1. `MeCabAnalyzer.analyze()` が kuromoji.js を使用してテキストを形態素解析
2. kuromoji.js が各トークンに品詞情報を付与
3. `HoverProvider.provideHover()` がトークンの品詞情報をフォーマットして表示
4. `SemanticTokenProvider.provideSemanticTokens()` が品詞に基づいてハイライト色を決定

### 改善後の処理フロー

1. `MeCabAnalyzer.analyze()` が kuromoji.js を使用してテキストを形態素解析
2. kuromoji.js が各トークンに品詞情報を付与
3. **新規**: `EnglishWordDetector.isEnglishWord()` が英単語を識別
4. **改善**: `HoverProvider.formatMorphemeInfo()` が英単語の場合は特別なフォーマットを適用
5. **改善**: `SemanticTokenProvider.mapTokenToTokenType()` が英単語を適切に分類

## コンポーネントとインターフェース

### 新規コンポーネント: EnglishWordDetector

英単語を識別するためのユーティリティクラス。

```typescript
export class EnglishWordDetector {
  /**
   * 文字列が英単語かどうかを判定
   * @param surface 表層形
   * @returns 英単語の場合true
   */
  static isEnglishWord(surface: string): boolean;

  /**
   * 英単語の種類を推定（名詞的/動詞的/その他）
   * @param surface 表層形
   * @returns 推定される種類
   */
  static estimateWordType(surface: string): 'noun-like' | 'verb-like' | 'other';
}
```

### 改善コンポーネント: HoverProvider

英単語に対する特別なフォーマットを追加。

```typescript
export class HoverProvider {
  /**
   * 形態素情報をフォーマット（英単語対応版）
   * @param token トークン
   * @returns マークダウン形式の形態素情報
   */
  formatMorphemeInfo(token: Token): string;

  /**
   * 英単語用の形態素情報をフォーマット
   * @param token トークン
   * @returns マークダウン形式の形態素情報
   */
  private formatEnglishWordInfo(token: Token): string;
}
```

### 改善コンポーネント: SemanticTokenProvider

英単語のハイライトを改善（現在は `Other` として扱われているが、より適切な分類を検討）。

```typescript
export class SemanticTokenProvider {
  /**
   * トークン情報を含めてTokenTypeを決定（英単語対応版）
   */
  private mapTokenToTokenType(token: Token): TokenType;
}
```

## データモデル

### Token型の拡張（検討）

現在の `Token` 型に英単語フラグを追加することを検討しますが、既存の実装への影響を最小限にするため、まずは `EnglishWordDetector` で判定する方式を採用します。

```typescript
// 将来的な拡張案
interface Token {
  // 既存フィールド
  surface: string;
  pos: string;
  // ...

  // 新規フィールド（オプション）
  isEnglishWord?: boolean;
  englishWordType?: 'noun-like' | 'verb-like' | 'other';
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*


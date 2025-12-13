# 設計書

## 概要

Evalsシステムに新しいNGパターンカテゴリを追加し、文法チェック機能のカバレッジを拡充します。特に「混在」に関連するパターン（句読点、引用符、箇条書き記号、英語表記など）とMarkdown記法の構造的な問題を検出するルールを実装します。

現在のEvalsシステムは44カテゴリのNGパターンをサポートしていますが、この設計では以下の新しいカテゴリを追加します：

1. 句読点スタイルの混在
2. 引用符スタイルの混在
3. 箇条書き記号の混在
4. 強調記号の混在
5. 英語表記の大文字小文字混在
6. 単位表記の混在
7. 人称代名詞の混在
8. 見出しレベルの飛び
9. テーブル列数の不一致
10. コードブロック言語指定の欠落

## アーキテクチャ

### 現在のアーキテクチャ

```
ng-examples-data.ts
  ↓ (NGパターン定義)
evals-runner.ts
  ↓ (評価実行)
AdvancedRulesManager
  ↓ (ルール実行)
個別ルール (rules/*.ts)
  ↓ (診断生成)
Diagnostic
```

### 拡張後のアーキテクチャ

新しいルールカテゴリを追加：

1. **混在検出ルール**: 文書全体をスキャンして、異なるスタイルの混在を検出
2. **Markdown構造ルール**: Markdown ASTを解析して、構造的な問題を検出

```
ng-examples-data.ts (拡張)
  ↓
evals-runner.ts
  ↓
AdvancedRulesManager (拡張)
  ↓
├─ 既存ルール (rules/*.ts)
├─ 混在検出ルール (新規)
│   ├─ PunctuationStyleMixRule
│   ├─ QuotationStyleMixRule
│   ├─ BulletStyleMixRule
│   ├─ EmphasisStyleMixRule
│   ├─ EnglishCaseMixRule
│   ├─ UnitNotationMixRule
│   └─ PronounMixRule
└─ Markdown構造ルール (新規)
    ├─ HeadingLevelSkipRule
    ├─ TableColumnMismatchRule
    └─ CodeBlockLanguageRule
```

## コンポーネントとインターフェース

### 1. NGパターンデータの拡張

`ng-examples-data.ts` に新しいカテゴリを追加します。

```typescript
export const NG_EXAMPLE_CATEGORIES: NGExampleCategory[] = [
  // ... 既存の44カテゴリ ...
  
  // 45. 句読点スタイルの混在
  {
    id: 'punctuation-style-mix',
    name: '句読点スタイルの混在',
    description: '、。と，．が混在している',
    expectedRule: 'punctuation-style-mix',
    status: 'NOT_IMPL',
    examples: [
      { 
        text: 'これは例文です。しかし，これは混在している。',
        correctText: 'これは例文です。しかし、これは統一されています。',
        description: '。と，の混在'
      }
    ]
  },
  
  // 46. 引用符スタイルの混在
  {
    id: 'quotation-style-mix',
    name: '引用符スタイルの混在',
    description: '「」と""が混在している',
    expectedRule: 'quotation-style-mix',
    status: 'NOT_IMPL',
    examples: [
      {
        text: '彼は「こんにちは」と言った。彼女は"さようなら"と答えた。',
        correctText: '彼は「こんにちは」と言った。彼女は「さようなら」と答えた。',
        description: '「」と""の混在'
      }
    ]
  },
  
  // ... 他の新しいカテゴリ ...
];
```

### 2. 混在検出ルールの基底クラス

混在検出ルールに共通する機能を提供する基底クラスを作成します。

```typescript
/**
 * 混在検出ルールの基底クラス
 */
export abstract class MixDetectionRule implements AdvancedGrammarRule {
  /**
   * 文書内のパターンを収集
   */
  protected abstract collectPatterns(text: string): Map<string, number>;
  
  /**
   * 混在を検出
   */
  protected detectMix(patterns: Map<string, number>): boolean {
    return patterns.size > 1;
  }
  
  /**
   * 診断メッセージを生成
   */
  protected abstract createDiagnosticMessage(patterns: Map<string, number>): string;
  
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const patterns = this.collectPatterns(context.documentText);
    
    if (!this.detectMix(patterns)) {
      return [];
    }
    
    return [
      new AdvancedDiagnostic({
        message: this.createDiagnosticMessage(patterns),
        range: { start: 0, end: context.documentText.length },
        severity: 'warning',
        code: this.getRuleCode()
      })
    ];
  }
  
  protected abstract getRuleCode(): string;
}
```

### 3. 個別の混在検出ルール

#### PunctuationStyleMixRule

```typescript
export class PunctuationStyleMixRule extends MixDetectionRule {
  protected collectPatterns(text: string): Map<string, number> {
    const patterns = new Map<string, number>();
    
    // 、。スタイル
    const japaneseCount = (text.match(/[、。]/g) || []).length;
    if (japaneseCount > 0) {
      patterns.set('japanese', japaneseCount);
    }
    
    // ，．スタイル
    const westernCount = (text.match(/[，．]/g) || []).length;
    if (westernCount > 0) {
      patterns.set('western', westernCount);
    }
    
    return patterns;
  }
  
  protected createDiagnosticMessage(patterns: Map<string, number>): string {
    const styles = Array.from(patterns.keys()).join('と');
    return `句読点のスタイルが混在しています（${styles}）。どちらかに統一してください。`;
  }
  
  protected getRuleCode(): string {
    return 'punctuation-style-mix';
  }
}
```

#### QuotationStyleMixRule

```typescript
export class QuotationStyleMixRule extends MixDetectionRule {
  protected collectPatterns(text: string): Map<string, number> {
    const patterns = new Map<string, number>();
    
    // 「」スタイル
    const japaneseCount = (text.match(/[「」]/g) || []).length;
    if (japaneseCount > 0) {
      patterns.set('「」', japaneseCount);
    }
    
    // ""スタイル
    const doubleQuoteCount = (text.match(/[""]/g) || []).length;
    if (doubleQuoteCount > 0) {
      patterns.set('""', doubleQuoteCount);
    }
    
    // ''スタイル
    const singleQuoteCount = (text.match(/['']/g) || []).length;
    if (singleQuoteCount > 0) {
      patterns.set("''", singleQuoteCount);
    }
    
    return patterns;
  }
  
  protected createDiagnosticMessage(patterns: Map<string, number>): string {
    const styles = Array.from(patterns.keys()).join('と');
    return `引用符のスタイルが混在しています（${styles}）。どちらかに統一してください。`;
  }
  
  protected getRuleCode(): string {
    return 'quotation-style-mix';
  }
}
```

### 4. Markdown構造ルール

#### HeadingLevelSkipRule

```typescript
export class HeadingLevelSkipRule implements AdvancedGrammarRule {
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const lines = context.documentText.split('\n');
    let previousLevel = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^(#{1,6})\s/);
      if (match) {
        const currentLevel = match[1].length;
        
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          diagnostics.push(
            new AdvancedDiagnostic({
              message: `見出しレベルが飛んでいます（h${previousLevel}の次にh${currentLevel}）。h${previousLevel + 1}を使用してください。`,
              range: this.getLineRange(context.documentText, i),
              severity: 'warning',
              code: 'heading-level-skip'
            })
          );
        }
        
        previousLevel = currentLevel;
      }
    }
    
    return diagnostics;
  }
  
  private getLineRange(text: string, lineIndex: number): { start: number; end: number } {
    const lines = text.split('\n');
    let start = 0;
    for (let i = 0; i < lineIndex; i++) {
      start += lines[i].length + 1;
    }
    return { start, end: start + lines[lineIndex].length };
  }
}
```

## データモデル

### NGExampleCategory の拡張

既存の `NGExampleCategory` インターフェースはそのまま使用します。新しいカテゴリを追加する際は、以下のフィールドを設定します：

- `id`: カテゴリの一意識別子（kebab-case）
- `name`: カテゴリの表示名
- `description`: カテゴリの説明
- `expectedRule`: 期待されるルールコード
- `status`: `'IMPLEMENTED'` または `'NOT_IMPL'`
- `examples`: NGExample の配列

### 設定の拡張

新しいルールの ON/OFF を制御するため、`package.json` に設定項目を追加します：

```json
{
  "otakLcp.advanced.enablePunctuationStyleMix": {
    "type": "boolean",
    "default": true,
    "description": "句読点スタイルの混在チェック"
  },
  "otakLcp.advanced.enableQuotationStyleMix": {
    "type": "boolean",
    "default": true,
    "description": "引用符スタイルの混在チェック"
  }
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械が検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: カテゴリデータの完全性

*すべての* NGパターンカテゴリは、必須フィールド（id, name, description, expectedRule, status, examples）を持つ

**検証: 要件 1.2, 1.3, 1.4**

### プロパティ 2: ルールインターフェースの一貫性

*すべての* 文法ルールは、`check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[]` のシグネチャを持つ

**検証: 要件 2.2, 2.3**

### プロパティ 3: 検出率の計算正確性

*すべての* カテゴリに対して、検出率は `(検出数 / 例文数) * 100` で計算され、0から100の範囲内である

**検証: 要件 3.2**

### プロパティ 4: 診断情報の完全性

*すべての* 検出されたNGパターンに対して、診断情報はメッセージ、範囲、重要度、コードを含む

**検証: 要件 4.2**

### プロパティ 5: 混在検出の対称性

*すべての* 混在検出ルールに対して、スタイルAとスタイルBが混在する文書は、スタイルBとスタイルAが混在する文書と同じように検出される

**検証: 要件 5.1, 5.2, 5.3, 5.4**

## エラーハンドリング

### ルール実行エラー

個別のルールが例外をスローした場合でも、他のルールの実行を継続します。エラーはログに記録し、Evalsの結果には影響しません。

```typescript
try {
  const diagnostics = rule.check(tokens, context);
  allDiagnostics.push(...diagnostics);
} catch (error) {
  console.error(`Rule ${ruleName} failed:`, error);
  // 他のルールの実行を継続
}
```

### データ検証エラー

NGパターンデータに不正な値が含まれている場合、起動時にエラーを報告します。

```typescript
function validateCategory(category: NGExampleCategory): void {
  if (!category.id || !category.name || !category.expectedRule) {
    throw new Error(`Invalid category: ${JSON.stringify(category)}`);
  }
  
  if (!['IMPLEMENTED', 'NOT_IMPL'].includes(category.status)) {
    throw new Error(`Invalid status: ${category.status}`);
  }
}
```

## テスト戦略

### ユニットテスト

各ルールに対して、以下のテストを実装します：

- NGパターンを含む文書で検出されることを確認
- NGパターンを含まない文書で検出されないことを確認
- エッジケース（空文書、特殊文字など）の処理を確認

### プロパティベーステスト

以下のプロパティをテストします：

- **プロパティ 1**: ランダムなカテゴリデータを生成し、すべての必須フィールドが存在することを確認
- **プロパティ 3**: ランダムな検出数と例文数を生成し、検出率が正しく計算されることを確認
- **プロパティ 5**: ランダムな混在パターンを生成し、検出が対称的であることを確認

### 統合テスト

Evalsシステム全体を実行し、以下を確認します：

- すべてのカテゴリが評価されること
- レポートが正しく生成されること
- READMEが正しく更新されること

## 実装の優先順位

1. **フェーズ 1**: 混在検出ルールの実装
   - 句読点スタイルの混在
   - 引用符スタイルの混在
   - 箇条書き記号の混在
   - 強調記号の混在

2. **フェーズ 2**: 英語・単位表記の混在検出
   - 英語表記の大文字小文字混在
   - 単位表記の混在
   - 人称代名詞の混在

3. **フェーズ 3**: Markdown構造ルールの実装
   - 見出しレベルの飛び
   - テーブル列数の不一致
   - コードブロック言語指定の欠落

各フェーズで、NGパターンデータの追加、ルールの実装、テストの作成、Evalsの実行を行います。


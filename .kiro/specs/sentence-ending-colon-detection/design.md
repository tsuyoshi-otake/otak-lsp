# 設計ドキュメント

## 概要

日本語文の末尾に全角コロン（：）が使用されている場合に警告を表示する文法チェックルールを実装します。コロンは箇条書きの前置きや説明の導入に使用されますが、文末には使用しません。このルールは、文末のコロンを検出し、適切な句読点（。）への修正を提案します。

## アーキテクチャ

### 既存のアーキテクチャ

```
ドキュメント
  ↓
MeCabAnalyzer.analyze()
  - トークン化
  ↓
SentenceSplitter.split()
  - 文分割
  ↓
AdvancedRulesManager.check()
  - 各ルールを実行
  ↓
SentenceEndingColonRule.check()
  - 文末コロンを検出
  ↓
AdvancedDiagnostic[]
  - 診断結果を返す
```

### 処理フロー

1. ドキュメントがトークン化される
2. トークンが文単位に分割される
3. `SentenceEndingColonRule`が各文をチェック
4. 文末にコロン（：）が見つかった場合、診断を生成
5. 診断には修正提案（句点への変更）が含まれる

## コンポーネントとインターフェース

### 1. SentenceEndingColonRule（新規）

**責務**: 文末のコロン（：）を検出し、警告を生成する

**インターフェース**:
```typescript
export class SentenceEndingColonRule implements AdvancedGrammarRule {
  name: string;
  description: string;
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[];
  isEnabled(config: AdvancedRulesConfig): boolean;
}
```

**メソッド**:
- `check()`: 文末コロンを検出し、診断を生成
- `isEnabled()`: 設定に基づいてルールの有効/無効を判定
- `endsWithColon()`: 文がコロンで終わるかどうかを判定（プライベート）

### 2. AdvancedGrammarErrorType（変更）

**変更内容**: 新しいエラータイプを追加

```typescript
export type AdvancedGrammarErrorType =
  | 'style-inconsistency'
  | 'ra-nuki'
  // ... 既存のタイプ
  | 'sentence-ending-colon';  // 新規
```

### 3. AdvancedRulesConfig（変更）

**変更内容**: 新しい設定項目を追加

```typescript
export interface AdvancedRulesConfig {
  // ... 既存の設定
  enableSentenceEndingColon: boolean;  // 新規
}
```

### 4. DEFAULT_ADVANCED_RULES_CONFIG（変更）

**変更内容**: デフォルト設定を追加

```typescript
export const DEFAULT_ADVANCED_RULES_CONFIG: AdvancedRulesConfig = {
  // ... 既存の設定
  enableSentenceEndingColon: true,  // 新規: デフォルトで有効
};
```

### 5. AdvancedRulesManager（変更）

**変更内容**: 新しいルールを登録

```typescript
import { SentenceEndingColonRule } from './rules/sentenceEndingColonRule';

// コンストラクタ内
this.rules.push(new SentenceEndingColonRule());
```

### 6. package.json（変更）

**変更内容**: VS Code設定を追加

```json
{
  "contributes": {
    "configuration": {
      "properties": {
        "otakLcp.advanced.enableSentenceEndingColon": {
          "type": "boolean",
          "default": true,
          "description": "文末コロン検出を有効にする"
        }
      }
    }
  }
}
```

## データモデル

### SentenceEndingColon（新規）

```typescript
/**
 * 文末コロンの情報
 */
export interface SentenceEndingColon {
  sentence: Sentence;
  colonPosition: number;
  range: Range;
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作です。本質的には、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: 文末コロンの検出

*すべての* 日本語文に対して、文末に全角コロン（：）が存在する場合、システムは警告診断を生成しなければならない

**検証**: 要件 1.1

### プロパティ 2: 修正提案の提供

*すべての* 文末コロン検出に対して、システムは句点（。）への修正提案を含む診断を生成しなければならない

**検証**: 要件 1.2, 3.2

### プロパティ 3: 文中コロンの除外

*すべての* 文中にコロンが存在する場合（文末以外）、システムは警告を生成してはならない

**検証**: 要件 1.3

### プロパティ 4: 箇条書き前置きの除外

*すべての* 箇条書き前置き文（次の行が箇条書きの場合）に対して、システムは警告を生成してはならない

**検証**: 要件 1.4

### プロパティ 5: 半角コロンの除外

*すべての* 半角コロン（:）に対して、システムは警告を生成してはならない

**検証**: 要件 1.5

### プロパティ 6: 設定による制御

*すべての* ドキュメントに対して、設定で無効化されている場合、システムは文末コロンを検出してはならない

**検証**: 要件 2.2

## エラーハンドリング

### エラーケース

1. **空の文**
   - 症状: 文のテキストが空文字列
   - 対応: チェックをスキップ

2. **トークンが存在しない文**
   - 症状: 文にトークンが含まれていない
   - 対応: チェックをスキップ

3. **不正な範囲**
   - 症状: 文の開始位置が終了位置より大きい
   - 対応: チェックをスキップし、エラーログを記録

4. **設定の不正値**
   - 症状: `enableSentenceEndingColon`が`undefined`
   - 対応: デフォルト値（`true`）を使用

### エラーログ

デバッグモードが有効な場合、以下の情報をログに記録します：

- ルールの実行開始と終了
- 検出された文末コロンの数と位置
- スキップされた文の情報
- エラーが発生した場合のエラー内容

## テスト戦略

### ユニットテスト

ユニットテストは特定の例、エッジケース、エラー条件を検証します。

**SentenceEndingColonRuleのテスト**:
- 基本的な文末コロンの検出
- 文中のコロンは検出しない
- 箇条書き前置きのコロンは検出しない
- 半角コロンは検出しない
- 空の文の処理
- 設定による有効/無効の切り替え

**テストケース例**:
```typescript
describe('SentenceEndingColonRule', () => {
  it('文末の全角コロンを検出する', () => {
    const text = 'これはテストです：';
    // 警告が生成されることを確認
  });

  it('文中のコロンは検出しない', () => {
    const text = '時間：10時から開始します。';
    // 警告が生成されないことを確認
  });

  it('箇条書き前置きのコロンは検出しない', () => {
    const text = '以下の項目を確認してください：\n- 項目1\n- 項目2';
    // 警告が生成されないことを確認
  });

  it('半角コロンは検出しない', () => {
    const text = 'これはテストです:';
    // 警告が生成されないことを確認
  });
});
```

### プロパティベーステスト

プロパティベーステストは、すべての入力に対して成立すべき普遍的なプロパティを検証します。

**使用ライブラリ**: fast-check

**テスト実行回数**: 30回（プロジェクト設定に従う）

**プロパティテスト**:

1. **プロパティ 1のテスト**: 文末コロンの検出
   - ジェネレーター: ランダムな日本語文 + 全角コロン
   - 検証: すべての文末コロンが検出される

2. **プロパティ 2のテスト**: 修正提案の提供
   - ジェネレーター: ランダムな日本語文 + 全角コロン
   - 検証: すべての診断に句点への修正提案が含まれる

3. **プロパティ 3のテスト**: 文中コロンの除外
   - ジェネレーター: ランダムな日本語文（文中にコロンを含む）
   - 検証: 文中のコロンでは警告が生成されない

4. **プロパティ 4のテスト**: 箇条書き前置きの除外
   - ジェネレーター: ランダムな箇条書き前置き文
   - 検証: 箇条書き前置きでは警告が生成されない

5. **プロパティ 5のテスト**: 半角コロンの除外
   - ジェネレーター: ランダムな日本語文 + 半角コロン
   - 検証: 半角コロンでは警告が生成されない

6. **プロパティ 6のテスト**: 設定による制御
   - ジェネレーター: ランダムな日本語文 + 全角コロン、設定（有効/無効）
   - 検証: 設定が無効の場合、警告が生成されない

**エッジケーステスト**:
- 空の文
- 非常に長い文
- 複数のコロンを含む文
- 句読点とコロンが混在する文
- 改行を含む文

## 実装の詳細

### SentenceEndingColonRuleの実装

```typescript
/**
 * Sentence Ending Colon Rule
 * 文末のコロン（：）をチェックする
 * Feature: sentence-ending-colon-detection
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';

/**
 * 文末コロン検出ルール
 */
export class SentenceEndingColonRule implements AdvancedGrammarRule {
  name = 'sentence-ending-colon';
  description = '文末のコロン（：）をチェックします';

  /**
   * 文がコロンで終わるかどうかを判定
   */
  private endsWithColon(text: string): boolean {
    // 文末の空白と句読点を除去
    const trimmed = text.trim().replace(/[。！？!?]$/, '');
    // 全角コロンで終わるかチェック
    return /：$/.test(trimmed);
  }

  /**
   * 箇条書き前置き文かどうかを判定
   * 次の行が箇条書き（-、*、数字.）で始まる場合は前置き文と判定
   */
  private isBulletListPrefix(sentence: Sentence, documentText: string): boolean {
    const sentenceEnd = sentence.end;
    const remainingText = documentText.substring(sentenceEnd);
    
    // 次の行が箇条書きマーカーで始まるかチェック
    const nextLineMatch = remainingText.match(/^\s*\n\s*[-*•]\s/);
    const numberedListMatch = remainingText.match(/^\s*\n\s*\d+\.\s/);
    
    return !!(nextLineMatch || numberedListMatch);
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const sentence of context.sentences) {
      // 空の文はスキップ
      if (!sentence.text || sentence.text.trim().length === 0) {
        continue;
      }

      // 文末にコロンがあるかチェック
      if (this.endsWithColon(sentence.text)) {
        // 箇条書き前置き文の場合はスキップ
        if (this.isBulletListPrefix(sentence, context.documentText)) {
          continue;
        }

        // コロンの位置を特定
        const trimmed = sentence.text.trim();
        const colonIndex = trimmed.lastIndexOf('：');
        const colonPosition = sentence.start + colonIndex;

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: colonPosition },
            end: { line: 0, character: colonPosition + 1 }
          },
          message: '文末にコロン（：）が使用されています。句点（。）に変更するか、文を続けてください。',
          code: 'sentence-ending-colon',
          ruleName: this.name,
          suggestions: [
            'コロンを句点（。）に変更する',
            '文を続けて完結させる',
            '箇条書きを追加する'
          ]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableSentenceEndingColon;
  }
}
```

### 重要な考慮事項

1. **文末の判定**:
   - 文末の空白や句読点を除去してからコロンをチェック
   - 全角コロン（：）のみを対象とし、半角コロン（:）は除外

2. **箇条書き前置きの判定**:
   - 次の行が箇条書きマーカー（-、*、•）で始まる場合は前置き文と判定
   - 番号付きリスト（1.、2.など）も考慮

3. **文中のコロンの扱い**:
   - `endsWithColon()`メソッドで文末のみをチェック
   - 文中のコロン（例: 「時間：10時」）は検出しない

4. **診断の範囲**:
   - コロン文字のみを範囲として指定
   - これにより、VS Codeで正確な位置に波線が表示される

### 統合ポイント

1. **shared/src/advancedTypes.ts**:
   - `AdvancedGrammarErrorType`に`'sentence-ending-colon'`を追加
   - `AdvancedRulesConfig`に`enableSentenceEndingColon: boolean`を追加
   - `DEFAULT_ADVANCED_RULES_CONFIG`に`enableSentenceEndingColon: true`を追加

2. **server/src/grammar/rules/index.ts**:
   - `export { SentenceEndingColonRule } from './sentenceEndingColonRule';`を追加

3. **server/src/grammar/advancedRulesManager.ts**:
   - `import { SentenceEndingColonRule } from './rules';`を追加
   - コンストラクタで`this.rules.push(new SentenceEndingColonRule());`を追加

4. **package.json**:
   - `contributes.configuration.properties`に設定を追加

5. **client/src/extension.ts**:
   - 設定の同期は既存の仕組みで自動的に処理される

## パフォーマンス考慮事項

### 処理コスト

- 各文に対して正規表現マッチングを1回実行
- 箇条書き判定のための文字列検索を1回実行
- 計算量: O(n)（nは文の数）

### 最適化

- 文末のコロンチェックは正規表現で高速に実行
- 箇条書き判定は文末にコロンがある場合のみ実行
- 不要な文字列操作を避ける

### 影響

- 既存のルールと同様の処理コスト
- ドキュメント全体の解析時間への影響は無視できるレベル

## 互換性

### 後方互換性

- 新しいルールの追加のため、既存の機能には影響なし
- デフォルトで有効だが、設定で無効化可能
- 既存のユーザーは自動的に新しいルールを取得

### 移行パス

1. 既存のユーザーは拡張機能の更新で自動的に新機能を取得
2. デフォルトで有効なため、即座に文末コロンの検出が開始
3. 不要な場合は設定で無効化可能

## 評価（Evals）

### 評価データ

`server/src/grammar/evals/data/`に評価データを追加：

```typescript
{
  category: '文末コロン',
  examples: [
    {
      text: 'これはテストです：',
      shouldDetect: true,
      description: '基本的な文末コロン'
    },
    {
      text: '時間：10時から開始します。',
      shouldDetect: false,
      description: '文中のコロン'
    },
    {
      text: '以下の項目を確認してください：\n- 項目1',
      shouldDetect: false,
      description: '箇条書き前置き'
    },
    {
      text: 'これはテストです:',
      shouldDetect: false,
      description: '半角コロン'
    }
  ]
}
```

### 評価基準

- 検出率: 100%（すべての文末コロンを検出）
- 誤検出率: 0%（文中のコロンや箇条書き前置きを誤検出しない）

## README更新

README.mdに新しいルールの説明を追加：

```markdown
#### 17. 文末コロンの検出（Sentence Ending Colon）

日本語文の末尾にコロン（：）が使用されている場合に警告します。

\`\`\`
これはテストです：  <- 文末にコロンが使用されています
-> 「句点（。）に変更するか、文を続けてください」と提案
\`\`\`

**注意**: 箇条書きの前置き文（次の行が箇条書きの場合）は除外されます。
```

設定表にも追加：

```markdown
| `otakLcp.advanced.enableSentenceEndingColon` | 文末コロン検出 | `true` |
```

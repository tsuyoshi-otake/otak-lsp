 # 設計ドキュメント

## 概要

Markdownテーブル内の日本語テキストに対してセマンティックハイライトを適用するための機能を実装します。現在、テーブル全体が除外範囲として扱われているため、テーブル内の日本語がセマンティックハイライトされません。この設計では、テーブル構造要素（区切り文字、セパレーター行）のみを除外し、セル内の日本語テキストはセマンティックハイライトの対象とします。一方で、文法チェックについてはテーブル全体を引き続き除外対象とします。

## アーキテクチャ

### 現在のアーキテクチャ

```
Markdownドキュメント
  ↓
MarkdownFilter.filter()
  - テーブル全体を除外範囲として検出
  - 除外範囲をスペースで置換
  ↓
MeCabAnalyzer.analyze()
  - フィルタリング後のテキストをトークン化
  ↓
TokenFilter.filterTokens()
  - 除外範囲内のトークンを削除
  ↓
分岐:
  - セマンティックハイライト: SemanticTokenProvider
  - 文法チェック: GrammarChecker + AdvancedRulesManager
```

### 新しいアーキテクチャ

```
Markdownドキュメント
  ↓
MarkdownFilter.filter()
  - テーブル構造要素のみを除外範囲として検出
    * テーブル区切り文字（|）
    * セパレーター行（|---|---|）
  - テーブルセル内の他の除外要素も検出
    * インラインコード
    * URL
    * 設定キー
  ↓
MeCabAnalyzer.analyze()
  - フィルタリング後のテキストをトークン化
  ↓
TokenFilter.filterTokens()
  - 除外範囲内のトークンを削除
  ↓
分岐:
  - セマンティックハイライト: SemanticTokenProvider
    * テーブルセル内の日本語もハイライト対象
  - 文法チェック: GrammarChecker + AdvancedRulesManager
    * テーブル全体を除外（既存の動作を維持）
```

## コンポーネントとインターフェース

### 1. MarkdownFilter（変更）

**責務**: Markdownドキュメントから除外範囲を検出する

**変更内容**:
- `findTables()` メソッドを変更して、テーブル全体ではなくテーブル構造要素のみを除外範囲として返す
- 新しい除外タイプを追加: `table-delimiter`, `table-separator`

**インターフェース**:
```typescript
class MarkdownFilter {
  // 既存メソッド（変更なし）
  filter(text: string, config?: FilterConfig): FilterResult;
  getExcludedRanges(text: string, config?: FilterConfig): ExcludedRange[];
  
  // 変更するメソッド
  private findTables(text: string, existingRanges: ExcludedRange[]): ExcludedRange[];
}
```

### 2. ExcludeType（変更）

**変更内容**: 新しい除外タイプを追加

```typescript
export type ExcludeType =
  | 'code-block'
  | 'inline-code'
  | 'table'              // 既存（文法チェック用に保持）
  | 'table-delimiter'    // 新規: テーブル区切り文字
  | 'table-separator'    // 新規: テーブルセパレーター行
  | 'url'
  | 'config-key'
  | 'heading'
  | 'list-marker'
  | 'custom';
```

### 3. GrammarChecker / AdvancedRulesManager（変更なし）

**責務**: 文法チェックを実行する

**動作**: テーブル全体を除外対象として扱う（既存の動作を維持）

### 4. TokenFilter（変更なし）

**責務**: 除外範囲内のトークンをフィルタリングする

**動作**: 除外範囲リストに基づいてトークンをフィルタリング

### 5. SemanticTokenProvider（変更なし）

**責務**: セマンティックトークンを生成する

**動作**: フィルタリング後のトークンリストからセマンティックトークンを生成

### 6. main.ts（変更）

**責務**: 文法チェックとセマンティックハイライトの処理を調整する

**変更内容**:
- セマンティックハイライト用とgrammar check用で異なる除外範囲を使用する
- セマンティックハイライト: `table-delimiter`, `table-separator` のみ除外
- 文法チェック: `table` タイプ全体を除外（既存の動作）

## データモデル

### ExcludedRange（変更）

```typescript
interface ExcludedRange {
  start: number;        // 開始位置（文字インデックス）
  end: number;          // 終了位置（文字インデックス）
  type: ExcludeType;    // 除外タイプ（新しいタイプを追加）
  content: string;      // 除外されたコンテンツ
  reason: string;       // 除外理由
}
```

### FilterConfig（変更なし）

既存の`FilterConfig`は変更しません。`excludeTables`設定は文法チェック用として引き続き使用されます。

```typescript
interface FilterConfig {
  excludeCodeBlocks: boolean;
  excludeInlineCode: boolean;
  excludeTables: boolean;        // 文法チェック用（既存）
  excludeUrls: boolean;
  excludeConfigKeys: boolean;
  excludeHeadings: boolean;
  excludeListMarkers: boolean;
  customExcludePatterns: RegExp[];
  debugMode: boolean;
}
```

**注意**: `excludeTables`の意味は変わりません。この設定は文法チェックでテーブル全体を除外するかどうかを制御します。セマンティックハイライトでは、テーブル構造要素のみが常に除外されます。


## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性または動作です。本質的には、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: テーブル内日本語テキストのセマンティックトークン生成

*すべての* Markdownテーブルと日本語テキストに対して、テーブル内の日本語テキストはセマンティックトークンとして生成されなければならない

**検証**: 要件 1.1, 1.4

### プロパティ 2: テーブル構造要素の除外

*すべての* Markdownテーブルに対して、テーブル区切り文字（|）とセパレーター行（|---|---|）は除外範囲として検出されなければならない

**検証**: 要件 1.2, 1.3

### プロパティ 3: テーブルセル内除外要素の処理

*すべての* テーブルセルに対して、セル内のインラインコード、URL、設定キーは除外範囲として検出され、それ以外の日本語テキストはセマンティックトークンとして生成されなければならない

**検証**: 要件 2.1, 2.2, 2.3, 2.4

### プロパティ 4: 文法チェックにおけるテーブル全体の除外

*すべての* Markdownドキュメントに対して、文法チェック時にはテーブル全体が除外範囲として扱われなければならない

**検証**: 要件 3.1

### プロパティ 5: 除外範囲情報の提供

*すべての* テーブルに対して、テーブル構造要素とセル内除外要素のすべての除外範囲情報（開始位置、終了位置、タイプ）が提供されなければならない

**検証**: 要件 5.1, 5.2

## エラーハンドリング

### エラーケース

1. **不正なテーブル構造**
   - 症状: 区切り文字が不完全、セパレーター行が不正
   - 対応: Graceful degradation - テーブルとして認識せず、通常のテキストとして処理

2. **除外範囲の重複**
   - 症状: テーブル構造要素と他の除外要素が重複
   - 対応: 既存の重複チェックロジックを使用（`isOverlapping`メソッド）

3. **位置情報の不整合**
   - 症状: 除外範囲の開始位置が終了位置より大きい
   - 対応: 無効な範囲として無視（`TokenFilter`の既存ロジック）

4. **設定の不正値**
   - 症状: `excludeTableDelimiters`が`undefined`または不正な型
   - 対応: デフォルト値（`true`）を使用

### エラーログ

デバッグモードが有効な場合、以下の情報をログに記録します：

- テーブル検出の開始と終了
- 検出されたテーブルの数と位置
- 除外範囲の詳細（タイプ、位置、内容）
- エラーが発生した場合のエラー内容と発生箇所

## テスト戦略

### ユニットテスト

ユニットテストは特定の例、エッジケース、エラー条件を検証します。

**MarkdownFilter.findTables()のテスト**:
- 基本的なテーブル構造の検出
- 複数のテーブルを含むドキュメント
- テーブル内のインラインコード、URL、設定キーの検出
- 不正なテーブル構造の処理

**TokenFilterのテスト**:
- テーブル構造要素の除外
- テーブルセル内の日本語テキストの保持
- 除外範囲の重複処理

**統合テスト**:
- main.tsでのセマンティックハイライトと文法チェックの分岐
- 設定変更時の動作確認

### プロパティベーステスト

プロパティベーステストは、すべての入力に対して成立すべき普遍的なプロパティを検証します。

**使用ライブラリ**: fast-check

**テスト実行回数**: 30回（プロジェクト設定に従う）

**プロパティテスト**:

1. **プロパティ 1のテスト**: テーブル内日本語テキストのセマンティックトークン生成
   - ジェネレーター: ランダムなテーブル（行数、列数、セル内容）を生成
   - 検証: テーブル内の日本語テキストに対してセマンティックトークンが生成される

2. **プロパティ 2のテスト**: テーブル構造要素の除外
   - ジェネレーター: ランダムなテーブルを生成
   - 検証: すべての区切り文字（|）とセパレーター行が除外範囲に含まれる

3. **プロパティ 3のテスト**: テーブルセル内除外要素の処理
   - ジェネレーター: インラインコード、URL、設定キーを含むテーブルセルを生成
   - 検証: 除外要素は除外範囲に含まれ、日本語テキストはセマンティックトークンとして生成される

4. **プロパティ 4のテスト**: 文法チェックにおけるテーブル全体の除外
   - ジェネレーター: ランダムなテーブルを含むMarkdownドキュメントを生成
   - 検証: 文法チェック用の除外範囲にテーブル全体が含まれる

5. **プロパティ 5のテスト**: 除外範囲情報の提供
   - ジェネレーター: ランダムなテーブルを生成
   - 検証: すべての除外範囲に開始位置、終了位置、タイプが含まれる

**エッジケーステスト**:
- 空のテーブルセル
- 非常に長いテーブル
- ネストした除外要素（例: テーブルセル内のインラインコード内のURL）
- 不正な設定値の処理

## 実装の詳細

### 重要な考慮事項

現在の`findTables()`実装には重要な特徴があります：

**コードブロックとのみ重複チェック**:
```typescript
// コードブロック範囲のみをチェック対象とする（テーブル内にURL等があっても検出可能にする）
const codeBlockRanges = existingRanges.filter((r) => r.type === 'code-block');
```

この設計により、テーブル内にURL、設定キー、インラインコードなどの除外要素が含まれる場合でも、それらを個別に検出できます。この動作を維持する必要があります。

### 設計の選択肢

#### 選択肢1: 除外範囲の細分化（採用）

テーブル全体を除外する代わりに、以下の2種類の除外範囲を返します：

1. **文法チェック用**: テーブル全体（`type: 'table'`）
2. **セマンティックハイライト用**: テーブル構造要素のみ（`type: 'table-delimiter'`, `type: 'table-separator'`）

**利点**:
- 既存の重複チェックロジックをそのまま活用
- テーブル内の他の除外要素（URL、インラインコード等）も自動的に検出される
- 責任分離が明確

**欠点**:
- 除外範囲の数が増加（ただし、パフォーマンスへの影響は小さい）

#### 選択肢2: 除外範囲の用途別フィルタリング

テーブル全体を`table`タイプとして返し、使用時に用途に応じてフィルタリングします。

**利点**:
- `findTables()`の変更が最小限

**欠点**:
- main.tsでの処理が複雑化
- テーブル構造要素の位置情報が失われる

**採用理由**: 選択肢1を採用します。より明確な責任分離と、既存の重複チェックロジックの活用が可能です。

### MarkdownFilter.findTables()の変更

現在の実装では、テーブル全体を1つの除外範囲として返しています。これを変更して、テーブル全体と構造要素の両方を返すようにします。

**変更後の実装**:
```typescript
if (!this.isOverlapping(tableStart, tableEnd, codeBlockRanges)) {
  const tableContent = text.substring(tableStart, tableEnd);
  
  // 1. 文法チェック用: テーブル全体を除外
  ranges.push({
    start: tableStart,
    end: tableEnd,
    type: 'table',
    content: tableContent,
    reason: 'マークダウンテーブル検出（文法チェック用）'
  });
  
  // 2. セマンティックハイライト用: テーブル構造要素のみを除外
  const tableLines = tableContent.split('\n');
  let lineStart = tableStart;
  
  for (const tableLine of tableLines) {
    // セパレーター行全体を除外
    if (/^\|[-:|]+\|$/.test(tableLine.trim())) {
      ranges.push({
        start: lineStart,
        end: lineStart + tableLine.length,
        type: 'table-separator',
        content: tableLine,
        reason: 'テーブルセパレーター行検出'
      });
    } else {
      // 通常の行: 区切り文字（|）のみを除外
      const delimiterMatches = [...tableLine.matchAll(/\|/g)];
      for (const match of delimiterMatches) {
        if (match.index !== undefined) {
          ranges.push({
            start: lineStart + match.index,
            end: lineStart + match.index + 1,
            type: 'table-delimiter',
            content: '|',
            reason: 'テーブル区切り文字検出'
          });
        }
      }
    }
    
    lineStart += tableLine.length + 1; // +1 for newline
  }
}
```

**重要な注意点**:
- テーブル全体（`type: 'table'`）とテーブル構造要素（`type: 'table-delimiter'`, `type: 'table-separator'`）の両方を返す
- これにより、文法チェックとセマンティックハイライトで異なる除外範囲を使用可能
- 既存の重複チェックロジック（コードブロックとの重複チェック）はそのまま維持

**テーブル内の他の除外要素の扱い**:

現在の実装では、`findTables()`はコードブロックとのみ重複チェックを行います。これにより、以下の除外要素がテーブル内でも正しく検出されます：

- `findInlineCode()`: テーブルセル内のインラインコード（例: `code`）
- `findUrls()`: テーブルセル内のURL（例: https://example.com）
- `findConfigKeys()`: テーブルセル内の設定キー（例: otakLcp.enableGrammarCheck）

これらの除外要素は、`findTables()`の後に実行されるため、テーブル範囲と重複チェックが行われ、正しく検出されます。

**処理順序**（`getExcludedRanges()`内）:
1. `findCodeBlocks()` - コードブロックを検出
2. `findInlineCode()` - インラインコードを検出（コードブロックと重複チェック）
3. `findUrls()` - URLを検出（既存の除外範囲と重複チェック）
4. `findConfigKeys()` - 設定キーを検出（既存の除外範囲と重複チェック）
5. `findTables()` - テーブルを検出（コードブロックとのみ重複チェック）

この順序により、テーブル内のインラインコード、URL、設定キーも正しく除外範囲として検出されます。

### main.tsの変更

セマンティックハイライトと文法チェックで異なる除外範囲を使用するように変更します。

**変更内容**:
```typescript
// Markdown filtering
const filterResult = markdownFilter.filter(textToAnalyze);
textToAnalyze = filterResult.filteredText;
const allExcludedRanges = filterResult.excludedRanges;

// セマンティックハイライト用の除外範囲
// table タイプを除外し、table-delimiter と table-separator を含める
const semanticExcludedRanges = allExcludedRanges.filter(
  range => range.type !== 'table'
);

// 文法チェック用の除外範囲
// すべての除外範囲を使用（table タイプも含む）
const grammarExcludedRanges = allExcludedRanges;

// トークン化
let tokens = await mecabAnalyzer.analyze(textToAnalyze);

// セマンティックハイライト用のトークンフィルタリング
const semanticTokens = tokenFilter.filterTokens(tokens, semanticExcludedRanges);
documentTokens.set(uri, semanticTokens);

// 文法チェック用のトークンフィルタリング
const grammarTokens = tokenFilter.filterTokens(tokens, grammarExcludedRanges);
// grammarTokens を文法チェックに使用
```

**重要な変更点**:
1. `allExcludedRanges`から2つの異なる除外範囲リストを作成
2. セマンティックハイライト用は`table`タイプを除外（`table-delimiter`と`table-separator`は含む）
3. 文法チェック用はすべての除外範囲を使用（既存の動作を維持）
4. それぞれの用途に応じてトークンをフィルタリング

### 設定の扱い

**重要な決定**: 新しい設定は追加しません。

**理由**:
1. テーブル構造要素（区切り文字、セパレーター行）の除外は常に有効であるべき
2. これらの要素をセマンティックハイライトしても意味がない（記号なので）
3. 設定を追加すると、ユーザーの混乱を招く可能性がある

**既存の設定の動作**:
- `excludeTables`: 文法チェックでテーブル全体を除外するかどうか（既存の動作を維持）
- この設定はセマンティックハイライトには影響しない

**代替案として検討したが採用しなかった設定**:
```json
{
  "otakLcp.semanticHighlightInTables": {
    "type": "boolean",
    "default": true,
    "description": "テーブル内の日本語テキストをセマンティックハイライトする"
  }
}
```

**不採用の理由**:
- デフォルトで有効にすべき機能であり、無効にする理由がない
- 設定が増えるとメンテナンスコストが増加する
- ユーザーが設定を理解する負担が増える

## パフォーマンス考慮事項

### 現在の実装

- テーブル全体を1つの除外範囲として処理
- 除外範囲の数: テーブル数と同じ

### 新しい実装

- テーブル構造要素を個別の除外範囲として処理
- 除外範囲の数: テーブル内の区切り文字数 + セパレーター行数

### 影響

- 除外範囲の数が増加するため、`TokenFilter.filterTokens()`の処理時間が増加する可能性
- ただし、テーブル内の区切り文字は通常数十個程度なので、実用上の影響は小さい
- 必要に応じて、除外範囲の検索を最適化（例: バイナリサーチ）

## 互換性

### 後方互換性

- 既存の`excludeTables`設定は文法チェック用に保持
- 新しい`excludeTableDelimiters`設定はセマンティックハイライト用に追加
- デフォルト動作: テーブル内の日本語をセマンティックハイライト（新機能）

### 移行パス

1. 既存のユーザーは自動的に新しい動作を取得
2. 旧動作を希望する場合は`excludeTableDelimiters: false`に設定
3. 設定の説明文で新機能を案内

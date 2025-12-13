# 設計ドキュメント

## 概要

本設計では、otak-lcp拡張機能における診断範囲計算の不具合を修正します。現在、README.mdなどのMarkdownファイルを開くと、全行に単一の波線が表示される問題が発生しています。この問題は、`AdvancedRulesManager`の`fixDiagnosticRange`メソッドが診断の範囲を誤って変換していることが原因です。

## アーキテクチャ

### 現在の問題

1. **誤った判定ロジック**: `fixDiagnosticRange`メソッドは、`line: 0`をチェックしてoffsetベースかどうかを判定していますが、これは不正確です。実際の診断が行0から始まる場合、誤ってoffsetベースと判定されます。

2. **誤った変換**: `character`フィールドをoffsetとして扱っていますが、診断が既に正しい行/文字ベースの位置を持っている場合、これは誤りです。

3. **不要な変換**: 診断は既に`AdvancedGrammarRule`の実装で正しい行/文字ベースの範囲を持っているため、`fixDiagnosticRange`での変換は不要です。

### 解決策

`fixDiagnosticRange`メソッドを削除し、診断の範囲をそのまま使用します。各ルールは既に正しい範囲を生成しているため、追加の変換は不要です。

## コンポーネントとインターフェース

### 修正対象

#### AdvancedRulesManager

**変更内容:**
- `fixDiagnosticRange`メソッドを削除
- `checkText`メソッドと`checkWithRules`メソッドで、診断の範囲をそのまま使用
- デバッグログを追加して、診断の範囲を確認

**修正前:**
```typescript
private fixDiagnosticRange(diagnostic: Diagnostic): Diagnostic {
  const startOffset = diagnostic.range.start.character;
  const endOffset = diagnostic.range.end.character;

  if (diagnostic.range.start.line === 0 && diagnostic.range.end.line === 0) {
    const start = this.offsetToPosition(startOffset);
    const end = this.offsetToPosition(endOffset);
    return {
      ...diagnostic,
      range: { start, end }
    };
  }
  return diagnostic;
}
```

**修正後:**
```typescript
// メソッドを削除し、診断の範囲をそのまま使用
```

### 影響を受けるコンポーネント

#### AdvancedGrammarRule実装

各ルールは既に正しい範囲を生成しているため、変更は不要です。ただし、範囲生成ロジックが正しいことを確認する必要があります。

## データモデル

### Diagnostic

```typescript
interface Diagnostic {
  severity: DiagnosticSeverity;
  range: Range;
  message: string;
  source?: string;
  code?: string | number;
}
```

### Range

```typescript
interface Range {
  start: Position;
  end: Position;
}
```

### Position

```typescript
interface Position {
  line: number;      // 0ベースの行番号
  character: number; // 0ベースの文字位置
}
```

## 正確性プロパティ

*プロパティは、システムのすべての有効な実行において真であるべき特性または動作です。プロパティは、人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ 1: 診断範囲の保持

*任意の*診断について、`AdvancedRulesManager.checkText`を呼び出した後、診断の範囲は元のルールが生成した範囲と同じである
**検証: 要件 1.2**

### プロパティ 2: 範囲の有効性

*任意の*診断について、範囲の開始位置は終了位置以前である（`start.line < end.line` または `start.line === end.line && start.character <= end.character`）
**検証: 要件 1.1**

### プロパティ 3: 行番号の妥当性

*任意の*診断について、範囲の行番号はテキストの行数以内である
**検証: 要件 1.1**

## エラーハンドリング

### エラーケース

1. **無効な範囲**: 診断の範囲が無効な場合（開始位置が終了位置より後など）
   - 対応: エラーをログに記録し、診断をスキップ

2. **範囲外の位置**: 診断の範囲がテキストの範囲外の場合
   - 対応: エラーをログに記録し、診断をスキップ

3. **ルール実行エラー**: ルールの実行中にエラーが発生した場合
   - 対応: エラーをログに記録し、そのルールの診断をスキップ（既存の動作を維持）

## テスト戦略

### 単体テスト

1. **範囲の保持テスト**: `AdvancedRulesManager.checkText`が診断の範囲を変更しないことを確認
2. **複数診断テスト**: 複数の診断が正しい範囲で生成されることを確認
3. **エラーハンドリングテスト**: 無効な範囲を持つ診断が適切に処理されることを確認

### プロパティベーステスト

プロパティベーステストには`fast-check`ライブラリを使用します。各テストは30回の反復を実行します。

1. **プロパティ 1のテスト**: ランダムなテキストとトークンで、診断の範囲が保持されることを確認
2. **プロパティ 2のテスト**: ランダムな診断で、範囲の有効性を確認
3. **プロパティ 3のテスト**: ランダムなテキストと診断で、行番号の妥当性を確認

### 統合テスト

1. **README.mdテスト**: 実際のREADME.mdファイルで、診断が正しい位置に表示されることを確認
2. **複数ルールテスト**: 複数のルールが有効な場合、各診断が正しい範囲で生成されることを確認

## 実装の詳細

### 修正手順

1. `AdvancedRulesManager.ts`から`fixDiagnosticRange`メソッドを削除
2. `checkText`メソッドと`checkWithRules`メソッドで、`fixDiagnosticRange`の呼び出しを削除
3. 診断の範囲をそのまま`toDiagnostic()`の結果から使用
4. デバッグログを追加して、診断の範囲を確認
5. テストを実行して、修正が正しいことを確認

### デバッグログの追加

```typescript
for (const rule of enabledRules) {
  try {
    const ruleDiagnostics = rule.check(tokens, context);
    for (const diag of ruleDiagnostics) {
      const diagnostic = diag.toDiagnostic();
      connection.console.log(
        `[DEBUG] Diagnostic from ${rule.name}: ` +
        `line ${diagnostic.range.start.line}:${diagnostic.range.start.character} - ` +
        `line ${diagnostic.range.end.line}:${diagnostic.range.end.character}`
      );
      diagnostics.push(diagnostic);
    }
  } catch (error) {
    console.error(`Error in rule ${rule.name}:`, error);
  }
}
```

## パフォーマンス考慮事項

- `fixDiagnosticRange`メソッドの削除により、診断生成のパフォーマンスが向上します
- 不要な位置変換が削除されるため、CPU使用率が減少します

## セキュリティ考慮事項

本修正はセキュリティに影響しません。

## 今後の拡張

- 診断の範囲検証ロジックを追加して、無効な範囲を早期に検出
- 診断の範囲を視覚的に確認するためのデバッグツールを追加

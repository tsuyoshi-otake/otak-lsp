---
inclusion: always
---

# Property-Based Testing (PBT) 設定

Property-Based Testingを実装する際は、以下の設定を使用してください。

## 基本設定

- テスト実行回数: 30回をデフォルトとする
- fast-checkを使用する場合: `fc.assert(property, { numRuns: 30 })`
- その他のPBTライブラリでも同様に30回の実行を設定する

## 例

```typescript
// fast-checkの例
fc.assert(
  fc.property(fc.integer(), (n) => {
    // テストロジック
  }),
  { numRuns: 30 }
);
```

## 注意事項

- 特別な理由がない限り、30回の実行回数を維持する
- より厳密なテストが必要な場合は、明示的に回数を増やすことも可能

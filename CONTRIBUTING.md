# コントリビューションガイド

otak-lsp は **実装を真実源（source of truth）** とし、ドキュメントは可能な限り自動生成・自動検証します。
README やドキュメントを手で実装に追従させるのではなく、生成物とCIガードで乖離を防ぎます。

## 真実源とドキュメントの対応

| ドキュメント | 真実源 | 生成 | 検証 |
|---|---|---|---|
| `docs/configuration.md`（全設定） | `package.json` の `contributes.configuration` | `npm run docs:config` | `npm run check:config` |
| `docs/rules.md`（全ルール） | `server/src/grammar/advancedRuleRegistry.ts` / `checker.ts` | `npm run docs:rules` | `npm run check:rules` |
| 用語図鑑カテゴリ（README表） | `server/src/hover/generatedGlossaryData/` ほか辞書データ | （手動） | `npm run audit:glossary -- --strict` |
| Detection Coverage（README） | `server/src/grammar/evals/ng-examples-data.ts` | `npm run evals:update-readme` | （evals） |

まとめて検証: `npm run check:consistency`（CIでも実行されます）。

## よくある変更の手順

### 設定（`otakLsp.*`）を追加・変更したとき

1. `package.json` の `contributes.configuration.properties` に追加する
2. `npm run docs:config` で `docs/configuration.md` を再生成する
3. ランタイム既定値（`shared/src/**` の DEFAULT_*）と package.json の `default` が一致しているか確認する
4. 代表的な設定なら README の設定表にも追記する（完全版は生成物に任せる）

### 文法ルールを追加・変更したとき

1. ルール実装を追加し、`advancedRuleRegistry.ts` の `createDefaultAdvancedRules()` に登録する
2. ルールの `isEnabled()` が参照する設定キーを `package.json` に追加する
3. `npm run docs:rules` で `docs/rules.md` を再生成する
4. ルール数が変わる場合は README の「高度ルールN種」も更新する
   （`rulesCount.readme.test.ts` が一致を強制します）
5. evals（`ng-examples-data.ts`）に検出例を追加し、`npm run evals:update-readme` で Coverage を更新する

### 用語図鑑カテゴリを追加・変更したとき

1. 辞書データ（`generatedGlossaryData/` など）と `GlossaryId` 型・`GLOSSARY_GROUPS` を追加する
2. `package.json` の `enabledGlossaries` enum と README の用語図鑑表を更新する
3. `npm run audit:glossary` で 型/データ/enum/README の整合性を確認する
   - データを伴わない「整備中」カテゴリは `scripts/audit-glossary.ts` の `KNOWN_EMPTY_TYPED`
     allowlist に入れる。データを追加したら allowlist から外す（`--strict` が残置を検出します）

## コミット前のチェック

```bash
npm run lint
npm run check:consistency
npm test
```

README を変更した場合は `readme.regression.test.ts` のスナップショット更新が必要になることがあります
（`npx jest server/src/grammar/readme.regression.test.ts -u`）。意図した変更であることを確認してから更新してください。

## 大きな機能追加

このリポジトリは Kiro 流の仕様駆動開発（`.kiro/specs/`）を採用しています。
新しい文法ルール群のような、診断の挙動を大きく変える機能は、
`/kiro:spec-init` から仕様→設計→タスクの順で進めることを推奨します。

### インライン抑制ディレクティブ

特定行・特定ルールの診断を抑制する `otak-lsp-disable-next-line` などのディレクティブを
サポートしています（実装: `server/src/grammar/suppressionDirectives.ts`）。走査は原文に対して
行い、Markdown の `<!-- -->` でも各言語のコメントでも機能します。拡張機能本体（`documentAnalyzer`）
と README ドッグフード経路（`check-readme` / `readme.regression`）の両方で同じ抑制が適用されます。
使い方は README「特定の箇所だけ警告を抑制したい（インライン抑制）」を参照してください。

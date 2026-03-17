# 実装計画: 用語図鑑カテゴリ再整備

## 概要

用語図鑑（Glossary）システムのカテゴリ管理を再整備する。GlossaryIdとBASE_GLOSSARIESの整合性確保、package.jsonの同期、Category_Groupの導入、辞書タイトル統一、重複検出テスト、優先度制御の拡張を段階的に実装する。設計ドキュメントのコンポーネント設計に従い、後方互換性を維持しながら変更を適用する。

## タスク

- [x] 1. 型定義の拡張とenterpriseArch登録
  - [x] 1.1 `shared/src/types.ts`のGlossaryId型に`enterpriseArch`を追加する
    - 既存のGlossaryId union typeの末尾に`| 'enterpriseArch'`を追加
    - _要件: 1.1, 1.4_
  - [x] 1.2 `shared/src/types.ts`にGlossaryGroupId型、GlossaryGroupDefinition型、GLOSSARY_GROUPS定数を追加する
    - 設計ドキュメントのコンポーネント§1に従い、15グループの定義を実装
    - `GlossaryGroupId`はunion type、`GlossaryGroupDefinition`はinterface、`GLOSSARY_GROUPS`はReadonlyArray定数
    - _要件: 3.1, 3.4_
  - [x] 1.3 `shared/src/types.ts`のConfiguration型のhoverフィールドに`enabledGlossaryGroups: GlossaryGroupId[]`を追加する
    - _要件: 3.2_

- [x] 2. enterpriseArchGlossaryの登録と辞書タイトル統一
  - [x] 2.1 `server/src/hover/glossary.ts`に`enterpriseArchGlossary.ts`をインポートし、BASE_GLOSSARIESに登録する
    - id: `'enterpriseArch'`、title: `'エンタープライズアーキテクチャ用語図鑑'`
    - 既存CLI辞書と同様に`as unknown as GlossaryEntry[]`でキャスト
    - _要件: 1.2, 1.4_
  - [x] 2.2 BASE_GLOSSARIESの辞書タイトルを「〇〇用語図鑑」形式に統一する
    - `pip/Python用語図鑑` → `pip・Python用語図鑑`（スラッシュを中黒に変更）
    - 全タイトルが「用語図鑑」で終わることを確認し、不統一があれば修正
    - _要件: 5.1, 5.2, 5.3_

- [x] 3. package.jsonのenum/default完全同期
  - [x] 3.1 `package.json`の`otakLsp.hover.enabledGlossaries`のenum配列にCLI系16カテゴリ + enterpriseArchを追加する
    - 追加対象: git, npm, yarn, pnpm, pip, docker, linux, windows, powershell, oracle, mysql, javaCli, maven, gradle, devProcess, ipaMetrics, enterpriseArch
    - _要件: 2.1_
  - [x] 3.2 `package.json`の`otakLsp.hover.enabledGlossaries`のdefault配列をグループ優先度順に再構成する
    - 設計ドキュメントのpackage.json§4のdefault配列に従い、クラウドサービス系を末尾に配置
    - _要件: 2.2_
  - [x] 3.3 `package.json`に`otakLsp.hover.enabledGlossaryGroups`設定を新規追加する
    - type: array、items.enum: 15グループID、default: 全グループ有効
    - description: 日本語で記述
    - _要件: 3.1, 3.2_

- [x] 4. チェックポイント - 型定義とpackage.json同期の確認
  - すべてのテストが通ることを確認し、疑問があればユーザーに質問する。

- [x] 5. createGlossaryRankのCategory_Groupベース拡張
  - [x] 5.1 `server/src/hover/glossary.ts`の`createGlossaryRank`関数をGLOSSARY_GROUPSのpriority順ベースに書き換える
    - `shared/src/types.ts`からGLOSSARY_GROUPSをインポート
    - グループのpriority順にソートし、グループ内はmembers配列の順序を維持
    - どのグループにも属さないカテゴリは末尾に配置
    - 設計ドキュメントのコンポーネント§2bの擬似コードに従う
    - _要件: 7.1, 7.2, 7.3, 7.4_
  - [x] 5.2 `DEFAULT_ENABLED_GLOSSARIES`を`createGlossaryRank`ベースのソートに書き換える
    - `PROVIDER_SERVICE_GLOSSARIES`ベースの旧ソートを廃止
    - 設計ドキュメントのコンポーネント§2cに従う
    - _要件: 7.3_
  - [ ]* 5.3 `createGlossaryRank`のプロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 7: グループ内カテゴリの登録順序保持**
    - fast-checkでランダムなenabledGlossaries配列を生成し、createGlossaryRankの結果がグループ内順序を保持することを検証
    - numRuns: 30
    - **検証対象: 要件 7.2**

- [x] 6. HoverProviderへのグループ設定統合
  - [x] 6.1 `server/src/hover/provider.ts`のHoverProviderに`setEnabledGlossaryGroups`メソッドを追加する
    - GLOSSARY_GROUPSからグループメンバーを展開して有効化
    - 個別カテゴリ設定（enabledGlossaries）がグループ設定より優先される
    - 設計ドキュメントのコンポーネント§3に従う
    - _要件: 3.2, 3.3_
  - [x] 6.2 `server/src/server/configManager.ts`で`enabledGlossaryGroups`設定の読み取りと適用を追加する
    - `getSetting(settings, 'hover.enabledGlossaryGroups')`で設定を取得
    - `hoverProvider.setEnabledGlossaryGroups()`を呼び出し
    - Configuration型の初期値にenabledGlossaryGroups（全グループ有効）を設定
    - _要件: 3.2, 3.3_
  - [ ]* 6.3 グループ展開と個別カテゴリ優先のプロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 2: グループ展開の完全性**
    - fast-checkでランダムなGlossaryGroupIdの部分集合を生成し、展開結果が全メンバーを含むことを検証
    - numRuns: 30
    - **検証対象: 要件 3.2**
  - [ ]* 6.4 個別カテゴリ設定のグループ設定に対する優先のプロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 3: 個別カテゴリ設定のグループ設定に対する優先**
    - fast-checkでランダムなグループ設定と個別カテゴリ設定を生成し、個別設定が優先されることを検証
    - numRuns: 30
    - **検証対象: 要件 3.3**

- [x] 7. チェックポイント - コア機能の確認
  - すべてのテストが通ることを確認し、疑問があればユーザーに質問する。

- [ ] 8. 整合性テストと重複検出テスト
  - [ ] 8.1 `server/src/hover/glossary.test.ts`に整合性テストを追加する
    - enterpriseArchがBASE_GLOSSARIESに登録されていることを確認
    - GLOSSARY_GROUPSの全メンバーがBASE_GLOSSARIESに存在することを確認
    - 全GlossaryDefinitionのtitleが「用語図鑑」で終わることを確認
    - _要件: 1.2, 1.4, 3.1, 5.1_
  - [ ] 8.2 `server/src/hover/glossary.test.ts`に重複エントリ検出テストを追加する
    - 全GlossaryDefinition間で重複するterm（正規化後）を検出し、テスト出力で報告
    - 重複の存在自体はエラーではなく、意図的な重複を許容する（console.logで報告のみ）
    - _要件: 6.1, 6.2, 6.3_
  - [ ] 8.3 `server/src/hover/glossary.test.ts`にcreateGlossaryRankの単体テストを追加する
    - クラウドサービスグループのランクが他のグループより大きいことを確認
    - DEFAULT_ENABLED_GLOSSARIESの順序がグループ優先度に従うことを確認
    - _要件: 7.1, 7.2, 7.3_
  - [ ]* 8.4 package.jsonとGlossaryIdの完全同期プロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 1: package.jsonとGlossaryIdの完全同期**
    - BASE_GLOSSARIESからランダムにIDを選択し、package.jsonのenum/default配列に含まれることを検証
    - numRuns: 30
    - **検証対象: 要件 2.1, 2.2**
  - [ ]* 8.5 GlossaryIdの命名規則準拠プロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 4: GlossaryIdの命名規則準拠**
    - BASE_GLOSSARIESの全IDに対してcamelCase正規表現でマッチすることを検証
    - numRuns: 30
    - **検証対象: 要件 4.1**
  - [ ]* 8.6 辞書タイトルの形式統一プロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 5: 辞書タイトルの形式統一**
    - BASE_GLOSSARIESの全GlossaryDefinitionのtitleが「用語図鑑」で終わることを検証
    - numRuns: 30
    - **検証対象: 要件 5.1**
  - [ ]* 8.7 重複エントリの優先度解決プロパティベーステストを作成する（`server/src/hover/glossary.property.test.ts`）
    - **Property 6: 重複エントリの優先度解決**
    - fast-checkでランダムなランク設定を生成し、重複termに対してbestHitForCandidateが最高優先度のエントリを返すことを検証
    - numRuns: 30
    - **検証対象: 要件 6.1**

- [ ] 9. 最終チェックポイント - 全テスト通過確認
  - すべてのテストが通ることを確認し、疑問があればユーザーに質問する。

## 備考

- `*`マーク付きタスクはオプションであり、MVP達成のためにスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントで段階的に品質を検証
- プロパティベーステストは正当性プロパティの機械的検証を提供
- 単体テストは具体的なケースとエッジケースを検証

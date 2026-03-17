# 要件ドキュメント: 用語図鑑カテゴリ再整備

## はじめに

otak-lspの用語図鑑（Glossary）システムは、ホバー時にオフラインIT用語辞書を表示する機能である。現在50以上のカテゴリが存在するが、以下の問題が確認されている:

1. **カテゴリ分類の不整合**: 粒度がバラバラ（「IT用語図鑑」のような大分類と「Maven用語図鑑」のような極小分類が混在）
2. **未登録辞書の存在**: `enterpriseArchGlossary.ts`がファイルとして存在するが`glossary.ts`にインポートされておらず、`GlossaryId`型にも未定義
3. **package.jsonとの不整合**: CLI系辞書（git, npm, yarn, pnpm, pip, docker, linux, windows, powershell, oracle, mysql, javaCli, maven, gradle, devProcess, ipaMetrics）が`package.json`のenum/defaultに含まれていない
4. **上位カテゴリの欠如**: ユーザーが「パッケージマネージャ系」「データベース系」「クラウドサービス系」のように論理グループで一括ON/OFFできない
5. **カテゴリ名の一貫性不足**: 一部はドメイン名（`git`）、一部は複合概念（`observabilitySre`）、一部はプロダクト名（`nextjs`）と命名規則が統一されていない

本要件は、これらの問題を解決し、ユーザーにとって直感的で保守しやすいカテゴリ体系を構築することを目的とする。

## 用語集

- **Glossary_System**: otak-lspの用語図鑑機能全体。`server/src/hover/glossary.ts`を中心に、各ドメイン別辞書ファイルとVS Code設定で構成される
- **GlossaryId**: `shared/src/types.ts`で定義される用語図鑑カテゴリの識別子型（TypeScript union type）
- **GlossaryDefinition**: 各カテゴリの定義（id, title, entries）を持つインターフェース
- **BASE_GLOSSARIES**: `glossary.ts`内で定義される全カテゴリの配列
- **Category_Group**: 複数のGlossaryIdを論理的にまとめた上位分類（新規導入）
- **package_json_enum**: `package.json`の`otakLsp.hover.enabledGlossaries`設定で使用可能なカテゴリ一覧
- **Console_Glossary**: クラウドプロバイダーのコンソール用語辞書（AWS/Azure/GCP/OCI/Cloudflare）

## 要件

### 要件 1: GlossaryIdとBASE_GLOSSARIESの整合性確保

**ユーザーストーリー:** 開発者として、すべての辞書ファイルがGlossary_Systemに正しく登録されている状態にしたい。辞書ファイルが存在するのに使われていない状態を解消するため。

#### 受入基準

1. THE Glossary_System SHALL 全ての辞書ファイル（`server/src/hover/*Glossary.ts`）に対応するGlossaryIdを`shared/src/types.ts`に定義する
2. THE Glossary_System SHALL 全てのGlossaryIdに対応するエントリをBASE_GLOSSARIESに登録する
3. WHEN 新しい辞書ファイルが追加された場合、THE Glossary_System SHALL GlossaryId型、BASE_GLOSSARIES、package_json_enumの3箇所すべてに登録を要求する
4. THE Glossary_System SHALL `enterpriseArchGlossary.ts`をGlossaryIdに`enterpriseArch`として追加し、BASE_GLOSSARIESに登録する

### 要件 2: package.jsonのenum/default同期

**ユーザーストーリー:** ユーザーとして、VS Codeの設定UIですべての用語図鑑カテゴリを選択・解除できるようにしたい。現在CLI系辞書が設定UIに表示されないため。

#### 受入基準

1. THE package_json_enum SHALL GlossaryId型に定義されたすべてのカテゴリを含む
2. THE package_json_enum SHALL defaultリストにすべてのカテゴリを含む（クラウドサービス系を除く。クラウドサービス系は現行の優先度制御を維持する）
3. WHEN GlossaryIdに新しいカテゴリが追加された場合、THE package_json_enum SHALL 同じカテゴリをenumとdefaultに追加する

### 要件 3: カテゴリグループの導入

**ユーザーストーリー:** ユーザーとして、関連するカテゴリをグループ単位で一括ON/OFFしたい。50以上のカテゴリを個別に管理するのは煩雑であるため。

#### 受入基準

1. THE Glossary_System SHALL 以下のCategory_Groupを定義する:
   - `基盤・インフラ`: cloud, containersK8s, linux, windows, powershell, docker, iotEmbedded
   - `クラウドサービス`: awsServices, azureServices, gcpServices, ociServices, cloudflareServices
   - `開発言語・フレームワーク`: java, javaCli, nextjs, dotnet, pip
   - `パッケージマネージャ・ビルドツール`: npm, yarn, pnpm, maven, gradle
   - `データベース`: dbSqlTx, oracle, mysql
   - `バージョン管理`: git
   - `設計・アーキテクチャ`: ddd, tdd, architecturePatterns, distributedSystems, enterpriseArch
   - `セキュリティ・認証`: security, authIam
   - `ネットワーク・API`: networkHttp, apiDesign
   - `運用・監視`: devopsCicd, observabilitySre, performanceCache
   - `メッセージング`: messagingEda
   - `AI・機械学習`: aiLlm
   - `プロジェクト管理・プロセス`: pmbok, agileProduct, devProcess, ipaMetrics, contractLegal
   - `Web開発`: backend, frontend
   - `一般`: it, otakLspSettings
2. WHEN ユーザーがCategory_Groupを指定した場合、THE Glossary_System SHALL そのグループに属するすべてのカテゴリを一括で有効化または無効化する
3. THE Glossary_System SHALL 個別カテゴリの設定がCategory_Groupの設定より優先されるようにする
4. THE Glossary_System SHALL Category_Groupの定義を`shared/src/types.ts`に型として追加する

### 要件 4: カテゴリ名の一貫性改善

**ユーザーストーリー:** 開発者として、カテゴリIDの命名規則を統一したい。コードの可読性と保守性を向上させるため。

#### 受入基準

1. THE Glossary_System SHALL 以下の命名規則に従うGlossaryIdを使用する:
   - ドメイン単体: camelCase（例: `git`, `docker`, `linux`）
   - 複合ドメイン: camelCase結合（例: `networkHttp`, `dbSqlTx`）
   - サービス系: `[プロバイダ]Services`（例: `awsServices`, `azureServices`）
2. THE Glossary_System SHALL 既存のGlossaryIdの後方互換性を維持する（既存IDの変更は行わない）
3. WHEN 新しいGlossaryIdを追加する場合、THE Glossary_System SHALL 上記命名規則に従う

### 要件 5: 辞書タイトルの日本語表記統一

**ユーザーストーリー:** ユーザーとして、ホバー表示で辞書名が統一されたフォーマットで表示されてほしい。現在「〇〇用語図鑑」と「〇〇用語集」が混在しているため。

#### 受入基準

1. THE Glossary_System SHALL すべてのGlossaryDefinitionのtitleを「〇〇用語図鑑」の形式に統一する
2. THE Glossary_System SHALL titleに含まれるドメイン名を日本語で表記する（英語の正式名称がある場合は括弧で併記可）
3. IF titleが「〇〇用語図鑑」以外の形式である場合、THEN THE Glossary_System SHALL 「〇〇用語図鑑」形式に修正する

### 要件 6: 辞書エントリの重複検出と解消

**ユーザーストーリー:** 開発者として、複数のカテゴリに同一用語が重複登録されている状態を検出・管理したい。ホバー表示で意図しないカテゴリの説明が表示されることを防ぐため。

#### 受入基準

1. THE Glossary_System SHALL 同一のterm（正規化後）が複数のGlossaryDefinitionに存在する場合、glossaryRankに基づいて最も優先度の高いカテゴリのエントリを表示する
2. THE Glossary_System SHALL 重複エントリの検出機能をテストとして実装する（重複の存在自体はエラーではなく、意図的な重複を許容する）
3. WHEN 重複エントリが検出された場合、THE Glossary_System SHALL テスト出力で重複箇所を報告する

### 要件 7: DEFAULT_ENABLED_GLOSSARIESの優先度制御の改善

**ユーザーストーリー:** 開発者として、デフォルト有効カテゴリの優先度ロジックを明確にしたい。現在はクラウドサービス系を後方に配置するだけの単純なソートだが、Category_Group導入に伴い優先度制御を拡張するため。

#### 受入基準

1. THE Glossary_System SHALL Category_Groupごとに優先度の重みを設定可能にする
2. THE Glossary_System SHALL 同一グループ内のカテゴリは登録順で優先度を決定する
3. THE Glossary_System SHALL クラウドサービスグループのカテゴリを他のグループより低い優先度に設定する（現行動作の維持）
4. THE Glossary_System SHALL 優先度の決定ロジックを`createGlossaryRank`関数に集約する

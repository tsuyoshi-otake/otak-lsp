# 要件定義書

## はじめに

otak-lspの用語図鑑（Glossary）システムにおいて、既存の手動定義された辞書データ（BASE_GLOSSARIES内のインラインエントリおよび個別辞書ファイル）をすべて削除し、`ja.json`（9,552エントリ、226ドメイン）を唯一のデータソースとして辞書を再構築する。既存の検索・マッチング関数（`glossary.ts`）、型定義（`GlossaryEntry`）、consoleGlossaryBuilder、termNotationDictionary統合の仕組みは維持する。

## 用語集

- **Glossary_System**: otak-lspのホバー時に表示される用語図鑑システム全体（`server/src/hover/`配下）
- **BASE_GLOSSARIES**: `glossaryData.ts`内で定義される`GlossaryDefinition`の配列。用語表記統一統合前の基本辞書データ
- **GlossaryEntry**: 用語辞書の1エントリ（`term`, `aliases?`, `synonyms?`, `antonyms?`, `description`）
- **GlossaryDefinition**: カテゴリID・タイトル・エントリ配列を持つ辞書定義（`id: GlossaryId`, `title`, `entries`）
- **GlossaryId**: `shared/src/types.ts`で定義されるカテゴリIDのリテラルユニオン型
- **Ja_JSON**: プロジェクトルートの`ja.json`ファイル。9,552エントリ、226ドメインを持つ日本語用語辞書
- **Domain_Mapping**: `ja.json`の226ドメインを既存の`GlossaryId`カテゴリにマッピングする対応表
- **GLOSSARY_INDEX**: 正規化キーから`GlossaryHit`配列への検索用インデックス
- **Console_Glossary_Builder**: AWSコンソール等のクラウドサービス用語を動的生成する仕組み（`consoleGlossaryBuilder.ts`）
- **Term_Notation_Integration**: 用語表記統一辞書をBASE_GLOSSARIESに統合する仕組み（`mergeTermNotationIntoGlossaries`関数）
- **Converter**: `ja.json`を読み込み、`GlossaryEntry`配列に変換するモジュール
- **Individual_Glossary_Files**: `gitGlossary.ts`、`npmGlossary.ts`等の個別辞書ファイル群

## 要件

### 要件1: ja.jsonからGlossaryEntryへの変換

**ユーザーストーリー:** 開発者として、ja.jsonの各エントリをGlossaryEntry形式に変換したい。それにより、既存の検索・表示システムとの互換性を保ちながら大規模辞書データを利用できる。

#### 受け入れ基準

1. WHEN Converter がja.jsonの1エントリを処理する場合、THE Converter SHALL `term`フィールドをそのまま`GlossaryEntry.term`に設定する
2. WHEN Converter がja.jsonの`normalizedTerms`を処理する場合、THE Converter SHALL `term`本体と`reading`を除いた残りの要素を`GlossaryEntry.aliases`に設定する
3. WHEN Converter がja.jsonの単一senseを持つエントリを処理する場合、THE Converter SHALL `senses[0].definition`を`GlossaryEntry.description`に設定する
4. WHEN Converter がja.jsonの複数senseを持つエントリを処理する場合、THE Converter SHALL 各senseの`definition`をドメイン名付きで結合し`GlossaryEntry.description`に設定する
5. WHEN Converter が`normalizedTerms`から`aliases`を生成する場合、THE Converter SHALL `term`と完全一致する要素および`reading`と完全一致する要素を除外する
6. WHEN Converter が生成した`aliases`が空配列になる場合、THE Converter SHALL `aliases`フィールドを`undefined`に設定する

### 要件2: ドメインからGlossaryIdへのマッピング

**ユーザーストーリー:** 開発者として、ja.jsonの226ドメインを既存のGlossaryIdカテゴリに適切にマッピングしたい。それにより、既存のカテゴリ体系と設定システムとの整合性を保てる。

#### 受け入れ基準

1. THE Domain_Mapping SHALL ja.jsonの全226ドメインを既存の`GlossaryId`のいずれかに対応付ける
2. THE Domain_Mapping SHALL 意味的に近いドメインを同一の`GlossaryId`にグルーピングする（例: `software-engineering`、`programming`、`testing`を`it`に対応付ける）
3. THE Domain_Mapping SHALL 既存の`GlossaryId`に適切な対応先がないドメインについて、新しい`GlossaryId`を追加するか、最も近い既存カテゴリに割り当てる
4. WHEN 新しい`GlossaryId`を追加する場合、THE Glossary_System SHALL `shared/src/types.ts`の`GlossaryId`型、`GlossaryGroupDefinition`、`GLOSSARY_GROUPS`を更新する
5. THE Domain_Mapping SHALL 1つのドメインが複数の`GlossaryId`にマッピングされることを許容しない（1対1マッピング）
6. WHEN ja.jsonのエントリが複数senseを持ち各senseが異なるドメインに属する場合、THE Converter SHALL 最初のsenseのドメインに基づいてカテゴリを決定する

### 要件3: 既存辞書データの削除

**ユーザーストーリー:** 開発者として、既存の手動定義された辞書データを削除したい。それにより、ja.jsonベースの辞書データとの重複や不整合を防げる。

#### 受け入れ基準

1. THE Glossary_System SHALL BASE_GLOSSARIES内の全カテゴリのインラインエントリ（`entries`配列の中身）を削除する
2. THE Glossary_System SHALL 個別辞書ファイル（`gitGlossary.ts`、`npmGlossary.ts`、`dockerGlossary.ts`、`linuxGlossary.ts`、`windowsGlossary.ts`、`powershellGlossary.ts`、`oracleGlossary.ts`、`mysqlGlossary.ts`、`javaCliGlossary.ts`、`mavenGlossary.ts`、`gradleGlossary.ts`、`devProcessGlossary.ts`、`ipaMetricsGlossary.ts`、`enterpriseArchGlossary.ts`、`yarnGlossary.ts`、`pnpmGlossary.ts`、`pipGlossary.ts`）を削除する
3. THE Glossary_System SHALL `otakLspSettings`カテゴリのエントリは削除対象から除外する（ja.jsonに含まれないotak-lsp固有の設定用語であるため）
4. THE Glossary_System SHALL `consoleGlossaryBuilder.ts`による動的生成の仕組みを維持する
5. THE Glossary_System SHALL `mergeTermNotationIntoGlossaries`関数による用語表記統一統合の仕組みを維持する

### 要件4: ja.jsonデータのロードと統合

**ユーザーストーリー:** 開発者として、ja.jsonから変換されたデータをBASE_GLOSSARIESに統合したい。それにより、既存のGLOSSARY_INDEX構築やホバー表示の仕組みがそのまま動作する。

#### 受け入れ基準

1. THE Glossary_System SHALL ja.jsonをビルド時またはモジュール初期化時に読み込み、GlossaryIdごとにグルーピングされた`GlossaryEntry`配列を生成する
2. THE Glossary_System SHALL 生成された各カテゴリの`GlossaryEntry`配列をBASE_GLOSSARIESの対応する`GlossaryDefinition.entries`に設定する
3. THE Glossary_System SHALL ja.jsonから生成されたエントリと`consoleGlossaryBuilder`で生成されたエントリを`mergeGlossaryEntries`で統合する（既存パターンの維持）
4. THE Glossary_System SHALL ja.jsonから生成されたエントリと`termNotationDictionary`統合後のエントリが正しくGLOSSARY_INDEXに登録される
5. WHILE ja.jsonのロードが完了した状態で、THE Glossary_System SHALL 全9,552エントリ（重複統合後）がGLOSSARY_INDEXから検索可能である
6. THE Glossary_System SHALL ja.jsonのデータをTypeScriptソースコードとして生成する（ランタイムでのJSONファイル読み込みではなく、ビルド時に静的データとして埋め込む）

### 要件5: 既存インターフェースの互換性維持

**ユーザーストーリー:** 開発者として、辞書データの再構築後も既存の検索・表示機能が正常に動作することを確認したい。それにより、ユーザーに影響を与えずにデータソースを切り替えられる。

#### 受け入れ基準

1. THE Glossary_System SHALL `glossary.ts`の公開関数（`findGlossaryHit`、`findGlossaryMatch`、`findGlossaryHitWithRank`、`findGlossaryMatchWithRank`、`hasGlossaryEntry`、`getGlossaryEntryCount`、`getGlossaryDefinitions`、`createGlossaryRank`）のシグネチャを変更しない
2. THE Glossary_System SHALL `glossaryTypes.ts`の型定義（`GlossaryHit`、`GlossaryMatch`、`GlossaryEntry`、`GlossaryDefinition`）を変更しない
3. THE Glossary_System SHALL `glossaryUtils.ts`の公開関数（`normalizeKey`、`mergeGlossaryEntries`、`mergeStringArrays`）のシグネチャを変更しない
4. THE Glossary_System SHALL `glossaryData.ts`のエクスポート（`GLOSSARIES`、`DEFAULT_ENABLED_GLOSSARIES`、`GLOSSARY_INDEX`）のシグネチャを変更しない
5. THE Glossary_System SHALL `package.json`の`contributes.configuration`における`otakLsp.hover.enabledGlossaries`の設定項目を、新しいGlossaryIdに合わせて更新する
6. THE Glossary_System SHALL `GLOSSARY_GROUPS`定義を新しいGlossaryIdに合わせて更新する

### 要件6: 変換スクリプトの提供

**ユーザーストーリー:** 開発者として、ja.jsonからTypeScriptソースコードを生成するスクリプトを利用したい。それにより、ja.jsonの更新時に辞書データを再生成できる。

#### 受け入れ基準

1. THE Converter SHALL コマンドラインから実行可能なNode.jsスクリプトとして提供される
2. WHEN スクリプトが実行された場合、THE Converter SHALL ja.jsonを読み込み、GlossaryIdごとにグルーピングされたTypeScriptファイルを生成する
3. THE Converter SHALL 生成するファイルにドメインマッピング情報をコメントとして含める
4. WHEN ja.jsonに未知のドメインが含まれる場合、THE Converter SHALL 警告メッセージを出力し、そのエントリをフォールバックカテゴリ（`it`）に割り当てる
5. THE Converter SHALL 生成されたファイルが既存の`glossaryData.ts`のインポート構造と互換性を持つ形式で出力する
6. THE Converter SHALL 複数senseを持つエントリの`description`結合時に、各ドメイン名を日本語ラベルとして付与する（例: 「【バックエンド】定義1 【プロダクト】定義2」）

### 要件7: テストによる品質保証

**ユーザーストーリー:** 開発者として、辞書再構築後のデータ品質をテストで検証したい。それにより、変換の正確性とシステム全体の整合性を保証できる。

#### 受け入れ基準

1. THE Glossary_System SHALL ja.jsonの全エントリがGLOSSARY_INDEXに登録されていることを検証するテストを持つ
2. THE Glossary_System SHALL 各GlossaryIdカテゴリに1つ以上のエントリが存在することを検証するテストを持つ
3. THE Glossary_System SHALL `normalizedTerms`から生成された`aliases`でGLOSSARY_INDEXを検索できることを検証するテストを持つ
4. THE Glossary_System SHALL 複数senseを持つエントリの`description`が正しく結合されていることを検証するテストを持つ
5. FOR ALL 有効な`GlossaryEntry`について、`normalizeKey(entry.term)`でGLOSSARY_INDEXを検索した結果が当該エントリを含む（ラウンドトリッププロパティ）
6. FOR ALL `GlossaryId`カテゴリについて、`getGlossaryDefinitions()`の結果に当該カテゴリが含まれ、`entryCount`が0より大きい

# Requirements Document

## Introduction

公文書（公用文）作成における表記・用語ルールをチェックする機能を追加する。文化審議会建議「公用文作成の考え方」（2022年）および内閣告示（常用漢字表、送り仮名の付け方など）を根拠とし、公文書作成者が正確な表記を行えるよう支援する。

本機能は、既存の文法チェック機能（AdvancedRulesManager）に新しいルールとして追加し、設定でON/OFFを切り替えられるようにする。

## Glossary

- **Official_Document_Checker**: 公文書表記ルールをチェックするシステム
- **Conjunction_Validator**: 接続詞（及び/並びに、又は/若しくは）の使い分けを検証するコンポーネント
- **Jouyou_Kanji_Checker**: 常用漢字表に基づき、常用漢字外の漢字を検出するコンポーネント
- **Bullet_Punctuation_Checker**: 箇条書き項目の句点有無を検出するコンポーネント
- **Token**: kuromoji.jsによる形態素解析結果の単位
- **Diagnostic**: LSPの診断情報（警告・エラー）

## Requirements

### Requirement 1: 「及び/並びに」使い分けチェック

**User Story:** As a 公文書作成者, I want to 「及び」と「並びに」の使い分けをチェックしてもらいたい, so that 公用文の接続詞ルールに準拠した文書を作成できる。

#### Acceptance Criteria

1. WHEN 文中に「及び」または「並びに」が出現する THEN THE Conjunction_Validator SHALL 使用箇所を検出する
2. WHEN 同一文中に「及び」と「並びに」が混在する THEN THE Conjunction_Validator SHALL 階層構造の妥当性を検証する
3. WHEN 「並びに」が単独で使用されている（「及び」なしで） THEN THE Conjunction_Validator SHALL 警告を出力する
4. WHEN 「及び」のみで3つ以上の要素を並列している THEN THE Conjunction_Validator SHALL 「並びに」の使用を提案する
5. IF 検出された問題がある THEN THE Official_Document_Checker SHALL 診断メッセージに根拠（公用文作成の考え方）を含める

### Requirement 2: 「又は/若しくは」使い分けチェック

**User Story:** As a 公文書作成者, I want to 「又は」と「若しくは」の使い分けをチェックしてもらいたい, so that 選択肢の階層構造を正しく表現できる。

#### Acceptance Criteria

1. WHEN 文中に「又は」または「若しくは」が出現する THEN THE Conjunction_Validator SHALL 使用箇所を検出する
2. WHEN 同一文中に「又は」と「若しくは」が混在する THEN THE Conjunction_Validator SHALL 階層構造の妥当性を検証する
3. WHEN 「若しくは」が単独で使用されている（「又は」なしで） THEN THE Conjunction_Validator SHALL 警告を出力する
4. WHEN 「又は」のみで3つ以上の選択肢を並列している THEN THE Conjunction_Validator SHALL 「若しくは」の使用を提案する
5. IF 検出された問題がある THEN THE Official_Document_Checker SHALL 診断メッセージに根拠（公用文作成の考え方）を含める

### Requirement 3: 常用漢字外検出

**User Story:** As a 公文書作成者, I want to 常用漢字表にない漢字を検出してもらいたい, so that 公文書で使用すべきでない漢字を避けられる。

#### Acceptance Criteria

1. WHEN テキスト中に漢字が出現する THEN THE Jouyou_Kanji_Checker SHALL 各漢字が常用漢字表に含まれるか判定する
2. WHEN 常用漢字表にない漢字が検出された THEN THE Jouyou_Kanji_Checker SHALL 警告を出力する
3. WHEN 常用漢字外の漢字に対して THEN THE Jouyou_Kanji_Checker SHALL 可能であればひらがな表記または代替漢字を提案する
4. WHILE 固有名詞（人名・地名・組織名）を処理する THEN THE Jouyou_Kanji_Checker SHALL 警告を抑制するオプションを提供する
5. THE Jouyou_Kanji_Checker SHALL 常用漢字表（平成22年内閣告示第2号）の2136字を基準とする

### Requirement 4: 設定とカスタマイズ

**User Story:** As a ユーザー, I want to 公文書ルールの有効/無効を切り替えたい, so that 必要なルールのみを適用できる。

#### Acceptance Criteria

1. THE Official_Document_Checker SHALL 各ルールを個別にON/OFF設定できる
2. THE Official_Document_Checker SHALL VSCode設定（otakLsp.official.*）で設定を管理する
3. WHEN 設定が変更された THEN THE Official_Document_Checker SHALL 即座に新しい設定を反映する
4. THE Official_Document_Checker SHALL デフォルトでは公文書ルールを無効（false）とする
5. THE Official_Document_Checker SHALL 固有名詞除外オプションをデフォルトで有効（true）とする

### Requirement 5: 診断メッセージの品質

**User Story:** As a ユーザー, I want to 分かりやすい診断メッセージを受け取りたい, so that 問題の内容と修正方法を理解できる。

#### Acceptance Criteria

1. WHEN 問題が検出された THEN THE Official_Document_Checker SHALL 問題の内容を具体的に説明する
2. WHEN 問題が検出された THEN THE Official_Document_Checker SHALL 修正案を提示する
3. WHEN 問題が検出された THEN THE Official_Document_Checker SHALL 根拠となる基準（内閣告示名など）を明記する
4. THE Official_Document_Checker SHALL 診断の重要度を「情報」レベルとする（エラーではなく提案として）
5. THE Official_Document_Checker SHALL 日本語で診断メッセージを出力する

### Requirement 6: 箇条書きの句点運用チェック

**User Story:** As a 公文書作成者, I want to 箇条書きの文末句点の使い分けを確認してもらいたい, so that 名詞句と文の体裁を統一できる。

#### Acceptance Criteria

1. WHEN Markdownの箇条書き（「-」「*」「+」「番号.」）または行頭「・」の項目が出現する THEN THE Bullet_Punctuation_Checker SHALL 対象の項目を検出する
2. WHEN 箇条書き項目が名詞句と判定される THEN THE Bullet_Punctuation_Checker SHALL 末尾の句点（。）の有無を確認し、句点がある場合は警告を出力する
3. WHEN 箇条書き項目が文と判定される THEN THE Bullet_Punctuation_Checker SHALL 末尾の句点（。）の有無を確認し、句点が無い場合は警告を出力する
4. WHEN 名詞句/文の判定が曖昧な場合 THEN THE Bullet_Punctuation_Checker SHALL 診断を出力しない
5. WHEN 項目末尾が「：」または括弧/引用符閉じで終わる場合 THEN THE Bullet_Punctuation_Checker SHALL 診断を出力しない
6. THE Official_Document_Checker SHALL VSCode設定（otakLsp.official.enableBulletPunctuation）で本ルールをON/OFFできる
7. THE Official_Document_Checker SHALL 本ルールのデフォルトを有効（true）とする

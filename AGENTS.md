# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Memory
Project memory keeps persistent guidance (steering, specs notes, component docs) so Codex honors your standards each run. Treat it as the long-lived source of truth for patterns, conventions, and decisions.

- Use `.kiro/steering/` for project-wide policies: architecture principles, naming schemes, security constraints, tech stack decisions, api standards, etc.
- Use local `AGENTS.md` files for feature or library context (e.g. `src/lib/payments/AGENTS.md`): describe domain assumptions, API contracts, or testing conventions specific to that folder. Codex auto-loads these when working in the matching path.
- Specs notes stay with each spec (under `.kiro/specs/`) to guide specification-level workflows.

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- Check `.kiro/specs/` for active specifications
- Use `/prompts:kiro-spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/prompts:kiro-steering`, `/prompts:kiro-steering-custom`
- Phase 1 (Specification):
  - `/prompts:kiro-spec-init "description"`
  - `/prompts:kiro-spec-requirements {feature}`
  - `/prompts:kiro-validate-gap {feature}` (optional: for existing codebase)
  - `/prompts:kiro-spec-design {feature} [-y]`
  - `/prompts:kiro-validate-design {feature}` (optional: design review)
  - `/prompts:kiro-spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/prompts:kiro-spec-impl {feature} [tasks]`
  - `/prompts:kiro-validate-impl {feature}` (optional: after implementation)
- Progress check: `/prompts:kiro-spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/prompts:kiro-spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/prompts:kiro-steering-custom`)

## プロジェクト技術メモ（今後の実装のために）

### 全体構成
- VS Code 拡張 `otak-lcp` の LSP 構成。`client/` が拡張ホスト側、`server/` が language server、共通型は `shared/`。
- 主要機能は「日本語形態素解析（kuromoji.js）」「文法チェック」「品詞ベースのセマンティックハイライト」「Hover で辞書/ Wikipedia 情報」。

### 実行フロー（サーバ側）
- 入口は `server/src/main.ts`。
- `documents.onDidOpen / onDidChangeContent` → debounce → `analyzeDocument`。
- Markdown の場合:
  1. `MarkdownFilter.filter(text)` がコードブロック/テーブル/URL/見出しマーカー/リストマーカー等の除外範囲を **スペース置換** して `filteredText` を作る（長さが元と同じ＝位置が保持される）。
  2. `MeCabAnalyzer.analyze(filteredText)`（実体は kuromoji.js、辞書内蔵で外部依存なし）がトークン化。返る `Token.start/end` は **文字オフセット**。
  3. `TokenFilter.filterTokens(tokens, excludedRanges)` で除外範囲にかかるトークンを落とす。
  4. `SemanticTokenProvider.provideSemanticTokens(tokens, originalText)` が LSP の semantic token data を生成。
- 診断（grammar diagnostics）は Markdown だけ `PositionMapper` を使って元テキストにレンジを戻す。

### セマンティックハイライトの品詞マッピング
- 実際に kuromoji が返す品詞は多様なので、`server/src/semantic/tokenProvider.ts` の `mapPosToTokenType` で次の方針:
  - `記号` はハイライト対象外として `other` 固定。
  - それ以外の未知品詞は白抜けを避けるため `noun` にフォールバック。
  - 追加マッピング済み: `助動詞→verb`, `連体詞→adjective`, `接続詞→particle`, `接頭詞/感動詞→noun`, `フィラー→adverb`。
- 追加品詞を扱う場合はここに集約する。

### Hover / Wikipedia
- Hover 入口は `server/src/main.ts` の `connection.onHover` → `HoverProvider.provideHover`。
- `HoverProvider` は対象位置の `Token` を探し、形態素情報（表層形/品詞/原形/読み）を Markdown で返す。
- Wikipedia 検索は `WikipediaClient.getSummary(term)` を利用。対象外の品詞（`助詞`,`助動詞`,`記号`,`接続詞`）は検索しない。
- `WikipediaClient` は REST API `https://ja.wikipedia.org/api/rest_v1/page/summary/{term}` を呼び、24h TTL + LRU(最大1000件)でキャッシュ。タイムアウトは 5s。
- ネットワークに失敗しても Hover 全体は null にならず、サマリー部分だけ省略される設計。

### 文法チェック（基本/高度）とルール追加の導線
- 基本ルール:
  - 実装は `server/src/grammar/checker.ts` 内の `GrammarChecker`。現在は4ルール（`double-particle`,`particle-sequence`,`verb-particle-mismatch`,`redundant-copula`）。
  - 新しい基本ルールを追加する場合、同ファイルの `GrammarRule` に従って class を追加し、`GrammarChecker` の `this.rules` に登録。
- 高度ルール:
  - 実装は `server/src/grammar/advancedRulesManager.ts` が `shared/src/advancedTypes.ts` の `AdvancedGrammarRule` を実行。
  - ルール本体は `server/src/grammar/rules/` に追加し、`server/src/grammar/rules/index.ts` と `AdvancedRulesManager` の `this.rules` に登録。
  - ルールのON/OFFや閾値は `shared/src/advancedTypes.ts` の `AdvancedRulesConfig` / `DEFAULT_ADVANCED_RULES_CONFIG` と、`package.json` の `contributes.configuration`（`otakLcp.advanced.*`）で管理。
  - ルール側は `RuleContext`（全文テキスト/文分割結果/設定）を受け取り、`AdvancedDiagnostic` を返す。

### Evals / 品質評価
- 文法ルールの評価データとランナーは `server/src/grammar/evals/`。
- `npm run evals` で全カテゴリの検出率を計測し、`evals-report.md` を生成。
- `npm run evals:update-readme` で README の `<!-- EVALS-START -->`/`<!-- EVALS-END -->` 間を最新結果で置換。

### クライアント側の要点
- クライアント入口は `client/src/extension.ts`。`vscode-languageclient` で `server/out/main.js` を起動。
- 設定は VS Code の `otakLcp.*` を `configurationSection` で同期しつつ、変更時に `workspace/didChangeConfiguration` 通知でサーバに反映。
- セマンティックトークンの凡例は `server/src/semantic/tokenProvider.ts` の `tokenTypes`/`tokenModifiers` と `package.json` の `contributes.semanticTokenTypes`/`semanticTokenScopes` が一致している必要がある（新タイプ追加時は両方更新）。

### テスト
- Jest + fast-check によるプロパティベーステストを多用。
- 主要テスト:
  - Markdown フィルタ: `server/src/parser/markdownFilter*.test.ts`
  - 位置マッピング: `server/src/parser/positionMapper*.test.ts`
  - セマンティック関連: `server/src/semantic/*test.ts`
- kuromoji 初期化が遅い環境があるため、統合テストでは `jest.setTimeout(20000)` を設定済み。
- 実行: `npm test`

### ビルド/パッケージ
- esbuild を使った単体ビルド: `npm run compile` / `npm run watch`
- VSIX パッケージ生成: `npm run package`（`vscode:prepublish` が走って client/server/shared をビルド）

### 変更時の注意
- Markdown では「除外はスペース置換で長さを保持する」前提が複数箇所にある（Semantic/Grammar どちらも）。除外方式を変える場合は PositionMapper/TokenFilter/テスト全体の整合が必要。

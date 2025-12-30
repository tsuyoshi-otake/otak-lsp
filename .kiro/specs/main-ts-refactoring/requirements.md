# Requirements Document

## Introduction

`server/src/main.ts`（1365行）をMCPパターンを参考に300行未満の複数ファイルに分割するリファクタリング。既存の機能を維持しながら、責務ごとにモジュールを分離し、保守性とテスタビリティを向上させる。

## Glossary

- **Language_Server**: LSPプロトコルに基づく言語サーバー。VSCode拡張機能と通信し、文法チェック・セマンティックハイライト・ホバー情報を提供する
- **Analysis_Scheduler**: 文書変更時のデバウンス処理と解析スケジューリングを担当するコンポーネント
- **Config_Manager**: VSCode設定の読み込み・適用・変更通知を管理するコンポーネント
- **Document_Analyzer**: 形態素解析・文法チェック・セマンティックトークン生成を実行するコンポーネント
- **Diagnostics_Publisher**: 診断結果をLSPクライアントに送信するコンポーネント
- **Profiler**: パフォーマンス計測とログ出力を担当するコンポーネント
- **Connection_Handler**: LSP接続の初期化とリクエストハンドラの登録を担当するコンポーネント

## Requirements

### Requirement 1: ファイル分割

**User Story:** As a developer, I want each module to be under 300 lines, so that the codebase is easier to understand and maintain.

#### Acceptance Criteria

1. THE Language_Server SHALL be split into the following modules: main.ts, connection.ts, configManager.ts, analysisScheduler.ts, documentAnalyzer.ts, diagnosticsPublisher.ts, profiler.ts
2. WHEN any module is created, THE module SHALL contain fewer than 300 lines of code
3. THE main.ts SHALL serve only as an entry point that wires components together

### Requirement 2: 責務分離

**User Story:** As a developer, I want each module to have a single responsibility, so that changes are localized and testing is easier.

#### Acceptance Criteria

1. THE Connection_Handler SHALL be responsible only for LSP connection initialization and request handler registration
2. THE Config_Manager SHALL be responsible only for reading, applying, and notifying configuration changes
3. THE Analysis_Scheduler SHALL be responsible only for debounce timing, tiered execution, and analysis state management
4. THE Document_Analyzer SHALL be responsible only for tokenization, grammar checking, and semantic token generation
5. THE Diagnostics_Publisher SHALL be responsible only for converting and sending diagnostics to the LSP client
6. THE Profiler SHALL be responsible only for performance measurement and logging

### Requirement 3: 機能維持

**User Story:** As a user, I want all existing features to work exactly as before, so that the refactoring does not break my workflow.

#### Acceptance Criteria

1. WHEN a document is opened or changed, THE Language_Server SHALL perform grammar checking as before
2. WHEN a document is opened or changed, THE Language_Server SHALL provide semantic highlighting as before
3. WHEN a user hovers over a word, THE Language_Server SHALL provide hover information as before
4. WHEN configuration is changed, THE Language_Server SHALL apply the new settings immediately
5. WHEN tiered execution is enabled, THE Language_Server SHALL execute lightweight rules first, then full rules after idle timeout

### Requirement 4: インターフェース設計

**User Story:** As a developer, I want clear interfaces between modules, so that dependencies are explicit and testable.

#### Acceptance Criteria

1. THE Config_Manager SHALL expose a method to get the current configuration
2. THE Config_Manager SHALL expose a method to subscribe to configuration changes
3. THE Analysis_Scheduler SHALL accept a callback function for executing analysis
4. THE Document_Analyzer SHALL return analysis results including tokens, diagnostics, and excluded ranges
5. THE Diagnostics_Publisher SHALL accept diagnostics and document URI as parameters

### Requirement 5: 既存テストの互換性

**User Story:** As a developer, I want existing tests to pass without modification, so that I can verify the refactoring is correct.

#### Acceptance Criteria

1. WHEN running `npm test`, THE test suite SHALL pass with the same results as before refactoring
2. THE refactored modules SHALL maintain the same public API signatures where they are tested

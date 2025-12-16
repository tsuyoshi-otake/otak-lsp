/**
 * 開発工程用語図鑑
 * ソフトウェア開発プロセス、工程、手法に関する用語集
 */

import { CliGlossaryEntry } from './gitGlossary';

export const DEV_PROCESS_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // ========================================
  // ウォーターフォール開発工程
  // ========================================
  { term: '要件定義', aliases: ['要件定義工程', 'Requirements Definition'], description: 'システムに必要な機能・性能・制約を明確化し文書化する工程。' },
  { term: '要求分析', aliases: ['要求分析工程', 'Requirements Analysis'], description: 'ユーザー要求を収集・分析し、システム要件として整理する工程。' },
  { term: '基本設計', aliases: ['外部設計', 'Basic Design', 'High-Level Design', 'HLD'], description: 'システム全体構成、画面・帳票・インターフェースなど外部仕様を設計する工程。' },
  { term: '詳細設計', aliases: ['内部設計', 'Detailed Design', 'Low-Level Design', 'LLD'], description: 'モジュール構造、データ構造、アルゴリズムなど内部仕様を設計する工程。' },
  { term: '製造', aliases: ['実装', 'コーディング', 'Implementation', 'Coding'], description: '設計に基づいてプログラムを作成する工程。' },
  { term: '単体テスト', aliases: ['UT', 'Unit Test', 'ユニットテスト'], description: '個々のモジュール・関数単位で正常動作を確認するテスト工程。' },
  { term: '結合テスト', aliases: ['IT', 'Integration Test', 'インテグレーションテスト'], description: '複数モジュールを結合し、連携動作を確認するテスト工程。' },
  { term: 'システムテスト', aliases: ['ST', 'System Test', '総合テスト'], description: 'システム全体として要件を満たすか確認するテスト工程。' },
  { term: '運用テスト', aliases: ['OT', 'Operational Test', 'UAT', 'User Acceptance Test', '受入テスト'], description: '本番環境相当でユーザーが受入確認を行うテスト工程。' },
  { term: 'リリース', aliases: ['Release', '本番リリース'], description: '完成したシステムを本番環境に展開する工程。' },
  { term: '運用保守', aliases: ['O&M', 'Operation and Maintenance', '保守運用'], description: '本番稼働後のシステム維持・改修・障害対応を行う工程。' },

  // ========================================
  // ウォーターフォールモデル
  // ========================================
  { term: 'ウォーターフォール', aliases: ['Waterfall', 'ウォーターフォールモデル', 'Waterfall Model'], description: '工程を順番に進め、前工程完了後に次工程へ進む開発モデル。' },
  { term: 'V字モデル', aliases: ['V-Model', 'Vモデル'], description: '設計工程とテスト工程を対応付け、品質を確保する開発モデル。' },
  { term: 'W字モデル', aliases: ['W-Model', 'Wモデル'], description: 'V字モデルを拡張し、各工程でテスト設計を並行実施する開発モデル。' },

  // ========================================
  // アジャイル開発
  // ========================================
  { term: 'アジャイル', aliases: ['Agile', 'アジャイル開発', 'Agile Development'], description: '短い反復サイクルで開発し、変化に柔軟に対応する開発手法の総称。' },
  { term: 'スクラム', aliases: ['Scrum'], description: 'スプリント単位で開発を進めるアジャイルフレームワーク。' },
  { term: 'スプリント', aliases: ['Sprint', 'イテレーション', 'Iteration'], description: '1〜4週間程度の固定期間で計画・開発・レビューを行う単位。' },
  { term: 'スプリントプランニング', aliases: ['Sprint Planning'], description: 'スプリント開始時にゴールと作業項目を決定するイベント。' },
  { term: 'デイリースクラム', aliases: ['Daily Scrum', 'デイリースタンドアップ', 'Daily Standup'], description: '毎日短時間で進捗・課題を共有するミーティング。' },
  { term: 'スプリントレビュー', aliases: ['Sprint Review'], description: 'スプリント終了時に成果物をステークホルダーにデモするイベント。' },
  { term: 'レトロスペクティブ', aliases: ['Retrospective', 'ふりかえり', 'Sprint Retrospective'], description: 'スプリント終了時にプロセス改善点を話し合うイベント。' },
  { term: 'プロダクトバックログ', aliases: ['Product Backlog', 'PBL'], description: '製品に必要な機能・改善を優先順位付けしたリスト。' },
  { term: 'スプリントバックログ', aliases: ['Sprint Backlog', 'SBL'], description: '当該スプリントで実施する作業項目のリスト。' },
  { term: 'ユーザーストーリー', aliases: ['User Story'], description: 'ユーザー視点で機能を「〜として、〜したい」形式で記述したもの。' },
  { term: 'ストーリーポイント', aliases: ['Story Point', 'SP'], description: 'ユーザーストーリーの相対的な規模・複雑さを表す見積もり単位。' },
  { term: 'ベロシティ', aliases: ['Velocity'], description: '1スプリントで完了できるストーリーポイントの実績値。' },
  { term: 'バーンダウンチャート', aliases: ['Burndown Chart'], description: '残作業量の推移をグラフ化し進捗を可視化するツール。' },
  { term: 'バーンアップチャート', aliases: ['Burnup Chart'], description: '完了作業量の推移をグラフ化し進捗を可視化するツール。' },
  { term: 'プロダクトオーナー', aliases: ['Product Owner', 'PO'], description: '製品価値の最大化に責任を持ち、バックログを管理するロール。' },
  { term: 'スクラムマスター', aliases: ['Scrum Master', 'SM'], description: 'スクラムプロセスの促進・障害除去を担うロール。' },
  { term: '開発チーム', aliases: ['Development Team', 'Dev Team'], description: 'プロダクトを開発する自己組織化されたチーム。' },
  { term: 'カンバン', aliases: ['Kanban'], description: '作業を可視化し、WIP制限で流れを最適化する手法。' },
  { term: 'WIP制限', aliases: ['WIP Limit', 'Work In Progress Limit'], description: '同時進行中の作業数を制限しボトルネックを防ぐ仕組み。' },
  { term: 'リードタイム', aliases: ['Lead Time'], description: '作業開始から完了までの経過時間。' },
  { term: 'サイクルタイム', aliases: ['Cycle Time'], description: '実際に作業している時間（待ち時間を除く）。' },

  // ========================================
  // XP（エクストリームプログラミング）
  // ========================================
  { term: 'XP', aliases: ['Extreme Programming', 'エクストリームプログラミング'], description: 'ペアプログラミングやTDDなどの実践を重視するアジャイル手法。' },
  { term: 'ペアプログラミング', aliases: ['Pair Programming', 'ペアプロ'], description: '2人1組でコードを書く開発プラクティス。' },
  { term: 'モブプログラミング', aliases: ['Mob Programming', 'モブプロ'], description: 'チーム全員で1つのコードを書く開発プラクティス。' },
  { term: 'リファクタリング', aliases: ['Refactoring'], description: '外部動作を変えずに内部構造を改善すること。' },
  { term: '継続的インテグレーション', aliases: ['CI', 'Continuous Integration'], description: '変更を頻繁に統合し、自動ビルド・テストで品質を維持する手法。' },

  // ========================================
  // 開発手法・プラクティス
  // ========================================
  { term: 'TDD', aliases: ['Test-Driven Development', 'テスト駆動開発'], description: 'テストを先に書き、そのテストを通すコードを書く開発手法。' },
  { term: 'BDD', aliases: ['Behavior-Driven Development', '振る舞い駆動開発'], description: 'ビジネス視点の振る舞いを記述し、それに基づいて開発する手法。' },
  { term: 'DDD', aliases: ['Domain-Driven Design', 'ドメイン駆動設計'], description: 'ビジネスドメインを中心にモデリング・設計を行う手法。' },
  { term: 'ATDD', aliases: ['Acceptance Test-Driven Development', '受入テスト駆動開発'], description: '受入テストを先に定義し、それを満たすよう開発する手法。' },
  { term: 'Red-Green-Refactor', aliases: ['レッド・グリーン・リファクタ'], description: 'TDDの基本サイクル：失敗するテスト→通すコード→リファクタリング。' },

  // ========================================
  // コードレビュー
  // ========================================
  { term: 'コードレビュー', aliases: ['Code Review', 'レビュー'], description: '他者がコードを確認し品質・設計を改善する活動。' },
  { term: 'プルリクエスト', aliases: ['Pull Request', 'PR', 'Merge Request', 'MR'], description: '変更をレビューし統合するための提案。' },
  { term: 'LGTM', aliases: ['Looks Good To Me'], description: 'レビュー承認を示す略語。' },
  { term: 'Approve', aliases: ['承認', 'アプルーブ'], description: 'プルリクエストを承認すること。' },
  { term: 'Request Changes', aliases: ['変更依頼'], description: 'プルリクエストに修正を求めること。' },
  { term: 'レビュイー', aliases: ['Reviewee'], description: 'レビューを受ける人（コード作成者）。' },
  { term: 'レビュアー', aliases: ['Reviewer'], description: 'レビューを行う人。' },

  // ========================================
  // テスト種別
  // ========================================
  { term: '回帰テスト', aliases: ['Regression Test', 'リグレッションテスト'], description: '変更によって既存機能が壊れていないか確認するテスト。' },
  { term: 'E2Eテスト', aliases: ['End-to-End Test', 'エンドツーエンドテスト'], description: 'システム全体を通して動作確認するテスト。' },
  { term: 'スモークテスト', aliases: ['Smoke Test'], description: '主要機能が動作するか簡易確認するテスト。' },
  { term: 'サニティテスト', aliases: ['Sanity Test'], description: '特定の変更が正しく動作するか確認する簡易テスト。' },
  { term: '負荷テスト', aliases: ['Load Test', 'ロードテスト'], description: '想定負荷でシステムが正常動作するか確認するテスト。' },
  { term: 'ストレステスト', aliases: ['Stress Test'], description: '限界を超える負荷でシステムの挙動を確認するテスト。' },
  { term: 'パフォーマンステスト', aliases: ['Performance Test', '性能テスト'], description: '応答時間・スループットなどの性能を測定するテスト。' },
  { term: 'セキュリティテスト', aliases: ['Security Test', '脆弱性テスト'], description: 'セキュリティ上の脆弱性を検出するテスト。' },
  { term: 'ペネトレーションテスト', aliases: ['Penetration Test', 'ペンテスト'], description: '実際の攻撃を模してシステムの脆弱性を検証するテスト。' },
  { term: 'ユーザビリティテスト', aliases: ['Usability Test'], description: '実ユーザーによる使いやすさを評価するテスト。' },
  { term: 'A/Bテスト', aliases: ['A/B Test', 'スプリットテスト'], description: '2パターンを比較して効果を測定するテスト手法。' },
  { term: 'カナリアリリース', aliases: ['Canary Release'], description: '一部ユーザーに先行リリースし問題を早期発見する手法。' },
  { term: 'ブルーグリーンデプロイメント', aliases: ['Blue-Green Deployment'], description: '2環境を切り替えてダウンタイムなくリリースする手法。' },
  { term: 'フィーチャーフラグ', aliases: ['Feature Flag', 'Feature Toggle', '機能フラグ'], description: 'コード変更なしに機能のオン・オフを切り替える仕組み。' },

  // ========================================
  // テスト技法
  // ========================================
  { term: '境界値分析', aliases: ['Boundary Value Analysis', 'BVA'], description: '境界値付近でエラーが起きやすいことを利用したテスト技法。' },
  { term: '同値分割', aliases: ['Equivalence Partitioning', '同値クラス分割'], description: '入力を同値クラスに分けて代表値でテストする技法。' },
  { term: 'デシジョンテーブル', aliases: ['Decision Table', '決定表'], description: '条件と結果の組み合わせを表形式で整理するテスト技法。' },
  { term: '状態遷移テスト', aliases: ['State Transition Testing'], description: '状態遷移図に基づいて遷移をテストする技法。' },
  { term: 'ペアワイズテスト', aliases: ['Pairwise Testing', 'オールペア法'], description: 'パラメータの2つ組み合わせを網羅するテスト技法。' },
  { term: 'ホワイトボックステスト', aliases: ['White Box Test', '構造テスト'], description: '内部構造を把握した上で行うテスト。' },
  { term: 'ブラックボックステスト', aliases: ['Black Box Test', '機能テスト'], description: '内部構造を意識せず入出力で確認するテスト。' },
  { term: 'グレーボックステスト', aliases: ['Gray Box Test'], description: '一部の内部情報を利用して行うテスト。' },

  // ========================================
  // テスト指標・カバレッジ
  // ========================================
  { term: 'カバレッジ', aliases: ['Coverage', 'コードカバレッジ', 'Code Coverage'], description: 'テストがコードをどれだけ網羅したかの指標。' },
  { term: 'C0カバレッジ', aliases: ['ステートメントカバレッジ', 'Statement Coverage'], description: '各命令文の実行率を測るカバレッジ。' },
  { term: 'C1カバレッジ', aliases: ['ブランチカバレッジ', 'Branch Coverage', '分岐カバレッジ'], description: '各分岐の実行率を測るカバレッジ。' },
  { term: 'C2カバレッジ', aliases: ['条件カバレッジ', 'Condition Coverage'], description: '各条件式の真偽両方の実行率を測るカバレッジ。' },
  { term: 'MC/DC', aliases: ['Modified Condition/Decision Coverage'], description: '航空・自動車など安全性が求められる分野で用いられる厳格なカバレッジ基準。' },

  // ========================================
  // 品質管理
  // ========================================
  { term: 'QA', aliases: ['Quality Assurance', '品質保証'], description: '開発プロセス全体を通じて品質を確保する活動。' },
  { term: 'QC', aliases: ['Quality Control', '品質管理'], description: '成果物が基準を満たすか検査・管理する活動。' },
  { term: 'バグ', aliases: ['Bug', '不具合', '欠陥', 'Defect'], description: 'ソフトウェアの誤り・欠陥。' },
  { term: 'バグトラッキング', aliases: ['Bug Tracking', '課題管理'], description: 'バグを記録・追跡・管理するシステム・活動。' },
  { term: 'インシデント', aliases: ['Incident'], description: 'サービスに影響を与える可能性のある事象。' },
  { term: 'ポストモーテム', aliases: ['Postmortem', '事後分析'], description: '障害後に原因と再発防止策を分析・共有する活動。' },
  { term: 'RCA', aliases: ['Root Cause Analysis', '根本原因分析'], description: '問題の根本原因を特定する分析手法。' },
  { term: '5 Whys', aliases: ['なぜなぜ分析', '5回のなぜ'], description: '「なぜ」を繰り返し問うことで根本原因を探る手法。' },

  // ========================================
  // リリース・デプロイ
  // ========================================
  { term: 'デプロイ', aliases: ['Deploy', 'デプロイメント', 'Deployment'], description: 'アプリケーションを環境に配置・展開すること。' },
  { term: 'ロールバック', aliases: ['Rollback'], description: 'リリース後に問題が発生した際、以前のバージョンに戻すこと。' },
  { term: 'ロールフォワード', aliases: ['Roll Forward'], description: '問題を修正した新バージョンを再デプロイして進むこと。' },
  { term: 'ホットフィックス', aliases: ['Hotfix'], description: '緊急の修正を本番環境に即座に適用すること。' },
  { term: 'ステージング環境', aliases: ['Staging Environment', 'ステージング'], description: '本番と同等の検証用環境。' },
  { term: '本番環境', aliases: ['Production Environment', 'Production', '本番', 'プロダクション'], description: '実際にユーザーが利用する環境。' },
  { term: '開発環境', aliases: ['Development Environment', 'Dev環境'], description: '開発者がコーディング・テストを行う環境。' },
  { term: 'テスト環境', aliases: ['Test Environment'], description: 'テストを実施するための環境。' },

  // ========================================
  // CI/CD
  // ========================================
  { term: 'CD', aliases: ['Continuous Delivery', 'Continuous Deployment', '継続的デリバリー', '継続的デプロイメント'], description: '変更を自動的にリリース可能な状態に保つ、または自動デプロイする手法。' },
  { term: 'パイプライン', aliases: ['Pipeline', 'CI/CDパイプライン'], description: 'ビルド・テスト・デプロイを自動化した一連のワークフロー。' },
  { term: 'ビルド', aliases: ['Build'], description: 'ソースコードを実行可能形式に変換する工程。' },
  { term: 'アーティファクト', aliases: ['Artifact', '成果物'], description: 'ビルドによって生成される実行ファイル・パッケージなど。' },

  // ========================================
  // 見積もり
  // ========================================
  { term: '見積もり', aliases: ['Estimate', 'Estimation', '工数見積もり'], description: '作業に必要な時間・コストを予測すること。' },
  { term: 'プランニングポーカー', aliases: ['Planning Poker', 'スクラムポーカー'], description: 'チームで相対見積もりを行うゲーム形式の手法。' },
  { term: 'Tシャツサイジング', aliases: ['T-Shirt Sizing'], description: 'S/M/L/XLなどで規模を大まかに分類する見積もり手法。' },
  { term: 'ファンクションポイント', aliases: ['Function Point', 'FP'], description: '機能の量を基準に規模を測定する手法。' },
  { term: 'COCOMO', aliases: ['Constructive Cost Model'], description: 'コード行数ベースの工数見積もりモデル。' },

  // ========================================
  // ドキュメント
  // ========================================
  { term: '設計書', aliases: ['Design Document', '設計ドキュメント'], description: 'システム設計内容を記述した文書。' },
  { term: '仕様書', aliases: ['Specification', 'スペック'], description: '機能・動作・制約などを定義した文書。' },
  { term: 'テスト仕様書', aliases: ['Test Specification', 'テスト計画書'], description: 'テスト項目・手順・期待結果を記述した文書。' },
  { term: 'リリースノート', aliases: ['Release Notes'], description: 'リリース内容（新機能・修正・既知の問題）を記載した文書。' },
  { term: 'チェンジログ', aliases: ['Changelog', 'CHANGELOG'], description: 'バージョンごとの変更履歴を記録したファイル。' },
  { term: 'README', aliases: ['README.md'], description: 'プロジェクトの概要・セットアップ方法などを記載したファイル。' },
  { term: 'ADR', aliases: ['Architecture Decision Record', 'アーキテクチャ決定記録'], description: 'アーキテクチャ上の意思決定を記録する文書形式。' },

  // ========================================
  // 構成管理・バージョン管理
  // ========================================
  { term: 'バージョン管理', aliases: ['Version Control', 'VCS'], description: 'ソースコードの変更履歴を管理するシステム・活動。' },
  { term: 'ブランチ戦略', aliases: ['Branching Strategy'], description: 'ブランチの作成・マージ方針を定めた戦略。' },
  { term: 'GitFlow', aliases: ['Git Flow'], description: 'feature/develop/release/hotfix/masterブランチを使う戦略。' },
  { term: 'GitHub Flow', aliases: ['GitHubフロー'], description: 'mainブランチとfeatureブランチのみのシンプルな戦略。' },
  { term: 'トランクベース開発', aliases: ['Trunk-Based Development', 'TBD'], description: '主幹ブランチに頻繁に統合する開発スタイル。' },

  // ========================================
  // プロジェクト管理
  // ========================================
  { term: 'WBS', aliases: ['Work Breakdown Structure', '作業分解構成図'], description: 'プロジェクトを階層的に作業単位に分解した構成図。' },
  { term: 'ガントチャート', aliases: ['Gantt Chart'], description: '作業スケジュールを横棒グラフで可視化した図。' },
  { term: 'マイルストーン', aliases: ['Milestone'], description: 'プロジェクトの重要な節目・達成点。' },
  { term: 'クリティカルパス', aliases: ['Critical Path'], description: 'プロジェクト完了に影響する最長経路。' },
  { term: 'スコープ', aliases: ['Scope', 'プロジェクトスコープ'], description: 'プロジェクトで実施する作業範囲。' },
  { term: 'スコープクリープ', aliases: ['Scope Creep'], description: 'プロジェクト進行中に範囲が徐々に拡大する現象。' },
  { term: 'ステークホルダー', aliases: ['Stakeholder', '利害関係者'], description: 'プロジェクトに関わる・影響を受ける人々。' },
  { term: 'キックオフ', aliases: ['Kickoff', 'キックオフミーティング'], description: 'プロジェクト開始時の関係者会議。' },

  // ========================================
  // その他の開発概念
  // ========================================
  { term: 'MVP', aliases: ['Minimum Viable Product', '実用最小限の製品'], description: '最小限の機能で価値検証可能な製品。' },
  { term: 'PoC', aliases: ['Proof of Concept', '概念実証'], description: '技術・アイデアの実現可能性を検証する試作。' },
  { term: 'プロトタイプ', aliases: ['Prototype', '試作'], description: '機能や設計を確認するための試験的な実装。' },
  { term: 'モックアップ', aliases: ['Mockup', 'モック'], description: '画面やUIの視覚的なデザイン見本。' },
  { term: 'ワイヤーフレーム', aliases: ['Wireframe'], description: '画面レイアウトの骨組みを示す簡易図。' },
  { term: '技術的負債', aliases: ['Technical Debt', '技術負債'], description: '短期的な妥協により蓄積した将来の改修コスト。' },
  { term: 'レガシーコード', aliases: ['Legacy Code'], description: 'テストがなく変更が困難な古いコード。' },
  { term: 'スパイク', aliases: ['Spike'], description: '技術調査・リスク検証のための短期間の調査作業。' },
  { term: 'タイムボックス', aliases: ['Timebox', 'タイムボクシング'], description: '作業時間を固定し、その中で最大成果を目指す手法。' },
  { term: 'DoD', aliases: ['Definition of Done', '完了の定義'], description: '作業が完了とみなされる基準・条件。' },
  { term: 'DoR', aliases: ['Definition of Ready', '準備の定義'], description: '作業を開始できる状態の基準・条件。' },
  { term: 'INVEST', description: 'よいユーザーストーリーの条件（Independent, Negotiable, Valuable, Estimable, Small, Testable）。' },
];

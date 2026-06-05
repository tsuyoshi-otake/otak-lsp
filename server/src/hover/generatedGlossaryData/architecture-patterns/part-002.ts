// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// カテゴリ: architecturePatterns (2/2)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryEntry } from '../../glossaryTypes';

export const GLOSSARY_ENTRIES_PART_002: ReadonlyArray<GlossaryEntry> = [
  { term: 'Flux', aliases: ['flux'], description: 'Facebookが提唱した単方向データフローに基づくフロントエンドアーキテクチャパターン。' },
  { term: 'JAM stack', aliases: ['jam stack'], description: 'JavaScript・API・Markupを組み合わせた静的サイト中心のWebアーキテクチャ。' },
  { term: 'ヘッドレスCMS', aliases: ['ヘッドレスcms', 'headless cms'], description: 'フロントエンドを持たずAPIでコンテンツを提供するCMS。フロントは自由に選択できる。' },
  { term: '静的サイトジェネレータ', aliases: ['static site generator'], description: 'テンプレートとコンテンツからHTMLを事前生成するツール。Next.js・Gatsby・Hugoなどが代表例。' },
  { term: 'インテグレーションアーキテクチャ', aliases: ['integration architecture'], description: '複数システム・サービスを統合するための方式・パターン・技術スタックの設計。' },
  { term: 'メッセージングアーキテクチャ', aliases: ['messaging architecture'], description: 'メッセージングを中心にシステム間通信・統合を設計するアーキテクチャスタイル。' },
  { term: 'システムアーキテクチャ', aliases: ['system architecture'], description: 'システム全体の構成・コンポーネント・インタラクション・技術選定を定義した設計。' },
  { term: '機能コンポーネント', aliases: ['functional component'], description: '業務機能を実現するために分割されたアプリケーション層のコンポーネント。' },
  { term: '主要クラス設計', aliases: ['key class design'], description: 'システムの核となる主要なクラスのインターフェース・責務・関係を先行して設計する活動。' },
  { term: '主要メソッド設計', aliases: ['key method design'], description: '主要クラスの重要なメソッドのシグニチャ・処理概要を先行設計する活動。' },
  { term: 'I/F設計', aliases: ['i/f設計', 'i/f design'], description: 'システム・コンポーネント間のインターフェース（API・ファイル・メッセージ）を設計する活動。' },
  { term: '単一デプロイ', aliases: ['single deployment', 'モノリシックデプロイ'], description: 'システム全体を一つのデプロイ可能な成果物としてリリースする方式。モノリスの特徴であり、シンプルなデプロイ手順と原子的な更新が可能。' },
  { term: 'デプロイ単位', aliases: ['deployment unit'], description: '一度にデプロイされる最小のソフトウェア単位。マイクロサービスでは各サービスが独立したデプロイ単位となり、モノリスでは全体が一つのデプロイ単位となる。' },
  { term: '依存制御', aliases: ['dependency control'], description: 'モジュールやコンポーネント間の依存関係を意図的に管理すること。依存の方向を制御し、循環依存を排除することで保守性と変更容易性を高める。' },
  { term: '依存方向', aliases: ['dependency direction'], description: 'コンポーネント間の依存が向かう方向。クリーンアーキテクチャでは依存は外から内（ドメイン）へ向かい、ドメイン層は他の層に依存しないよう設計する。' },
  { term: '分散トランザクション', aliases: ['distributed transaction'], description: '複数のサービスやデータストアにまたがるトランザクション処理。マイクロサービスでは実現が困難であり、サガパターンや結果整合性で代替することが多い。' },
  { term: 'アーキテクチャ判断', aliases: ['architecture decision'], description: 'システムの構造に影響を与える重要な設計上の意思決定。アーキテクチャ判断記録（ADR）として記録し、判断の背景・理由・結果を残すことが推奨される。' },
  { term: 'コンウェイの法則', aliases: ['conway\'s law'], description: 'システムの構造は、それを設計する組織のコミュニケーション構造を反映するという法則。チーム設計とアーキテクチャ設計を一致させることの重要性を示す。' },
  { term: 'アーキテクチャ負債', aliases: ['architecture debt'], description: 'アーキテクチャレベルで積み重なった設計上の問題や妥協点。技術的負債の一種だが、修正コストが高く、長期的にシステムの進化を阻害する。' },
  { term: '技術的決定', aliases: ['technical decision'], description: '技術スタック、フレームワーク、インフラなどの選択に関する意思決定。ビジネス要件、チームスキル、将来の拡張性を考慮して行われる。' },
  { term: '内部API', aliases: ['内部api', 'internal api'], description: '同一システム内のコンポーネントやモジュール間で使用されるAPI。外部に公開されず、内部の依存関係を管理するためのインターフェースとして機能する。' },
  { term: 'リリース戦略', aliases: ['release strategy'], description: 'ソフトウェアをどのようにユーザーへ届けるかの計画。カナリアリリース、フィーチャーフラグ、ブルーグリーンデプロイなど複数の手法がある。' },
  { term: 'コードレビュー文化', aliases: ['code review culture'], description: 'チームがコードレビューを品質向上と知識共有の機会として積極的に活用する組織的な習慣。心理的安全性と建設的なフィードバックが前提となる。' },
  { term: '段階移行', aliases: ['incremental migration', '段階的移行'], description: 'モノリスからマイクロサービスなど、アーキテクチャを一度に変更せず段階的に移行するアプローチ。ストラングラーフィグパターンなどを用いてリスクを分散する。' },
  { term: 'サイドカーパターン', aliases: ['sidecar pattern'], description: 'メインサービスのコンテナに隣接する補助コンテナを配置し、ロギング、プロキシ、設定管理などの横断的機能を提供するデプロイパターン。' },
  { term: 'プロジェクション', aliases: ['projection'], description: 'イベントソーシングにおいて、イベントストリームを処理してクエリ用のビュー（リードモデル）を構築する処理。同一イベントから複数のプロジェクションを生成できる。' },
  { term: 'リードモデル', aliases: ['read model', 'query model'], description: 'CQRSにおいてクエリ側で使用する、読み取り最適化されたデータモデル。ライトモデルとは独立して設計され、ビューやAPIの要件に合わせてデノーマライズされることが多い。' },
  { term: 'ライトモデル', aliases: ['write model', 'command model'], description: 'CQRSにおいてコマンド側で使用する、書き込み最適化されたデータモデル。ビジネスルールの整合性を保ち、ドメインモデルに近い形で設計される。' },
  { term: 'コマンド', aliases: ['command'], description: 'CQRSにおいてシステムの状態を変更する操作の要求。副作用を持ち、通常は戻り値を返さない。ドメインイベントの発生源となる。' },
  { term: 'クエリ', aliases: ['query'], description: 'CQRSにおいてシステムの状態を読み取る操作。副作用を持たず、冪等性がある。コマンドとは分離されたパスで処理される。' },
  { term: 'アグリゲーション', aliases: ['aggregation'], description: 'イベントソーシングやCQRSで複数のイベントや状態を集約して新しいビューや集計値を生成する処理。プロジェクションの一形態として使われる。' },
  { term: 'スナップショット戦略', aliases: ['snapshot strategy'], description: 'イベントソーシングでイベントが大量に蓄積した場合に、特定時点の集約の状態を保存してリプレイコストを削減する最適化戦略。' },
  { term: '外部システム連携', aliases: ['external system integration'], description: '自社システムと外部の他システムをAPIや連携プロトコルで接続する仕組みです。データ交換や業務プロセスの統合を実現します。' },
  { term: 'レイヤードモノリス', description: '層ごとに責務を分けつつ、1つのアプリケーションとして一体で開発・デプロイするモノリシックな構成です。' },
  { term: 'モジュール依存', description: 'あるモジュールが他のモジュールにどのように依存しているかという関係です。' },
  { term: 'Service層', aliases: ['service層'], description: 'Controllerから受けた要求に対し、ユースケースの流れや業務処理をまとめるアプリケーション層です。' },
];

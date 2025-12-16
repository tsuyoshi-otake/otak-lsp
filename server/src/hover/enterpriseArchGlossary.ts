/**
 * エンタープライズアーキテクチャ用語図鑑
 * ペースレイヤリング、EA、システム戦略に関する用語集
 */

import { CliGlossaryEntry } from './gitGlossary';

export const ENTERPRISE_ARCH_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // ========================================
  // ペースレイヤリング
  // ========================================
  { term: 'ペースレイヤリング', aliases: ['Pace Layering', 'ペースレイヤー'], description: 'スチュワート・ブランドが提唱した概念。システムを変化速度の異なる層に分類する考え方。' },
  { term: 'ペースレイヤード・アプリケーション戦略', aliases: ['Pace-Layered Application Strategy'], description: 'Gartnerが提唱したアプリケーション戦略。SoR/SoD/SoIの3層で分類。' },
  { term: 'SoR', aliases: ['System of Record', 'システム・オブ・レコード', '記録のシステム'], description: '基幹系システム。安定性・信頼性重視。変化が遅い層。ERPや会計システムなど。' },
  { term: 'SoE', aliases: ['System of Engagement', 'システム・オブ・エンゲージメント', '顧客接点のシステム'], description: '顧客・パートナーとの接点となるシステム。UX重視。変化が速い層。' },
  { term: 'SoI', aliases: ['System of Insight', 'システム・オブ・インサイト', '洞察のシステム'], description: 'データ分析・意思決定支援システム。SoRとSoEをつなぐ層。' },
  { term: 'SoD', aliases: ['System of Differentiation', 'システム・オブ・ディファレンシエーション', '差別化のシステム'], description: '競争優位性を生む独自システム。SoRとSoEの中間的な変化速度。' },
  { term: 'SoC', aliases: ['System of Collaboration', 'コラボレーションシステム'], description: '社内外のコミュニケーション・協働を支援するシステム。' },

  // ========================================
  // バイモーダルIT・デジタル戦略
  // ========================================
  { term: 'バイモーダルIT', aliases: ['Bimodal IT', '2つのモード'], description: 'Gartnerが提唱。安定重視のモード1と俊敏性重視のモード2を使い分けるIT運営。' },
  { term: 'モード1', aliases: ['Mode 1'], description: 'バイモーダルITにおける安定性・信頼性重視のモード。従来型のウォーターフォール開発。' },
  { term: 'モード2', aliases: ['Mode 2'], description: 'バイモーダルITにおける俊敏性・革新性重視のモード。アジャイル開発。' },
  { term: 'DX', aliases: ['Digital Transformation', 'デジタルトランスフォーメーション', 'デジタル変革'], description: 'デジタル技術を活用してビジネスモデルや業務を変革すること。' },
  { term: 'レガシーモダナイゼーション', aliases: ['Legacy Modernization', 'レガシー刷新'], description: '老朽化したシステムを最新技術で刷新すること。' },
  { term: '2025年の崖', aliases: ['2025 Digital Cliff'], description: '経産省が警告した、レガシーシステム放置による経済損失リスク。DXレポートで提唱。' },
  { term: 'DXレポート', aliases: ['DX Report'], description: '経産省が発行したデジタルトランスフォーメーション推進に関する報告書。' },
  { term: 'IT負債', aliases: ['IT Debt', 'ITデット'], description: '技術的負債のIT版。保守困難なシステムの蓄積。' },

  // ========================================
  // エンタープライズアーキテクチャ（EA）
  // ========================================
  { term: 'EA', aliases: ['Enterprise Architecture', 'エンタープライズアーキテクチャ', '全社アーキテクチャ'], description: '組織全体のIT構造を整理・最適化する設計思想・手法。' },
  { term: 'TOGAF', aliases: ['The Open Group Architecture Framework'], description: 'The Open Groupが策定したEAフレームワークの標準。ADMが中核。' },
  { term: 'ADM', aliases: ['Architecture Development Method'], description: 'TOGAFの中核となるアーキテクチャ開発方法論。8つのフェーズで構成。' },
  { term: 'Zachmanフレームワーク', aliases: ['Zachman Framework', 'ザックマンフレームワーク'], description: 'ジョン・ザックマンが提唱したEAフレームワーク。6×6のマトリクス構造。' },
  { term: 'FEAF', aliases: ['Federal Enterprise Architecture Framework', '連邦EA'], description: '米国連邦政府のEAフレームワーク。' },
  { term: 'DoDAF', aliases: ['Department of Defense Architecture Framework'], description: '米国国防総省のアーキテクチャフレームワーク。' },

  // ========================================
  // EAの4層モデル
  // ========================================
  { term: 'ビジネスアーキテクチャ', aliases: ['Business Architecture', 'BA'], description: 'EA4層の最上位。ビジネス戦略・プロセス・組織を定義。' },
  { term: 'データアーキテクチャ', aliases: ['Data Architecture', 'DA', '情報アーキテクチャ'], description: 'EA4層の1つ。データ構造・データフロー・データ管理を定義。' },
  { term: 'アプリケーションアーキテクチャ', aliases: ['Application Architecture', 'AA'], description: 'EA4層の1つ。アプリケーション構成・連携を定義。' },
  { term: 'テクノロジーアーキテクチャ', aliases: ['Technology Architecture', 'TA', '技術アーキテクチャ'], description: 'EA4層の最下位。インフラ・プラットフォームを定義。' },
  { term: 'As-Is', aliases: ['現状', '現行アーキテクチャ'], description: '現在のアーキテクチャの状態。' },
  { term: 'To-Be', aliases: ['目標', '将来アーキテクチャ'], description: '目指すべきアーキテクチャの状態。' },
  { term: 'ギャップ分析', aliases: ['Gap Analysis'], description: 'As-IsとTo-Beの差異を分析し、移行計画を立てること。' },
  { term: 'ロードマップ', aliases: ['Roadmap', 'アーキテクチャロードマップ'], description: 'To-Be実現に向けた段階的な計画。' },

  // ========================================
  // アーキテクチャ原則・ガバナンス
  // ========================================
  { term: 'アーキテクチャ原則', aliases: ['Architecture Principles'], description: 'アーキテクチャ設計の指針となる原則・方針。' },
  { term: 'アーキテクチャガバナンス', aliases: ['Architecture Governance'], description: 'アーキテクチャの策定・維持・遵守を管理する仕組み。' },
  { term: 'アーキテクチャレビュー', aliases: ['Architecture Review', 'ARB'], description: 'アーキテクチャの適合性を審査するプロセス。' },
  { term: 'ARB', aliases: ['Architecture Review Board', 'アーキテクチャレビュー委員会'], description: 'アーキテクチャの審査・承認を行う組織体。' },
  { term: 'リファレンスアーキテクチャ', aliases: ['Reference Architecture', '参照アーキテクチャ'], description: '標準的なアーキテクチャパターンを定義したテンプレート。' },
  { term: 'アーキテクチャパターン', aliases: ['Architecture Pattern'], description: '繰り返し使えるアーキテクチャの設計パターン。' },
  { term: 'アーキテクチャ決定記録', aliases: ['ADR', 'Architecture Decision Record'], description: 'アーキテクチャ上の意思決定を記録する文書形式。' },

  // ========================================
  // システム統合・連携
  // ========================================
  { term: 'EAI', aliases: ['Enterprise Application Integration', 'エンタープライズアプリケーション統合'], description: '企業内の複数アプリケーションを連携させる仕組み・ミドルウェア。' },
  { term: 'ESB', aliases: ['Enterprise Service Bus', 'エンタープライズサービスバス'], description: 'サービス間連携を仲介するミドルウェア基盤。' },
  { term: 'SOA', aliases: ['Service-Oriented Architecture', 'サービス指向アーキテクチャ'], description: 'サービス単位でシステムを構成するアーキテクチャ。' },
  { term: 'API管理', aliases: ['API Management', 'APIM'], description: 'APIの公開・利用・監視を一元管理する仕組み。' },
  { term: 'APIゲートウェイ', aliases: ['API Gateway'], description: 'APIへのアクセスを集約・制御するコンポーネント。' },
  { term: 'iPaaS', aliases: ['Integration Platform as a Service'], description: 'クラウドベースの統合プラットフォームサービス。' },
  { term: 'ETL', aliases: ['Extract Transform Load'], description: 'データ抽出・変換・ロードの処理。データ統合の基本パターン。' },
  { term: 'ELT', aliases: ['Extract Load Transform'], description: 'データをまずロードし、その後変換する処理パターン。' },
  { term: 'CDC', aliases: ['Change Data Capture', '変更データキャプチャ'], description: 'データベースの変更を検知・伝播する仕組み。' },

  // ========================================
  // マイクロサービス・モダンアーキテクチャ
  // ========================================
  { term: 'マイクロサービス', aliases: ['Microservices', 'MSA', 'Microservices Architecture'], description: '小さな独立したサービスを組み合わせるアーキテクチャ。' },
  { term: 'モノリス', aliases: ['Monolith', 'モノリシック', 'Monolithic'], description: '単一の大きなアプリケーションとして構成されたアーキテクチャ。' },
  { term: 'ストラングラーパターン', aliases: ['Strangler Pattern', 'Strangler Fig Pattern'], description: 'レガシーシステムを段階的に新システムへ移行するパターン。' },
  { term: 'サーキットブレーカー', aliases: ['Circuit Breaker'], description: '障害伝播を防ぐためのパターン。一定の失敗で呼び出しを遮断。' },
  { term: 'サービスメッシュ', aliases: ['Service Mesh'], description: 'マイクロサービス間通信を管理するインフラ層。Istioなど。' },
  { term: 'サイドカーパターン', aliases: ['Sidecar Pattern'], description: 'メインコンテナに補助機能を持つコンテナを併設するパターン。' },
  { term: 'イベント駆動アーキテクチャ', aliases: ['Event-Driven Architecture', 'EDA'], description: 'イベントの発行・購読でシステムを疎結合に連携させる構成。' },
  { term: 'CQRS', aliases: ['Command Query Responsibility Segregation'], description: 'コマンド（更新）とクエリ（参照）を分離するパターン。' },
  { term: 'イベントソーシング', aliases: ['Event Sourcing'], description: '状態をイベントの履歴として保存するパターン。' },
  { term: 'サーガパターン', aliases: ['Saga Pattern'], description: '分散トランザクションを管理するパターン。補償トランザクションで整合性を保つ。' },

  // ========================================
  // クラウドアーキテクチャ
  // ========================================
  { term: 'クラウドネイティブ', aliases: ['Cloud Native', 'クラウドネイティブアーキテクチャ'], description: 'クラウドの利点を最大限活用する設計思想・アーキテクチャ。' },
  { term: 'CNCF', aliases: ['Cloud Native Computing Foundation'], description: 'クラウドネイティブ技術を推進する団体。Kubernetesなどを管轄。' },
  { term: '12 Factor App', aliases: ['Twelve-Factor App', '12ファクターアプリ'], description: 'クラウド向けアプリケーション設計の12原則。Herokuが提唱。' },
  { term: 'サーバーレス', aliases: ['Serverless', 'サーバーレスアーキテクチャ'], description: 'サーバー管理不要でコードを実行できるアーキテクチャ。FaaS。' },
  { term: 'FaaS', aliases: ['Function as a Service'], description: '関数単位でコードを実行するサービス。Lambda、Azure Functionsなど。' },
  { term: 'BaaS', aliases: ['Backend as a Service'], description: 'バックエンド機能をサービスとして提供。Firebase、Supabaseなど。' },
  { term: 'マルチクラウド', aliases: ['Multi-Cloud'], description: '複数のクラウドプロバイダーを組み合わせて利用する戦略。' },
  { term: 'ハイブリッドクラウド', aliases: ['Hybrid Cloud'], description: 'オンプレミスとクラウドを組み合わせた構成。' },
  { term: 'エッジコンピューティング', aliases: ['Edge Computing'], description: 'データ発生源の近くで処理を行う分散コンピューティング。' },

  // ========================================
  // アプリケーション戦略
  // ========================================
  { term: 'ベストオブブリード', aliases: ['Best of Breed', 'BoB'], description: '分野ごとに最適な製品を選択・組み合わせる戦略。' },
  { term: 'スイート', aliases: ['Suite', '統合スイート'], description: '同一ベンダーの製品群で統一する戦略。' },
  { term: 'ERP', aliases: ['Enterprise Resource Planning', '統合基幹業務システム'], description: '企業の基幹業務を統合管理するパッケージ。SAP、Oracleなど。' },
  { term: 'CRM', aliases: ['Customer Relationship Management', '顧客関係管理'], description: '顧客情報・関係を管理するシステム。Salesforceなど。' },
  { term: 'SCM', aliases: ['Supply Chain Management', 'サプライチェーン管理'], description: '調達から販売までの供給網を管理するシステム。' },
  { term: 'HRM', aliases: ['Human Resource Management', '人事管理システム', 'HCM'], description: '人事・労務を管理するシステム。' },
  { term: 'BPM', aliases: ['Business Process Management', 'ビジネスプロセス管理'], description: '業務プロセスを可視化・最適化・自動化する手法。' },
  { term: 'RPA', aliases: ['Robotic Process Automation'], description: 'ソフトウェアロボットで定型業務を自動化する技術。' },
  { term: 'ローコード', aliases: ['Low-Code', 'ローコード開発'], description: '少ないコーディングでアプリケーションを開発できるプラットフォーム。' },
  { term: 'ノーコード', aliases: ['No-Code', 'ノーコード開発'], description: 'コーディング不要でアプリケーションを開発できるプラットフォーム。' },
  { term: 'シチズンデベロッパー', aliases: ['Citizen Developer', '市民開発者'], description: 'IT部門以外の業務担当者がアプリを開発すること。' },

  // ========================================
  // ITガバナンス・マネジメント
  // ========================================
  { term: 'ITガバナンス', aliases: ['IT Governance'], description: '経営戦略とITを整合させ、IT投資の価値を最大化する統制の仕組み。' },
  { term: 'COBIT', aliases: ['Control Objectives for Information and Related Technologies'], description: 'ISACAが策定したITガバナンスのフレームワーク。' },
  { term: 'ITIL', aliases: ['Information Technology Infrastructure Library'], description: 'ITサービスマネジメントのベストプラクティス集。' },
  { term: 'ITSM', aliases: ['IT Service Management', 'ITサービスマネジメント'], description: 'ITサービスを効果的に提供・管理する手法。' },
  { term: 'IT投資', aliases: ['IT Investment'], description: '情報システムへの投資。TCO、ROIで評価。' },
  { term: 'TCO', aliases: ['Total Cost of Ownership', '総所有コスト'], description: 'システムの導入から廃棄までの総費用。' },
  { term: 'ROI', aliases: ['Return on Investment', '投資対効果'], description: '投資に対するリターン（利益・効果）の割合。' },
  { term: 'IT資産管理', aliases: ['IT Asset Management', 'ITAM'], description: 'IT資産のライフサイクルを管理する活動。' },
  { term: '構成管理', aliases: ['Configuration Management', 'CMDB'], description: 'IT資産と構成情報を一元管理するデータベース。' },

  // ========================================
  // データマネジメント
  // ========================================
  { term: 'データガバナンス', aliases: ['Data Governance'], description: 'データの品質・セキュリティ・活用を組織的に管理する仕組み。' },
  { term: 'データマネジメント', aliases: ['Data Management', 'DM'], description: 'データのライフサイクル全体を管理する活動。' },
  { term: 'DMBOK', aliases: ['Data Management Body of Knowledge'], description: 'DAMAが策定したデータマネジメントの知識体系。' },
  { term: 'マスターデータ管理', aliases: ['Master Data Management', 'MDM'], description: '組織横断で共有される基幹データを一元管理する仕組み。' },
  { term: 'データカタログ', aliases: ['Data Catalog'], description: '組織内のデータ資産を検索・理解できるようにするメタデータ管理ツール。' },
  { term: 'データリネージ', aliases: ['Data Lineage', 'データ系譜'], description: 'データの発生源から最終利用までの流れを追跡すること。' },
  { term: 'データ品質', aliases: ['Data Quality', 'DQ'], description: 'データの正確性・完全性・一貫性・適時性などの品質特性。' },
  { term: 'データレイク', aliases: ['Data Lake'], description: '構造化・非構造化データを生のまま蓄積するストレージ。' },
  { term: 'データウェアハウス', aliases: ['Data Warehouse', 'DWH'], description: '分析用に整理・統合されたデータの格納庫。' },
  { term: 'データマート', aliases: ['Data Mart'], description: '特定目的向けに抽出されたデータの小規模な集合。' },
  { term: 'データファブリック', aliases: ['Data Fabric'], description: '分散したデータを仮想的に統合・アクセス可能にするアーキテクチャ。' },
  { term: 'データメッシュ', aliases: ['Data Mesh'], description: 'ドメイン単位でデータの所有・提供を分散管理するアプローチ。' },

  // ========================================
  // セキュリティアーキテクチャ
  // ========================================
  { term: 'ゼロトラスト', aliases: ['Zero Trust', 'ゼロトラストアーキテクチャ'], description: '何も信頼せず常に検証するセキュリティモデル。' },
  { term: '多層防御', aliases: ['Defense in Depth', 'DiD'], description: '複数のセキュリティ対策を重ねて防御する考え方。' },
  { term: 'SASE', aliases: ['Secure Access Service Edge'], description: 'ネットワークとセキュリティを統合したクラウドサービス。' },
  { term: 'SSE', aliases: ['Security Service Edge'], description: 'セキュリティ機能をクラウドで提供するサービス。SASEのサブセット。' },
  { term: 'IAM', aliases: ['Identity and Access Management', 'アイデンティティ管理'], description: 'ユーザーの認証・認可を一元管理する仕組み。' },
  { term: 'PAM', aliases: ['Privileged Access Management', '特権アクセス管理'], description: '特権アカウントのアクセスを管理・監視する仕組み。' },

  // ========================================
  // DevOps・プラットフォーム
  // ========================================
  { term: 'プラットフォームエンジニアリング', aliases: ['Platform Engineering'], description: '開発者の生産性を高めるプラットフォームを構築・運用する専門分野。' },
  { term: 'IDP', aliases: ['Internal Developer Platform', '内部開発者プラットフォーム'], description: '開発者向けのセルフサービス型インフラ基盤。' },
  { term: 'DevSecOps', aliases: ['DevSecOps'], description: 'DevOpsにセキュリティを組み込んだ開発運用手法。' },
  { term: 'GitOps', aliases: ['GitOps'], description: 'Gitをインフラ管理の信頼できる情報源とする運用手法。' },
  { term: 'IaC', aliases: ['Infrastructure as Code', 'インフラのコード化'], description: 'インフラ構成をコードで定義・管理する手法。' },
  { term: 'オブザーバビリティ', aliases: ['Observability', '可観測性'], description: 'システムの内部状態を外部から把握できる能力。' },

  // ========================================
  // アーキテクトの役割
  // ========================================
  { term: 'エンタープライズアーキテクト', aliases: ['Enterprise Architect'], description: '組織全体のIT構造を設計・最適化する専門家。' },
  { term: 'ソリューションアーキテクト', aliases: ['Solution Architect', 'SA'], description: '特定ソリューションの設計を担当するアーキテクト。' },
  { term: 'テクニカルアーキテクト', aliases: ['Technical Architect'], description: '技術面の設計・実装を担当するアーキテクト。' },
  { term: 'データアーキテクト', aliases: ['Data Architect'], description: 'データ構造・データ管理を設計するアーキテクト。' },
  { term: 'クラウドアーキテクト', aliases: ['Cloud Architect'], description: 'クラウド環境の設計を担当するアーキテクト。' },
  { term: 'セキュリティアーキテクト', aliases: ['Security Architect'], description: 'セキュリティ設計を担当するアーキテクト。' },
];

/**
 * コンソール用語（サービス名と代表リソース用語）
 *
 * TSVから生成されたデータ（TSVは廃止済み）。
 * このファイルは `glossary.ts` から参照される。
 */

export type ConsoleGlossaryRow = Readonly<{ service: string; terms: ReadonlyArray<string> }>;

export const AWS_CONSOLE_GLOSSARY: ReadonlyArray<ConsoleGlossaryRow> = [
  {
    "service": "EC2",
    "terms": [
      "インスタンス",
      "AMI",
      "起動テンプレート",
      "セキュリティグループ",
      "ネットワークインターフェイス",
      "ボリューム",
      "スナップショット",
      "Elastic IP",
      "プレイスメントグループ"
    ]
  },
  {
    "service": "VPC",
    "terms": [
      "VPC",
      "サブネット",
      "ルートテーブル",
      "インターネットゲートウェイ",
      "NATゲートウェイ",
      "ネットワークACL",
      "セキュリティグループ",
      "VPCエンドポイント",
      "ピアリング接続"
    ]
  },
  {
    "service": "Elastic Load Balancing",
    "terms": [
      "ロードバランサー(ALB/NLB)",
      "ターゲットグループ",
      "リスナー",
      "ルール"
    ]
  },
  {
    "service": "Route 53",
    "terms": [
      "ホストゾーン",
      "レコード",
      "ヘルスチェック"
    ]
  },
  {
    "service": "CloudFront",
    "terms": [
      "ディストリビューション",
      "オリジン",
      "ビヘイビア",
      "キャッシュポリシー",
      "オリジンリクエストポリシー"
    ]
  },
  {
    "service": "S3",
    "terms": [
      "バケット",
      "オブジェクト",
      "プレフィックス",
      "バケットポリシー",
      "ライフサイクルルール",
      "静的ウェブサイトホスティング"
    ]
  },
  {
    "service": "EBS",
    "terms": [
      "ボリューム",
      "スナップショット"
    ]
  },
  {
    "service": "EFS",
    "terms": [
      "ファイルシステム",
      "マウントターゲット",
      "アクセスポイント"
    ]
  },
  {
    "service": "FSx",
    "terms": [
      "ファイルシステム"
    ]
  },
  {
    "service": "Backup",
    "terms": [
      "バックアップボールト",
      "バックアッププラン",
      "バックアップ選択",
      "リカバリーポイント"
    ]
  },
  {
    "service": "RDS",
    "terms": [
      "DBインスタンス",
      "DBクラスター",
      "サブネットグループ",
      "パラメータグループ",
      "オプショングループ",
      "スナップショット"
    ]
  },
  {
    "service": "DynamoDB",
    "terms": [
      "テーブル",
      "セカンダリインデックス(GSI/LSI)",
      "ストリーム",
      "TTL",
      "バックアップ"
    ]
  },
  {
    "service": "ElastiCache",
    "terms": [
      "クラスター",
      "レプリケーショングループ",
      "サブネットグループ",
      "パラメータグループ"
    ]
  },
  {
    "service": "OpenSearch Service",
    "terms": [
      "ドメイン",
      "インデックス",
      "スナップショット"
    ]
  },
  {
    "service": "Redshift",
    "terms": [
      "クラスター",
      "スナップショット",
      "パラメータグループ",
      "サブネットグループ"
    ]
  },
  {
    "service": "Neptune",
    "terms": [
      "DBクラスター",
      "DBインスタンス",
      "パラメータグループ"
    ]
  },
  {
    "service": "Lambda",
    "terms": [
      "関数",
      "レイヤー",
      "エイリアス",
      "バージョン",
      "トリガー",
      "イベントソースマッピング"
    ]
  },
  {
    "service": "ECS",
    "terms": [
      "クラスター",
      "サービス",
      "タスク定義",
      "タスク"
    ]
  },
  {
    "service": "ECR",
    "terms": [
      "リポジトリ",
      "イメージ"
    ]
  },
  {
    "service": "EKS",
    "terms": [
      "クラスター",
      "ノードグループ",
      "アドオン"
    ]
  },
  {
    "service": "Batch",
    "terms": [
      "コンピュート環境",
      "ジョブキュー",
      "ジョブ定義",
      "ジョブ"
    ]
  },
  {
    "service": "Step Functions",
    "terms": [
      "ステートマシン",
      "実行",
      "アクティビティ"
    ]
  },
  {
    "service": "API Gateway",
    "terms": [
      "API(REST/HTTP/WebSocket)",
      "ステージ",
      "ルート",
      "統合",
      "使用量プラン",
      "APIキー"
    ]
  },
  {
    "service": "EventBridge",
    "terms": [
      "イベントバス",
      "ルール",
      "ターゲット",
      "スケジュール"
    ]
  },
  {
    "service": "SQS",
    "terms": [
      "キュー",
      "デッドレターキュー"
    ]
  },
  {
    "service": "SNS",
    "terms": [
      "トピック",
      "サブスクリプション"
    ]
  },
  {
    "service": "Kinesis",
    "terms": [
      "データストリーム",
      "配信ストリーム(Firehose)"
    ]
  },
  {
    "service": "CloudWatch",
    "terms": [
      "メトリクス",
      "アラーム",
      "ダッシュボード",
      "ロググループ",
      "ログストリーム"
    ]
  },
  {
    "service": "CloudTrail",
    "terms": [
      "証跡(トレイル)",
      "イベント履歴"
    ]
  },
  {
    "service": "Config",
    "terms": [
      "レコーダー",
      "デリバリーチャネル",
      "ルール"
    ]
  },
  {
    "service": "IAM",
    "terms": [
      "ユーザー",
      "グループ",
      "ロール",
      "ポリシー",
      "インスタンスプロファイル"
    ]
  },
  {
    "service": "KMS",
    "terms": [
      "キー",
      "エイリアス",
      "グラント"
    ]
  },
  {
    "service": "Secrets Manager",
    "terms": [
      "シークレット",
      "ローテーション"
    ]
  },
  {
    "service": "ACM",
    "terms": [
      "証明書"
    ]
  },
  {
    "service": "WAF",
    "terms": [
      "Web ACL",
      "ルール",
      "ルールグループ"
    ]
  },
  {
    "service": "GuardDuty",
    "terms": [
      "ディテクタ",
      "検出結果"
    ]
  },
  {
    "service": "Security Hub",
    "terms": [
      "セキュリティ標準",
      "検出結果"
    ]
  },
  {
    "service": "Systems Manager",
    "terms": [
      "パラメータストア(パラメータ)",
      "ドキュメント",
      "セッション",
      "メンテナンスウィンドウ",
      "パッチベースライン"
    ]
  },
  {
    "service": "CloudFormation",
    "terms": [
      "スタック",
      "変更セット",
      "スタックセット",
      "テンプレート"
    ]
  },
  {
    "service": "Organizations",
    "terms": [
      "組織",
      "OU",
      "アカウント",
      "サービスポリシー(SCP)"
    ]
  },
  {
    "service": "STS",
    "terms": [
      "一時認証情報",
      "セッション"
    ]
  },
  {
    "service": "S3 Glacier",
    "terms": [
      "ボールト",
      "アーカイブ"
    ]
  },
  {
    "service": "Storage Gateway",
    "terms": [
      "ゲートウェイ",
      "ファイル共有",
      "ボリューム",
      "テープ"
    ]
  },
  {
    "service": "DataSync",
    "terms": [
      "タスク",
      "エージェント",
      "ロケーション"
    ]
  },
  {
    "service": "Transfer Family",
    "terms": [
      "サーバー(SFTP/FTPS/FTP)",
      "ユーザー",
      "ワークフロー"
    ]
  },
  {
    "service": "Elastic Disaster Recovery",
    "terms": [
      "ソースサーバー",
      "レプリケーション設定",
      "リカバリインスタンス"
    ]
  },
  {
    "service": "AWS Backup Gateway",
    "terms": [
      "ゲートウェイ",
      "ハイパーバイザ",
      "バックアップ"
    ]
  },
  {
    "service": "DMS",
    "terms": [
      "レプリケーションインスタンス",
      "ソースエンドポイント",
      "ターゲットエンドポイント",
      "タスク"
    ]
  },
  {
    "service": "Migration Hub",
    "terms": [
      "移行プロジェクト",
      "ディスカバリーコネクタ",
      "進捗"
    ]
  },
  {
    "service": "Application Migration Service",
    "terms": [
      "ソースサーバー",
      "レプリケーションテンプレート",
      "起動テンプレート",
      "テスト/カットオーバー"
    ]
  },
  {
    "service": "CloudEndure Migration",
    "terms": [
      "移行プロジェクト",
      "レプリケーション",
      "ブループリント"
    ]
  },
  {
    "service": "Elastic Beanstalk",
    "terms": [
      "アプリケーション",
      "環境",
      "バージョン",
      "設定テンプレート"
    ]
  },
  {
    "service": "App Runner",
    "terms": [
      "サービス",
      "リビジョン",
      "オートスケーリング設定",
      "接続"
    ]
  },
  {
    "service": "Lightsail",
    "terms": [
      "インスタンス",
      "静的IP",
      "スナップショット",
      "ロードバランサー",
      "コンテナサービス",
      "データベース"
    ]
  },
  {
    "service": "Outposts",
    "terms": [
      "アウトポスト",
      "サイト",
      "ラック",
      "ローカルゲートウェイ"
    ]
  },
  {
    "service": "Wavelength",
    "terms": [
      "ゾーン",
      "キャリアゲートウェイ",
      "サブネット"
    ]
  },
  {
    "service": "Global Accelerator",
    "terms": [
      "アクセラレータ",
      "リスナー",
      "エンドポイントグループ",
      "エンドポイント"
    ]
  },
  {
    "service": "PrivateLink",
    "terms": [
      "エンドポイントサービス",
      "エンドポイント",
      "エンドポイントポリシー"
    ]
  },
  {
    "service": "Transit Gateway",
    "terms": [
      "トランジットゲートウェイ",
      "アタッチメント",
      "ルートテーブル"
    ]
  },
  {
    "service": "Direct Connect",
    "terms": [
      "接続",
      "仮想インターフェイス",
      "LAG",
      "ゲートウェイ"
    ]
  },
  {
    "service": "Client VPN",
    "terms": [
      "クライアントVPNエンドポイント",
      "ルート",
      "認可ルール"
    ]
  },
  {
    "service": "Network Firewall",
    "terms": [
      "ファイアウォール",
      "ファイアウォールポリシー",
      "ルールグループ"
    ]
  },
  {
    "service": "RAM",
    "terms": [
      "リソース共有",
      "プリンシパル",
      "共有許可"
    ]
  },
  {
    "service": "Cloud Map",
    "terms": [
      "名前空間",
      "サービス",
      "インスタンス",
      "ヘルスチェック"
    ]
  },
  {
    "service": "Service Discovery",
    "terms": [
      "名前空間",
      "サービス",
      "インスタンス"
    ]
  },
  {
    "service": "ECR Public",
    "terms": [
      "パブリックリポジトリ",
      "イメージ"
    ]
  },
  {
    "service": "App Mesh",
    "terms": [
      "メッシュ",
      "仮想サービス",
      "仮想ノード",
      "仮想ルーター",
      "ルート",
      "ゲートウェイ"
    ]
  },
  {
    "service": "CloudWatch Application Insights",
    "terms": [
      "アプリケーション",
      "コンポーネント",
      "問題"
    ]
  },
  {
    "service": "X-Ray",
    "terms": [
      "トレース",
      "セグメント",
      "サービスマップ",
      "グループ",
      "サンプリングルール"
    ]
  },
  {
    "service": "OpenTelemetry",
    "terms": [
      "トレース",
      "メトリクス",
      "ログ"
    ]
  },
  {
    "service": "Managed Grafana",
    "terms": [
      "ワークスペース",
      "ユーザー",
      "データソース"
    ]
  },
  {
    "service": "Managed Prometheus",
    "terms": [
      "ワークスペース",
      "ルールグループ",
      "アラートマネージャ"
    ]
  },
  {
    "service": "Logs",
    "terms": [
      "ロググループ",
      "ログストリーム",
      "サブスクリプションフィルター",
      "メトリクスフィルター"
    ]
  },
  {
    "service": "CloudWatch Synthetics",
    "terms": [
      "カナリア",
      "実行",
      "アーティファクト"
    ]
  },
  {
    "service": "RUM",
    "terms": [
      "アプリモニター",
      "イベント"
    ]
  },
  {
    "service": "CloudTrail Lake",
    "terms": [
      "イベントデータストア",
      "クエリ",
      "ダッシュボード"
    ]
  },
  {
    "service": "Audit Manager",
    "terms": [
      "フレームワーク",
      "評価",
      "コントロール",
      "エビデンス"
    ]
  },
  {
    "service": "Artifact",
    "terms": [
      "契約",
      "レポート",
      "同意"
    ]
  },
  {
    "service": "Trusted Advisor",
    "terms": [
      "チェック",
      "推奨事項"
    ]
  },
  {
    "service": "Health",
    "terms": [
      "イベント",
      "影響を受けるエンティティ"
    ]
  },
  {
    "service": "Support",
    "terms": [
      "ケース",
      "添付",
      "通信"
    ]
  },
  {
    "service": "Well-Architected Tool",
    "terms": [
      "ワークロード",
      "レビュー",
      "マイルストーン",
      "レンズ"
    ]
  },
  {
    "service": "Service Catalog",
    "terms": [
      "ポートフォリオ",
      "製品",
      "プロビジョニングアーティファクト",
      "制約",
      "タグオプション"
    ]
  },
  {
    "service": "Control Tower",
    "terms": [
      "ランディングゾーン",
      "コントロール",
      "アカウントファクトリ"
    ]
  },
  {
    "service": "SSO Admin",
    "terms": [
      "インスタンス",
      "許可セット",
      "アカウント割り当て"
    ]
  },
  {
    "service": "IAM Identity Center",
    "terms": [
      "ユーザー",
      "グループ",
      "許可セット",
      "アプリケーション"
    ]
  },
  {
    "service": "Directory Service",
    "terms": [
      "ディレクトリ",
      "トラスト",
      "スナップショット"
    ]
  },
  {
    "service": "Cognito",
    "terms": [
      "ユーザープール",
      "アイデンティティプール",
      "アプリクライアント",
      "ドメイン"
    ]
  },
  {
    "service": "Verified Permissions",
    "terms": [
      "ポリシーストア",
      "ポリシー",
      "スキーマ"
    ]
  },
  {
    "service": "IAM Access Analyzer",
    "terms": [
      "アナライザー",
      "検出結果",
      "アーカイブルール"
    ]
  },
  {
    "service": "Inspector",
    "terms": [
      "評価テンプレート",
      "評価ターゲット",
      "検出結果"
    ]
  },
  {
    "service": "Macie",
    "terms": [
      "ジョブ",
      "検出結果",
      "カスタムデータ識別子"
    ]
  },
  {
    "service": "Detective",
    "terms": [
      "グラフ",
      "メンバーアカウント",
      "検出結果"
    ]
  },
  {
    "service": "Firewall Manager",
    "terms": [
      "ポリシー",
      "スコープ",
      "コンプライアンス"
    ]
  },
  {
    "service": "Shield",
    "terms": [
      "保護",
      "攻撃イベント",
      "連絡先"
    ]
  },
  {
    "service": "ACM Private CA",
    "terms": [
      "認証局(CA)",
      "証明書",
      "証明書失効リスト(CRL)"
    ]
  },
  {
    "service": "Key Management Service",
    "terms": [
      "キー",
      "エイリアス",
      "グラント"
    ]
  },
  {
    "service": "CloudHSM",
    "terms": [
      "クラスター",
      "HSM",
      "バックアップ"
    ]
  },
  {
    "service": "SSM Parameter Store",
    "terms": [
      "パラメータ",
      "パラメータポリシー"
    ]
  },
  {
    "service": "Certificate Manager",
    "terms": [
      "証明書",
      "検証",
      "更新"
    ]
  },
  {
    "service": "WAFv2",
    "terms": [
      "Web ACL",
      "ルール",
      "ルールグループ",
      "IPセット",
      "正規表現パターンセット"
    ]
  },
  {
    "service": "Lake Formation",
    "terms": [
      "データレイク設定",
      "許可",
      "LFタグ",
      "リソースリンク"
    ]
  },
  {
    "service": "Glue",
    "terms": [
      "データカタログ",
      "クローラ",
      "ジョブ",
      "ワークフロー",
      "トリガー",
      "接続",
      "開発エンドポイント"
    ]
  },
  {
    "service": "Athena",
    "terms": [
      "ワークグループ",
      "クエリ",
      "名前付きクエリ",
      "データカタログ"
    ]
  },
  {
    "service": "EMR",
    "terms": [
      "クラスター",
      "ステップ",
      "インスタンスグループ",
      "セキュリティ設定"
    ]
  },
  {
    "service": "EMR Serverless",
    "terms": [
      "アプリケーション",
      "ジョブ実行"
    ]
  },
  {
    "service": "MWAA",
    "terms": [
      "環境",
      "DAG",
      "実行",
      "接続",
      "変数"
    ]
  },
  {
    "service": "DataBrew",
    "terms": [
      "レシピ",
      "プロジェクト",
      "データセット",
      "ジョブ",
      "ルールセット"
    ]
  },
  {
    "service": "QuickSight",
    "terms": [
      "データセット",
      "データソース",
      "分析",
      "ダッシュボード",
      "テンプレート"
    ]
  },
  {
    "service": "Kinesis Data Analytics",
    "terms": [
      "アプリケーション",
      "入力",
      "出力"
    ]
  },
  {
    "service": "Kinesis Video Streams",
    "terms": [
      "ストリーム",
      "チャネル",
      "アーカイブ",
      "シグナリング"
    ]
  },
  {
    "service": "MSK",
    "terms": [
      "クラスター",
      "設定",
      "ACL",
      "トピック"
    ]
  },
  {
    "service": "Glue Data Catalog",
    "terms": [
      "データベース",
      "テーブル",
      "パーティション"
    ]
  },
  {
    "service": "Timestream",
    "terms": [
      "データベース",
      "テーブル",
      "スケジュールクエリ"
    ]
  },
  {
    "service": "QLDB",
    "terms": [
      "台帳",
      "テーブル",
      "ストリーム",
      "ジャーナル"
    ]
  },
  {
    "service": "Keyspaces",
    "terms": [
      "キースペース",
      "テーブル"
    ]
  },
  {
    "service": "MemoryDB",
    "terms": [
      "クラスター",
      "サブネットグループ",
      "ACL",
      "ユーザー"
    ]
  },
  {
    "service": "DocumentDB",
    "terms": [
      "クラスター",
      "インスタンス",
      "パラメータグループ",
      "サブネットグループ"
    ]
  },
  {
    "service": "AppSync",
    "terms": [
      "GraphQL API",
      "データソース",
      "リゾルバ",
      "関数",
      "スキーマ"
    ]
  },
  {
    "service": "AppFlow",
    "terms": [
      "フロー",
      "コネクタ",
      "実行履歴"
    ]
  },
  {
    "service": "SWF",
    "terms": [
      "ドメイン",
      "ワークフロー実行",
      "アクティビティ"
    ]
  },
  {
    "service": "SNS Mobile Push",
    "terms": [
      "プラットフォームアプリケーション",
      "エンドポイント"
    ]
  },
  {
    "service": "Pinpoint",
    "terms": [
      "プロジェクト",
      "セグメント",
      "キャンペーン",
      "ジャーニー",
      "メッセージテンプレート"
    ]
  },
  {
    "service": "SES",
    "terms": [
      "ID(ドメイン/メール)",
      "設定セット",
      "ルールセット",
      "テンプレート",
      "受信ルール"
    ]
  },
  {
    "service": "WorkMail",
    "terms": [
      "組織",
      "ユーザー",
      "グループ",
      "リソース(会議室など)"
    ]
  },
  {
    "service": "WorkSpaces",
    "terms": [
      "ワークスペース",
      "ディレクトリ",
      "バンドル",
      "イメージ"
    ]
  },
  {
    "service": "AppStream 2.0",
    "terms": [
      "フリート",
      "スタック",
      "イメージビルダー",
      "セッション"
    ]
  },
  {
    "service": "Cloud9",
    "terms": [
      "環境",
      "メンバー"
    ]
  },
  {
    "service": "CodeCommit",
    "terms": [
      "リポジトリ",
      "ブランチ",
      "プルリクエスト"
    ]
  },
  {
    "service": "CodeBuild",
    "terms": [
      "プロジェクト",
      "ビルド",
      "レポートグループ"
    ]
  },
  {
    "service": "CodeDeploy",
    "terms": [
      "アプリケーション",
      "デプロイグループ",
      "デプロイ",
      "デプロイ設定"
    ]
  },
  {
    "service": "CodePipeline",
    "terms": [
      "パイプライン",
      "ステージ",
      "アクション",
      "実行"
    ]
  },
  {
    "service": "CodeArtifact",
    "terms": [
      "ドメイン",
      "リポジトリ",
      "パッケージ",
      "パッケージバージョン"
    ]
  },
  {
    "service": "CodeStar",
    "terms": [
      "プロジェクト",
      "接続"
    ]
  },
  {
    "service": "Amplify",
    "terms": [
      "アプリ",
      "ブランチ",
      "バックエンド環境",
      "デプロイ"
    ]
  },
  {
    "service": "CloudShell",
    "terms": [
      "環境",
      "セッション"
    ]
  },
  {
    "service": "SageMaker",
    "terms": [
      "ドメイン",
      "ユーザープロファイル",
      "アプリ",
      "ノートブックインスタンス",
      "エンドポイント",
      "エンドポイント設定",
      "モデル",
      "トレーニングジョブ",
      "処理ジョブ",
      "パイプライン",
      "Feature Store(フィーチャーグループ)",
      "モニタリングスケジュール"
    ]
  },
  {
    "service": "Bedrock",
    "terms": [
      "基盤モデル",
      "カスタムモデル",
      "ナレッジベース",
      "エージェント",
      "エージェントエイリアス",
      "ガードレール",
      "プロンプト",
      "フロー"
    ]
  },
  {
    "service": "Rekognition",
    "terms": [
      "コレクション",
      "ストリームプロセッサ",
      "プロジェクト(Custom Labels)",
      "モデル",
      "データセット",
      "推論"
    ]
  },
  {
    "service": "Comprehend",
    "terms": [
      "カスタム分類器",
      "エンティティ認識器",
      "エンドポイント",
      "ジョブ",
      "フライホイール"
    ]
  },
  {
    "service": "Comprehend Medical",
    "terms": [
      "推論ジョブ",
      "エンティティ検出"
    ]
  },
  {
    "service": "Textract",
    "terms": [
      "分析ジョブ",
      "アダプター",
      "クエリ",
      "通知設定"
    ]
  },
  {
    "service": "Translate",
    "terms": [
      "用語集",
      "並列データ",
      "カスタム翻訳ジョブ"
    ]
  },
  {
    "service": "Transcribe",
    "terms": [
      "文字起こしジョブ",
      "カスタム語彙",
      "語彙フィルタ",
      "言語モデル"
    ]
  },
  {
    "service": "Polly",
    "terms": [
      "音声",
      "辞書(レキシコン)",
      "音声合成タスク"
    ]
  },
  {
    "service": "Lex",
    "terms": [
      "ボット",
      "ボットエイリアス",
      "インテント",
      "スロットタイプ",
      "ロケール",
      "バージョン"
    ]
  },
  {
    "service": "Connect",
    "terms": [
      "インスタンス",
      "コンタクトフロー",
      "ルーティングプロファイル",
      "キュー",
      "営業時間",
      "ユーザー",
      "セキュリティプロファイル",
      "電話番号"
    ]
  },
  {
    "service": "Chime",
    "terms": [
      "アカウント",
      "会議",
      "ユーザー",
      "ボイスコネクタ"
    ]
  },
  {
    "service": "Chime SDK",
    "terms": [
      "アプリケーションインスタンス",
      "メッセージング設定",
      "通話分析"
    ]
  },
  {
    "service": "Kendra",
    "terms": [
      "インデックス",
      "データソース",
      "同義語",
      "FAQ",
      "クエリ提案"
    ]
  },
  {
    "service": "Personalize",
    "terms": [
      "データセットグループ",
      "データセット",
      "スキーマ",
      "インポートジョブ",
      "ソリューション",
      "ソリューションバージョン",
      "キャンペーン",
      "フィルタ"
    ]
  },
  {
    "service": "Forecast",
    "terms": [
      "データセットグループ",
      "データセット",
      "インポートジョブ",
      "予測器",
      "予測",
      "エクスポート"
    ]
  },
  {
    "service": "Fraud Detector",
    "terms": [
      "イベントタイプ",
      "エンティティタイプ",
      "モデル",
      "ルール",
      "変数",
      "ディテクタ",
      "バージョン"
    ]
  },
  {
    "service": "HealthLake",
    "terms": [
      "データストア",
      "エクスポートジョブ",
      "インポートジョブ",
      "FHIRデータ"
    ]
  },
  {
    "service": "IoT Core",
    "terms": [
      "モノ(Thing)",
      "証明書",
      "ポリシー",
      "ルール",
      "トピック",
      "ジョブ",
      "影(Thing Shadow)"
    ]
  },
  {
    "service": "IoT Device Management",
    "terms": [
      "フリートインデックス",
      "ジョブ",
      "グループ",
      "ポリシー"
    ]
  },
  {
    "service": "IoT Greengrass",
    "terms": [
      "コンポーネント",
      "デプロイ",
      "グループ",
      "デバイス"
    ]
  },
  {
    "service": "IoT Analytics",
    "terms": [
      "チャネル",
      "パイプライン",
      "データセット",
      "データストア",
      "ノートブック"
    ]
  },
  {
    "service": "IoT Events",
    "terms": [
      "入力",
      "検出器モデル",
      "アラーム",
      "アクション"
    ]
  },
  {
    "service": "IoT SiteWise",
    "terms": [
      "アセット",
      "アセットモデル",
      "測定値",
      "ゲートウェイ",
      "ポータル",
      "ダッシュボード"
    ]
  },
  {
    "service": "IoT TwinMaker",
    "terms": [
      "ワークスペース",
      "シーン",
      "エンティティ",
      "コンポーネント"
    ]
  },
  {
    "service": "IoT FleetWise",
    "terms": [
      "フリート",
      "車両",
      "デコーダーマニフェスト",
      "シグナルカタログ",
      "キャンペーン"
    ]
  },
  {
    "service": "FreeRTOS",
    "terms": [
      "ライブラリ",
      "デバイス認証",
      "OTA更新"
    ]
  },
  {
    "service": "RoboMaker",
    "terms": [
      "シミュレーションジョブ",
      "ロボットアプリケーション",
      "シミュレーションアプリケーション",
      "フリート"
    ]
  },
  {
    "service": "GameLift",
    "terms": [
      "フリート",
      "ゲームセッション",
      "マッチメイキング設定",
      "ビルド",
      "キュー"
    ]
  },
  {
    "service": "IVS",
    "terms": [
      "チャネル",
      "ストリームキー",
      "録画設定",
      "再生設定"
    ]
  },
  {
    "service": "IVS Chat",
    "terms": [
      "チャットルーム",
      "メッセージング",
      "ログ設定"
    ]
  },
  {
    "service": "MediaConvert",
    "terms": [
      "ジョブ",
      "ジョブテンプレート",
      "キュー",
      "プリセット"
    ]
  },
  {
    "service": "MediaLive",
    "terms": [
      "チャンネル",
      "入力",
      "入力セキュリティグループ",
      "出力グループ"
    ]
  },
  {
    "service": "MediaPackage",
    "terms": [
      "チャンネル",
      "エンドポイント",
      "パッケージ設定"
    ]
  },
  {
    "service": "MediaStore",
    "terms": [
      "コンテナ",
      "オブジェクト",
      "コンテナポリシー"
    ]
  },
  {
    "service": "MediaTailor",
    "terms": [
      "設定",
      "セッション",
      "収益化設定"
    ]
  },
  {
    "service": "MediaConnect",
    "terms": [
      "フロー",
      "出力",
      "ソース",
      "エンタイトルメント"
    ]
  },
  {
    "service": "Elemental Link",
    "terms": [
      "デバイス",
      "チャンネル関連付け"
    ]
  },
  {
    "service": "Elemental Appliances and Software",
    "terms": [
      "アプライアンス",
      "ジョブ",
      "デバイス"
    ]
  },
  {
    "service": "Kinesis Data Firehose",
    "terms": [
      "配信ストリーム",
      "変換",
      "送信先設定"
    ]
  },
  {
    "service": "MSK Connect",
    "terms": [
      "コネクタ",
      "ワーカー設定",
      "カスタムプラグイン"
    ]
  },
  {
    "service": "OpenSearch Ingestion",
    "terms": [
      "パイプライン",
      "送信元",
      "送信先"
    ]
  },
  {
    "service": "Glue Studio",
    "terms": [
      "ジョブ",
      "ノード",
      "接続",
      "スケジュール"
    ]
  },
  {
    "service": "Lake Formation Permissions",
    "terms": [
      "許可",
      "データロケーション",
      "LFタグ",
      "リソース共有"
    ]
  },
  {
    "service": "Data Exchange",
    "terms": [
      "データセット",
      "製品",
      "サブスクリプション",
      "ジョブ"
    ]
  },
  {
    "service": "Marketplace",
    "terms": [
      "サブスクリプション",
      "契約",
      "製品"
    ]
  },
  {
    "service": "Budgets",
    "terms": [
      "予算",
      "アラート",
      "アクション"
    ]
  },
  {
    "service": "Cost Explorer",
    "terms": [
      "レポート",
      "フィルタ",
      "予測"
    ]
  },
  {
    "service": "Cost and Usage Report",
    "terms": [
      "レポート定義",
      "配信設定"
    ]
  },
  {
    "service": "Billing",
    "terms": [
      "請求書",
      "支払い方法",
      "請求アラート"
    ]
  },
  {
    "service": "Cost Anomaly Detection",
    "terms": [
      "異常モニター",
      "異常サブスクリプション",
      "異常検出"
    ]
  },
  {
    "service": "Compute Optimizer",
    "terms": [
      "推奨事項",
      "適用状況",
      "解析"
    ]
  },
  {
    "service": "Resilience Hub",
    "terms": [
      "アプリケーション",
      "レジリエンス評価",
      "推奨事項"
    ]
  },
  {
    "service": "Fault Injection Service",
    "terms": [
      "実験テンプレート",
      "実験",
      "アクション",
      "ターゲット",
      "停止条件"
    ]
  },
  {
    "service": "Incident Manager",
    "terms": [
      "レスポンスプラン",
      "インシデント",
      "連絡先",
      "エンゲージメント"
    ]
  },
  {
    "service": "SSM Incident Manager",
    "terms": [
      "インシデント",
      "タイムライン",
      "エスカレーション"
    ]
  },
  {
    "service": "Chatbot",
    "terms": [
      "設定",
      "Slackチャネル",
      "Teams設定",
      "通知"
    ]
  },
  {
    "service": "OpsWorks",
    "terms": [
      "スタック",
      "レイヤー",
      "インスタンス",
      "アプリ",
      "デプロイ"
    ]
  },
  {
    "service": "OpsCenter",
    "terms": [
      "OpsItem",
      "関連付け",
      "解決"
    ]
  },
  {
    "service": "License Manager",
    "terms": [
      "ライセンス設定",
      "ライセンス",
      "トークン",
      "ルール"
    ]
  },
  {
    "service": "Managed Microsoft AD",
    "terms": [
      "ディレクトリ",
      "トラスト",
      "OU"
    ]
  },
  {
    "service": "Resource Groups",
    "terms": [
      "グループ",
      "クエリ",
      "タグエディタ"
    ]
  },
  {
    "service": "Tag Editor",
    "terms": [
      "タグ",
      "リソース検索",
      "一括編集"
    ]
  },
  {
    "service": "Resource Explorer",
    "terms": [
      "ビュー",
      "インデックス",
      "検索"
    ]
  },
  {
    "service": "Cloud Control API",
    "terms": [
      "リソースタイプ",
      "リソース",
      "操作"
    ]
  },
  {
    "service": "CloudWatch Evidently",
    "terms": [
      "プロジェクト",
      "機能フラグ",
      "起動設定",
      "実験",
      "セグメント"
    ]
  },
  {
    "service": "CloudWatch Internet Monitor",
    "terms": [
      "モニター",
      "ヘルスイベント",
      "インサイト"
    ]
  },
  {
    "service": "DevOps Guru",
    "terms": [
      "リソースコレクション",
      "インサイト",
      "推奨事項"
    ]
  },
  {
    "service": "CodeGuru Reviewer",
    "terms": [
      "リポジトリ関連付け",
      "コードレビュー",
      "推奨事項"
    ]
  },
  {
    "service": "CodeGuru Profiler",
    "terms": [
      "プロファイリンググループ",
      "エージェント設定",
      "レポート"
    ]
  },
  {
    "service": "CloudTrail Insights",
    "terms": [
      "インサイトイベント",
      "異常検出"
    ]
  },
  {
    "service": "EventBridge Pipes",
    "terms": [
      "パイプ",
      "ソース",
      "フィルタ",
      "エンリッチ",
      "ターゲット"
    ]
  },
  {
    "service": "EventBridge Scheduler",
    "terms": [
      "スケジュール",
      "スケジュールグループ"
    ]
  },
  {
    "service": "Step Functions Distributed Map",
    "terms": [
      "分散マップ",
      "実行",
      "マップラン"
    ]
  },
  {
    "service": "Glue Data Quality",
    "terms": [
      "ルールセット",
      "評価実行",
      "結果"
    ]
  },
  {
    "service": "Glue Elastic Views",
    "terms": [
      "ビュー",
      "マテリアライズ",
      "更新"
    ]
  },
  {
    "service": "Redshift Serverless",
    "terms": [
      "名前空間",
      "ワークグループ",
      "スナップショット"
    ]
  },
  {
    "service": "Aurora Serverless",
    "terms": [
      "DBクラスター",
      "パラメータ",
      "スケーリング設定"
    ]
  },
  {
    "service": "RDS Proxy",
    "terms": [
      "プロキシ",
      "ターゲットグループ",
      "認証設定"
    ]
  },
  {
    "service": "DynamoDB Accelerator(DAX)",
    "terms": [
      "クラスター",
      "パラメータグループ",
      "サブネットグループ"
    ]
  },
  {
    "service": "ElastiCache Serverless",
    "terms": [
      "キャッシュ",
      "エンドポイント",
      "ポリシー"
    ]
  },
  {
    "service": "OpenSearch Serverless",
    "terms": [
      "コレクション",
      "インデックス",
      "アクセスポリシー",
      "暗号化ポリシー",
      "ネットワークポリシー"
    ]
  },
  {
    "service": "Backup Audit Manager",
    "terms": [
      "監査レポート",
      "フレームワーク",
      "コントロール"
    ]
  },
  {
    "service": "Elastic File Cache",
    "terms": [
      "キャッシュ",
      "ストレージロケーション",
      "ポリシー"
    ]
  },
  {
    "service": "S3 Object Lambda",
    "terms": [
      "アクセスポイント",
      "Object Lambdaアクセスポイント",
      "関数関連付け"
    ]
  },
  {
    "service": "S3 Access Points",
    "terms": [
      "アクセスポイント",
      "マルチリージョンアクセスポイント",
      "アクセスポイントポリシー"
    ]
  },
  {
    "service": "S3 Batch Operations",
    "terms": [
      "ジョブ",
      "マニフェスト",
      "レポート"
    ]
  },
  {
    "service": "S3 Storage Lens",
    "terms": [
      "ダッシュボード",
      "メトリクスエクスポート",
      "組織設定"
    ]
  },
  {
    "service": "S3 Replication",
    "terms": [
      "レプリケーションルール",
      "複製先",
      "レプリケーション設定"
    ]
  },
  {
    "service": "EBS Snapshots Archive",
    "terms": [
      "アーカイブスナップショット",
      "復元"
    ]
  },
  {
    "service": "EFS Replication",
    "terms": [
      "レプリケーション設定",
      "レプリカ",
      "ステータス"
    ]
  },
  {
    "service": "FSx for Windows File Server",
    "terms": [
      "ファイルシステム",
      "バックアップ",
      "共有"
    ]
  },
  {
    "service": "FSx for Lustre",
    "terms": [
      "ファイルシステム",
      "データリポジトリ関連付け",
      "タスク"
    ]
  },
  {
    "service": "FSx for ONTAP",
    "terms": [
      "ファイルシステム",
      "ストレージ仮想マシン(SVM)",
      "ボリューム",
      "Snapshotポリシー"
    ]
  },
  {
    "service": "FSx for OpenZFS",
    "terms": [
      "ファイルシステム",
      "ボリューム",
      "Snapshot"
    ]
  },
  {
    "service": "EC2 Image Builder",
    "terms": [
      "イメージパイプライン",
      "コンポーネント",
      "レシピ",
      "インフラ設定",
      "配布設定",
      "イメージ"
    ]
  },
  {
    "service": "Systems Manager AppConfig",
    "terms": [
      "アプリケーション",
      "環境",
      "設定プロファイル",
      "デプロイ戦略",
      "デプロイ"
    ]
  },
  {
    "service": "Systems Manager Automation",
    "terms": [
      "オートメーションドキュメント",
      "実行",
      "ステップ"
    ]
  },
  {
    "service": "Systems Manager Fleet Manager",
    "terms": [
      "フリート",
      "ノード",
      "セッション"
    ]
  },
  {
    "service": "Systems Manager Patch Manager",
    "terms": [
      "パッチベースライン",
      "パッチグループ",
      "メンテナンスウィンドウタスク"
    ]
  },
  {
    "service": "Systems Manager Distributor",
    "terms": [
      "パッケージ",
      "バージョン",
      "共有"
    ]
  },
  {
    "service": "Systems Manager OpsCenter",
    "terms": [
      "OpsItem",
      "関連リソース",
      "解決"
    ]
  },
  {
    "service": "EC2 Fleet",
    "terms": [
      "フリート",
      "起動仕様",
      "ターゲット容量"
    ]
  },
  {
    "service": "Spot Fleet",
    "terms": [
      "スポットフリートリクエスト",
      "ターゲット容量",
      "割り当て戦略"
    ]
  },
  {
    "service": "EC2 Capacity Reservations",
    "terms": [
      "キャパシティ予約",
      "グループ",
      "マッチング"
    ]
  },
  {
    "service": "EC2 Auto Scaling",
    "terms": [
      "Auto Scalingグループ",
      "起動テンプレート",
      "ライフサイクルフック",
      "スケーリングポリシー"
    ]
  },
  {
    "service": "ECS Capacity Providers",
    "terms": [
      "キャパシティプロバイダー",
      "キャパシティプロバイダー戦略"
    ]
  },
  {
    "service": "ECS Service Connect",
    "terms": [
      "サービス接続",
      "名前空間",
      "クライアントエイリアス"
    ]
  },
  {
    "service": "ECS Task Sets",
    "terms": [
      "タスクセット",
      "プライマリ",
      "デプロイ"
    ]
  },
  {
    "service": "EKS Fargate",
    "terms": [
      "プロファイル",
      "ポッド実行ロール",
      "名前空間"
    ]
  },
  {
    "service": "EKS Pod Identity",
    "terms": [
      "関連付け",
      "IDプロバイダー",
      "ロール"
    ]
  },
  {
    "service": "EKS Anywhere",
    "terms": [
      "クラスター",
      "バンドル",
      "管理"
    ]
  },
  {
    "service": "Fargate",
    "terms": [
      "タスク",
      "サービス",
      "実行ロール"
    ]
  },
  {
    "service": "Elastic Container Registry Lifecycle",
    "terms": [
      "ライフサイクルポリシー",
      "ルール",
      "タグ付け"
    ]
  },
  {
    "service": "API Gateway Authorizers",
    "terms": [
      "オーソライザー",
      "JWT設定",
      "Lambda設定"
    ]
  },
  {
    "service": "API Gateway Usage Plans",
    "terms": [
      "使用量プラン",
      "APIキー",
      "クォータ",
      "スロットリング"
    ]
  },
  {
    "service": "CloudFront Functions",
    "terms": [
      "関数",
      "公開",
      "関連付け"
    ]
  },
  {
    "service": "Lambda@Edge",
    "terms": [
      "関数",
      "バージョン",
      "CloudFront関連付け"
    ]
  },
  {
    "service": "Route 53 Resolver",
    "terms": [
      "インバウンドエンドポイント",
      "アウトバウンドエンドポイント",
      "ルール",
      "ルール関連付け"
    ]
  },
  {
    "service": "VPC IPAM",
    "terms": [
      "IPAM",
      "スコープ",
      "プール",
      "割り当て",
      "監査"
    ]
  },
  {
    "service": "VPC Lattice",
    "terms": [
      "サービス",
      "サービスネットワーク",
      "ターゲットグループ",
      "リスナー",
      "ルール"
    ]
  },
  {
    "service": "Network Manager",
    "terms": [
      "グローバルネットワーク",
      "サイト",
      "デバイス",
      "リンク",
      "ポリシー"
    ]
  },
  {
    "service": "Cloud WAN",
    "terms": [
      "コアネットワーク",
      "セグメント",
      "アタッチメント",
      "ポリシー"
    ]
  },
  {
    "service": "Route 53 Profiles",
    "terms": [
      "プロファイル",
      "リソース関連付け",
      "ルール"
    ]
  },
  {
    "service": "CloudFront Origin Access Control(OAC)",
    "terms": [
      "オリジンアクセスコントロール",
      "署名設定"
    ]
  },
  {
    "service": "WAF Bot Control",
    "terms": [
      "ボットルール",
      "マネージドルール",
      "アクション"
    ]
  },
  {
    "service": "IAM Roles Anywhere",
    "terms": [
      "トラストアンカー",
      "プロファイル",
      "ロール関連付け",
      "証明書"
    ]
  },
  {
    "service": "IAM Identity Center SCIM",
    "terms": [
      "プロビジョニング",
      "ディレクトリ同期",
      "属性マッピング"
    ]
  },
  {
    "service": "KMS External Key Store(XKS)",
    "terms": [
      "外部キーストア",
      "接続",
      "キー"
    ]
  },
  {
    "service": "Secrets Manager Rotation",
    "terms": [
      "ローテーション設定",
      "Lambda",
      "スケジュール"
    ]
  },
  {
    "service": "ACM Renewal",
    "terms": [
      "更新",
      "検証",
      "失効"
    ]
  },
  {
    "service": "Security Lake",
    "terms": [
      "データレイク",
      "データソース",
      "サブスクライバー"
    ]
  },
  {
    "service": "Amazon Verified Access",
    "terms": [
      "インスタンス",
      "トラストプロバイダー",
      "グループ",
      "ポリシー"
    ]
  },
  {
    "service": "Cognito Federated Identities",
    "terms": [
      "IDプール",
      "ロール関連付け",
      "プロバイダー"
    ]
  },
  {
    "service": "Cognito User Pools",
    "terms": [
      "ユーザープール",
      "アプリクライアント",
      "ドメイン",
      "トリガー",
      "グループ"
    ]
  },
  {
    "service": "GuardDuty Malware Protection",
    "terms": [
      "保護設定",
      "スキャン結果",
      "例外"
    ]
  },
  {
    "service": "Inspector(新)",
    "terms": [
      "評価",
      "カバレッジ",
      "検出結果",
      "フィルタ"
    ]
  },
  {
    "service": "Macie Classification",
    "terms": [
      "分類ジョブ",
      "検出結果",
      "例外"
    ]
  },
  {
    "service": "Detective Investigations",
    "terms": [
      "調査",
      "関連付け",
      "検出結果"
    ]
  },
  {
    "service": "Security Hub Findings",
    "terms": [
      "検出結果",
      "集約",
      "自動化ルール"
    ]
  },
  {
    "service": "Firewall Manager Policies",
    "terms": [
      "ポリシー",
      "スコープ",
      "準拠状況"
    ]
  },
  {
    "service": "CloudHSM Key Management",
    "terms": [
      "クラスター",
      "HSMユーザー",
      "バックアップ"
    ]
  },
  {
    "service": "Config Conformance Packs",
    "terms": [
      "適合パック",
      "ルール",
      "評価結果"
    ]
  },
  {
    "service": "Config Aggregator",
    "terms": [
      "アグリゲータ",
      "集約ソース",
      "スナップショット"
    ]
  },
  {
    "service": "Config Recorder",
    "terms": [
      "レコーダー",
      "配信",
      "監査"
    ]
  },
  {
    "service": "Organizations Tag Policies",
    "terms": [
      "タグポリシー",
      "アカウント関連付け"
    ]
  },
  {
    "service": "Organizations Backup Policies",
    "terms": [
      "バックアップポリシー",
      "ターゲット"
    ]
  },
  {
    "service": "CloudFormation Registry",
    "terms": [
      "タイプ",
      "バージョン",
      "拡張",
      "フック"
    ]
  },
  {
    "service": "CloudFormation Guard",
    "terms": [
      "ルールセット",
      "検証",
      "レポート"
    ]
  },
  {
    "service": "Service Catalog AppRegistry",
    "terms": [
      "アプリケーション",
      "リソースグループ",
      "属性グループ"
    ]
  },
  {
    "service": "Proton",
    "terms": [
      "環境",
      "環境テンプレート",
      "サービス",
      "サービステンプレート",
      "パイプライン"
    ]
  },
  {
    "service": "Launch Wizard",
    "terms": [
      "デプロイ",
      "ワークロード",
      "設定"
    ]
  },
  {
    "service": "AppFabric",
    "terms": [
      "アプリケーション接続",
      "監査ログ",
      "データエクスポート"
    ]
  },
  {
    "service": "Schemas( EventBridge )",
    "terms": [
      "レジストリ",
      "スキーマ",
      "ディスカバラ"
    ]
  },
  {
    "service": "Serverless Application Repository",
    "terms": [
      "アプリケーション",
      "バージョン",
      "デプロイ"
    ]
  },
  {
    "service": "Signer",
    "terms": [
      "署名プロファイル",
      "署名ジョブ",
      "署名済みアーティファクト"
    ]
  },
  {
    "service": "Cloud Development Kit(CDK)",
    "terms": [
      "アプリ",
      "スタック",
      "アセット",
      "ブートストラップ環境"
    ]
  },
  {
    "service": "CodeStar Connections",
    "terms": [
      "接続",
      "ホスト",
      "リポジトリ関連付け"
    ]
  },
  {
    "service": "CodeCatalyst",
    "terms": [
      "スペース",
      "プロジェクト",
      "リポジトリ",
      "ワークフロー",
      "環境",
      "パッケージ"
    ]
  },
  {
    "service": "CloudControl",
    "terms": [
      "リソースタイプ",
      "リソース",
      "オペレーション"
    ]
  },
  {
    "service": "Device Farm",
    "terms": [
      "プロジェクト",
      "デバイスプール",
      "テスト仕様",
      "実行",
      "アーティファクト"
    ]
  },
  {
    "service": "Amplify Hosting",
    "terms": [
      "アプリ",
      "ブランチ",
      "デプロイ",
      "ドメイン関連付け",
      "リダイレクト"
    ]
  },
  {
    "service": "AppConfig Feature Flags",
    "terms": [
      "機能フラグ",
      "セグメント",
      "起動設定",
      "デプロイ"
    ]
  },
  {
    "service": "CloudFront KeyValueStore",
    "terms": [
      "キーバリューストア",
      "キー",
      "バージョン"
    ]
  },
  {
    "service": "Global Accelerator Custom Routing",
    "terms": [
      "アクセラレータ",
      "リスナー",
      "エンドポイントグループ"
    ]
  },
  {
    "service": "Verified Access",
    "terms": [
      "インスタンス",
      "トラストプロバイダー",
      "アクセスグループ",
      "ポリシー"
    ]
  },
  {
    "service": "Private 5G",
    "terms": [
      "ネットワーク",
      "サイト",
      "デバイス",
      "SIM",
      "ネットワーク設定"
    ]
  },
  {
    "service": "IoT Wireless",
    "terms": [
      "ワイヤレスデバイス",
      "デバイスプロファイル",
      "サービスプロファイル",
      "デスティネーション",
      "マルチキャストグループ"
    ]
  },
  {
    "service": "IoT Secure Tunneling",
    "terms": [
      "トンネル",
      "デスティネーション設定"
    ]
  },
  {
    "service": "IoT Device Advisor",
    "terms": [
      "テストスイート",
      "テストケース",
      "テスト実行",
      "結果"
    ]
  },
  {
    "service": "Location Service",
    "terms": [
      "マップ",
      "プレイスインデックス",
      "ルート計算機",
      "トラッカー",
      "ジオフェンスコレクション"
    ]
  },
  {
    "service": "Panorama",
    "terms": [
      "アプライアンス",
      "アプリケーション",
      "デプロイ"
    ]
  },
  {
    "service": "Snow Family(Snowball)",
    "terms": [
      "転送ジョブ",
      "デバイス",
      "クラスター",
      "返送ラベル"
    ]
  },
  {
    "service": "Snowcone",
    "terms": [
      "ジョブ",
      "デバイス",
      "受領確認"
    ]
  },
  {
    "service": "Snowmobile",
    "terms": [
      "転送計画",
      "物流",
      "進捗"
    ]
  },
  {
    "service": "Ground Station",
    "terms": [
      "ミッションプロファイル",
      "衛星",
      "データフローエンドポイントグループ",
      "構成"
    ]
  },
  {
    "service": "RoboMaker Simulation",
    "terms": [
      "シミュレーションジョブ",
      "ワールドテンプレート",
      "フリート",
      "ロボット"
    ]
  },
  {
    "service": "Braket",
    "terms": [
      "量子タスク",
      "ハイブリッドジョブ",
      "デバイス",
      "ノートブック"
    ]
  },
  {
    "service": "Managed Blockchain",
    "terms": [
      "ネットワーク",
      "メンバー",
      "ノード",
      "アクセスポリシー"
    ]
  },
  {
    "service": "Payment Cryptography",
    "terms": [
      "キー",
      "キーエイリアス",
      "キー属性",
      "署名検証設定"
    ]
  },
  {
    "service": "CloudSearch",
    "terms": [
      "ドメイン",
      "インデックスフィールド",
      "サジェスト設定"
    ]
  },
  {
    "service": "Elastic Transcoder",
    "terms": [
      "パイプライン",
      "プリセット",
      "ジョブ"
    ]
  },
  {
    "service": "Data Pipeline",
    "terms": [
      "パイプライン",
      "アクティビティ",
      "スケジュール",
      "リソース"
    ]
  },
  {
    "service": "Step Functions Express Workflows",
    "terms": [
      "ステートマシン",
      "実行",
      "ログ設定"
    ]
  },
  {
    "service": "EventBridge API Destinations",
    "terms": [
      "接続",
      "APIデスティネーション",
      "ルール",
      "ターゲット"
    ]
  },
  {
    "service": "API Gateway Custom Domain",
    "terms": [
      "カスタムドメイン名",
      "ベースパスマッピング",
      "ルートマッピング"
    ]
  },
  {
    "service": "App Mesh Gateway Routes",
    "terms": [
      "ゲートウェイルート",
      "仮想ゲートウェイ",
      "ルート"
    ]
  },
  {
    "service": "Cloud Map Private DNS",
    "terms": [
      "名前空間",
      "サービス",
      "インスタンス",
      "ルーティングポリシー"
    ]
  },
  {
    "service": "Security Lake Subscribers",
    "terms": [
      "サブスクライバー",
      "データソース",
      "通知設定"
    ]
  },
  {
    "service": "Clean Rooms",
    "terms": [
      "コラボレーション",
      "メンバー",
      "設定済みテーブル",
      "分析テンプレート",
      "ルール"
    ]
  },
  {
    "service": "Clean Rooms ML",
    "terms": [
      "トレーニングジョブ",
      "モデル",
      "共同学習設定",
      "実行"
    ]
  },
  {
    "service": "DataZone",
    "terms": [
      "ドメイン",
      "プロジェクト",
      "環境",
      "データソース",
      "データアセット",
      "共有",
      "サブスクリプション"
    ]
  },
  {
    "service": "Entity Resolution",
    "terms": [
      "マッチングワークフロー",
      "スキーママッピング",
      "入力データソース",
      "出力"
    ]
  },
  {
    "service": "HealthImaging",
    "terms": [
      "データストア",
      "イメージセット",
      "インポートジョブ",
      "エクスポートジョブ"
    ]
  },
  {
    "service": "Omics",
    "terms": [
      "リファレンスストア",
      "シーケンスストア",
      "ラン",
      "バリアントストア",
      "ワークフロー"
    ]
  },
  {
    "service": "Supply Chain",
    "terms": [
      "インスタンス",
      "データ接続",
      "需要計画",
      "ダッシュボード"
    ]
  },
  {
    "service": "AppIntegrations",
    "terms": [
      "データ統合",
      "イベント統合",
      "コネクタ",
      "データマッピング"
    ]
  },
  {
    "service": "Customer Profiles",
    "terms": [
      "ドメイン",
      "オブジェクトタイプ",
      "プロファイル",
      "セグメント",
      "ワークフロー"
    ]
  },
  {
    "service": "Connect Cases",
    "terms": [
      "ドメイン",
      "ケーステンプレート",
      "フィールド",
      "レイアウト",
      "ルール"
    ]
  },
  {
    "service": "Connect Wisdom",
    "terms": [
      "アシスタント",
      "ナレッジベース",
      "コンテンツ",
      "レコメンド"
    ]
  },
  {
    "service": "Connect Voice ID",
    "terms": [
      "ドメイン",
      "ウォッチリスト",
      "スピーカー",
      "評価"
    ]
  },
  {
    "service": "Wickr",
    "terms": [
      "ネットワーク",
      "ワークスペース",
      "ユーザー",
      "ルーム",
      "監査ログ"
    ]
  },
  {
    "service": "WorkDocs",
    "terms": [
      "サイト",
      "ユーザー",
      "グループ",
      "フォルダ",
      "ドキュメント"
    ]
  },
  {
    "service": "WorkSpaces Web",
    "terms": [
      "ポータル",
      "ブラウザ設定",
      "ユーザー設定",
      "IPアクセス設定",
      "トラストストア"
    ]
  },
  {
    "service": "AppStream Image Assistant",
    "terms": [
      "イメージ",
      "アプリケーションカタログ",
      "関連付け"
    ]
  },
  {
    "service": "Chime SDK Voice",
    "terms": [
      "ボイスコネクタ",
      "SIPメディアアプリケーション",
      "電話番号",
      "ルーティング"
    ]
  },
  {
    "service": "Chime SDK Messaging",
    "terms": [
      "アプリインスタンス",
      "チャネル",
      "メンバーシップ",
      "メッセージ"
    ]
  },
  {
    "service": "SES VDM",
    "terms": [
      "配信ダッシュボード",
      "インサイト",
      "ルール",
      "送信イベント"
    ]
  },
  {
    "service": "Pinpoint SMS and Voice",
    "terms": [
      "オリジネーションID",
      "電話番号プール",
      "メッセージ設定",
      "キャンペーン"
    ]
  },
  {
    "service": "Mainframe Modernization",
    "terms": [
      "アプリケーション",
      "環境",
      "ランタイム",
      "デプロイ"
    ]
  },
  {
    "service": "SimSpace Weaver",
    "terms": [
      "シミュレーション",
      "アプリケーション",
      "ワーカー",
      "ロギング"
    ]
  },
  {
    "service": "Savings Plans",
    "terms": [
      "プラン",
      "コミットメント",
      "推奨事項"
    ]
  },
  {
    "service": "Reserved Instances",
    "terms": [
      "予約",
      "変更",
      "マーケットプレイス出品"
    ]
  },
  {
    "service": "Marketplace Entitlements",
    "terms": [
      "エンタイトルメント",
      "製品コード",
      "購入記録"
    ]
  }
];

export const AZURE_CONSOLE_GLOSSARY: ReadonlyArray<ConsoleGlossaryRow> = [
  {
    "service": "Azure Resource Manager(ARM)",
    "terms": [
      "リソースグループ(Resource Group)",
      "サブスクリプション(Subscription)",
      "管理グループ(Management Group)",
      "リソースID(Resource ID)",
      "リソースプロバイダー(Resource Provider)",
      "リソースロック(Resource Lock)",
      "タグ(Tag)"
    ]
  },
  {
    "service": "Microsoft Entra ID(旧Azure AD)",
    "terms": [
      "テナント(Tenant)",
      "ユーザー(User)",
      "グループ(Group)",
      "アプリ登録(App registration)",
      "エンタープライズアプリ(Enterprise application)",
      "条件付きアクセス(Conditional Access)",
      "サービスプリンシパル(Service principal)",
      "PIM"
    ]
  },
  {
    "service": "Azure RBAC",
    "terms": [
      "役割定義(Role definition)",
      "役割割り当て(Role assignment)",
      "スコープ(Scope)",
      "カスタムロール(Custom role)",
      "最小権限(Least privilege)"
    ]
  },
  {
    "service": "Azure Policy",
    "terms": [
      "ポリシー定義(Policy definition)",
      "イニシアチブ(Initiative)",
      "割り当て(Assignment)",
      "準拠(Compliance)",
      "エフェクト(Effect)",
      "修復タスク(Remediation task)"
    ]
  },
  {
    "service": "Azure Cost Management",
    "terms": [
      "予算(Budget)",
      "コスト分析(Cost analysis)",
      "エクスポート(Export)",
      "予約(Reservations)",
      "Savings Plan"
    ]
  },
  {
    "service": "Azure Advisor",
    "terms": [
      "推奨事項(Recommendations)",
      "コスト(Cost)",
      "可用性(Availability)",
      "セキュリティ(Security)",
      "パフォーマンス(Performance)"
    ]
  },
  {
    "service": "Virtual Machines(VM)",
    "terms": [
      "仮想マシン(VM)",
      "OSディスク(OS disk)",
      "データディスク(Data disk)",
      "マネージドディスク(Managed disk)",
      "ネットワークインターフェイス(NIC)",
      "可用性セット(Availability set)",
      "可用性ゾーン(Availability zone)",
      "拡張機能(Extension)",
      "イメージ(Image)",
      "スナップショット(Snapshot)"
    ]
  },
  {
    "service": "Virtual Machine Scale Sets(VMSS)",
    "terms": [
      "スケールセット(Scale set)",
      "インスタンス(Instance)",
      "インスタンス保護(Instance protection)",
      "自動スケール(Autoscale)",
      "ローリングアップグレード(Rolling upgrade)"
    ]
  },
  {
    "service": "Azure App Service",
    "terms": [
      "App Serviceプラン(App Service Plan)",
      "Web App",
      "Deployment Slot(スロット)",
      "アプリ設定(App settings)",
      "接続文字列(Connection strings)",
      "カスタムドメイン(Custom domain)",
      "TLS/SSL証明書(Certificate)"
    ]
  },
  {
    "service": "Azure Functions",
    "terms": [
      "Function App",
      "トリガー(Trigger)",
      "バインディング(Binding)",
      "host.json",
      "durable functions",
      "関数キー(Function key)"
    ]
  },
  {
    "service": "Azure Container Apps",
    "terms": [
      "環境(Environment)",
      "リビジョン(Revision)",
      "スケールルール(Scale rule)",
      "Dapr",
      "イングレス(Ingress)"
    ]
  },
  {
    "service": "Azure Container Instances(ACI)",
    "terms": [
      "コンテナグループ(Container group)",
      "コンテナ(Container)",
      "再起動ポリシー(Restart policy)",
      "ボリューム(Volume)",
      "マネージドID(Managed identity)"
    ]
  },
  {
    "service": "Azure Kubernetes Service(AKS)",
    "terms": [
      "クラスター(Cluster)",
      "ノードプール(Node pool)",
      "ノード(Node)",
      "アドオン(Add-on)",
      "マネージドID(Managed identity)",
      "Ingress Controller",
      "クラスターオートスケーラー(Cluster autoscaler)",
      "ノードリソースグループ(Node resource group)"
    ]
  },
  {
    "service": "Azure Batch",
    "terms": [
      "Batchアカウント(Batch account)",
      "プール(Pool)",
      "ジョブ(Job)",
      "タスク(Task)",
      "ノード(Node)"
    ]
  },
  {
    "service": "Logic Apps",
    "terms": [
      "ワークフロー(Workflow)",
      "コネクタ(Connector)",
      "トリガー(Trigger)",
      "アクション(Action)",
      "統合アカウント(Integration account)"
    ]
  },
  {
    "service": "Azure Automation",
    "terms": [
      "オートメーションアカウント(Automation account)",
      "Runbook",
      "ジョブ(Job)",
      "Hybrid Runbook Worker",
      "DSC"
    ]
  },
  {
    "service": "Virtual Network(VNet)",
    "terms": [
      "VNet",
      "サブネット(Subnet)",
      "アドレス空間(Address space)",
      "ピアリング(Peering)",
      "ルートテーブル(Route table)",
      "サービスエンドポイント(Service endpoint)",
      "Private Endpoint(プライベートエンドポイント)",
      "DNSサーバー(DNS servers)"
    ]
  },
  {
    "service": "Network Security Group(NSG)",
    "terms": [
      "NSG",
      "セキュリティ規則(Security rule)",
      "受信規則(Inbound rule)",
      "送信規則(Outbound rule)",
      "ASG(Application Security Group)"
    ]
  },
  {
    "service": "Application Gateway",
    "terms": [
      "リスナー(Listener)",
      "バックエンドプール(Backend pool)",
      "HTTP設定(HTTP settings)",
      "ルール(Rule)",
      "プローブ(Probe)",
      "WAFポリシー(WAF policy)",
      "URLパスベースルーティング(Path-based routing)"
    ]
  },
  {
    "service": "Azure Load Balancer",
    "terms": [
      "フロントエンドIP(Frontend IP)",
      "バックエンドプール(Backend pool)",
      "ヘルスプローブ(Health probe)",
      "負荷分散規則(Load balancing rule)",
      "NAT規則(NAT rule)",
      "アウトバウンド規則(Outbound rule)"
    ]
  },
  {
    "service": "Azure Front Door",
    "terms": [
      "プロファイル(Profile)",
      "エンドポイント(Endpoint)",
      "オリジングループ(Origin group)",
      "ルート(Route)",
      "ルールセット(Ruleset)",
      "WAFポリシー(WAF policy)"
    ]
  },
  {
    "service": "Traffic Manager",
    "terms": [
      "プロファイル(Profile)",
      "エンドポイント(Endpoint)",
      "ルーティング方法(Routing method)",
      "監視設定(Monitor)"
    ]
  },
  {
    "service": "Azure DNS",
    "terms": [
      "DNSゾーン(DNS zone)",
      "レコードセット(Record set)",
      "Private DNS zone(プライベートDNSゾーン)",
      "DNS Resolver",
      "Forwarding ruleset"
    ]
  },
  {
    "service": "VPN Gateway",
    "terms": [
      "仮想ネットワークゲートウェイ(Virtual network gateway)",
      "ローカルネットワークゲートウェイ(Local network gateway)",
      "接続(Connection)",
      "BGP",
      "ポイント対サイト(P2S)",
      "サイト対サイト(S2S)"
    ]
  },
  {
    "service": "ExpressRoute",
    "terms": [
      "回線(Circuit)",
      "ピアリング(Peering)",
      "ExpressRoute Gateway",
      "Route filter"
    ]
  },
  {
    "service": "Azure Firewall",
    "terms": [
      "Firewall",
      "Firewall policy",
      "ルールコレクショングループ(Rule collection group)",
      "アプリケーションルール(Application rule)",
      "ネットワークルール(Network rule)",
      "DNAT"
    ]
  },
  {
    "service": "Azure Bastion",
    "terms": [
      "Bastion",
      "セッション(Session)",
      "ターゲットVM(Target VM)"
    ]
  },
  {
    "service": "NAT Gateway",
    "terms": [
      "NAT Gateway",
      "Public IP prefix",
      "サブネット関連付け(Subnet association)"
    ]
  },
  {
    "service": "Private Link",
    "terms": [
      "Private endpoint",
      "Private link service",
      "DNS zone group"
    ]
  },
  {
    "service": "DDoS Protection",
    "terms": [
      "DDoS protection plan",
      "保護対象リソース(Protected resource)",
      "チューニング(Tuning)"
    ]
  },
  {
    "service": "CDN",
    "terms": [
      "プロファイル(Profile)",
      "エンドポイント(Endpoint)",
      "オリジン(Origin)",
      "ルールエンジン(Rules engine)"
    ]
  },
  {
    "service": "Storage Account",
    "terms": [
      "ストレージアカウント(Storage account)",
      "冗長性(Redundancy)",
      "アクセスキー(Access keys)",
      "SAS",
      "ライフサイクル管理(Lifecycle management)",
      "静的Webサイト(Static website)",
      "暗号化(Encryption)"
    ]
  },
  {
    "service": "Blob Storage",
    "terms": [
      "コンテナ(Container)",
      "BLOB(Blob)",
      "アクセス層(Access tier)",
      "イミュータビリティポリシー(Immutability policy)",
      "変更フィード(Change feed)"
    ]
  },
  {
    "service": "Azure Files",
    "terms": [
      "ファイル共有(File share)",
      "スナップショット(Snapshot)",
      "SMB",
      "NFS"
    ]
  },
  {
    "service": "Queue Storage",
    "terms": [
      "キュー(Queue)",
      "メッセージ(Message)",
      "デッドレター(Dead-letter)"
    ]
  },
  {
    "service": "Table Storage",
    "terms": [
      "テーブル(Table)",
      "エンティティ(Entity)",
      "パーティションキー(Partition key)",
      "Row key"
    ]
  },
  {
    "service": "Data Lake Storage Gen2",
    "terms": [
      "ファイルシステム(Filesystem)",
      "ディレクトリ(Directory)",
      "ACL"
    ]
  },
  {
    "service": "Managed Disks",
    "terms": [
      "ディスク(Disk)",
      "スナップショット(Snapshot)",
      "イメージ(Image)",
      "共有ディスク(Shared disk)"
    ]
  },
  {
    "service": "Azure NetApp Files",
    "terms": [
      "NetAppアカウント(Account)",
      "容量プール(Capacity pool)",
      "ボリューム(Volume)",
      "スナップショット(Snapshot)"
    ]
  },
  {
    "service": "Azure SQL Database",
    "terms": [
      "SQLサーバー(SQL server)",
      "データベース(Database)",
      "エラスティックプール(Elastic pool)",
      "ファイアウォール規則(Firewall rule)",
      "監査(Auditing)"
    ]
  },
  {
    "service": "Azure SQL Managed Instance",
    "terms": [
      "マネージドインスタンス(Managed instance)",
      "サブネット(Subnet)",
      "プライベートエンドポイント(Private endpoint)"
    ]
  },
  {
    "service": "Cosmos DB",
    "terms": [
      "アカウント(Account)",
      "データベース(Database)",
      "コンテナ(Container)",
      "パーティションキー(Partition key)",
      "RU/s(スループット)",
      "一貫性(Consistency)"
    ]
  },
  {
    "service": "Azure Database for PostgreSQL(Flexible)",
    "terms": [
      "サーバー(Server)",
      "データベース(Database)",
      "パラメータ(Parameter)",
      "ファイアウォール規則(Firewall rule)",
      "レプリカ(Replica)",
      "バックアップ(Backup)"
    ]
  },
  {
    "service": "Azure Database for MySQL(Flexible)",
    "terms": [
      "サーバー(Server)",
      "データベース(Database)",
      "パラメータ(Parameter)",
      "ファイアウォール規則(Firewall rule)",
      "レプリカ(Replica)",
      "バックアップ(Backup)"
    ]
  },
  {
    "service": "Azure Cache for Redis",
    "terms": [
      "キャッシュ(Cache)",
      "アクセスキー(Access keys)",
      "Firewall rules",
      "クラスタリング(Clustering)"
    ]
  },
  {
    "service": "Event Hubs",
    "terms": [
      "ネームスペース(Namespace)",
      "イベントハブ(Event hub)",
      "コンシューマーグループ(Consumer group)",
      "Capture"
    ]
  },
  {
    "service": "Service Bus",
    "terms": [
      "ネームスペース(Namespace)",
      "キュー(Queue)",
      "トピック(Topic)",
      "サブスクリプション(Subscription)",
      "ルール(Rule)",
      "DLQ"
    ]
  },
  {
    "service": "Event Grid",
    "terms": [
      "トピック(Topic)",
      "イベントサブスクリプション(Event subscription)",
      "ドメイン(Domain)",
      "フィルタ(Filter)"
    ]
  },
  {
    "service": "Stream Analytics",
    "terms": [
      "ジョブ(Job)",
      "入力(Input)",
      "出力(Output)",
      "クエリ(Query)"
    ]
  },
  {
    "service": "Data Factory",
    "terms": [
      "ファクトリ(Factory)",
      "パイプライン(Pipeline)",
      "データセット(Dataset)",
      "リンクサービス(Linked service)",
      "トリガー(Trigger)",
      "Integration Runtime"
    ]
  },
  {
    "service": "Synapse Analytics",
    "terms": [
      "ワークスペース(Workspace)",
      "専用SQLプール(Dedicated SQL pool)",
      "サーバレスSQL(Serverless SQL)",
      "Spark pool",
      "パイプライン(Pipeline)",
      "リンクサービス(Linked service)"
    ]
  },
  {
    "service": "Databricks",
    "terms": [
      "ワークスペース(Workspace)",
      "クラスタ(Cluster)",
      "ノートブック(Notebook)",
      "ジョブ(Job)"
    ]
  },
  {
    "service": "API Management(APIM)",
    "terms": [
      "サービスインスタンス(Service)",
      "API",
      "製品(Product)",
      "サブスクリプション(Subscription)",
      "ポリシー(Policy)",
      "Named Value",
      "ゲートウェイ(Gateway)"
    ]
  },
  {
    "service": "Key Vault",
    "terms": [
      "Vault",
      "シークレット(Secret)",
      "キー(Key)",
      "証明書(Certificate)",
      "アクセスポリシー(Access policy)",
      "RBAC"
    ]
  },
  {
    "service": "App Configuration",
    "terms": [
      "Configuration store",
      "キー値(Key-Value)",
      "機能フラグ(Feature flag)",
      "ラベル(Label)"
    ]
  },
  {
    "service": "Azure Container Registry(ACR)",
    "terms": [
      "レジストリ(Registry)",
      "リポジトリ(Repository)",
      "イメージ(Image)",
      "タグ(Tag)",
      "タスク(Task)"
    ]
  },
  {
    "service": "Azure Monitor",
    "terms": [
      "メトリクス(Metrics)",
      "アラートルール(Alert rule)",
      "アクショングループ(Action group)",
      "診断設定(Diagnostic settings)",
      "ワークブック(Workbook)"
    ]
  },
  {
    "service": "Log Analytics",
    "terms": [
      "ワークスペース(Workspace)",
      "KQL",
      "テーブル(Table)",
      "クエリ(Query)"
    ]
  },
  {
    "service": "Application Insights",
    "terms": [
      "リソース(Resource)",
      "依存関係(Dependencies)",
      "例外(Exceptions)",
      "サンプリング(Sampling)"
    ]
  },
  {
    "service": "Defender for Cloud",
    "terms": [
      "セキュリティポリシー(Security policy)",
      "推奨事項(Recommendations)",
      "規制コンプライアンス(Regulatory compliance)"
    ]
  },
  {
    "service": "Microsoft Sentinel",
    "terms": [
      "ワークスペース(Workspace)",
      "分析ルール(Analytics rule)",
      "インシデント(Incident)",
      "Workbooks"
    ]
  },
  {
    "service": "Azure OpenAI",
    "terms": [
      "リソース(Resource)",
      "デプロイ(Deployment)",
      "モデル(Model)",
      "エンドポイント(Endpoint)",
      "クォータ(Quota)"
    ]
  },
  {
    "service": "Azure Machine Learning",
    "terms": [
      "ワークスペース(Workspace)",
      "Compute instance",
      "Compute cluster",
      "データストア(Datastore)",
      "データセット(Dataset)",
      "モデル(Model)",
      "エンドポイント(Endpoint)",
      "パイプライン(Pipeline)"
    ]
  },
  {
    "service": "Azure DevOps",
    "terms": [
      "組織(Organization)",
      "プロジェクト(Project)",
      "リポジトリ(Repository)",
      "パイプライン(Pipeline)",
      "エージェント(Agent)",
      "サービス接続(Service connection)",
      "変数グループ(Variable group)",
      "アーティファクト(Artifact)",
      "Boards",
      "Repos"
    ]
  },
  {
    "service": "Azure Static Web Apps",
    "terms": [
      "Static Web App",
      "環境(Environment)",
      "デプロイ(Deployment)",
      "プレビュー環境(Preview environment)",
      "Functions API",
      "カスタムドメイン(Custom domain)",
      "認証(Authentication)",
      "ルーティング(Routing)"
    ]
  },
  {
    "service": "Azure SignalR Service",
    "terms": [
      "SignalR service",
      "Hub",
      "接続(Connection)",
      "グループ(Group)",
      "スケール(Scale)",
      "接続文字列(Connection string)"
    ]
  },
  {
    "service": "Azure Web PubSub",
    "terms": [
      "Hub",
      "接続(Connection)",
      "グループ(Group)",
      "イベントハンドラー(Event handler)",
      "メッセージ(Message)",
      "サブプロトコル(Subprotocol)"
    ]
  },
  {
    "service": "Azure Communication Services",
    "terms": [
      "リソース(Resource)",
      "ID(Identity)",
      "電話番号(Phone number)",
      "SMS",
      "Email",
      "Chat",
      "Calling",
      "イベント(Events)"
    ]
  },
  {
    "service": "Azure Virtual Desktop(AVD)",
    "terms": [
      "ホストプール(Host pool)",
      "アプリグループ(App group)",
      "ワークスペース(Workspace)",
      "セッションホスト(Session host)",
      "ユーザー割り当て(Assignment)",
      "RDP properties",
      "スケーリング(Scaling)"
    ]
  },
  {
    "service": "Azure Service Fabric",
    "terms": [
      "クラスター(Cluster)",
      "アプリケーション(Application)",
      "サービス(Service)",
      "ノード(Node)",
      "ノードタイプ(Node type)",
      "パーティション(Partition)",
      "レプリカ(Replica)",
      "アップグレード(Upgrade)"
    ]
  },
  {
    "service": "Azure Spring Apps",
    "terms": [
      "Spring Apps instance",
      "アプリ(App)",
      "デプロイメント(Deployment)",
      "環境(Environment)",
      "Config Server",
      "Service Registry",
      "ビルドサービス(Build service)"
    ]
  },
  {
    "service": "Azure Red Hat OpenShift(ARO)",
    "terms": [
      "クラスター(Cluster)",
      "コントロールプレーン(Control plane)",
      "ワーカーノード(Worker)",
      "ルート(Route)",
      "プロジェクト(Project)",
      "Pull secret",
      "Ingress"
    ]
  },
  {
    "service": "Azure VMware Solution(AVS)",
    "terms": [
      "プライベートクラウド(Private cloud)",
      "クラスター(Cluster)",
      "vCenter",
      "NSX-T",
      "HCX",
      "Datastore"
    ]
  },
  {
    "service": "Azure Arc",
    "terms": [
      "接続マシン(Connected machine)",
      "接続クラスター(Connected cluster)",
      "拡張機能(Extension)",
      "ポリシー(Policy)",
      "Azure Arc enabled servers",
      "Azure Arc enabled Kubernetes"
    ]
  },
  {
    "service": "Azure Lighthouse",
    "terms": [
      "委任(Delegation)",
      "サービスプロバイダー(Service provider)",
      "顧客(Customer)",
      "ロール割り当て(Role assignment)",
      "マネージドサービス(Managed services)"
    ]
  },
  {
    "service": "Azure Backup",
    "terms": [
      "Recovery Services vault",
      "バックアップポリシー(Backup policy)",
      "バックアップ項目(Backup item)",
      "復旧ポイント(Recovery point)",
      "復元(Restore)",
      "スケジュール(Schedule)"
    ]
  },
  {
    "service": "Azure Site Recovery",
    "terms": [
      "Recovery Services vault",
      "レプリケーション(Replication)",
      "レプリケーションポリシー(Replication policy)",
      "復旧プラン(Recovery plan)",
      "フェイルオーバー(Failover)",
      "テストフェイルオーバー(Test failover)"
    ]
  },
  {
    "service": "Azure Migrate",
    "terms": [
      "移行プロジェクト(Project)",
      "アセスメント(Assessment)",
      "移行(Migration)",
      "アプライアンス(Appliance)",
      "検出(Discovery)",
      "依存関係(Dependencies)"
    ]
  },
  {
    "service": "Private DNS zones",
    "terms": [
      "プライベートDNSゾーン(Private DNS zone)",
      "レコードセット(Record set)",
      "Virtual network link",
      "自動登録(Auto registration)",
      "解決(Resolution)"
    ]
  },
  {
    "service": "Azure DNS Private Resolver",
    "terms": [
      "インバウンドエンドポイント(Inbound endpoint)",
      "アウトバウンドエンドポイント(Outbound endpoint)",
      "フォワーディングルールセット(Forwarding ruleset)",
      "ルール(Rule)",
      "リンク(Link)"
    ]
  },
  {
    "service": "Azure Virtual WAN",
    "terms": [
      "Virtual WAN",
      "Virtual hub",
      "接続(Connection)",
      "ルートテーブル(Route table)",
      "VPN site",
      "Hub routing"
    ]
  },
  {
    "service": "Azure Route Server",
    "terms": [
      "BGP",
      "ピア(Peer)",
      "ルート(Route)",
      "ルート交換(Route exchange)"
    ]
  },
  {
    "service": "Network Watcher",
    "terms": [
      "Connection monitor",
      "Packet capture",
      "NSG flow logs",
      "Topology",
      "IP flow verify",
      "Next hop"
    ]
  },
  {
    "service": "Azure Virtual Network Manager",
    "terms": [
      "Network group",
      "Configuration",
      "Connectivity configuration",
      "Security admin rule",
      "Deployment"
    ]
  },
  {
    "service": "Azure Kubernetes Fleet Manager",
    "terms": [
      "Fleet",
      "メンバークラスター(Member cluster)",
      "配置(Placement)",
      "更新実行(Update run)",
      "リソース伝播(Resource propagation)"
    ]
  },
  {
    "service": "Azure Data Explorer(Kusto)",
    "terms": [
      "クラスター(Cluster)",
      "データベース(Database)",
      "テーブル(Table)",
      "取り込み(Ingestion)",
      "KQL",
      "関数(Function)"
    ]
  },
  {
    "service": "Azure AI Search(Cognitive Search)",
    "terms": [
      "Search service",
      "インデックス(Index)",
      "インデクサー(Indexer)",
      "データソース(Data source)",
      "スキルセット(Skillset)",
      "同義語マップ(Synonym map)"
    ]
  },
  {
    "service": "Microsoft Purview",
    "terms": [
      "アカウント(Account)",
      "コレクション(Collection)",
      "スキャン(Scan)",
      "データマップ(Data map)",
      "用語集(Glossary)",
      "分類(Classification)",
      "リネージ(Lineage)"
    ]
  },
  {
    "service": "Azure Chaos Studio",
    "terms": [
      "実験(Experiment)",
      "ターゲット(Target)",
      "アクション(Action)",
      "停止条件(Stop condition)",
      "実験プロファイル(Experiment profile)"
    ]
  },
  {
    "service": "Azure Managed Grafana",
    "terms": [
      "ワークスペース(Workspace)",
      "ユーザー(User)",
      "データソース(Data source)",
      "ダッシュボード(Dashboard)",
      "マネージドID(Managed identity)"
    ]
  },
  {
    "service": "Azure Update Manager",
    "terms": [
      "更新管理(Update management)",
      "メンテナンス構成(Maintenance configuration)",
      "スケジュール(Schedule)",
      "デプロイ(Deployment)",
      "準拠状況(Compliance)"
    ]
  }
];

export const OCI_CONSOLE_GLOSSARY: ReadonlyArray<ConsoleGlossaryRow> = [
  {
    "service": "OCI IAM",
    "terms": [
      "テナンシ(Tenancy)",
      "リージョン(Region)",
      "コンパートメント(Compartment)",
      "ユーザー(User)",
      "グループ(Group)",
      "ポリシー(Policy)",
      "動的グループ(Dynamic group)",
      "IDプロバイダー(IdP)",
      "フェデレーション(Federation)"
    ]
  },
  {
    "service": "OCI Networking",
    "terms": [
      "VCN",
      "サブネット(Subnet)",
      "ルート表(Route table)",
      "インターネット・ゲートウェイ(Internet gateway)",
      "NATゲートウェイ(NAT gateway)",
      "サービス・ゲートウェイ(Service gateway)",
      "ローカル・ピアリング・ゲートウェイ(LPG)",
      "DRG",
      "セキュリティ・リスト(Security list)",
      "ネットワーク・セキュリティ・グループ(NSG)"
    ]
  },
  {
    "service": "OCI DNS",
    "terms": [
      "ゾーン(Zone)",
      "レコード(Record)",
      "レコード・セット(Record set)",
      "ステアリング・ポリシー(Steering policy)",
      "ヘルス・チェック(Health check)"
    ]
  },
  {
    "service": "Load Balancer",
    "terms": [
      "ロード・バランサー(Load balancer)",
      "リスナー(Listener)",
      "バックエンド・セット(Backend set)",
      "バックエンド(Backend)",
      "証明書(Certificate)",
      "ヘルス・チェック(Health check)"
    ]
  },
  {
    "service": "Traffic Management",
    "terms": [
      "ステアリング・ポリシー(Steering policy)",
      "アタッチメント(Attachment)"
    ]
  },
  {
    "service": "FastConnect",
    "terms": [
      "接続(Connection)",
      "仮想回線(Virtual circuit)",
      "ピアリング(Peering)",
      "クロスコネクト(Cross-connect)"
    ]
  },
  {
    "service": "Site-to-Site VPN",
    "terms": [
      "VPN接続(VPN connection)",
      "CPE",
      "IPSecトンネル(IPSec tunnel)"
    ]
  },
  {
    "service": "OCI Compute",
    "terms": [
      "インスタンス(Instance)",
      "イメージ(Image)",
      "ブート・ボリューム(Boot volume)",
      "ボリューム・アタッチメント(Volume attachment)",
      "インスタンス構成(Instance configuration)",
      "インスタンス・プール(Instance pool)",
      "Auto Scaling",
      "コンソール接続(Console connection)"
    ]
  },
  {
    "service": "Dedicated VM Host",
    "terms": [
      "専用ホスト(Dedicated host)",
      "インスタンス配置(Placement)"
    ]
  },
  {
    "service": "Capacity Reservations",
    "terms": [
      "キャパシティ予約(Capacity reservation)",
      "インスタンス形状(Shape)"
    ]
  },
  {
    "service": "Block Volume",
    "terms": [
      "ボリューム(Volume)",
      "バックアップ(Backup)",
      "スナップショット(Snapshot)",
      "ボリューム・グループ(Volume group)",
      "レプリカ(Replica)"
    ]
  },
  {
    "service": "File Storage",
    "terms": [
      "ファイル・システム(File system)",
      "マウント・ターゲット(Mount target)",
      "エクスポート(Export)"
    ]
  },
  {
    "service": "Object Storage",
    "terms": [
      "バケット(Bucket)",
      "オブジェクト(Object)",
      "ネームスペース(Namespace)",
      "事前認証済リクエスト(PAR)",
      "ライフサイクル(Lifecycle policy)",
      "レプリケーション(Replication)"
    ]
  },
  {
    "service": "Archive Storage",
    "terms": [
      "アーカイブ(Archive)",
      "リストア(Restore)"
    ]
  },
  {
    "service": "Autonomous Database",
    "terms": [
      "ADB",
      "データベース(Database)",
      "コンパートメント(Compartment)",
      "バックアップ(Backup)",
      "ワークロード(Workload)",
      "自動スケーリング(Autoscaling)"
    ]
  },
  {
    "service": "Database Service(DBCS)",
    "terms": [
      "DBシステム(DB system)",
      "データベース(Database)",
      "バックアップ(Backup)",
      "データ・ガード(Data Guard)"
    ]
  },
  {
    "service": "MySQL HeatWave",
    "terms": [
      "DBシステム(DB system)",
      "構成(Configuration)",
      "バックアップ(Backup)",
      "リード・レプリカ(Read replica)",
      "HeatWaveクラスタ(HeatWave cluster)"
    ]
  },
  {
    "service": "NoSQL Database",
    "terms": [
      "テーブル(Table)",
      "インデックス(Index)",
      "レプリカ(Replica)"
    ]
  },
  {
    "service": "OKE(OCI Kubernetes Engine)",
    "terms": [
      "クラスター(Cluster)",
      "ノード・プール(Node pool)",
      "アドオン(Add-on)",
      "ワーカーノード(Worker node)",
      "Pod",
      "Ingress"
    ]
  },
  {
    "service": "Container Instances",
    "terms": [
      "コンテナ・インスタンス(Container instance)",
      "コンテナ(Container)"
    ]
  },
  {
    "service": "Container Registry(OCIR)",
    "terms": [
      "リポジトリ(Repository)",
      "イメージ(Image)",
      "タグ(Tag)"
    ]
  },
  {
    "service": "OCI Functions",
    "terms": [
      "アプリケーション(Application)",
      "関数(Function)",
      "トリガー(Trigger)",
      "Invoke"
    ]
  },
  {
    "service": "OCI API Gateway",
    "terms": [
      "ゲートウェイ(Gateway)",
      "デプロイメント(Deployment)",
      "ルート(Route)",
      "認証(Authentication)",
      "レート制限(Rate limiting)"
    ]
  },
  {
    "service": "Streaming",
    "terms": [
      "ストリーム(Stream)",
      "パーティション(Partition)",
      "コンシューマ・グループ(Consumer group)"
    ]
  },
  {
    "service": "Notifications",
    "terms": [
      "トピック(Topic)",
      "サブスクリプション(Subscription)",
      "サブスクリプション・プロトコル(Protocol)"
    ]
  },
  {
    "service": "Events",
    "terms": [
      "ルール(Rule)",
      "アクション(Action)",
      "イベント・タイプ(Event type)"
    ]
  },
  {
    "service": "Service Connector Hub",
    "terms": [
      "サービス・コネクタ(Service connector)",
      "ソース(Source)",
      "ターゲット(Target)"
    ]
  },
  {
    "service": "Logging",
    "terms": [
      "ログ・グループ(Log group)",
      "ログ(Log)",
      "ログ・ソース(Log source)",
      "ログ・ルール(Logging rule)"
    ]
  },
  {
    "service": "Monitoring",
    "terms": [
      "メトリクス(Metrics)",
      "アラーム(Alarm)",
      "通知(Notifications)",
      "ネームスペース(Namespace)"
    ]
  },
  {
    "service": "Logging Analytics",
    "terms": [
      "ログ・ソース(Log source)",
      "ログ・グループ(Log group)",
      "ダッシュボード(Dashboard)",
      "クエリ(Query)"
    ]
  },
  {
    "service": "Application Performance Monitoring(APM)",
    "terms": [
      "ドメイン(Domain)",
      "トレース(Trace)",
      "スパン(Span)",
      "サービス・マップ(Service map)"
    ]
  },
  {
    "service": "Vault",
    "terms": [
      "ボルト(Vault)",
      "キー(Key)",
      "シークレット(Secret)",
      "証明書(Certificate)",
      "マスター暗号化キー(MEK)"
    ]
  },
  {
    "service": "Key Management",
    "terms": [
      "キー(Key)",
      "キー・バージョン(Key version)",
      "エンドポイント(Endpoint)"
    ]
  },
  {
    "service": "Cloud Guard",
    "terms": [
      "ターゲット(Target)",
      "検出器(Detector)",
      "レスポンダ(Responder)",
      "問題(Problem)"
    ]
  },
  {
    "service": "Security Zones",
    "terms": [
      "セキュリティ・ゾーン(Security zone)",
      "レシピ(Recipe)"
    ]
  },
  {
    "service": "WAF",
    "terms": [
      "ポリシー(Policy)",
      "ルール(Rule)",
      "保護(Protection)",
      "ACL"
    ]
  },
  {
    "service": "Resource Manager",
    "terms": [
      "スタック(Stack)",
      "Terraform",
      "ジョブ(Job)",
      "状態(State)"
    ]
  },
  {
    "service": "DevOps",
    "terms": [
      "プロジェクト(Project)",
      "リポジトリ(Repository)",
      "ビルド・パイプライン(Build pipeline)",
      "デプロイ・パイプライン(Deploy pipeline)",
      "アーティファクト(Artifact)",
      "環境(Environment)"
    ]
  },
  {
    "service": "OS Management",
    "terms": [
      "管理対象インスタンス(Managed instance)",
      "パッチ(Patch)",
      "パッケージ(Package)",
      "スケジュール(Schedule)"
    ]
  },
  {
    "service": "Bastion",
    "terms": [
      "セッション(Session)",
      "ターゲット(Target)",
      "ポリシー(Policy)"
    ]
  },
  {
    "service": "Identity Domains",
    "terms": [
      "ドメイン(Domain)",
      "ユーザー(User)",
      "グループ(Group)",
      "アプリケーション(Application)",
      "ロール(Role)",
      "フェデレーション(Federation)"
    ]
  },
  {
    "service": "Audit",
    "terms": [
      "監査イベント(Audit event)",
      "コンパートメント(Compartment)",
      "サービス(Service)",
      "アクション(Action)",
      "イベント・ソース(Event source)"
    ]
  },
  {
    "service": "Usage and Cost",
    "terms": [
      "コスト分析(Cost analysis)",
      "予算(Budget)",
      "アラート(Alert)",
      "レポート(Report)",
      "タグ(Tag)"
    ]
  },
  {
    "service": "Limits and Quotas",
    "terms": [
      "サービス制限(Service limits)",
      "クォータ(Quota)",
      "コンパートメント(Compartment)",
      "スコープ(Scope)"
    ]
  },
  {
    "service": "Tagging",
    "terms": [
      "タグ名前空間(Tag namespace)",
      "タグキー(Tag key)",
      "タグ値(Tag value)",
      "デフォルトタグ(Default tag)"
    ]
  },
  {
    "service": "Resource Search",
    "terms": [
      "検索クエリ(Query)",
      "スコープ(Scope)",
      "リソース(Resource)",
      "タグ(Tag)"
    ]
  },
  {
    "service": "Certificates",
    "terms": [
      "証明書(Certificate)",
      "証明書リクエスト(CSR)",
      "秘密鍵(Private key)",
      "有効期限(Validity)",
      "更新(Renewal)"
    ]
  },
  {
    "service": "Email Delivery",
    "terms": [
      "送信者(Sender)",
      "ドメイン(Domain)",
      "抑止リスト(Suppression list)",
      "SMTP資格情報(SMTP credentials)",
      "イベント(Event)"
    ]
  },
  {
    "service": "Data Safe",
    "terms": [
      "ターゲットデータベース(Target database)",
      "セキュリティ評価(Security assessment)",
      "ユーザー評価(User assessment)",
      "マスキング・ポリシー(Masking policy)",
      "監査(Audit)"
    ]
  },
  {
    "service": "Vulnerability Scanning",
    "terms": [
      "スキャン・レシピ(Scan recipe)",
      "ホストスキャン(Host scan)",
      "コンテナスキャン(Container scan)",
      "結果(Results)",
      "通知(Notifications)"
    ]
  },
  {
    "service": "Data Integration",
    "terms": [
      "ワークスペース(Workspace)",
      "データ資産(Data asset)",
      "タスク(Task)",
      "パイプライン(Pipeline)",
      "スケジュール(Schedule)"
    ]
  },
  {
    "service": "Data Flow",
    "terms": [
      "アプリケーション(Application)",
      "実行(Run)",
      "Spark",
      "形状(Shape)",
      "ログ(Logs)"
    ]
  },
  {
    "service": "Data Science",
    "terms": [
      "プロジェクト(Project)",
      "ノートブック(Notebook)",
      "ジョブ(Job)",
      "モデル(Model)",
      "デプロイメント(Deployment)",
      "エンドポイント(Endpoint)"
    ]
  },
  {
    "service": "GoldenGate",
    "terms": [
      "デプロイメント(Deployment)",
      "接続(Connection)",
      "トレイル(Trail)",
      "レプリケーション(Replication)",
      "チェックポイント(Checkpoint)"
    ]
  },
  {
    "service": "Database Migration",
    "terms": [
      "マイグレーション(Migration)",
      "ソース(Source)",
      "ターゲット(Target)",
      "ジョブ(Job)",
      "レプリケーション(Replication)"
    ]
  },
  {
    "service": "Service Mesh",
    "terms": [
      "メッシュ(Mesh)",
      "仮想サービス(Virtual service)",
      "仮想デプロイメント(Virtual deployment)",
      "アクセス・ポリシー(Access policy)",
      "インバウンド・ゲートウェイ(Ingress gateway)"
    ]
  },
  {
    "service": "Instance Pools",
    "terms": [
      "インスタンス・プール(Instance pool)",
      "インスタンス構成(Instance configuration)",
      "オートスケーリング(Auto scaling)",
      "サイズ(Size)",
      "配置構成(Placement configuration)"
    ]
  },
  {
    "service": "Instance Configuration",
    "terms": [
      "インスタンス構成(Instance configuration)",
      "起動詳細(Launch details)",
      "形状(Shape)",
      "イメージ(Image)",
      "メタデータ(Metadata)"
    ]
  },
  {
    "service": "Autoscaling",
    "terms": [
      "オートスケーリング構成(Auto scaling configuration)",
      "ポリシー(Policy)",
      "メトリクス(Metrics)",
      "しきい値(Threshold)",
      "クールダウン(Cooldown)"
    ]
  },
  {
    "service": "Images",
    "terms": [
      "カスタム・イメージ(Custom image)",
      "プラットフォーム・イメージ(Platform image)",
      "イメージ・オブジェクト(Image OCID)",
      "インポート(Import)",
      "エクスポート(Export)"
    ]
  },
  {
    "service": "Public IP",
    "terms": [
      "パブリックIP(Public IP)",
      "予約(Reserved)",
      "エフェメラル(Ephemeral)",
      "関連付け(Assignment)",
      "ライフサイクル(Lifecycle)"
    ]
  },
  {
    "service": "Private IP",
    "terms": [
      "プライベートIP(Private IP)",
      "VNIC",
      "サブネット(Subnet)",
      "ホスト名(Hostname)",
      "逆引きDNS(PTR)"
    ]
  },
  {
    "service": "VCN Peering",
    "terms": [
      "ローカル・ピアリング(Local peering)",
      "リモート・ピアリング(Remote peering)",
      "ピアリング・ゲートウェイ(Peering gateway)",
      "ルート表(Route table)",
      "ルート・ルール(Route rule)"
    ]
  },
  {
    "service": "Network Firewall",
    "terms": [
      "ファイアウォール(Network firewall)",
      "ファイアウォール・ポリシー(Firewall policy)",
      "ルール(Rule)",
      "ログ(Logs)",
      "アラート(Alerts)"
    ]
  },
  {
    "service": "Cloud Advisor",
    "terms": [
      "推奨事項(Recommendations)",
      "カテゴリ(Category)",
      "重要度(Severity)",
      "影響(Impact)",
      "アクション(Action)"
    ]
  },
  {
    "service": "Operations Insights",
    "terms": [
      "インサイト(Insights)",
      "リソース(Resource)",
      "容量計画(Capacity planning)",
      "パフォーマンス(Performance)",
      "ベースライン(Baseline)"
    ]
  },
  {
    "service": "Stack Monitoring",
    "terms": [
      "モニタリング(Monitoring)",
      "メトリクス(Metrics)",
      "アラーム(Alarm)",
      "ターゲット(Target)",
      "収集(Discovery)"
    ]
  },
  {
    "service": "Database Management",
    "terms": [
      "管理対象データベース(Managed database)",
      "メトリクス(Metrics)",
      "SQL監視(SQL monitoring)",
      "AWR",
      "アラート(Alerts)"
    ]
  },
  {
    "service": "Database Tools",
    "terms": [
      "Database Tools connection",
      "SQL Worksheet",
      "接続(Connection)",
      "資格情報(Credentials)",
      "プライベートエンドポイント(Private endpoint)"
    ]
  },
  {
    "service": "Data Catalog",
    "terms": [
      "データ資産(Data asset)",
      "メタデータ(Metadata)",
      "用語集(Glossary)",
      "分類(Classification)",
      "リネージ(Lineage)"
    ]
  },
  {
    "service": "OCI Generative AI",
    "terms": [
      "モデル(Model)",
      "エンドポイント(Endpoint)",
      "プロンプト(Prompt)",
      "埋め込み(Embedding)",
      "ガードレール(Guardrails)"
    ]
  },
  {
    "service": "AI Vision",
    "terms": [
      "プロジェクト(Project)",
      "モデル(Model)",
      "データセット(Dataset)",
      "推論(Inference)",
      "エンドポイント(Endpoint)"
    ]
  },
  {
    "service": "AI Language",
    "terms": [
      "エンドポイント(Endpoint)",
      "キーフレーズ(Key phrase)",
      "固有表現(Entity)",
      "感情分析(Sentiment)",
      "言語検出(Language detection)"
    ]
  },
  {
    "service": "AI Speech",
    "terms": [
      "音声認識(Speech to Text)",
      "音声合成(Text to Speech)",
      "カスタム語彙(Custom vocabulary)",
      "エンドポイント(Endpoint)",
      "モデル(Model)"
    ]
  }
];

export const CLOUDFLARE_CONSOLE_GLOSSARY: ReadonlyArray<ConsoleGlossaryRow> = [
  {
    "service": "DNS",
    "terms": [
      "ゾーン(Zone)",
      "DNSレコード(Record)",
      "レコードタイプ(A/AAAA/CNAME/MX/TXTなど)",
      "TTL",
      "プロキシ設定(オレンジクラウド)"
    ]
  },
  {
    "service": "Internal DNS",
    "terms": [
      "内部ゾーン(Internal zone)",
      "DNSレコード(Record)",
      "参照ゾーン(Reference zone)"
    ]
  },
  {
    "service": "DNS Views",
    "terms": [
      "ビュー(View)",
      "内部ゾーン関連付け(Link)",
      "リゾルバ方針参照(Resolver policy参照)"
    ]
  },
  {
    "service": "Cache(CDN)",
    "terms": [
      "キャッシュ",
      "キャッシュパージ(Purge)",
      "Development Mode",
      "キャッシュキー"
    ]
  },
  {
    "service": "Cache Rules",
    "terms": [
      "キャッシュルール(Rule)",
      "ルール名(Rule name)",
      "条件式(Expression)",
      "キャッシュ適格(Eligibility)",
      "Cache Reserve設定"
    ]
  },
  {
    "service": "Rules",
    "terms": [
      "ルール(Rule)",
      "テンプレート(Templates)",
      "ルール順序(Order)",
      "実行順(Execution order)"
    ]
  },
  {
    "service": "Redirects",
    "terms": [
      "シングルリダイレクト(Single Redirects)ルール",
      "バルクリダイレクト(Bulk Redirects)リスト",
      "バルクリダイレクトルール",
      "ステータスコード",
      "クエリ保持設定"
    ]
  },
  {
    "service": "Transform Rules",
    "terms": [
      "URL Rewriteルール",
      "リクエストヘッダ変換ルール",
      "レスポンスヘッダ変換ルール",
      "Managed Transforms"
    ]
  },
  {
    "service": "WAF",
    "terms": [
      "マネージドルールセット(Managed ruleset)",
      "カスタムルール(Custom rules)",
      "レート制限(Rate limiting)ルール",
      "フェーズ(Phases)"
    ]
  },
  {
    "service": "Firewall Rules(旧)",
    "terms": [
      "ファイアウォールルール(Rule)",
      "アクション(Block/Challenge/Allow/Log)",
      "ルール式(Expression)"
    ]
  },
  {
    "service": "DDoS Protection",
    "terms": [
      "マネージドルールセット(Managed rulesets)",
      "緩和(Mitigation)設定",
      "Adaptive DDoS Protectionプロファイル"
    ]
  },
  {
    "service": "Bot Management",
    "terms": [
      "ボットスコア(Bot score)",
      "ボットグルーピング(Bot groupings)",
      "Bot Fight Mode設定"
    ]
  },
  {
    "service": "Turnstile",
    "terms": [
      "ウィジェット(Widget)",
      "Sitekey",
      "Secret key",
      "モード(Managed/Non-Interactive/Invisible)"
    ]
  },
  {
    "service": "Workers",
    "terms": [
      "Worker(スクリプト)",
      "routes(ルート)",
      "Custom Domains(カスタムドメイン)",
      "workers.devサブドメイン"
    ]
  },
  {
    "service": "Workers KV",
    "terms": [
      "ネームスペース(Namespace)",
      "キー(Key)",
      "値(Value)",
      "バインディング(Binding)"
    ]
  },
  {
    "service": "Durable Objects",
    "terms": [
      "Durable Object(オブジェクト)",
      "ストレージ(Storage API)",
      "アラーム(Alarms)"
    ]
  },
  {
    "service": "Queues",
    "terms": [
      "キュー(Queue)",
      "メッセージ(Message)",
      "コンシューマ(Consumer)",
      "イベントサブスクリプション(Event subscriptions)"
    ]
  },
  {
    "service": "Pages",
    "terms": [
      "プロジェクト(Project)",
      "デプロイ(Deployment)",
      "ロールバック(Rollback)",
      "Pages Functions"
    ]
  },
  {
    "service": "R2",
    "terms": [
      "バケット(Bucket)",
      "オブジェクト(Object)",
      "公開バケット(Public bucket)",
      "カスタムドメイン公開",
      "イベント通知"
    ]
  },
  {
    "service": "D1",
    "terms": [
      "データベース(Database)",
      "クエリ(Query)",
      "スキーマ(Schema)",
      "インポート(Import)"
    ]
  },
  {
    "service": "Vectorize",
    "terms": [
      "インデックス(Index)",
      "ベクトル(Vector)",
      "次元数(Dimension)",
      "距離指標(Distance metric)",
      "クエリ(Query)"
    ]
  },
  {
    "service": "Workers AI",
    "terms": [
      "AIバインディング(Binding)",
      "モデル(Model)",
      "実行(env.AI.run)"
    ]
  },
  {
    "service": "Images",
    "terms": [
      "Hosted Images",
      "画像(Image)",
      "バリアント(Variant)",
      "Delivery設定"
    ]
  },
  {
    "service": "Load Balancing",
    "terms": [
      "ロードバランサー設定",
      "プール(Pool)",
      "エンドポイント(Endpoint)",
      "ヘルスモニター(Monitor)",
      "ステアリングポリシー(Steering policy)"
    ]
  },
  {
    "service": "Logpush",
    "terms": [
      "ログプッシュジョブ(Job)",
      "データセット(Dataset)",
      "フィールド(Fields)",
      "送信先(Destination)",
      "HTTP送信先(HTTP destination)"
    ]
  },
  {
    "service": "Zero Trust Access",
    "terms": [
      "アプリケーション(Application)",
      "アクセスポリシー(Policy)",
      "セッション(Session)",
      "IDプロバイダ連携"
    ]
  },
  {
    "service": "Zero Trust Gateway(SWG)",
    "terms": [
      "HTTPポリシー",
      "DNSポリシー",
      "アプリ制御(App controls)",
      "DLP",
      "RBI連携"
    ]
  },
  {
    "service": "Browser Isolation(RBI)",
    "terms": [
      "分離ブラウザセッション",
      "ポリシー適用",
      "分離設定"
    ]
  },
  {
    "service": "CASB",
    "terms": [
      "連携(Integration)",
      "SaaSスキャン",
      "リメディエーション(Remediation)",
      "DLP制御"
    ]
  },
  {
    "service": "Cloudflare Tunnel",
    "terms": [
      "トンネル(Tunnel)",
      "コネクタ(cloudflared)",
      "Public hostnameルート",
      "サービス(https://localhostなど)",
      "ルーティング(Hostname/Domain)"
    ]
  },
  {
    "service": "WARP",
    "terms": [
      "デバイスプロファイル(Device profile)",
      "WARP設定(Settings)",
      "分割トンネル(Split tunnels)",
      "モード(Mode)",
      "設定伝播(Propagation)"
    ]
  },
  {
    "service": "Magic Transit",
    "terms": [
      "プレフィックス(Prefix)",
      "トンネル(GRE/IPsec)",
      "トンネル名",
      "Cloudflareエンドポイント",
      "Customerエンドポイント",
      "インターフェイスアドレス"
    ]
  },
  {
    "service": "SSL/TLS",
    "terms": [
      "証明書(Certificate)",
      "暗号化モード(Encryption mode)",
      "エッジ証明書(Edge certificates)",
      "Origin CA証明書",
      "カスタムホスト名(Custom Hostnames)"
    ]
  },
  {
    "service": "Origin CA",
    "terms": [
      "Origin CA証明書",
      "証明書リクエスト",
      "秘密鍵",
      "有効期限",
      "ホスト名"
    ]
  },
  {
    "service": "Custom Hostnames",
    "terms": [
      "カスタムホスト名",
      "フォールバックオリジン",
      "TLS設定",
      "検証(HTTP/DNS)"
    ]
  },
  {
    "service": "Authenticated Origin Pulls",
    "terms": [
      "Origin Pull設定",
      "証明書",
      "クライアント認証"
    ]
  },
  {
    "service": "mTLS",
    "terms": [
      "クライアント証明書",
      "CA",
      "ポリシー",
      "ホスト名対象範囲",
      "検証結果"
    ]
  },
  {
    "service": "API Shield",
    "terms": [
      "APIエンドポイント",
      "スキーマ(REST/GraphQL)",
      "mTLS設定",
      "シーケンス緩和",
      "レート制限"
    ]
  },
  {
    "service": "Rate Limiting",
    "terms": [
      "レート制限ルール",
      "しきい値(Threshold)",
      "期間(Period)",
      "アクション(Block/Challenge/Log)",
      "対象パス"
    ]
  },
  {
    "service": "Page Rules(旧)",
    "terms": [
      "Page Rule",
      "優先度(Priority)",
      "設定(Forwarding URL/Cache Levelなど)"
    ]
  },
  {
    "service": "Configuration Rules",
    "terms": [
      "設定ルール(Rule)",
      "条件式(Expression)",
      "設定項目(Headers/Cache/Securityなど)"
    ]
  },
  {
    "service": "Request Tracing",
    "terms": [
      "トレース",
      "リクエストID",
      "タイムライン",
      "診断ログ"
    ]
  },
  {
    "service": "Analytics",
    "terms": [
      "ダッシュボード",
      "フィルタ",
      "レポート",
      "メトリクス",
      "データ保持期間"
    ]
  },
  {
    "service": "Web Analytics",
    "terms": [
      "サイト(Site)",
      "スニペット(Snippet)",
      "イベント(Event)",
      "参照元(Referrer)",
      "レポート"
    ]
  },
  {
    "service": "Security Analytics",
    "terms": [
      "イベント",
      "シグナル",
      "攻撃カテゴリ",
      "トレンド",
      "フィルタ"
    ]
  },
  {
    "service": "GraphQL Analytics API",
    "terms": [
      "データセット",
      "クエリ",
      "フィルタ",
      "グルーピング",
      "メトリクス"
    ]
  },
  {
    "service": "Access(Zero Trust)",
    "terms": [
      "アプリケーション(Application)",
      "ポリシー(Policy)",
      "ルール(Rule)",
      "セッション(Session)",
      "認証方式(IdP/OTPなど)"
    ]
  },
  {
    "service": "Access Service Tokens",
    "terms": [
      "サービスToken",
      "クライアントID",
      "クライアントシークレット",
      "ポリシー関連付け"
    ]
  },
  {
    "service": "Gateway(Zero Trust)",
    "terms": [
      "ポリシー(HTTP/DNS/Network)",
      "ルール",
      "IDベース制御",
      "ログ",
      "例外(Allowlist)"
    ]
  },
  {
    "service": "Gateway DNS",
    "terms": [
      "ロケーション(Location)",
      "DNSポリシー",
      "DoH設定",
      "DNSログ"
    ]
  },
  {
    "service": "Gateway HTTP",
    "terms": [
      "HTTPポリシー",
      "カテゴリ",
      "アプリ識別",
      "ブラウザ分離",
      "検査ログ"
    ]
  },
  {
    "service": "DLP(Zero Trust)",
    "terms": [
      "DLPプロファイル",
      "検出ルール",
      "例外",
      "アクション(Block/Allow/Log)",
      "監査ログ"
    ]
  },
  {
    "service": "RBI(ブラウザ分離)",
    "terms": [
      "分離ポリシー",
      "セッション",
      "表示モード",
      "ログ",
      "例外"
    ]
  },
  {
    "service": "ZTNA Device Posture",
    "terms": [
      "ポスチャチェック",
      "ルール",
      "条件(OS/証明書/EDRなど)",
      "アクション"
    ]
  },
  {
    "service": "CASB(Zero Trust)",
    "terms": [
      "インテグレーション",
      "ポリシー",
      "アラート",
      "リメディエーション",
      "監査ログ"
    ]
  },
  {
    "service": "Tunnel(Zero Trust)",
    "terms": [
      "トンネル",
      "コネクタ(cloudflared)",
      "Public hostname",
      "ルート設定",
      "サービスタイプ(HTTP/TCP/SSHなど)"
    ]
  },
  {
    "service": "Magic WAN",
    "terms": [
      "サイト",
      "トンネル(IPsec/GRE)",
      "ルーティング",
      "ポリシー",
      "接続状態"
    ]
  },
  {
    "service": "Magic Firewall",
    "terms": [
      "ファイアウォールルール",
      "送信元/宛先",
      "ポート",
      "プロトコル",
      "アクション"
    ]
  },
  {
    "service": "Magic NAT",
    "terms": [
      "NATルール",
      "IPマッピング",
      "変換方向",
      "優先度",
      "ログ"
    ]
  },
  {
    "service": "Magic Transit",
    "terms": [
      "プレフィックス",
      "トンネル(GRE/IPsec)",
      "BGP",
      "ルート",
      "フロー"
    ]
  },
  {
    "service": "Spectrum",
    "terms": [
      "アプリケーション",
      "オリジン",
      "ポート",
      "プロキシ設定",
      "アクセス制御"
    ]
  },
  {
    "service": "Argo Smart Routing",
    "terms": [
      "Argo設定",
      "スマートルーティング",
      "Tiered Cache関連",
      "ログ"
    ]
  },
  {
    "service": "Tiered Cache",
    "terms": [
      "キャッシュ階層",
      "上位キャッシュ",
      "キャッシュヒット率",
      "設定"
    ]
  },
  {
    "service": "Cache Reserve",
    "terms": [
      "リザーブ設定",
      "バックアップキャッシュ",
      "取得元設定",
      "監視"
    ]
  },
  {
    "service": "Waiting Room",
    "terms": [
      "待合室(Waiting Room)",
      "ルール",
      "キュー設定",
      "セッション持続",
      "バイパス"
    ]
  },
  {
    "service": "Load Balancing",
    "terms": [
      "プール(Pool)",
      "オリジン(Origin/Endpoint)",
      "モニター(Monitor)",
      "ステアリング",
      "フェイルオーバー"
    ]
  },
  {
    "service": "Health Checks",
    "terms": [
      "モニター",
      "エンドポイント",
      "しきい値",
      "通知",
      "履歴"
    ]
  },
  {
    "service": "Email Routing",
    "terms": [
      "ルーティングルール(Route)",
      "カスタムアドレス(Custom address)",
      "宛先アドレス(Destination address)",
      "検証(Verification)",
      "Catch-all",
      "サブアドレッシング"
    ]
  },
  {
    "service": "Email Workers",
    "terms": [
      "Email Worker(Worker)",
      "ルーティングアクション(Send to Worker)",
      "ロジック",
      "ログ",
      "ルール連携"
    ]
  },
  {
    "service": "Email Security",
    "terms": [
      "ポリシー",
      "検知(Phishing/Malware)",
      "例外",
      "レポート",
      "アラート"
    ]
  },
  {
    "service": "Registrar",
    "terms": [
      "ドメイン登録",
      "連絡先",
      "ネームサーバー",
      "自動更新",
      "ロック"
    ]
  },
  {
    "service": "Domain Transfers",
    "terms": [
      "移管",
      "認証コード",
      "ステータス",
      "承認",
      "期限"
    ]
  },
  {
    "service": "Images",
    "terms": [
      "画像(Image)",
      "バリアント(Variant)",
      "配信URL",
      "変換(Resize/Format)",
      "サイン付きURL"
    ]
  },
  {
    "service": "Stream",
    "terms": [
      "ビデオ(Video)",
      "ライブ入力(Live Input)",
      "ストリームキー(Stream Key)",
      "署名付きURL",
      "プレイヤー埋め込み"
    ]
  },
  {
    "service": "Stream Live",
    "terms": [
      "ライブ入力(Live Input)",
      "配信(Streaming)",
      "録画(Recording)",
      "DVR",
      "マニフェスト(HLS/DASH)",
      "Video ID"
    ]
  },
  {
    "service": "Logpush",
    "terms": [
      "ジョブ(Job)",
      "データセット(Dataset)",
      "フィルタ",
      "送信先(Destination)",
      "失敗リトライ"
    ]
  },
  {
    "service": "Audit Logs",
    "terms": [
      "監査ログイベント",
      "フィルタ",
      "エクスポート",
      "保持期間",
      "参照"
    ]
  },
  {
    "service": "API Tokens",
    "terms": [
      "APIトークン",
      "権限(Permissions)",
      "リソーススコープ",
      "ローテーション",
      "失効"
    ]
  },
  {
    "service": "API Keys(旧)",
    "terms": [
      "グローバルAPIキー",
      "メール",
      "権限範囲",
      "置き換え推奨"
    ]
  },
  {
    "service": "Account",
    "terms": [
      "アカウント",
      "メンバー",
      "ロール",
      "アクセス権",
      "監査"
    ]
  },
  {
    "service": "Zone",
    "terms": [
      "ゾーン",
      "設定",
      "プラン",
      "ネームサーバー",
      "ドメイン"
    ]
  }
];

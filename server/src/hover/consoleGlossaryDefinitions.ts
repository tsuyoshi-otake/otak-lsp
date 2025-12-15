/**
 * コンソール用語（代表リソース用語）の説明/類義語定義。
 *
 * `consoleGlossaryData.ts` はサービス名と代表用語の「一覧」なので、
 * このファイルで用語そのものの意味（説明/別名/類義語）を補完する。
 */

export type ConsoleGlossaryDefinition = Readonly<{
  term: string;
  description: string;
  aliases?: ReadonlyArray<string>;
  synonyms?: ReadonlyArray<string>;
  antonyms?: ReadonlyArray<string>;
}>;

export const CONSOLE_TERM_DEFINITIONS: ReadonlyArray<ConsoleGlossaryDefinition> = [
  // 共通（クラウド基礎）
  {
    term: 'インスタンス',
    description: 'サービス上の実体（実行単位）。文脈によりVM/DB/アプリ等を指す。'
  },
  {
    term: 'AMI',
    synonyms: ['Amazon Machine Image'],
    description: '（AWS）インスタンス起動に使うマシンイメージ（OS/設定のひな形）。'
  },
  {
    term: '起動テンプレート',
    synonyms: ['Launch template'],
    description: '（AWS）インスタンス起動設定（AMI、ネットワーク、タグ等）をひな形化したもの。'
  },
  {
    term: 'DBインスタンス',
    synonyms: ['DB instance'],
    description: 'マネージドDBサービス上のデータベース実体（コンピュート/ストレージを含む単位）。'
  },
  {
    term: 'セカンダリインデックス',
    synonyms: ['Secondary index', 'GSI', 'LSI'],
    description: '主キー以外で検索できるようにする補助インデックス（NoSQL等で利用）。'
  },
  {
    term: 'タスク定義',
    synonyms: ['Task definition'],
    description: 'コンテナ実行に必要な設定（イメージ、CPU/メモリ、環境変数等）の定義。'
  },
  {
    term: 'イベントソースマッピング',
    synonyms: ['Event source mapping'],
    description: 'イベント源（キュー等）と処理（関数等）を紐付ける設定。'
  },
  {
    term: 'ジョブ定義',
    synonyms: ['Job definition'],
    description: 'ジョブの実行に必要な設定（コンテナ/コマンド/リソース等）を定義したもの。'
  },
  {
    term: 'ステートマシン',
    synonyms: ['State machine'],
    description: '状態遷移で処理フローを表現する仕組み（ワークフロー）。'
  },
  {
    term: '関数',
    synonyms: ['Function'],
    description: 'イベント等を契機に実行される処理単位（サーバレス/FaaSの関数など）。'
  },
  {
    term: 'レイヤー',
    synonyms: ['Layer'],
    description: '共通コードや依存関係を切り出して再利用する単位。'
  },
  {
    term: 'エイリアス',
    synonyms: ['Alias'],
    description: '参照用の別名。実体の切り替えや互換のために使われる。'
  },
  {
    term: 'クラスター',
    description: '複数ノードを1つのまとまりとして運用する単位。'
  },
  {
    term: 'ノード',
    description: 'クラスター等を構成する個々のサーバ/実行単位。'
  },
  {
    term: 'エンドポイント',
    description: 'サービスや機能へ接続するための接続先（URL、DNS名、IPなど）。'
  },
  {
    term: 'リスナー',
    description: '受信設定。ポート/プロトコルなどの受け口を定義する。'
  },
  {
    term: 'ターゲットグループ',
    description: '負荷分散やルーティングの転送先をまとめたグループ。'
  },
  {
    term: 'ロードバランサー',
    synonyms: ['Load Balancer', 'LB'],
    description: '複数の転送先へリクエストを分散する仕組み（負荷分散）。'
  },
  {
    term: 'ルール',
    description: '条件とアクションを定義して挙動を制御する設定。'
  },
  {
    term: 'ポリシー',
    description: '許可/禁止や動作条件を定義するルールの集合。'
  },
  {
    term: '設定',
    description: '機能の動作を決めるパラメータやオプション。'
  },
  {
    term: '関連付け',
    description: 'リソース同士を紐付けて関係性を持たせる操作/状態。'
  },
  {
    term: 'スナップショット',
    description: 'ある時点の状態を保存したもの（復元や複製に利用）。'
  },
  {
    term: 'リカバリーポイント',
    synonyms: ['Recovery point'],
    description: 'バックアップ/保護の復元可能な世代（復旧点）。'
  },
  {
    term: 'バックアップ',
    description: '障害や誤操作に備えた復旧用コピー。'
  },
  {
    term: 'ログ',
    description: 'システムの出来事を時系列に記録したデータ。'
  },
  {
    term: 'メトリクス',
    description: '監視対象の数値指標（CPU、レイテンシ、エラー率など）。'
  },
  {
    term: 'アラーム',
    description: 'メトリクスの条件（閾値等）を満たしたときに発火する通知。'
  },
  {
    term: 'アラート',
    description: '異常や条件成立を知らせる通知/イベント。'
  },
  {
    term: 'ダッシュボード',
    description: '指標や状況を可視化する画面。'
  },
  {
    term: 'クエリ',
    description: 'データ検索・集計の問い合わせ（問い合わせ文）。'
  },
  {
    term: 'フィルタ',
    description: '条件で対象を絞り込む仕組み。'
  },
  {
    term: 'タグ',
    description: 'リソースに付与するキー/値のメタデータ（整理、課金集計、制御等）。'
  },
  {
    term: 'スケジュール',
    description: '実行や切り替えのタイミングを定義する設定。'
  },
  {
    term: 'バージョン',
    description: '同一対象の世代/履歴を表す識別子。'
  },
  {
    term: '環境',
    description: '実行/デプロイの区分（開発・検証・本番など）や、そのための分離単位。'
  },
  {
    term: 'ワークスペース',
    description: '設定・メンバー・データなどをまとめる作業単位。'
  },
  {
    term: 'プロジェクト',
    description: '設定や作業対象をまとめる論理単位。'
  },
  {
    term: 'デプロイ',
    description: 'アプリや設定を配布して反映すること。'
  },
  {
    term: 'パイプライン',
    description: '処理を段階的に実行する一連の流れ（ビルド、データ処理等）。'
  },
  {
    term: 'ジョブ',
    description: '実行単位（バッチ、ビルド、学習などのまとまり）。'
  },
  {
    term: 'タスク',
    description: 'ジョブを構成する個々の処理、または実行単位。'
  },
  {
    term: 'トリガー',
    description: '処理の起動条件（イベント、スケジュール等）。'
  },
  {
    term: 'イベント',
    description: '状態変化や出来事を表す通知データ。'
  },
  {
    term: 'ストリーム',
    description: '時系列に流れるデータ列（イベントやログなど）。'
  },
  {
    term: 'キュー',
    description: '非同期処理のためにメッセージを蓄える待ち行列。'
  },
  {
    term: 'トピック',
    description: 'Pub/Subでメッセージを分類する宛先（発行先）。'
  },
  {
    term: 'サブスクリプション',
    description: '購読/受信側の登録単位（通知先、権限、課金区分など文脈依存）。'
  },
  {
    term: 'データセット',
    description: '分析や学習に用いるデータのまとまり。'
  },
  {
    term: 'モデル',
    description: '機械学習モデル、または設定/データ構造の表現（文脈依存）。'
  },
  {
    term: 'データソース',
    description: 'データの取得元（DB、ストレージ、ログなど）。'
  },
  {
    term: 'スキーマ',
    description: 'データ構造や制約の定義。'
  },
  {
    term: 'スコープ',
    description: '適用範囲（どこまで有効か）を表す概念。'
  },
  {
    term: '名前空間',
    description: '名前の衝突を避けるための区画（論理的な名前の範囲）。'
  },
  {
    term: 'ドメイン',
    description: '名前空間や管理単位。DNSドメインやサービスの論理単位など文脈依存。'
  },
  {
    term: 'キー',
    description: '識別子や秘密情報（暗号鍵/アクセストークン等）を指すことが多い。'
  },
  {
    term: '値',
    description: 'キーに対応するデータ（Key-ValueのValue）。'
  },
  {
    term: 'テーブル',
    description: '行と列で表現されるデータ構造（主にRDB/ログ基盤の表）。'
  },
  {
    term: 'インデックス',
    description: '検索を高速化するための補助データ構造。'
  },
  {
    term: 'レプリカ',
    description: '可用性や性能のために複製された同等の実体。'
  },
  {
    term: 'レプリケーション',
    description: 'データや設定を複数箇所へ複製する仕組み。'
  },
  {
    term: 'アプリケーション',
    description: 'ユーザー向け機能を提供するソフトウェア/サービスの単位。'
  },
  {
    term: 'サービス',
    description: '機能を提供する仕組み/提供単位。'
  },
  {
    term: 'リソース',
    description: 'クラウド上で管理される対象（VM、DB、ネットワーク等）。'
  },
  {
    term: 'レポート',
    description: '集計結果や評価結果をまとめた出力。'
  },
  {
    term: '推奨事項',
    description: '改善案（コスト/性能/セキュリティ等）の提案。'
  },
  {
    term: '例外',
    description: '通常フローから外れた状態（エラー）や、ルールの適用除外。'
  },

  // ネットワーク/DNS
  {
    term: 'VPC',
    description: 'クラウド上に作る論理的に分離された仮想ネットワーク。'
  },
  {
    term: 'ゾーン',
    synonyms: ['Zone'],
    description: 'DNSの管理単位。ドメイン配下のレコード集合を指すことが多い。'
  },
  {
    term: 'ホストゾーン',
    synonyms: ['Hosted zone'],
    description: 'DNSゾーンの管理単位（ドメイン配下のレコード集合）。'
  },
  {
    term: 'レコード',
    synonyms: ['Record'],
    description: 'DNS等の名前解決に使う設定項目（A/AAAA/CNAME等）。'
  },
  {
    term: 'レコードタイプ',
    description: 'DNSレコードの種類（A/AAAA/CNAME/MX/TXT等）。'
  },
  {
    term: 'TTL',
    synonyms: ['Time To Live'],
    description: 'キャッシュ等の有効期限。DNSレコードやキャッシュ制御で利用される。'
  },
  {
    term: 'ヘルスチェック',
    synonyms: ['Health check'],
    description: '対象の稼働状態を確認する仕組み（疎通/応答などの監視）。'
  },
  {
    term: 'ディストリビューション',
    synonyms: ['Distribution'],
    description: 'CDN等の配信設定単位（配信元/キャッシュ/ルールを束ねる）。'
  },
  {
    term: 'オリジン',
    synonyms: ['Origin'],
    description: 'CDN等でコンテンツ取得元となるバックエンド（配信元）。'
  },
  {
    term: 'ビヘイビア',
    synonyms: ['Behavior'],
    description: 'パス条件などに応じた動作設定（キャッシュ/転送/ヘッダ等）。'
  },
  {
    term: 'キャッシュポリシー',
    synonyms: ['Cache policy'],
    description: 'キャッシュキーやTTLなどキャッシュ動作を定義するポリシー。'
  },
  {
    term: 'キャッシュキー',
    description: 'キャッシュを識別するキー（URL/ヘッダ/クッキー/クエリ等の組み合わせで決まる）。'
  },
  {
    term: 'キャッシュルール',
    synonyms: ['Cache rule', 'Cache Rules'],
    description: '条件に応じてキャッシュ動作を制御するルール（キャッシュ有効化/TTL/キー等）。'
  },
  {
    term: '条件式',
    synonyms: ['Expression'],
    description: 'ルールの適用条件を記述する式（パス/ヘッダ/クエリ等を参照して真偽を判定）。'
  },
  {
    term: 'キャッシュ適格',
    synonyms: ['Eligibility'],
    description: 'リクエスト/レスポンスがキャッシュ対象になり得るか（キャッシュ可否）の判定。'
  },
  {
    term: 'ビュー',
    synonyms: ['View'],
    description: '対象や設定の見え方を分けて扱うための区分（文脈により表示/適用単位）。'
  },
  {
    term: 'オリジンリクエストポリシー',
    synonyms: ['Origin request policy'],
    description: 'オリジンへ転送するヘッダ/クッキー/クエリ等を定義するポリシー。'
  },
  {
    term: 'サブネット',
    synonyms: ['Subnet'],
    description: '仮想ネットワーク内のIPアドレス範囲（ネットワークの区画）。'
  },
  {
    term: 'ルートテーブル',
    synonyms: ['Route table'],
    description: '宛先に応じた転送経路（ルーティング）を定義する設定。'
  },
  {
    term: 'ルート',
    synonyms: ['Route'],
    description: '通信経路やルーティング設定、またはAPIの経路（URLパス）を指す。'
  },
  {
    term: 'インターネットゲートウェイ',
    synonyms: ['Internet gateway'],
    description: '仮想ネットワークとインターネットの出入口となるゲートウェイ。'
  },
  {
    term: 'NATゲートウェイ',
    synonyms: ['NAT gateway'],
    description: 'プライベート側からの外向き通信を中継し、送信元IPを変換する。'
  },
  {
    term: 'セキュリティグループ',
    description: 'インスタンス等に適用する仮想ファイアウォール（許可ルールの集合）。'
  },
  {
    term: 'ネットワークインターフェイス',
    synonyms: ['Network Interface', 'NIC', 'VNIC'],
    description: 'ネットワーク接続口となるインターフェイス（IP/セキュリティ等の単位）。'
  },
  {
    term: 'Elastic IP',
    aliases: ['EIP'],
    description: '固定のパブリックIPアドレス（割り当て/付け替えが可能）。'
  },
  {
    term: 'ネットワークACL',
    aliases: ['NACL'],
    description: 'サブネット境界などで適用するアクセス制御リスト。'
  },
  {
    term: 'VPCエンドポイント',
    synonyms: ['VPC endpoint'],
    description: '仮想ネットワーク内からサービスへプライベートに接続するエンドポイント。'
  },
  {
    term: 'ピアリング接続',
    synonyms: ['Peering'],
    description: '2つのネットワークを相互接続する仕組み（VPC/VNet/VCNなど）。'
  },

  // ストレージ
  {
    term: 'ボリューム',
    synonyms: ['Volume'],
    description: 'ブロックストレージ（ディスク）。インスタンス等にアタッチして利用する。'
  },
  {
    term: 'ファイルシステム',
    synonyms: ['File system', 'Filesystem'],
    description: 'ディレクトリ階層で共有/利用するファイルストレージの単位。'
  },
  {
    term: 'アクセスポイント',
    synonyms: ['Access point'],
    description: 'アクセスの入口となる論理リソース（権限/経路/設定の単位）。'
  },
  {
    term: 'バケット',
    synonyms: ['Bucket'],
    description: 'オブジェクトストレージの格納単位（コンテナ）。'
  },
  {
    term: 'オブジェクト',
    synonyms: ['Object'],
    description: 'オブジェクトストレージに格納される1つのデータ（ファイル）とメタデータ。'
  },
  {
    term: 'プレフィックス',
    synonyms: ['Prefix'],
    description: 'キー（パス）先頭の共通部分。擬似的な階層として扱われる。'
  },
  {
    term: 'ライフサイクルルール',
    synonyms: ['Lifecycle rule'],
    description: '保存期間や移行/削除などを自動化するルール。'
  },
  {
    term: '静的ウェブサイトホスティング',
    synonyms: ['Static website hosting'],
    description: '静的ファイルをWebサイトとして公開するホスティング機能。'
  },

  // 認証/権限
  {
    term: 'ユーザー',
    synonyms: ['User'],
    description: '認証主体（人/利用者）を表すアカウント。'
  },
  {
    term: 'グループ',
    synonyms: ['Group'],
    description: 'ユーザー等をまとめて権限付与しやすくする単位。'
  },
  {
    term: 'ロール',
    synonyms: ['Role'],
    description: '権限のまとまり。主体が引き受けて（Assume）利用することが多い。'
  },
  {
    term: 'インスタンスプロファイル',
    synonyms: ['Instance profile'],
    description: 'インスタンスにロール等の権限を付与するための関連付け（プロファイル）。'
  },

  // Azure固有
  {
    term: 'リソースグループ',
    synonyms: ['Resource Group'],
    description: 'Azureでリソースをまとめて管理する単位（権限/課金/操作の境界）。'
  },
  {
    term: 'サブスクリプション',
    synonyms: ['Subscription'],
    description: 'Azureの課金/権限の管理単位。'
  },
  {
    term: '管理グループ',
    synonyms: ['Management Group'],
    description: '複数サブスクリプションを束ねてポリシー等を適用する単位。'
  },
  {
    term: 'テナント',
    synonyms: ['Tenant'],
    description: 'ディレクトリ（ID管理）の論理単位。組織の境界を表すことが多い。'
  },
  {
    term: 'サービスプリンシパル',
    synonyms: ['Service principal'],
    description: 'アプリケーションを表すID（認証主体）。自動化やCIで利用される。'
  },
  {
    term: 'マネージドID',
    synonyms: ['Managed identity'],
    description: 'Azureが発行/ローテーションするID。シークレット管理を減らせる。'
  },
  {
    term: '条件付きアクセス',
    synonyms: ['Conditional Access'],
    description: 'ユーザー/端末/場所などの条件に応じて認証要件を変える制御。'
  },
  {
    term: 'PIM',
    synonyms: ['Privileged Identity Management'],
    description: '特権ロールを必要時だけ有効化する等の特権管理機能。'
  },
  {
    term: 'KQL',
    synonyms: ['Kusto Query Language'],
    description: 'Azure Log Analytics等で使うクエリ言語。'
  },
  {
    term: 'Dapr',
    description: '分散アプリの共通機能（Pub/Sub等）を提供するランタイム。'
  },

  // OCI固有
  {
    term: 'テナンシ',
    synonyms: ['Tenancy'],
    description: 'OCIのアカウント（組織）境界となる最上位の管理単位。'
  },
  {
    term: 'コンパートメント',
    synonyms: ['Compartment'],
    description: 'OCIでリソースを分離/整理する論理区画（権限/課金の単位）。'
  },
  {
    term: 'VCN',
    synonyms: ['Virtual Cloud Network'],
    description: 'OCIの仮想ネットワーク。'
  },
  {
    term: 'DRG',
    synonyms: ['Dynamic Routing Gateway'],
    description: 'VCN間やオンプレ接続を中継するルータ機能。'
  },
  {
    term: 'LPG',
    synonyms: ['Local Peering Gateway'],
    description: '同一リージョン内のVCN同士を接続するためのゲートウェイ。'
  },
  {
    term: 'VNIC',
    description: '仮想ネットワークインターフェイス（NIC）。'
  },

  // Cloudflare固有
  {
    term: 'オレンジクラウド',
    description: 'Cloudflareでプロキシ（CDN/WAF等）を有効にした状態（オレンジ雲）。'
  },
  {
    term: 'プロキシ設定',
    description: 'DNSレコードをCloudflareプロキシ配下にする/しないの切り替え。'
  },
  {
    term: 'キャッシュパージ',
    synonyms: ['Purge'],
    description: 'キャッシュを削除し、次回アクセスで取得元から再取得させる操作。'
  },
  {
    term: 'workers.dev',
    description: 'Cloudflare Workersの開発用サブドメイン。'
  },
  {
    term: 'バインディング',
    synonyms: ['Binding'],
    description: 'WorkerからKV/R2などのリソースへアクセスするための紐付け設定。'
  },
  {
    term: 'Durable Object',
    description: 'Cloudflare Workers上で状態を持つオブジェクト（アクター）を扱う仕組み。'
  },
  {
    term: 'ネームスペース',
    synonyms: ['Namespace'],
    description: 'KV等でキー空間を分離する単位。'
  },
  {
    term: 'Sitekey',
    description: 'Turnstileで公開側に埋め込む識別子（クライアント側キー）。'
  },
  {
    term: 'Secret key',
    description: 'Turnstileの検証で使う秘密鍵（サーバ側キー）。'
  },
];

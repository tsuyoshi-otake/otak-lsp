---
title: 用語図鑑 Hover 表示テスト（約200語）
---

# 用語図鑑 Hover 表示テスト

このドキュメントは、otak-lcp の「用語図鑑（オフライン）」の表示を手早く確認するためのサンプルです。  
AWS / Azure / OCI / Cloudflare をまたぐ構成の説明文として読めるようにしてあります。本文中の単語にマウスを置いて Hover を確認してください。

## 1. 目的と前提

今回作るのは、静的コンテンツとAPIを持つWebアプリケーションです。配信は CDN、API は API Gateway、バックエンドは Container Apps か Kubernetes、データは Database に保存し、ログとメトリクスで監視します。  
用語としては、プロジェクト / 環境 / デプロイ / パイプライン / ジョブ / タスク / ルール / ポリシー / スコープ / 名前空間 / タグ が頻出します。

## 2. Cloudflare を入口にする（DNS と Cache）

公開ドメインは Zone に作り、DNSレコード(Record) を管理します。レコードタイプ(A/AAAA/CNAME/MX/TXTなど) を選び、TTL を設定します。  
外部公開するWebは、プロキシ設定(オレンジクラウド) を有効にして Cloudflare CDN に乗せ、キャッシュキーと Cache Rules の条件式(Expression) で振る舞いを制御します。

- まず Rules と Rulesets の違いを整理します。Rules は条件とアクション、Rulesets はそれを束ねて実行順(Execution order) を管理する単位です。
- Redirects は、Single Redirects ルールと Bulk Redirects リストで切り替えます。ステータスコードとクエリ保持設定を見落とすと意図しないリダイレクトになります。
- Transform Rules では、URL Rewriteルールやリクエストヘッダ変換ルール、レスポンスヘッダ変換ルールを使います。Managed Transforms は既定の変換をまとめたものです。
- Cache(CDN) は Cache Purge（キャッシュパージ）と Development Mode の挙動差が重要です。Cache Reserve設定はキャッシュの保持戦略に影響します。
- Images は Hosted Images / 画像(Image) / バリアント(Variant) を軸に考えると整理しやすいです。Delivery設定は配信URLと変換(Resize/Format) に関わります。

## 3. Cloudflare Workers で軽いAPIを作る（Workers / KV / D1 / R2）

動的な部分は Cloudflare Workers を使い、routes(ルート) と Custom Domains(カスタムドメイン) を設定します。必要なら workers.dev サブドメインも使えます。  
設定値は Workers KV の ネームスペース(Namespace) に キー(Key) と 値(Value) を置き、Binding で Worker(スクリプト) から参照します。

- Durable Objects は Durable Object(オブジェクト) と Storage API を使って状態を持たせます。一定の時間処理が必要なら Alarms を組み合わせます。
- Queues は キュー(Queue) と メッセージ(Message) を非同期に流し、Consumer(コンシューマ) が処理します。イベントサブスクリプション(Event subscriptions) の設計が運用性を左右します。
- R2 は バケット(Bucket) と オブジェクト(Object) を扱うオブジェクトストレージです。公開バケット(Public bucket) と カスタムドメイン公開 の設計はセキュリティ方針と合わせます。
- D1 は データベース(Database) と スキーマ(Schema) を用意し、クエリ(Query) を発行します。インポート(Import) は初期データ投入に使います。
- Vectorize は インデックス(Index) と ベクトル(Vector) を管理し、次元数(Dimension) と 距離指標(Distance metric) を決めて検索します。

## 4. TLS とセキュリティ（SSL/TLS / WAF / API Shield）

通信は SSL/TLS で保護し、証明書(Certificate) と 暗号化モード(Encryption mode) を選びます。必要に応じて Edge certificates と Origin CA証明書 を使い分けます。  
API Shield は APIエンドポイント と スキーマ(REST/GraphQL) を守るための機能で、mTLS設定 や Rate Limiting のしきい値(Threshold) を扱います。

- WAF は マネージドルールセット(Managed ruleset) と カスタムルール(Custom rules) を併用します。フェーズ(Phases) を意識して適用順を設計します。
- DDoS Protection は 緩和(Mitigation) 設定と Adaptive DDoS Protectionプロファイル を確認します。
- Bot Management は ボットスコア(Bot score) と ボットグルーピング(Bot groupings) を見ながら調整します。Bot Fight Mode設定 も検討します。
- Turnstile は ウィジェット(Widget) の Sitekey と Secret key を使って検証します。モード(Managed/Non-Interactive/Invisible) はUXと不正対策のバランスです。

## 5. AWS でアプリ基盤を組む（VPC / EC2 / ALB / S3）

AWS側は VPC に サブネット と ルートテーブル を作り、インターネットゲートウェイ と NATゲートウェイ を配置します。  
アプリは EC2 の インスタンス を 起動テンプレート で統一し、ロードバランサー(ALB/NLB) と ターゲットグループ と リスナー で受けます。

- Elastic Load Balancing の ルール は、パス条件やヘッダ条件でルーティングします。
- Route 53 は ホストゾーン と レコード を管理し、ヘルスチェック を用意してフェイルオーバーを成立させます。
- CloudFront は ディストリビューション / オリジン / ビヘイビア / キャッシュポリシー / オリジンリクエストポリシー をセットで設計します。
- S3 は バケット / オブジェクト / プレフィックス を中心に、バケットポリシー と ライフサイクルルール を設定します。静的ウェブサイトホスティング も候補です。
- EBS は ボリューム と スナップショット を扱います。EFS は ファイルシステム と マウントターゲット と アクセスポイント を使います。

## 6. Azure で同等の構成を作る（ARM / VNet / AKS）

Azureでは Azure Resource Manager(ARM) の リソースグループ(Resource Group) を単位にし、サブスクリプション(Subscription) と 管理グループ(Management Group) でガバナンスを構成します。  
ネットワークは Virtual Network(VNet) と サブネット(Subnet)、Network Security Group(NSG) と ルートテーブル(Route table) を軸にします。

- Microsoft Entra ID(旧Azure AD) は テナント(Tenant) と サービスプリンシパル(Service principal) を理解すると、CIの権限設計が楽になります。条件付きアクセス(Conditional Access) と PIM は特権運用の要です。
- Azure Kubernetes Service(AKS) は クラスター(Cluster) / ノードプール(Node pool) / アドオン(Add-on) を整理し、Ingress Controller と Cluster autoscaler を運用設計に入れます。
- Azure Container Apps は 環境(Environment) と リビジョン(Revision) を中心に、スケールルール(Scale rule) と Dapr の有無を決めます。
- API Management(APIM) は API と ステージ 代わりの公開単位を作り、製品(Products) と サブスクリプション(Subscription) で利用制限を整理します。
- Azure Monitor は メトリクス(Metrics) と アラートルール(Alert rule) を扱い、Log Analytics の KQL で クエリ(Query) を書きます。Application Insights は 依存関係(Dependencies) と 例外(Exceptions) を追跡します。

## 7. OCI で同等の構成を作る（IAM / VCN / DRG）

OCIでは OCI IAM の テナンシ(Tenancy) と コンパートメント(Compartment) が土台です。ユーザー(User) / グループ(Group) / ポリシー(Policy) を Compartment に適用し、最小権限を維持します。  
ネットワークは OCI Networking の VCN / サブネット(Subnet) / ルート表(Route table) を中心に、DRG と ローカル・ピアリング・ゲートウェイ(LPG) を使い分けます。

- FastConnect は 接続(Connection) と 仮想回線(Virtual circuit) を設計し、ピアリング(Peering) と クロスコネクト(Cross-connect) を運用します。
- Load Balancer は ロード・バランサー(Load balancer) と リスナー(Listener)、バックエンド・セット(Backend set) と ヘルス・チェック(Health check) をセットで管理します。
- Object Storage は バケット(Bucket) / オブジェクト(Object) を扱い、Archive Storage は アーカイブ用途に寄せます。
- Resource Manager は Terraform の スタック(Stack) と 状態(State) を管理します。DevOps は リポジトリ(Repository) と ビルド・パイプライン(Build pipeline) と デプロイ・パイプライン(Deploy pipeline) を統合します。
- Bastion は セッション(Session) と ターゲット(Target) を扱い、踏み台運用を簡素化します。

## 8. 監視・セキュリティの横串（Logpush / Sentinel / Cloud Guard）

ログは Cloudflare Logpush の ジョブ(Job) と データセット(Dataset) で外部に転送し、Azure側は Microsoft Sentinel の 分析ルール(Analytics rule) と インシデント(Incident) で運用します。  
OCI側は Cloud Guard の 検出器(Detector) と レスポンダ(Responder) を整備し、問題(Problem) を早期に潰します。

- Cloudflare Analytics は ダッシュボード と フィルタ と メトリクス を見て傾向をつかみます。
- Audit Logs は 監査ログイベント と エクスポート と 保持期間 を決めて、追跡可能性を担保します。
- API Tokens は 権限(Permissions) と リソーススコープ を整理し、ローテーション で漏えい耐性を上げます。

## 9. ゼロトラスト（Access / Gateway / Tunnel / WARP）

Zero Trust Access は アプリケーション(Application) と アクセスポリシー(Policy) を中心に、セッション(Session) と IdP 連携を確認します。  
Zero Trust Gateway(SWG) は DNSポリシー と HTTPポリシー を分けて考え、DLP と RBI 連携の範囲を決めます。

- Cloudflare Tunnel は トンネル(Tunnel) と コネクタ(cloudflared) を用意し、Public hostnameルート と サービス(https://localhostなど) を紐付けます。
- WARP は デバイスプロファイル(Device profile) と 分割トンネル(Split tunnels) を設計し、モード(Mode) を段階的に強めます。
- Magic WAN は サイト と トンネル(IPsec/GRE) を管理し、ルーティング と 接続状態 を監視します。
- Magic Firewall は 送信元/宛先 と ポート と プロトコル と アクション を定義します。

## 10. まとめ（Hover の見どころ）

このサンプルでは、単語単体（例: コンパートメント、PIM、TTL）と、複合語（例: VPCエンドポイント、オリジンリクエストポリシー、イベントソースマッピング）の両方が混ざっています。  
また、別名（例: NIC / VNIC、LB）や、英語表記（例: Policy / Rule / Workspace / Dataset）も含めています。Hover で **別名** や **類義語** も表示されるか確認してください。


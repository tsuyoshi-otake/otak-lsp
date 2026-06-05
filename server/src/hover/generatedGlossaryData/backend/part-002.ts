// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// カテゴリ: backend (2/2)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryEntry } from '../../glossaryTypes';

export const GLOSSARY_ENTRIES_PART_002: ReadonlyArray<GlossaryEntry> = [
  { term: 'RESTfulリソース設計', aliases: ['restfulリソース設計', 'resource-oriented design', 'restful resource'], description: 'REST APIでURLをリソース（名詞）中心に設計する手法。/users/{id}/postsのような階層構造でリソースを表現し、操作はHTTPメソッドで区別する。動詞をURLに含めないことが基本原則。' },
  { term: 'APIバックプレッシャー', aliases: ['apiバックプレッシャー', 'backpressure', 'api backpressure'], description: '消費者の処理能力を超えるデータをプロデューサーが送り続けないようにする流量制御の仕組み。gRPCのストリーミングやReactive Streamsに組み込まれており、システム全体の安定性を保つ。' },
  { term: 'トークンイントロスペクション', aliases: ['token introspection', 'rfc 7662'], description: 'OAuth 2.0のアクセストークンが有効かどうかを認可サーバーに問い合わせるプロトコル（RFC 7662）。リソースサーバーがトークンの有効期限、スコープ、主体などを動的に検証するために使用する。' },
  { term: 'gRPCリフレクション', aliases: ['grpcリフレクション', 'grpc reflection', 'grpc server reflection'], description: 'gRPCサーバーがサポートするサービスとメソッドの情報を動的に公開する機能。grpcurlなどのツールがサービス定義を事前に知らなくてもAPIを探索・呼び出しできるようにする。' },
  { term: 'API設計レビュー', aliases: ['api設計レビュー', 'api design review', 'api review board'], description: '新しいAPIの公開前に設計の一貫性、セキュリティ、使いやすさを複数の目で確認するレビュープロセス。命名規則、エラーハンドリング、後方互換性、ドキュメントの充実度などを基準に評価する。' },
  { term: 'APIプロキシ', aliases: ['apiプロキシ', 'api proxy'], description: 'クライアントとAPIサーバーの間に置かれ、リクエスト/レスポンスを中継しながら変換・認証・キャッシュ・ログなどの処理を行うコンポーネント。API GatewayやNginx、Envoyがプロキシとして機能する。' },
  { term: 'チャンクエンコーディング', aliases: ['chunked transfer encoding', 'transfer-encoding: chunked'], description: 'HTTPレスポンスのコンテンツ長が事前に不明な場合にデータを小さなチャンクに分割して順次送信するエンコーディング方式。ストリーミングレスポンスやファイルダウンロードで使われContent-Lengthが不要になる。' },
  { term: 'REST APIテスト', aliases: ['rest apiテスト', 'rest api testing', 'postman', 'httpie'], description: 'REST APIのエンドポイントに対して様々なリクエストを送り、レスポンスのステータスコード、ボディ、ヘッダーを検証するテスト活動。Postman・Insomnia・HTTPieなどのツールで手動・自動テストを実施する。' },
  { term: 'API負荷テスト', aliases: ['api負荷テスト', 'api load testing', 'k6', 'locust'], description: 'APIが高負荷条件下でも期待する性能とレート制限を正常に維持できるか検証するテスト。k6、Locust、JMeterなどのツールで大量の仮想ユーザーを模倣し、スループット・レイテンシ・エラー率を測定する。' },
  { term: 'スキーマファーストAPI設計', aliases: ['スキーマファーストapi設計', 'schema-first design', 'api-first', 'contract-first'], description: '実装前にAPIのスキーマ（OpenAPI、GraphQL SDL等）を先に定義してチーム全員が合意するアプローチ。スキーマを単一の真実の源として、サーバー・クライアント・ドキュメントを自動生成する。' },
  { term: 'API変更管理', aliases: ['api変更管理', 'api change management', 'breaking change', 'non-breaking change'], description: '既存のAPIクライアントに影響を与える破壊的変更と、影響を与えない非破壊的変更を区別してAPIを安全に進化させるための管理プロセス。後方互換性を保ちながら段階的に廃止（Deprecation）する。' },
  { term: 'GraphQL Union型', aliases: ['graphql union型', 'graphql union', 'union type'], description: 'GraphQLのスキーマで複数の型のいずれかを返せることを表現するためのUnion型。検索結果が記事・ユーザー・商品など異なる型になる場合などに使い、クライアントは__typenameで実際の型を判別する。' },
  { term: 'GraphQL Interface型', aliases: ['graphql interface型', 'graphql interface', 'interface type'], description: 'GraphQLスキーマで複数の型が共通のフィールドセットを持つことを表現するInterfaceタイプ。Nodeインターフェースが全リソースにid フィールドを保証するなど、型の共通構造を定義するために使用する。' },
  { term: 'WebSocketメッセージプロトコル', aliases: ['websocketメッセージプロトコル', 'websocket subprotocol', 'graphql-ws', 'stomp'], description: 'WebSocket接続上でやり取りするメッセージの構造と意味を規定するサブプロトコル。graphql-ws（GraphQLサブスクリプション）、STOMP（メッセージキュー）などが代表例で、Sec-WebSocket-Protocolヘッダーで合意する。' },
  { term: 'API依存性管理', aliases: ['api依存性管理', 'api dependency management', 'consumer-driven contract'], description: 'サービスが依存する外部APIのバージョンと変更を追跡・管理するための実践。消費者主導型コントラクトテスト（Pact）を使いAPI提供者と消費者の期待のずれを自動で検出する手法が有効。' },
  { term: 'APIトレーシング', aliases: ['apiトレーシング', 'api tracing', 'opentelemetry'], description: 'APIリクエストが複数のサービスをまたいで処理される様子を可視化する観測可能性の手法。OpenTelemetryやJaegerでスパンを記録しウォーターフォール表示でボトルネックを特定する。' },
  { term: 'APIファサード', aliases: ['apiファサード', 'api facade', 'facade pattern in api'], description: '複雑な内部システムやレガシーAPIの前に置き、シンプルで一貫したインターフェースをクライアントに提供するデザインパターン。複数の内部APIを集約して単一のきれいなAPIとして外部に公開する。' },
  { term: 'Retry Storm', aliases: ['retry storm', 'リトライストーム', 'thundering herd'], description: '障害回復時に多数のクライアントが同時にリトライを試みてサーバーを過負荷にする現象。指数バックオフとジッターを組み合わせることでリトライのタイミングを分散させ、スタンピード（群れ）現象を防ぐ。' },
  { term: 'APIスロットリングアルゴリズム', aliases: ['apiスロットリングアルゴリズム', 'token bucket', 'leaky bucket', 'sliding window'], description: 'APIのレート制限を実装するアルゴリズム群。トークンバケット（バーストを許容）、リーキーバケット（一定速度に平滑化）、スライディングウィンドウ（時間窓でカウント）などがあり用途に応じて選択する。' },
  { term: 'HTTPメソッドのセマンティクス', aliases: ['httpメソッドのセマンティクス', 'http methods semantics', 'get post put patch delete'], description: 'HTTPのGET（読み取り・安全・冪等）、POST（作成）、PUT（置換・冪等）、PATCH（部分更新）、DELETE（削除・冪等）の意味論的な違い。REST API設計でメソッドを正しく使い分けることでAPIの予測可能性を高める。' },
  { term: 'APIグラフQL認可', aliases: ['apiグラフql認可', 'graphql authorization', 'フィールドレベル認可'], description: 'GraphQL APIでのアクセス制御。リゾルバレベルやディレクティブ（@auth）を使いフィールドやオブジェクトごとにきめ細かい認可を実装する。スキーマレベルのミドルウェアで横断的に適用することも可能。' },
  { term: 'APIレスポンスエンベロープ', aliases: ['apiレスポンスエンベロープ', 'response envelope', 'apiラッパー', 'envelope pattern'], description: 'APIレスポンスをdataフィールドにラップし、status、message、metaなどのフィールドと組み合わせる一貫したレスポンス形式。JSON:APIなどの標準に従うかアプリ独自のエンベロープを定義するかはトレードオフがある。' },
  { term: 'JSON:API', aliases: ['json:api', 'json api specification', 'jsonapi.org'], description: 'JSON形式のREST APIレスポンス構造を標準化した仕様。リソースオブジェクト、関係、リンク、メタ情報の形式を規定し、スパースフィールドセットやインクルードによる関連リソース取得を標準化している。' },
  { term: 'API Deprecation', aliases: ['api deprecation', 'apiの非推奨化', 'sunset header', 'rfc 8594'], description: '古いAPIバージョンやエンドポイントを廃止予告する手続き。SunsetヘッダーやDeprecated: trueレスポンスで廃止日を通知し、クライアントに移行を促す。十分な移行期間の提供が重要。' },
  { term: 'WebSocket接続管理', aliases: ['websocket接続管理', 'websocket connection management'], description: 'WebSocketサーバーで多数の同時接続を効率的に管理する技術と実践。接続数のスケーリング、メモリ管理、タイムアウト処理、ロードバランサーでのスティッキーセッションや共有ストア（Redis）の活用が含まれる。' },
  { term: 'gRPCロードバランシング', aliases: ['grpcロードバランシング', 'grpc load balancing', 'クライアントサイドlb'], description: 'gRPCではHTTP/2の単一TCP接続上で多重化するためL4ロードバランサーでは不均等になりやすい。Envoy等のL7プロキシやクライアントサイドロードバランシング（サービスメッシュ）で解決する。' },
  { term: 'APIキャッシュ戦略', aliases: ['apiキャッシュ戦略', 'api caching strategy', 'cdn caching', 'http caching'], description: 'APIレスポンスのキャッシュ層とポリシーを設計する戦略。ブラウザキャッシュ、CDN（エッジキャッシュ）、アプリケーションキャッシュ（Redis等）の組み合わせと、キャッシュキーの設計・無効化戦略を含む。' },
  { term: 'イベント駆動API', aliases: ['イベント駆動api', 'event-driven api', 'asyncapi', '非同期api'], description: '従来のリクエスト/レスポンス型ではなくイベントの発行と購読で通信するAPIパターン。AsyncAPI仕様でイベントスキーマを定義し、Kafka・SNS・WebSocket等のブローカー経由でメッセージを配信する。' },
  { term: 'API応答時間', aliases: ['api応答時間'], description: 'APIに要求を送ってから応答を受け取るまでの時間です。' },
  { term: 'Network Time Protocol', aliases: ['network time protocol'], description: '機器の時刻を同期するための標準的なプロトコルです。' },
  { term: 'API仕様確認', aliases: ['api仕様確認'], description: 'APIの入出力や制約や契約内容を確認することです。' },
  { term: 'backend', description: 'サーバー側の処理、データベース管理、ビジネスロジックなどを担う開発領域です。' },
  { term: 'header', aliases: ['ヘッダー'], description: 'HTTP通信でリクエストやレスポンスに付加するメタ情報です。Content-TypeやAuthorizationなどが含まれます。' },
  { term: 'body', aliases: ['ボディ'], description: 'HTTP通信で送受信するデータ本体の部分です。JSONやフォームデータが入ります。' },
  { term: 'query parameter', aliases: ['クエリパラメータ', 'クエリ文字列'], description: 'URLの?以降に key=value 形式で付加する追加条件です。検索条件やフィルタの指定に使います。' },
  { term: 'path parameter', aliases: ['パスパラメータ'], description: 'URLのパス部分に埋め込んで渡す値です。/users/123 の123のようにリソースを特定します。' },
  { term: 'status code', aliases: ['httpステータスコード'], description: 'HTTP通信の結果を3桁の数字で表すコードです。200は成功、404は未検出、500はサーバーエラーなど。' },
  { term: 'GET', aliases: ['get'], description: 'サーバーからデータを取得するためのHTTPメソッドです。URLにアクセスするだけで実行されます。' },
  { term: 'POST', aliases: ['post'], description: 'サーバーへ新しいデータを送信・作成するためのHTTPメソッドです。リクエストボディにデータを含みます。' },
  { term: 'PUT', aliases: ['put'], description: '既存のリソース全体を置き換えて更新するHTTPメソッドです。' },
];

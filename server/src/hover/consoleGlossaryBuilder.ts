/**
 * コンソール用語ビルド関数
 * クラウドプロバイダー別のコンソール用語データからGlossaryEntryを構築
 */

import { GlossaryId } from '../../../shared/src/types';
import { GlossaryEntry, ConsoleProviderId } from './glossaryTypes';
import { normalizeKey, mergeStringArrays, parseParens, extractAcronymAliases } from './glossaryUtils';
import { AWS_CONSOLE_GLOSSARY, AZURE_CONSOLE_GLOSSARY, CLOUDFLARE_CONSOLE_GLOSSARY, OCI_CONSOLE_GLOSSARY } from './consoleGlossaryData';
import { CONSOLE_TERM_DEFINITIONS, ConsoleGlossaryDefinition } from './consoleGlossaryDefinitions';

/**
 * コンソール用語定義のインデックス（正規化キー → 定義）
 */
const CONSOLE_TERM_DEFINITION_INDEX: ReadonlyMap<string, ConsoleGlossaryDefinition> = (() => {
  const index = new Map<string, ConsoleGlossaryDefinition>();

  const register = (definition: ConsoleGlossaryDefinition, candidate: string): void => {
    const key = normalizeKey(candidate);
    if (!key) {
      return;
    }
    // 先勝ち（後から上書きしない）
    if (!index.has(key)) {
      index.set(key, definition);
    }
  };

  for (const definition of CONSOLE_TERM_DEFINITIONS) {
    register(definition, definition.term);
    for (const v of definition.aliases ?? []) {
      register(definition, v);
    }
    for (const v of definition.synonyms ?? []) {
      register(definition, v);
    }
  }

  return index;
})();

type FallbackConsoleTermDescription = Readonly<{ description: string; isGeneric: boolean }>;

/**
 * コンソール用語のフォールバック説明を生成
 */
export function fallbackConsoleTermDescription(term: string, provider: ConsoleProviderId | null): FallbackConsoleTermDescription {
  const key = normalizeKey(term);

  const contains = (needle: string): boolean => key.includes(normalizeKey(needle));
  const endsWith = (suffix: string): boolean => key.endsWith(normalizeKey(suffix));

  if (endsWith('ポリシー') || endsWith('policy')) {
    return { description: '許可/禁止や動作条件を定義するルールの集合。', isGeneric: false };
  }
  if (endsWith('ルール') || endsWith('rule')) {
    return { description: '条件とアクションを定義して挙動を制御する設定。', isGeneric: false };
  }
  if (endsWith('グループ') || endsWith('group')) {
    return { description: '関連する対象をまとめて扱うための単位。', isGeneric: false };
  }
  if (endsWith('クラスター') || endsWith('cluster')) {
    return { description: '複数ノードを1つのまとまりとして運用する単位。', isGeneric: false };
  }
  if (endsWith('ワークスペース') || endsWith('workspace')) {
    return { description: '設定・メンバー・データなどをまとめる作業単位。', isGeneric: false };
  }
  if (endsWith('プロジェクト') || endsWith('project')) {
    return { description: '設定や作業対象をまとめる論理単位。', isGeneric: false };
  }
  if (endsWith('ジョブ') || endsWith('job')) {
    return { description: '実行単位（バッチ、ビルド、学習などのまとまり）。', isGeneric: false };
  }
  if (endsWith('タスク') || endsWith('task')) {
    return { description: 'ジョブを構成する個々の処理、または実行単位。', isGeneric: false };
  }
  if (endsWith('パイプライン') || endsWith('pipeline')) {
    return { description: '処理を段階的に実行する一連の流れ。', isGeneric: false };
  }
  if (endsWith('キュー') || endsWith('queue')) {
    return { description: '非同期処理のためにメッセージやジョブを蓄える待ち行列。', isGeneric: false };
  }
  if (endsWith('トリガー') || endsWith('trigger')) {
    return { description: '処理の起動条件（イベント、スケジュール等）。', isGeneric: false };
  }
  if (contains('インスタンス') || contains('instance')) {
    return { description: 'サービス上の実体（実行単位）。文脈によりVM/DB/アプリ等を指す。', isGeneric: false };
  }
  if (contains('エンドポイント') || contains('endpoint')) {
    return { description: 'サービスや機能へ接続するための接続先（URL、DNS名、IPなど）。', isGeneric: false };
  }
  if (contains('ゲートウェイ') || contains('gateway')) {
    return { description: 'ネットワーク境界で中継・接続を行うコンポーネント。', isGeneric: false };
  }
  if (contains('リスナー') || contains('listener')) {
    return { description: '受信設定。ポート/プロトコルなどの受け口を定義する。', isGeneric: false };
  }
  if (contains('ターゲット') || contains('target')) {
    return { description: 'ルール/ルーティングの対象や転送先（宛先）を指す。', isGeneric: false };
  }
  if (contains('スナップショット') || contains('snapshot')) {
    return { description: 'ある時点の状態を保存したもの（復元や複製に利用）。', isGeneric: false };
  }
  if (contains('バックアップ') || contains('backup')) {
    return { description: '障害や誤操作に備えた復旧用コピー。', isGeneric: false };
  }
  if (contains('リカバリーポイント') || contains('recovery point')) {
    return { description: 'バックアップ/保護の復元可能な世代（復旧点）。', isGeneric: false };
  }
  if (contains('ボリューム') || contains('volume') || contains('ディスク') || contains('disk')) {
    return { description: 'ブロックストレージ（ディスク）。インスタンス等にアタッチして利用する。', isGeneric: false };
  }
  if (contains('ファイルシステム') || contains('file system') || contains('filesystem')) {
    return { description: 'ディレクトリ階層で共有/利用するファイルストレージの単位。', isGeneric: false };
  }
  if (contains('アクセスポイント') || contains('access point') || contains('accesspoint')) {
    return { description: 'アクセスの入口となる論理リソース（権限/経路/設定の単位）。', isGeneric: false };
  }
  if (contains('ログ') || contains('log')) {
    return { description: 'システムの出来事を時系列に記録したデータ。', isGeneric: false };
  }
  if (contains('メトリクス') || contains('metrics')) {
    return { description: '監視対象の数値指標（CPU、レイテンシ、エラー率など）。', isGeneric: false };
  }
  if (contains('ダッシュボード') || contains('dashboard')) {
    return { description: '指標や状況を可視化する画面。', isGeneric: false };
  }
  if (contains('アラート') || contains('alert')) {
    return { description: '異常や条件成立を知らせる通知/イベント。', isGeneric: false };
  }
  if (contains('証明書') || contains('certificate')) {
    return { description: 'TLS等で用いる証明書（公開鍵証明書）。', isGeneric: false };
  }
  if (contains('ヘルスチェック') || contains('health check')) {
    return { description: '対象の稼働状態を確認する仕組み（疎通/応答などの監視）。', isGeneric: false };
  }
  if (contains('ロードバランサ') || contains('load balancer') || contains('load balancing')) {
    return { description: '複数の転送先へリクエストを分散する仕組み（負荷分散）。', isGeneric: false };
  }
  if (contains('ディストリビューション') || contains('distribution')) {
    return { description: '配信設定の単位（CDN等で配信元/キャッシュ/ルールを束ねる）。', isGeneric: false };
  }
  if (contains('オリジン') || contains('origin')) {
    return { description: 'CDN等でコンテンツ取得元となるバックエンド（配信元）。', isGeneric: false };
  }
  if (contains('ビヘイビア') || contains('behavior') || contains('behaviour')) {
    return { description: 'パス条件などに応じた動作設定（キャッシュ/転送/ヘッダ等）。', isGeneric: false };
  }
  if (contains('シークレット') || contains('secret')) {
    return { description: 'APIキー等の機密情報。安全な保管と参照制御が重要。', isGeneric: false };
  }
  if (contains('ローテーション') || contains('rotation')) {
    return { description: 'シークレット等を定期的に更新（入れ替え）する仕組み。', isGeneric: false };
  }
  if (contains('グラント') || contains('grant')) {
    return { description: '権限の付与/委任を表す概念（暗号鍵の利用権付与など）。', isGeneric: false };
  }
  if (contains('セッション') || contains('session')) {
    return { description: '一定期間の接続/認証状態、またはその識別子。', isGeneric: false };
  }
  if (contains('キー') || contains('key')) {
    return { description: '識別子や秘密情報（暗号鍵/アクセストークン等）を指すことが多い。', isGeneric: false };
  }
  if (contains('タグ') || contains('tag')) {
    return { description: 'リソースに付与するキー/値のメタデータ（整理、課金集計、制御等）。', isGeneric: false };
  }
  if (contains('クエリ') || contains('query')) {
    return { description: 'データ検索・集計の問い合わせ（問い合わせ文）。', isGeneric: false };
  }
  if (contains('フィルタ') || contains('filter')) {
    return { description: '条件で対象を絞り込む仕組み。', isGeneric: false };
  }
  if (contains('インデックス') || contains('index')) {
    return { description: '検索を高速化するための補助データ構造、または検索対象の集合（文脈依存）。', isGeneric: false };
  }
  if (contains('マッピング') || contains('mapping')) {
    return { description: '対応関係を定義する設定（例: イベント→処理、属性→値など）。', isGeneric: false };
  }
  if (contains('定義') || contains('definition')) {
    return { description: 'ルールや仕様、構成などの定義情報（ひな形/設定）。', isGeneric: false };
  }
  if (contains('リポジトリ') || contains('repository') || contains('repo')) {
    return { description: '成果物やソース、イメージ等を保管・配布する格納庫。', isGeneric: false };
  }
  if (contains('イメージ') || contains('image')) {
    return { description: '起動元/配布用のひな形（OS/アプリ/コンテナ等）。', isGeneric: false };
  }
  if (contains('レイヤー') || contains('layer')) {
    return { description: '共通コードや依存関係を切り出して再利用する単位。', isGeneric: false };
  }
  if (contains('エイリアス') || contains('alias')) {
    return { description: '参照用の別名。実体の切り替えや互換のために使われる。', isGeneric: false };
  }
  if (contains('ステートマシン') || contains('state machine')) {
    return { description: '状態遷移で処理フローを表現する仕組み（ワークフロー）。', isGeneric: false };
  }
  if (contains('アクティビティ') || contains('activity')) {
    return { description: 'ワークフロー等を構成する作業単位（手動/外部処理の受け皿など）。', isGeneric: false };
  }
  if (contains('実行') || contains('execution') || contains('run')) {
    return { description: '処理を開始して動かした結果（実行そのもの、または実行履歴）。', isGeneric: false };
  }
  if (contains('API') || contains('api')) {
    return { description: 'システム間連携のためのインターフェースや仕様。', isGeneric: false };
  }
  if (contains('ステージ') || contains('stage')) {
    return { description: '環境/公開単位（開発・検証・本番など）や、そのための設定区分。', isGeneric: false };
  }
  if (contains('統合') || contains('integration')) {
    return { description: '外部サービス等と接続して連携するための設定。', isGeneric: false };
  }
  if (contains('使用量プラン') || contains('usage plan')) {
    return { description: 'API等の利用量（クォータ/スロットリング）を管理するプラン。', isGeneric: false };
  }
  if (contains('イベントバス') || contains('event bus')) {
    return { description: 'イベントを受け渡すためのハブ（集約ポイント）。', isGeneric: false };
  }
  if (contains('デッドレター') || contains('dead letter')) {
    return { description: '処理できなかったメッセージを退避する仕組み（DLQ）。', isGeneric: false };
  }
  if (contains('ストリーム') || contains('stream')) {
    return { description: '時系列に流れるデータ列（イベントやログなど）。', isGeneric: false };
  }
  if (contains('アドオン') || contains('add-on') || contains('addon')) {
    return { description: '既存機能に追加する拡張機能/オプション。', isGeneric: false };
  }
  if (contains('コンピュート') || contains('compute')) {
    return { description: '計算資源（CPU/メモリ等）を提供する領域/サービス。', isGeneric: false };
  }
  if (contains('テンプレート') || contains('template')) {
    return { description: '設定や構成のひな形。', isGeneric: false };
  }
  if (contains('スタック') || contains('stack')) {
    return { description: 'まとめて作成/更新/削除するリソースの集合（IaC等の管理単位）。', isGeneric: false };
  }
  if (contains('証跡') || contains('trail')) {
    return { description: '監査目的でAPI呼び出し等を記録する仕組み/記録単位。', isGeneric: false };
  }
  if (contains('履歴') || contains('history')) {
    return { description: '過去の記録（イベント、実行、変更などの履歴）。', isGeneric: false };
  }
  if (contains('レコーダー') || contains('recorder')) {
    return { description: '設定/状態を収集して記録するコンポーネント。', isGeneric: false };
  }
  if (contains('デリバリー') || contains('delivery')) {
    return { description: 'データや通知を配送（配信）するための経路/設定。', isGeneric: false };
  }
  if (contains('ボールト') || contains('vault')) {
    return { description: '保管庫/格納単位（バックアップやアーカイブ等の保管先）。', isGeneric: false };
  }
  if (contains('アーカイブ') || contains('archive')) {
    return { description: '低頻度アクセス向けの長期保管（アーカイブ）を指す。', isGeneric: false };
  }
  if (contains('ストア') || contains('store')) {
    return { description: 'データや設定を保存する格納場所（ストア）。', isGeneric: false };
  }
  if (contains('チャネル') || contains('channel')) {
    return { description: '配信/配送/通知などの経路（チャンネル）設定。', isGeneric: false };
  }
  if (contains('エージェント') || contains('agent')) {
    return { description: '処理を実行したり接続を中継したりする常駐コンポーネント。', isGeneric: false };
  }
  if (contains('ロケーション') || contains('location')) {
    return { description: '接続先/配置場所の指定単位。', isGeneric: false };
  }
  if (contains('サーバー') || contains('server')) {
    return { description: 'サービスを提供するホスト/接続先（またはその論理単位）。', isGeneric: false };
  }
  if (contains('ワークフロー') || contains('workflow')) {
    return { description: '複数ステップの処理手順を定義して実行する仕組み。', isGeneric: false };
  }
  if (contains('レプリケーション') || contains('replication')) {
    return { description: 'データを複数箇所へ複製し可用性/性能を高める仕組み。', isGeneric: false };
  }
  if (contains('組織') || contains('organization') || contains('organisation')) {
    return { description: '複数アカウントを束ねる管理単位（ガバナンス/請求/ポリシー）。', isGeneric: false };
  }
  if (contains('ou') || contains('organizational unit')) {
    return { description: '組織内の階層単位（アカウントをグルーピングして管理）。', isGeneric: false };
  }
  if (contains('アカウント') || contains('account')) {
    return { description: '利用主体の管理単位（課金/権限/リソースの境界）。', isGeneric: false };
  }
  if (contains('一時認証情報') || contains('temporary credentials')) {
    return { description: '期限付きの認証情報（短時間だけ有効なキー/トークン）。', isGeneric: false };
  }
  if (contains('acl')) {
    return { description: 'アクセス制御リスト（許可/拒否を列挙する設定）。', isGeneric: false };
  }
  if (contains('ディテクタ') || contains('detector')) {
    return { description: '検知ロジックの設定単位（不審イベント等を検出する）。', isGeneric: false };
  }
  if (contains('検出結果') || contains('finding') || contains('findings')) {
    return { description: '検知/スキャンの結果として得られる指摘事項。', isGeneric: false };
  }
  if (contains('標準') || contains('standard')) {
    return { description: '評価基準/ベストプラクティス等の標準セット。', isGeneric: false };
  }
  if (contains('パラメータ') || contains('parameter')) {
    return { description: '動作に影響する設定値（パラメータ）。', isGeneric: false };
  }
  if (contains('ドキュメント') || contains('document')) {
    return { description: '手順や定義をまとめたドキュメント（自動化手順等の定義）。', isGeneric: false };
  }
  if (contains('メンテナンス') || contains('maintenance')) {
    return { description: '保守作業（更新、パッチ適用等）に関する設定/実行単位。', isGeneric: false };
  }
  if (contains('ウィンドウ') || contains('window')) {
    return { description: '作業や適用を行う時間帯（メンテナンスウィンドウ等）。', isGeneric: false };
  }
  if (contains('パッチ') || contains('patch')) {
    return { description: 'ソフトウェアの更新差分（脆弱性修正など）。', isGeneric: false };
  }
  if (contains('ベースライン') || contains('baseline')) {
    return { description: '基準となる設定/状態（準拠判定の基準）。', isGeneric: false };
  }
  if (contains('ホスティング') || contains('hosting')) {
    return { description: 'コンテンツやアプリを公開・配信する機能（ホスティング）。', isGeneric: false };
  }
  if (contains('スコープ') || contains('scope')) {
    return { description: '適用範囲（どこまで有効か）を表す概念。', isGeneric: false };
  }
  if (contains('名前空間') || contains('namespace')) {
    return { description: '名前の衝突を避けるための区画（論理的な名前の範囲）。', isGeneric: false };
  }
  if (contains('データベース') || contains('database')) {
    return { description: 'データを永続化し検索できる基盤。', isGeneric: false };
  }
  if (contains('バケット') || contains('bucket')) {
    return { description: 'オブジェクトストレージの格納単位（コンテナ）。', isGeneric: false };
  }
  if (contains('オブジェクト') || contains('object')) {
    return { description: 'オブジェクトストレージに格納されるデータ（ファイル）とメタデータ。', isGeneric: false };
  }

  const providerHint: Record<ConsoleProviderId, string> = {
    aws: 'AWS',
    azure: 'Azure',
    oci: 'OCI',
    cloudflare: 'Cloudflare',
  };

  if (!provider) {
    return {
      description: 'コンソール用語。画面上の項目名（リソース/設定/操作など）で、意味は関連するサービス/機能によって異なる。',
      isGeneric: true,
    };
  }

  return {
    description: `${providerHint[provider]}コンソール用語。画面上の項目名（リソース/設定/操作など）で、意味は関連するサービス/機能によって異なる。`,
    isGeneric: true,
  };
}

/**
 * コンソール用語定義を解決（定義がない場合はフォールバック）
 */
export function resolveConsoleTermDefinition(term: string, provider: ConsoleProviderId): ConsoleGlossaryDefinition {
  const found = CONSOLE_TERM_DEFINITION_INDEX.get(normalizeKey(term));
  if (found) {
    return found;
  }
  const fallback = fallbackConsoleTermDescription(term, provider);
  return { term, description: fallback.description };
}

/**
 * 移動先カテゴリに応じたフォールバックカテゴリ名を取得
 */
export function movedConsoleTermFallbackCategory(destination: GlossaryId): string {
  switch (destination) {
    case 'networkHttp':
      return 'ネットワーク・HTTP';
    case 'security':
      return 'セキュリティ';
    case 'authIam':
      return '認証認可・IAM';
    case 'observabilitySre':
      return '監視・Observability・SRE';
    case 'performanceCache':
      return 'パフォーマンス・キャッシュ';
    default:
      return '一般';
  }
}

/**
 * 移動先カテゴリ用のコンソール用語定義を解決
 */
export function resolveConsoleTermDefinitionForMoved(term: string, destination: GlossaryId): ConsoleGlossaryDefinition {
  const found = CONSOLE_TERM_DEFINITION_INDEX.get(normalizeKey(term));
  if (found) {
    return found;
  }

  const fallback = fallbackConsoleTermDescription(term, null);
  if (!fallback.isGeneric) {
    return { term, description: fallback.description };
  }

  const category = movedConsoleTermFallbackCategory(destination);
  return { term, description: `${category}の用語（コンソール表記）。画面上の項目名（リソース/設定/操作など）で、意味は文脈によって異なる。` };
}

/**
 * AWSコンソール用語からGlossaryEntryを構築
 */
export function buildAwsConsoleGlossaryEntries(): GlossaryEntry[] {
  const serviceToTerms = new Map(AWS_CONSOLE_GLOSSARY.map(({ service, terms }) => [service, terms] as const));

  const entries: GlossaryEntry[] = [];
  const resourceToServices = new Map<string, Set<string>>();
  const resourceToAliases = new Map<string, Set<string>>();
  const resourceToSynonyms = new Map<string, Set<string>>();
  const resourceToDisplay = new Map<string, string>();

  for (const [service, terms] of serviceToTerms.entries()) {
    const preview = terms.slice(0, 8).join('、');
    const suffix = terms.length > 8 ? ' など。' : '。';
    entries.push({
      term: service,
      description: terms.length > 0 ? `AWSサービス。代表リソース/用語: ${preview}${suffix}` : 'AWSサービス。'
    });

    for (const rawTerm of terms) {
      const { base, parens } = parseParens(rawTerm);
      if (!base) {
        continue;
      }

      const key = normalizeKey(base);
      if (!resourceToDisplay.has(key)) {
        resourceToDisplay.set(key, base);
      }
      const services = resourceToServices.get(key) ?? new Set<string>();
      services.add(service);
      resourceToServices.set(key, services);

      const aliasSet = resourceToAliases.get(key) ?? new Set<string>();
      if (rawTerm !== base) {
        aliasSet.add(rawTerm);
      }
      resourceToAliases.set(key, aliasSet);

      if (parens) {
        const synonymSet = resourceToSynonyms.get(key) ?? new Set<string>();
        for (const synonym of extractAcronymAliases(parens)) {
          synonymSet.add(synonym);
        }
        resourceToSynonyms.set(key, synonymSet);
      }
    }
  }

  const resourceEntries: GlossaryEntry[] = [];
  for (const [termKey, services] of resourceToServices.entries()) {
    const serviceList = [...services].sort((a, b) => a.localeCompare(b, 'ja'));
    const servicePreview = serviceList.slice(0, 8).join(', ');
    const serviceSuffix = serviceList.length > 8 ? '…' : '';
    const displayTerm = resourceToDisplay.get(termKey) ?? termKey;
    const aliases = [...(resourceToAliases.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);
    const synonyms = [...(resourceToSynonyms.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);

    const def = resolveConsoleTermDefinition(displayTerm, 'aws');
    const mergedAliases = mergeStringArrays(def.aliases, aliases, displayTerm);
    const mergedSynonyms = mergeStringArrays(def.synonyms, synonyms, displayTerm);
    const mergedAntonyms = mergeStringArrays(def.antonyms, undefined, displayTerm);

    resourceEntries.push({
      term: displayTerm,
      aliases: mergedAliases,
      synonyms: mergedSynonyms,
      antonyms: mergedAntonyms,
      description: `${def.description}\n\n主な関連サービス: ${servicePreview}${serviceSuffix}。`
    });
  }

  // 先にサービス→後にリソース（見た目上の優先度）
  return [...entries, ...resourceEntries];
}

/**
 * Cloudflareコンソール用語からGlossaryEntryを構築
 */
export function buildCloudflareConsoleGlossaryEntries(): GlossaryEntry[] {
  const serviceToTerms = new Map(CLOUDFLARE_CONSOLE_GLOSSARY.map(({ service, terms }) => [service, terms] as const));

  const entries: GlossaryEntry[] = [];
  const resourceToServices = new Map<string, Set<string>>();
  const resourceToAliases = new Map<string, Set<string>>();
  const resourceToDisplay = new Map<string, string>();

  for (const [rawService, terms] of serviceToTerms.entries()) {
    const { base: service, parens } = parseParens(rawService);
    const serviceAliases: string[] = [];
    if (rawService !== service) {
      serviceAliases.push(rawService);
    }
    if (parens) {
      serviceAliases.push(...extractAcronymAliases(parens));
    }

    const preview = terms.slice(0, 8).join('、');
    const suffix = terms.length > 8 ? ' など。' : '。';
    entries.push({
      term: service,
      aliases: serviceAliases.length > 0 ? serviceAliases : undefined,
      description: terms.length > 0
        ? `Cloudflareの機能/画面。代表リソース/用語: ${preview}${suffix}`
        : 'Cloudflareの機能/画面。'
    });

    for (const rawTerm of terms) {
      const { base, parens: termParens } = parseParens(rawTerm);
      if (!base) {
        continue;
      }

      const key = normalizeKey(base);
      if (!resourceToDisplay.has(key)) {
        resourceToDisplay.set(key, base);
      }

      const services = resourceToServices.get(key) ?? new Set<string>();
      services.add(service);
      resourceToServices.set(key, services);

      const aliasSet = resourceToAliases.get(key) ?? new Set<string>();
      if (rawTerm !== base) {
        aliasSet.add(rawTerm);
      }
      if (termParens) {
        for (const alias of extractAcronymAliases(termParens)) {
          aliasSet.add(alias);
        }
      }
      resourceToAliases.set(key, aliasSet);
    }
  }

  const resourceEntries: GlossaryEntry[] = [];
  for (const [termKey, services] of resourceToServices.entries()) {
    const serviceList = [...services].sort((a, b) => a.localeCompare(b, 'ja'));
    const servicePreview = serviceList.slice(0, 8).join(', ');
    const serviceSuffix = serviceList.length > 8 ? '…' : '';
    const displayTerm = resourceToDisplay.get(termKey) ?? termKey;
    const aliases = [...(resourceToAliases.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);
    const def = resolveConsoleTermDefinition(displayTerm, 'cloudflare');

    resourceEntries.push({
      term: displayTerm,
      aliases: mergeStringArrays(def.aliases, aliases, displayTerm),
      synonyms: mergeStringArrays(def.synonyms, undefined, displayTerm),
      antonyms: mergeStringArrays(def.antonyms, undefined, displayTerm),
      description: `${def.description}\n\n主な関連機能: ${servicePreview}${serviceSuffix}。`
    });
  }

  return [...entries, ...resourceEntries];
}

/**
 * Azureコンソール用語からGlossaryEntryを構築
 */
export function buildAzureConsoleGlossaryEntries(): GlossaryEntry[] {
  const serviceToTerms = new Map(AZURE_CONSOLE_GLOSSARY.map(({ service, terms }) => [service, terms] as const));

  const entries: GlossaryEntry[] = [];
  const resourceToServices = new Map<string, Set<string>>();
  const resourceToAliases = new Map<string, Set<string>>();
  const resourceToSynonyms = new Map<string, Set<string>>();
  const resourceToDisplay = new Map<string, string>();

  for (const [rawService, terms] of serviceToTerms.entries()) {
    const { base: service, parens } = parseParens(rawService);
    const serviceAliases: string[] = [];
    const serviceSynonyms: string[] = [];
    if (rawService !== service) {
      serviceAliases.push(rawService);
    }
    if (parens) {
      serviceSynonyms.push(...extractAcronymAliases(parens));
    }

    const preview = terms.slice(0, 8).join('、');
    const suffix = terms.length > 8 ? ' など。' : '。';
    entries.push({
      term: service,
      aliases: serviceAliases.length > 0 ? serviceAliases : undefined,
      synonyms: serviceSynonyms.length > 0 ? serviceSynonyms : undefined,
      description: terms.length > 0 ? `Azureのサービス/機能。代表リソース/用語: ${preview}${suffix}` : 'Azureのサービス/機能。'
    });

    for (const rawTerm of terms) {
      const { base, parens: termParens } = parseParens(rawTerm);
      if (!base) {
        continue;
      }

      const key = normalizeKey(base);
      if (!resourceToDisplay.has(key)) {
        resourceToDisplay.set(key, base);
      }

      const services = resourceToServices.get(key) ?? new Set<string>();
      services.add(service);
      resourceToServices.set(key, services);

      const aliasSet = resourceToAliases.get(key) ?? new Set<string>();
      if (rawTerm !== base) {
        aliasSet.add(rawTerm);
      }
      resourceToAliases.set(key, aliasSet);

      if (termParens) {
        const synonymSet = resourceToSynonyms.get(key) ?? new Set<string>();
        for (const synonym of extractAcronymAliases(termParens)) {
          synonymSet.add(synonym);
        }
        resourceToSynonyms.set(key, synonymSet);
      }
    }
  }

  const resourceEntries: GlossaryEntry[] = [];
  for (const [termKey, services] of resourceToServices.entries()) {
    const serviceList = [...services].sort((a, b) => a.localeCompare(b, 'ja'));
    const servicePreview = serviceList.slice(0, 8).join(', ');
    const serviceSuffix = serviceList.length > 8 ? '…' : '';
    const displayTerm = resourceToDisplay.get(termKey) ?? termKey;
    const aliases = [...(resourceToAliases.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);
    const synonyms = [...(resourceToSynonyms.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);

    const def = resolveConsoleTermDefinition(displayTerm, 'azure');
    const mergedAliases = mergeStringArrays(def.aliases, aliases, displayTerm);
    const mergedSynonyms = mergeStringArrays(def.synonyms, synonyms, displayTerm);
    const mergedAntonyms = mergeStringArrays(def.antonyms, undefined, displayTerm);

    resourceEntries.push({
      term: displayTerm,
      aliases: mergedAliases,
      synonyms: mergedSynonyms,
      antonyms: mergedAntonyms,
      description: `${def.description}\n\n主な関連サービス: ${servicePreview}${serviceSuffix}。`
    });
  }

  return [...entries, ...resourceEntries];
}

/**
 * OCIコンソール用語からGlossaryEntryを構築
 */
export function buildOciConsoleGlossaryEntries(): GlossaryEntry[] {
  const serviceToTerms = new Map(OCI_CONSOLE_GLOSSARY.map(({ service, terms }) => [service, terms] as const));

  const entries: GlossaryEntry[] = [];
  const resourceToServices = new Map<string, Set<string>>();
  const resourceToAliases = new Map<string, Set<string>>();
  const resourceToSynonyms = new Map<string, Set<string>>();
  const resourceToDisplay = new Map<string, string>();

  for (const [rawService, terms] of serviceToTerms.entries()) {
    const { base: service, parens } = parseParens(rawService);
    const serviceAliases: string[] = [];
    const serviceSynonyms: string[] = [];
    if (rawService !== service) {
      serviceAliases.push(rawService);
    }
    if (parens) {
      serviceSynonyms.push(...extractAcronymAliases(parens));
    }

    const preview = terms.slice(0, 8).join('、');
    const suffix = terms.length > 8 ? ' など。' : '。';
    entries.push({
      term: service,
      aliases: serviceAliases.length > 0 ? serviceAliases : undefined,
      synonyms: serviceSynonyms.length > 0 ? serviceSynonyms : undefined,
      description: terms.length > 0 ? `OCIのサービス/機能。代表リソース/用語: ${preview}${suffix}` : 'OCIのサービス/機能。'
    });

    for (const rawTerm of terms) {
      const { base, parens: termParens } = parseParens(rawTerm);
      if (!base) {
        continue;
      }

      const key = normalizeKey(base);
      if (!resourceToDisplay.has(key)) {
        resourceToDisplay.set(key, base);
      }

      const services = resourceToServices.get(key) ?? new Set<string>();
      services.add(service);
      resourceToServices.set(key, services);

      const aliasSet = resourceToAliases.get(key) ?? new Set<string>();
      if (rawTerm !== base) {
        aliasSet.add(rawTerm);
      }
      resourceToAliases.set(key, aliasSet);

      if (termParens) {
        const synonymSet = resourceToSynonyms.get(key) ?? new Set<string>();
        for (const synonym of extractAcronymAliases(termParens)) {
          synonymSet.add(synonym);
        }
        resourceToSynonyms.set(key, synonymSet);
      }
    }
  }

  const resourceEntries: GlossaryEntry[] = [];
  for (const [termKey, services] of resourceToServices.entries()) {
    const serviceList = [...services].sort((a, b) => a.localeCompare(b, 'ja'));
    const servicePreview = serviceList.slice(0, 8).join(', ');
    const serviceSuffix = serviceList.length > 8 ? '…' : '';
    const displayTerm = resourceToDisplay.get(termKey) ?? termKey;
    const aliases = [...(resourceToAliases.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);
    const synonyms = [...(resourceToSynonyms.get(termKey) ?? new Set<string>())].filter((v) => normalizeKey(v) !== termKey);

    const def = resolveConsoleTermDefinition(displayTerm, 'oci');
    const mergedAliases = mergeStringArrays(def.aliases, aliases, displayTerm);
    const mergedSynonyms = mergeStringArrays(def.synonyms, synonyms, displayTerm);
    const mergedAntonyms = mergeStringArrays(def.antonyms, undefined, displayTerm);

    resourceEntries.push({
      term: displayTerm,
      aliases: mergedAliases,
      synonyms: mergedSynonyms,
      antonyms: mergedAntonyms,
      description: `${def.description}\n\n主な関連サービス: ${servicePreview}${serviceSuffix}。`
    });
  }

  return [...entries, ...resourceEntries];
}

/**
 * Cloudflareコンソール用語の分割結果
 */
export type CloudflareConsoleGlossarySplit = {
  cloudflare: ReadonlyArray<GlossaryEntry>;
  moved: Partial<Record<GlossaryId, ReadonlyArray<GlossaryEntry>>>;
};

/**
 * Cloudflareコンソール用語を分割（一部を他カテゴリへ移動）
 */
export function splitCloudflareConsoleGlossaryEntries(): CloudflareConsoleGlossarySplit {
  const serviceToTerms = new Map(CLOUDFLARE_CONSOLE_GLOSSARY.map(({ service, terms }) => [service, terms] as const));

  const keepServiceInCloudflare = (serviceKey: string): boolean => {
    void serviceKey;
    return true;
  };

  const serviceBucket: GlossaryEntry[] = [];
  const cloudflareResourceBucket = new Map<string, GlossaryEntry>();
  const moved: Partial<Record<GlossaryId, GlossaryEntry[]>> = {};

  const pushMoved = (id: GlossaryId, entry: GlossaryEntry): void => {
    const bucket = (moved[id] ??= []);
    bucket.push(entry);
  };

  const destinationForResource = (serviceKey: string, termKey: string, display: string, termParens: string | null): GlossaryId | null => {
    const neverMove = new Set<string>([
      'ルール',
      '設定',
      'フィルタ',
      'アクション',
      'ポリシー',
      'セッション',
      'アプリケーション',
      'ユーザー',
      'グループ',
      'ログ',
      'クエリ',
      'キー',
      '値',
      'インデックス',
      'ドメイン',
      'バケット',
      'データベース',
      'スキーマ',
      'モデル',
    ].map((v) => normalizeKey(v)));

    if (neverMove.has(termKey)) {
      return null;
    }

    // Cloudflare固有（またはCloudflare固有に近い）
    const cloudflareSpecific = new Set<string>([
      'オレンジクラウド',
      'workers.dev',
      'sitekey',
      'secret key',
      'cloudflared',
      'turnstile',
      'r2',
      'd1',
      'vectorize',
      'durable object',
    ].map((v) => normalizeKey(v)));
    if (cloudflareSpecific.has(termKey)) {
      return null;
    }
    if (termParens && cloudflareSpecific.has(normalizeKey(termParens))) {
      return null;
    }

    // DNS/HTTP/TLS
    if (
      serviceKey.includes('dns') ||
      termKey.includes('dns') ||
      new Set<string>([
        'zone',
        'internal zone',
        'reference zone',
        'record',
        'dnsレコード',
        'レコード',
        'レコードタイプ',
        'ttl',
        'a',
        'aaaa',
        'cname',
        'mx',
        'txt',
        'doh',
        'ネームサーバー',
      ].map((v) => normalizeKey(v))).has(termKey)
    ) {
      return 'networkHttp';
    }

    if (
      serviceKey.includes('ssl') ||
      serviceKey.includes('tls') ||
      termKey.includes('tls') ||
      termKey.includes('mtls') ||
      termKey.includes('certificate') ||
      termKey.includes('証明書') ||
      termKey === normalizeKey('ca')
    ) {
      return 'networkHttp';
    }

    // キャッシュ
    if (
      serviceKey.includes('cache') ||
      termKey.includes('cache') ||
      termKey.includes('キャッシュ') ||
      termKey.includes('purge')
    ) {
      return 'performanceCache';
    }

    // セキュリティ
    if (
      serviceKey.includes('waf') ||
      serviceKey.includes('firewall') ||
      serviceKey.includes('ddos') ||
      serviceKey.includes('bot') ||
      serviceKey.includes('dlp') ||
      serviceKey.includes('casb') ||
      serviceKey.includes('rbi') ||
      termKey.includes('waf') ||
      termKey.includes('ddos') ||
      termKey.includes('bot') ||
      termKey.includes('レート') ||
      termKey.includes('rate limiting') ||
      termKey.includes('mitigation') ||
      termKey.includes('phishing') ||
      termKey.includes('malware')
    ) {
      return 'security';
    }

    // 認証認可
    if (
      serviceKey.includes('zero trust') ||
      serviceKey.includes('access') ||
      serviceKey.includes('gateway') ||
      serviceKey.includes('ztna') ||
      termKey.includes('idp') ||
      termKey.includes('otp') ||
      termKey.includes('token') ||
      termKey.includes('service token') ||
      termKey.includes('client secret') ||
      termKey.includes('client id')
    ) {
      return 'authIam';
    }

    // 監視/トレーシング/分析
    if (
      serviceKey.includes('analytics') ||
      serviceKey.includes('tracing') ||
      serviceKey.includes('audit') ||
      termKey.includes('request') ||
      termKey.includes('trace') ||
      termKey.includes('dashboard') ||
      termKey.includes('メトリクス') ||
      termKey.includes('監査') ||
      termKey.includes('監査ログ')
    ) {
      return 'observabilitySre';
    }

    // ここまでで移動対象にならない場合はCloudflareに残す
    void display;
    return null;
  };

  const mergeEntry = (bucket: Map<string, GlossaryEntry>, entry: GlossaryEntry): void => {
    const key = normalizeKey(entry.term);
    if (!key) {
      return;
    }
    const existing = bucket.get(key);
    if (!existing) {
      bucket.set(key, entry);
      return;
    }
    bucket.set(key, {
      ...existing,
      description: existing.description || entry.description,
      aliases: mergeStringArrays(existing.aliases, entry.aliases, existing.term),
      synonyms: mergeStringArrays(existing.synonyms, entry.synonyms, existing.term),
      antonyms: mergeStringArrays(existing.antonyms, entry.antonyms, existing.term),
    });
  };

  for (const [rawService, terms] of serviceToTerms.entries()) {
    const { base: service, parens } = parseParens(rawService);
    const serviceKey = normalizeKey(service);

    if (keepServiceInCloudflare(serviceKey)) {
      const serviceAliases: string[] = [];
      const serviceSynonyms: string[] = [];
      if (rawService !== service) {
        serviceAliases.push(rawService);
      }
      if (parens) {
        serviceSynonyms.push(...extractAcronymAliases(parens));
      }

      const preview = terms.slice(0, 8).join('、');
      const suffix = terms.length > 8 ? ' など。' : '。';
      serviceBucket.push({
        term: `Cloudflare ${service}`,
        aliases: serviceAliases.length > 0 ? serviceAliases : undefined,
        synonyms: serviceSynonyms.length > 0 ? serviceSynonyms : undefined,
        description: terms.length > 0
          ? `Cloudflareの機能/画面。代表リソース/用語: ${preview}${suffix}`
          : 'Cloudflareの機能/画面。'
      });
    }

    for (const rawTerm of terms) {
      const { base, parens: termParens } = parseParens(rawTerm);
      if (!base) {
        continue;
      }

      const termKey = normalizeKey(base);
      const aliases: string[] = [];
      const synonyms: string[] = [];
      if (rawTerm !== base) {
        aliases.push(rawTerm);
      }
      if (termParens) {
        synonyms.push(...extractAcronymAliases(termParens));
      }

      const relatedServices = new Set<string>([service]);
      const dest = destinationForResource(serviceKey, termKey, base, termParens);
      const def = dest ? resolveConsoleTermDefinitionForMoved(base, dest) : resolveConsoleTermDefinition(base, 'cloudflare');
      const description = dest ? def.description : `${def.description}\n\n関連機能: ${[...relatedServices].join(', ')}。`;
      const entry: GlossaryEntry = {
        term: base,
        aliases: mergeStringArrays(def.aliases, aliases, base),
        synonyms: mergeStringArrays(def.synonyms, synonyms, base),
        antonyms: mergeStringArrays(def.antonyms, undefined, base),
        description
      };

      if (dest) {
        pushMoved(dest, entry);
      } else {
        mergeEntry(cloudflareResourceBucket, entry);
      }
    }
  }

  const cloudflareResources = [...cloudflareResourceBucket.values()];
  const cloudflare = [...serviceBucket, ...cloudflareResources];

  return {
    cloudflare,
    moved,
  };
}

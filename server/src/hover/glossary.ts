/**
 * 用語図鑑（オフライン）
 * HoverのWikipediaサマリーの下に表示するための簡易辞書
 */

import { GlossaryId, Token } from '../../../shared/src/types';
import { TERM_NOTATION_DICTIONARIES, TermNotationDictionaryId } from '../dictionaries/termNotationDictionary';
import { AWS_CONSOLE_GLOSSARY, AZURE_CONSOLE_GLOSSARY, CLOUDFLARE_CONSOLE_GLOSSARY, OCI_CONSOLE_GLOSSARY } from './consoleGlossaryData';
import { CONSOLE_TERM_DEFINITIONS, ConsoleGlossaryDefinition } from './consoleGlossaryDefinitions';
import { GIT_GLOSSARY } from './gitGlossary';
import { NPM_GLOSSARY } from './npmGlossary';
import { YARN_GLOSSARY } from './yarnGlossary';
import { PNPM_GLOSSARY } from './pnpmGlossary';
import { PIP_GLOSSARY } from './pipGlossary';
import { DOCKER_GLOSSARY } from './dockerGlossary';
import { LINUX_GLOSSARY } from './linuxGlossary';
import { WINDOWS_GLOSSARY } from './windowsGlossary';
import { POWERSHELL_GLOSSARY } from './powershellGlossary';

const PHRASE_REGEX = /[A-Za-z][A-Za-z0-9.+#/_:-]*(?:\s+[A-Za-z][A-Za-z0-9.+#/_:-]*){0,5}/g;
const WORD_REGEX = /[A-Za-z0-9.+#/_:-]+/g;
const ASCII_TERM_CHAR_RE = /[A-Za-z0-9.+#/_:-]/;
const CJK_TERM_CHAR_RE = /[ぁ-ゔァ-ヶー一-\u9FAF々・]/;
const MIXED_ASCII_TERM_CHAR_RE = /[A-Za-z0-9.+#/_:@-]/;
const MIXED_CJK_TERM_CHAR_RE = /[\p{Script=Katakana}\p{Script=Han}々ー・]/u;

export interface GlossaryHit {
  id: GlossaryId;
  title: string;
  term: string;
  description: string;
  aliases?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface GlossaryMatch {
  hit: GlossaryHit;
  range: {
    start: number;
    end: number;
  };
}

interface GlossaryEntry {
  term: string;
  aliases?: string[];
  synonyms?: string[];
  antonyms?: string[];
  description: string;
}

interface GlossaryDefinition {
  id: GlossaryId;
  title: string;
  entries: ReadonlyArray<GlossaryEntry>;
}

type ConsoleProviderId = 'aws' | 'azure' | 'oci' | 'cloudflare';

function normalizeWhitespace(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

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

function fallbackConsoleTermDescription(term: string, provider: ConsoleProviderId | null): FallbackConsoleTermDescription {
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

function resolveConsoleTermDefinition(term: string, provider: ConsoleProviderId): ConsoleGlossaryDefinition {
  const found = CONSOLE_TERM_DEFINITION_INDEX.get(normalizeKey(term));
  if (found) {
    return found;
  }
  const fallback = fallbackConsoleTermDescription(term, provider);
  return { term, description: fallback.description };
}

function movedConsoleTermFallbackCategory(destination: GlossaryId): string {
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

function resolveConsoleTermDefinitionForMoved(term: string, destination: GlossaryId): ConsoleGlossaryDefinition {
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

function mergeStringArrays(
  base: ReadonlyArray<string> | undefined,
  extra: ReadonlyArray<string> | undefined,
  term: string
): string[] | undefined {
  const a = base ?? [];
  const b = extra ?? [];
  if (a.length === 0 && b.length === 0) {
    return undefined;
  }

  const termKey = normalizeKey(term);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const v of [...a, ...b]) {
    const normalized = normalizeKey(v);
    if (!normalized || normalized === termKey || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(v);
  }

  return merged.length > 0 ? merged : undefined;
}

function mergeGlossaryEntries(existing: ReadonlyArray<GlossaryEntry>, additions: ReadonlyArray<GlossaryEntry>): GlossaryEntry[] {
  const byKey = new Map<string, GlossaryEntry>();
  const order: string[] = [];

  const put = (entry: GlossaryEntry): void => {
    const key = normalizeKey(entry.term);
    if (!key) {
      return;
    }

    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...entry });
      order.push(key);
      return;
    }

    byKey.set(key, {
      ...current,
      description: current.description || entry.description,
      aliases: mergeStringArrays(current.aliases, entry.aliases, current.term),
      synonyms: mergeStringArrays(current.synonyms, entry.synonyms, current.term),
      antonyms: mergeStringArrays(current.antonyms, entry.antonyms, current.term),
    });
  };

  existing.forEach(put);
  additions.forEach(put);

  return order.map((k) => byKey.get(k)!).filter(Boolean);
}

function parseParens(value: string): { base: string; parens: string | null } {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(/^(.*?)[(（]([^）)]+)[)）]\s*$/);
  if (!match) {
    return { base: normalized, parens: null };
  }
  return { base: match[1].trim(), parens: match[2].trim() };
}

function extractAcronymAliases(parens: string): string[] {
  const candidates = parens
    .split(/[\/,]/g)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  const aliases: string[] = [];
  for (const v of candidates) {
    if (v.length < 2) {
      continue;
    }

    // 例: ALB/NLB, REST/HTTP, AAAA, CNAME
    if (/^[A-Z0-9][A-Z0-9@._-]{1,20}$/.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: Azure AD, Network Security Group, Private Endpoint（英字/数字+スペースあり、ただし全小文字は除外）
    if (/^[A-Za-z0-9][A-Za-z0-9 @._-]{1,30}$/.test(v) && /[A-Z0-9]/.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: 旧Azure AD, 旧 AWS SSO, 日本語+英字の混在（括弧内の補足としてよく出る）
    if (/^[\p{Script=Han}\p{Script=Katakana}々ー・A-Za-z0-9 @._-]{2,30}$/u.test(v) && /[\p{Script=Han}A-Z0-9]/u.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: オレンジクラウド, スクリプト（カナ/漢字のみ）
    if (/^[\p{Script=Katakana}\p{Script=Han}々ー・]{2,20}$/u.test(v)) {
      aliases.push(v);
      continue;
    }
  }

  return aliases;
}

function buildAwsConsoleGlossaryEntries(): GlossaryEntry[] {
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

function buildCloudflareConsoleGlossaryEntries(): GlossaryEntry[] {
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

function buildAzureConsoleGlossaryEntries(): GlossaryEntry[] {
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

function buildOciConsoleGlossaryEntries(): GlossaryEntry[] {
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

type CloudflareConsoleGlossarySplit = {
  cloudflare: ReadonlyArray<GlossaryEntry>;
  moved: Partial<Record<GlossaryId, ReadonlyArray<GlossaryEntry>>>;
};

function splitCloudflareConsoleGlossaryEntries(): CloudflareConsoleGlossarySplit {
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

const CLOUDFLARE_CONSOLE_SPLIT = splitCloudflareConsoleGlossaryEntries();

const BASE_GLOSSARIES: ReadonlyArray<GlossaryDefinition> = [
  {
    id: 'it',
    title: 'IT用語図鑑',
    entries: [
      { term: 'API', synonyms: ['Application Programming Interface', 'アプリケーションプログラミングインタフェース'], description: 'ソフトウェア同士が連携するためのインターフェースや仕様。' },
      { term: 'SDK', description: '特定の環境向けに開発を支援するツール群（ライブラリ、ドキュメント等）。' },
      { term: 'OSS', aliases: ['Open Source', 'OpenSource'], description: 'ソースコードが公開され、利用・改変・再配布が許可されたソフトウェア。' },
      { term: 'CLI', description: 'コマンド（文字）で操作するインターフェース。' },
      { term: 'GUI', description: 'ボタンや画面操作で使えるインターフェース。' },
      { term: 'IDE', description: 'エディタ、ビルド、デバッグ等を統合した開発環境。' },
      { term: 'CI', synonyms: ['Continuous Integration', '継続的インテグレーション'], description: '変更を継続的に統合し、ビルド/テストで品質を確認する開発手法。' },
      { term: 'CD', description: 'テスト済み変更を継続的にリリース（デリバリー/デプロイ）する仕組み。' },
      { term: 'Git', description: '分散型バージョン管理システム。' },
      { term: 'GitHub', aliases: ['Github'], description: 'Gitリポジトリのホスティングと開発コラボレーション機能を提供するサービス。' },
      { term: 'Pull Request', aliases: ['PR', 'Merge Request', 'MR'], description: '変更をレビューし、統合するための提案。' },
      { term: 'Code Review', aliases: ['レビュー'], description: '変更内容を他者が確認し、品質や設計を改善する活動。' },
      { term: 'Lint', aliases: ['リンタ'], description: 'コーディング規約違反や潜在バグを静的に検出する仕組み。' },
      { term: 'Formatter', aliases: ['フォーマッタ'], description: 'コードの整形を自動化してスタイルを統一するツール。' },
      { term: 'Build', aliases: ['ビルド'], description: 'ソースコードを実行可能形式に変換・生成する工程。' },
      { term: 'Dependency', aliases: ['依存関係'], description: 'プログラムが利用する外部ライブラリやモジュール。' },
      { term: 'Versioning', aliases: ['バージョニング'], description: 'バージョン番号の付与と運用のルール。' },
      { term: 'SemVer', aliases: ['Semantic Versioning'], description: '互換性に基づくバージョン付与（MAJOR.MINOR.PATCH）。' },
      { term: 'Markdown', description: 'プレーンテキストで構造を表現できる軽量マークアップ言語。' },
      { term: 'LSP', aliases: ['Language Server Protocol', 'VSCode Language Server Protocol'], description: 'エディタとLanguage Server間で補完/診断/ホバー等をやり取りするための標準プロトコル。' },
      { term: 'VS Code', aliases: ['Visual Studio Code', 'VSCode'], description: 'Microsoftのコードエディタ。拡張機能で機能を追加できる。' },
      { term: 'VSIX', description: 'VS Code拡張の配布パッケージ形式。' },
      { term: 'kuromoji.js', aliases: ['kuromoji'], description: 'JavaScriptで動く日本語形態素解析ライブラリ。' },
      { term: 'MeCab', description: '日本語の形態素解析エンジン。' },
      { term: 'IPA辞書', aliases: ['IPA'], description: 'MeCab/kuromoji系でよく使われる日本語形態素解析辞書（IPA辞書）。' },
      { term: 'npm', description: 'Node.jsのパッケージマネージャ（エコシステム含む）。' },
      { term: 'npm install', aliases: ['npm i'], description: 'npmで依存パッケージをインストールするコマンド。' },
      { term: 'ts-node', description: 'TypeScriptをトランスパイルしながら直接実行するツール。' },
      { term: 'esbuild', description: '高速なJavaScript/TypeScriptバンドラ・トランスパイラ。' },
      { term: 'Jest', description: 'JavaScript/TypeScript向けのテストフレームワーク。' },
      { term: 'fast-check', aliases: ['fastcheck'], description: 'JavaScript/TypeScript向けのプロパティベーステスト（PBT）ライブラリ。' },
      { term: 'URL', synonyms: ['Uniform Resource Locator'], description: 'Web上のリソースの場所を表す文字列（https://... など）。' },
      { term: 'CPU', aliases: ['Central Processing Unit'], description: 'コンピュータの演算・制御を担う中核の処理装置。' },
      { term: 'Wikipedia', description: '自由な百科事典プロジェクト。用語の概要取得などに利用される。' },
      { term: 'vscode-languageserver', description: 'VS CodeのLanguage Server実装を支援するNode.jsライブラリ（LSPサーバ側）。' },
      { term: 'otak-lsp', aliases: ['otakLsp'], description: '本プロジェクト/拡張機能の名称（日本語文法チェック＋ホバー等を提供）。' },
      { term: 'Linux', description: 'OSカーネル/ディストリビューションの総称（サーバ/開発環境で広く使われる）。' },
      { term: 'Ubuntu', description: 'Linuxディストリビューションの一つ（Debian系）。' },
      { term: 'Windows', description: 'MicrosoftのOS。開発/運用で広く使われる。' },
      { term: 'macOS', description: 'AppleのデスクトップOS。' },
      { term: 'AtCoder', description: '日本の競技プログラミングプラットフォーム。' },
      { term: 'iOS', description: 'AppleのモバイルOS。' },
      { term: 'Android', description: 'Googleが中心となって開発するモバイルOS。' },
      { term: 'Swift', description: 'Appleプラットフォーム向けのプログラミング言語。' },
      { term: 'Kotlin', description: 'JVM上で動く言語。Android開発でもよく使われる。' },
      { term: 'Unity', description: 'ゲーム開発向けの統合開発環境/ゲームエンジン。' },
    ],
  },
  {
    id: 'otakLspSettings',
    title: 'otak-lsp設定用語図鑑',
    entries: [
      { term: 'otakLsp.enableGrammarCheck', aliases: ['enableGrammarCheck', '.enableGrammarCheck'], description: '文法チェック機能の有効/無効。' },
      { term: 'otakLsp.enableSemanticHighlight', aliases: ['enableSemanticHighlight', '.enableSemanticHighlight'], description: '品詞ベースのセマンティックハイライト機能の有効/無効。' },
      { term: 'otakLsp.excludeTableDelimiters', aliases: ['excludeTableDelimiters', '.excludeTableDelimiters'], description: 'Markdownテーブルの区切り記号（|---|）をハイライト対象に含めるかの設定。' },
      { term: 'otakLsp.debounceDelay', aliases: ['debounceDelay'], description: 'テキスト編集後に解析を開始するまでの遅延時間（ミリ秒）。' },
      { term: 'otakLsp.targetLanguages', aliases: ['targetLanguages'], description: '解析対象とする言語IDの一覧。' },
      { term: 'otakLsp.showStatus', aliases: ['showStatus', '.showStatus'], description: '拡張コマンド。言語サーバの状態を表示する。' },
      { term: 'otakLsp.markdown.analyzeTables', description: 'Markdownテーブル内も文法チェック対象にする設定。' },
      { term: 'otakLsp.markdown.analyzeCodeBlocks', description: 'Markdownコードブロック内も文法チェック対象にする設定。' },
      { term: 'otakLsp.hover.enableWikipedia', description: 'ホバーにWikipediaサマリーを表示する設定。' },
      { term: 'otakLsp.hover.enableGlossary', description: 'ホバーに用語図鑑（オフライン）を表示する設定。' },
      { term: 'otakLsp.hover.enabledGlossaries', description: 'ホバーで有効にする用語図鑑カテゴリ（ID）の一覧。' },
      { term: 'otakLsp.advanced.enableStyleConsistency', description: '文体の混在検出（敬体/常体）を有効にする設定。' },
      { term: 'otakLsp.advanced.enableRaNukiDetection', description: 'ら抜き言葉の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableDoubleNegation', description: '二重否定の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableParticleRepetition', description: '同じ助詞の連続使用検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableConjunctionRepetition', description: '同じ接続詞の連続使用検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableAdversativeGa', description: '逆接「が」の連続使用検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableAlphabetWidth', description: '全角/半角アルファベット混在検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableWeakExpression', description: '弱い表現の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableCommaCount', description: '読点数チェックを有効にする設定。' },
      { term: 'otakLsp.advanced.enableTermNotation', description: '技術用語表記統一チェックを有効にする設定。' },
      { term: 'otakLsp.advanced.enableKanjiOpening', description: '漢字開き（送り仮名/表記）チェックを有効にする設定。' },
      { term: 'otakLsp.advanced.enableRedundantExpression', description: '冗長表現の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableTautology', description: '重複表現（同語反復）の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableNoParticleChain', description: '助詞「の」連続の検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableMonotonousEnding', description: '文末表現の単調さ検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableLongSentence', description: '長文検出を有効にする設定。' },
      { term: 'otakLsp.advanced.enableSentenceEndingColon', description: '文末コロンを検出する設定。' },
      { term: 'otakLsp.advanced.enableWebTechDictionary', description: 'ウェブ技術用語辞典を有効にする設定。' },
      { term: 'otakLsp.advanced.enableGenerativeAIDictionary', description: '生成AI関連用語辞典を有効にする設定。' },
      { term: 'otakLsp.advanced.enableAWSDictionary', description: 'AWS関連用語辞典を有効にする設定。' },
      { term: 'otakLsp.advanced.enableAzureDictionary', description: 'Azure関連用語辞典を有効にする設定。' },
      { term: 'otakLsp.advanced.enableOCIDictionary', description: 'OCI関連用語辞典を有効にする設定。' },
      { term: 'otakLsp.advanced.commaCountThreshold', description: '読点数チェックの警告閾値。' },
      { term: 'otakLsp.advanced.weakExpressionLevel', description: '弱い表現の検出レベル（strict/normal/loose）。' },
      { term: 'otakLsp.advanced.noParticleChainThreshold', description: '助詞「の」連続と判定する閾値。' },
      { term: 'otakLsp.advanced.monotonousEndingThreshold', description: '文末表現の単調さと判定する閾値。' },
      { term: 'otakLsp.advanced.longSentenceThreshold', description: '長文と判定する文字数の閾値。' },
      { term: 'Style Consistency', aliases: ['文体混在'], description: '敬体/常体など文体が混在していないかを検出するルール。' },
      { term: 'Ra-nuki Detection', aliases: ['ら抜き言葉', 'ら抜き'], description: '「食べれる」などのら抜き言葉を検出するルール。' },
      { term: 'Conjunction Repetition', aliases: ['接続詞連続'], description: '同じ接続詞の連続使用（例: 「そして、そして」）を検出するルール。' },
      { term: 'Adversative Ga', aliases: ['逆接が連続', '逆接「が」連続'], description: '逆接の「が」の連続使用（例: 「…だが、…だが」）を検出するルール。' },
    ],
  },
  {
    id: 'cloud',
    title: 'クラウド用語図鑑',
    entries: [
      { term: 'AWS', aliases: ['Amazon Web Services'], description: 'Amazonが提供するクラウドサービス群。' },
      { term: 'Azure', aliases: ['Microsoft Azure'], description: 'Microsoftが提供するクラウドサービス群。' },
      { term: 'GCP', aliases: ['Google Cloud', 'Google Cloud Platform'], description: 'Googleが提供するクラウドサービス群。' },
      { term: 'Firebase', description: 'Googleが提供するBaaS（認証、DB、ホスティング等の統合サービス）。' },
      { term: 'OCI', aliases: ['Oracle Cloud Infrastructure'], description: 'Oracleが提供するクラウドサービス群。' },
      { term: 'IAM', description: 'ユーザーや権限（アクセス制御）を管理する仕組み。' },
      { term: 'VPC', description: 'クラウド上に作る論理的に分離された仮想ネットワーク。' },
      { term: 'S3', description: 'AWSのオブジェクトストレージ。' },
      { term: 'Kubernetes', aliases: ['k8s'], description: 'コンテナのデプロイやスケール等を自動化するオーケストレーション基盤。' },
      { term: 'Terraform', description: 'Infrastructure as Code（IaC）を行うためのツール。' },
      { term: 'IaC', aliases: ['Infrastructure as Code'], description: 'インフラ構成をコードとして管理・再現可能にする考え方。' },
      { term: 'Region', aliases: ['リージョン'], description: 'データセンターの地理的な区分。' },
      { term: 'AZ', aliases: ['Availability Zone'], description: 'リージョン内の独立した障害分離単位。' },
      { term: 'Load Balancer', aliases: ['LB', 'ロードバランサ'], description: '複数のサーバへリクエストを分散する仕組み。' },
      { term: 'Auto Scaling', aliases: ['オートスケール'], description: '負荷に応じて台数を自動増減する仕組み。' },
      { term: 'Serverless', aliases: ['サーバレス'], synonyms: ['FaaS'], antonyms: ['Serverful', 'サーバフル'], description: 'サーバ管理を意識せずにコード実行できる実行モデル。' },
      { term: 'KMS', aliases: ['Key Management Service'], description: '暗号鍵の生成・保管・利用を管理するサービス。' },
      { term: 'CDN', description: 'コンテンツをエッジに配信してレイテンシを下げる仕組み。' },
      { term: 'WAF', description: 'Webアプリへの攻撃を検知・遮断する防御機構。' },
      { term: 'Secret Manager', aliases: ['Secrets Manager', 'シークレット管理'], description: 'APIキー等の機密情報を安全に保管・配布する仕組み。' },
    ],
  },
  {
    id: 'awsServices',
    title: 'AWSサービス用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'EC2', description: '仮想マシンを提供するコンピュートサービス（Elastic Compute Cloud）。' },
      { term: 'Lambda', description: 'イベント駆動でコードを実行するサーバレス実行環境。' },
      { term: 'RDS', description: 'マネージドなリレーショナルデータベースサービス。' },
      { term: 'Aurora', description: 'AWSのマネージドRDB（MySQL/PostgreSQL互換）。' },
      { term: 'DynamoDB', description: 'マネージドなNoSQL（Key-Value/Document）データベース。' },
      { term: 'SQS', description: 'マネージドなメッセージキュー（Simple Queue Service）。' },
      { term: 'SNS', description: 'マネージドな通知/パブサブ（Simple Notification Service）。' },
      { term: 'EventBridge', description: 'イベントバスによるイベント連携サービス。' },
      { term: 'Step Functions', description: 'ワークフロー（ステートマシン）を定義して実行するサービス。' },
      { term: 'ECS', description: 'AWSのコンテナオーケストレーション（Elastic Container Service）。' },
      { term: 'EKS', description: 'AWSのマネージドKubernetes（Elastic Kubernetes Service）。' },
      { term: 'Fargate', description: 'サーバ管理なしでコンテナを実行するコンピュート基盤。' },
      { term: 'ECR', description: 'コンテナイメージレジストリ（Elastic Container Registry）。' },
      { term: 'Elastic Beanstalk', description: 'アプリを簡単にデプロイ/運用するPaaS的サービス。' },
      { term: 'App Runner', description: 'コンテナ/ソースからWebサービスを簡単にデプロイするサービス。' },
      { term: 'API Gateway', description: 'APIの入口（認証/ルーティング/制限）を提供するサービス。' },
      { term: 'CloudFront', description: 'CDNサービス。エッジ配信で遅延を下げる。' },
      { term: 'Route 53', description: 'DNS/ドメイン管理サービス。' },
      { term: 'Cognito', description: 'ユーザー認証（ID管理）を提供するサービス。' },
      { term: 'CloudFormation', description: 'インフラをテンプレートで管理するIaCサービス。' },
      { term: 'Systems Manager', aliases: ['SSM'], description: 'サーバ管理（パラメータ、パッチ、実行、接続等）を統合するサービス。' },
      { term: 'Kinesis', description: 'ストリーミングデータの取り込み/処理基盤。' },
      { term: 'Athena', description: 'S3上のデータをSQLでクエリするサーバレス分析サービス。' },
      { term: 'Glue', description: 'ETLとデータカタログのマネージドサービス。' },
      { term: 'EMR', description: 'Hadoop/Spark等のビッグデータ基盤を提供するサービス。' },
      { term: 'Redshift', description: 'データウェアハウス（DWH）サービス。' },
      { term: 'ElastiCache', description: 'Redis/Memcachedのマネージドキャッシュ。' },
      { term: 'OpenSearch Service', description: '検索/ログ分析（OpenSearch）のマネージドサービス。' },
      { term: 'GuardDuty', description: '脅威検知（不審な振る舞い検出）のサービス。' },
      { term: 'Security Hub', description: 'セキュリティ状況の集約と可視化を行うサービス。' },
    ], buildAwsConsoleGlossaryEntries()),
  },
  {
    id: 'azureServices',
    title: 'Azureサービス用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'Azure Virtual Machines', aliases: ['Azure VM'], description: '仮想マシンを提供するコンピュートサービス。' },
      { term: 'Azure App Service', aliases: ['App Service'], description: 'Webアプリ/APIのマネージド実行基盤。' },
      { term: 'Azure Functions', aliases: ['Functions'], description: 'イベント駆動でコードを実行するサーバレス基盤。' },
      { term: 'AKS', aliases: ['Azure Kubernetes Service'], description: 'AzureのマネージドKubernetes。' },
      { term: 'Azure Container Apps', aliases: ['Container Apps'], description: 'コンテナアプリをマネージドに実行する基盤。' },
      { term: 'Azure Container Instances', aliases: ['ACI'], description: '単発/簡易にコンテナを実行するサービス。' },
      { term: 'Azure SQL Database', description: 'マネージドなSQLデータベース（PaaS）。' },
      { term: 'Azure SQL Managed Instance', description: 'SQL Server互換性を高めたマネージドDB。' },
      { term: 'Azure Cosmos DB', aliases: ['Cosmos DB'], description: 'グローバル分散対応のマネージドNoSQLデータベース。' },
      { term: 'Azure Storage Account', aliases: ['Storage Account'], description: 'Blob/Queue/Table/File等のストレージを束ねるリソース。' },
      { term: 'Azure Blob Storage', aliases: ['Blob Storage'], description: 'オブジェクトストレージ。' },
      { term: 'Azure Service Bus', aliases: ['Service Bus'], description: 'メッセージング（キュー/トピック）サービス。' },
      { term: 'Azure Event Grid', aliases: ['Event Grid'], description: 'イベント配信（パブサブ）サービス。' },
      { term: 'Azure Event Hubs', aliases: ['Event Hubs'], description: '大規模イベント取り込み（ストリーム）サービス。' },
      { term: 'Azure API Management', aliases: ['API Management', 'APIM'], description: 'APIの公開/管理/制御（認証・制限・ポリシー）を行う。' },
      { term: 'Azure Application Gateway', aliases: ['Application Gateway'], description: 'L7ロードバランサ（WAF統合も可能）。' },
      { term: 'Azure Front Door', aliases: ['Front Door'], description: 'グローバル負荷分散とエッジ配信を提供するサービス。' },
      { term: 'Azure Load Balancer', description: 'L4ロードバランサ。' },
      { term: 'Azure Virtual Network', aliases: ['VNet'], description: 'Azureの仮想ネットワーク。' },
      { term: 'Azure Monitor', aliases: ['Monitor'], description: '監視（メトリクス/ログ/アラート）基盤。' },
      { term: 'Log Analytics', description: 'ログの収集/クエリ（KQL）を行うワークスペース。' },
      { term: 'Microsoft Sentinel', aliases: ['Sentinel'], description: 'SIEM/SOARのセキュリティ分析基盤。' },
      { term: 'Microsoft Entra ID', aliases: ['Entra ID', 'Azure AD'], description: 'ID管理と認証のディレクトリサービス。' },
      { term: 'Azure Key Vault', aliases: ['Key Vault'], description: '鍵/シークレット/証明書を安全に保管・利用する。' },
      { term: 'Azure DevOps', description: 'リポジトリ、Boards、Pipelines等を統合する開発基盤。' },
      { term: 'Azure Static Web Apps', aliases: ['Static Web Apps'], description: '静的サイト+APIを簡単にホスティングするサービス。' },
      { term: 'Azure Data Factory', aliases: ['Data Factory'], description: 'データ連携（ETL/ELT）パイプラインのサービス。' },
      { term: 'Azure Synapse Analytics', aliases: ['Synapse'], description: 'DWH/分析基盤（SQL/Spark等）を統合するサービス。' },
      { term: 'Azure Cache for Redis', aliases: ['Azure Redis', 'Redis Cache'], description: 'Redisのマネージドキャッシュ。' },
      { term: 'Azure AI Services', aliases: ['Cognitive Services'], description: '画像/音声/言語などのAI APIを提供するサービス群。' },
    ], buildAzureConsoleGlossaryEntries()),
  },
  {
    id: 'gcpServices',
    title: 'GCPサービス用語図鑑',
    entries: [
      { term: 'Compute Engine', description: '仮想マシン（IaaS）サービス。' },
      { term: 'App Engine', description: 'アプリをマネージドに実行するPaaS。' },
      { term: 'Cloud Run', description: 'コンテナをサーバレスに実行する基盤。' },
      { term: 'Cloud Functions', description: 'イベント駆動で関数を実行するサーバレス基盤。' },
      { term: 'GKE', aliases: ['Google Kubernetes Engine'], description: 'GoogleのマネージドKubernetes。' },
      { term: 'Cloud Storage', description: 'オブジェクトストレージ。' },
      { term: 'Cloud SQL', description: 'マネージドRDB（MySQL/PostgreSQL/SQL Server）。' },
      { term: 'Cloud Spanner', description: 'グローバル分散RDB。' },
      { term: 'BigQuery', description: 'サーバレスDWH/分析基盤。' },
      { term: 'Pub/Sub', description: 'メッセージング（パブサブ）サービス。' },
      { term: 'Dataflow', aliases: ['Cloud Dataflow'], description: 'ストリーム/バッチ処理（Apache Beam）の実行基盤。' },
      { term: 'Dataproc', description: 'Spark/Hadoop等のマネージドデータ処理基盤。' },
      { term: 'Dataform', description: '分析向けSQLワークフロー（モデリング/依存管理）。' },
      { term: 'Datastream', description: 'DBの変更データキャプチャ（CDC）連携サービス。' },
      { term: 'Cloud Composer', description: 'Airflowのマネージドサービス。' },
      { term: 'Firestore', description: 'マネージドなNoSQLドキュメントDB。' },
      { term: 'Bigtable', description: 'ワイドカラムのNoSQLデータベース。' },
      { term: 'Memorystore', description: 'Redis/Memcachedのマネージドキャッシュ。' },
      { term: 'Cloud CDN', description: 'CDNサービス。' },
      { term: 'Cloud Load Balancing', description: 'グローバル負荷分散サービス。' },
      { term: 'VPC', aliases: ['Virtual Private Cloud'], description: 'GCPの仮想ネットワーク。' },
      { term: 'Cloud DNS', description: 'DNSホスティングサービス。' },
      { term: 'Cloud IAM', description: 'アクセス権限（IAM）を管理するサービス。' },
      { term: 'Cloud KMS', description: '暗号鍵を管理するサービス。' },
      { term: 'Secret Manager', description: 'シークレット（キー等）を安全に保管するサービス。' },
      { term: 'Cloud Monitoring', description: 'メトリクス監視とアラート。' },
      { term: 'Cloud Logging', description: 'ログ収集と検索。' },
      { term: 'Cloud Trace', description: '分散トレースの収集・可視化。' },
      { term: 'Artifact Registry', description: 'コンテナ/パッケージのレジストリ。' },
      { term: 'Cloud Build', description: 'ビルド/CIのマネージドサービス。' },
    ],
  },
  {
    id: 'ociServices',
    title: 'OCIサービス用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'OCI Compute', aliases: ['Compute'], description: '仮想マシン/ベアメタル等のコンピュートサービス。' },
      { term: 'VCN', aliases: ['Virtual Cloud Network'], description: 'OCIの仮想ネットワーク。' },
      { term: 'OCI Object Storage', aliases: ['Object Storage'], description: 'オブジェクトストレージ。' },
      { term: 'OCI Block Volume', aliases: ['Block Volume'], description: 'ブロックストレージ（ディスク）。' },
      { term: 'OCI File Storage', aliases: ['File Storage'], description: '共有ファイルストレージ。' },
      { term: 'OCI Load Balancer', aliases: ['Load Balancer'], description: 'ロードバランササービス。' },
      { term: 'Autonomous Database', description: '自動運用を特徴とするマネージドDB。' },
      { term: 'Oracle Database Cloud Service', aliases: ['DBCS'], description: 'Oracle Databaseをマネージドで提供するサービス。' },
      { term: 'MySQL Database Service', description: 'OCIのマネージドMySQLサービス。' },
      { term: 'OKE', aliases: ['Container Engine for Kubernetes'], description: 'OCIのマネージドKubernetes。' },
      { term: 'OCI Functions', aliases: ['Functions'], description: '関数のサーバレス実行基盤。' },
      { term: 'OCI API Gateway', aliases: ['API Gateway'], description: 'APIの公開と制御を行うゲートウェイ。' },
      { term: 'OCI IAM', aliases: ['IAM'], description: 'ユーザー/グループ/ポリシーによるアクセス制御。' },
      { term: 'OCI Vault', aliases: ['Vault'], description: '鍵/シークレットを安全に保管するサービス。' },
      { term: 'OCI Logging', aliases: ['Logging'], description: 'ログの収集と検索。' },
      { term: 'OCI Monitoring', aliases: ['Monitoring'], description: 'メトリクス監視とアラート。' },
      { term: 'OCI Events', aliases: ['Events'], description: 'イベント通知とルーティングを行うサービス。' },
      { term: 'OCI Streaming', aliases: ['Streaming'], description: 'ストリーミング（Kafka互換API等）サービス。' },
      { term: 'OCI Notifications', aliases: ['Notifications'], description: '通知（パブサブ）サービス。' },
      { term: 'OCI DNS', aliases: ['DNS'], description: 'DNSホスティングサービス。' },
      { term: 'OCI WAF', aliases: ['WAF'], description: 'Webアプリ防御のためのWAFサービス。' },
      { term: 'OCI Bastion', aliases: ['Bastion'], description: '踏み台アクセスを提供するサービス。' },
      { term: 'FastConnect', description: 'オンプレとOCIを専用線で接続するサービス。' },
      { term: 'NAT Gateway', description: 'プライベートサブネットからのアウトバウンド通信を提供。' },
      { term: 'Service Gateway', description: 'OCIサービスへプライベートに到達するゲートウェイ。' },
      { term: 'DRG', aliases: ['Dynamic Routing Gateway'], description: 'VCN間/オンプレ接続を中継するルータ機能。' },
      { term: 'Resource Manager', description: 'Terraformベースでインフラを管理するサービス。' },
      { term: 'Data Integration', description: 'データ連携（ETL/ELT）サービス。' },
      { term: 'GoldenGate', description: 'データレプリケーション/CDCのサービス。' },
      { term: 'Data Science', description: '機械学習の開発・運用を支援するサービス。' },
    ], buildOciConsoleGlossaryEntries()),
  },
  {
    id: 'cloudflareServices',
    title: 'Cloudflareサービス用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'Cloudflare DNS', description: 'DNSホスティングサービス。' },
      { term: 'Cloudflare CDN', description: 'エッジ配信によるCDNサービス。' },
      { term: 'Cloudflare WAF', description: 'Webアプリケーションファイアウォール。' },
      { term: 'Cloudflare Workers', aliases: ['Workers'], description: 'エッジで動くサーバレス実行環境。' },
      { term: 'Cloudflare Pages', aliases: ['Pages'], description: '静的サイト/フロントエンドのホスティング。' },
      { term: 'Cloudflare R2', aliases: ['R2'], description: 'S3互換APIを持つオブジェクトストレージ。' },
      { term: 'Cloudflare D1', aliases: ['D1'], description: 'SQLiteベースのマネージドデータベース。' },
      { term: 'Cloudflare KV', aliases: ['KV'], description: '分散Key-Valueストア。' },
      { term: 'Durable Objects', description: '状態を持つオブジェクトをエッジで扱う仕組み。' },
      { term: 'Cloudflare Queues', aliases: ['Queues'], description: 'メッセージキューサービス。' },
      { term: 'Workers AI', description: 'Workers上でAI推論などを提供する機能群。' },
      { term: 'Vectorize', description: 'ベクトル検索（埋め込み）向けのサービス。' },
      { term: 'Hyperdrive', description: 'DB接続を最適化するプロキシ/キャッシュ機能。' },
      { term: 'Cloudflare Stream', description: '動画配信と管理のサービス。' },
      { term: 'Cloudflare Images', description: '画像の保存・変換・配信のサービス。' },
      { term: 'Turnstile', description: 'CAPTCHA代替のボット対策ウィジェット。' },
      { term: 'Cloudflare Zero Trust', description: 'ゼロトラストを実現する製品群。' },
      { term: 'Cloudflare Access', description: 'アプリへのアクセス制御（ZTNA）。' },
      { term: 'Cloudflare Gateway', description: 'セキュアWebゲートウェイ/フィルタリング。' },
      { term: 'WARP', description: 'クライアント接続（VPN/プロキシ）系の機能。' },
      { term: 'Cloudflare Tunnel', description: 'インバウンド公開を安全に行うトンネル機能。' },
      { term: 'Cloudflare Load Balancing', description: 'グローバル負荷分散サービス。' },
      { term: 'Cloudflare Argo Smart Routing', description: 'ネットワーク経路を最適化して遅延を下げる機能。' },
      { term: 'Cloudflare Bot Management', description: 'ボット判定と対策の機能。' },
      { term: 'Cloudflare Rate Limiting', description: 'リクエスト頻度の制限機能。' },
      { term: 'Cloudflare Rulesets', description: '各種ルール（WAF/リダイレクト等）を統合管理する仕組み。' },
      { term: 'Cloudflare Firewall Rules', description: 'トラフィック制御ルール（現在はRulesetsへ統合される場合あり）。' },
      { term: 'Cloudflare DDoS Protection', description: 'DDoS攻撃の防御機能。' },
      { term: 'Cloudflare Logpush', description: 'ログを外部ストレージ等へ転送する機能。' },
      { term: 'Cloudflare Magic WAN', description: 'グローバルWANを構築するネットワーク製品。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.cloudflare),
  },
  {
    id: 'iotEmbedded',
    title: 'IoT・組み込み用語図鑑',
    entries: [
      { term: 'IoT', description: 'モノ（デバイス）がネットワークに接続され、データ収集/制御を行う仕組み。' },
      { term: '組み込み', aliases: ['組込み', 'Embedded'], description: '機器に組み込まれたソフト/ハードで動作するシステム領域。' },
      { term: 'MCU', aliases: ['マイコン', 'Microcontroller'], description: 'CPU・メモリ・周辺回路を統合した制御向けチップ。' },
      { term: 'SoC', aliases: ['System on a Chip'], description: '複数機能を1チップに統合した半導体。' },
      { term: 'RTOS', description: 'リアルタイム性を重視したOS（スケジューリング等）。' },
      { term: 'FreeRTOS', description: '組み込みで広く使われる軽量RTOS。' },
      { term: 'Zephyr', aliases: ['Zephyr RTOS'], description: 'IoT向けのオープンソースRTOS。' },
      { term: 'ESP32', description: 'Wi‑Fi/BLEを搭載するEspressifのマイコン/SoC。' },
      { term: 'ESP8266', description: 'Wi‑Fiを搭載するEspressifのマイコン/SoC。' },
      { term: 'STM32', description: 'STMicroelectronicsのARM Cortex‑M系マイコン群。' },
      { term: 'Cortex-M', aliases: ['ARM Cortex-M'], description: 'ARMのマイコン向けCPUコア系列。' },
      { term: 'AVR', description: 'Atmel由来の8bitマイコンアーキテクチャ。' },
      { term: 'ATmega', description: 'AVR系（8bit）の代表的マイコン系列。' },
      { term: 'ATtiny', description: 'AVR系の小規模マイコン系列。' },
      { term: 'Renesas', aliases: ['ルネサス'], description: '日本の半導体メーカー（マイコン/SoC等）。' },
      { term: 'RX', aliases: ['Renesas RX'], description: 'ルネサスの32bitマイコン系列（RX）。' },
      { term: 'RL78', aliases: ['Renesas RL78'], description: 'ルネサスの16bitマイコン系列（RL78）。' },
      { term: 'RA', aliases: ['Renesas RA'], description: 'ルネサスのARM Cortex‑M系マイコン系列（RA）。' },
      { term: 'Arduino', description: 'マイコンボードと開発環境（IDE/ライブラリ）のエコシステム。' },
      { term: 'PlatformIO', description: '複数ボード/環境を扱える組み込み向け開発プラットフォーム。' },
      { term: 'UART', description: 'シリアル通信（非同期）インターフェース。' },
      { term: 'I2C', aliases: ['I²C'], description: '2線式のシリアル通信バス。' },
      { term: 'SPI', description: '高速なシリアル通信バス。' },
      { term: 'GPIO', description: '汎用入出力ピン。' },
      { term: 'PWM', description: 'パルス幅変調。モータ/LED等の制御に使う。' },
      { term: 'ADC', description: 'アナログ→デジタル変換器。センサー値の取得に使う。' },
      { term: 'DAC', description: 'デジタル→アナログ変換器。アナログ出力に使う。' },
      { term: 'Interrupt', aliases: ['割り込み'], description: '外部/内部イベントに応じて処理を割り込ませる仕組み。' },
      { term: 'ISR', aliases: ['Interrupt Service Routine'], description: '割り込み処理ルーチン。短く安全に書くのが基本。' },
      { term: 'DMA', aliases: ['Direct Memory Access'], description: 'CPU介在なしでメモリ転送を行う仕組み。' },
      { term: 'JTAG', description: 'デバッグ/書き込みに使うインターフェース規格。' },
      { term: 'SWD', aliases: ['Serial Wire Debug'], description: 'ARM系でよく使われるデバッグインターフェース。' },
      { term: 'Bootloader', aliases: ['ブートローダ'], description: '起動時にファームウェアの読み込み/更新を担うソフト。' },
      { term: 'Firmware', aliases: ['ファームウェア'], description: 'デバイス上で動作する組み込みソフトウェア。' },
      { term: 'OTA', aliases: ['Over-the-Air'], description: '無線/ネットワーク経由でファームウェアを更新する仕組み。' },
      { term: 'MQTT', description: 'IoTでよく使われる軽量なパブサブ型メッセージプロトコル。' },
      { term: 'CoAP', description: '制約デバイス向けの軽量HTTP風プロトコル。' },
      { term: 'BLE', aliases: ['Bluetooth Low Energy'], description: '省電力Bluetooth。' },
      { term: 'Zigbee', description: 'IoT向けの近距離無線規格。' },
      { term: 'Thread', description: 'IPv6ベースのメッシュネットワーク規格。' },
      { term: 'Matter', description: 'スマートホーム向けの相互運用標準。' },
      { term: 'LoRa', description: '長距離・低消費電力の無線方式。' },
      { term: 'LoRaWAN', description: 'LoRaを用いたネットワークプロトコル/仕様。' },
      { term: 'CAN', aliases: ['CAN bus'], description: '車載などで使われる通信バス（Controller Area Network）。' },
      { term: 'RS-485', description: '産業用途でよく使われる差動シリアル通信規格。' },
      { term: 'Modbus', description: '産業用途で使われる通信プロトコル。' },
    ],
  },
  {
    id: 'backend',
    title: 'バックエンド用語図鑑',
    entries: [
      { term: 'RDB', aliases: ['RDBMS'], description: '表（テーブル）と関係でデータを管理するデータベース。' },
      { term: 'SQL', description: 'リレーショナルDBを操作するための言語。' },
      { term: 'ORM', description: 'オブジェクトとDBの表を対応付け、SQLを抽象化する仕組み。' },
      { term: 'REST', description: 'HTTPを前提に、リソース指向で設計するAPI設計スタイル。' },
      { term: 'gRPC', description: 'Protocol Buffersを使う高性能なRPCフレームワーク。' },
      { term: 'Node.js', aliases: ['Node'], description: 'JavaScriptをサーバ側で動かす実行環境。' },
      { term: 'Python', aliases: ['Python 3'], description: '汎用プログラミング言語。データ/自動化/バックエンドなどで広く使われる。' },
      { term: 'Go', aliases: ['Golang'], description: 'Google発の言語。シンプルさと並行処理の扱いやすさが特徴。' },
      { term: 'Ruby', description: '日本発の汎用プログラミング言語。' },
      { term: 'Rails', aliases: ['Ruby on Rails'], description: 'Rubyの代表的なWebアプリフレームワーク。' },
      { term: 'PHP', description: 'Web開発で広く使われるスクリプト言語。' },
      { term: 'Laravel', description: 'PHPの代表的なWebアプリフレームワーク。' },
      { term: 'Rust', description: '安全性と性能を両立するシステムプログラミング言語。' },
      { term: 'Cache', aliases: ['キャッシュ'], description: '再計算や再取得を減らすために結果を一時保存する仕組み。' },
      { term: 'Idempotency', aliases: ['冪等性'], description: '同じ操作を複数回実行しても結果が同じである性質。' },
      { term: 'Queue', aliases: ['キュー', 'Message Queue', 'MQ'], description: '非同期処理や負荷平準化に使うメッセージの待ち行列。' },
      { term: 'HTTP', description: 'Webの通信に使われるアプリケーション層プロトコル。' },
      { term: 'HTTPS', description: 'TLSで暗号化されたHTTP。' },
      { term: 'JSON', description: '軽量なデータ交換フォーマット。' },
      { term: 'Transaction', aliases: ['トランザクション'], description: '一連の処理をひとまとまりとして扱う仕組み。' },
      { term: 'ACID', description: 'トランザクションの性質（原子性/一貫性/独立性/永続性）。' },
      { term: 'Index', aliases: ['インデックス'], description: '検索を高速化するための補助データ構造。' },
      { term: 'Pagination', aliases: ['ページネーション'], description: '大量データをページ単位で取得する設計。' },
      { term: 'Rate Limit', aliases: ['レート制限'], description: '単位時間あたりのリクエスト数を制限すること。' },
      { term: 'Timeout', aliases: ['タイムアウト'], description: '一定時間で処理を打ち切る制御。' },
      { term: 'Retry', aliases: ['リトライ'], description: '失敗時に再試行すること（バックオフ等を併用）。' },
    ],
  },
  {
    id: 'frontend',
    title: 'フロントエンド用語図鑑',
    entries: [
      { term: 'HTML', description: 'Webページの構造を記述するマークアップ言語。' },
      { term: 'CSS', description: 'Webページの見た目（スタイル）を指定する言語。' },
      { term: 'JavaScript', aliases: ['JS'], description: 'Webブラウザ上で動くプログラミング言語（サーバでも利用される）。' },
      { term: 'TypeScript', aliases: ['TS'], description: 'JavaScriptに型を追加した言語。大規模開発で保守性を高める。' },
      { term: 'React', description: 'UIをコンポーネントとして構築するためのJavaScriptライブラリ。' },
      { term: 'Vue.js', aliases: ['Vue'], description: '段階的に導入できるUIフレームワーク。' },
      { term: 'Flutter', description: 'Dartで書くクロスプラットフォームUIフレームワーク。' },
      { term: 'Dart', description: 'Flutterで主に使われるプログラミング言語。' },
      { term: 'SwiftUI', description: 'Swiftで宣言的にUIを構築するAppleのUIフレームワーク。' },
      { term: 'DOM', description: 'HTMLをプログラムから操作できるようにした木構造のモデル。' },
      { term: 'SPA', description: 'ページ遷移を最小化し、単一ページ上でUIを更新するアプリ方式。' },
      { term: 'SSR', description: 'サーバ側でHTMLを生成して返すレンダリング方式。' },
      { term: 'CORS', description: 'ブラウザの同一生成元ポリシーに基づく、クロスオリジン通信の制御。' },
      { term: 'CSR', description: 'ブラウザ側でレンダリングする方式（Client Side Rendering）。' },
      { term: 'SSG', description: 'ビルド時に静的HTMLを生成して配信する方式（Static Site Generation）。' },
      { term: 'ISR', description: '静的生成と再生成を組み合わせ、更新を段階的に反映する方式。' },
      { term: 'Hydration', aliases: ['ハイドレーション'], description: 'SSR/SSGで生成したHTMLにJSを結び付けて動的化する処理。' },
      { term: 'Bundle', aliases: ['バンドル'], description: '複数のJS/CSSをまとめて配信する形にしたもの。' },
      { term: 'Tree Shaking', aliases: ['ツリーシェイキング'], description: '未使用コードを除去してバンドルを小さくする最適化。' },
      { term: 'Code Splitting', aliases: ['コード分割'], description: '必要なタイミングで必要なコードだけ読み込む最適化。' },
      { term: 'PWA', description: 'Webアプリをネイティブアプリのように提供するアプローチ。' },
      { term: 'Accessibility', aliases: ['a11y', 'アクセシビリティ'], description: '多様な利用者が使えるようにするための設計と実装。' },
      { term: 'SEO', description: '検索エンジンで見つけやすくするための最適化。' },
      { term: 'Micro Frontend', aliases: ['マイクロフロントエンド'], description: 'フロントエンドを小さな単位に分割して独立デプロイ等を可能にする設計。' },
    ],
  },
  {
    id: 'ddd',
    title: 'DDD用語図鑑',
    entries: [
      { term: 'DDD', aliases: ['Domain-Driven Design', 'Domain Driven Design'], description: 'ドメイン（業務）を中心に設計し、モデルと言葉を揃えて開発するアプローチ。' },
      { term: 'Domain', aliases: ['ドメイン'], description: '事業の問題領域。ソフトが扱う「業務そのもの」。' },
      { term: 'Domain Model', aliases: ['ドメインモデル'], description: 'ドメインを理解し、概念とルールをモデル化したもの。' },
      { term: 'Entity', aliases: ['エンティティ'], description: '同一性（ID）で区別され、状態が変わり得るドメインオブジェクト。' },
      { term: 'Value Object', aliases: ['ValueObject', 'VO', '値オブジェクト'], description: '属性の集合で同一性を表し、不変として扱うドメインオブジェクト。' },
      { term: 'Aggregate', aliases: ['集約'], description: '整合性境界を持つオブジェクト群。外部からは集約ルート経由で操作する。' },
      { term: 'Repository', aliases: ['リポジトリ'], description: '集約の永続化を抽象化し、取得/保存の窓口を提供するパターン。' },
      { term: 'Ubiquitous Language', aliases: ['ユビキタス言語'], description: 'チーム全体で共有する、ドメインに根ざした一貫した用語体系。' },
      { term: 'Bounded Context', aliases: ['境界付けられたコンテキスト'], description: 'モデルの意味が一貫する境界。文脈が違えば別モデルとして分離する。' },
      { term: 'Subdomain', aliases: ['サブドメイン'], description: 'ドメインを細分化した領域。重要度によりコア/支援/汎用などに分ける。' },
      { term: 'Core Domain', aliases: ['コアドメイン'], description: '競争優位の源泉となる最重要領域。最も丁寧に設計する。' },
      { term: 'Supporting Subdomain', aliases: ['支援サブドメイン'], description: 'コアを支えるが差別化の中心ではない領域。作り込み過ぎに注意。' },
      { term: 'Generic Subdomain', aliases: ['汎用サブドメイン'], description: '一般的で差別化になりにくい領域。SaaS/OSS/外部委託の候補になりやすい。' },
      { term: 'Context Map', aliases: ['コンテキストマップ'], description: '複数の境界づけられたコンテキストの関係を表す図。' },
      { term: 'Shared Kernel', aliases: ['共有カーネル'], description: '複数コンテキストで共有する小さなモデル。共同で変更管理する。' },
      { term: 'Customer/Supplier', aliases: ['顧客/供給者'], description: '上流（供給者）が下流（顧客）に影響を与える関係。' },
      { term: 'Conformist', aliases: ['準拠者'], description: '下流が上流モデルに合わせる（文句を言わずに従う）統合関係。' },
      { term: 'Domain Event', aliases: ['ドメインイベント'], description: 'ドメイン上の重要な出来事を表すイベント。' },
      { term: 'Aggregate Root', aliases: ['集約ルート'], description: '集約の入口となるエンティティ。外部からの操作窓口。' },
      { term: 'Invariant', aliases: ['不変条件'], description: '常に満たすべき整合性ルール。集約で守ることが多い。' },
      { term: 'Application Service', aliases: ['アプリケーションサービス'], description: 'ユースケースを実行し、ドメインオブジェクトを調停する層。' },
      { term: 'Domain Service', aliases: ['ドメインサービス'], description: 'エンティティ/VOに自然に属さないドメインロジックを担う。' },
      { term: 'Factory', aliases: ['ファクトリ'], description: '複雑な生成をカプセル化してオブジェクト生成を統一する。' },
      { term: 'Specification', aliases: ['スペシフィケーション'], description: '条件判定をオブジェクトとして表現し再利用可能にするパターン。' },
      { term: 'Policy', aliases: ['ポリシー'], description: 'ルール適用の方針（いつ・どう適用するか）を分離したもの。' },
      { term: 'Transaction Script', aliases: ['トランザクションスクリプト'], description: 'ユースケースごとに手続きで実装するスタイル。小規模では有効だが成長すると限界が来る。' },
      { term: 'Anemic Domain Model', aliases: ['貧血モデル'], description: '状態だけ持ち、振る舞い（ルール）が外に散るモデル。DDDの旨味が出にくいアンチパターン。' },
      { term: 'Process Manager', aliases: ['プロセスマネージャ'], description: '複数ステップの業務プロセスをイベントでオーケストレーションする役割。' },
      { term: 'Open Host Service', aliases: ['公開ホストサービス'], description: '外部向けに安定した統合インタフェースを提供する。' },
      { term: 'Published Language', aliases: ['公開言語'], description: '統合で使う共通のデータ表現（スキーマ/契約）。' },
      { term: 'Partnership', aliases: ['パートナーシップ'], description: '密に協業して統合を進める関係（コンテキスト間の関係性パターン）。' },
      { term: 'Separate Ways', aliases: ['セパレートウェイズ'], description: '統合せずに切り離して進める関係（コンテキスト間の関係性パターン）。' },
      { term: 'Anti-Corruption Layer', aliases: ['ACL', '腐敗防止層'], description: '外部システムのモデルに引きずられないための変換層。' },
    ],
  },
  {
    id: 'tdd',
    title: 'TDD用語図鑑',
    entries: [
      { term: 'TDD', aliases: ['Test-Driven Development', 'Test Driven Development'], synonyms: ['テスト駆動開発', 'テストファースト'], antonyms: ['Test-Last'], description: 'テストを先に書き、失敗→最小実装→リファクタの反復で開発する手法。' },
      { term: 'Test-Last', aliases: ['Test Last', 'テスト後書き'], description: 'まず実装してからテストを書く進め方（対比としてTDDが語られるときに出る）。' },
      { term: 'Red-Green-Refactor', aliases: ['Red Green Refactor'], description: '失敗テスト（Red）→通す（Green）→設計改善（Refactor）のサイクル。' },
      { term: 'Mock', aliases: ['モック'], description: '呼び出しを検証するためのテスト用代替オブジェクト。' },
      { term: 'Stub', aliases: ['スタブ'], description: 'テスト対象に値を返すための代替実装。' },
      { term: 'Test Double', aliases: ['テストダブル'], description: 'モック/スタブ等のテスト用代替の総称。' },
      { term: 'Refactor', aliases: ['リファクタ'], description: '外部仕様を変えずに内部構造を改善すること。' },
      { term: 'Arrange-Act-Assert', aliases: ['AAA'], description: '準備→実行→検証の3段構成でテストを整理するパターン。' },
      { term: 'Given-When-Then', aliases: ['GWT'], description: '前提→操作→結果の形でテストを表現するパターン。' },
      { term: 'Test Pyramid', aliases: ['テストピラミッド'], description: '単体を厚く、結合/E2Eを薄くするテスト戦略の考え方。' },
      { term: 'Fixture', aliases: ['フィクスチャ'], description: 'テストデータや初期状態を作る仕組み。' },
      { term: 'Assertion', aliases: ['アサーション'], description: '期待値と実際値を比較して正しさを確認する記述。' },
      { term: 'Flaky Test', aliases: ['不安定テスト'], description: '同じコードでも成功/失敗が揺れるテスト。' },
      { term: 'Coverage', aliases: ['カバレッジ'], description: 'テストが通るコード行/分岐の割合。品質の一要素。' },
      { term: 'Mutation Testing', aliases: ['ミューテーションテスト'], description: 'コードを意図的に壊し、テストが検出できるかで強さを測る。' },
      { term: 'Property-Based Testing', aliases: ['PBT', 'プロパティベーステスト'], description: '性質（不変条件）を大量の入力で検証するテスト手法。' },
      { term: 'Deterministic', aliases: ['決定的'], description: '同じ入力なら同じ結果になる性質（テストで重要）。' },
    ],
  },
  {
    id: 'pmbok',
    title: 'PMBOK用語図鑑',
    entries: [
      { term: 'PMBOK', aliases: ['PMBOK Guide'], description: 'プロジェクトマネジメントの知識体系をまとめたガイド。' },
      { term: 'WBS', description: '作業を階層分解し、見積りや進捗管理をしやすくする構造。' },
      { term: 'Scope', aliases: ['スコープ'], description: 'プロジェクトが提供する範囲（何をやり、何をやらないか）。' },
      { term: 'Stakeholder', aliases: ['ステークホルダー'], description: 'プロジェクトに影響を与える、または影響を受ける利害関係者。' },
      { term: 'Risk', aliases: ['リスク'], description: '不確実性によって目的達成に影響し得る事象。' },
      { term: 'Baseline', aliases: ['ベースライン'], description: '計画の基準となる合意済みの値（スケジュール等）。' },
      { term: 'Schedule', aliases: ['スケジュール'], description: 'タスクと期限を含む計画。' },
      { term: 'Cost', aliases: ['コスト'], description: '予算や費用に関する計画と管理。' },
      { term: 'Quality', aliases: ['品質'], description: '成果物が満たすべき基準とその管理。' },
      { term: 'Communication', aliases: ['コミュニケーション'], description: '情報の共有・報告・合意形成の管理。' },
      { term: 'Procurement', aliases: ['調達'], description: '外部のベンダや契約に関する管理。' },
      { term: 'Change Request', aliases: ['変更要求'], description: '計画や要件の変更を正式に提起する手続き。' },
      { term: 'RAID', description: 'Risk/Assumption/Issue/Dependencyをまとめて管理する枠組み。' },
      { term: 'RACI', description: '役割分担（責任/実行/相談/報告）を整理するマトリクス。' },
      { term: 'Milestone', aliases: ['マイルストーン'], description: '重要な節目となる達成点。' },
      { term: 'Scope Creep', aliases: ['スコープクリープ'], description: '合意なしにスコープが膨らみ続ける問題。' },
    ],
  },
  {
    id: 'java',
    title: 'Java用語図鑑',
    entries: [
      { term: 'Java', description: 'JVM上で動く汎用プログラミング言語。' },
      { term: 'JVM', description: 'Javaバイトコードを実行する仮想マシン。' },
      { term: 'JDK', description: 'Java開発に必要なツール群（コンパイラ等）を含むキット。' },
      { term: 'JRE', description: 'Java実行に必要な環境（JVM等）をまとめたもの。' },
      { term: 'GC', aliases: ['Garbage Collection'], description: '不要になったオブジェクトを自動回収する仕組み。' },
      { term: 'Maven', description: 'Javaのビルド/依存管理ツール。' },
      { term: 'Gradle', description: 'Javaを含む多言語のビルド/依存管理ツール。' },
      { term: 'Bytecode', aliases: ['バイトコード'], description: 'JVMが実行する中間表現。' },
      { term: 'JIT', aliases: ['Just-In-Time'], description: '実行時に最適化しながらネイティブコード生成する方式。' },
      { term: 'Classpath', aliases: ['クラスパス'], description: 'クラスやリソースの探索パス。' },
      { term: 'Jar', aliases: ['JAR'], description: 'Javaの配布形式（ZIPベースのアーカイブ）。' },
      { term: 'Spring', aliases: ['Spring Framework'], description: 'Javaの代表的なDI/アプリ基盤フレームワーク。' },
      { term: 'Spring Boot', description: 'Springを素早く立ち上げるためのフレームワーク。' },
      { term: 'JPA', description: 'JavaのORM標準（永続化API）。' },
      { term: 'Hibernate', description: '代表的なJPA実装/ORM。' },
      { term: 'Exception', aliases: ['例外'], description: 'エラーや異常を表す仕組み。' },
      { term: 'Stream API', aliases: ['Stream'], description: 'コレクション等を宣言的に処理するためのAPI。' },
    ],
  },
  {
    id: 'nextjs',
    title: 'Next.js用語図鑑',
    entries: [
      { term: 'Next.js', aliases: ['Next.JS', 'NextJS'], description: 'ReactベースのフルスタックWebフレームワーク。' },
      { term: 'App Router', aliases: ['AppRouter'], description: 'Next.jsのルーティング方式（`app/` ディレクトリ）' },
      { term: 'Pages Router', aliases: ['PagesRouter'], description: '従来のルーティング方式（`pages/` ディレクトリ）' },
      { term: 'SSG', description: 'ビルド時に静的HTMLを生成して配信する方式。' },
      { term: 'ISR', description: '静的生成と再生成を組み合わせ、更新を段階的に反映する方式。' },
      { term: 'Middleware', description: 'リクエストの前処理/後処理を行う仕組み（認証等）。' },
      { term: 'Route Handler', aliases: ['RouteHandler'], description: 'App RouterでAPI等を実装するハンドラ（`route.ts`）。' },
      { term: 'Server Component', aliases: ['RSC'], description: 'サーバでレンダリングされるコンポーネント（クライアントJSを抑制できる）。' },
      { term: 'Client Component', description: 'ブラウザで動くコンポーネント（`use client` が必要）。' },
      { term: 'Server Action', aliases: ['ServerActions'], description: 'フォーム送信等をサーバ側関数として扱う仕組み。' },
      { term: 'Edge Runtime', description: 'エッジ環境で実行するランタイム（制約あり）。' },
      { term: 'Image Optimization', aliases: ['next/image'], description: '画像の最適化配信を支援する機能。' },
      { term: 'Metadata', aliases: ['メタデータ'], description: 'タイトルやOGP等のページ情報を定義する仕組み。' },
      { term: 'Dynamic Route', aliases: ['動的ルート'], description: '`[id]` のようにパラメータでマッチするルーティング。' },
      { term: 'Layout', description: '共有レイアウトを定義する仕組み（`layout.tsx` 等）。' },
      { term: 'Streaming', aliases: ['ストリーミング'], description: 'レスポンスを段階的に送って表示を早める技術。' },
    ],
  },
  {
    id: 'dotnet',
    title: '.NET用語図鑑',
    entries: [
      { term: '.NET', aliases: ['.Net', 'dotnet'], description: 'Microsoftのアプリケーション開発プラットフォーム。' },
      { term: 'CLR', description: '.NETの実行環境（ランタイム）。' },
      { term: 'NuGet', description: '.NETのパッケージマネージャ。' },
      { term: 'ASP.NET Core', aliases: ['ASPNET Core', 'ASP.NET'], description: '.NETのWebアプリ/ APIフレームワーク。' },
      { term: 'C#', aliases: ['CSharp'], description: '.NETでよく使われるプログラミング言語。' },
      { term: 'F#', aliases: ['FSharp'], description: '.NET向けの関数型言語。' },
      { term: 'VB.NET', aliases: ['VBNet'], description: '.NET向けのVisual Basic系言語。' },
      { term: 'MSBuild', description: '.NETのビルド基盤。' },
      { term: 'dotnet CLI', aliases: ['dotnet'], description: '.NETのコマンドラインツール。' },
      { term: 'Entity Framework Core', aliases: ['EF', 'EF Core'], description: '.NETのORM。' },
      { term: 'Kestrel', description: 'ASP.NET CoreのWebサーバ。' },
      { term: 'DI', aliases: ['Dependency Injection'], description: '依存関係を外部から注入し、結合度を下げる設計。' },
      { term: 'Middleware', aliases: ['ミドルウェア'], description: 'HTTPパイプラインで前後処理を行う仕組み。' },
      { term: 'appsettings.json', aliases: ['appsettings'], description: '.NETアプリの代表的な設定ファイル。' },
      { term: 'Razor', description: 'ASP.NETで使われるテンプレートエンジン。' },
    ],
  },
  {
    id: 'security',
    title: 'セキュリティ用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'OWASP', description: 'Webアプリセキュリティの知見を提供するコミュニティ。' },
      { term: 'Software Supply Chain Security', aliases: ['ソフトウェアサプライチェーンセキュリティ'], description: '依存関係やビルド/配布経路を狙う攻撃に備える考え方。' },
      { term: 'SBOM', aliases: ['Software Bill of Materials', 'ソフトウェア部品表'], description: 'ソフトウェアに含まれる部品（依存関係）一覧。' },
      { term: 'OpenSSF', description: 'オープンソースのセキュリティ強化を推進する組織。' },
      { term: 'in-toto', description: 'サプライチェーンの各工程を検証可能にするフレームワーク。' },
      { term: 'Attestation', aliases: ['認証', 'アテステーション'], description: 'ビルド/実行物が特定の手順・環境で作られたことを証明する仕組み。' },
      { term: 'XSS', aliases: ['Cross-Site Scripting'], description: '悪意あるスクリプトを注入して実行させる攻撃。' },
      { term: 'CSRF', aliases: ['Cross-Site Request Forgery'], description: '利用者の意図しないリクエストを送らせる攻撃。' },
      { term: 'SQL Injection', aliases: ['SQLi'], description: 'SQLを注入して情報漏えい等を狙う攻撃。' },
      { term: 'SSRF', aliases: ['Server-Side Request Forgery'], description: 'サーバに意図しない先へリクエストさせる攻撃。' },
      { term: 'RCE', aliases: ['Remote Code Execution'], description: '外部から任意コードを実行される脆弱性/攻撃。' },
      { term: 'CVE', description: '脆弱性識別子（Common Vulnerabilities and Exposures）。' },
      { term: 'SAST', description: 'ソースコード解析による静的セキュリティテスト。' },
      { term: 'DAST', description: '実行中アプリに対する動的セキュリティテスト。' },
      { term: 'WAF', description: 'Webアプリへの攻撃を検知・遮断する防御機構。' },
      { term: 'CSP', aliases: ['Content Security Policy'], description: 'スクリプト読み込み元等を制限してXSS等を緩和する仕組み。' },
      { term: 'Least Privilege', aliases: ['最小権限'], description: '必要最小限の権限だけを付与する原則。' },
      { term: 'Prompt Injection', aliases: ['プロンプトインジェクション'], description: 'プロンプトを悪用して意図しない指示を実行させる攻撃。' },
      { term: 'AI Firewall', aliases: ['AIファイアウォール'], description: 'LLMへの入出力を検査・制御してリスクを下げる仕組み。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.moved.security ?? []),
  },
  {
    id: 'networkHttp',
    title: 'ネットワーク・HTTP用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'TCP', description: '信頼性のあるストリーム通信を提供するトランスポート層プロトコル。' },
      { term: 'UDP', description: '軽量で到達保証のないデータグラム通信を提供するプロトコル。' },
      { term: 'TLS', description: '通信を暗号化し、盗聴や改ざんを防ぐ仕組み。' },
      { term: 'DNS', description: 'ドメイン名をIPアドレスに変換する仕組み。' },
      { term: 'CDN', description: 'コンテンツをエッジに配信してレイテンシを下げる仕組み。' },
      { term: 'HTTP/2', aliases: ['HTTP2'], description: '多重化などで効率を改善したHTTPのバージョン。' },
      { term: 'HTTP/3', aliases: ['HTTP3'], description: 'QUIC上で動作するHTTPのバージョン。' },
      { term: 'Status Code', aliases: ['ステータスコード'], description: 'HTTPレスポンスの結果を表す数値（200/404/500等）。' },
      { term: 'Header', aliases: ['ヘッダ'], description: 'HTTPメッセージの付加情報。' },
      { term: 'ETag', description: 'キャッシュ検証に使うリソースの識別子。' },
      { term: 'Cache-Control', description: 'HTTPキャッシュの制御指示を表すヘッダ。' },
      { term: 'Cookie', aliases: ['クッキー'], description: 'ブラウザに保存される小さなデータ（セッション等で利用）。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.moved.networkHttp ?? []),
  },
  {
    id: 'authIam',
    title: '認証認可・IAM用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'Authentication', aliases: ['認証', 'AuthN'], description: '利用者が誰かを確認すること。' },
      { term: 'Authorization', aliases: ['認可', 'AuthZ'], description: '何をしてよいか（権限）を決めること。' },
      { term: 'OAuth 2.0', aliases: ['OAuth2'], description: '第三者アクセス委譲のためのプロトコル。' },
      { term: 'OIDC', aliases: ['OpenID Connect'], description: 'OAuth 2.0の上にID連携（認証）を載せた仕組み。' },
      { term: 'SAML', description: 'SSO等で使われる認証連携の規格。' },
      { term: 'JWT', description: '署名付きトークン形式（JSON Web Token）。' },
      { term: 'Session', aliases: ['セッション'], description: '利用者の状態をサーバ側等で保持する仕組み。' },
      { term: 'Refresh Token', description: 'アクセストークンを再発行するためのトークン。' },
      { term: 'RBAC', description: '役割（ロール）に基づいて権限を付与する方式。' },
      { term: 'ABAC', description: '属性に基づいて権限を判断する方式。' },
      { term: 'MFA', description: '複数要素（知識/所持/生体）で認証する方式。' },
      { term: 'SSO', description: '一度のログインで複数サービスを利用できる仕組み。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.moved.authIam ?? []),
  },
  {
    id: 'dbSqlTx',
    title: 'DB・SQL・トランザクション用語図鑑',
    entries: [
      { term: 'ACID', description: 'トランザクションの性質（原子性/一貫性/独立性/永続性）。' },
      { term: 'MVCC', description: '多版型同時実行制御（読み取りと書き込みの競合を減らす仕組み）。' },
      { term: 'Isolation', aliases: ['分離レベル'], description: '同時実行時の見え方を定義するトランザクション特性。' },
      { term: 'Serializable', aliases: ['直列化可能'], description: '最も強い分離レベル（直列実行と同等に見える）。' },
      { term: 'Index', aliases: ['インデックス'], description: '検索を高速化するための補助データ構造。' },
      { term: 'Query Plan', aliases: ['実行計画'], description: 'DBが選択したクエリ実行の手順。' },
      { term: 'Deadlock', aliases: ['デッドロック'], description: '互いにロック待ちになり処理が進まない状態。' },
      { term: 'Replication', aliases: ['レプリケーション'], description: 'データを複製し、可用性や読み取り性能を上げる仕組み。' },
      { term: 'Sharding', aliases: ['シャーディング'], description: 'データを分割して複数ノードへ分散する手法。' },
      { term: 'Backup', aliases: ['バックアップ'], description: '障害や誤操作に備えてデータを退避すること。' },
      { term: 'Restore', aliases: ['リストア'], description: 'バックアップからデータを復旧すること。' },
      { term: 'Migration', aliases: ['マイグレーション'], description: 'DBスキーマ等の変更を履歴として適用する仕組み。' },
    ],
  },
  {
    id: 'apiDesign',
    title: 'API設計用語図鑑',
    entries: [
      { term: 'OpenAPI', aliases: ['Swagger'], description: 'API仕様を記述するための標準フォーマット。' },
      { term: 'Versioning', aliases: ['バージョニング'], description: '互換性を壊さずにAPIを進化させるための方針。' },
      { term: 'Pagination', aliases: ['ページネーション'], description: '大量データをページ単位で取得する設計。' },
      { term: 'Cursor Pagination', aliases: ['カーソルページネーション'], description: 'カーソルを用いて安定したページングを行う方式。' },
      { term: 'Idempotency Key', aliases: ['Idempotency-Key'], description: '重複リクエストを安全に扱うためのキー。' },
      { term: 'Rate Limit', aliases: ['レート制限'], description: '単位時間あたりのリクエスト数を制限すること。' },
      { term: 'Error Model', aliases: ['エラーモデル'], description: 'エラー形式・コード体系・メッセージ方針の設計。' },
      { term: 'Backward Compatible', aliases: ['後方互換'], description: '既存クライアントが壊れない互換性。' },
      { term: 'Breaking Change', aliases: ['破壊的変更'], description: '既存クライアントに影響する互換性破壊。' },
      { term: 'Webhook', description: 'イベント発生時に相手先へHTTPで通知する仕組み。' },
      { term: 'GraphQL', description: 'クライアントが必要な形で取得できるクエリ言語/ランタイム。' },
      { term: 'HATEOAS', description: 'リンクで操作可能性を示すRESTの設計思想。' },
    ],
  },
  {
    id: 'devopsCicd',
    title: 'DevOps・CI/CD・リリース用語図鑑',
    entries: [
      { term: 'CI', description: '変更を継続的に統合し、ビルド/テストで品質を確認する開発手法。' },
      { term: 'CD', description: 'テスト済み変更を継続的にリリース（デリバリー/デプロイ）する仕組み。' },
      { term: 'Platform Engineering', aliases: ['プラットフォーム・エンジニアリング'], description: '開発者が使う共通基盤を整備し、生産性と品質を上げる取り組み。' },
      { term: 'DevEx', aliases: ['開発者エクスペリエンス', 'Developer Experience'], description: '開発者が開発しやすい体験（ツール、手順、待ち時間等）を改善する観点。' },
      { term: 'Cognitive Load', aliases: ['認知的負荷'], description: '開発者が同時に抱えるべき複雑さ。下げると速度と品質が上がりやすい。' },
      { term: 'Pipeline', aliases: ['パイプライン'], description: 'ビルド/テスト/デプロイ等の一連の自動処理。' },
      { term: 'GitHub Actions', aliases: ['Github Actions'], description: 'GitHub上でCI/CDワークフローを定義・実行する仕組み。' },
      { term: 'Artifact', aliases: ['成果物'], description: 'ビルド結果として生成される配布物（バイナリ、パッケージ等）。' },
      { term: 'Deployment', aliases: ['デプロイ'], description: '成果物を実行環境へ反映すること。' },
      { term: 'Deploy Strategy', aliases: ['デプロイ戦略'], description: '安全に変更を展開するための方式（カナリア/Blue-Green等）。' },
      { term: 'Canary Release', aliases: ['カナリアリリース'], description: '一部の利用者から段階的に新バージョンを展開する手法。' },
      { term: 'Blue-Green', aliases: ['Blue Green'], description: '新旧環境を切り替えて安全にリリースする手法。' },
      { term: 'Rollback', aliases: ['ロールバック'], description: '問題があれば直前の状態へ戻すこと。' },
      { term: 'Feature Flag', aliases: ['フィーチャーフラグ'], description: '機能のON/OFFを実行時に切り替える仕組み。' },
      { term: 'Runbook', aliases: ['ランブック'], description: '運用手順をまとめた文書。' },
      { term: 'On-call', aliases: ['オンコール'], description: '障害対応の当番体制。' },
      { term: 'Change Failure Rate', aliases: ['変更失敗率'], description: '変更が障害等を引き起こす割合（DORA指標の一つ）。' },
    ],
  },
  {
    id: 'containersK8s',
    title: 'コンテナ・Kubernetes用語図鑑',
    entries: [
      { term: 'Container', aliases: ['コンテナ'], description: 'プロセスを隔離して実行する仕組み。' },
      { term: 'Docker', description: '代表的なコンテナ実行/配布エコシステム。' },
      { term: 'Image', aliases: ['コンテナイメージ'], description: 'コンテナ実行に必要なファイル一式をまとめたもの。' },
      { term: 'Registry', aliases: ['レジストリ'], description: 'コンテナイメージを保管・配布する仕組み。' },
      { term: 'Cluster', aliases: ['クラスター'], description: '複数ノードで構成し、まとめて管理するシステム/環境。' },
      { term: 'Pod', description: 'Kubernetesで一緒に配置・実行される最小単位。' },
      { term: 'Deployment', description: 'Podの望ましい状態を管理し、ローリング更新等を行うリソース。' },
      { term: 'Service', description: 'Pod群への安定したアクセス（仮想IP/名前）を提供する。' },
      { term: 'Ingress', description: 'クラスタ外からのHTTP(S)ルーティングを提供する仕組み。' },
      { term: 'ConfigMap', description: '設定値を外出しする仕組み。' },
      { term: 'Secret', description: '機密情報を扱うKubernetesリソース。' },
      { term: 'Helm', description: 'Kubernetes向けのパッケージマネージャ。' },
      { term: 'Addon', aliases: ['アドオン'], description: '基盤に追加する拡張コンポーネント（Ingress Controller等）。' },
      { term: 'Sidecar', description: '同一Podに同居して補助機能を提供するコンテナ。' },
      { term: 'EKS', description: 'AWSのマネージドKubernetes（Elastic Kubernetes Service）。' },
      { term: 'Multi-Cloud', aliases: ['マルチクラウド'], description: '複数クラウドを併用して運用する戦略/構成。' },
    ],
  },
  {
    id: 'observabilitySre',
    title: '監視・Observability・SRE用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'Observability', aliases: ['可観測性'], description: '外部出力から内部状態を推測できる度合い。' },
      { term: 'Telemetry', aliases: ['テレメトリ'], description: '観測のために収集・送信されるデータ（メトリクス/ログ/トレース等）。' },
      { term: 'OpenTelemetry', aliases: ['OTel', 'Open Telemetry'], description: 'メトリクス/ログ/トレースの標準化と収集のための仕様・実装群。' },
      { term: 'Metrics', aliases: ['メトリクス'], description: '数値で計測される時系列データ（CPU、遅延等）。' },
      { term: 'Logs', aliases: ['ログ'], description: 'イベントや状態を記録したテキスト/構造化データ。' },
      { term: 'Traces', aliases: ['トレース'], description: '分散環境でのリクエスト経路を追跡するデータ。' },
      { term: 'SLI', description: 'サービスレベル指標（成功率、遅延等）。' },
      { term: 'SLO', description: 'SLIに対する目標値。' },
      { term: 'SLA', description: 'サービス提供者と利用者の合意（保証）水準。' },
      { term: 'Error Budget', aliases: ['エラーバジェット'], description: '許容できる失敗量を予算として捉える考え方。' },
      { term: 'Alert', aliases: ['アラート'], description: '異常の兆候を通知して対応を促す仕組み。' },
      { term: 'Incident', aliases: ['インシデント'], description: 'サービス品質に影響する出来事。' },
      { term: 'Postmortem', aliases: ['ポストモーテム'], description: 'インシデントの振り返りと再発防止の記録。' },
      { term: 'MTTR', description: '平均復旧時間（Mean Time To Recovery）。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.moved.observabilitySre ?? []),
  },
  {
    id: 'distributedSystems',
    title: '分散システム用語図鑑',
    entries: [
      { term: 'CAP', description: '一貫性/可用性/分断耐性の同時達成が難しいという性質。' },
      { term: 'Consistency', aliases: ['一貫性'], description: 'データが矛盾なく見える性質（定義は文脈依存）。' },
      { term: 'Availability', aliases: ['可用性'], description: '要求に対して応答できる性質。' },
      { term: 'Partition Tolerance', aliases: ['分断耐性'], description: 'ネットワーク分断が起きても動作を継続できる性質。' },
      { term: 'Eventual Consistency', aliases: ['最終的整合性'], description: '時間が経てば整合する一貫性モデル。' },
      { term: 'Consensus', aliases: ['合意形成'], description: '複数ノードで同一の意思決定を行う仕組み。' },
      { term: 'Raft', description: '合意形成アルゴリズムの一つ。' },
      { term: 'Leader Election', aliases: ['リーダー選出'], description: '代表ノードを決めて協調動作する仕組み。' },
      { term: 'Quorum', aliases: ['クォーラム'], description: '合意に必要な最小票数（多数決の閾値）。' },
      { term: 'Replication', aliases: ['レプリケーション'], description: 'データを複製し、可用性や読み取り性能を上げる仕組み。' },
      { term: 'Failover', aliases: ['フェイルオーバー'], description: '障害時に待機系へ切り替えること。' },
      { term: 'Split Brain', aliases: ['スプリットブレイン'], description: '分断により複数リーダーが同時に存在してしまう状態。' },
    ],
  },
  {
    id: 'messagingEda',
    title: 'メッセージング・イベント駆動用語図鑑',
    entries: [
      { term: 'Event-Driven', aliases: ['イベント駆動'], description: 'イベントを起点に処理を連携する設計。' },
      { term: 'Message Broker', aliases: ['ブローカー'], description: 'メッセージの中継・永続化・配信を担う基盤。' },
      { term: 'Pub/Sub', description: '発行者と購読者を疎結合にする配信モデル。' },
      { term: 'Kafka', description: '分散ログ（ストリーム）基盤。' },
      { term: 'Producer', aliases: ['プロデューサ'], description: 'メッセージを送信する側。' },
      { term: 'Consumer', aliases: ['コンシューマ'], description: 'メッセージを受け取り処理する側。' },
      { term: 'DLQ', aliases: ['Dead Letter Queue'], description: '処理できないメッセージを退避するキュー。' },
      { term: 'At-least-once', description: '少なくとも1回は届くが重複があり得る配信保証。' },
      { term: 'Exactly-once', description: '重複なく1回だけ処理されることを目指す保証（実現は難しい）。' },
      { term: 'Outbox Pattern', aliases: ['Outbox'], description: 'DBトランザクションとイベント発行を整合させるパターン。' },
      { term: 'Saga', description: '分散トランザクションを補償トランザクションで扱うパターン。' },
      { term: 'Idempotent Consumer', aliases: ['冪等コンシューマ'], description: '重複メッセージを受けても安全に処理できる実装。' },
    ],
  },
  {
    id: 'performanceCache',
    title: 'パフォーマンス・キャッシュ用語図鑑',
    entries: mergeGlossaryEntries([
      { term: 'Latency', aliases: ['レイテンシ'], description: '処理や通信の遅延時間。' },
      { term: 'Throughput', aliases: ['スループット'], description: '単位時間あたりに処理できる量。' },
      { term: 'QPS', description: '1秒あたりのクエリ数（Queries Per Second）。' },
      { term: 'p95', description: '95パーセンタイル（遅い側の分布を見る指標）。' },
      { term: 'p99', description: '99パーセンタイル。テールレイテンシの指標。' },
      { term: 'Cache Hit', aliases: ['ヒット'], description: 'キャッシュから取得できた状態。' },
      { term: 'Cache Miss', aliases: ['ミス'], description: 'キャッシュに無く、元データ取得が必要な状態。' },
      { term: 'TTL', description: 'キャッシュ等の有効期限（Time To Live）。' },
      { term: 'Eviction', aliases: ['追い出し'], description: '容量制約でキャッシュ項目を削除すること。' },
      { term: 'LRU', description: '最終アクセスが古いものから追い出すキャッシュ戦略。' },
      { term: 'Benchmark', aliases: ['ベンチマーク'], description: '性能を計測・比較するための測定。' },
      { term: 'Backoff', aliases: ['バックオフ'], description: 'リトライ間隔を伸ばしながら再試行する戦略。' },
    ], CLOUDFLARE_CONSOLE_SPLIT.moved.performanceCache ?? []),
  },
  {
    id: 'architecturePatterns',
    title: '設計パターン・アーキテクチャ用語図鑑',
    entries: [
      { term: 'Cloud Native', aliases: ['クラウドネイティブ'], description: 'クラウドの特性（弾力性・自動化等）を前提に設計・運用する考え方。' },
      { term: 'Serverless', aliases: ['サーバーレス'], description: 'サーバ管理を意識せずに実行できる実行モデル/設計。' },
      { term: 'Portability', aliases: ['移植性'], description: '環境が変わっても動かしやすい性質。' },
      { term: 'Data-Driven Architecture', aliases: ['データ駆動型アーキテクチャ'], description: 'データやイベントを中心に設計し、意思決定や連携を行う方式。' },
      { term: 'Monolith', aliases: ['Monolithic', 'Monolithic Architecture', 'モノリス', 'モノリシック', 'モノシリック'], antonyms: ['Microservices', 'マイクロサービス'], description: '単一のデプロイ単位でアプリを構成する方式。' },
      { term: 'Microservices', aliases: ['Microservice Architecture', 'マイクロサービス', 'マイクロサービスアーキテクチャ'], antonyms: ['Monolith', 'モノリス'], description: '機能を小さなサービスに分割し独立デプロイする方式。' },
      { term: 'Layered Architecture', aliases: ['レイヤード'], description: '層（UI/アプリ/ドメイン/インフラ等）で責務分離する設計。' },
      { term: 'Hexagonal Architecture', aliases: ['ヘキサゴナル', 'Ports and Adapters'], description: '外部依存をポート/アダプタで分離する設計。' },
      { term: 'Clean Architecture', description: '依存方向を内側に向けてビジネスルールを保護する設計。' },
      { term: 'CQRS', description: '読み取りと書き込みのモデル/責務を分離するパターン。' },
      { term: 'Event Sourcing', description: '状態をイベント列として保存し、再生して現在状態を得る方式。' },
      { term: 'BFF', aliases: ['Backend for Frontend'], description: 'フロントエンドごとに最適化したバックエンドを用意する方式。' },
      { term: 'API Gateway', aliases: ['APIGateway'], description: 'APIの入口を集約し、認証・ルーティング・レート制限等を担う仕組み。' },
      { term: 'Strangler Fig', aliases: ['ストラングラーフィグ'], description: '既存システムを段階的に置き換える移行パターン。' },
      { term: 'Service Mesh', description: 'サービス間通信の共通機能をインフラ層で提供する仕組み。' },
      { term: 'Sidecar', description: 'アプリ本体に付随して補助機能を提供するパターン/構成。' },
      { term: 'ADR', aliases: ['Architecture Decision Record', 'アーキテクチャ決定記録'], description: '意思決定の背景と結論を記録し、将来の理解を助ける文書。' },
      { term: 'WebAssembly', aliases: ['Wasm', 'WebAssembly（Wasm）'], description: 'ブラウザ等で動くバイナリ形式の実行基盤。' },
      { term: 'eBPF', description: 'カーネル内で安全にプログラムを実行し観測/制御する仕組み。' },
    ],
  },
  {
    id: 'agileProduct',
    title: 'アジャイル・Scrum・プロダクト用語図鑑',
    entries: [
      { term: 'Agile', aliases: ['アジャイル'], description: '変化に適応しながら価値提供を行う開発アプローチ。' },
      { term: 'Scrum', aliases: ['スクラム'], description: '短い反復（スプリント）で価値を積み上げるフレームワーク。' },
      { term: 'Iteration', aliases: ['イテレーション'], description: '短い反復単位で計画→実行→学習を繰り返す進め方（Scrumではスプリントに相当）。' },
      { term: 'Lean', description: '無駄を減らし価値の流れを最適化する考え方。' },
      { term: 'Kanban', aliases: ['カンバン'], description: '作業の流れを可視化し、WIP制限で流れを改善する手法。' },
      { term: 'UX', description: 'ユーザー体験。利用者が得る体験全体を設計する観点。' },
      { term: 'Leadership', aliases: ['リーダーシップ'], description: '目的達成のために意思決定と合意形成をリードする行動。' },
      { term: 'Team Collaboration', aliases: ['チームコラボレーション'], description: 'チームで協調して成果を出すための連携と習慣。' },
      { term: 'Team Topologies', aliases: ['チームトポロジー'], description: 'チーム構造とインタラクションを設計して認知的負荷を下げる考え方。' },
      { term: 'Conway’s Law', aliases: ['Conway\'s Law', 'コンウェイの法則'], description: '組織のコミュニケーション構造がシステム設計に反映されるという法則。' },
      { term: 'Sprint', aliases: ['スプリント'], description: '一定期間の反復開発サイクル。' },
      { term: 'Backlog', aliases: ['バックログ'], description: 'やることの一覧（優先度付き）。' },
      { term: 'User Story', aliases: ['ユーザーストーリー'], description: '利用者視点で価値を表現する要求記述。' },
      { term: 'MVP', description: '最小の価値提供で学習するためのプロダクト形。' },
      { term: 'OKR', description: '目標と主要結果で進捗を管理する枠組み。' },
      { term: 'DoD', aliases: ['Definition of Done'], description: '完了の定義。何を満たせば完了かの基準。' },
      { term: 'Retrospective', aliases: ['ふりかえり'], description: 'プロセスを改善するための振り返り会。' },
      { term: 'Roadmap', aliases: ['ロードマップ'], description: '将来の方針やマイルストーンの計画。' },
      { term: 'Product Discovery', aliases: ['ディスカバリー'], description: '何を作るべきかを探索し学ぶ工程。' },
      { term: 'Stakeholder', aliases: ['ステークホルダー'], description: 'プロジェクトに影響を与える、または影響を受ける利害関係者。' },
    ],
  },
  {
    id: 'aiLlm',
    title: 'AI/LLM用語図鑑',
    entries: [
      { term: 'AI', aliases: ['Artificial Intelligence', '人工知能'], description: '知的な処理を機械で実現する技術領域の総称。' },
      { term: '生成AI', aliases: ['Generative AI', '生成 AI'], description: '文章・画像等を生成するAIの総称。' },
      { term: '機械学習', aliases: ['Machine Learning', 'ML'], description: 'データからパターンを学習し、予測や分類などを行う手法。' },
      { term: 'LLM', description: '大量のテキストで学習した大規模言語モデル。' },
      { term: 'OpenAI', description: 'ChatGPTやGPTシリーズなどを提供するAI企業。' },
      { term: 'Anthropic', description: 'Claudeシリーズなどを提供するAI企業。' },
      { term: 'ChatGPT', description: '対話に特化したLLMアプリケーション（OpenAI）。' },
      { term: 'Claude', description: '対話に特化したLLMアプリケーション（Anthropic）。' },
      { term: 'Gemini', description: 'GoogleのLLM/生成AIモデル・製品群。' },
      { term: 'GPT-3', description: 'OpenAIの大規模言語モデル世代の一つ。' },
      { term: 'GPT-4', description: 'OpenAIの大規模言語モデル世代の一つ。' },
      { term: 'GPT-5', description: 'OpenAIの大規模言語モデル世代の一つ。' },
      { term: 'LLMOps', description: 'LLMアプリの開発・運用（評価、監視、デプロイ等）を支えるプラクティス。' },
      { term: 'Prompt Engineering', aliases: ['プロンプトエンジニアリング'], description: '望ましい出力を得るためにプロンプトを設計・改善すること。' },
      { term: 'Prompt', aliases: ['プロンプト'], description: 'モデルへの指示文。' },
      { term: 'Token', aliases: ['トークン'], description: 'モデルが処理するテキストの単位。' },
      { term: 'Context Window', aliases: ['コンテキストウィンドウ'], description: '一度に扱えるトークン数の上限。' },
      { term: 'AI Agent', aliases: ['AIエージェント', 'Agent'], description: '目標達成のために計画・実行・ツール利用を行うソフトウェアエージェント。' },
      { term: 'Agentic AI', description: 'エージェント的振る舞い（計画・実行・反省等）を持つAIシステムの総称。' },
      { term: 'Agentic Coding', aliases: ['エージェントコーディング'], description: 'エージェントが計画・実装・検証までを自律的に進める開発スタイル。' },
      { term: 'MCP', aliases: ['Model Context Protocol'], description: 'モデルが外部ツール/コンテキストに接続するためのプロトコル（文脈により定義が異なる場合あり）。' },
      { term: 'RAG', description: '外部知識検索を組み合わせて回答精度を上げる手法。' },
      { term: 'Embedding', aliases: ['埋め込み'], description: 'テキスト等をベクトル化して類似検索等に使う表現。' },
      { term: 'Vector DB', aliases: ['ベクタDB', 'Vector Database'], description: 'ベクトルの近傍検索に最適化したデータベース。' },
      { term: 'Vector Search', aliases: ['ベクトル検索'], description: 'ベクトルの近さ（類似度）で検索する手法。' },
      { term: 'Data Mesh', aliases: ['データメッシュ'], description: 'データをプロダクトとして扱い、分散チームで提供・運用する考え方。' },
      { term: 'Fine-tuning', aliases: ['ファインチューニング'], description: '追加データでモデルを再学習して特化させる。' },
      { term: 'Hallucination', aliases: ['ハルシネーション'], description: 'もっともらしいが誤った内容を生成してしまう現象。' },
      { term: 'Temperature', description: '出力のランダム性を制御するパラメータ。' },
      { term: 'System Prompt', aliases: ['システムプロンプト'], description: '全体方針を与える上位の指示。' },
      { term: 'Tool Calling', aliases: ['関数呼び出し'], description: '外部ツールを呼び出して結果を統合する仕組み。' },
      { term: 'Claude Code', description: 'Claudeを用いた開発支援（CLI/IDE連携等）ツールや体験を指す呼び名。' },
      { term: 'Codex CLI', aliases: ['Codex'], description: 'ターミナル上で動くエージェント型のコーディング支援ツール（文脈により呼称が揺れる）。' },
      { term: 'Gemini CLI', description: 'Geminiを用いたコマンドライン開発支援ツールの呼び名。' },
      { term: 'AI-DLC', aliases: ['AI Development Life Cycle', 'AI DLC'], description: 'AI開発の要件→設計→実装→検証などのライフサイクル（プロジェクト流儀を含む）。' },
      { term: 'Spec-Driven Development', aliases: ['SDD', 'Spec Driven Development', '仕様駆動開発'], description: '要件/設計/タスクを明確化してから実装する開発スタイル。' },
    ],
  },
  {
    id: 'contractLegal',
    title: '契約・法務（準委任・請負・SLA等）用語図鑑',
    entries: [
      { term: '準委任', description: '成果物完成ではなく、業務遂行そのものを目的とする契約類型。' },
      { term: '請負', description: '成果物の完成を目的とし、完成義務を負う契約類型。' },
      { term: '委任', description: '法律行為の処理を委託する契約類型。' },
      { term: 'SES', aliases: ['システムエンジニアリングサービス'], description: '準委任に近い形で技術支援を提供する契約形態として用いられることが多い。' },
      { term: 'SLA', description: 'サービス提供者と利用者の合意（保証）水準。' },
      { term: 'SOW', aliases: ['Statement of Work'], description: '作業範囲、成果物、体制、前提等を定める作業記述書。' },
      { term: 'NDA', aliases: ['秘密保持契約'], description: '秘密情報の取り扱いを定める契約。' },
      { term: '検収', description: '成果物が要件を満たすか確認し受領する手続き。' },
      { term: '成果物', description: '契約上納品対象となるアウトプット（ソース、資料等）。' },
      { term: '契約不適合', aliases: ['瑕疵担保'], description: '引き渡し後に契約内容と異なる場合の責任。' },
      { term: '損害賠償', description: '契約違反等による損害を賠償する責任。' },
      { term: '再委託', description: '受託者が第三者へ業務を委ねること（許諾や条件が重要）。' },
    ],
  },
  // === CLI用語集 ===
  {
    id: 'git',
    title: 'Git用語図鑑',
    entries: GIT_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'npm',
    title: 'npm用語図鑑',
    entries: NPM_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'yarn',
    title: 'yarn用語図鑑',
    entries: YARN_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'pnpm',
    title: 'pnpm用語図鑑',
    entries: PNPM_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'pip',
    title: 'pip/Python用語図鑑',
    entries: PIP_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'docker',
    title: 'Docker用語図鑑',
    entries: DOCKER_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'linux',
    title: 'Linuxコマンド用語図鑑',
    entries: LINUX_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'windows',
    title: 'Windowsコマンド用語図鑑',
    entries: WINDOWS_GLOSSARY as unknown as GlossaryEntry[],
  },
  {
    id: 'powershell',
    title: 'PowerShell用語図鑑',
    entries: POWERSHELL_GLOSSARY as unknown as GlossaryEntry[],
  },
];

const GLOSSARIES: ReadonlyArray<GlossaryDefinition> = mergeTermNotationIntoGlossaries(BASE_GLOSSARIES);

const PROVIDER_SERVICE_GLOSSARIES: ReadonlySet<GlossaryId> = new Set([
  'awsServices',
  'azureServices',
  'gcpServices',
  'ociServices',
  'cloudflareServices',
]);

export const DEFAULT_ENABLED_GLOSSARIES: ReadonlyArray<GlossaryId> = GLOSSARIES
  .map((g) => g.id)
  .sort((a, b) => Number(PROVIDER_SERVICE_GLOSSARIES.has(a)) - Number(PROVIDER_SERVICE_GLOSSARIES.has(b)));

function normalizeKey(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function mergeTermNotationIntoGlossaries(glossaries: ReadonlyArray<GlossaryDefinition>): ReadonlyArray<GlossaryDefinition> {
  type EntryRef = { glossaryIndex: number; entryIndex: number };

  type MutableGlossaryDefinition = {
    id: GlossaryId;
    title: string;
    entries: GlossaryEntry[];
  };

  const targets: Readonly<Record<TermNotationDictionaryId, GlossaryId>> = {
    webTech: 'it',
    generativeAI: 'aiLlm',
    aws: 'awsServices',
    azure: 'azureServices',
    oci: 'ociServices'
  };

  const mergedGlossaries: MutableGlossaryDefinition[] = glossaries.map((glossary) => ({
    id: glossary.id,
    title: glossary.title,
    entries: [...glossary.entries]
  }));

  const refsByTermKey = new Map<string, EntryRef[]>();
  for (let glossaryIndex = 0; glossaryIndex < mergedGlossaries.length; glossaryIndex += 1) {
    const entries = mergedGlossaries[glossaryIndex].entries;
    for (let entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
      const key = normalizeKey(entries[entryIndex].term);
      const bucket = refsByTermKey.get(key) ?? [];
      bucket.push({ glossaryIndex, entryIndex });
      refsByTermKey.set(key, bucket);
    }
  }

  interface TermNotationGroup {
    correct: string;
    kind: TermNotationDictionaryId;
    aliases: Set<string>;
  }

  const groups = new Map<string, TermNotationGroup>();
  for (const [kind, rules] of Object.entries(TERM_NOTATION_DICTIONARIES) as Array<
    [TermNotationDictionaryId, ReadonlyArray<readonly [string, string]>]
  >) {
    for (const [incorrect, correct] of rules) {
      const correctKey = normalizeKey(correct);
      const group = groups.get(correctKey) ?? {
        correct,
        kind,
        aliases: new Set<string>()
      };

      if (normalizeKey(incorrect) !== correctKey) {
        group.aliases.add(incorrect);
      }

      groups.set(correctKey, group);
    }
  }

  const mergeAliases = (
    term: string,
    existing: ReadonlyArray<string> | undefined,
    additions: ReadonlyArray<string>
  ): string[] | undefined => {
    if (additions.length === 0) {
      return existing ? [...existing] : undefined;
    }

    const termKey = normalizeKey(term);
    const base = [...(existing ?? [])];
    const seen = new Set<string>(base.map((v) => normalizeKey(v)));
    const extra: string[] = [];

    for (const value of additions) {
      const key = normalizeKey(value);
      if (!key || key === termKey || seen.has(key)) {
        continue;
      }
      seen.add(key);
      extra.push(value);
    }

    if (extra.length === 0) {
      return existing ? [...existing] : undefined;
    }

    return [...base, ...extra];
  };

  for (const group of groups.values()) {
    const correctKey = normalizeKey(group.correct);
    const refs = refsByTermKey.get(correctKey);

    if (refs && refs.length > 0) {
      if (group.aliases.size === 0) {
        continue;
      }

      const additions = [...group.aliases];
      for (const ref of refs) {
        const glossary = mergedGlossaries[ref.glossaryIndex];
        const entry = glossary.entries[ref.entryIndex];
        const merged = mergeAliases(entry.term, entry.aliases, additions);
        if (merged) {
          glossary.entries[ref.entryIndex] = { ...entry, aliases: merged };
        }
      }
      continue;
    }

    const targetId = targets[group.kind];
    const targetIndex = mergedGlossaries.findIndex((g) => g.id === targetId);
    if (targetIndex === -1) {
      continue;
    }

    const aliases = [...group.aliases];
    const newEntry: GlossaryEntry = {
      term: group.correct,
      aliases: aliases.length > 0 ? aliases : undefined,
      description: `技術用語の推奨表記は「${group.correct}」です。`
    };

    const newGlossary = mergedGlossaries[targetIndex];
    mergedGlossaries[targetIndex] = {
      ...newGlossary,
      entries: [...newGlossary.entries, newEntry]
    };

    refsByTermKey.set(correctKey, [
      { glossaryIndex: targetIndex, entryIndex: mergedGlossaries[targetIndex].entries.length - 1 }
    ]);
  }

  return mergedGlossaries;
}

const GLOSSARY_INDEX: ReadonlyMap<string, ReadonlyArray<GlossaryHit>> = (() => {
  const index = new Map<string, GlossaryHit[]>();

  for (const glossary of GLOSSARIES) {
    for (const entry of glossary.entries) {
      const candidates = [entry.term, ...(entry.aliases ?? []), ...(entry.synonyms ?? [])];
      for (const candidate of candidates) {
        const key = normalizeKey(candidate);
        if (!key) {
          continue;
        }

        const bucket = index.get(key) ?? [];
        bucket.push({
          id: glossary.id,
          title: glossary.title,
          term: entry.term,
          description: entry.description,
          aliases: entry.aliases,
          synonyms: entry.synonyms,
          antonyms: entry.antonyms,
        });
        index.set(key, bucket);
      }
    }
  }

  return index;
})();

function bestHitForCandidate(candidate: string, rank: ReadonlyMap<GlossaryId, number>): GlossaryHit | null {
  const hits = GLOSSARY_INDEX.get(normalizeKey(candidate));
  if (!hits || hits.length === 0) {
    return null;
  }

  let best: GlossaryHit | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const hit of hits) {
    const r = rank.get(hit.id);
    if (r === undefined) {
      continue;
    }
    if (r < bestRank) {
      bestRank = r;
      best = hit;
    }
  }

  return best;
}

export function createGlossaryRank(enabledGlossaries: ReadonlyArray<GlossaryId>): ReadonlyMap<GlossaryId, number> {
  const rank = new Map<GlossaryId, number>();
  enabledGlossaries.forEach((id, i) => rank.set(id, i));
  return rank;
}

export function findGlossaryHitWithRank(token: Token, rank: ReadonlyMap<GlossaryId, number>): GlossaryHit | null {
  const candidates = [token.baseForm, token.surface].filter((v): v is string => !!v && v !== '*');

  for (const candidate of candidates) {
    const hits = GLOSSARY_INDEX.get(normalizeKey(candidate));
    if (!hits || hits.length === 0) {
      continue;
    }

    let best: GlossaryHit | null = null;
    let bestRank = Number.POSITIVE_INFINITY;
    for (const hit of hits) {
      const r = rank.get(hit.id);
      if (r === undefined) {
        continue;
      }
      if (r < bestRank) {
        bestRank = r;
        best = hit;
      }
    }
    if (best) {
      return best;
    }
  }

  return null;
}

function expandRun(
  text: string,
  offset: number,
  isTermChar: (ch: string) => boolean
): { start: number; end: number } | null {
  if (offset < 0 || offset >= text.length) {
    return null;
  }
  if (!isTermChar(text[offset])) {
    return null;
  }

  let start = offset;
  let end = offset + 1;
  while (start > 0 && isTermChar(text[start - 1])) {
    start -= 1;
  }
  while (end < text.length && isTermChar(text[end])) {
    end += 1;
  }
  return { start, end };
}

export function hasGlossaryEntry(candidate: string): boolean {
  return GLOSSARY_INDEX.has(normalizeKey(candidate));
}

export function getGlossaryEntryCount(): number {
  return GLOSSARIES.reduce((sum, glossary) => sum + glossary.entries.length, 0);
}

export function getGlossaryDefinitions(): ReadonlyArray<{
  id: GlossaryId;
  title: string;
  entries: ReadonlyArray<{
    term: string;
    aliases?: ReadonlyArray<string>;
    synonyms?: ReadonlyArray<string>;
    antonyms?: ReadonlyArray<string>;
    description: string;
  }>;
}> {
  return GLOSSARIES;
}

export function findGlossaryMatchWithRank(
  text: string,
  offset: number,
  rank: ReadonlyMap<GlossaryId, number>
): GlossaryMatch | null {

  const candidates: Array<{ value: string; start: number; end: number }> = [];
  const seen = new Set<string>();

  const windowSize = 80;
  const windowStart = Math.max(0, offset - windowSize);
  const windowEnd = Math.min(text.length, offset + windowSize);
  const windowText = text.slice(windowStart, windowEnd);

  PHRASE_REGEX.lastIndex = 0;
  for (const m of windowText.matchAll(PHRASE_REGEX)) {
    if (m.index === undefined) {
      continue;
    }
    const matchValue = m[0];
    const absStart = windowStart + m.index;
    const absEnd = absStart + matchValue.length;
    if (offset < absStart || offset >= absEnd) {
      continue;
    }

    const relOffset = offset - absStart;
    const wordSegments: Array<{ start: number; end: number }> = [];
    WORD_REGEX.lastIndex = 0;
    for (const w of matchValue.matchAll(WORD_REGEX)) {
      if (w.index === undefined) {
        continue;
      }
      wordSegments.push({ start: w.index, end: w.index + w[0].length });
    }
    if (wordSegments.length === 0) {
      continue;
    }

    let centerIndex = wordSegments.findIndex((seg) => relOffset >= seg.start && relOffset < seg.end);
    if (centerIndex === -1) {
      // カーソルが語と語の間（スペース等）にある場合、最も近い語を中心として扱う
      let leftIndex = -1;
      for (let i = 0; i < wordSegments.length; i += 1) {
        if (wordSegments[i].end <= relOffset) {
          leftIndex = i;
        }
      }
      if (leftIndex !== -1) {
        centerIndex = leftIndex;
      } else {
        const rightIndex = wordSegments.findIndex((seg) => seg.start > relOffset);
        if (rightIndex !== -1) {
          centerIndex = rightIndex;
        } else {
          continue;
        }
      }
    }

    for (let s = 0; s <= centerIndex; s += 1) {
      for (let e = centerIndex; e < wordSegments.length; e += 1) {
        const startRel = wordSegments[s].start;
        const endRel = wordSegments[e].end;
        const value = matchValue.slice(startRel, endRel);
        const key = normalizeKey(value);
        if (!key || seen.has(key)) {
          continue;
        }
        seen.add(key);
        candidates.push({ value, start: absStart + startRel, end: absStart + endRel });
      }
    }
  }

  const isAsciiTermChar = (ch: string): boolean => ASCII_TERM_CHAR_RE.test(ch);
  const asciiRun = expandRun(text, offset, isAsciiTermChar);
  if (asciiRun) {
    const value = text.slice(asciiRun.start, asciiRun.end);
    const key = normalizeKey(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      candidates.push({ value, start: asciiRun.start, end: asciiRun.end });
    }
  }

  const isCjkTermChar = (ch: string): boolean => CJK_TERM_CHAR_RE.test(ch);
  const cjkRun = expandRun(text, offset, isCjkTermChar);
  if (cjkRun) {
    const value = text.slice(cjkRun.start, cjkRun.end);
    const key = normalizeKey(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      candidates.push({ value, start: cjkRun.start, end: cjkRun.end });
    }
  }

  // 例: VPCエンドポイント / DBインスタンス のような混在語（英数字+日本語）を拾う
  const isMixedTermChar = (ch: string): boolean =>
    MIXED_ASCII_TERM_CHAR_RE.test(ch) || MIXED_CJK_TERM_CHAR_RE.test(ch);
  const mixedRun = expandRun(text, offset, isMixedTermChar);
  if (mixedRun) {
    const value = text.slice(mixedRun.start, mixedRun.end);
    const key = normalizeKey(value);
    if (key && !seen.has(key)) {
      seen.add(key);
      candidates.push({ value, start: mixedRun.start, end: mixedRun.end });
    }
  }

  let best: GlossaryMatch | null = null;
  let bestLen = -1;
  let bestRank = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const hit = bestHitForCandidate(candidate.value, rank);
    if (!hit) {
      continue;
    }
    const keyLen = normalizeKey(candidate.value).length;
    const r = rank.get(hit.id) ?? Number.POSITIVE_INFINITY;
    if (keyLen > bestLen || (keyLen === bestLen && r < bestRank)) {
      bestLen = keyLen;
      bestRank = r;
      best = {
        hit,
        range: { start: candidate.start, end: candidate.end },
      };
    }
  }

  return best;
}

export function findGlossaryHit(token: Token, enabledGlossaries: ReadonlyArray<GlossaryId>): GlossaryHit | null {
  return findGlossaryHitWithRank(token, createGlossaryRank(enabledGlossaries));
}

export function findGlossaryMatch(
  text: string,
  offset: number,
  enabledGlossaries: ReadonlyArray<GlossaryId>
): GlossaryMatch | null {
  return findGlossaryMatchWithRank(text, offset, createGlossaryRank(enabledGlossaries));
}

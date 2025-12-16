/**
 * pnpm用語集
 * pnpmコマンド・サブコマンド・オプションの説明
 */

import { CliGlossaryEntry } from './gitGlossary';

export const PNPM_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本 ===
  { term: 'pnpm', description: '高速でディスク効率の良いNode.jsパッケージマネージャー。ハードリンクとシンボリックリンクを活用。' },
  { term: 'pnpm init', description: 'package.jsonを対話的に作成する。' },

  // === インストール ===
  { term: 'pnpm install', description: 'package.jsonの依存パッケージをインストールする。', aliases: ['pnpm i'] },
  { term: 'pnpm install --frozen-lockfile', description: 'pnpm-lock.yamlを変更せずにインストール。CI環境向け。' },
  { term: 'pnpm install --lockfile-only', description: 'pnpm-lock.yamlのみ更新。' },
  { term: 'pnpm install --offline', description: 'オフラインモードでインストール。' },
  { term: 'pnpm install --prefer-offline', description: 'キャッシュを優先して使用する。' },
  { term: 'pnpm install --prod', description: 'devDependenciesを除いてインストール。', aliases: ['pnpm install -P', 'pnpm install --production'] },
  { term: 'pnpm install --dev', description: 'devDependenciesのみインストール。', aliases: ['pnpm install -D'] },
  { term: 'pnpm install --no-optional', description: 'optionalDependenciesを無視。' },
  { term: 'pnpm install --ignore-scripts', description: 'インストールスクリプトを実行しない。' },
  { term: 'pnpm install --shamefully-hoist', description: 'node_modulesをフラット化（npm互換モード）。' },
  { term: 'pnpm install --force', description: '依存関係を強制的に再インストール。' },
  { term: 'pnpm install --fix-lockfile', description: 'ロックファイルを修正。' },
  { term: 'pnpm install --reporter', description: '出力形式を指定（default/append-only/ndjson/silent）。' },
  { term: 'pnpm install --strict-peer-dependencies', description: 'peerDependenciesを厳格にチェック。' },

  // === パッケージ追加 ===
  { term: 'pnpm add', description: 'パッケージを追加してインストールする。' },
  { term: 'pnpm add <package>', description: '指定パッケージをdependenciesに追加。' },
  { term: 'pnpm add --save-dev', description: 'devDependenciesに追加してインストール。', aliases: ['pnpm add -D'] },
  { term: 'pnpm add --save-peer', description: 'peerDependenciesに追加してインストール。' },
  { term: 'pnpm add --save-optional', description: 'optionalDependenciesに追加してインストール。', aliases: ['pnpm add -O'] },
  { term: 'pnpm add --save-exact', description: '正確なバージョンで追加（^なし）。', aliases: ['pnpm add -E'] },
  { term: 'pnpm add --global', description: 'グローバルにインストールする。', aliases: ['pnpm add -g'] },
  { term: 'pnpm add --workspace', description: 'ワークスペースパッケージから追加。', aliases: ['pnpm add -w'] },
  { term: 'pnpm add --filter', description: '指定ワークスペースにのみ追加。' },
  { term: 'pnpm add --ignore-workspace-root-check', description: 'ワークスペースルートへの追加を許可。', aliases: ['pnpm add -W'] },

  // === パッケージ削除 ===
  { term: 'pnpm remove', description: 'パッケージを削除する。', aliases: ['pnpm rm', 'pnpm uninstall', 'pnpm un'] },
  { term: 'pnpm remove <package>', description: '指定パッケージを削除。' },
  { term: 'pnpm remove --global', description: 'グローバルパッケージを削除。', aliases: ['pnpm remove -g'] },
  { term: 'pnpm remove --save-dev', description: 'devDependenciesから削除。', aliases: ['pnpm remove -D'] },

  // === 更新 ===
  { term: 'pnpm update', description: '依存パッケージを更新する。', aliases: ['pnpm up', 'pnpm upgrade'] },
  { term: 'pnpm update <package>', description: '指定パッケージを更新。' },
  { term: 'pnpm update --latest', description: '最新バージョンに更新（package.jsonも更新）。', aliases: ['pnpm update -L'] },
  { term: 'pnpm update --global', description: 'グローバルパッケージを更新。', aliases: ['pnpm update -g'] },
  { term: 'pnpm update --recursive', description: 'ワークスペース全体を更新。', aliases: ['pnpm update -r'] },
  { term: 'pnpm update --interactive', description: '対話的にパッケージを更新。', aliases: ['pnpm update -i'] },
  { term: 'pnpm update --prod', description: 'productionの依存のみ更新。', aliases: ['pnpm update -P'] },
  { term: 'pnpm update --dev', description: 'devDependenciesのみ更新。', aliases: ['pnpm update -D'] },

  // === 実行 ===
  { term: 'pnpm run', description: 'package.jsonのscriptsを実行する。' },
  { term: 'pnpm run <script>', description: '指定したスクリプトを実行する。' },
  { term: 'pnpm <script>', description: 'pnpm run <script>の省略形。' },
  { term: 'pnpm run --recursive', description: '全ワークスペースでスクリプトを実行。', aliases: ['pnpm run -r'] },
  { term: 'pnpm run --filter', description: '指定ワークスペースでスクリプトを実行。' },
  { term: 'pnpm run --parallel', description: 'スクリプトを並列実行。' },
  { term: 'pnpm run --if-present', description: 'スクリプトが存在する場合のみ実行。' },
  { term: 'pnpm start', description: '"start"スクリプトを実行する。' },
  { term: 'pnpm test', description: '"test"スクリプトを実行する。', aliases: ['pnpm t'] },

  { term: 'pnpm exec', description: 'node_modules/.bin内のコマンドを実行。' },
  { term: 'pnpm exec <command>', description: '指定コマンドを実行。' },
  { term: 'pnpm exec --recursive', description: '全ワークスペースで実行。', aliases: ['pnpm exec -r'] },
  { term: 'pnpm exec --filter', description: '指定ワークスペースで実行。' },

  { term: 'pnpm dlx', description: 'パッケージを一時的にインストールして実行。npxと同様。' },
  { term: 'pnpm dlx <package>', description: '指定パッケージを実行。' },
  { term: 'pnpm dlx --package', description: '追加パッケージを指定して実行。', aliases: ['pnpm dlx -p'] },

  { term: 'pnpm create', description: 'create-*パッケージを実行。' },

  // === 情報表示 ===
  { term: 'pnpm list', description: 'インストール済みパッケージを表示。', aliases: ['pnpm ls'] },
  { term: 'pnpm list --depth', description: '表示する依存の深さを指定。' },
  { term: 'pnpm list --global', description: 'グローバルパッケージを表示。', aliases: ['pnpm list -g'] },
  { term: 'pnpm list --recursive', description: '全ワークスペースの依存を表示。', aliases: ['pnpm list -r'] },
  { term: 'pnpm list --json', description: 'JSON形式で出力。' },
  { term: 'pnpm list --long', description: '詳細情報を表示。' },
  { term: 'pnpm list --dev', description: 'devDependenciesのみ表示。', aliases: ['pnpm list -D'] },
  { term: 'pnpm list --prod', description: 'productionの依存のみ表示。', aliases: ['pnpm list -P'] },
  { term: 'pnpm list --parseable', description: 'パース可能な形式で出力。' },

  { term: 'pnpm outdated', description: '更新可能なパッケージを表示する。' },
  { term: 'pnpm outdated --recursive', description: '全ワークスペースで確認。', aliases: ['pnpm outdated -r'] },
  { term: 'pnpm outdated --global', description: 'グローバルで確認。', aliases: ['pnpm outdated -g'] },
  { term: 'pnpm outdated --long', description: '詳細情報を表示。' },
  { term: 'pnpm outdated --json', description: 'JSON形式で出力。' },

  { term: 'pnpm why', description: 'パッケージがインストールされている理由を表示。' },
  { term: 'pnpm why <package>', description: '指定パッケージの依存理由を表示。' },
  { term: 'pnpm why --recursive', description: '全ワークスペースで確認。', aliases: ['pnpm why -r'] },
  { term: 'pnpm why --json', description: 'JSON形式で出力。' },

  // === 公開 ===
  { term: 'pnpm publish', description: 'パッケージをnpmレジストリに公開する。' },
  { term: 'pnpm publish --access public', description: 'スコープ付きパッケージを公開として公開。' },
  { term: 'pnpm publish --tag', description: '指定タグで公開する。' },
  { term: 'pnpm publish --dry-run', description: '実際には公開せず、何が行われるか確認。' },
  { term: 'pnpm publish --no-git-checks', description: 'Gitチェックをスキップ。' },
  { term: 'pnpm publish --recursive', description: '全ワークスペースを公開。', aliases: ['pnpm publish -r'] },
  { term: 'pnpm publish --filter', description: '指定ワークスペースのみ公開。' },

  { term: 'pnpm pack', description: 'パッケージをtarballにパックする。' },

  // === セキュリティ ===
  { term: 'pnpm audit', description: '依存関係の脆弱性をチェックする。' },
  { term: 'pnpm audit --json', description: 'JSON形式で出力。' },
  { term: 'pnpm audit --prod', description: 'productionの依存のみチェック。' },
  { term: 'pnpm audit --dev', description: 'devDependenciesのみチェック。' },
  { term: 'pnpm audit fix', description: '脆弱性を自動修正する。' },

  { term: 'pnpm licenses', description: '依存パッケージのライセンス情報を表示。' },
  { term: 'pnpm licenses list', description: 'ライセンス一覧を表示。' },

  // === ストア管理 ===
  { term: 'pnpm store', description: 'pnpmストアを管理する。' },
  { term: 'pnpm store status', description: 'ストアのステータスを表示。' },
  { term: 'pnpm store add', description: 'ストアにパッケージを追加。' },
  { term: 'pnpm store prune', description: '未使用パッケージをストアから削除。' },
  { term: 'pnpm store path', description: 'ストアのパスを表示。' },

  // === 設定 ===
  { term: 'pnpm config', description: 'pnpm設定を管理する。', aliases: ['pnpm c'] },
  { term: 'pnpm config list', description: '現在の設定を表示。' },
  { term: 'pnpm config get', description: '指定した設定値を取得。' },
  { term: 'pnpm config set', description: '設定値を設定する。' },
  { term: 'pnpm config delete', description: '設定を削除する。' },

  // === ワークスペース・フィルタ ===
  { term: '--filter', description: '対象ワークスペースをフィルタリングする。', aliases: ['-F'] },
  { term: '--filter <pattern>', description: 'パターンに一致するワークスペースを対象。' },
  { term: '--filter <name>', description: '指定名のワークスペースを対象。' },
  { term: '--filter <name>...', description: '指定パッケージとその依存を対象。' },
  { term: '--filter ...<name>', description: '指定パッケージに依存するパッケージを対象。' },
  { term: '--filter "<name>..."', description: '指定パッケージとその全依存を対象。' },
  { term: '--filter "...^<name>"', description: '指定パッケージ自身を除く依存先を対象。' },
  { term: '--filter "[<commit>]"', description: '指定コミット以降に変更されたパッケージを対象。' },
  { term: '--filter "!<pattern>"', description: 'パターンに一致しないパッケージを対象。' },
  { term: '--filter-prod', description: 'productionの依存でフィルタ。' },

  { term: '--recursive', description: '全ワークスペースを対象にする。', aliases: ['-r'] },
  { term: '--workspace-concurrency', description: 'ワークスペースの並列実行数を設定。' },

  { term: 'pnpm -w', description: 'ワークスペースルートで操作。', aliases: ['pnpm --workspace-root'] },

  // === リンク ===
  { term: 'pnpm link', description: 'パッケージをリンクする。', aliases: ['pnpm ln'] },
  { term: 'pnpm link --global', description: 'グローバルにリンク。', aliases: ['pnpm link -g'] },
  { term: 'pnpm unlink', description: 'リンクを解除する。' },

  // === その他 ===
  { term: 'pnpm rebuild', description: 'ネイティブアドオンを再ビルドする。', aliases: ['pnpm rb'] },
  { term: 'pnpm rebuild --recursive', description: '全ワークスペースで再ビルド。', aliases: ['pnpm rebuild -r'] },

  { term: 'pnpm prune', description: '不要なパッケージを削除する。' },
  { term: 'pnpm prune --prod', description: 'devDependenciesを削除。' },

  { term: 'pnpm dedupe', description: '重複した依存を整理する。' },
  { term: 'pnpm dedupe --check', description: '重複があるかチェック（変更しない）。' },

  { term: 'pnpm fetch', description: 'ロックファイルに基づいてストアにフェッチ。' },

  { term: 'pnpm import', description: '他のパッケージマネージャーのロックファイルからインポート。' },

  { term: 'pnpm root', description: 'node_modulesのパスを表示。' },
  { term: 'pnpm root --global', description: 'グローバルnode_modulesのパスを表示。', aliases: ['pnpm root -g'] },

  { term: 'pnpm bin', description: 'node_modules/.binのパスを表示。' },
  { term: 'pnpm bin --global', description: 'グローバルbinのパスを表示。', aliases: ['pnpm bin -g'] },

  { term: 'pnpm env', description: 'Node.jsバージョンを管理する。' },
  { term: 'pnpm env use', description: '指定バージョンのNode.jsを使用。' },
  { term: 'pnpm env list', description: '利用可能なNode.jsバージョンを表示。' },
  { term: 'pnpm env remove', description: 'Node.jsバージョンを削除。' },

  { term: 'pnpm doctor', description: 'pnpm環境の問題を診断する。' },

  { term: 'pnpm setup', description: 'pnpmをPATHに追加する。' },

  { term: 'pnpm patch', description: 'パッケージにパッチを適用する。' },
  { term: 'pnpm patch <package>', description: '指定パッケージをパッチ用に展開。' },
  { term: 'pnpm patch-commit', description: 'パッチを確定する。' },
  { term: 'pnpm patch-remove', description: 'パッチを削除する。' },

  { term: 'pnpm server', description: 'pnpmサーバーを管理する。' },
  { term: 'pnpm server start', description: 'サーバーを起動。' },
  { term: 'pnpm server stop', description: 'サーバーを停止。' },
  { term: 'pnpm server status', description: 'サーバーの状態を確認。' },

  { term: 'pnpm help', description: 'ヘルプを表示する。' },
  { term: 'pnpm --version', description: 'pnpmのバージョンを表示。', aliases: ['pnpm -v'] },

  // === ファイル関連 ===
  { term: 'pnpm-lock.yaml', description: '依存関係の正確なバージョンを固定するロックファイル。' },
  { term: '.npmrc', description: 'pnpm/npm共通の設定ファイル。' },
  { term: 'pnpm-workspace.yaml', description: 'ワークスペースのパッケージを定義するファイル。' },
  { term: '.pnpmfile.cjs', description: 'pnpmフックを定義するファイル。' },

  // === 概念・用語 ===
  { term: 'content-addressable store', description: 'ハッシュベースでパッケージを管理するストア。重複を排除。' },
  { term: 'virtual store', description: 'node_modules/.pnpm内の仮想ストア。' },
  { term: 'hard link', description: '同一ファイルを参照するハードリンク。ディスク容量を節約。' },
  { term: 'symbolic link', description: 'パッケージ間の依存を表すシンボリックリンク。' },
  { term: 'hoisting', description: '依存をnode_modulesのルートに引き上げる動作。' },
  { term: 'shamefully-hoist', description: 'npm互換のフラットなnode_modulesを生成。' },
  { term: 'side-effects cache', description: 'postinstallなどの副作用をキャッシュ。' },
  { term: 'workspace protocol', description: 'workspace:*でワークスペースパッケージを参照。' },
  { term: 'catalog', description: 'バージョンを集中管理するカタログ機能。' },
];

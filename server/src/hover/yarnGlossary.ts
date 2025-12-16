/**
 * yarn用語集
 * yarnコマンド・サブコマンド・オプションの説明
 * Yarn Classic (v1) と Yarn Berry (v2+) をカバー
 */

import { CliGlossaryEntry } from './gitGlossary';

export const YARN_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本 ===
  { term: 'yarn', description: 'Facebookが開発したNode.jsパッケージマネージャー。高速で信頼性の高い依存関係管理。' },
  { term: 'yarn init', description: 'package.jsonを対話的に作成する。' },
  { term: 'yarn init -y', description: 'デフォルト設定でpackage.jsonを作成。', aliases: ['yarn init --yes'] },
  { term: 'yarn init -2', description: 'Yarn Berry (v2+) で初期化する。' },

  // === インストール ===
  { term: 'yarn install', description: 'package.jsonの依存パッケージをインストールする。', aliases: ['yarn'] },
  { term: 'yarn install --frozen-lockfile', description: 'yarn.lockを変更せずにインストール。CI環境向け。' },
  { term: 'yarn install --immutable', description: 'yarn.lockの変更を許可しない（Berry）。' },
  { term: 'yarn install --production', description: 'devDependenciesを除いてインストール。' },
  { term: 'yarn install --ignore-scripts', description: 'インストールスクリプトを実行しない。' },
  { term: 'yarn install --offline', description: 'オフラインモードでインストール。' },
  { term: 'yarn install --prefer-offline', description: 'キャッシュを優先して使用する。' },
  { term: 'yarn install --force', description: '依存関係を再取得する。' },
  { term: 'yarn install --check-files', description: 'node_modulesの整合性をチェック。' },
  { term: 'yarn install --flat', description: '依存の重複を排除してフラットにインストール。' },
  { term: 'yarn install --pure-lockfile', description: 'yarn.lockを生成しない。' },
  { term: 'yarn install --no-lockfile', description: 'yarn.lockを読み込まない。' },
  { term: 'yarn install --silent', description: '出力を抑制する。', aliases: ['yarn install -s'] },
  { term: 'yarn install --ignore-engines', description: 'engines要件を無視する。' },
  { term: 'yarn install --ignore-optional', description: 'optionalDependenciesを無視。' },
  { term: 'yarn install --focus', description: 'ワークスペースの依存のみインストール（Berry）。' },

  // === パッケージ追加 ===
  { term: 'yarn add', description: 'パッケージを追加してインストールする。' },
  { term: 'yarn add <package>', description: '指定パッケージをdependenciesに追加。' },
  { term: 'yarn add --dev', description: 'devDependenciesに追加してインストール。', aliases: ['yarn add -D'] },
  { term: 'yarn add --peer', description: 'peerDependenciesに追加してインストール。', aliases: ['yarn add -P'] },
  { term: 'yarn add --optional', description: 'optionalDependenciesに追加してインストール。', aliases: ['yarn add -O'] },
  { term: 'yarn add --exact', description: '正確なバージョンで追加（^なし）。', aliases: ['yarn add -E'] },
  { term: 'yarn add --tilde', description: 'チルダ範囲で追加（~1.2.3）。', aliases: ['yarn add -T'] },
  { term: 'yarn add --ignore-workspace-root-check', description: 'ワークスペースルートへの追加を許可。', aliases: ['yarn add -W'] },
  { term: 'yarn add --cached', description: 'キャッシュからのみ追加する。' },
  { term: 'yarn add --interactive', description: '対話的にバージョンを選択（Berry）。', aliases: ['yarn add -i'] },

  // === パッケージ削除 ===
  { term: 'yarn remove', description: 'パッケージを削除する。' },
  { term: 'yarn remove <package>', description: '指定パッケージを削除。' },

  // === 更新 ===
  { term: 'yarn upgrade', description: '依存パッケージを更新する。' },
  { term: 'yarn upgrade <package>', description: '指定パッケージを更新。' },
  { term: 'yarn upgrade --latest', description: '最新バージョンに更新（package.jsonも更新）。', aliases: ['yarn upgrade -L'] },
  { term: 'yarn upgrade --pattern', description: 'パターンに一致するパッケージを更新。' },
  { term: 'yarn upgrade --scope', description: '指定スコープのパッケージを更新。', aliases: ['yarn upgrade -S'] },
  { term: 'yarn upgrade-interactive', description: '対話的にパッケージを更新。' },
  { term: 'yarn upgrade-interactive --latest', description: '対話的に最新バージョンへ更新。' },

  { term: 'yarn up', description: 'パッケージを更新する（Berry）。' },
  { term: 'yarn up <package>', description: '指定パッケージを更新（Berry）。' },
  { term: 'yarn up --interactive', description: '対話的にパッケージを更新（Berry）。', aliases: ['yarn up -i'] },

  // === 実行 ===
  { term: 'yarn run', description: 'package.jsonのscriptsを実行する。' },
  { term: 'yarn run <script>', description: '指定したスクリプトを実行する。' },
  { term: 'yarn <script>', description: 'yarn run <script>の省略形。' },
  { term: 'yarn start', description: '"start"スクリプトを実行する。' },
  { term: 'yarn test', description: '"test"スクリプトを実行する。' },
  { term: 'yarn build', description: '"build"スクリプトを実行する。' },

  { term: 'yarn exec', description: 'パッケージのバイナリを実行する。' },
  { term: 'yarn dlx', description: 'パッケージを一時的にインストールして実行（Berry）。npxと同様。' },

  { term: 'yarn node', description: 'PnPに対応したNode.jsを実行（Berry）。' },

  // === 情報表示 ===
  { term: 'yarn list', description: 'インストール済みパッケージを表示。', aliases: ['yarn ls'] },
  { term: 'yarn list --depth', description: '表示する依存の深さを指定。' },
  { term: 'yarn list --pattern', description: 'パターンに一致するパッケージを表示。' },
  { term: 'yarn list --json', description: 'JSON形式で出力。' },

  { term: 'yarn outdated', description: '更新可能なパッケージを表示する。' },

  { term: 'yarn info', description: 'パッケージの詳細情報を表示。' },
  { term: 'yarn info <package>', description: '指定パッケージの情報を表示。' },
  { term: 'yarn info <package> versions', description: '利用可能な全バージョンを表示。' },
  { term: 'yarn info --json', description: 'JSON形式で出力。' },

  { term: 'yarn npm info', description: 'npmレジストリからパッケージ情報を取得（Berry）。' },

  { term: 'yarn why', description: 'パッケージがインストールされている理由を表示。' },
  { term: 'yarn explain', description: 'エラーコードの詳細を表示（Berry）。' },

  // === 公開 ===
  { term: 'yarn publish', description: 'パッケージをnpmレジストリに公開する。' },
  { term: 'yarn publish --access public', description: 'スコープ付きパッケージを公開として公開。' },
  { term: 'yarn publish --access restricted', description: 'スコープ付きパッケージを非公開として公開。' },
  { term: 'yarn publish --tag', description: '指定タグで公開する。' },
  { term: 'yarn publish --new-version', description: 'バージョンを指定して公開。' },
  { term: 'yarn publish --dry-run', description: '実際には公開せず、何が行われるか確認。' },

  { term: 'yarn npm publish', description: 'npmレジストリに公開（Berry）。' },

  { term: 'yarn pack', description: 'パッケージをtarballにパックする。' },
  { term: 'yarn pack --filename', description: '出力ファイル名を指定。' },
  { term: 'yarn pack --dry-run', description: '実際にはパックせず、含まれるファイルを表示。' },

  // === バージョン管理 ===
  { term: 'yarn version', description: 'パッケージのバージョンを更新する。' },
  { term: 'yarn version --major', description: 'メジャーバージョンを上げる。' },
  { term: 'yarn version --minor', description: 'マイナーバージョンを上げる。' },
  { term: 'yarn version --patch', description: 'パッチバージョンを上げる。' },
  { term: 'yarn version --premajor', description: 'プレリリース付きメジャーバージョンに更新。' },
  { term: 'yarn version --preminor', description: 'プレリリース付きマイナーバージョンに更新。' },
  { term: 'yarn version --prepatch', description: 'プレリリース付きパッチバージョンに更新。' },
  { term: 'yarn version --prerelease', description: 'プレリリース番号を上げる。' },
  { term: 'yarn version --new-version', description: '指定バージョンに更新。' },
  { term: 'yarn version --no-git-tag-version', description: 'Gitタグを作成しない。' },

  // === セキュリティ ===
  { term: 'yarn audit', description: '依存関係の脆弱性をチェックする。' },
  { term: 'yarn audit --json', description: 'JSON形式で出力。' },
  { term: 'yarn audit --groups', description: '指定グループのみチェック。' },
  { term: 'yarn audit --level', description: '指定レベル以上の脆弱性のみ表示。' },

  { term: 'yarn npm audit', description: '脆弱性をチェック（Berry）。' },

  // === キャッシュ ===
  { term: 'yarn cache', description: 'yarnキャッシュを管理する。' },
  { term: 'yarn cache list', description: 'キャッシュの内容を表示。' },
  { term: 'yarn cache dir', description: 'キャッシュディレクトリのパスを表示。' },
  { term: 'yarn cache clean', description: 'キャッシュを削除する。' },
  { term: 'yarn cache clean <package>', description: '指定パッケージのキャッシュを削除。' },

  // === 設定 ===
  { term: 'yarn config', description: 'yarn設定を管理する。' },
  { term: 'yarn config list', description: '現在の設定を表示。' },
  { term: 'yarn config get', description: '指定した設定値を取得。' },
  { term: 'yarn config set', description: '設定値を設定する。' },
  { term: 'yarn config delete', description: '設定を削除する。' },
  { term: 'yarn config set registry', description: 'レジストリURLを設定する。' },

  // === リンク ===
  { term: 'yarn link', description: 'パッケージをグローバルにシンボリックリンク。' },
  { term: 'yarn link <package>', description: 'グローバルリンクをローカルにリンク。' },
  { term: 'yarn unlink', description: 'シンボリックリンクを解除する。' },

  // === ワークスペース ===
  { term: 'yarn workspaces', description: 'ワークスペースを管理する。' },
  { term: 'yarn workspaces info', description: 'ワークスペースの情報を表示。' },
  { term: 'yarn workspaces list', description: 'ワークスペース一覧を表示（Berry）。' },
  { term: 'yarn workspaces foreach', description: '各ワークスペースでコマンドを実行（Berry）。' },
  { term: 'yarn workspaces focus', description: '指定ワークスペースの依存のみインストール（Berry）。' },
  { term: 'yarn workspace', description: '指定ワークスペースでコマンドを実行。' },
  { term: 'yarn workspace <name> <command>', description: '指定ワークスペースでコマンドを実行。' },
  { term: 'yarn workspace <name> add', description: '指定ワークスペースにパッケージを追加。' },
  { term: 'yarn workspace <name> remove', description: '指定ワークスペースからパッケージを削除。' },

  // === その他 ===
  { term: 'yarn global', description: 'グローバルパッケージを管理（Classic）。' },
  { term: 'yarn global add', description: 'グローバルにパッケージを追加（Classic）。' },
  { term: 'yarn global remove', description: 'グローバルパッケージを削除（Classic）。' },
  { term: 'yarn global list', description: 'グローバルパッケージを一覧表示（Classic）。' },
  { term: 'yarn global bin', description: 'グローバルbinのパスを表示（Classic）。' },
  { term: 'yarn global dir', description: 'グローバルディレクトリのパスを表示（Classic）。' },

  { term: 'yarn bin', description: 'node_modules/.binのパスを表示。' },
  { term: 'yarn bin <name>', description: '指定バイナリのパスを表示。' },

  { term: 'yarn dedupe', description: '重複した依存を整理する（Berry）。' },

  { term: 'yarn clean', description: '.yarncleanに基づいて不要ファイルを削除。' },
  { term: 'yarn autoclean', description: '自動クリーンを設定・実行。' },
  { term: 'yarn autoclean --init', description: '.yarncleanを初期化。' },
  { term: 'yarn autoclean --force', description: 'クリーンを強制実行。' },

  { term: 'yarn check', description: '依存関係の整合性をチェック（非推奨）。' },
  { term: 'yarn check --integrity', description: 'パッケージの整合性をチェック。' },
  { term: 'yarn check --verify-tree', description: '依存ツリーを検証。' },

  { term: 'yarn import', description: 'package-lock.jsonからyarn.lockを生成。' },

  { term: 'yarn licenses', description: '依存パッケージのライセンス情報を表示。' },
  { term: 'yarn licenses list', description: 'ライセンス一覧を表示。' },
  { term: 'yarn licenses generate-disclaimer', description: 'ライセンス免責事項を生成。' },

  { term: 'yarn policies', description: 'yarnバージョンポリシーを管理（Classic）。' },
  { term: 'yarn policies set-version', description: 'yarnバージョンを固定（Classic）。' },

  { term: 'yarn set version', description: 'yarnバージョンを設定（Berry）。' },
  { term: 'yarn set version stable', description: '安定版yarnに設定。' },
  { term: 'yarn set version berry', description: 'Berry最新版に設定。' },
  { term: 'yarn set version classic', description: 'Classic版に設定。' },
  { term: 'yarn set version from sources', description: 'ソースからビルドして設定。' },

  { term: 'yarn owner', description: 'パッケージの所有者を管理。' },
  { term: 'yarn owner list', description: '所有者一覧を表示。' },
  { term: 'yarn owner add', description: '所有者を追加。' },
  { term: 'yarn owner remove', description: '所有者を削除。' },

  { term: 'yarn team', description: 'チームを管理。' },
  { term: 'yarn tag', description: 'パッケージの配布タグを管理。' },

  { term: 'yarn login', description: 'npmレジストリにログインする。' },
  { term: 'yarn logout', description: 'npmレジストリからログアウトする。' },
  { term: 'yarn npm login', description: 'npmにログイン（Berry）。' },
  { term: 'yarn npm logout', description: 'npmからログアウト（Berry）。' },
  { term: 'yarn npm whoami', description: '現在のログインユーザーを表示（Berry）。' },

  { term: 'yarn create', description: 'create-*パッケージを実行。yarn dlxと同様。' },
  { term: 'yarn create <name>', description: 'create-<name>パッケージを実行。' },

  { term: 'yarn help', description: 'ヘルプを表示する。' },
  { term: 'yarn --version', description: 'yarnのバージョンを表示。', aliases: ['yarn -v'] },

  { term: 'yarn plugin', description: 'yarnプラグインを管理（Berry）。' },
  { term: 'yarn plugin import', description: 'プラグインをインポート（Berry）。' },
  { term: 'yarn plugin list', description: 'プラグイン一覧を表示（Berry）。' },
  { term: 'yarn plugin remove', description: 'プラグインを削除（Berry）。' },
  { term: 'yarn plugin runtime', description: 'ランタイムプラグインを表示（Berry）。' },

  { term: 'yarn rebuild', description: 'ネイティブアドオンを再ビルドする。' },

  { term: 'yarn constraints', description: '依存関係の制約を検証（Berry）。' },
  { term: 'yarn constraints query', description: '制約をクエリで検索（Berry）。' },
  { term: 'yarn constraints source', description: '制約ソースを表示（Berry）。' },

  { term: 'yarn stage', description: 'Gitステージング用のファイルを準備（Berry）。' },

  { term: 'yarn unplug', description: 'パッケージをPnPから除外（Berry）。' },

  { term: 'yarn patch', description: 'パッケージにパッチを適用（Berry）。' },
  { term: 'yarn patch-commit', description: 'パッチを確定（Berry）。' },

  { term: 'yarn search', description: 'npmレジストリでパッケージを検索（Berry）。' },

  // === ファイル関連 ===
  { term: 'yarn.lock', description: '依存関係の正確なバージョンを固定するロックファイル。' },
  { term: '.yarnrc', description: 'yarn設定ファイル（Classic）。' },
  { term: '.yarnrc.yml', description: 'yarn設定ファイル（Berry）。' },
  { term: '.yarn', description: 'yarnのキャッシュやリリースを格納するディレクトリ（Berry）。' },
  { term: '.yarnclean', description: '自動クリーン対象を定義するファイル。' },
  { term: '.pnp.cjs', description: 'Plug\'n\'Playのエントリファイル（Berry）。' },
  { term: '.pnp.loader.mjs', description: 'ESM用PnPローダー（Berry）。' },

  // === 概念・用語 ===
  { term: 'Yarn Classic', description: 'Yarn v1。従来のnode_modulesベースのパッケージ管理。' },
  { term: 'Yarn Berry', description: 'Yarn v2以降。Plug\'n\'Playやゼロインストールをサポート。' },
  { term: 'Plug\'n\'Play', description: 'node_modulesを使わない依存解決方式（Berry）。', aliases: ['PnP'] },
  { term: 'Zero-Installs', description: '.yarnキャッシュをリポジトリに含めることでインストール不要にする戦略。' },
  { term: 'pnp', description: 'Plug\'n\'Play。node_modulesを使わず.pnp.cjsで依存を解決。' },
  { term: 'node-modules', description: '従来のnode_modules方式（Berry）。nodeLinker設定。' },
  { term: 'pnpm', description: 'pnpm方式のシンボリックリンク（Berry）。nodeLinker設定。' },
  { term: 'workspace', description: 'モノレポで複数パッケージを管理する機能。' },
  { term: 'resolution', description: '依存のバージョンを上書きする機能。' },
  { term: 'resolutions', description: 'package.jsonで依存のバージョンを強制指定。' },
];

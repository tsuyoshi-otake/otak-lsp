/**
 * npm用語集
 * npmコマンド・サブコマンド・オプションの説明
 */

import { CliGlossaryEntry } from './gitGlossary';

export const NPM_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本 ===
  { term: 'npm', description: 'Node Package Manager。Node.jsのパッケージ管理ツール。' },
  { term: 'npm init', description: 'package.jsonを対話的に作成する。' },
  { term: 'npm init -y', description: 'デフォルト設定でpackage.jsonを作成。', aliases: ['npm init --yes'] },
  { term: 'npm init @scope', description: 'スコープ付きinitializerを実行。create-*パッケージを呼び出す。' },

  // === インストール ===
  { term: 'npm install', description: 'package.jsonの依存パッケージをインストールする。', aliases: ['npm i'] },
  { term: 'npm install <package>', description: '指定パッケージをインストールする。' },
  { term: 'npm install --save', description: 'dependenciesに追加してインストール（npm5以降はデフォルト）。', aliases: ['npm install -S'] },
  { term: 'npm install --save-dev', description: 'devDependenciesに追加してインストール。', aliases: ['npm install -D'] },
  { term: 'npm install --save-optional', description: 'optionalDependenciesに追加してインストール。', aliases: ['npm install -O'] },
  { term: 'npm install --save-peer', description: 'peerDependenciesに追加してインストール。' },
  { term: 'npm install --global', description: 'グローバルにインストールする。', aliases: ['npm install -g'] },
  { term: 'npm install --production', description: 'devDependenciesを除いてインストール。' },
  { term: 'npm install --legacy-peer-deps', description: 'レガシーなpeerDependencies解決を使用。' },
  { term: 'npm install --force', description: '依存関係の競合を無視してインストール。', aliases: ['npm install -f'] },
  { term: 'npm install --no-save', description: 'package.jsonを更新せずにインストール。' },
  { term: 'npm install --ignore-scripts', description: 'インストールスクリプトを実行しない。' },
  { term: 'npm install --prefer-offline', description: 'キャッシュを優先して使用する。' },
  { term: 'npm install --offline', description: 'オフラインモードでインストール。' },
  { term: 'npm install --dry-run', description: '実際にはインストールせず、何が行われるか表示。' },
  { term: 'npm install --package-lock-only', description: 'node_modulesを更新せずpackage-lock.jsonのみ更新。' },

  { term: 'npm ci', description: 'クリーンインストール。package-lock.jsonに基づき正確にインストール。CI環境向け。' },
  { term: 'npm ci --ignore-scripts', description: 'スクリプトを実行せずにクリーンインストール。' },

  // === アンインストール ===
  { term: 'npm uninstall', description: 'パッケージをアンインストールする。', aliases: ['npm un', 'npm remove', 'npm rm'] },
  { term: 'npm uninstall --save', description: 'dependenciesから削除。', aliases: ['npm uninstall -S'] },
  { term: 'npm uninstall --save-dev', description: 'devDependenciesから削除。', aliases: ['npm uninstall -D'] },
  { term: 'npm uninstall --global', description: 'グローバルパッケージを削除。', aliases: ['npm uninstall -g'] },

  // === 更新 ===
  { term: 'npm update', description: '依存パッケージを更新する。', aliases: ['npm up', 'npm upgrade'] },
  { term: 'npm update <package>', description: '指定パッケージを更新する。' },
  { term: 'npm update --global', description: 'グローバルパッケージを更新。', aliases: ['npm update -g'] },
  { term: 'npm update --save', description: 'package.jsonのバージョン範囲も更新。' },

  // === 実行 ===
  { term: 'npm run', description: 'package.jsonのscriptsを実行する。', aliases: ['npm run-script'] },
  { term: 'npm run <script>', description: '指定したスクリプトを実行する。' },
  { term: 'npm run --silent', description: 'スクリプト出力を抑制する。', aliases: ['npm run -s'] },
  { term: 'npm run --if-present', description: 'スクリプトが存在する場合のみ実行。' },
  { term: 'npm start', description: '"start"スクリプトを実行する。定義がなければnode server.js。' },
  { term: 'npm stop', description: '"stop"スクリプトを実行する。' },
  { term: 'npm restart', description: '"restart"スクリプトを実行（stop → restart → start）。' },
  { term: 'npm test', description: '"test"スクリプトを実行する。', aliases: ['npm t'] },
  { term: 'npm build', description: '"build"スクリプトを実行する（現在は非推奨、run buildを使用）。' },

  { term: 'npm exec', description: 'パッケージのバイナリを実行する。', aliases: ['npx'] },
  { term: 'npm exec -- <command>', description: '引数を渡してパッケージを実行。' },
  { term: 'npm exec -c', description: 'シェルコマンドとして実行。' },

  { term: 'npx', description: 'パッケージを一時的にインストールして実行。npm execのエイリアス。' },
  { term: 'npx <package>', description: 'パッケージを実行する。未インストールなら一時インストール。' },
  { term: 'npx -y', description: '確認なしで実行する。', aliases: ['npx --yes'] },
  { term: 'npx -n', description: '実行せずに終了。', aliases: ['npx --no'] },
  { term: 'npx -p', description: '追加パッケージを指定して実行。', aliases: ['npx --package'] },

  // === 情報表示 ===
  { term: 'npm list', description: 'インストール済みパッケージを表示。', aliases: ['npm ls', 'npm la', 'npm ll'] },
  { term: 'npm list --depth', description: '表示する依存の深さを指定。' },
  { term: 'npm list --global', description: 'グローバルパッケージを表示。', aliases: ['npm list -g'] },
  { term: 'npm list --all', description: '全ての依存を表示。' },
  { term: 'npm list --json', description: 'JSON形式で出力。' },
  { term: 'npm list --parseable', description: 'パース可能な形式で出力。' },
  { term: 'npm list --prod', description: 'productionの依存のみ表示。' },
  { term: 'npm list --dev', description: 'devDependenciesのみ表示。' },

  { term: 'npm outdated', description: '更新可能なパッケージを表示する。' },
  { term: 'npm outdated --global', description: 'グローバルで更新可能なパッケージを表示。', aliases: ['npm outdated -g'] },
  { term: 'npm outdated --json', description: 'JSON形式で出力。' },
  { term: 'npm outdated --long', description: '詳細情報を表示。', aliases: ['npm outdated -l'] },

  { term: 'npm info', description: 'パッケージの詳細情報を表示。', aliases: ['npm view', 'npm show'] },
  { term: 'npm info <package>', description: '指定パッケージの情報を表示。' },
  { term: 'npm info <package> versions', description: '利用可能な全バージョンを表示。' },
  { term: 'npm info <package> version', description: '最新バージョンを表示。' },
  { term: 'npm info --json', description: 'JSON形式で出力。' },

  { term: 'npm search', description: 'npmレジストリでパッケージを検索。', aliases: ['npm s', 'npm find'] },
  { term: 'npm search --json', description: 'JSON形式で出力。' },
  { term: 'npm search --long', description: '詳細情報を表示。' },

  { term: 'npm explain', description: 'パッケージがインストールされている理由を表示。', aliases: ['npm why'] },

  // === 公開 ===
  { term: 'npm publish', description: 'パッケージをnpmレジストリに公開する。' },
  { term: 'npm publish --access public', description: 'スコープ付きパッケージを公開として公開。' },
  { term: 'npm publish --access restricted', description: 'スコープ付きパッケージを非公開として公開。' },
  { term: 'npm publish --tag', description: '指定タグで公開する。' },
  { term: 'npm publish --dry-run', description: '実際には公開せず、何が行われるか確認。' },
  { term: 'npm publish --otp', description: 'ワンタイムパスワードを指定。' },

  { term: 'npm unpublish', description: 'パッケージをレジストリから削除する。' },
  { term: 'npm unpublish --force', description: '強制的に削除（24時間以内のみ可能）。' },

  { term: 'npm deprecate', description: 'パッケージを非推奨としてマークする。' },

  { term: 'npm pack', description: 'パッケージをtarballにパックする。' },
  { term: 'npm pack --dry-run', description: '実際にはパックせず、含まれるファイルを表示。' },

  // === バージョン管理 ===
  { term: 'npm version', description: 'パッケージのバージョンを更新する。' },
  { term: 'npm version major', description: 'メジャーバージョンを上げる（1.0.0 → 2.0.0）。' },
  { term: 'npm version minor', description: 'マイナーバージョンを上げる（1.0.0 → 1.1.0）。' },
  { term: 'npm version patch', description: 'パッチバージョンを上げる（1.0.0 → 1.0.1）。' },
  { term: 'npm version premajor', description: 'プレリリース付きメジャーバージョンに更新。' },
  { term: 'npm version preminor', description: 'プレリリース付きマイナーバージョンに更新。' },
  { term: 'npm version prepatch', description: 'プレリリース付きパッチバージョンに更新。' },
  { term: 'npm version prerelease', description: 'プレリリース番号を上げる。' },
  { term: 'npm version from-git', description: 'Gitタグからバージョンを設定。' },
  { term: 'npm version --no-git-tag-version', description: 'Gitタグを作成しない。' },
  { term: 'npm version --allow-same-version', description: '同じバージョンでも更新を許可。' },

  // === セキュリティ ===
  { term: 'npm audit', description: '依存関係の脆弱性をチェックする。' },
  { term: 'npm audit --json', description: 'JSON形式で出力。' },
  { term: 'npm audit --production', description: 'productionの依存のみチェック。' },
  { term: 'npm audit --omit=dev', description: 'devDependenciesを除外してチェック。' },
  { term: 'npm audit fix', description: '脆弱性を自動修正する。' },
  { term: 'npm audit fix --force', description: '破壊的変更を含む修正も実行。' },
  { term: 'npm audit fix --dry-run', description: '実際には修正せず、何が行われるか確認。' },

  { term: 'npm fund', description: 'パッケージの資金調達情報を表示。' },
  { term: 'npm fund <package>', description: '指定パッケージの資金調達情報を表示。' },

  // === キャッシュ ===
  { term: 'npm cache', description: 'npmキャッシュを管理する。' },
  { term: 'npm cache clean', description: 'キャッシュを削除する。' },
  { term: 'npm cache clean --force', description: '強制的にキャッシュを削除。' },
  { term: 'npm cache verify', description: 'キャッシュの整合性を確認する。' },
  { term: 'npm cache ls', description: 'キャッシュの内容を表示（v7以降は非対応）。' },

  // === 設定 ===
  { term: 'npm config', description: 'npm設定を管理する。', aliases: ['npm c'] },
  { term: 'npm config list', description: '現在の設定を表示。', aliases: ['npm config ls'] },
  { term: 'npm config list --long', description: '全ての設定を表示。', aliases: ['npm config ls -l'] },
  { term: 'npm config get', description: '指定した設定値を取得。' },
  { term: 'npm config set', description: '設定値を設定する。' },
  { term: 'npm config delete', description: '設定を削除する。' },
  { term: 'npm config edit', description: '設定ファイルをエディタで開く。' },
  { term: 'npm config fix', description: '設定ファイルの問題を修正。' },

  { term: 'npm config set registry', description: 'レジストリURLを設定する。' },
  { term: 'npm config set proxy', description: 'HTTPプロキシを設定する。' },
  { term: 'npm config set https-proxy', description: 'HTTPSプロキシを設定する。' },
  { term: 'npm config set strict-ssl', description: 'SSL検証の有効/無効を設定。' },
  { term: 'npm config set save-exact', description: '正確なバージョンで保存する設定。' },
  { term: 'npm config set engine-strict', description: 'engines要件を厳格にチェック。' },
  { term: 'npm config set scripts-prepend-node-path', description: 'NODE_PATHにnodeパスを追加。' },

  // === リンク ===
  { term: 'npm link', description: 'パッケージをグローバルにシンボリックリンク。' },
  { term: 'npm link <package>', description: 'グローバルリンクをローカルにリンク。' },
  { term: 'npm unlink', description: 'シンボリックリンクを解除する。' },

  // === その他 ===
  { term: 'npm root', description: 'node_modulesのパスを表示。' },
  { term: 'npm root --global', description: 'グローバルnode_modulesのパスを表示。', aliases: ['npm root -g'] },

  { term: 'npm prefix', description: '現在のパッケージのプレフィックスを表示。' },
  { term: 'npm prefix --global', description: 'グローバルプレフィックスを表示。', aliases: ['npm prefix -g'] },

  { term: 'npm bin', description: 'node_modules/.binのパスを表示。' },
  { term: 'npm bin --global', description: 'グローバルbinのパスを表示。', aliases: ['npm bin -g'] },

  { term: 'npm doctor', description: 'npm環境の問題を診断する。' },

  { term: 'npm rebuild', description: 'ネイティブアドオンを再ビルドする。', aliases: ['npm rb'] },
  { term: 'npm rebuild <package>', description: '指定パッケージを再ビルド。' },

  { term: 'npm prune', description: '不要なパッケージを削除する。' },
  { term: 'npm prune --production', description: 'devDependenciesを削除。' },
  { term: 'npm prune --dry-run', description: '実際には削除せず、何が行われるか確認。' },

  { term: 'npm dedupe', description: '重複した依存を整理する。', aliases: ['npm ddp'] },

  { term: 'npm shrinkwrap', description: 'npm-shrinkwrap.jsonを生成（package-lock.jsonと同様）。' },

  { term: 'npm completion', description: 'シェル補完スクリプトを出力。' },

  { term: 'npm help', description: 'ヘルプを表示する。' },
  { term: 'npm help <command>', description: '指定コマンドのヘルプを表示。' },
  { term: 'npm help-search', description: 'ヘルプドキュメントを検索。' },

  { term: 'npm whoami', description: '現在のログインユーザーを表示。' },
  { term: 'npm login', description: 'npmレジストリにログインする。', aliases: ['npm adduser'] },
  { term: 'npm logout', description: 'npmレジストリからログアウトする。' },
  { term: 'npm token', description: '認証トークンを管理する。' },
  { term: 'npm token list', description: 'トークン一覧を表示。' },
  { term: 'npm token create', description: '新しいトークンを作成。' },
  { term: 'npm token revoke', description: 'トークンを無効化する。' },

  { term: 'npm org', description: 'npm組織を管理する。' },
  { term: 'npm team', description: 'チームを管理する。' },
  { term: 'npm access', description: 'パッケージのアクセス権を管理。' },
  { term: 'npm owner', description: 'パッケージの所有者を管理。', aliases: ['npm author'] },

  { term: 'npm star', description: 'パッケージにスターを付ける。' },
  { term: 'npm unstar', description: 'パッケージのスターを外す。' },
  { term: 'npm stars', description: 'スターを付けたパッケージを表示。' },

  { term: 'npm profile', description: 'npmプロフィールを管理する。' },
  { term: 'npm profile get', description: 'プロフィール情報を取得。' },
  { term: 'npm profile set', description: 'プロフィール情報を設定。' },

  { term: 'npm ping', description: 'レジストリへの接続を確認。' },

  { term: 'npm pkg', description: 'package.jsonの値を取得・設定。' },
  { term: 'npm pkg get', description: 'package.jsonから値を取得。' },
  { term: 'npm pkg set', description: 'package.jsonに値を設定。' },
  { term: 'npm pkg delete', description: 'package.jsonから値を削除。' },

  { term: 'npm query', description: '依存関係をクエリで検索。' },

  { term: 'npm diff', description: 'パッケージ間の差分を表示。' },
  { term: 'npm diff --diff', description: '比較するパッケージを指定。' },

  { term: 'npm dist-tag', description: 'パッケージの配布タグを管理。' },
  { term: 'npm dist-tag add', description: '配布タグを追加。' },
  { term: 'npm dist-tag rm', description: '配布タグを削除。' },
  { term: 'npm dist-tag ls', description: '配布タグを一覧表示。' },

  { term: 'npm bugs', description: 'パッケージのバグトラッカーを開く。' },
  { term: 'npm docs', description: 'パッケージのドキュメントを開く。', aliases: ['npm home'] },
  { term: 'npm repo', description: 'パッケージのリポジトリを開く。' },

  { term: 'npm explore', description: 'パッケージディレクトリでシェルを開く。' },
  { term: 'npm edit', description: 'パッケージをエディタで開く。' },

  { term: 'npm set-script', description: 'package.jsonにスクリプトを追加（非推奨）。' },

  // === package.json関連 ===
  { term: 'package.json', description: 'Node.jsプロジェクトの設定ファイル。依存関係やスクリプトを定義。' },
  { term: 'package-lock.json', description: '依存関係の正確なバージョンを固定するロックファイル。' },
  { term: 'npm-shrinkwrap.json', description: 'package-lock.jsonと同様だが、公開時にも含まれる。' },
  { term: '.npmrc', description: 'npm設定ファイル。レジストリやプロキシ設定など。' },
  { term: '.npmignore', description: 'パッケージ公開時に除外するファイルを指定。' },

  { term: 'dependencies', description: '本番環境で必要な依存パッケージ。' },
  { term: 'devDependencies', description: '開発環境でのみ必要な依存パッケージ。' },
  { term: 'peerDependencies', description: 'ホストパッケージが提供すべき依存。' },
  { term: 'optionalDependencies', description: 'インストール失敗しても継続する依存。' },
  { term: 'bundleDependencies', description: 'パッケージ公開時に同梱する依存。', aliases: ['bundledDependencies'] },

  { term: 'engines', description: '動作するNode.js/npmのバージョンを指定。' },
  { term: 'scripts', description: 'npm runで実行するスクリプトを定義。' },
  { term: 'main', description: 'パッケージのエントリポイントを指定。' },
  { term: 'module', description: 'ESモジュールのエントリポイントを指定。' },
  { term: 'exports', description: 'パッケージのエクスポートマップを定義。' },
  { term: 'type', description: '"module"でESM、"commonjs"でCJSとして扱う。' },
  { term: 'bin', description: '実行可能ファイルを指定。グローバルインストールでPATHに追加。' },
  { term: 'files', description: 'パッケージに含めるファイルを指定。' },
  { term: 'workspaces', description: 'モノレポのワークスペースを定義。' },
  { term: 'private', description: 'trueにすると公開を防止する。' },
  { term: 'publishConfig', description: '公開時の設定（registry、access等）。' },
  { term: 'repository', description: 'ソースコードリポジトリのURL。' },
  { term: 'bugs', description: 'バグ報告先のURL。' },
  { term: 'homepage', description: 'プロジェクトのホームページURL。' },
  { term: 'license', description: 'パッケージのライセンス。' },
  { term: 'author', description: 'パッケージの作者情報。' },
  { term: 'contributors', description: 'コントリビューター一覧。' },
  { term: 'keywords', description: 'npm検索用のキーワード。' },
  { term: 'sideEffects', description: 'ツリーシェイキング用の副作用情報。' },
  { term: 'overrides', description: '依存のバージョンを上書きする。' },

  // === バージョン記法 ===
  { term: '^', description: 'キャレット。マイナー・パッチの更新を許可（^1.2.3 → 1.x.x）。' },
  { term: '~', description: 'チルダ。パッチの更新のみ許可（~1.2.3 → 1.2.x）。' },
  { term: '*', description: '任意のバージョンを許可。' },
  { term: 'latest', description: '最新の安定版を指定。' },
  { term: 'next', description: '次期バージョン（プレリリース）を指定。' },
  { term: 'semver', description: 'セマンティックバージョニング。MAJOR.MINOR.PATCH形式。' },

  // === スクリプトフック ===
  { term: 'preinstall', description: 'npm install前に実行されるスクリプト。' },
  { term: 'install', description: 'インストール時に実行されるスクリプト。' },
  { term: 'postinstall', description: 'npm install後に実行されるスクリプト。' },
  { term: 'preuninstall', description: 'npm uninstall前に実行されるスクリプト。' },
  { term: 'postuninstall', description: 'npm uninstall後に実行されるスクリプト。' },
  { term: 'prepack', description: 'npm pack前に実行されるスクリプト。' },
  { term: 'postpack', description: 'npm pack後に実行されるスクリプト。' },
  { term: 'prepare', description: 'npm publish/pack前、npm install後に実行。' },
  { term: 'prepublishOnly', description: 'npm publish前のみ実行されるスクリプト。' },
  { term: 'preversion', description: 'npm version前に実行されるスクリプト。' },
  { term: 'postversion', description: 'npm version後に実行されるスクリプト。' },
  { term: 'preshrinkwrap', description: 'npm shrinkwrap前に実行されるスクリプト。' },
  { term: 'postshrinkwrap', description: 'npm shrinkwrap後に実行されるスクリプト。' },
  { term: 'pretest', description: 'npm test前に実行されるスクリプト。' },
  { term: 'posttest', description: 'npm test後に実行されるスクリプト。' },
  { term: 'prestart', description: 'npm start前に実行されるスクリプト。' },
  { term: 'poststart', description: 'npm start後に実行されるスクリプト。' },
  { term: 'prestop', description: 'npm stop前に実行されるスクリプト。' },
  { term: 'poststop', description: 'npm stop後に実行されるスクリプト。' },
  { term: 'prerestart', description: 'npm restart前に実行されるスクリプト。' },
  { term: 'postrestart', description: 'npm restart後に実行されるスクリプト。' },

  // === 環境変数 ===
  { term: 'npm_config_*', description: 'npm設定値を環境変数として参照。' },
  { term: 'npm_package_*', description: 'package.jsonの値を環境変数として参照。' },
  { term: 'npm_lifecycle_event', description: '現在実行中のスクリプト名。' },
  { term: 'NODE_ENV', description: 'Node.js環境（production/development）。' },
];

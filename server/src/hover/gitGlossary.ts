/**
 * Git用語集
 * Gitコマンド・サブコマンド・オプションの説明
 */

export type CliGlossaryEntry = Readonly<{
  term: string;
  description: string;
  aliases?: ReadonlyArray<string>;
  synonyms?: ReadonlyArray<string>;
}>;

export const GIT_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本コマンド ===
  { term: 'git', description: '分散型バージョン管理システム。ソースコードの変更履歴を追跡・管理する。' },
  { term: 'git init', description: '新しいGitリポジトリを作成する。カレントディレクトリに.gitディレクトリを生成。' },
  { term: 'git clone', description: 'リモートリポジトリをローカルにコピーする。履歴も含めて完全な複製を作成。' },
  { term: 'git clone --depth', description: '浅いクローン。指定した深さの履歴のみ取得し、クローン時間を短縮。' },
  { term: 'git clone --branch', description: '特定のブランチを指定してクローンする。', aliases: ['git clone -b'] },
  { term: 'git clone --single-branch', description: '単一ブランチのみクローンする。他のブランチ情報は取得しない。' },
  { term: 'git clone --recursive', description: 'サブモジュールも含めてクローンする。' },

  // === ステージング・コミット ===
  { term: 'git add', description: '変更をステージングエリアに追加する。コミット対象として登録。' },
  { term: 'git add .', description: 'カレントディレクトリ以下の全変更をステージングに追加。' },
  { term: 'git add -A', description: '全ての変更（追加・変更・削除）をステージングに追加。', aliases: ['git add --all'] },
  { term: 'git add -p', description: '対話的に変更の一部をステージングに追加。', aliases: ['git add --patch'] },
  { term: 'git add -u', description: '追跡済みファイルの変更のみステージングに追加。', aliases: ['git add --update'] },
  { term: 'git add -i', description: '対話モードでステージングを行う。', aliases: ['git add --interactive'] },

  { term: 'git commit', description: 'ステージングされた変更をリポジトリに記録する。' },
  { term: 'git commit -m', description: 'コミットメッセージを指定してコミット。', aliases: ['git commit --message'] },
  { term: 'git commit -a', description: '追跡済みファイルの変更を自動ステージングしてコミット。', aliases: ['git commit --all'] },
  { term: 'git commit --amend', description: '直前のコミットを修正する。メッセージや内容を変更可能。' },
  { term: 'git commit --no-edit', description: 'コミットメッセージを変更せずにamendする際に使用。' },
  { term: 'git commit -v', description: 'コミット時にdiffを表示する。', aliases: ['git commit --verbose'] },
  { term: 'git commit --allow-empty', description: '変更がなくても空のコミットを作成する。' },
  { term: 'git commit --fixup', description: '指定コミットの修正用コミットを作成。rebase --autosquashで自動統合。' },
  { term: 'git commit --squash', description: '指定コミットとのsquash用コミットを作成。' },
  { term: 'git commit -S', description: 'GPG署名付きでコミットする。', aliases: ['git commit --gpg-sign'] },

  // === プッシュ・プル・フェッチ ===
  { term: 'git push', description: 'ローカルの変更をリモートリポジトリに送信する。' },
  { term: 'git push origin', description: 'originリモートにプッシュする。' },
  { term: 'git push -u', description: '上流ブランチを設定してプッシュ。以降git pushだけで同じリモートにプッシュ可能。', aliases: ['git push --set-upstream'] },
  { term: 'git push --force', description: 'リモートの履歴を上書きして強制プッシュ。', aliases: ['git push -f'] },
  { term: 'git push --force-with-lease', description: '安全な強制プッシュ。リモートが変更されていない場合のみ実行。' },
  { term: 'git push --tags', description: '全てのタグをリモートにプッシュする。' },
  { term: 'git push --delete', description: 'リモートブランチまたはタグを削除する。' },
  { term: 'git push --dry-run', description: '実際にはプッシュせず、何が送信されるか確認。', aliases: ['git push -n'] },

  { term: 'git pull', description: 'リモートの変更を取得してマージする。fetch + mergeと同等。' },
  { term: 'git pull --rebase', description: 'リモートの変更を取得してリベースする。マージコミットを作らない。', aliases: ['git pull -r'] },
  { term: 'git pull --ff-only', description: 'fast-forward可能な場合のみプルする。' },
  { term: 'git pull --no-commit', description: 'マージ後に自動コミットしない。' },
  { term: 'git pull --autostash', description: 'プル前に自動でstashし、プル後に適用する。' },

  { term: 'git fetch', description: 'リモートの変更を取得する。ワーキングツリーは変更しない。' },
  { term: 'git fetch --all', description: '全てのリモートから変更を取得する。' },
  { term: 'git fetch --prune', description: 'リモートで削除されたブランチの参照をローカルから削除。', aliases: ['git fetch -p'] },
  { term: 'git fetch --tags', description: '全てのタグを取得する。' },
  { term: 'git fetch origin', description: 'originリモートから変更を取得する。' },

  // === ブランチ操作 ===
  { term: 'git branch', description: 'ブランチの一覧表示・作成・削除を行う。' },
  { term: 'git branch -a', description: 'ローカルとリモートの全ブランチを表示。', aliases: ['git branch --all'] },
  { term: 'git branch -r', description: 'リモートブランチのみ表示。', aliases: ['git branch --remotes'] },
  { term: 'git branch -d', description: 'マージ済みブランチを削除する。', aliases: ['git branch --delete'] },
  { term: 'git branch -D', description: 'ブランチを強制削除する。マージ状態に関係なく削除。' },
  { term: 'git branch -m', description: 'ブランチ名を変更する。', aliases: ['git branch --move'] },
  { term: 'git branch -M', description: 'ブランチ名を強制的に変更する。' },
  { term: 'git branch -v', description: 'ブランチ一覧と最新コミットを表示。', aliases: ['git branch --verbose'] },
  { term: 'git branch -vv', description: 'ブランチ一覧と上流ブランチ情報を表示。' },
  { term: 'git branch --merged', description: 'カレントブランチにマージ済みのブランチを表示。' },
  { term: 'git branch --no-merged', description: 'カレントブランチにマージされていないブランチを表示。' },
  { term: 'git branch --set-upstream-to', description: '上流ブランチを設定する。', aliases: ['git branch -u'] },
  { term: 'git branch --contains', description: '指定コミットを含むブランチを表示。' },

  { term: 'git checkout', description: 'ブランチの切り替え、またはファイルの復元を行う。' },
  { term: 'git checkout -b', description: '新しいブランチを作成して切り替える。' },
  { term: 'git checkout -B', description: 'ブランチを作成（既存なら上書き）して切り替える。' },
  { term: 'git checkout --', description: 'ワーキングツリーのファイルを復元する。' },
  { term: 'git checkout --track', description: 'リモートブランチを追跡するローカルブランチを作成。', aliases: ['git checkout -t'] },
  { term: 'git checkout --orphan', description: '履歴のない孤立ブランチを作成する。' },

  { term: 'git switch', description: 'ブランチを切り替える。checkoutの代替コマンド。' },
  { term: 'git switch -c', description: '新しいブランチを作成して切り替える。', aliases: ['git switch --create'] },
  { term: 'git switch -C', description: 'ブランチを作成（既存なら上書き）して切り替える。' },
  { term: 'git switch -d', description: 'コミットに直接切り替える（detached HEAD）。', aliases: ['git switch --detach'] },

  { term: 'git restore', description: 'ワーキングツリーのファイルを復元する。checkoutの代替コマンド。' },
  { term: 'git restore --staged', description: 'ステージングからファイルを取り消す。', aliases: ['git restore -S'] },
  { term: 'git restore --source', description: '指定したコミットからファイルを復元する。', aliases: ['git restore -s'] },
  { term: 'git restore --worktree', description: 'ワーキングツリーのファイルを復元する。', aliases: ['git restore -W'] },

  // === マージ・リベース ===
  { term: 'git merge', description: '別のブランチの変更を現在のブランチに統合する。' },
  { term: 'git merge --no-ff', description: 'fast-forwardせず、常にマージコミットを作成。' },
  { term: 'git merge --ff-only', description: 'fast-forward可能な場合のみマージ。' },
  { term: 'git merge --squash', description: '変更を1つのコミットにまとめてマージ準備。' },
  { term: 'git merge --abort', description: 'マージを中止して元の状態に戻す。' },
  { term: 'git merge --continue', description: 'コンフリクト解消後にマージを続行する。' },
  { term: 'git merge --no-commit', description: 'マージ後に自動コミットしない。' },
  { term: 'git merge -m', description: 'マージコミットメッセージを指定する。' },

  { term: 'git rebase', description: 'コミット履歴を別のベースに付け替える。履歴を直線的に整理。' },
  { term: 'git rebase -i', description: '対話的リベース。コミットの編集・統合・削除が可能。', aliases: ['git rebase --interactive'] },
  { term: 'git rebase --onto', description: 'コミットを別のベースに移動する。' },
  { term: 'git rebase --abort', description: 'リベースを中止して元の状態に戻す。' },
  { term: 'git rebase --continue', description: 'コンフリクト解消後にリベースを続行する。' },
  { term: 'git rebase --skip', description: '現在のコミットをスキップしてリベースを続行。' },
  { term: 'git rebase --autosquash', description: 'fixup!/squash!コミットを自動的に並べ替え。' },
  { term: 'git rebase --autostash', description: 'リベース前に自動stashし、終了後に適用。' },

  // === 差分・履歴 ===
  { term: 'git diff', description: '変更の差分を表示する。' },
  { term: 'git diff --staged', description: 'ステージングされた変更の差分を表示。', aliases: ['git diff --cached'] },
  { term: 'git diff --stat', description: '変更ファイルと行数の統計を表示。' },
  { term: 'git diff --name-only', description: '変更されたファイル名のみ表示。' },
  { term: 'git diff --name-status', description: '変更されたファイル名と状態を表示。' },
  { term: 'git diff --word-diff', description: '単語単位で差分を表示する。' },
  { term: 'git diff --color-words', description: '単語単位で色付きの差分を表示。' },
  { term: 'git diff HEAD', description: 'HEADとワーキングツリーの差分を表示。' },
  { term: 'git diff HEAD~', description: '1つ前のコミットとの差分を表示。' },

  { term: 'git log', description: 'コミット履歴を表示する。' },
  { term: 'git log --oneline', description: '各コミットを1行で表示する。' },
  { term: 'git log --graph', description: 'ブランチのグラフを表示する。' },
  { term: 'git log --all', description: '全ブランチの履歴を表示する。' },
  { term: 'git log -p', description: 'コミットごとの差分を表示。', aliases: ['git log --patch'] },
  { term: 'git log --stat', description: 'コミットごとの変更統計を表示。' },
  { term: 'git log --author', description: '指定した著者のコミットのみ表示。' },
  { term: 'git log --since', description: '指定日時以降のコミットを表示。', aliases: ['git log --after'] },
  { term: 'git log --until', description: '指定日時以前のコミットを表示。', aliases: ['git log --before'] },
  { term: 'git log --grep', description: 'コミットメッセージで検索する。' },
  { term: 'git log -S', description: '変更内容で検索する（pickaxe検索）。' },
  { term: 'git log --follow', description: 'ファイル名変更を追跡して履歴表示。' },
  { term: 'git log --pretty', description: '出力フォーマットを指定する。', aliases: ['git log --format'] },
  { term: 'git log --pretty=format', description: 'カスタムフォーマットで出力する。' },
  { term: 'git log --abbrev-commit', description: 'コミットハッシュを省略表示。' },
  { term: 'git log --first-parent', description: 'マージの最初の親のみ追跡する。' },

  { term: 'git show', description: 'コミットの詳細情報と差分を表示する。' },
  { term: 'git show --stat', description: 'コミットの変更統計を表示する。' },
  { term: 'git show --name-only', description: '変更されたファイル名のみ表示。' },

  { term: 'git status', description: 'ワーキングツリーの状態を表示する。' },
  { term: 'git status -s', description: '状態を短縮形式で表示。', aliases: ['git status --short'] },
  { term: 'git status -b', description: 'ブランチ情報も表示。', aliases: ['git status --branch'] },
  { term: 'git status --ignored', description: '無視されているファイルも表示。' },

  // === 取り消し・リセット ===
  { term: 'git reset', description: 'HEADの位置を変更する。ステージングの取り消しにも使用。' },
  { term: 'git reset --soft', description: 'HEADのみ移動。ステージングとワーキングツリーは維持。' },
  { term: 'git reset --mixed', description: 'HEADとステージングをリセット。ワーキングツリーは維持。デフォルト動作。' },
  { term: 'git reset --hard', description: 'HEAD、ステージング、ワーキングツリー全てをリセット。変更は破棄される。' },
  { term: 'git reset HEAD~', description: '1つ前のコミットにリセットする。' },
  { term: 'git reset --keep', description: 'ワーキングツリーの変更を保持してリセット。' },

  { term: 'git revert', description: '指定したコミットを打ち消すコミットを作成する。履歴を保持。' },
  { term: 'git revert --no-commit', description: '打ち消し変更を適用するが、コミットはしない。', aliases: ['git revert -n'] },
  { term: 'git revert --abort', description: 'リバートを中止する。' },
  { term: 'git revert --continue', description: 'コンフリクト解消後にリバートを続行。' },
  { term: 'git revert -m', description: 'マージコミットをリバートする際の親番号を指定。', aliases: ['git revert --mainline'] },

  // === スタッシュ ===
  { term: 'git stash', description: '変更を一時的に退避する。ワーキングツリーをクリーンにする。' },
  { term: 'git stash push', description: '変更をスタッシュに保存する。' },
  { term: 'git stash push -m', description: 'メッセージ付きでスタッシュを保存。', aliases: ['git stash push --message'] },
  { term: 'git stash push -p', description: '対話的に一部の変更のみスタッシュ。', aliases: ['git stash push --patch'] },
  { term: 'git stash push -u', description: '未追跡ファイルも含めてスタッシュ。', aliases: ['git stash push --include-untracked'] },
  { term: 'git stash push -a', description: '無視ファイルも含めて全てスタッシュ。', aliases: ['git stash push --all'] },
  { term: 'git stash list', description: 'スタッシュの一覧を表示する。' },
  { term: 'git stash show', description: 'スタッシュの内容を表示する。' },
  { term: 'git stash show -p', description: 'スタッシュの差分を表示する。', aliases: ['git stash show --patch'] },
  { term: 'git stash pop', description: 'スタッシュを適用して削除する。' },
  { term: 'git stash apply', description: 'スタッシュを適用する（削除しない）。' },
  { term: 'git stash drop', description: '指定したスタッシュを削除する。' },
  { term: 'git stash clear', description: '全てのスタッシュを削除する。' },
  { term: 'git stash branch', description: 'スタッシュから新しいブランチを作成。' },

  // === タグ ===
  { term: 'git tag', description: 'タグの作成・一覧表示・削除を行う。リリースポイントの記録に使用。' },
  { term: 'git tag -a', description: '注釈付きタグを作成する。', aliases: ['git tag --annotate'] },
  { term: 'git tag -m', description: 'タグメッセージを指定する。', aliases: ['git tag --message'] },
  { term: 'git tag -d', description: 'タグを削除する。', aliases: ['git tag --delete'] },
  { term: 'git tag -l', description: 'タグを一覧表示する。パターン指定可能。', aliases: ['git tag --list'] },
  { term: 'git tag -n', description: 'タグとメッセージを表示する。' },
  { term: 'git tag -s', description: 'GPG署名付きタグを作成する。', aliases: ['git tag --sign'] },
  { term: 'git tag -v', description: 'タグの署名を検証する。', aliases: ['git tag --verify'] },

  // === リモート ===
  { term: 'git remote', description: 'リモートリポジトリの管理を行う。' },
  { term: 'git remote -v', description: 'リモートのURL一覧を表示。', aliases: ['git remote --verbose'] },
  { term: 'git remote add', description: '新しいリモートを追加する。' },
  { term: 'git remote remove', description: 'リモートを削除する。', aliases: ['git remote rm'] },
  { term: 'git remote rename', description: 'リモート名を変更する。' },
  { term: 'git remote set-url', description: 'リモートのURLを変更する。' },
  { term: 'git remote show', description: 'リモートの詳細情報を表示する。' },
  { term: 'git remote prune', description: 'リモートで削除されたブランチの参照を削除。' },
  { term: 'git remote update', description: '全リモートの更新を取得する。' },

  { term: 'origin', description: 'デフォルトのリモートリポジトリ名。cloneした元のリポジトリを指す。' },
  { term: 'upstream', description: 'フォーク元のリポジトリを指す慣例的なリモート名。' },

  // === Cherry-pick ===
  { term: 'git cherry-pick', description: '指定したコミットを現在のブランチに適用する。' },
  { term: 'git cherry-pick --no-commit', description: 'コミットせずに変更のみ適用。', aliases: ['git cherry-pick -n'] },
  { term: 'git cherry-pick --abort', description: 'チェリーピックを中止する。' },
  { term: 'git cherry-pick --continue', description: 'コンフリクト解消後にチェリーピックを続行。' },
  { term: 'git cherry-pick --skip', description: '現在のコミットをスキップして続行。' },
  { term: 'git cherry-pick -x', description: '元のコミット情報をメッセージに追加。' },
  { term: 'git cherry-pick -m', description: 'マージコミットの親番号を指定。', aliases: ['git cherry-pick --mainline'] },

  // === Bisect ===
  { term: 'git bisect', description: '二分探索でバグを導入したコミットを特定する。' },
  { term: 'git bisect start', description: '二分探索を開始する。' },
  { term: 'git bisect bad', description: '現在のコミットを「悪い」とマーク。' },
  { term: 'git bisect good', description: '現在のコミットを「良い」とマーク。' },
  { term: 'git bisect reset', description: '二分探索を終了して元に戻る。' },
  { term: 'git bisect skip', description: '現在のコミットをスキップする。' },
  { term: 'git bisect run', description: 'スクリプトを使って自動で二分探索。' },
  { term: 'git bisect log', description: '二分探索のログを表示する。' },

  // === Reflog ===
  { term: 'git reflog', description: 'HEADの移動履歴を表示する。誤った操作の復元に使用。' },
  { term: 'git reflog show', description: '指定した参照のreflogを表示。' },
  { term: 'git reflog expire', description: '古いreflogエントリを削除する。' },
  { term: 'git reflog delete', description: '指定したreflogエントリを削除。' },

  // === サブモジュール ===
  { term: 'git submodule', description: 'サブモジュール（外部リポジトリの参照）を管理する。' },
  { term: 'git submodule add', description: '新しいサブモジュールを追加する。' },
  { term: 'git submodule init', description: 'サブモジュールを初期化する。' },
  { term: 'git submodule update', description: 'サブモジュールを更新する。' },
  { term: 'git submodule update --init', description: '初期化と更新を同時に行う。' },
  { term: 'git submodule update --recursive', description: 'ネストしたサブモジュールも更新。' },
  { term: 'git submodule update --remote', description: 'リモートの最新を取得して更新。' },
  { term: 'git submodule status', description: 'サブモジュールの状態を表示する。' },
  { term: 'git submodule foreach', description: '各サブモジュールでコマンドを実行。' },
  { term: 'git submodule sync', description: 'サブモジュールのURL設定を同期。' },
  { term: 'git submodule deinit', description: 'サブモジュールの登録を解除する。' },

  // === Worktree ===
  { term: 'git worktree', description: '複数のワーキングツリーを管理する。' },
  { term: 'git worktree add', description: '新しいワーキングツリーを作成する。' },
  { term: 'git worktree list', description: 'ワーキングツリーの一覧を表示。' },
  { term: 'git worktree remove', description: 'ワーキングツリーを削除する。' },
  { term: 'git worktree prune', description: '不要なワーキングツリー情報を削除。' },
  { term: 'git worktree lock', description: 'ワーキングツリーをロックする。' },
  { term: 'git worktree unlock', description: 'ワーキングツリーのロックを解除。' },
  { term: 'git worktree move', description: 'ワーキングツリーを移動する。' },

  // === Config ===
  { term: 'git config', description: 'Gitの設定を表示・変更する。' },
  { term: 'git config --global', description: 'ユーザー全体の設定を変更する。' },
  { term: 'git config --local', description: 'リポジトリ固有の設定を変更する。' },
  { term: 'git config --system', description: 'システム全体の設定を変更する。' },
  { term: 'git config --list', description: '全ての設定を一覧表示する。', aliases: ['git config -l'] },
  { term: 'git config --edit', description: '設定ファイルをエディタで開く。', aliases: ['git config -e'] },
  { term: 'git config --unset', description: '設定を削除する。' },
  { term: 'git config --get', description: '設定値を取得する。' },
  { term: 'git config --get-all', description: '複数値の設定を全て取得。' },

  // === Config - ユーザー設定 ===
  { term: 'git config user.name', description: 'コミット時の著者名を設定する。' },
  { term: 'git config user.email', description: 'コミット時のメールアドレスを設定する。' },
  { term: 'git config user.signingkey', description: 'GPG署名に使用するキーIDを設定。' },

  // === Config - Core設定 ===
  { term: 'git config core.editor', description: 'Gitで使用するエディタを設定する。' },
  { term: 'git config core.autocrlf', description: '改行コードの自動変換設定。true/input/false。' },
  { term: 'git config core.safecrlf', description: '改行変換の安全性チェック。' },
  { term: 'git config core.filemode', description: 'ファイルモード（実行権限）の追跡設定。' },
  { term: 'git config core.ignorecase', description: 'ファイル名の大文字小文字を無視するか。' },
  { term: 'git config core.quotepath', description: '非ASCII文字のクォート表示設定。' },
  { term: 'git config core.excludesfile', description: 'グローバルなgitignoreファイルのパス。' },
  { term: 'git config core.pager', description: 'ページャー（less等）の設定。' },
  { term: 'git config core.whitespace', description: '空白文字の扱いを設定する。' },
  { term: 'git config core.hooksPath', description: 'Gitフックスクリプトのディレクトリパス。' },

  // === Config - その他の設定 ===
  { term: 'git config init.defaultBranch', description: 'git initで作成するデフォルトブランチ名。' },
  { term: 'git config pull.rebase', description: 'git pull時にrebaseするかの設定。' },
  { term: 'git config pull.ff', description: 'git pull時のfast-forward設定。' },
  { term: 'git config push.default', description: 'git pushのデフォルト動作。simple/matching等。' },
  { term: 'git config push.autoSetupRemote', description: 'push時に自動で上流ブランチを設定。' },
  { term: 'git config fetch.prune', description: 'fetch時に自動でprune（削除参照の整理）。' },
  { term: 'git config rebase.autoStash', description: 'rebase時に自動でstash/unstash。' },
  { term: 'git config rebase.autoSquash', description: 'rebase -i時にfixup!を自動処理。' },
  { term: 'git config merge.ff', description: 'マージ時のfast-forward設定。' },
  { term: 'git config merge.conflictStyle', description: 'コンフリクト表示スタイル。diff3等。' },
  { term: 'git config diff.colorMoved', description: '移動した行の色分け表示。' },
  { term: 'git config diff.algorithm', description: 'diffアルゴリズム。histogram/patience等。' },
  { term: 'git config commit.gpgsign', description: 'コミット時に自動でGPG署名。' },
  { term: 'git config commit.template', description: 'コミットメッセージのテンプレートファイル。' },
  { term: 'git config credential.helper', description: '認証情報の保存方法。cache/store等。' },
  { term: 'git config color.ui', description: 'Git出力の色付け設定。auto/always/never。' },
  { term: 'git config alias', description: 'Gitコマンドのエイリアスを設定する。' },
  { term: 'git config rerere.enabled', description: 'コンフリクト解決の記録・再利用を有効化。' },
  { term: 'git config help.autocorrect', description: 'コマンドのタイプミス時の自動修正。' },

  // === Clean ===
  { term: 'git clean', description: '追跡されていないファイルを削除する。' },
  { term: 'git clean -f', description: '強制的に未追跡ファイルを削除。', aliases: ['git clean --force'] },
  { term: 'git clean -d', description: 'ディレクトリも含めて削除。' },
  { term: 'git clean -n', description: '削除されるファイルを表示（実行しない）。', aliases: ['git clean --dry-run'] },
  { term: 'git clean -x', description: '.gitignoreのファイルも削除対象に含む。' },
  { term: 'git clean -X', description: '.gitignoreのファイルのみ削除対象。' },
  { term: 'git clean -i', description: '対話的にファイルを削除。', aliases: ['git clean --interactive'] },

  // === Blame ===
  { term: 'git blame', description: '各行の最終変更者とコミットを表示する。' },
  { term: 'git blame -L', description: '指定した行範囲のみ表示。' },
  { term: 'git blame -w', description: '空白の変更を無視する。' },
  { term: 'git blame -M', description: '行の移動を検出する。' },
  { term: 'git blame -C', description: 'ファイル間のコピーを検出する。' },
  { term: 'git blame --since', description: '指定日時以降の変更のみ表示。' },

  // === その他のコマンド ===
  { term: 'git grep', description: 'リポジトリ内でパターン検索を行う。' },
  { term: 'git grep -n', description: '行番号を表示する。', aliases: ['git grep --line-number'] },
  { term: 'git grep -c', description: 'マッチ数を表示する。', aliases: ['git grep --count'] },
  { term: 'git grep -l', description: 'マッチしたファイル名のみ表示。', aliases: ['git grep --files-with-matches'] },
  { term: 'git grep -i', description: '大文字小文字を区別しない。', aliases: ['git grep --ignore-case'] },

  { term: 'git shortlog', description: '著者ごとにコミットをまとめて表示。' },
  { term: 'git shortlog -s', description: 'コミット数のみ表示。', aliases: ['git shortlog --summary'] },
  { term: 'git shortlog -n', description: 'コミット数順にソート。', aliases: ['git shortlog --numbered'] },

  { term: 'git describe', description: '最も近いタグからの相対位置を表示。' },
  { term: 'git describe --tags', description: '軽量タグも含めて検索する。' },
  { term: 'git describe --always', description: 'タグがない場合もコミットハッシュを表示。' },

  { term: 'git archive', description: 'リポジトリのアーカイブを作成する。' },
  { term: 'git archive --format', description: 'アーカイブ形式を指定（tar/zip）。' },
  { term: 'git archive --prefix', description: 'アーカイブ内のプレフィックスを指定。' },

  { term: 'git gc', description: 'リポジトリの最適化とガベージコレクション。' },
  { term: 'git gc --aggressive', description: 'より積極的に最適化を行う。' },
  { term: 'git gc --auto', description: '必要な場合のみ実行する。' },

  { term: 'git fsck', description: 'リポジトリの整合性をチェックする。' },
  { term: 'git fsck --full', description: '完全なチェックを行う。' },

  { term: 'git prune', description: '到達不能なオブジェクトを削除する。' },

  { term: 'git rev-parse', description: 'Git参照をパースしてコミットハッシュを取得。' },
  { term: 'git rev-parse HEAD', description: 'HEADのコミットハッシュを取得。' },
  { term: 'git rev-parse --abbrev-ref HEAD', description: '現在のブランチ名を取得。' },
  { term: 'git rev-parse --show-toplevel', description: 'リポジトリのルートディレクトリを取得。' },

  { term: 'git ls-files', description: 'インデックス内のファイル一覧を表示。' },
  { term: 'git ls-tree', description: 'ツリーオブジェクトの内容を表示。' },
  { term: 'git cat-file', description: 'オブジェクトの内容を表示する。' },
  { term: 'git hash-object', description: 'オブジェクトのハッシュを計算する。' },

  { term: 'git notes', description: 'コミットにメモを追加する。' },
  { term: 'git notes add', description: 'メモを追加する。' },
  { term: 'git notes show', description: 'メモを表示する。' },
  { term: 'git notes remove', description: 'メモを削除する。' },

  { term: 'git bundle', description: 'オブジェクトをバンドルファイルにパック。' },
  { term: 'git bundle create', description: 'バンドルを作成する。' },
  { term: 'git bundle verify', description: 'バンドルの整合性を確認。' },

  { term: 'git filter-branch', description: '履歴を書き換える（非推奨、git-filter-repo推奨）。' },

  { term: 'git apply', description: 'パッチを適用する。' },
  { term: 'git apply --check', description: 'パッチが適用可能か確認する。' },
  { term: 'git apply --stat', description: 'パッチの統計情報を表示。' },

  { term: 'git format-patch', description: 'コミットをパッチファイルとして出力。' },
  { term: 'git am', description: 'メールボックス形式のパッチを適用。' },

  { term: 'git request-pull', description: 'プルリクエストのサマリーを生成。' },

  // === .gitignore ===
  { term: '.gitignore', description: 'Gitで追跡しないファイルのパターンを指定するファイル。' },
  { term: '.gitattributes', description: 'パス毎の属性（改行、diff、merge等）を設定するファイル。' },
  { term: '.gitmodules', description: 'サブモジュールの設定ファイル。' },
  { term: '.gitkeep', description: '空ディレクトリを追跡するための慣例的な空ファイル。' },

  // === 概念・用語 ===
  { term: 'HEAD', description: '現在チェックアウトしているコミットへの参照。' },
  { term: 'HEAD~', description: 'HEADの1つ前のコミット。HEAD~2は2つ前。', aliases: ['HEAD~1'] },
  { term: 'HEAD^', description: 'HEADの親コミット。マージコミットでは^2で2番目の親。', aliases: ['HEAD^1'] },
  { term: 'detached HEAD', description: 'ブランチではなくコミットを直接チェックアウトした状態。' },
  { term: 'staging area', description: '次のコミットに含める変更を準備する領域。インデックスとも呼ばれる。', aliases: ['index', 'ステージングエリア'] },
  { term: 'working tree', description: '実際にファイルを編集する作業ディレクトリ。', aliases: ['working directory', 'ワーキングツリー'] },
  { term: 'tracked', description: 'Gitで追跡されているファイルの状態。' },
  { term: 'untracked', description: 'Gitで追跡されていないファイルの状態。' },
  { term: 'fast-forward', description: 'マージ時にコミット履歴を直線的に進めること。', aliases: ['ff'] },
  { term: 'conflict', description: 'マージやリベース時に同じ箇所が変更されて自動統合できない状態。', aliases: ['コンフリクト'] },
  { term: 'bare repository', description: 'ワーキングツリーを持たないリポジトリ。サーバー用。' },
  { term: 'shallow clone', description: '履歴の一部のみを含むクローン。', aliases: ['浅いクローン'] },
  { term: 'orphan branch', description: '他のコミットと履歴を共有しない孤立ブランチ。' },
  { term: 'tracking branch', description: 'リモートブランチを追跡するローカルブランチ。', aliases: ['追跡ブランチ'] },
  { term: 'upstream branch', description: 'ローカルブランチが追跡するリモートブランチ。', aliases: ['上流ブランチ'] },
  { term: 'refspec', description: 'リモートとローカルの参照のマッピング形式。' },
  { term: 'plumbing', description: 'Gitの低レベルコマンド群。' },
  { term: 'porcelain', description: 'Gitの高レベル（ユーザー向け）コマンド群。' },
];

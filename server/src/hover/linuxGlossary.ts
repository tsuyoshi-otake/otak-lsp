/**
 * Linux用語集
 * Linuxコマンド・オプションの説明
 */

import { CliGlossaryEntry } from './gitGlossary';

export const LINUX_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === ファイル・ディレクトリ操作 ===
  { term: 'ls', description: 'ディレクトリの内容を一覧表示する。' },
  { term: 'ls -l', description: '詳細情報（権限・所有者・サイズ等）を表示。' },
  { term: 'ls -a', description: '隠しファイル（.で始まるファイル）も表示。', aliases: ['ls --all'] },
  { term: 'ls -la', description: '隠しファイルを含む詳細一覧を表示。' },
  { term: 'ls -lh', description: 'ファイルサイズを人間が読みやすい形式で表示。', aliases: ['ls --human-readable'] },
  { term: 'ls -R', description: 'サブディレクトリも再帰的に表示。', aliases: ['ls --recursive'] },
  { term: 'ls -t', description: '更新時刻順にソート。' },
  { term: 'ls -S', description: 'ファイルサイズ順にソート。' },
  { term: 'ls -r', description: '逆順にソート。', aliases: ['ls --reverse'] },
  { term: 'ls -i', description: 'inode番号を表示。', aliases: ['ls --inode'] },
  { term: 'ls -d', description: 'ディレクトリ自体を表示（中身ではなく）。', aliases: ['ls --directory'] },
  { term: 'ls -1', description: '1行に1ファイルで表示。' },
  { term: 'ls --color', description: '色付きで表示。' },

  { term: 'cd', description: 'ディレクトリを移動する。', aliases: ['chdir'] },
  { term: 'cd ~', description: 'ホームディレクトリに移動。' },
  { term: 'cd -', description: '直前のディレクトリに移動。' },
  { term: 'cd ..', description: '親ディレクトリに移動。' },
  { term: 'cd /', description: 'ルートディレクトリに移動。' },

  { term: 'pwd', description: '現在の作業ディレクトリを表示する。' },
  { term: 'pwd -P', description: 'シンボリックリンクを解決した実パスを表示。', aliases: ['pwd --physical'] },

  { term: 'mkdir', description: 'ディレクトリを作成する。' },
  { term: 'mkdir -p', description: '必要に応じて親ディレクトリも作成。', aliases: ['mkdir --parents'] },
  { term: 'mkdir -m', description: 'パーミッションを指定して作成。', aliases: ['mkdir --mode'] },
  { term: 'mkdir -v', description: '作成したディレクトリを表示。', aliases: ['mkdir --verbose'] },

  { term: 'rmdir', description: '空のディレクトリを削除する。' },
  { term: 'rmdir -p', description: '親ディレクトリも空なら削除。', aliases: ['rmdir --parents'] },

  { term: 'touch', description: 'ファイルのタイムスタンプを更新（存在しなければ作成）。' },
  { term: 'touch -a', description: 'アクセス時刻のみ更新。' },
  { term: 'touch -m', description: '更新時刻のみ更新。' },
  { term: 'touch -t', description: '指定した時刻に設定。' },
  { term: 'touch -d', description: '日時を文字列で指定。', aliases: ['touch --date'] },
  { term: 'touch -c', description: 'ファイルが存在しない場合は作成しない。', aliases: ['touch --no-create'] },

  { term: 'cp', description: 'ファイル・ディレクトリをコピーする。' },
  { term: 'cp -r', description: 'ディレクトリを再帰的にコピー。', aliases: ['cp -R', 'cp --recursive'] },
  { term: 'cp -i', description: '上書き前に確認。', aliases: ['cp --interactive'] },
  { term: 'cp -f', description: '強制的に上書き。', aliases: ['cp --force'] },
  { term: 'cp -n', description: '既存ファイルを上書きしない。', aliases: ['cp --no-clobber'] },
  { term: 'cp -u', description: 'コピー元が新しい場合のみコピー。', aliases: ['cp --update'] },
  { term: 'cp -p', description: '属性（タイムスタンプ等）を保持。', aliases: ['cp --preserve'] },
  { term: 'cp -a', description: 'アーカイブモード（-dR --preserve=all）。', aliases: ['cp --archive'] },
  { term: 'cp -l', description: 'ハードリンクを作成。', aliases: ['cp --link'] },
  { term: 'cp -s', description: 'シンボリックリンクを作成。', aliases: ['cp --symbolic-link'] },
  { term: 'cp -v', description: 'コピーしたファイルを表示。', aliases: ['cp --verbose'] },

  { term: 'mv', description: 'ファイル・ディレクトリを移動または名前変更する。' },
  { term: 'mv -i', description: '上書き前に確認。', aliases: ['mv --interactive'] },
  { term: 'mv -f', description: '強制的に上書き。', aliases: ['mv --force'] },
  { term: 'mv -n', description: '既存ファイルを上書きしない。', aliases: ['mv --no-clobber'] },
  { term: 'mv -u', description: '移動元が新しい場合のみ移動。', aliases: ['mv --update'] },
  { term: 'mv -v', description: '移動したファイルを表示。', aliases: ['mv --verbose'] },
  { term: 'mv -t', description: '移動先ディレクトリを指定。', aliases: ['mv --target-directory'] },

  { term: 'rm', description: 'ファイル・ディレクトリを削除する。' },
  { term: 'rm -r', description: 'ディレクトリを再帰的に削除。', aliases: ['rm -R', 'rm --recursive'] },
  { term: 'rm -f', description: '確認なしで強制削除。', aliases: ['rm --force'] },
  { term: 'rm -rf', description: '確認なしで再帰的に強制削除。' },
  { term: 'rm -i', description: '削除前に確認。', aliases: ['rm --interactive'] },
  { term: 'rm -v', description: '削除したファイルを表示。', aliases: ['rm --verbose'] },
  { term: 'rm -d', description: '空のディレクトリを削除。', aliases: ['rm --dir'] },

  { term: 'ln', description: 'リンクを作成する。' },
  { term: 'ln -s', description: 'シンボリックリンクを作成。', aliases: ['ln --symbolic'] },
  { term: 'ln -f', description: '既存リンクを上書き。', aliases: ['ln --force'] },
  { term: 'ln -v', description: '作成したリンクを表示。', aliases: ['ln --verbose'] },
  { term: 'ln -n', description: 'シンボリックリンクを通常ファイルとして扱う。', aliases: ['ln --no-dereference'] },

  // === ファイル表示・編集 ===
  { term: 'cat', description: 'ファイルの内容を表示する。' },
  { term: 'cat -n', description: '行番号を表示。', aliases: ['cat --number'] },
  { term: 'cat -b', description: '空行以外に行番号を表示。', aliases: ['cat --number-nonblank'] },
  { term: 'cat -s', description: '連続する空行を1行に圧縮。', aliases: ['cat --squeeze-blank'] },
  { term: 'cat -A', description: '制御文字・行末を表示。', aliases: ['cat --show-all'] },
  { term: 'cat -E', description: '行末に$を表示。', aliases: ['cat --show-ends'] },
  { term: 'cat -T', description: 'タブを^Iで表示。', aliases: ['cat --show-tabs'] },

  { term: 'less', description: 'ファイルをページ単位で表示する（スクロール可能）。' },
  { term: 'less -N', description: '行番号を表示。', aliases: ['less --LINE-NUMBERS'] },
  { term: 'less -S', description: '長い行を折り返さない。', aliases: ['less --chop-long-lines'] },
  { term: 'less +F', description: 'ファイル末尾を追跡（tail -fと同様）。' },
  { term: 'less -X', description: '終了時に画面をクリアしない。' },

  { term: 'more', description: 'ファイルをページ単位で表示する（前方スクロールのみ）。' },

  { term: 'head', description: 'ファイルの先頭を表示する。' },
  { term: 'head -n', description: '表示する行数を指定。', aliases: ['head --lines'] },
  { term: 'head -c', description: '表示するバイト数を指定。', aliases: ['head --bytes'] },

  { term: 'tail', description: 'ファイルの末尾を表示する。' },
  { term: 'tail -n', description: '表示する行数を指定。', aliases: ['tail --lines'] },
  { term: 'tail -c', description: '表示するバイト数を指定。', aliases: ['tail --bytes'] },
  { term: 'tail -f', description: 'ファイル追記をリアルタイムで追跡。', aliases: ['tail --follow'] },
  { term: 'tail -F', description: '-fに加えファイルローテーションにも対応。', aliases: ['tail --follow=name --retry'] },

  { term: 'wc', description: '行数・単語数・バイト数をカウントする。' },
  { term: 'wc -l', description: '行数のみ表示。', aliases: ['wc --lines'] },
  { term: 'wc -w', description: '単語数のみ表示。', aliases: ['wc --words'] },
  { term: 'wc -c', description: 'バイト数のみ表示。', aliases: ['wc --bytes'] },
  { term: 'wc -m', description: '文字数を表示。', aliases: ['wc --chars'] },

  { term: 'nl', description: '行番号を付けて表示する。' },
  { term: 'nl -ba', description: '全ての行に番号を付ける。' },

  { term: 'tac', description: 'ファイルを逆順に表示する（catの逆）。' },

  { term: 'rev', description: '各行を逆順に表示する。' },

  // === 検索・フィルタ ===
  { term: 'grep', description: 'パターンにマッチする行を検索する。' },
  { term: 'grep -i', description: '大文字小文字を区別しない。', aliases: ['grep --ignore-case'] },
  { term: 'grep -v', description: 'マッチしない行を表示。', aliases: ['grep --invert-match'] },
  { term: 'grep -r', description: 'ディレクトリを再帰的に検索。', aliases: ['grep -R', 'grep --recursive'] },
  { term: 'grep -l', description: 'マッチしたファイル名のみ表示。', aliases: ['grep --files-with-matches'] },
  { term: 'grep -L', description: 'マッチしないファイル名を表示。', aliases: ['grep --files-without-match'] },
  { term: 'grep -n', description: '行番号を表示。', aliases: ['grep --line-number'] },
  { term: 'grep -c', description: 'マッチ数を表示。', aliases: ['grep --count'] },
  { term: 'grep -w', description: '単語単位でマッチ。', aliases: ['grep --word-regexp'] },
  { term: 'grep -x', description: '行全体がマッチ。', aliases: ['grep --line-regexp'] },
  { term: 'grep -E', description: '拡張正規表現を使用。', aliases: ['grep --extended-regexp', 'egrep'] },
  { term: 'grep -F', description: '固定文字列として検索（正規表現を使わない）。', aliases: ['grep --fixed-strings', 'fgrep'] },
  { term: 'grep -P', description: 'Perl互換正規表現を使用。', aliases: ['grep --perl-regexp'] },
  { term: 'grep -o', description: 'マッチした部分のみ表示。', aliases: ['grep --only-matching'] },
  { term: 'grep -A', description: 'マッチ行の後の行も表示。', aliases: ['grep --after-context'] },
  { term: 'grep -B', description: 'マッチ行の前の行も表示。', aliases: ['grep --before-context'] },
  { term: 'grep -C', description: 'マッチ行の前後の行を表示。', aliases: ['grep --context'] },
  { term: 'grep -e', description: '検索パターンを指定（複数指定可）。', aliases: ['grep --regexp'] },
  { term: 'grep -f', description: 'ファイルからパターンを読み込み。', aliases: ['grep --file'] },
  { term: 'grep --include', description: '対象ファイルをパターンで指定。' },
  { term: 'grep --exclude', description: '除外ファイルをパターンで指定。' },
  { term: 'grep --exclude-dir', description: '除外ディレクトリを指定。' },
  { term: 'grep --color', description: 'マッチ部分を色付け。' },

  { term: 'egrep', description: '拡張正規表現でgrep（grep -Eと同等）。' },
  { term: 'fgrep', description: '固定文字列でgrep（grep -Fと同等）。' },

  { term: 'find', description: 'ファイルを検索する。' },
  { term: 'find -name', description: 'ファイル名で検索（ワイルドカード可）。' },
  { term: 'find -iname', description: 'ファイル名で検索（大文字小文字無視）。' },
  { term: 'find -type', description: 'ファイルタイプで検索（f:ファイル, d:ディレクトリ, l:リンク）。' },
  { term: 'find -size', description: 'サイズで検索（+10M:10MB以上）。' },
  { term: 'find -mtime', description: '更新日時で検索（-7:7日以内）。' },
  { term: 'find -atime', description: 'アクセス日時で検索。' },
  { term: 'find -ctime', description: '属性変更日時で検索。' },
  { term: 'find -mmin', description: '更新時刻（分単位）で検索。' },
  { term: 'find -newer', description: '指定ファイルより新しいファイルを検索。' },
  { term: 'find -user', description: '所有者で検索。' },
  { term: 'find -group', description: 'グループで検索。' },
  { term: 'find -perm', description: 'パーミッションで検索。' },
  { term: 'find -empty', description: '空のファイル・ディレクトリを検索。' },
  { term: 'find -maxdepth', description: '検索する深さの最大値。' },
  { term: 'find -mindepth', description: '検索する深さの最小値。' },
  { term: 'find -exec', description: '見つかったファイルにコマンドを実行。' },
  { term: 'find -print', description: 'ファイルパスを出力。' },
  { term: 'find -print0', description: 'NULL区切りで出力（xargs -0と組み合わせ）。' },
  { term: 'find -delete', description: '見つかったファイルを削除。' },
  { term: 'find -ls', description: 'ls -l形式で表示。' },
  { term: 'find -not', description: '条件を否定。', aliases: ['find !'] },
  { term: 'find -and', description: '条件のAND。', aliases: ['find -a'] },
  { term: 'find -or', description: '条件のOR。', aliases: ['find -o'] },

  { term: 'locate', description: 'データベースを使った高速ファイル検索。' },
  { term: 'locate -i', description: '大文字小文字を区別しない。', aliases: ['locate --ignore-case'] },
  { term: 'updatedb', description: 'locateのデータベースを更新。' },

  { term: 'which', description: 'コマンドの実行ファイルパスを表示。' },
  { term: 'whereis', description: 'コマンドのバイナリ・ソース・マニュアルの場所を表示。' },
  { term: 'type', description: 'コマンドの種類（エイリアス、ビルトイン等）を表示。' },

  { term: 'xargs', description: '標準入力からコマンドライン引数を構築して実行。' },
  { term: 'xargs -0', description: 'NULL区切りで入力を受け取る。', aliases: ['xargs --null'] },
  { term: 'xargs -n', description: '1回の実行で使う引数の数を指定。', aliases: ['xargs --max-args'] },
  { term: 'xargs -I', description: '置換文字列を指定。', aliases: ['xargs --replace'] },
  { term: 'xargs -P', description: '並列実行数を指定。', aliases: ['xargs --max-procs'] },
  { term: 'xargs -p', description: '実行前に確認。', aliases: ['xargs --interactive'] },
  { term: 'xargs -t', description: '実行するコマンドを表示。', aliases: ['xargs --verbose'] },

  // === テキスト処理 ===
  { term: 'sed', description: 'ストリームエディタ。テキストの変換・置換を行う。' },
  { term: 'sed s/old/new/', description: 'oldをnewに置換（最初の1つ）。' },
  { term: 'sed s/old/new/g', description: 'oldをnewに全て置換。' },
  { term: 'sed -i', description: 'ファイルを直接編集。', aliases: ['sed --in-place'] },
  { term: 'sed -n', description: '自動出力を抑制。', aliases: ['sed --quiet', 'sed --silent'] },
  { term: 'sed -e', description: '複数の編集コマンドを指定。', aliases: ['sed --expression'] },
  { term: 'sed -f', description: 'スクリプトファイルを指定。', aliases: ['sed --file'] },
  { term: 'sed -r', description: '拡張正規表現を使用。', aliases: ['sed -E', 'sed --regexp-extended'] },
  { term: 'sed d', description: '行を削除。' },
  { term: 'sed p', description: '行を出力。' },
  { term: 'sed a', description: '行の後に追加。' },
  { term: 'sed i', description: '行の前に挿入。' },
  { term: 'sed c', description: '行を置換。' },

  { term: 'awk', description: 'パターン処理言語。テキストの解析・加工に使用。' },
  { term: 'awk \'{print}\' ', description: '各行を出力。' },
  { term: 'awk \'{print $1}\'', description: '1番目のフィールドを出力。' },
  { term: 'awk -F', description: 'フィールド区切り文字を指定。', aliases: ['awk --field-separator'] },
  { term: 'awk -v', description: '変数を設定。' },
  { term: 'awk NR', description: '行番号を参照。' },
  { term: 'awk NF', description: 'フィールド数を参照。' },
  { term: 'awk BEGIN', description: '処理開始前に実行。' },
  { term: 'awk END', description: '処理終了後に実行。' },

  { term: 'cut', description: 'テキストの一部を切り出す。' },
  { term: 'cut -d', description: '区切り文字を指定。', aliases: ['cut --delimiter'] },
  { term: 'cut -f', description: 'フィールドを指定。', aliases: ['cut --fields'] },
  { term: 'cut -c', description: '文字位置を指定。', aliases: ['cut --characters'] },
  { term: 'cut -b', description: 'バイト位置を指定。', aliases: ['cut --bytes'] },

  { term: 'sort', description: '行をソートする。' },
  { term: 'sort -r', description: '逆順ソート。', aliases: ['sort --reverse'] },
  { term: 'sort -n', description: '数値としてソート。', aliases: ['sort --numeric-sort'] },
  { term: 'sort -k', description: 'ソートキーを指定。', aliases: ['sort --key'] },
  { term: 'sort -t', description: 'フィールド区切り文字を指定。', aliases: ['sort --field-separator'] },
  { term: 'sort -u', description: '重複行を削除。', aliases: ['sort --unique'] },
  { term: 'sort -f', description: '大文字小文字を区別しない。', aliases: ['sort --ignore-case'] },
  { term: 'sort -h', description: '人間が読める数値（1K、2M等）をソート。', aliases: ['sort --human-numeric-sort'] },
  { term: 'sort -M', description: '月名でソート。', aliases: ['sort --month-sort'] },

  { term: 'uniq', description: '連続する重複行を削除する。' },
  { term: 'uniq -c', description: '出現回数を表示。', aliases: ['uniq --count'] },
  { term: 'uniq -d', description: '重複行のみ表示。', aliases: ['uniq --repeated'] },
  { term: 'uniq -u', description: '非重複行のみ表示。', aliases: ['uniq --unique'] },
  { term: 'uniq -i', description: '大文字小文字を区別しない。', aliases: ['uniq --ignore-case'] },

  { term: 'tr', description: '文字を変換・削除する。' },
  { term: 'tr -d', description: '指定文字を削除。', aliases: ['tr --delete'] },
  { term: 'tr -s', description: '連続する文字を1つに圧縮。', aliases: ['tr --squeeze-repeats'] },
  { term: 'tr -c', description: '指定文字以外を対象。', aliases: ['tr --complement'] },
  { term: 'tr a-z A-Z', description: '小文字を大文字に変換。' },
  { term: 'tr [:lower:] [:upper:]', description: '小文字を大文字に変換。' },

  { term: 'diff', description: '2つのファイルの差分を表示する。' },
  { term: 'diff -u', description: 'unified形式で表示。', aliases: ['diff --unified'] },
  { term: 'diff -c', description: 'context形式で表示。', aliases: ['diff --context'] },
  { term: 'diff -r', description: 'ディレクトリを再帰的に比較。', aliases: ['diff --recursive'] },
  { term: 'diff -q', description: '差異の有無のみ表示。', aliases: ['diff --brief'] },
  { term: 'diff -i', description: '大文字小文字を無視。', aliases: ['diff --ignore-case'] },
  { term: 'diff -w', description: '空白の違いを無視。', aliases: ['diff --ignore-all-space'] },
  { term: 'diff -y', description: '横並びで表示。', aliases: ['diff --side-by-side'] },
  { term: 'diff --color', description: '色付きで表示。' },

  { term: 'cmp', description: '2つのファイルをバイト単位で比較。' },

  { term: 'comm', description: 'ソート済みファイル2つを比較。' },

  { term: 'paste', description: '複数ファイルを横に連結。' },
  { term: 'paste -d', description: '区切り文字を指定。', aliases: ['paste --delimiters'] },

  { term: 'join', description: '共通フィールドで2ファイルを結合。' },

  { term: 'split', description: 'ファイルを分割する。' },
  { term: 'split -l', description: '行数で分割。', aliases: ['split --lines'] },
  { term: 'split -b', description: 'バイト数で分割。', aliases: ['split --bytes'] },

  { term: 'tee', description: '標準入力をファイルと標準出力に出力。' },
  { term: 'tee -a', description: 'ファイルに追記。', aliases: ['tee --append'] },

  // === 権限・所有者 ===
  { term: 'chmod', description: 'ファイルのパーミッションを変更する。' },
  { term: 'chmod +x', description: '実行権限を追加。' },
  { term: 'chmod -x', description: '実行権限を削除。' },
  { term: 'chmod 755', description: 'rwxr-xr-x（所有者:全権限、他:読み取り・実行）。' },
  { term: 'chmod 644', description: 'rw-r--r--（所有者:読み書き、他:読み取りのみ）。' },
  { term: 'chmod 600', description: 'rw-------（所有者のみ読み書き）。' },
  { term: 'chmod -R', description: '再帰的に変更。', aliases: ['chmod --recursive'] },
  { term: 'chmod u+x', description: '所有者に実行権限を追加。' },
  { term: 'chmod g+w', description: 'グループに書き込み権限を追加。' },
  { term: 'chmod o-r', description: 'その他から読み取り権限を削除。' },
  { term: 'chmod a+r', description: '全員に読み取り権限を追加。' },

  { term: 'chown', description: 'ファイルの所有者を変更する。' },
  { term: 'chown user:group', description: '所有者とグループを変更。' },
  { term: 'chown -R', description: '再帰的に変更。', aliases: ['chown --recursive'] },
  { term: 'chown --from', description: '現在の所有者を指定して変更。' },

  { term: 'chgrp', description: 'ファイルのグループを変更する。' },
  { term: 'chgrp -R', description: '再帰的に変更。', aliases: ['chgrp --recursive'] },

  { term: 'umask', description: 'デフォルトのパーミッションマスクを設定。' },

  // === プロセス管理 ===
  { term: 'ps', description: '実行中のプロセスを表示する。' },
  { term: 'ps aux', description: '全プロセスの詳細を表示。' },
  { term: 'ps -ef', description: '全プロセスをフル形式で表示。' },
  { term: 'ps -u', description: '指定ユーザーのプロセスを表示。' },
  { term: 'ps -p', description: '指定PIDのプロセスを表示。' },
  { term: 'ps --forest', description: 'ツリー形式で表示。' },

  { term: 'top', description: 'リアルタイムでプロセス情報を表示。' },
  { term: 'htop', description: '対話的なプロセスビューア（インストール必要）。' },

  { term: 'kill', description: 'プロセスにシグナルを送信する。' },
  { term: 'kill -9', description: 'SIGKILLで強制終了。', aliases: ['kill -KILL'] },
  { term: 'kill -15', description: 'SIGTERMで終了（デフォルト）。', aliases: ['kill -TERM'] },
  { term: 'kill -HUP', description: 'SIGHUPを送信（再起動等）。', aliases: ['kill -1'] },
  { term: 'kill -STOP', description: 'プロセスを一時停止。' },
  { term: 'kill -CONT', description: '停止したプロセスを再開。' },

  { term: 'killall', description: '名前でプロセスを終了。' },
  { term: 'pkill', description: 'パターンでプロセスを終了。' },
  { term: 'pgrep', description: 'パターンでプロセスIDを検索。' },

  { term: 'nohup', description: 'ログアウト後もプロセスを継続。' },
  { term: 'bg', description: 'ジョブをバックグラウンドで実行。' },
  { term: 'fg', description: 'ジョブをフォアグラウンドに戻す。' },
  { term: 'jobs', description: 'バックグラウンドジョブを一覧表示。' },
  { term: 'disown', description: 'ジョブをシェルから切り離す。' },

  { term: 'nice', description: '優先度を指定してコマンドを実行。' },
  { term: 'renice', description: '実行中プロセスの優先度を変更。' },

  { term: 'timeout', description: '指定時間後にコマンドを終了。' },
  { term: 'watch', description: 'コマンドを定期的に実行して結果を表示。' },
  { term: 'watch -n', description: '実行間隔を秒で指定。' },
  { term: 'watch -d', description: '変更箇所をハイライト。' },

  // === ネットワーク ===
  { term: 'curl', description: 'URLからデータを転送する。' },
  { term: 'curl -o', description: '出力ファイルを指定。', aliases: ['curl --output'] },
  { term: 'curl -O', description: 'URL末尾の名前で保存。', aliases: ['curl --remote-name'] },
  { term: 'curl -L', description: 'リダイレクトに追従。', aliases: ['curl --location'] },
  { term: 'curl -I', description: 'ヘッダーのみ取得。', aliases: ['curl --head'] },
  { term: 'curl -X', description: 'HTTPメソッドを指定。', aliases: ['curl --request'] },
  { term: 'curl -H', description: 'ヘッダーを追加。', aliases: ['curl --header'] },
  { term: 'curl -d', description: 'POSTデータを指定。', aliases: ['curl --data'] },
  { term: 'curl -F', description: 'フォームデータを送信。', aliases: ['curl --form'] },
  { term: 'curl -u', description: '認証情報を指定。', aliases: ['curl --user'] },
  { term: 'curl -k', description: 'SSL証明書検証をスキップ。', aliases: ['curl --insecure'] },
  { term: 'curl -s', description: '進捗を表示しない。', aliases: ['curl --silent'] },
  { term: 'curl -v', description: '詳細な情報を表示。', aliases: ['curl --verbose'] },
  { term: 'curl -x', description: 'プロキシを指定。', aliases: ['curl --proxy'] },
  { term: 'curl --retry', description: 'リトライ回数を指定。' },
  { term: 'curl --connect-timeout', description: '接続タイムアウトを指定。' },
  { term: 'curl -w', description: '出力形式を指定。', aliases: ['curl --write-out'] },

  { term: 'wget', description: 'URLからファイルをダウンロードする。' },
  { term: 'wget -O', description: '出力ファイル名を指定。', aliases: ['wget --output-document'] },
  { term: 'wget -c', description: 'ダウンロードを再開。', aliases: ['wget --continue'] },
  { term: 'wget -r', description: '再帰的にダウンロード。', aliases: ['wget --recursive'] },
  { term: 'wget -q', description: '出力を抑制。', aliases: ['wget --quiet'] },
  { term: 'wget --limit-rate', description: 'ダウンロード速度を制限。' },

  { term: 'ssh', description: 'リモートホストに安全に接続する。' },
  { term: 'ssh user@host', description: '指定ユーザーでホストに接続。' },
  { term: 'ssh -p', description: 'ポートを指定。' },
  { term: 'ssh -i', description: '秘密鍵ファイルを指定。' },
  { term: 'ssh -L', description: 'ローカルポートフォワーディング。' },
  { term: 'ssh -R', description: 'リモートポートフォワーディング。' },
  { term: 'ssh -D', description: 'ダイナミックポートフォワーディング（SOCKSプロキシ）。' },
  { term: 'ssh -N', description: 'コマンドを実行しない（トンネル用）。' },
  { term: 'ssh -f', description: 'バックグラウンドで実行。' },
  { term: 'ssh -A', description: 'エージェント転送を有効化。' },
  { term: 'ssh -o', description: 'オプションを指定。' },
  { term: 'ssh -v', description: '詳細な情報を表示。' },

  { term: 'scp', description: 'SSHでファイルをコピーする。' },
  { term: 'scp -r', description: 'ディレクトリを再帰的にコピー。' },
  { term: 'scp -P', description: 'ポートを指定。' },
  { term: 'scp -i', description: '秘密鍵ファイルを指定。' },

  { term: 'rsync', description: '効率的にファイルを同期する。' },
  { term: 'rsync -a', description: 'アーカイブモード（権限等を保持）。', aliases: ['rsync --archive'] },
  { term: 'rsync -v', description: '詳細な情報を表示。', aliases: ['rsync --verbose'] },
  { term: 'rsync -z', description: '転送時に圧縮。', aliases: ['rsync --compress'] },
  { term: 'rsync -P', description: '進捗表示と部分転送。', aliases: ['rsync --partial --progress'] },
  { term: 'rsync --delete', description: '転送元にないファイルを削除。' },
  { term: 'rsync --exclude', description: '除外パターンを指定。' },
  { term: 'rsync -n', description: 'ドライラン（実際には実行しない）。', aliases: ['rsync --dry-run'] },
  { term: 'rsync -e', description: 'リモートシェルを指定（例: ssh）。', aliases: ['rsync --rsh'] },

  { term: 'ping', description: 'ホストへの接続を確認する。' },
  { term: 'ping -c', description: '送信回数を指定。' },
  { term: 'ping -i', description: '送信間隔を指定。' },

  { term: 'traceroute', description: 'ホストまでの経路を表示。' },
  { term: 'tracepath', description: 'MTU探索付きの経路表示。' },

  { term: 'netstat', description: 'ネットワーク接続を表示（非推奨、ss推奨）。' },
  { term: 'netstat -a', description: '全ての接続を表示。' },
  { term: 'netstat -t', description: 'TCP接続を表示。' },
  { term: 'netstat -u', description: 'UDP接続を表示。' },
  { term: 'netstat -l', description: 'リスニングソケットを表示。' },
  { term: 'netstat -n', description: 'アドレスを数値で表示。' },
  { term: 'netstat -p', description: 'PID/プロセス名を表示。' },

  { term: 'ss', description: 'ソケット統計を表示（netstatの後継）。' },
  { term: 'ss -a', description: '全てのソケットを表示。' },
  { term: 'ss -t', description: 'TCPソケットを表示。' },
  { term: 'ss -u', description: 'UDPソケットを表示。' },
  { term: 'ss -l', description: 'リスニングソケットを表示。' },
  { term: 'ss -n', description: 'アドレスを数値で表示。' },
  { term: 'ss -p', description: 'プロセス情報を表示。' },

  { term: 'ifconfig', description: 'ネットワークインターフェースを設定・表示（非推奨、ip推奨）。' },

  { term: 'ip', description: 'ネットワーク設定を管理する（iproute2）。' },
  { term: 'ip addr', description: 'IPアドレスを表示。', aliases: ['ip a'] },
  { term: 'ip link', description: 'ネットワークデバイスを表示。' },
  { term: 'ip route', description: 'ルーティングテーブルを表示。', aliases: ['ip r'] },
  { term: 'ip neigh', description: 'ARPキャッシュを表示。' },

  { term: 'nslookup', description: 'DNSを問い合わせる。' },
  { term: 'dig', description: 'DNS情報を詳細に問い合わせる。' },
  { term: 'host', description: 'DNS名前解決を行う。' },

  { term: 'nc', description: 'ネットワーク接続ユーティリティ（netcat）。' },
  { term: 'nc -l', description: 'リスンモードで待機。' },
  { term: 'nc -z', description: 'ポートスキャン（接続テスト）。' },

  // === アーカイブ・圧縮 ===
  { term: 'tar', description: 'アーカイブを作成・展開する。' },
  { term: 'tar -c', description: 'アーカイブを作成。', aliases: ['tar --create'] },
  { term: 'tar -x', description: 'アーカイブを展開。', aliases: ['tar --extract'] },
  { term: 'tar -t', description: 'アーカイブの内容を一覧表示。', aliases: ['tar --list'] },
  { term: 'tar -f', description: 'アーカイブファイルを指定。', aliases: ['tar --file'] },
  { term: 'tar -v', description: '詳細な情報を表示。', aliases: ['tar --verbose'] },
  { term: 'tar -z', description: 'gzip圧縮を使用。', aliases: ['tar --gzip'] },
  { term: 'tar -j', description: 'bzip2圧縮を使用。', aliases: ['tar --bzip2'] },
  { term: 'tar -J', description: 'xz圧縮を使用。', aliases: ['tar --xz'] },
  { term: 'tar -czf', description: 'gzip圧縮アーカイブを作成。' },
  { term: 'tar -xzf', description: 'gzip圧縮アーカイブを展開。' },
  { term: 'tar -C', description: '展開先ディレクトリを指定。', aliases: ['tar --directory'] },
  { term: 'tar --exclude', description: '除外パターンを指定。' },

  { term: 'gzip', description: 'ファイルをgzip圧縮する。' },
  { term: 'gzip -d', description: '解凍する。', aliases: ['gzip --decompress', 'gunzip'] },
  { term: 'gzip -k', description: '元ファイルを保持。', aliases: ['gzip --keep'] },
  { term: 'gzip -c', description: '標準出力に出力。', aliases: ['gzip --stdout'] },
  { term: 'gzip -1', description: '高速圧縮（低圧縮率）。', aliases: ['gzip --fast'] },
  { term: 'gzip -9', description: '高圧縮率（低速）。', aliases: ['gzip --best'] },

  { term: 'gunzip', description: 'gzip圧縮を解凍する。' },

  { term: 'bzip2', description: 'ファイルをbzip2圧縮する。' },
  { term: 'bunzip2', description: 'bzip2圧縮を解凍する。' },

  { term: 'xz', description: 'ファイルをxz圧縮する。' },
  { term: 'unxz', description: 'xz圧縮を解凍する。' },

  { term: 'zip', description: 'ファイルをzip圧縮する。' },
  { term: 'zip -r', description: 'ディレクトリを再帰的に圧縮。' },
  { term: 'zip -e', description: 'パスワードで暗号化。' },

  { term: 'unzip', description: 'zipファイルを解凍する。' },
  { term: 'unzip -l', description: '内容を一覧表示。' },
  { term: 'unzip -d', description: '展開先ディレクトリを指定。' },

  { term: 'zcat', description: 'gzip圧縮ファイルの内容を表示。' },
  { term: 'zless', description: 'gzip圧縮ファイルをページ表示。' },
  { term: 'zgrep', description: 'gzip圧縮ファイルを検索。' },

  // === システム情報 ===
  { term: 'uname', description: 'システム情報を表示する。' },
  { term: 'uname -a', description: '全ての情報を表示。', aliases: ['uname --all'] },
  { term: 'uname -r', description: 'カーネルバージョンを表示。', aliases: ['uname --kernel-release'] },
  { term: 'uname -m', description: 'マシンアーキテクチャを表示。', aliases: ['uname --machine'] },

  { term: 'hostname', description: 'ホスト名を表示・設定する。' },
  { term: 'hostnamectl', description: 'ホスト名を管理する（systemd）。' },

  { term: 'uptime', description: 'システムの稼働時間を表示。' },

  { term: 'date', description: '日時を表示・設定する。' },
  { term: 'date +%Y-%m-%d', description: '年-月-日形式で表示。' },
  { term: 'date +%H:%M:%S', description: '時:分:秒形式で表示。' },
  { term: 'date -d', description: '指定した日時を表示。', aliases: ['date --date'] },
  { term: 'date -s', description: '日時を設定。', aliases: ['date --set'] },

  { term: 'cal', description: 'カレンダーを表示する。' },

  { term: 'df', description: 'ディスク使用量を表示する。' },
  { term: 'df -h', description: '人間が読みやすい形式で表示。', aliases: ['df --human-readable'] },
  { term: 'df -i', description: 'inode使用量を表示。', aliases: ['df --inodes'] },
  { term: 'df -T', description: 'ファイルシステムタイプを表示。', aliases: ['df --print-type'] },

  { term: 'du', description: 'ディレクトリのサイズを表示する。' },
  { term: 'du -h', description: '人間が読みやすい形式で表示。', aliases: ['du --human-readable'] },
  { term: 'du -s', description: '合計のみ表示。', aliases: ['du --summarize'] },
  { term: 'du -d', description: '表示する深さを指定。', aliases: ['du --max-depth'] },
  { term: 'du -a', description: 'ファイルも表示。', aliases: ['du --all'] },
  { term: 'du --exclude', description: '除外パターンを指定。' },

  { term: 'free', description: 'メモリ使用量を表示する。' },
  { term: 'free -h', description: '人間が読みやすい形式で表示。', aliases: ['free --human'] },
  { term: 'free -m', description: 'MBで表示。', aliases: ['free --mebi'] },
  { term: 'free -g', description: 'GBで表示。', aliases: ['free --gibi'] },

  { term: 'lscpu', description: 'CPU情報を表示する。' },
  { term: 'lsmem', description: 'メモリ情報を表示する。' },
  { term: 'lsblk', description: 'ブロックデバイスを表示する。' },
  { term: 'lsusb', description: 'USBデバイスを表示する。' },
  { term: 'lspci', description: 'PCIデバイスを表示する。' },

  { term: 'dmidecode', description: 'ハードウェア情報を表示する。' },

  { term: 'dmesg', description: 'カーネルメッセージを表示する。' },
  { term: 'dmesg -T', description: 'タイムスタンプを人間が読める形式で表示。' },
  { term: 'dmesg -w', description: 'リアルタイムで追跡。' },

  // === ユーザー・グループ ===
  { term: 'whoami', description: '現在のユーザー名を表示。' },
  { term: 'id', description: 'ユーザー・グループIDを表示。' },
  { term: 'who', description: 'ログイン中のユーザーを表示。' },
  { term: 'w', description: 'ログイン中のユーザーと実行中のコマンドを表示。' },
  { term: 'last', description: 'ログイン履歴を表示。' },
  { term: 'lastlog', description: '最終ログイン情報を表示。' },

  { term: 'users', description: 'ログイン中のユーザー名を表示。' },
  { term: 'groups', description: '所属グループを表示。' },

  { term: 'useradd', description: 'ユーザーを作成する。' },
  { term: 'useradd -m', description: 'ホームディレクトリを作成。' },
  { term: 'useradd -s', description: 'シェルを指定。' },
  { term: 'useradd -g', description: 'プライマリグループを指定。' },
  { term: 'useradd -G', description: '追加グループを指定。' },

  { term: 'userdel', description: 'ユーザーを削除する。' },
  { term: 'userdel -r', description: 'ホームディレクトリも削除。' },

  { term: 'usermod', description: 'ユーザー設定を変更する。' },
  { term: 'usermod -aG', description: 'グループにユーザーを追加。' },
  { term: 'usermod -l', description: 'ユーザー名を変更。' },
  { term: 'usermod -d', description: 'ホームディレクトリを変更。' },
  { term: 'usermod -s', description: 'シェルを変更。' },
  { term: 'usermod -L', description: 'アカウントをロック。' },
  { term: 'usermod -U', description: 'アカウントのロックを解除。' },

  { term: 'passwd', description: 'パスワードを変更する。' },
  { term: 'passwd -l', description: 'アカウントをロック。' },
  { term: 'passwd -u', description: 'ロックを解除。' },
  { term: 'passwd -d', description: 'パスワードを削除。' },
  { term: 'passwd -e', description: 'パスワードを期限切れにする。' },

  { term: 'groupadd', description: 'グループを作成する。' },
  { term: 'groupdel', description: 'グループを削除する。' },
  { term: 'groupmod', description: 'グループ設定を変更する。' },
  { term: 'gpasswd', description: 'グループ管理を行う。' },
  { term: 'gpasswd -a', description: 'ユーザーをグループに追加。' },
  { term: 'gpasswd -d', description: 'ユーザーをグループから削除。' },

  { term: 'su', description: '別のユーザーに切り替える。' },
  { term: 'su -', description: 'ログインシェルとして切り替え。', aliases: ['su -l', 'su --login'] },
  { term: 'su -c', description: 'コマンドを実行して終了。' },

  { term: 'sudo', description: '管理者権限でコマンドを実行する。' },
  { term: 'sudo -i', description: 'rootとしてログインシェルを開始。' },
  { term: 'sudo -s', description: 'rootとしてシェルを開始。' },
  { term: 'sudo -u', description: '指定ユーザーとして実行。' },
  { term: 'sudo -l', description: '許可されているコマンドを表示。' },
  { term: 'sudo -v', description: 'タイムスタンプを更新。' },
  { term: 'sudo -k', description: 'タイムスタンプを無効化。' },

  { term: 'visudo', description: 'sudoersファイルを安全に編集。' },

  // === サービス管理 ===
  { term: 'systemctl', description: 'systemdサービスを管理する。' },
  { term: 'systemctl start', description: 'サービスを開始。' },
  { term: 'systemctl stop', description: 'サービスを停止。' },
  { term: 'systemctl restart', description: 'サービスを再起動。' },
  { term: 'systemctl reload', description: '設定を再読み込み。' },
  { term: 'systemctl status', description: 'サービスの状態を表示。' },
  { term: 'systemctl enable', description: '自動起動を有効化。' },
  { term: 'systemctl disable', description: '自動起動を無効化。' },
  { term: 'systemctl is-active', description: 'アクティブか確認。' },
  { term: 'systemctl is-enabled', description: '有効か確認。' },
  { term: 'systemctl list-units', description: 'ユニット一覧を表示。' },
  { term: 'systemctl list-unit-files', description: 'ユニットファイル一覧を表示。' },
  { term: 'systemctl daemon-reload', description: 'ユニットファイルを再読み込み。' },
  { term: 'systemctl mask', description: 'サービスをマスク（完全無効化）。' },
  { term: 'systemctl unmask', description: 'マスクを解除。' },

  { term: 'service', description: 'SysVinitスタイルでサービスを管理。' },
  { term: 'service <name> start', description: 'サービスを開始。' },
  { term: 'service <name> stop', description: 'サービスを停止。' },
  { term: 'service <name> status', description: 'サービスの状態を表示。' },

  { term: 'journalctl', description: 'systemdジャーナルログを表示。' },
  { term: 'journalctl -u', description: '指定ユニットのログを表示。' },
  { term: 'journalctl -f', description: 'リアルタイムで追跡。' },
  { term: 'journalctl -n', description: '最新n行を表示。' },
  { term: 'journalctl --since', description: '指定時刻以降のログを表示。' },
  { term: 'journalctl --until', description: '指定時刻以前のログを表示。' },
  { term: 'journalctl -b', description: '現在のブート以降のログを表示。' },
  { term: 'journalctl -p', description: '優先度でフィルタ。' },
  { term: 'journalctl -k', description: 'カーネルメッセージを表示。' },
  { term: 'journalctl --disk-usage', description: 'ディスク使用量を表示。' },
  { term: 'journalctl --vacuum-size', description: 'サイズを指定して古いログを削除。' },

  // === その他 ===
  { term: 'man', description: 'マニュアルページを表示する。' },
  { term: 'man -k', description: 'キーワードでマニュアルを検索。' },
  { term: 'apropos', description: 'マニュアルを検索する（man -kと同等）。' },
  { term: 'info', description: 'infoドキュメントを表示。' },

  { term: 'echo', description: 'テキストを出力する。' },
  { term: 'echo -n', description: '改行なしで出力。' },
  { term: 'echo -e', description: 'エスケープシーケンスを解釈。' },

  { term: 'printf', description: 'フォーマットして出力する。' },

  { term: 'env', description: '環境変数を表示・設定する。' },
  { term: 'printenv', description: '環境変数を表示する。' },
  { term: 'export', description: '環境変数を設定する。' },
  { term: 'unset', description: '変数を削除する。' },

  { term: 'alias', description: 'コマンドの別名を設定する。' },
  { term: 'unalias', description: 'エイリアスを削除する。' },

  { term: 'history', description: 'コマンド履歴を表示する。' },
  { term: 'history -c', description: '履歴をクリア。' },

  { term: 'clear', description: '画面をクリアする。' },
  { term: 'reset', description: '端末をリセットする。' },

  { term: 'exit', description: 'シェルを終了する。' },
  { term: 'logout', description: 'ログインシェルを終了する。' },

  { term: 'sleep', description: '指定時間待機する。' },

  { term: 'yes', description: '指定文字を繰り返し出力する。' },

  { term: 'true', description: '常に成功を返す（終了コード0）。' },
  { term: 'false', description: '常に失敗を返す（終了コード1）。' },

  { term: 'seq', description: '連番を出力する。' },

  { term: 'basename', description: 'パスからファイル名を抽出。' },
  { term: 'dirname', description: 'パスからディレクトリ部分を抽出。' },
  { term: 'realpath', description: '正規化した絶対パスを表示。' },
  { term: 'readlink', description: 'シンボリックリンクの参照先を表示。' },

  { term: 'stat', description: 'ファイルの詳細情報を表示。' },
  { term: 'file', description: 'ファイルタイプを判定する。' },

  { term: 'md5sum', description: 'MD5ハッシュを計算する。' },
  { term: 'sha1sum', description: 'SHA-1ハッシュを計算する。' },
  { term: 'sha256sum', description: 'SHA-256ハッシュを計算する。' },

  { term: 'mktemp', description: '一時ファイル・ディレクトリを作成。' },

  { term: 'crontab', description: '定期実行タスクを管理する。' },
  { term: 'crontab -e', description: 'crontabを編集。' },
  { term: 'crontab -l', description: 'crontabを一覧表示。' },
  { term: 'crontab -r', description: 'crontabを削除。' },

  { term: 'at', description: '指定時刻にコマンドを実行。' },

  { term: 'screen', description: '仮想端末マルチプレクサ。' },
  { term: 'tmux', description: '端末マルチプレクサ。' },

  { term: 'lsof', description: '開いているファイルを表示。' },
  { term: 'lsof -i', description: 'ネットワーク接続を表示。' },
  { term: 'lsof -p', description: '指定PIDのファイルを表示。' },

  { term: 'strace', description: 'システムコールをトレースする。' },
  { term: 'ltrace', description: 'ライブラリコールをトレースする。' },

  { term: 'mount', description: 'ファイルシステムをマウントする。' },
  { term: 'umount', description: 'ファイルシステムをアンマウントする。' },

  { term: 'fdisk', description: 'パーティションを管理する。' },
  { term: 'parted', description: 'パーティションを管理する（GPT対応）。' },

  { term: 'mkfs', description: 'ファイルシステムを作成する。' },
  { term: 'mkfs.ext4', description: 'ext4ファイルシステムを作成。' },

  { term: 'fsck', description: 'ファイルシステムをチェック・修復。' },

  { term: 'sync', description: 'ファイルシステムバッファを同期。' },

  { term: 'shutdown', description: 'システムをシャットダウンする。' },
  { term: 'shutdown -h now', description: '今すぐ停止。' },
  { term: 'shutdown -r now', description: '今すぐ再起動。' },

  { term: 'reboot', description: 'システムを再起動する。' },
  { term: 'halt', description: 'システムを停止する。' },
  { term: 'poweroff', description: '電源を切る。' },

  // === シェル・スクリプト ===
  { term: 'bash', description: 'Bourne Again Shell。最も一般的なシェル。' },
  { term: 'sh', description: 'Bourne Shell。POSIX準拠のシェル。' },
  { term: 'zsh', description: 'Z Shell。高機能シェル。' },
  { term: 'fish', description: 'Friendly Interactive Shell。' },

  { term: 'source', description: 'スクリプトを現在のシェルで実行。', aliases: ['.'] },
  { term: 'exec', description: '現在のプロセスをコマンドで置換。' },
  { term: 'eval', description: '引数をコマンドとして評価・実行。' },

  { term: 'test', description: '条件を評価する。', aliases: ['['] },
  { term: '[[', description: 'bashの拡張条件式。' },

  { term: '$?', description: '直前のコマンドの終了コード。' },
  { term: '$$', description: '現在のシェルのPID。' },
  { term: '$!', description: '最後のバックグラウンドプロセスのPID。' },
  { term: '$#', description: '引数の数。' },
  { term: '$@', description: '全ての引数（個別に展開）。' },
  { term: '$*', description: '全ての引数（1つの文字列として）。' },
  { term: '$0', description: 'スクリプト名。' },
  { term: '$1', description: '1番目の引数。' },
];

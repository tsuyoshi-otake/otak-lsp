/**
 * Windows用語集
 * Windowsコマンド（cmd.exe）・オプションの説明
 */

import { CliGlossaryEntry } from './gitGlossary';

export const WINDOWS_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === ファイル・ディレクトリ操作 ===
  { term: 'dir', description: 'ディレクトリの内容を一覧表示する。' },
  { term: 'dir /a', description: '隠しファイル・システムファイルも表示。' },
  { term: 'dir /ah', description: '隠しファイルのみ表示。' },
  { term: 'dir /ad', description: 'ディレクトリのみ表示。' },
  { term: 'dir /s', description: 'サブディレクトリも再帰的に表示。' },
  { term: 'dir /b', description: 'ファイル名のみ表示（ベア形式）。' },
  { term: 'dir /w', description: 'ワイド形式（横並び）で表示。' },
  { term: 'dir /p', description: 'ページ単位で表示。' },
  { term: 'dir /o', description: 'ソート順を指定（n:名前, s:サイズ, d:日付）。' },
  { term: 'dir /on', description: '名前順でソート。' },
  { term: 'dir /os', description: 'サイズ順でソート。' },
  { term: 'dir /od', description: '日付順でソート。' },
  { term: 'dir /q', description: '所有者を表示。' },

  { term: 'cd', description: 'ディレクトリを移動する。', aliases: ['chdir'] },
  { term: 'cd ..', description: '親ディレクトリに移動。' },
  { term: 'cd \\', description: 'ルートディレクトリに移動。' },
  { term: 'cd /d', description: 'ドライブも同時に変更。' },

  { term: 'md', description: 'ディレクトリを作成する。', aliases: ['mkdir'] },

  { term: 'rd', description: 'ディレクトリを削除する。', aliases: ['rmdir'] },
  { term: 'rd /s', description: 'サブディレクトリも含めて削除。' },
  { term: 'rd /q', description: '確認なしで削除。' },
  { term: 'rd /s /q', description: '確認なしで再帰的に削除。' },

  { term: 'copy', description: 'ファイルをコピーする。' },
  { term: 'copy /y', description: '上書き確認なしでコピー。' },
  { term: 'copy /v', description: 'コピー後に検証。' },
  { term: 'copy /a', description: 'ASCIIテキストファイルとしてコピー。' },
  { term: 'copy /b', description: 'バイナリファイルとしてコピー。' },

  { term: 'xcopy', description: 'ディレクトリを含めてコピー（拡張）。' },
  { term: 'xcopy /s', description: 'サブディレクトリもコピー（空は除く）。' },
  { term: 'xcopy /e', description: 'サブディレクトリもコピー（空も含む）。' },
  { term: 'xcopy /h', description: '隠しファイル・システムファイルもコピー。' },
  { term: 'xcopy /y', description: '上書き確認なしでコピー。' },
  { term: 'xcopy /i', description: '宛先をディレクトリとして扱う。' },
  { term: 'xcopy /d', description: '更新されたファイルのみコピー。' },
  { term: 'xcopy /c', description: 'エラーが発生しても続行。' },
  { term: 'xcopy /q', description: '進捗を表示しない。' },
  { term: 'xcopy /f', description: 'コピー元とコピー先のパスを表示。' },
  { term: 'xcopy /v', description: 'コピー後に検証。' },

  { term: 'robocopy', description: '堅牢なファイルコピー（高機能）。' },
  { term: 'robocopy /s', description: 'サブディレクトリもコピー（空は除く）。' },
  { term: 'robocopy /e', description: 'サブディレクトリもコピー（空も含む）。' },
  { term: 'robocopy /mir', description: 'ミラーリング（削除も同期）。' },
  { term: 'robocopy /mov', description: 'ファイルを移動（コピー後に削除）。' },
  { term: 'robocopy /move', description: 'ファイルとディレクトリを移動。' },
  { term: 'robocopy /purge', description: '宛先にのみ存在するファイルを削除。' },
  { term: 'robocopy /xo', description: '古いファイルを除外。' },
  { term: 'robocopy /xn', description: '新しいファイルを除外。' },
  { term: 'robocopy /xf', description: '指定ファイルを除外。' },
  { term: 'robocopy /xd', description: '指定ディレクトリを除外。' },
  { term: 'robocopy /r', description: 'リトライ回数を指定。' },
  { term: 'robocopy /w', description: 'リトライ間隔（秒）を指定。' },
  { term: 'robocopy /mt', description: 'マルチスレッド数を指定。' },
  { term: 'robocopy /log', description: 'ログファイルを指定。' },
  { term: 'robocopy /np', description: '進捗を表示しない。' },
  { term: 'robocopy /ndl', description: 'ディレクトリ名を表示しない。' },
  { term: 'robocopy /nfl', description: 'ファイル名を表示しない。' },
  { term: 'robocopy /z', description: '再開可能モード。' },
  { term: 'robocopy /b', description: 'バックアップモード。' },
  { term: 'robocopy /copyall', description: '全てのファイル情報をコピー。' },
  { term: 'robocopy /dcopy:t', description: 'ディレクトリのタイムスタンプをコピー。' },

  { term: 'move', description: 'ファイル・ディレクトリを移動または名前変更。' },
  { term: 'move /y', description: '上書き確認なしで移動。' },

  { term: 'ren', description: 'ファイル・ディレクトリの名前を変更する。', aliases: ['rename'] },

  { term: 'del', description: 'ファイルを削除する。', aliases: ['erase'] },
  { term: 'del /f', description: '読み取り専用ファイルも強制削除。' },
  { term: 'del /s', description: 'サブディレクトリのファイルも削除。' },
  { term: 'del /q', description: '確認なしで削除。' },
  { term: 'del /a', description: '指定属性のファイルを削除。' },
  { term: 'del /p', description: '削除前に確認。' },

  { term: 'attrib', description: 'ファイル属性を表示・変更する。' },
  { term: 'attrib +r', description: '読み取り専用属性を設定。' },
  { term: 'attrib -r', description: '読み取り専用属性を解除。' },
  { term: 'attrib +h', description: '隠し属性を設定。' },
  { term: 'attrib -h', description: '隠し属性を解除。' },
  { term: 'attrib +s', description: 'システム属性を設定。' },
  { term: 'attrib -s', description: 'システム属性を解除。' },
  { term: 'attrib +a', description: 'アーカイブ属性を設定。' },
  { term: 'attrib /s', description: 'サブディレクトリも処理。' },
  { term: 'attrib /d', description: 'ディレクトリも処理。' },

  { term: 'tree', description: 'ディレクトリ構造をツリー形式で表示。' },
  { term: 'tree /f', description: 'ファイルも表示。' },
  { term: 'tree /a', description: 'ASCII文字で表示。' },

  // === ファイル表示 ===
  { term: 'type', description: 'ファイルの内容を表示する。' },

  { term: 'more', description: 'ファイルをページ単位で表示する。' },
  { term: 'more /c', description: '画面をクリアしてから表示。' },
  { term: 'more /p', description: 'フォームフィードを展開。' },
  { term: 'more /s', description: '連続する空行を1行に圧縮。' },
  { term: 'more +n', description: 'n行目から表示。' },

  // === 検索 ===
  { term: 'find', description: 'ファイル内の文字列を検索する。' },
  { term: 'find /i', description: '大文字小文字を区別しない。' },
  { term: 'find /v', description: '指定文字列を含まない行を表示。' },
  { term: 'find /c', description: 'マッチする行数を表示。' },
  { term: 'find /n', description: '行番号を表示。' },

  { term: 'findstr', description: '正規表現で文字列を検索する（拡張）。' },
  { term: 'findstr /i', description: '大文字小文字を区別しない。' },
  { term: 'findstr /s', description: 'サブディレクトリも検索。' },
  { term: 'findstr /r', description: '正規表現として検索。' },
  { term: 'findstr /l', description: 'リテラル文字列として検索。' },
  { term: 'findstr /v', description: 'マッチしない行を表示。' },
  { term: 'findstr /n', description: '行番号を表示。' },
  { term: 'findstr /m', description: 'ファイル名のみ表示。' },
  { term: 'findstr /c:', description: '検索文字列を指定。' },
  { term: 'findstr /g:', description: 'ファイルから検索文字列を読み込み。' },
  { term: 'findstr /f:', description: '検索対象ファイルリストを指定。' },
  { term: 'findstr /x', description: '行全体がマッチ。' },
  { term: 'findstr /b', description: '行頭でマッチ。' },
  { term: 'findstr /e', description: '行末でマッチ。' },

  { term: 'where', description: 'コマンドの場所を検索する。' },
  { term: 'where /r', description: '指定ディレクトリから再帰的に検索。' },
  { term: 'where /q', description: '終了コードのみ返す。' },

  // === 比較 ===
  { term: 'fc', description: '2つのファイルを比較する。' },
  { term: 'fc /b', description: 'バイナリ比較。' },
  { term: 'fc /c', description: '大文字小文字を区別しない。' },
  { term: 'fc /l', description: 'ASCIIテキストとして比較。' },
  { term: 'fc /n', description: '行番号を表示。' },
  { term: 'fc /w', description: '空白を圧縮して比較。' },

  { term: 'comp', description: '2つのファイルをバイト単位で比較。' },

  // === システム情報 ===
  { term: 'systeminfo', description: 'システムの詳細情報を表示する。' },
  { term: 'hostname', description: 'コンピューター名を表示する。' },
  { term: 'ver', description: 'Windowsのバージョンを表示する。' },
  { term: 'winver', description: 'Windowsバージョン情報ダイアログを表示。' },

  { term: 'whoami', description: '現在のユーザー名を表示する。' },
  { term: 'whoami /user', description: 'ユーザーSIDを表示。' },
  { term: 'whoami /groups', description: '所属グループを表示。' },
  { term: 'whoami /priv', description: '特権を表示。' },
  { term: 'whoami /all', description: '全ての情報を表示。' },

  { term: 'date', description: '日付を表示・設定する。' },
  { term: 'date /t', description: '日付を表示のみ。' },
  { term: 'time', description: '時刻を表示・設定する。' },
  { term: 'time /t', description: '時刻を表示のみ。' },

  // === ネットワーク ===
  { term: 'ipconfig', description: 'IPアドレス設定を表示する。' },
  { term: 'ipconfig /all', description: '詳細な設定を表示。' },
  { term: 'ipconfig /release', description: 'IPアドレスを解放。' },
  { term: 'ipconfig /renew', description: 'IPアドレスを更新。' },
  { term: 'ipconfig /flushdns', description: 'DNSキャッシュをクリア。' },
  { term: 'ipconfig /displaydns', description: 'DNSキャッシュを表示。' },
  { term: 'ipconfig /registerdns', description: 'DNSを再登録。' },

  { term: 'ping', description: 'ホストへの接続を確認する。' },
  { term: 'ping -t', description: '中断されるまでping継続。' },
  { term: 'ping -n', description: '送信回数を指定。' },
  { term: 'ping -l', description: 'パケットサイズを指定。' },
  { term: 'ping -a', description: 'IPアドレスを名前解決。' },
  { term: 'ping -4', description: 'IPv4を使用。' },
  { term: 'ping -6', description: 'IPv6を使用。' },

  { term: 'tracert', description: 'ホストまでの経路を表示する。' },
  { term: 'tracert -d', description: '名前解決しない。' },
  { term: 'tracert -h', description: '最大ホップ数を指定。' },
  { term: 'tracert -w', description: 'タイムアウト時間を指定。' },

  { term: 'pathping', description: 'tracert+pingの拡張コマンド。' },

  { term: 'netstat', description: 'ネットワーク接続を表示する。' },
  { term: 'netstat -a', description: '全ての接続を表示。' },
  { term: 'netstat -n', description: 'アドレスを数値で表示。' },
  { term: 'netstat -o', description: 'PIDを表示。' },
  { term: 'netstat -b', description: '実行ファイル名を表示。' },
  { term: 'netstat -r', description: 'ルーティングテーブルを表示。' },
  { term: 'netstat -s', description: '統計情報を表示。' },
  { term: 'netstat -p', description: 'プロトコルを指定。' },

  { term: 'nslookup', description: 'DNSを問い合わせる。' },
  { term: 'nslookup -type', description: 'レコードタイプを指定。' },

  { term: 'arp', description: 'ARPキャッシュを表示・管理する。' },
  { term: 'arp -a', description: 'ARPテーブルを表示。' },
  { term: 'arp -d', description: 'ARPエントリを削除。' },
  { term: 'arp -s', description: '静的ARPエントリを追加。' },

  { term: 'route', description: 'ルーティングテーブルを表示・管理する。' },
  { term: 'route print', description: 'ルーティングテーブルを表示。' },
  { term: 'route add', description: 'ルートを追加。' },
  { term: 'route delete', description: 'ルートを削除。' },
  { term: 'route change', description: 'ルートを変更。' },

  { term: 'netsh', description: 'ネットワーク設定を管理する。' },
  { term: 'netsh interface', description: 'インターフェース設定を管理。' },
  { term: 'netsh wlan', description: 'Wi-Fi設定を管理。' },
  { term: 'netsh wlan show profiles', description: 'Wi-Fiプロファイル一覧を表示。' },
  { term: 'netsh firewall', description: 'ファイアウォール設定を管理（非推奨）。' },
  { term: 'netsh advfirewall', description: '高度なファイアウォール設定を管理。' },
  { term: 'netsh int ip reset', description: 'TCP/IPスタックをリセット。' },
  { term: 'netsh winsock reset', description: 'Winsockをリセット。' },

  { term: 'net', description: 'ネットワークリソースを管理する。' },
  { term: 'net use', description: '共有リソースへの接続を管理。' },
  { term: 'net use \\\\server\\share', description: '共有フォルダに接続。' },
  { term: 'net use /delete', description: '接続を切断。' },
  { term: 'net view', description: 'ネットワーク上のコンピューターを表示。' },
  { term: 'net share', description: '共有リソースを表示・管理。' },
  { term: 'net user', description: 'ユーザーアカウントを管理。' },
  { term: 'net user /add', description: 'ユーザーを追加。' },
  { term: 'net user /delete', description: 'ユーザーを削除。' },
  { term: 'net localgroup', description: 'ローカルグループを管理。' },
  { term: 'net localgroup /add', description: 'グループにユーザーを追加。' },
  { term: 'net start', description: 'サービスを開始。' },
  { term: 'net stop', description: 'サービスを停止。' },
  { term: 'net statistics', description: 'ネットワーク統計を表示。' },
  { term: 'net session', description: 'セッション情報を表示。' },
  { term: 'net config', description: 'ネットワーク設定を表示。' },
  { term: 'net time', description: 'ネットワーク時刻を同期。' },

  // === プロセス管理 ===
  { term: 'tasklist', description: '実行中のプロセスを一覧表示する。' },
  { term: 'tasklist /v', description: '詳細情報を表示。' },
  { term: 'tasklist /svc', description: '各プロセスのサービスを表示。' },
  { term: 'tasklist /m', description: 'ロードされたモジュールを表示。' },
  { term: 'tasklist /fi', description: 'フィルタを指定。' },
  { term: 'tasklist /fo', description: '出力形式を指定（table/list/csv）。' },

  { term: 'taskkill', description: 'プロセスを終了する。' },
  { term: 'taskkill /pid', description: 'PIDを指定して終了。' },
  { term: 'taskkill /im', description: 'イメージ名を指定して終了。' },
  { term: 'taskkill /f', description: '強制終了。' },
  { term: 'taskkill /t', description: '子プロセスも終了。' },

  { term: 'start', description: 'プログラムを新しいウィンドウで起動する。' },
  { term: 'start /min', description: '最小化して起動。' },
  { term: 'start /max', description: '最大化して起動。' },
  { term: 'start /wait', description: '終了を待機。' },
  { term: 'start /b', description: 'バックグラウンドで起動。' },
  { term: 'start /low', description: '低優先度で起動。' },
  { term: 'start /high', description: '高優先度で起動。' },
  { term: 'start /d', description: '作業ディレクトリを指定。' },

  // === サービス管理 ===
  { term: 'sc', description: 'サービスを管理する。' },
  { term: 'sc query', description: 'サービスの状態を表示。' },
  { term: 'sc queryex', description: 'サービスの詳細状態を表示。' },
  { term: 'sc start', description: 'サービスを開始。' },
  { term: 'sc stop', description: 'サービスを停止。' },
  { term: 'sc pause', description: 'サービスを一時停止。' },
  { term: 'sc continue', description: 'サービスを再開。' },
  { term: 'sc config', description: 'サービスの設定を変更。' },
  { term: 'sc create', description: 'サービスを作成。' },
  { term: 'sc delete', description: 'サービスを削除。' },
  { term: 'sc description', description: 'サービスの説明を設定。' },
  { term: 'sc failure', description: '障害時の動作を設定。' },

  // === ディスク管理 ===
  { term: 'diskpart', description: 'ディスクパーティションを管理する。' },
  { term: 'chkdsk', description: 'ディスクをチェック・修復する。' },
  { term: 'chkdsk /f', description: 'エラーを修復。' },
  { term: 'chkdsk /r', description: '不良セクタを検出して修復。' },
  { term: 'chkdsk /x', description: '必要に応じてボリュームをマウント解除。' },

  { term: 'format', description: 'ディスクをフォーマットする。' },
  { term: 'format /fs:', description: 'ファイルシステムを指定（NTFS/FAT32）。' },
  { term: 'format /q', description: 'クイックフォーマット。' },
  { term: 'format /v:', description: 'ボリュームラベルを指定。' },

  { term: 'label', description: 'ボリュームラベルを表示・変更する。' },

  { term: 'vol', description: 'ボリュームラベルとシリアル番号を表示。' },

  { term: 'subst', description: 'パスをドライブ文字に割り当てる。' },
  { term: 'subst /d', description: '割り当てを解除。' },

  { term: 'fsutil', description: 'ファイルシステムユーティリティ。' },
  { term: 'fsutil file', description: 'ファイル操作。' },
  { term: 'fsutil hardlink', description: 'ハードリンク操作。' },
  { term: 'fsutil volume', description: 'ボリューム操作。' },
  { term: 'fsutil fsinfo', description: 'ファイルシステム情報。' },

  // === シェル・バッチ ===
  { term: 'cmd', description: 'Windowsコマンドプロンプト。' },
  { term: 'cmd /c', description: 'コマンドを実行して終了。' },
  { term: 'cmd /k', description: 'コマンドを実行して継続。' },
  { term: 'cmd /v:on', description: '遅延環境変数展開を有効化。' },

  { term: 'echo', description: 'メッセージを表示する。' },
  { term: 'echo on', description: 'コマンドエコーを有効化。' },
  { term: 'echo off', description: 'コマンドエコーを無効化。' },
  { term: '@echo off', description: 'バッチファイルでエコーを無効化。' },

  { term: 'set', description: '環境変数を表示・設定する。' },
  { term: 'set /a', description: '数式を評価。' },
  { term: 'set /p', description: 'ユーザー入力を変数に設定。' },
  { term: 'setx', description: '環境変数を永続的に設定。' },
  { term: 'setx /m', description: 'システム環境変数として設定。' },

  { term: 'path', description: 'PATHを表示・設定する。' },

  { term: 'cls', description: '画面をクリアする。' },

  { term: 'title', description: 'コマンドプロンプトのタイトルを設定。' },

  { term: 'color', description: 'コンソールの色を設定。' },

  { term: 'prompt', description: 'プロンプトを設定する。' },

  { term: 'pause', description: '一時停止してキー入力を待つ。' },

  { term: 'exit', description: 'コマンドプロンプトを終了する。' },
  { term: 'exit /b', description: 'バッチスクリプトを終了（終了コード指定可）。' },

  { term: 'call', description: 'バッチファイルを呼び出す。' },
  { term: 'goto', description: 'ラベルにジャンプする。' },
  { term: 'if', description: '条件分岐。' },
  { term: 'if exist', description: 'ファイルの存在をチェック。' },
  { term: 'if not exist', description: 'ファイルが存在しないことをチェック。' },
  { term: 'if errorlevel', description: '終了コードをチェック。' },
  { term: 'if defined', description: '変数が定義されているかチェック。' },
  { term: 'for', description: 'ループ処理。' },
  { term: 'for /f', description: 'ファイル内容でループ。' },
  { term: 'for /d', description: 'ディレクトリでループ。' },
  { term: 'for /r', description: '再帰的にループ。' },
  { term: 'for /l', description: '数値でループ。' },

  { term: 'rem', description: 'コメント行。' },
  { term: '::', description: 'コメント行（ラベル形式）。' },

  { term: 'shift', description: 'バッチパラメータをシフト。' },

  { term: 'setlocal', description: 'ローカル環境を開始。' },
  { term: 'endlocal', description: 'ローカル環境を終了。' },

  { term: 'pushd', description: '現在のディレクトリを保存して移動。' },
  { term: 'popd', description: '保存したディレクトリに戻る。' },

  { term: 'assoc', description: 'ファイル拡張子の関連付けを表示・変更。' },
  { term: 'ftype', description: 'ファイルタイプの関連付けを表示・変更。' },

  // === その他 ===
  { term: 'clip', description: '標準入力をクリップボードにコピー。' },

  { term: 'sort', description: '入力をソートする。' },
  { term: 'sort /r', description: '逆順ソート。' },
  { term: 'sort /n', description: '数値としてソート。' },

  { term: 'shutdown', description: 'システムをシャットダウンする。' },
  { term: 'shutdown /s', description: 'シャットダウン。' },
  { term: 'shutdown /r', description: '再起動。' },
  { term: 'shutdown /h', description: '休止状態。' },
  { term: 'shutdown /l', description: 'ログオフ。' },
  { term: 'shutdown /t', description: '待機時間（秒）を指定。' },
  { term: 'shutdown /f', description: '強制終了。' },
  { term: 'shutdown /a', description: 'シャットダウンを中止。' },

  { term: 'logoff', description: 'ユーザーをログオフする。' },

  { term: 'runas', description: '別のユーザーとしてプログラムを実行。' },
  { term: 'runas /user:', description: 'ユーザーを指定。' },
  { term: 'runas /savecred', description: '資格情報を保存。' },

  { term: 'reg', description: 'レジストリを管理する。' },
  { term: 'reg query', description: 'レジストリキーを表示。' },
  { term: 'reg add', description: 'レジストリキーを追加。' },
  { term: 'reg delete', description: 'レジストリキーを削除。' },
  { term: 'reg export', description: 'レジストリをエクスポート。' },
  { term: 'reg import', description: 'レジストリをインポート。' },

  { term: 'schtasks', description: 'タスクスケジューラを管理する。' },
  { term: 'schtasks /create', description: 'タスクを作成。' },
  { term: 'schtasks /delete', description: 'タスクを削除。' },
  { term: 'schtasks /query', description: 'タスクを表示。' },
  { term: 'schtasks /run', description: 'タスクを実行。' },
  { term: 'schtasks /end', description: 'タスクを終了。' },

  { term: 'wmic', description: 'WMI（Windows Management Instrumentation）コマンド。' },
  { term: 'wmic process', description: 'プロセス情報を取得。' },
  { term: 'wmic service', description: 'サービス情報を取得。' },
  { term: 'wmic os', description: 'OS情報を取得。' },
  { term: 'wmic cpu', description: 'CPU情報を取得。' },
  { term: 'wmic memorychip', description: 'メモリ情報を取得。' },
  { term: 'wmic diskdrive', description: 'ディスク情報を取得。' },

  { term: 'certutil', description: '証明書ユーティリティ。' },
  { term: 'certutil -hashfile', description: 'ファイルのハッシュを計算。' },

  { term: 'cipher', description: 'ファイルの暗号化を管理。' },
  { term: 'cipher /e', description: 'ファイルを暗号化。' },
  { term: 'cipher /d', description: '暗号化を解除。' },

  { term: 'compact', description: 'ファイルの圧縮を管理（NTFS）。' },
  { term: 'compact /c', description: 'ファイルを圧縮。' },
  { term: 'compact /u', description: '圧縮を解除。' },

  { term: 'icacls', description: 'ファイルのアクセス権を管理する。' },
  { term: 'icacls /grant', description: 'アクセス権を付与。' },
  { term: 'icacls /deny', description: 'アクセスを拒否。' },
  { term: 'icacls /remove', description: 'アクセス権を削除。' },
  { term: 'icacls /reset', description: 'アクセス権をリセット。' },
  { term: 'icacls /setowner', description: '所有者を設定。' },

  { term: 'takeown', description: 'ファイルの所有権を取得する。' },
  { term: 'takeown /f', description: 'ファイル名を指定。' },
  { term: 'takeown /r', description: '再帰的に取得。' },

  { term: 'sfc', description: 'システムファイルチェッカー。' },
  { term: 'sfc /scannow', description: '全システムファイルをスキャン・修復。' },
  { term: 'sfc /verifyonly', description: 'スキャンのみ（修復しない）。' },

  { term: 'dism', description: 'Windowsイメージを管理する。' },
  { term: 'dism /online /cleanup-image /restorehealth', description: 'システムイメージを修復。' },
  { term: 'dism /online /cleanup-image /checkhealth', description: 'イメージの状態を確認。' },
  { term: 'dism /online /cleanup-image /scanhealth', description: 'イメージをスキャン。' },

  { term: 'bcdedit', description: 'ブート構成データを編集する。' },

  { term: 'help', description: 'コマンドのヘルプを表示する。' },
  { term: 'command /?', description: 'コマンドのヘルプを表示。' },

  // === リダイレクト・パイプ ===
  { term: '>', description: '出力をファイルにリダイレクト（上書き）。' },
  { term: '>>', description: '出力をファイルに追記。' },
  { term: '<', description: 'ファイルから入力。' },
  { term: '|', description: 'パイプ（出力を次のコマンドの入力に）。' },
  { term: '2>', description: '標準エラーをリダイレクト。' },
  { term: '2>&1', description: '標準エラーを標準出力にマージ。' },
  { term: 'nul', description: '出力を破棄（/dev/null相当）。' },
  { term: 'con', description: 'コンソール（標準入出力）。' },

  { term: '&', description: 'コマンドを連続実行。' },
  { term: '&&', description: '前のコマンドが成功したら実行。' },
  { term: '||', description: '前のコマンドが失敗したら実行。' },

  // === 環境変数 ===
  { term: '%PATH%', description: 'パス環境変数。' },
  { term: '%USERPROFILE%', description: 'ユーザープロファイルのパス。' },
  { term: '%APPDATA%', description: 'アプリケーションデータのパス。' },
  { term: '%LOCALAPPDATA%', description: 'ローカルアプリケーションデータのパス。' },
  { term: '%TEMP%', description: '一時ファイルのパス。', aliases: ['%TMP%'] },
  { term: '%COMPUTERNAME%', description: 'コンピューター名。' },
  { term: '%USERNAME%', description: 'ユーザー名。' },
  { term: '%USERDOMAIN%', description: 'ユーザードメイン名。' },
  { term: '%SYSTEMROOT%', description: 'Windowsシステムディレクトリ。', aliases: ['%WINDIR%'] },
  { term: '%SYSTEMDRIVE%', description: 'システムドライブ（通常C:）。' },
  { term: '%PROGRAMFILES%', description: 'Program Filesのパス。' },
  { term: '%PROGRAMFILES(X86)%', description: 'Program Files (x86)のパス。' },
  { term: '%HOMEDRIVE%', description: 'ホームドライブ。' },
  { term: '%HOMEPATH%', description: 'ホームパス。' },
  { term: '%CD%', description: 'カレントディレクトリ。' },
  { term: '%DATE%', description: '現在の日付。' },
  { term: '%TIME%', description: '現在の時刻。' },
  { term: '%RANDOM%', description: '0-32767のランダム数。' },
  { term: '%ERRORLEVEL%', description: '直前のコマンドの終了コード。' },

  // === バッチパラメータ ===
  { term: '%0', description: 'バッチファイル名。' },
  { term: '%1', description: '1番目の引数。' },
  { term: '%*', description: '全ての引数。' },
  { term: '%~dp0', description: 'バッチファイルのディレクトリパス。' },
  { term: '%~nx0', description: 'バッチファイル名（拡張子付き）。' },
  { term: '%~f1', description: '1番目の引数のフルパス。' },
  { term: '%~n1', description: '1番目の引数のファイル名（拡張子なし）。' },
  { term: '%~x1', description: '1番目の引数の拡張子。' },
];

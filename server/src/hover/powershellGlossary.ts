/**
 * PowerShell用語集
 * PowerShellコマンドレット・オプションの説明
 */

import { CliGlossaryEntry } from './gitGlossary';

export const POWERSHELL_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本 ===
  { term: 'PowerShell', description: 'Microsoftの高度なシェル・スクリプト言語。.NETベースでオブジェクト指向。' },
  { term: 'pwsh', description: 'PowerShell Core（クロスプラットフォーム版）の実行コマンド。' },
  { term: 'powershell', description: 'Windows PowerShell（Windows専用）の実行コマンド。' },

  // === ファイル・ディレクトリ操作 ===
  { term: 'Get-ChildItem', description: 'ディレクトリの内容を取得する。', aliases: ['gci', 'ls', 'dir'] },
  { term: 'Get-ChildItem -Recurse', description: 'サブディレクトリも再帰的に取得。', aliases: ['-r'] },
  { term: 'Get-ChildItem -Force', description: '隠しファイルも取得。' },
  { term: 'Get-ChildItem -Filter', description: 'フィルタパターンを指定。' },
  { term: 'Get-ChildItem -Include', description: '含めるパターンを指定。' },
  { term: 'Get-ChildItem -Exclude', description: '除外パターンを指定。' },
  { term: 'Get-ChildItem -File', description: 'ファイルのみ取得。' },
  { term: 'Get-ChildItem -Directory', description: 'ディレクトリのみ取得。' },
  { term: 'Get-ChildItem -Hidden', description: '隠しファイルのみ取得。' },
  { term: 'Get-ChildItem -Depth', description: '再帰の深さを指定。' },

  { term: 'Set-Location', description: 'カレントディレクトリを変更する。', aliases: ['sl', 'cd', 'chdir'] },
  { term: 'Push-Location', description: 'ディレクトリをスタックにプッシュして移動。', aliases: ['pushd'] },
  { term: 'Pop-Location', description: 'スタックからディレクトリをポップして移動。', aliases: ['popd'] },
  { term: 'Get-Location', description: 'カレントディレクトリを取得する。', aliases: ['gl', 'pwd'] },

  { term: 'New-Item', description: 'ファイル・ディレクトリを作成する。', aliases: ['ni'] },
  { term: 'New-Item -ItemType File', description: 'ファイルを作成。' },
  { term: 'New-Item -ItemType Directory', description: 'ディレクトリを作成。', aliases: ['mkdir', 'md'] },
  { term: 'New-Item -Force', description: '既存の場合は上書き。' },
  { term: 'New-Item -Value', description: '内容を指定して作成。' },

  { term: 'Remove-Item', description: 'ファイル・ディレクトリを削除する。', aliases: ['ri', 'rm', 'rmdir', 'del', 'erase', 'rd'] },
  { term: 'Remove-Item -Recurse', description: '再帰的に削除。' },
  { term: 'Remove-Item -Force', description: '読み取り専用も強制削除。' },
  { term: 'Remove-Item -Confirm', description: '確認プロンプトを表示。' },
  { term: 'Remove-Item -WhatIf', description: '実行せずに結果を表示。' },

  { term: 'Copy-Item', description: 'ファイル・ディレクトリをコピーする。', aliases: ['cpi', 'cp', 'copy'] },
  { term: 'Copy-Item -Recurse', description: '再帰的にコピー。' },
  { term: 'Copy-Item -Force', description: '読み取り専用も上書き。' },
  { term: 'Copy-Item -Container', description: 'コンテナ構造を保持。' },
  { term: 'Copy-Item -Exclude', description: '除外パターンを指定。' },
  { term: 'Copy-Item -Include', description: '含めるパターンを指定。' },
  { term: 'Copy-Item -PassThru', description: 'コピーした項目を出力。' },

  { term: 'Move-Item', description: 'ファイル・ディレクトリを移動する。', aliases: ['mi', 'mv', 'move'] },
  { term: 'Move-Item -Force', description: '既存ファイルを上書き。' },
  { term: 'Move-Item -PassThru', description: '移動した項目を出力。' },

  { term: 'Rename-Item', description: '名前を変更する。', aliases: ['rni', 'ren'] },
  { term: 'Rename-Item -Force', description: '強制的に名前変更。' },

  { term: 'Test-Path', description: 'パスが存在するか確認する。' },
  { term: 'Test-Path -PathType Leaf', description: 'ファイルかどうか確認。' },
  { term: 'Test-Path -PathType Container', description: 'ディレクトリかどうか確認。' },

  { term: 'Resolve-Path', description: 'ワイルドカードを解決して完全パスを取得。' },
  { term: 'Convert-Path', description: 'パスをプロバイダーパスに変換。' },
  { term: 'Split-Path', description: 'パスの一部（親、ファイル名等）を取得。' },
  { term: 'Split-Path -Parent', description: '親ディレクトリを取得。' },
  { term: 'Split-Path -Leaf', description: 'ファイル名を取得。' },
  { term: 'Split-Path -Extension', description: '拡張子を取得（PowerShell 6+）。' },
  { term: 'Join-Path', description: 'パスを結合する。' },

  // === ファイル内容操作 ===
  { term: 'Get-Content', description: 'ファイルの内容を取得する。', aliases: ['gc', 'cat', 'type'] },
  { term: 'Get-Content -Head', description: '先頭の行数を指定。', aliases: ['-First'] },
  { term: 'Get-Content -Tail', description: '末尾の行数を指定。', aliases: ['-Last'] },
  { term: 'Get-Content -Wait', description: 'ファイル追記を監視。' },
  { term: 'Get-Content -Raw', description: '全内容を1つの文字列として取得。' },
  { term: 'Get-Content -Encoding', description: 'エンコーディングを指定。' },
  { term: 'Get-Content -TotalCount', description: '取得する行数を指定。' },

  { term: 'Set-Content', description: 'ファイルに内容を書き込む（上書き）。', aliases: ['sc'] },
  { term: 'Set-Content -Encoding', description: 'エンコーディングを指定。' },
  { term: 'Set-Content -Force', description: '読み取り専用でも書き込み。' },
  { term: 'Set-Content -NoNewline', description: '末尾に改行を追加しない。' },

  { term: 'Add-Content', description: 'ファイルに内容を追記する。', aliases: ['ac'] },
  { term: 'Add-Content -Encoding', description: 'エンコーディングを指定。' },

  { term: 'Clear-Content', description: 'ファイルの内容をクリアする。', aliases: ['clc'] },

  { term: 'Out-File', description: '出力をファイルに書き込む。' },
  { term: 'Out-File -Append', description: 'ファイルに追記。' },
  { term: 'Out-File -Encoding', description: 'エンコーディングを指定。' },
  { term: 'Out-File -NoClobber', description: '既存ファイルを上書きしない。' },
  { term: 'Out-File -Width', description: '出力幅を指定。' },

  // === オブジェクト操作 ===
  { term: 'Select-Object', description: 'オブジェクトのプロパティを選択する。', aliases: ['select'] },
  { term: 'Select-Object -Property', description: '出力するプロパティを指定。' },
  { term: 'Select-Object -First', description: '先頭n個を取得。' },
  { term: 'Select-Object -Last', description: '末尾n個を取得。' },
  { term: 'Select-Object -Skip', description: '先頭n個をスキップ。' },
  { term: 'Select-Object -Unique', description: '重複を除外。' },
  { term: 'Select-Object -ExpandProperty', description: 'プロパティの値を展開。' },
  { term: 'Select-Object -Index', description: '指定インデックスの要素を取得。' },

  { term: 'Where-Object', description: '条件でオブジェクトをフィルタする。', aliases: ['where', '?'] },
  { term: 'Where-Object -Property', description: 'プロパティを指定。' },
  { term: 'Where-Object -EQ', description: '等しい条件。' },
  { term: 'Where-Object -NE', description: '等しくない条件。' },
  { term: 'Where-Object -GT', description: 'より大きい条件。' },
  { term: 'Where-Object -LT', description: 'より小さい条件。' },
  { term: 'Where-Object -GE', description: '以上の条件。' },
  { term: 'Where-Object -LE', description: '以下の条件。' },
  { term: 'Where-Object -Like', description: 'ワイルドカードマッチ。' },
  { term: 'Where-Object -Match', description: '正規表現マッチ。' },
  { term: 'Where-Object -Contains', description: 'コレクションに含まれるか。' },
  { term: 'Where-Object -In', description: '指定値に含まれるか。' },

  { term: 'ForEach-Object', description: '各オブジェクトに処理を実行する。', aliases: ['foreach', '%'] },
  { term: 'ForEach-Object -Begin', description: '処理開始前に実行。' },
  { term: 'ForEach-Object -Process', description: '各オブジェクトに実行。' },
  { term: 'ForEach-Object -End', description: '処理終了後に実行。' },
  { term: 'ForEach-Object -Parallel', description: '並列処理（PowerShell 7+）。' },

  { term: 'Sort-Object', description: 'オブジェクトをソートする。', aliases: ['sort'] },
  { term: 'Sort-Object -Property', description: 'ソートするプロパティを指定。' },
  { term: 'Sort-Object -Descending', description: '降順ソート。' },
  { term: 'Sort-Object -Unique', description: '重複を除外。' },
  { term: 'Sort-Object -CaseSensitive', description: '大文字小文字を区別。' },

  { term: 'Group-Object', description: 'オブジェクトをグループ化する。', aliases: ['group'] },
  { term: 'Group-Object -Property', description: 'グループ化するプロパティを指定。' },
  { term: 'Group-Object -NoElement', description: '要素を含めない（カウントのみ）。' },
  { term: 'Group-Object -AsHashTable', description: 'ハッシュテーブルとして出力。' },

  { term: 'Measure-Object', description: 'オブジェクトを計測する。', aliases: ['measure'] },
  { term: 'Measure-Object -Sum', description: '合計を計算。' },
  { term: 'Measure-Object -Average', description: '平均を計算。' },
  { term: 'Measure-Object -Maximum', description: '最大値を取得。' },
  { term: 'Measure-Object -Minimum', description: '最小値を取得。' },
  { term: 'Measure-Object -Line', description: '行数をカウント。' },
  { term: 'Measure-Object -Word', description: '単語数をカウント。' },
  { term: 'Measure-Object -Character', description: '文字数をカウント。' },

  { term: 'Compare-Object', description: '2つのオブジェクトを比較する。', aliases: ['compare', 'diff'] },
  { term: 'Compare-Object -Property', description: '比較するプロパティを指定。' },
  { term: 'Compare-Object -IncludeEqual', description: '一致する要素も出力。' },
  { term: 'Compare-Object -ExcludeDifferent', description: '差異を除外。' },

  { term: 'Tee-Object', description: 'オブジェクトをファイルと変数に出力。', aliases: ['tee'] },
  { term: 'Tee-Object -FilePath', description: '出力先ファイルを指定。' },
  { term: 'Tee-Object -Variable', description: '出力先変数を指定。' },
  { term: 'Tee-Object -Append', description: 'ファイルに追記。' },

  // === 文字列操作 ===
  { term: 'Select-String', description: 'テキストでパターンを検索する（grepに相当）。', aliases: ['sls'] },
  { term: 'Select-String -Pattern', description: '検索パターンを指定。' },
  { term: 'Select-String -SimpleMatch', description: 'リテラル文字列として検索。' },
  { term: 'Select-String -CaseSensitive', description: '大文字小文字を区別。' },
  { term: 'Select-String -NotMatch', description: 'マッチしない行を取得。' },
  { term: 'Select-String -AllMatches', description: '全てのマッチを取得。' },
  { term: 'Select-String -Context', description: '前後の行も取得。' },
  { term: 'Select-String -List', description: 'ファイルごとに最初のマッチのみ。' },
  { term: 'Select-String -Quiet', description: 'マッチしたかどうかのみ返す。' },

  { term: 'ConvertFrom-Csv', description: 'CSVをオブジェクトに変換する。' },
  { term: 'ConvertTo-Csv', description: 'オブジェクトをCSVに変換する。' },
  { term: 'Export-Csv', description: 'オブジェクトをCSVファイルに出力。' },
  { term: 'Import-Csv', description: 'CSVファイルをオブジェクトとして読み込み。' },

  { term: 'ConvertFrom-Json', description: 'JSONをオブジェクトに変換する。' },
  { term: 'ConvertTo-Json', description: 'オブジェクトをJSONに変換する。' },
  { term: 'ConvertTo-Json -Depth', description: '変換する深さを指定。' },
  { term: 'ConvertTo-Json -Compress', description: '圧縮形式で出力。' },

  { term: 'ConvertFrom-Xml', description: 'XMLをオブジェクトに変換する。' },
  { term: 'ConvertTo-Xml', description: 'オブジェクトをXMLに変換する。' },

  { term: 'ConvertTo-Html', description: 'オブジェクトをHTMLに変換する。' },

  // === プロセス管理 ===
  { term: 'Get-Process', description: '実行中のプロセスを取得する。', aliases: ['gps', 'ps'] },
  { term: 'Get-Process -Name', description: 'プロセス名で検索。' },
  { term: 'Get-Process -Id', description: 'PIDで検索。' },
  { term: 'Get-Process -IncludeUserName', description: 'ユーザー名も取得。' },

  { term: 'Start-Process', description: 'プロセスを開始する。', aliases: ['saps', 'start'] },
  { term: 'Start-Process -FilePath', description: '実行ファイルを指定。' },
  { term: 'Start-Process -ArgumentList', description: '引数を指定。' },
  { term: 'Start-Process -Wait', description: '終了を待機。' },
  { term: 'Start-Process -NoNewWindow', description: '新しいウィンドウを開かない。' },
  { term: 'Start-Process -PassThru', description: 'プロセスオブジェクトを返す。' },
  { term: 'Start-Process -Verb', description: '動詞を指定（RunAs等）。' },
  { term: 'Start-Process -WorkingDirectory', description: '作業ディレクトリを指定。' },
  { term: 'Start-Process -RedirectStandardOutput', description: '標準出力をリダイレクト。' },
  { term: 'Start-Process -RedirectStandardError', description: '標準エラーをリダイレクト。' },
  { term: 'Start-Process -WindowStyle', description: 'ウィンドウスタイルを指定。' },

  { term: 'Stop-Process', description: 'プロセスを停止する。', aliases: ['spps', 'kill'] },
  { term: 'Stop-Process -Name', description: 'プロセス名で停止。' },
  { term: 'Stop-Process -Id', description: 'PIDで停止。' },
  { term: 'Stop-Process -Force', description: '強制終了。' },
  { term: 'Stop-Process -PassThru', description: '停止したプロセスを出力。' },

  { term: 'Wait-Process', description: 'プロセスの終了を待機する。' },
  { term: 'Debug-Process', description: 'プロセスをデバッグする。' },

  // === サービス管理 ===
  { term: 'Get-Service', description: 'サービスを取得する。', aliases: ['gsv'] },
  { term: 'Get-Service -Name', description: 'サービス名で検索。' },
  { term: 'Get-Service -DisplayName', description: '表示名で検索。' },
  { term: 'Get-Service -DependentServices', description: '依存サービスを取得。' },
  { term: 'Get-Service -RequiredServices', description: '必要なサービスを取得。' },

  { term: 'Start-Service', description: 'サービスを開始する。', aliases: ['sasv'] },
  { term: 'Start-Service -PassThru', description: 'サービスオブジェクトを返す。' },

  { term: 'Stop-Service', description: 'サービスを停止する。', aliases: ['spsv'] },
  { term: 'Stop-Service -Force', description: '依存サービスも停止。' },
  { term: 'Stop-Service -NoWait', description: '停止を待機しない。' },

  { term: 'Restart-Service', description: 'サービスを再起動する。' },
  { term: 'Suspend-Service', description: 'サービスを一時停止する。' },
  { term: 'Resume-Service', description: 'サービスを再開する。' },

  { term: 'Set-Service', description: 'サービスの設定を変更する。' },
  { term: 'Set-Service -StartupType', description: 'スタートアップの種類を設定。' },
  { term: 'Set-Service -Status', description: 'サービスの状態を設定。' },

  { term: 'New-Service', description: 'サービスを作成する。' },
  { term: 'Remove-Service', description: 'サービスを削除する。' },

  // === ネットワーク ===
  { term: 'Invoke-WebRequest', description: 'HTTPリクエストを送信する。', aliases: ['iwr', 'curl', 'wget'] },
  { term: 'Invoke-WebRequest -Uri', description: 'URLを指定。' },
  { term: 'Invoke-WebRequest -Method', description: 'HTTPメソッドを指定。' },
  { term: 'Invoke-WebRequest -Body', description: 'リクエストボディを指定。' },
  { term: 'Invoke-WebRequest -Headers', description: 'ヘッダーを指定。' },
  { term: 'Invoke-WebRequest -ContentType', description: 'Content-Typeを指定。' },
  { term: 'Invoke-WebRequest -OutFile', description: '出力ファイルを指定。' },
  { term: 'Invoke-WebRequest -UseBasicParsing', description: 'IEエンジンを使わない。' },
  { term: 'Invoke-WebRequest -Credential', description: '認証情報を指定。' },
  { term: 'Invoke-WebRequest -SessionVariable', description: 'セッションを保存。' },
  { term: 'Invoke-WebRequest -WebSession', description: 'セッションを使用。' },

  { term: 'Invoke-RestMethod', description: 'REST APIを呼び出す。', aliases: ['irm'] },
  { term: 'Invoke-RestMethod -Uri', description: 'URLを指定。' },
  { term: 'Invoke-RestMethod -Method', description: 'HTTPメソッドを指定。' },
  { term: 'Invoke-RestMethod -Body', description: 'リクエストボディを指定。' },
  { term: 'Invoke-RestMethod -Headers', description: 'ヘッダーを指定。' },
  { term: 'Invoke-RestMethod -ContentType', description: 'Content-Typeを指定。' },

  { term: 'Test-Connection', description: '接続をテストする（pingに相当）。' },
  { term: 'Test-Connection -Count', description: '送信回数を指定。' },
  { term: 'Test-Connection -Quiet', description: '成否のみ返す。' },
  { term: 'Test-Connection -TimeToLive', description: 'TTLを指定。' },
  { term: 'Test-Connection -Traceroute', description: 'トレースルートを実行。' },

  { term: 'Test-NetConnection', description: 'ネットワーク接続をテストする。', aliases: ['tnc'] },
  { term: 'Test-NetConnection -Port', description: 'ポートを指定。' },
  { term: 'Test-NetConnection -CommonTCPPort', description: '一般的なポートを指定。' },
  { term: 'Test-NetConnection -TraceRoute', description: 'トレースルートを実行。' },

  { term: 'Get-NetIPConfiguration', description: 'IPアドレス設定を取得する。', aliases: ['gip'] },
  { term: 'Get-NetIPAddress', description: 'IPアドレスを取得する。' },
  { term: 'Get-NetAdapter', description: 'ネットワークアダプターを取得する。' },
  { term: 'Get-NetRoute', description: 'ルーティングテーブルを取得する。' },
  { term: 'Get-DnsClient', description: 'DNSクライアント設定を取得する。' },
  { term: 'Resolve-DnsName', description: 'DNS名前解決を行う。' },
  { term: 'Clear-DnsClientCache', description: 'DNSキャッシュをクリアする。' },

  // === 変数・環境 ===
  { term: 'Get-Variable', description: '変数を取得する。', aliases: ['gv'] },
  { term: 'Set-Variable', description: '変数を設定する。', aliases: ['sv', 'set'] },
  { term: 'New-Variable', description: '新しい変数を作成する。', aliases: ['nv'] },
  { term: 'Remove-Variable', description: '変数を削除する。', aliases: ['rv'] },
  { term: 'Clear-Variable', description: '変数の値をクリアする。', aliases: ['clv'] },

  { term: 'Get-Item Env:', description: '環境変数を取得する。' },
  { term: '$env:', description: '環境変数を参照する。' },
  { term: '$env:PATH', description: 'PATH環境変数。' },
  { term: '$env:USERPROFILE', description: 'ユーザープロファイルのパス。' },
  { term: '$env:COMPUTERNAME', description: 'コンピューター名。' },
  { term: '$env:USERNAME', description: 'ユーザー名。' },
  { term: '[Environment]::SetEnvironmentVariable', description: '環境変数を永続的に設定。' },

  // === モジュール ===
  { term: 'Get-Module', description: 'ロードされたモジュールを取得する。', aliases: ['gmo'] },
  { term: 'Get-Module -ListAvailable', description: '利用可能なモジュールを一覧表示。' },

  { term: 'Import-Module', description: 'モジュールをインポートする。', aliases: ['ipmo'] },
  { term: 'Import-Module -Force', description: '再インポート。' },
  { term: 'Import-Module -PassThru', description: 'モジュール情報を出力。' },

  { term: 'Remove-Module', description: 'モジュールを削除する。', aliases: ['rmo'] },

  { term: 'Install-Module', description: 'モジュールをインストールする。' },
  { term: 'Install-Module -Scope', description: 'スコープを指定（CurrentUser/AllUsers）。' },
  { term: 'Install-Module -Force', description: '強制インストール。' },
  { term: 'Install-Module -AllowClobber', description: '既存コマンドの上書きを許可。' },

  { term: 'Update-Module', description: 'モジュールを更新する。' },
  { term: 'Uninstall-Module', description: 'モジュールをアンインストールする。' },
  { term: 'Find-Module', description: 'ギャラリーでモジュールを検索する。' },

  // === コマンド情報 ===
  { term: 'Get-Command', description: 'コマンドを検索する。', aliases: ['gcm'] },
  { term: 'Get-Command -Name', description: 'コマンド名で検索。' },
  { term: 'Get-Command -Module', description: 'モジュールで検索。' },
  { term: 'Get-Command -Verb', description: '動詞で検索。' },
  { term: 'Get-Command -Noun', description: '名詞で検索。' },
  { term: 'Get-Command -CommandType', description: 'コマンドタイプで検索。' },

  { term: 'Get-Help', description: 'ヘルプを表示する。', aliases: ['help', 'man'] },
  { term: 'Get-Help -Examples', description: '使用例を表示。' },
  { term: 'Get-Help -Detailed', description: '詳細情報を表示。' },
  { term: 'Get-Help -Full', description: '完全なヘルプを表示。' },
  { term: 'Get-Help -Online', description: 'オンラインヘルプを開く。' },
  { term: 'Get-Help -Parameter', description: 'パラメータのヘルプを表示。' },

  { term: 'Update-Help', description: 'ヘルプファイルを更新する。' },

  { term: 'Get-Alias', description: 'エイリアスを取得する。', aliases: ['gal'] },
  { term: 'Set-Alias', description: 'エイリアスを設定する。', aliases: ['sal'] },
  { term: 'New-Alias', description: '新しいエイリアスを作成する。', aliases: ['nal'] },
  { term: 'Remove-Alias', description: 'エイリアスを削除する。' },
  { term: 'Export-Alias', description: 'エイリアスをエクスポートする。' },
  { term: 'Import-Alias', description: 'エイリアスをインポートする。' },

  // === 出力 ===
  { term: 'Write-Output', description: 'オブジェクトを出力する。', aliases: ['echo', 'write'] },
  { term: 'Write-Host', description: 'ホストに直接出力する（パイプラインに流れない）。' },
  { term: 'Write-Host -ForegroundColor', description: '文字色を指定。' },
  { term: 'Write-Host -BackgroundColor', description: '背景色を指定。' },
  { term: 'Write-Host -NoNewline', description: '改行なしで出力。' },

  { term: 'Write-Verbose', description: '詳細メッセージを出力する。' },
  { term: 'Write-Debug', description: 'デバッグメッセージを出力する。' },
  { term: 'Write-Warning', description: '警告メッセージを出力する。' },
  { term: 'Write-Error', description: 'エラーメッセージを出力する。' },
  { term: 'Write-Information', description: '情報メッセージを出力する。' },
  { term: 'Write-Progress', description: '進捗バーを表示する。' },

  { term: 'Out-Host', description: 'ホストに出力する。', aliases: ['oh'] },
  { term: 'Out-Null', description: '出力を破棄する。' },
  { term: 'Out-String', description: '文字列に変換する。' },
  { term: 'Out-GridView', description: 'グリッドビューで表示する。', aliases: ['ogv'] },

  { term: 'Format-Table', description: 'テーブル形式で出力する。', aliases: ['ft'] },
  { term: 'Format-Table -AutoSize', description: '列幅を自動調整。' },
  { term: 'Format-Table -Wrap', description: '折り返して表示。' },
  { term: 'Format-Table -Property', description: '表示するプロパティを指定。' },

  { term: 'Format-List', description: 'リスト形式で出力する。', aliases: ['fl'] },
  { term: 'Format-Wide', description: 'ワイド形式で出力する。', aliases: ['fw'] },
  { term: 'Format-Custom', description: 'カスタム形式で出力する。', aliases: ['fc'] },

  // === 履歴 ===
  { term: 'Get-History', description: 'コマンド履歴を取得する。', aliases: ['ghy', 'h', 'history'] },
  { term: 'Invoke-History', description: '履歴のコマンドを実行する。', aliases: ['ihy', 'r'] },
  { term: 'Add-History', description: '履歴にコマンドを追加する。' },
  { term: 'Clear-History', description: '履歴をクリアする。', aliases: ['clhy'] },

  // === エラー処理 ===
  { term: 'try', description: 'エラーを捕捉するブロックを開始。' },
  { term: 'catch', description: 'エラー発生時の処理を定義。' },
  { term: 'finally', description: 'エラーの有無に関わらず実行。' },
  { term: 'throw', description: '例外をスローする。' },
  { term: 'trap', description: 'エラートラップを設定する。' },

  { term: '$Error', description: '発生したエラーの配列。' },
  { term: '$ErrorActionPreference', description: 'エラー発生時のデフォルト動作。' },
  { term: '-ErrorAction', description: 'エラー発生時の動作を指定。', aliases: ['-EA'] },
  { term: '-ErrorVariable', description: 'エラーを格納する変数を指定。', aliases: ['-EV'] },

  // === 実行ポリシー ===
  { term: 'Get-ExecutionPolicy', description: '実行ポリシーを取得する。' },
  { term: 'Set-ExecutionPolicy', description: '実行ポリシーを設定する。' },
  { term: 'Set-ExecutionPolicy Restricted', description: 'スクリプト実行を禁止。' },
  { term: 'Set-ExecutionPolicy AllSigned', description: '署名付きスクリプトのみ許可。' },
  { term: 'Set-ExecutionPolicy RemoteSigned', description: 'リモートスクリプトは署名必須。' },
  { term: 'Set-ExecutionPolicy Unrestricted', description: '全てのスクリプトを許可。' },
  { term: 'Set-ExecutionPolicy Bypass', description: 'ポリシーをバイパス。' },

  // === スクリプト制御 ===
  { term: 'Invoke-Command', description: 'コマンドを実行する。', aliases: ['icm'] },
  { term: 'Invoke-Command -ComputerName', description: 'リモートコンピューターで実行。' },
  { term: 'Invoke-Command -ScriptBlock', description: 'スクリプトブロックを実行。' },
  { term: 'Invoke-Command -FilePath', description: 'スクリプトファイルを実行。' },
  { term: 'Invoke-Command -Session', description: 'セッションで実行。' },
  { term: 'Invoke-Command -AsJob', description: 'ジョブとして実行。' },

  { term: 'Invoke-Expression', description: '文字列をコマンドとして実行する。', aliases: ['iex'] },
  { term: '& (call operator)', description: 'コマンドを実行する演算子。' },
  { term: '. (dot source)', description: 'スクリプトを現在のスコープで実行。' },

  { term: 'Start-Job', description: 'バックグラウンドジョブを開始する。', aliases: ['sajb'] },
  { term: 'Get-Job', description: 'ジョブを取得する。', aliases: ['gjb'] },
  { term: 'Wait-Job', description: 'ジョブの完了を待機する。', aliases: ['wjb'] },
  { term: 'Receive-Job', description: 'ジョブの結果を取得する。', aliases: ['rcjb'] },
  { term: 'Stop-Job', description: 'ジョブを停止する。', aliases: ['spjb'] },
  { term: 'Remove-Job', description: 'ジョブを削除する。', aliases: ['rjb'] },

  { term: 'Start-Sleep', description: '指定時間待機する。', aliases: ['sleep'] },
  { term: 'Start-Sleep -Seconds', description: '秒単位で待機。' },
  { term: 'Start-Sleep -Milliseconds', description: 'ミリ秒単位で待機。' },

  // === イベントログ ===
  { term: 'Get-EventLog', description: 'イベントログを取得する（Windows PowerShell）。' },
  { term: 'Get-EventLog -LogName', description: 'ログ名を指定。' },
  { term: 'Get-EventLog -Newest', description: '最新n件を取得。' },
  { term: 'Get-EventLog -EntryType', description: 'エントリタイプでフィルタ。' },

  { term: 'Get-WinEvent', description: 'Windowsイベントログを取得する。' },
  { term: 'Get-WinEvent -LogName', description: 'ログ名を指定。' },
  { term: 'Get-WinEvent -FilterHashtable', description: 'ハッシュテーブルでフィルタ。' },
  { term: 'Get-WinEvent -MaxEvents', description: '最大件数を指定。' },

  // === レジストリ ===
  { term: 'Get-ItemProperty', description: 'レジストリ値を取得する。' },
  { term: 'Set-ItemProperty', description: 'レジストリ値を設定する。' },
  { term: 'New-ItemProperty', description: 'レジストリ値を作成する。' },
  { term: 'Remove-ItemProperty', description: 'レジストリ値を削除する。' },
  { term: 'HKLM:', description: 'HKEY_LOCAL_MACHINE。' },
  { term: 'HKCU:', description: 'HKEY_CURRENT_USER。' },

  // === WMI/CIM ===
  { term: 'Get-WmiObject', description: 'WMIオブジェクトを取得する（非推奨）。', aliases: ['gwmi'] },
  { term: 'Get-CimInstance', description: 'CIMインスタンスを取得する。', aliases: ['gcim'] },
  { term: 'Get-CimInstance -ClassName', description: 'クラス名を指定。' },
  { term: 'Get-CimInstance Win32_OperatingSystem', description: 'OS情報を取得。' },
  { term: 'Get-CimInstance Win32_ComputerSystem', description: 'コンピューター情報を取得。' },
  { term: 'Get-CimInstance Win32_Processor', description: 'CPU情報を取得。' },
  { term: 'Get-CimInstance Win32_PhysicalMemory', description: 'メモリ情報を取得。' },
  { term: 'Get-CimInstance Win32_DiskDrive', description: 'ディスク情報を取得。' },
  { term: 'Get-CimInstance Win32_Service', description: 'サービス情報を取得。' },
  { term: 'Get-CimInstance Win32_Process', description: 'プロセス情報を取得。' },

  { term: 'Invoke-CimMethod', description: 'CIMメソッドを実行する。' },
  { term: 'Set-CimInstance', description: 'CIMインスタンスを更新する。' },
  { term: 'New-CimInstance', description: 'CIMインスタンスを作成する。' },
  { term: 'Remove-CimInstance', description: 'CIMインスタンスを削除する。' },

  // === その他 ===
  { term: 'Clear-Host', description: '画面をクリアする。', aliases: ['cls', 'clear'] },

  { term: 'Get-Date', description: '現在の日時を取得する。' },
  { term: 'Get-Date -Format', description: '日時の形式を指定。' },
  { term: 'Get-Date -UFormat', description: 'Unix形式で出力。' },
  { term: 'Set-Date', description: '日時を設定する。' },

  { term: 'Get-Random', description: 'ランダムな値を取得する。' },
  { term: 'Get-Random -Minimum', description: '最小値を指定。' },
  { term: 'Get-Random -Maximum', description: '最大値を指定。' },
  { term: 'Get-Random -InputObject', description: '配列からランダムに選択。' },

  { term: 'Get-Clipboard', description: 'クリップボードの内容を取得する。', aliases: ['gcb'] },
  { term: 'Set-Clipboard', description: 'クリップボードに設定する。', aliases: ['scb'] },

  { term: 'Read-Host', description: 'ユーザー入力を読み取る。' },
  { term: 'Read-Host -Prompt', description: 'プロンプトを指定。' },
  { term: 'Read-Host -AsSecureString', description: 'セキュア文字列として読み取り。' },

  { term: 'Get-Credential', description: '認証情報を取得する。' },
  { term: 'Get-Credential -UserName', description: 'ユーザー名を指定。' },

  { term: 'Exit-PSSession', description: 'リモートセッションを終了する。' },
  { term: 'Enter-PSSession', description: 'リモートセッションに入る。', aliases: ['etsn'] },
  { term: 'New-PSSession', description: 'リモートセッションを作成する。', aliases: ['nsn'] },
  { term: 'Remove-PSSession', description: 'リモートセッションを削除する。', aliases: ['rsn'] },
  { term: 'Get-PSSession', description: 'リモートセッションを取得する。', aliases: ['gsn'] },

  { term: 'Get-Host', description: 'ホスト情報を取得する。' },
  { term: '$PSVersionTable', description: 'PowerShellバージョン情報。' },
  { term: '$Host', description: 'ホストオブジェクト。' },
  { term: '$_', description: 'パイプラインの現在のオブジェクト。', aliases: ['$PSItem'] },
  { term: '$null', description: 'null値。' },
  { term: '$true', description: 'true値。' },
  { term: '$false', description: 'false値。' },
  { term: '$HOME', description: 'ユーザーのホームディレクトリ。' },
  { term: '$PWD', description: '現在のディレクトリ。' },
  { term: '$PROFILE', description: 'プロファイルスクリプトのパス。' },
  { term: '$args', description: '関数への引数。' },
  { term: '$input', description: 'パイプライン入力。' },
  { term: '$LASTEXITCODE', description: '最後の外部コマンドの終了コード。' },
  { term: '$?', description: '直前のコマンドの成否。' },
];

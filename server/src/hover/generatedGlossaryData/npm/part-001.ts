// このファイルは自動生成です。手動で編集しないでください。
// 生成元: ja.json (9552 エントリ, 226 ドメイン)
// カテゴリ: npm (1/1)
// 生成コマンド: npx ts-node scripts/generate-glossary-from-json.ts

import { GlossaryEntry } from '../../glossaryTypes';

export const GLOSSARY_ENTRIES_PART_001: ReadonlyArray<GlossaryEntry> = [
  // package-management (22)
  { term: 'RPM', aliases: ['rpm', 'rpm package manager', 'red hat package manager'], description: 'Red Hat系Linuxディストリビューションで使用されるパッケージ形式およびパッケージ管理ツール。.rpmファイルをインストール・削除・照会できる。' },
  { term: 'YUM', aliases: ['yum', 'yellowdog updater modified'], description: 'Red Hat系Linuxで使用された依存関係解決機能付きパッケージマネージャ。RHEL 8以降はDNFに置き換えられたが後方互換性のためyumコマンドも使用できる。' },
  { term: 'DNF', aliases: ['dnf', 'dandified yum'], description: 'RHEL 8以降でYUMの後継として採用されたパッケージマネージャ。依存関係解決の改善、パフォーマンス向上、プラグインAPIの整備が特徴。' },
  { term: 'APT', aliases: ['apt', 'advanced package tool'], description: 'Debian系Linuxで使用される高機能パッケージ管理システム。依存関係の自動解決、パッケージの検索・インストール・削除をapt/apt-getコマンドで実行する。' },
  { term: 'dpkg', description: 'Debian系Linuxの低レベルパッケージ管理ツール。.debパッケージファイルを直接インストール・削除・照会できる。APTはdpkgのフロントエンド。' },
  { term: 'snap', aliases: ['snapd'], description: 'Canonicalが開発したサンドボックス型のLinuxパッケージ形式。依存関係を内包した自己完結型パッケージで、自動更新とロールバックをサポートする。' },
  { term: 'flatpak', description: 'サンドボックス環境でLinuxデスクトップアプリケーションを配布・実行するパッケージシステム。ディストリビューションに依存せず動作する。' },
  { term: 'AppImage', aliases: ['appimage'], description: '単一の実行可能ファイルとしてLinuxアプリケーションを配布する形式。インストール不要でそのまま実行でき、ディストリビューションを選ばない。' },
  { term: 'zypper', description: 'SUSE/openSUSE系Linuxで使用されるコマンドラインパッケージマネージャ。RPMパッケージの依存関係解決やリポジトリ管理を担う。' },
  { term: 'pacman', description: 'Arch Linuxのデフォルトパッケージマネージャ。シンプルで高速な設計が特徴で、AUR（Arch User Repository）へのアクセスもサポートする。' },
  { term: 'GPGキー', aliases: ['gpgキー', 'gpg key'], description: 'パッケージリポジトリの真正性を検証するために使用するGPG（PGP）公開鍵。パッケージをインストールする前にリポジトリの署名を検証するために使用される。' },
  { term: 'パッケージ署名', aliases: ['package signing'], description: 'RPMやdebパッケージにGPGデジタル署名を付与してパッケージの真正性と完全性を保証する仕組み。改ざんの検出に利用される。' },
  { term: '依存関係解決', aliases: ['dependency resolution'], description: 'パッケージのインストール時に必要な依存パッケージを自動的に特定・インストールする仕組み。YUM/DNF/APTが自動で処理する。' },
  { term: 'SPEC file', aliases: ['spec file', 'specファイル', '.spec'], description: 'RPMパッケージをビルドするための仕様ファイル。パッケージのメタ情報、ビルド手順、インストールスクリプトを記述する。' },
  { term: 'ソースRPM', aliases: ['ソースrpm', 'srpm', 'source rpm', '.src.rpm'], description: 'RPMパッケージのソースコードと.specファイルを含む特殊なRPMファイル（.src.rpm）。rpmbuildコマンドでバイナリRPMにビルドできる。' },
  { term: 'パッケージグループ', aliases: ['package group'], description: '関連するパッケージをまとめた論理グループ。dnf groupinstallコマンドでグループ単位でインストールできる。例：「開発ツール」グループ。' },
  { term: 'BaseOS', aliases: ['baseos'], description: 'RHEL 8以降で導入されたコアOSコンポーネントを提供するリポジトリ。基本的なシステム機能を構成するパッケージが含まれる。' },
  { term: 'AppStream', aliases: ['appstream'], description: 'RHEL 8以降で導入されたユーザー空間のアプリケーションを提供するリポジトリ。モジュールストリームで複数バージョンの共存が可能。' },
  { term: 'EPEL', aliases: ['epel', 'extra packages for enterprise linux'], description: 'Fedoraプロジェクトが管理するRHEL/CentOS向けの追加パッケージリポジトリ。公式リポジトリにないパッケージを提供する。' },
  { term: 'PPAリポジトリ', aliases: ['ppaリポジトリ', 'ppa', 'personal package archive'], description: 'Ubuntu向けの個人パッケージアーカイブ（Personal Package Archive）。Canonicalのlaunchpad.netでホストされ、公式リポジトリにないパッケージを追加できる。' },
  { term: 'apt-get', description: 'Debian/Ubuntu系のパッケージ管理コマンド。パッケージのインストール・削除・システム更新をコマンドラインから実行する。現在はaptコマンドが推奨される。' },
  { term: 'apt-cache', description: 'APTのパッケージキャッシュを照会するコマンド。パッケージの検索（apt-cache search）や詳細表示（apt-cache show）に使用する。' },
];

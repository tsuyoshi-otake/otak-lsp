/**
 * Docker用語集
 * Dockerコマンド・サブコマンド・オプションの説明
 * Docker Compose、Swarmも含む
 */

import { CliGlossaryEntry } from './gitGlossary';

export const DOCKER_GLOSSARY: ReadonlyArray<CliGlossaryEntry> = [
  // === 基本 ===
  { term: 'docker', description: 'コンテナ型仮想化プラットフォーム。アプリケーションをコンテナとして実行・配布。' },
  { term: 'docker --version', description: 'Dockerのバージョンを表示。', aliases: ['docker -v'] },
  { term: 'docker info', description: 'Dockerシステムの詳細情報を表示。' },
  { term: 'docker help', description: 'ヘルプを表示。' },

  // === コンテナ操作 ===
  { term: 'docker run', description: '新しいコンテナを作成して実行する。' },
  { term: 'docker run <image>', description: '指定イメージからコンテナを実行。' },
  { term: 'docker run -d', description: 'バックグラウンドで実行（デタッチモード）。', aliases: ['docker run --detach'] },
  { term: 'docker run -it', description: '対話的に実行（疑似TTY付き）。' },
  { term: 'docker run --name', description: 'コンテナ名を指定。' },
  { term: 'docker run -p', description: 'ポートをマッピング（ホスト:コンテナ）。', aliases: ['docker run --publish'] },
  { term: 'docker run -P', description: '公開ポートをランダムにマッピング。', aliases: ['docker run --publish-all'] },
  { term: 'docker run -v', description: 'ボリュームをマウント。', aliases: ['docker run --volume'] },
  { term: 'docker run --mount', description: 'マウントを詳細指定。' },
  { term: 'docker run -e', description: '環境変数を設定。', aliases: ['docker run --env'] },
  { term: 'docker run --env-file', description: '環境変数ファイルを読み込み。' },
  { term: 'docker run -w', description: '作業ディレクトリを指定。', aliases: ['docker run --workdir'] },
  { term: 'docker run --rm', description: '終了時にコンテナを自動削除。' },
  { term: 'docker run --restart', description: '再起動ポリシーを設定（no/always/on-failure/unless-stopped）。' },
  { term: 'docker run --network', description: 'ネットワークを指定。', aliases: ['docker run --net'] },
  { term: 'docker run --link', description: '他のコンテナにリンク（非推奨）。' },
  { term: 'docker run -u', description: 'ユーザーを指定。', aliases: ['docker run --user'] },
  { term: 'docker run --privileged', description: '特権モードで実行。' },
  { term: 'docker run --cap-add', description: 'Linuxケーパビリティを追加。' },
  { term: 'docker run --cap-drop', description: 'Linuxケーパビリティを削除。' },
  { term: 'docker run --security-opt', description: 'セキュリティオプションを設定。' },
  { term: 'docker run --read-only', description: 'ルートファイルシステムを読み取り専用に。' },
  { term: 'docker run --entrypoint', description: 'エントリポイントを上書き。' },
  { term: 'docker run --cpus', description: 'CPU使用量を制限。' },
  { term: 'docker run -m', description: 'メモリ使用量を制限。', aliases: ['docker run --memory'] },
  { term: 'docker run --gpus', description: 'GPUアクセスを許可。' },
  { term: 'docker run --label', description: 'ラベルを設定。', aliases: ['docker run -l'] },
  { term: 'docker run --hostname', description: 'ホスト名を設定。', aliases: ['docker run -h'] },
  { term: 'docker run --dns', description: 'DNSサーバーを設定。' },
  { term: 'docker run --add-host', description: '/etc/hostsにエントリを追加。' },
  { term: 'docker run --pid', description: 'PID名前空間を設定。' },
  { term: 'docker run --ipc', description: 'IPC名前空間を設定。' },
  { term: 'docker run --init', description: 'initプロセスを使用。' },
  { term: 'docker run --platform', description: 'プラットフォームを指定（linux/amd64等）。' },

  { term: 'docker start', description: '停止中のコンテナを起動する。' },
  { term: 'docker start -a', description: '起動してアタッチ。', aliases: ['docker start --attach'] },
  { term: 'docker start -i', description: '対話モードで起動。', aliases: ['docker start --interactive'] },

  { term: 'docker stop', description: '実行中のコンテナを停止する。' },
  { term: 'docker stop -t', description: '停止までの待機時間を指定。', aliases: ['docker stop --time'] },

  { term: 'docker restart', description: 'コンテナを再起動する。' },

  { term: 'docker pause', description: 'コンテナのプロセスを一時停止。' },
  { term: 'docker unpause', description: '一時停止を解除。' },

  { term: 'docker kill', description: 'コンテナを強制終了する。' },
  { term: 'docker kill -s', description: 'シグナルを指定して送信。', aliases: ['docker kill --signal'] },

  { term: 'docker rm', description: 'コンテナを削除する。' },
  { term: 'docker rm -f', description: '実行中のコンテナを強制削除。', aliases: ['docker rm --force'] },
  { term: 'docker rm -v', description: 'ボリュームも削除。', aliases: ['docker rm --volumes'] },

  { term: 'docker ps', description: '実行中のコンテナを一覧表示。' },
  { term: 'docker ps -a', description: '全てのコンテナを表示。', aliases: ['docker ps --all'] },
  { term: 'docker ps -q', description: 'コンテナIDのみ表示。', aliases: ['docker ps --quiet'] },
  { term: 'docker ps -f', description: 'フィルタを指定。', aliases: ['docker ps --filter'] },
  { term: 'docker ps --format', description: '出力形式を指定。' },
  { term: 'docker ps -n', description: '最新n個を表示。', aliases: ['docker ps --last'] },
  { term: 'docker ps -s', description: 'ファイルサイズも表示。', aliases: ['docker ps --size'] },

  { term: 'docker exec', description: '実行中のコンテナでコマンドを実行。' },
  { term: 'docker exec -it', description: '対話的にコマンドを実行。' },
  { term: 'docker exec -d', description: 'バックグラウンドで実行。', aliases: ['docker exec --detach'] },
  { term: 'docker exec -e', description: '環境変数を設定。', aliases: ['docker exec --env'] },
  { term: 'docker exec -u', description: 'ユーザーを指定。', aliases: ['docker exec --user'] },
  { term: 'docker exec -w', description: '作業ディレクトリを指定。', aliases: ['docker exec --workdir'] },

  { term: 'docker attach', description: 'コンテナの標準入出力にアタッチ。' },
  { term: 'docker attach --no-stdin', description: '標準入力をアタッチしない。' },

  { term: 'docker logs', description: 'コンテナのログを表示。' },
  { term: 'docker logs -f', description: 'ログをリアルタイムで追跡。', aliases: ['docker logs --follow'] },
  { term: 'docker logs --tail', description: '末尾の行数を指定。' },
  { term: 'docker logs --since', description: '指定時刻以降のログを表示。' },
  { term: 'docker logs --until', description: '指定時刻以前のログを表示。' },
  { term: 'docker logs -t', description: 'タイムスタンプを表示。', aliases: ['docker logs --timestamps'] },

  { term: 'docker top', description: 'コンテナ内のプロセスを表示。' },
  { term: 'docker stats', description: 'コンテナのリソース使用状況を表示。' },
  { term: 'docker stats --no-stream', description: '一度だけ表示。' },
  { term: 'docker stats --format', description: '出力形式を指定。' },

  { term: 'docker inspect', description: 'コンテナ/イメージの詳細情報をJSON形式で表示。' },
  { term: 'docker inspect --format', description: '出力形式を指定（Go template）。', aliases: ['docker inspect -f'] },

  { term: 'docker port', description: 'コンテナのポートマッピングを表示。' },

  { term: 'docker rename', description: 'コンテナ名を変更。' },

  { term: 'docker update', description: 'コンテナの設定を更新（リソース制限等）。' },
  { term: 'docker update --cpus', description: 'CPU使用量を更新。' },
  { term: 'docker update --memory', description: 'メモリ制限を更新。', aliases: ['docker update -m'] },
  { term: 'docker update --restart', description: '再起動ポリシーを更新。' },

  { term: 'docker wait', description: 'コンテナの終了を待機。' },

  { term: 'docker diff', description: 'コンテナのファイルシステム変更を表示。' },

  { term: 'docker cp', description: 'コンテナとホスト間でファイルをコピー。' },

  { term: 'docker export', description: 'コンテナのファイルシステムをtarでエクスポート。' },

  { term: 'docker commit', description: 'コンテナから新しいイメージを作成。' },
  { term: 'docker commit -m', description: 'コミットメッセージを指定。', aliases: ['docker commit --message'] },
  { term: 'docker commit -a', description: '作者を指定。', aliases: ['docker commit --author'] },
  { term: 'docker commit -c', description: 'Dockerfile命令を適用。', aliases: ['docker commit --change'] },

  // === イメージ操作 ===
  { term: 'docker images', description: 'イメージを一覧表示。', aliases: ['docker image ls'] },
  { term: 'docker images -a', description: '全てのイメージを表示（中間イメージ含む）。', aliases: ['docker images --all'] },
  { term: 'docker images -q', description: 'イメージIDのみ表示。', aliases: ['docker images --quiet'] },
  { term: 'docker images --digests', description: 'ダイジェストも表示。' },
  { term: 'docker images -f', description: 'フィルタを指定。', aliases: ['docker images --filter'] },

  { term: 'docker pull', description: 'レジストリからイメージを取得。' },
  { term: 'docker pull <image>', description: '指定イメージを取得。' },
  { term: 'docker pull -a', description: '全てのタグを取得。', aliases: ['docker pull --all-tags'] },
  { term: 'docker pull --platform', description: 'プラットフォームを指定。' },
  { term: 'docker pull --quiet', description: '出力を抑制。', aliases: ['docker pull -q'] },

  { term: 'docker push', description: 'レジストリにイメージをプッシュ。' },
  { term: 'docker push <image>', description: '指定イメージをプッシュ。' },
  { term: 'docker push -a', description: '全てのタグをプッシュ。', aliases: ['docker push --all-tags'] },

  { term: 'docker build', description: 'Dockerfileからイメージをビルド。' },
  { term: 'docker build -t', description: 'タグを指定。', aliases: ['docker build --tag'] },
  { term: 'docker build -f', description: 'Dockerfileを指定。', aliases: ['docker build --file'] },
  { term: 'docker build --no-cache', description: 'キャッシュを使用しない。' },
  { term: 'docker build --pull', description: 'ベースイメージを常にプル。' },
  { term: 'docker build --build-arg', description: 'ビルド引数を設定。' },
  { term: 'docker build --target', description: 'マルチステージビルドのターゲットを指定。' },
  { term: 'docker build --platform', description: 'プラットフォームを指定。' },
  { term: 'docker build --progress', description: '進捗表示形式（auto/plain/tty）。' },
  { term: 'docker build --secret', description: 'シークレットをビルド時に渡す。' },
  { term: 'docker build --ssh', description: 'SSHエージェントをビルド時に渡す。' },
  { term: 'docker build --cache-from', description: 'キャッシュソースを指定。' },
  { term: 'docker build --cache-to', description: 'キャッシュ出力先を指定。' },
  { term: 'docker build -q', description: 'イメージIDのみ出力。', aliases: ['docker build --quiet'] },
  { term: 'docker build --rm', description: 'ビルド成功時に中間コンテナを削除（デフォルト）。' },
  { term: 'docker build --squash', description: 'レイヤーを1つに圧縮（実験的）。' },

  { term: 'docker buildx', description: '拡張ビルド機能（BuildKit）。' },
  { term: 'docker buildx build', description: 'BuildKitでビルド。' },
  { term: 'docker buildx build --push', description: 'ビルドしてプッシュ。' },
  { term: 'docker buildx build --load', description: 'ビルドしてローカルにロード。' },
  { term: 'docker buildx create', description: 'ビルダーインスタンスを作成。' },
  { term: 'docker buildx use', description: 'ビルダーを選択。' },
  { term: 'docker buildx ls', description: 'ビルダー一覧を表示。' },
  { term: 'docker buildx rm', description: 'ビルダーを削除。' },
  { term: 'docker buildx inspect', description: 'ビルダーの情報を表示。' },
  { term: 'docker buildx imagetools', description: 'イメージ操作ツール。' },
  { term: 'docker buildx bake', description: '複数イメージを定義ファイルからビルド。' },

  { term: 'docker rmi', description: 'イメージを削除。' },
  { term: 'docker rmi -f', description: '強制削除。', aliases: ['docker rmi --force'] },
  { term: 'docker rmi --no-prune', description: '親イメージを削除しない。' },

  { term: 'docker tag', description: 'イメージにタグを付ける。' },
  { term: 'docker tag <source> <target>', description: 'ソースイメージに新しいタグを付与。' },

  { term: 'docker save', description: 'イメージをtarファイルに保存。' },
  { term: 'docker save -o', description: '出力ファイルを指定。', aliases: ['docker save --output'] },

  { term: 'docker load', description: 'tarファイルからイメージをロード。' },
  { term: 'docker load -i', description: '入力ファイルを指定。', aliases: ['docker load --input'] },

  { term: 'docker import', description: 'tarballからイメージを作成。' },

  { term: 'docker history', description: 'イメージの履歴を表示。' },
  { term: 'docker history --no-trunc', description: '出力を省略しない。' },

  { term: 'docker manifest', description: 'マルチアーキテクチャイメージを管理。' },
  { term: 'docker manifest create', description: 'マニフェストリストを作成。' },
  { term: 'docker manifest push', description: 'マニフェストをプッシュ。' },
  { term: 'docker manifest inspect', description: 'マニフェストを表示。' },

  // === ネットワーク ===
  { term: 'docker network', description: 'Dockerネットワークを管理。' },
  { term: 'docker network ls', description: 'ネットワーク一覧を表示。' },
  { term: 'docker network create', description: 'ネットワークを作成。' },
  { term: 'docker network create --driver', description: 'ドライバを指定（bridge/overlay/host/none）。', aliases: ['docker network create -d'] },
  { term: 'docker network create --subnet', description: 'サブネットを指定。' },
  { term: 'docker network create --gateway', description: 'ゲートウェイを指定。' },
  { term: 'docker network create --internal', description: '内部ネットワークとして作成。' },
  { term: 'docker network create --attachable', description: 'Swarm以外からもアタッチ可能に。' },
  { term: 'docker network rm', description: 'ネットワークを削除。' },
  { term: 'docker network inspect', description: 'ネットワークの詳細を表示。' },
  { term: 'docker network connect', description: 'コンテナをネットワークに接続。' },
  { term: 'docker network disconnect', description: 'コンテナをネットワークから切断。' },
  { term: 'docker network prune', description: '未使用ネットワークを削除。' },

  // === ボリューム ===
  { term: 'docker volume', description: 'Dockerボリュームを管理。' },
  { term: 'docker volume ls', description: 'ボリューム一覧を表示。' },
  { term: 'docker volume create', description: 'ボリュームを作成。' },
  { term: 'docker volume create --driver', description: 'ドライバを指定。', aliases: ['docker volume create -d'] },
  { term: 'docker volume rm', description: 'ボリュームを削除。' },
  { term: 'docker volume inspect', description: 'ボリュームの詳細を表示。' },
  { term: 'docker volume prune', description: '未使用ボリュームを削除。' },

  // === システム ===
  { term: 'docker system', description: 'Dockerシステムを管理。' },
  { term: 'docker system df', description: 'ディスク使用量を表示。' },
  { term: 'docker system df -v', description: '詳細なディスク使用量を表示。', aliases: ['docker system df --verbose'] },
  { term: 'docker system events', description: 'Dockerイベントをリアルタイムで表示。' },
  { term: 'docker system info', description: 'システム情報を表示。' },
  { term: 'docker system prune', description: '未使用リソースを削除。' },
  { term: 'docker system prune -a', description: '未使用イメージも全て削除。', aliases: ['docker system prune --all'] },
  { term: 'docker system prune --volumes', description: 'ボリュームも削除。' },
  { term: 'docker system prune -f', description: '確認なしで削除。', aliases: ['docker system prune --force'] },

  { term: 'docker image prune', description: '未使用イメージを削除。' },
  { term: 'docker container prune', description: '停止中のコンテナを削除。' },
  { term: 'docker builder prune', description: 'ビルドキャッシュを削除。' },

  // === ログイン・認証 ===
  { term: 'docker login', description: 'レジストリにログイン。' },
  { term: 'docker login -u', description: 'ユーザー名を指定。', aliases: ['docker login --username'] },
  { term: 'docker login -p', description: 'パスワードを指定。', aliases: ['docker login --password'] },
  { term: 'docker login --password-stdin', description: '標準入力からパスワードを読み込み。' },
  { term: 'docker logout', description: 'レジストリからログアウト。' },

  // === Docker Compose ===
  { term: 'docker compose', description: '複数コンテナアプリケーションを定義・実行。', aliases: ['docker-compose'] },
  { term: 'docker compose up', description: 'サービスを作成して起動。' },
  { term: 'docker compose up -d', description: 'バックグラウンドで起動。', aliases: ['docker compose up --detach'] },
  { term: 'docker compose up --build', description: 'イメージを再ビルドして起動。' },
  { term: 'docker compose up --force-recreate', description: 'コンテナを再作成。' },
  { term: 'docker compose up --no-deps', description: '依存サービスを起動しない。' },
  { term: 'docker compose up --scale', description: 'サービスのインスタンス数を指定。' },
  { term: 'docker compose up --pull', description: 'イメージを常にプル（always/missing/never）。' },
  { term: 'docker compose up --wait', description: 'サービスが正常になるまで待機。' },

  { term: 'docker compose down', description: 'サービスを停止して削除。' },
  { term: 'docker compose down -v', description: 'ボリュームも削除。', aliases: ['docker compose down --volumes'] },
  { term: 'docker compose down --rmi', description: 'イメージも削除（all/local）。' },
  { term: 'docker compose down --remove-orphans', description: '孤立コンテナも削除。' },

  { term: 'docker compose start', description: '停止中のサービスを起動。' },
  { term: 'docker compose stop', description: 'サービスを停止。' },
  { term: 'docker compose restart', description: 'サービスを再起動。' },
  { term: 'docker compose pause', description: 'サービスを一時停止。' },
  { term: 'docker compose unpause', description: '一時停止を解除。' },
  { term: 'docker compose kill', description: 'サービスを強制終了。' },

  { term: 'docker compose ps', description: 'サービスの状態を表示。' },
  { term: 'docker compose ps -a', description: '全てのサービスを表示。', aliases: ['docker compose ps --all'] },

  { term: 'docker compose logs', description: 'サービスのログを表示。' },
  { term: 'docker compose logs -f', description: 'ログをリアルタイムで追跡。', aliases: ['docker compose logs --follow'] },
  { term: 'docker compose logs --tail', description: '末尾の行数を指定。' },

  { term: 'docker compose exec', description: 'サービス内でコマンドを実行。' },
  { term: 'docker compose run', description: '一時的なコンテナでコマンドを実行。' },
  { term: 'docker compose run --rm', description: '実行後にコンテナを削除。' },
  { term: 'docker compose run --no-deps', description: '依存サービスを起動しない。' },
  { term: 'docker compose run -e', description: '環境変数を設定。' },

  { term: 'docker compose build', description: 'サービスのイメージをビルド。' },
  { term: 'docker compose build --no-cache', description: 'キャッシュを使用しない。' },
  { term: 'docker compose build --pull', description: 'ベースイメージを常にプル。' },

  { term: 'docker compose pull', description: 'サービスのイメージをプル。' },
  { term: 'docker compose push', description: 'サービスのイメージをプッシュ。' },

  { term: 'docker compose config', description: 'Composeファイルを検証して表示。' },
  { term: 'docker compose config --services', description: 'サービス名を一覧表示。' },
  { term: 'docker compose config --volumes', description: 'ボリューム名を一覧表示。' },

  { term: 'docker compose top', description: 'サービス内のプロセスを表示。' },
  { term: 'docker compose events', description: 'サービスのイベントを表示。' },
  { term: 'docker compose port', description: 'ポートマッピングを表示。' },
  { term: 'docker compose images', description: 'サービスのイメージを一覧表示。' },
  { term: 'docker compose cp', description: 'ファイルをコピー。' },

  { term: 'docker compose -f', description: 'Composeファイルを指定。', aliases: ['docker compose --file'] },
  { term: 'docker compose -p', description: 'プロジェクト名を指定。', aliases: ['docker compose --project-name'] },
  { term: 'docker compose --env-file', description: '環境変数ファイルを指定。' },
  { term: 'docker compose --profile', description: 'プロファイルを指定。' },

  // === Docker Swarm ===
  { term: 'docker swarm', description: 'Docker Swarmモードを管理。' },
  { term: 'docker swarm init', description: 'Swarmを初期化。' },
  { term: 'docker swarm join', description: 'Swarmに参加。' },
  { term: 'docker swarm join-token', description: '参加トークンを表示。' },
  { term: 'docker swarm leave', description: 'Swarmから離脱。' },
  { term: 'docker swarm update', description: 'Swarm設定を更新。' },

  { term: 'docker node', description: 'Swarmノードを管理。' },
  { term: 'docker node ls', description: 'ノード一覧を表示。' },
  { term: 'docker node inspect', description: 'ノードの詳細を表示。' },
  { term: 'docker node update', description: 'ノード設定を更新。' },
  { term: 'docker node rm', description: 'ノードを削除。' },
  { term: 'docker node ps', description: 'ノードで実行中のタスクを表示。' },
  { term: 'docker node promote', description: 'ノードをマネージャーに昇格。' },
  { term: 'docker node demote', description: 'マネージャーをワーカーに降格。' },

  { term: 'docker service', description: 'Swarmサービスを管理。' },
  { term: 'docker service create', description: 'サービスを作成。' },
  { term: 'docker service ls', description: 'サービス一覧を表示。' },
  { term: 'docker service ps', description: 'サービスのタスクを表示。' },
  { term: 'docker service inspect', description: 'サービスの詳細を表示。' },
  { term: 'docker service update', description: 'サービスを更新。' },
  { term: 'docker service scale', description: 'サービスのレプリカ数を変更。' },
  { term: 'docker service rm', description: 'サービスを削除。' },
  { term: 'docker service logs', description: 'サービスのログを表示。' },
  { term: 'docker service rollback', description: 'サービスをロールバック。' },

  { term: 'docker stack', description: 'Swarmスタックを管理。' },
  { term: 'docker stack deploy', description: 'スタックをデプロイ。' },
  { term: 'docker stack ls', description: 'スタック一覧を表示。' },
  { term: 'docker stack ps', description: 'スタックのタスクを表示。' },
  { term: 'docker stack services', description: 'スタックのサービスを表示。' },
  { term: 'docker stack rm', description: 'スタックを削除。' },

  { term: 'docker secret', description: 'Swarmシークレットを管理。' },
  { term: 'docker secret create', description: 'シークレットを作成。' },
  { term: 'docker secret ls', description: 'シークレット一覧を表示。' },
  { term: 'docker secret inspect', description: 'シークレットの詳細を表示。' },
  { term: 'docker secret rm', description: 'シークレットを削除。' },

  { term: 'docker config', description: 'Swarmコンフィグを管理。' },
  { term: 'docker config create', description: 'コンフィグを作成。' },
  { term: 'docker config ls', description: 'コンフィグ一覧を表示。' },
  { term: 'docker config inspect', description: 'コンフィグの詳細を表示。' },
  { term: 'docker config rm', description: 'コンフィグを削除。' },

  // === コンテキスト ===
  { term: 'docker context', description: 'Dockerコンテキストを管理。' },
  { term: 'docker context create', description: 'コンテキストを作成。' },
  { term: 'docker context ls', description: 'コンテキスト一覧を表示。' },
  { term: 'docker context use', description: 'コンテキストを切り替え。' },
  { term: 'docker context rm', description: 'コンテキストを削除。' },
  { term: 'docker context inspect', description: 'コンテキストの詳細を表示。' },

  // === プラグイン ===
  { term: 'docker plugin', description: 'Dockerプラグインを管理。' },
  { term: 'docker plugin install', description: 'プラグインをインストール。' },
  { term: 'docker plugin ls', description: 'プラグイン一覧を表示。' },
  { term: 'docker plugin enable', description: 'プラグインを有効化。' },
  { term: 'docker plugin disable', description: 'プラグインを無効化。' },
  { term: 'docker plugin rm', description: 'プラグインを削除。' },

  // === ファイル関連 ===
  { term: 'Dockerfile', description: 'Dockerイメージを構築するための命令ファイル。' },
  { term: '.dockerignore', description: 'ビルドコンテキストから除外するファイルを指定。' },
  { term: 'docker-compose.yml', description: 'Docker Composeの設定ファイル。', aliases: ['docker-compose.yaml', 'compose.yml', 'compose.yaml'] },

  // === Dockerfile命令 ===
  { term: 'FROM', description: 'ベースイメージを指定。Dockerfileの最初に記述。' },
  { term: 'RUN', description: 'コマンドを実行してレイヤーを作成。' },
  { term: 'CMD', description: 'コンテナ起動時のデフォルトコマンド。' },
  { term: 'ENTRYPOINT', description: 'コンテナ起動時の実行ファイル。CMDは引数になる。' },
  { term: 'COPY', description: 'ホストからファイルをコピー。' },
  { term: 'ADD', description: 'ファイルをコピー（URL取得・tar展開も可）。' },
  { term: 'WORKDIR', description: '作業ディレクトリを設定。' },
  { term: 'ENV', description: '環境変数を設定。' },
  { term: 'ARG', description: 'ビルド時の変数を定義。' },
  { term: 'EXPOSE', description: '公開ポートを宣言。' },
  { term: 'VOLUME', description: 'ボリュームマウントポイントを作成。' },
  { term: 'USER', description: '実行ユーザーを設定。' },
  { term: 'LABEL', description: 'メタデータラベルを設定。' },
  { term: 'HEALTHCHECK', description: 'ヘルスチェックを定義。' },
  { term: 'SHELL', description: 'デフォルトシェルを変更。' },
  { term: 'STOPSIGNAL', description: '停止シグナルを設定。' },
  { term: 'ONBUILD', description: '子イメージビルド時に実行される命令。' },

  // === 概念・用語 ===
  { term: 'container', description: 'イメージから作成された実行環境。', aliases: ['コンテナ'] },
  { term: 'image', description: 'コンテナの実行に必要なファイルシステムと設定。', aliases: ['イメージ'] },
  { term: 'layer', description: 'イメージを構成する読み取り専用の層。', aliases: ['レイヤー'] },
  { term: 'registry', description: 'イメージを保存・配布するサービス。', aliases: ['レジストリ'] },
  { term: 'Docker Hub', description: 'Dockerの公式イメージレジストリ。' },
  { term: 'Docker Desktop', description: 'Windows/Mac用のDockerアプリケーション。' },
  { term: 'Docker Engine', description: 'Dockerのコアランタイム。' },
  { term: 'BuildKit', description: '高速なイメージビルドシステム。' },
  { term: 'multi-stage build', description: '複数のFROMを使ったビルド最適化手法。', aliases: ['マルチステージビルド'] },
  { term: 'bind mount', description: 'ホストのディレクトリを直接マウント。' },
  { term: 'named volume', description: 'Dockerが管理する名前付きボリューム。' },
  { term: 'tmpfs mount', description: 'メモリ上の一時ファイルシステムマウント。' },
  { term: 'bridge network', description: 'デフォルトのネットワークドライバ。' },
  { term: 'host network', description: 'ホストのネットワークを直接使用。' },
  { term: 'overlay network', description: 'Swarmノード間のネットワーク。' },
  { term: 'orchestration', description: '複数コンテナの管理・スケーリング。', aliases: ['オーケストレーション'] },
];

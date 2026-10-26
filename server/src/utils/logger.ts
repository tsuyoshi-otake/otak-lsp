/**
 * ロガーユーティリティ
 * 
 * プロジェクト全体で統一されたログ出力を提供する
 */

/**
 * ログレベル
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * ログ出力関数の型
 */
export type LogFunction = (message: string) => void;

/**
 * ロガーインターフェース
 */
export interface Logger {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/**
 * ロガーを作成
 *
 * @param output ログ出力先関数
 * @param enableDebug デバッグログを有効にするか。
 *   `() => boolean` を渡すと debug 呼び出しごとに評価する
 *   （設定変更を即時反映したい場合に使う）。
 * @returns ロガーインスタンス
 */
export function createLogger(
  output: LogFunction,
  enableDebug: boolean | (() => boolean) = false
): Logger {
  const isDebug = typeof enableDebug === 'function' ? enableDebug : () => enableDebug;
  return {
    debug(message: string): void {
      if (isDebug()) {
        output(`[DEBUG] ${message}`);
      }
    },

    info(message: string): void {
      output(`[INFO] ${message}`);
    },

    warn(message: string): void {
      output(`[WARN] ${message}`);
    },

    error(message: string): void {
      output(`[ERROR] ${message}`);
    },
  };
}

/**
 * 環境変数からデバッグモードを判定
 * 正式名は OTAK_LSP_DEBUG。OTAK_LCP_DEBUG（旧スペル）は後方互換のため継続して受け付ける。
 */
export function isDebugEnabled(): boolean {
  return process.env.OTAK_LSP_DEBUG === '1' || process.env.OTAK_LCP_DEBUG === '1';
}

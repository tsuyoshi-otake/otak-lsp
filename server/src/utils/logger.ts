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
 * @param enableDebug デバッグログを有効にするか
 * @returns ロガーインスタンス
 */
export function createLogger(
  output: LogFunction,
  enableDebug: boolean = false
): Logger {
  return {
    debug(message: string): void {
      if (enableDebug) {
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
 */
export function isDebugEnabled(): boolean {
  return process.env.OTAK_LCP_DEBUG === '1';
}

/**
 * Null Object パターンのロガー（何も出力しない）
 */
export const nullLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

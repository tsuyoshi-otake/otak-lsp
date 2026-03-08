/**
 * エラーハンドリングユーティリティ
 * 
 * プロジェクト全体で統一されたエラー処理を提供する
 */

import { Logger } from './logger';

/**
 * エラーを安全に文字列に変換
 * 
 * @param error - エラーオブジェクト
 * @returns エラーメッセージ文字列
 */
export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
}

/**
 * エラーの詳細情報を取得
 * 
 * @param error - エラーオブジェクト
 * @returns エラーの詳細情報
 */
export function getErrorDetails(error: unknown): {
  message: string;
  stack?: string;
  name?: string;
} {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name,
    };
  }
  return {
    message: formatError(error),
  };
}

/**
 * エラーをログに記録
 * 
 * @param logger - ロガーインスタンス
 * @param context - エラーのコンテキスト
 * @param error - エラーオブジェクト
 */
export function logError(
  logger: Logger | undefined,
  context: string,
  error: unknown
): void {
  if (!logger) {
    return;
  }

  const details = getErrorDetails(error);
  const message = `${context}: ${details.message}`;
  
  logger.error(message);
  
  if (details.stack) {
    logger.debug(`Stack trace: ${details.stack}`);
  }
}

/**
 * エラーを警告としてログに記録
 * 
 * @param logger - ロガーインスタンス
 * @param context - エラーのコンテキスト
 * @param error - エラーオブジェクト
 */
export function logWarning(
  logger: Logger | undefined,
  context: string,
  error: unknown
): void {
  if (!logger) {
    return;
  }

  const message = `${context}: ${formatError(error)}`;
  logger.warn(message);
}

/**
 * 安全に関数を実行し、エラーをログに記録
 * 
 * @param fn - 実行する関数
 * @param logger - ロガーインスタンス
 * @param context - エラーのコンテキスト
 * @param fallback - エラー時のフォールバック値
 * @returns 関数の実行結果またはフォールバック値
 */
export function tryCatch<T>(
  fn: () => T,
  logger: Logger | undefined,
  context: string,
  fallback: T
): T {
  try {
    return fn();
  } catch (error) {
    logError(logger, context, error);
    return fallback;
  }
}

/**
 * 安全に非同期関数を実行し、エラーをログに記録
 * 
 * @param fn - 実行する非同期関数
 * @param logger - ロガーインスタンス
 * @param context - エラーのコンテキスト
 * @param fallback - エラー時のフォールバック値
 * @returns 関数の実行結果またはフォールバック値
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
  logger: Logger | undefined,
  context: string,
  fallback: T
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(logger, context, error);
    return fallback;
  }
}

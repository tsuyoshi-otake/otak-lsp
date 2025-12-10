/**
 * Error Handler
 * エラーハンドリング、ログ記録、ユーザー通知を管理する
 * Feature: japanese-grammar-analyzer
 * 要件: 7.5, 8.2, 8.3
 */

import { ErrorCode, ErrorCodes } from '../../../shared/src/types';

/**
 * エラーコンテキスト
 */
export interface ErrorContext {
  uri?: string;
  action?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * エラーログエントリ
 */
interface ErrorLogEntry {
  code: ErrorCode;
  message: string;
  context?: ErrorContext;
  timestamp: number;
  cause?: Error;
}

/**
 * ロガー関数型
 */
type Logger = (entry: ErrorLogEntry) => void;

/**
 * 通知関数型
 */
type Notifier = (entry: ErrorLogEntry) => void;

/**
 * ErrorHandler設定
 */
export interface ErrorHandlerOptions {
  logger: Logger;
  notifier: Notifier;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs?: number;
}

/**
 * アプリケーションエラー
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: Error;

  constructor(code: ErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.cause = cause;
  }
}

/**
 * リトライ可能なエラーコード
 */
const RETRYABLE_ERROR_CODES: ErrorCode[] = [
  ErrorCodes.ANALYZER_PARSE_ERROR,
  ErrorCodes.WIKIPEDIA_REQUEST_FAILED,
  ErrorCodes.WIKIPEDIA_TIMEOUT
];

/**
 * エラーリカバリー提案
 */
const RECOVERY_SUGGESTIONS: Record<ErrorCode, string> = {
  [ErrorCodes.ANALYZER_INIT_ERROR]:
    '形態素解析器の初期化に失敗しました。拡張機能を再起動してください。',
  [ErrorCodes.ANALYZER_DICT_ERROR]:
    '辞書の読み込みに失敗しました。拡張機能を再インストールしてください。',
  [ErrorCodes.ANALYZER_PARSE_ERROR]:
    '解析中にエラーが発生しました。しばらく待ってから再試行してください。',
  [ErrorCodes.WIKIPEDIA_REQUEST_FAILED]:
    'Wikipedia APIへのリクエストに失敗しました。ネットワーク接続を確認してください。',
  [ErrorCodes.WIKIPEDIA_TIMEOUT]:
    'Wikipedia APIがタイムアウトしました。ネットワーク状況を確認するか、後で再試行してください。',
  [ErrorCodes.WIKIPEDIA_RATE_LIMIT]:
    'Wikipedia APIのレート制限に達しました。しばらく待ってから再試行してください。',
  [ErrorCodes.ENCODING_ERROR]:
    'ファイルのエンコーディングエラーです。UTF-8でファイルを保存してください。',
  [ErrorCodes.FILE_TOO_LARGE]:
    'ファイルが大きすぎます。解析対象のファイルサイズを小さくしてください。',
  [ErrorCodes.COMMENT_EXTRACTION_ERROR]:
    'コメント抽出でエラーが発生しました。ファイルの構文を確認してください。'
};

/**
 * Error Handler
 * エラー処理を一元管理する
 */
export class ErrorHandler {
  private logger: Logger;
  private notifier: Notifier;
  private maxRetries: number;
  private baseBackoffMs: number;
  private maxBackoffMs: number;
  private retryCount: Map<string, number> = new Map();

  constructor(options: ErrorHandlerOptions) {
    this.logger = options.logger;
    this.notifier = options.notifier;
    this.maxRetries = options.maxRetries;
    this.baseBackoffMs = options.baseBackoffMs;
    this.maxBackoffMs = options.maxBackoffMs ?? 30000;
  }

  /**
   * エラーをハンドルする
   */
  async handleError(error: AppError, context: ErrorContext): Promise<void> {
    const entry: ErrorLogEntry = {
      code: error.code,
      message: error.message,
      context,
      timestamp: Date.now(),
      cause: error.cause
    };

    // 常にログに記録
    this.logger(entry);

    // リトライ可能なエラーの場合
    if (this.isRetryable(error.code)) {
      const key = this.getContextKey(context);
      const currentCount = this.retryCount.get(key) || 0;
      const newCount = currentCount + 1;
      this.retryCount.set(key, newCount);

      // 最大リトライ回数を超えた場合のみ通知
      if (newCount > this.maxRetries) {
        this.notifier(entry);
      }
    } else {
      // リトライ不可能なエラーは即座に通知
      this.notifier(entry);
    }
  }

  /**
   * エラーコードがリトライ可能かどうかを判定
   */
  isRetryable(code: ErrorCode): boolean {
    return RETRYABLE_ERROR_CODES.includes(code);
  }

  /**
   * 指数バックオフ遅延を計算
   */
  calculateBackoffDelay(retryCount: number): number {
    const delay = this.baseBackoffMs * Math.pow(2, retryCount);
    return Math.min(delay, this.maxBackoffMs);
  }

  /**
   * リカバリー提案を取得
   */
  getRecoverySuggestion(code: ErrorCode): string {
    return RECOVERY_SUGGESTIONS[code] ||
      '予期しないエラーが発生しました。問題が続く場合は再起動してください。';
  }

  /**
   * リトライ回数を取得
   */
  getRetryCount(context: ErrorContext): number {
    const key = this.getContextKey(context);
    return this.retryCount.get(key) || 0;
  }

  /**
   * リトライ回数をリセット
   */
  resetRetryCount(context: ErrorContext): void {
    const key = this.getContextKey(context);
    this.retryCount.delete(key);
  }

  /**
   * AppErrorを作成
   */
  createError(code: ErrorCode, message: string, cause?: Error): AppError {
    return new AppError(code, message, cause);
  }

  /**
   * コンテキストからキーを生成
   */
  private getContextKey(context: ErrorContext): string {
    return context.uri || 'global';
  }
}

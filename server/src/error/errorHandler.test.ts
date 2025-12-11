/**
 * Error Handler Unit Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 7.5, 8.2, 8.3
 */

import { ErrorHandler, ErrorContext, AppError } from './errorHandler';
import { ErrorCodes } from '../../../shared/src/types';

describe('Error Handler', () => {
  let handler: ErrorHandler;
  let mockLogger: jest.Mock;
  let mockNotifier: jest.Mock;

  beforeEach(() => {
    mockLogger = jest.fn();
    mockNotifier = jest.fn();
    handler = new ErrorHandler({
      logger: mockLogger,
      notifier: mockNotifier,
      maxRetries: 3,
      baseBackoffMs: 100
    });
  });

  describe('AppError', () => {
    it('should create error with code and message', () => {
      const error = new AppError(ErrorCodes.ANALYZER_INIT_ERROR, 'Analyzer init error');

      expect(error.code).toBe(ErrorCodes.ANALYZER_INIT_ERROR);
      expect(error.message).toBe('Analyzer init error');
      expect(error.name).toBe('AppError');
    });

    it('should support original error cause', () => {
      const originalError = new Error('Original error');
      const error = new AppError(
        ErrorCodes.ANALYZER_PARSE_ERROR,
        'Process failed',
        originalError
      );

      expect(error.cause).toBe(originalError);
    });
  });

  describe('handleError', () => {
    it('should log error', async () => {
      const error = new AppError(ErrorCodes.ANALYZER_INIT_ERROR, 'Analyzer init error');
      const context: ErrorContext = { uri: 'file:///test.md' };

      await handler.handleError(error, context);

      expect(mockLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.ANALYZER_INIT_ERROR,
          message: 'Analyzer init error',
          context
        })
      );
    });

    it('should notify user for non-retryable errors', async () => {
      const error = new AppError(ErrorCodes.ANALYZER_INIT_ERROR, 'Analyzer init error');
      const context: ErrorContext = { uri: 'file:///test.md' };

      await handler.handleError(error, context);

      expect(mockNotifier).toHaveBeenCalledWith(
        expect.objectContaining({
          code: ErrorCodes.ANALYZER_INIT_ERROR
        })
      );
    });

    it('should not immediately notify for retryable errors', async () => {
      const error = new AppError(ErrorCodes.WIKIPEDIA_REQUEST_FAILED, 'Request failed');
      const context: ErrorContext = { uri: 'file:///test.md' };

      await handler.handleError(error, context);

      // リトライ可能なエラーは最初は通知しない
      expect(mockNotifier).not.toHaveBeenCalled();
    });

    it('should notify after max retries exceeded', async () => {
      const error = new AppError(ErrorCodes.WIKIPEDIA_REQUEST_FAILED, 'Request failed');
      const context: ErrorContext = { uri: 'file:///test.md' };

      // 最大リトライ回数を超えるまで呼び出し
      for (let i = 0; i <= 3; i++) {
        await handler.handleError(error, context);
      }

      expect(mockNotifier).toHaveBeenCalled();
    });
  });

  describe('isRetryable', () => {
    it('should return true for retryable error codes', () => {
      expect(handler.isRetryable(ErrorCodes.ANALYZER_PARSE_ERROR)).toBe(true);
      expect(handler.isRetryable(ErrorCodes.WIKIPEDIA_REQUEST_FAILED)).toBe(true);
      expect(handler.isRetryable(ErrorCodes.WIKIPEDIA_TIMEOUT)).toBe(true);
    });

    it('should return false for non-retryable error codes', () => {
      expect(handler.isRetryable(ErrorCodes.ANALYZER_INIT_ERROR)).toBe(false);
      expect(handler.isRetryable(ErrorCodes.ANALYZER_DICT_ERROR)).toBe(false);
      expect(handler.isRetryable(ErrorCodes.FILE_TOO_LARGE)).toBe(false);
    });
  });

  describe('retry tracking', () => {
    it('should track retry count per context', async () => {
      const error = new AppError(ErrorCodes.WIKIPEDIA_REQUEST_FAILED, 'Request failed');
      const context1: ErrorContext = { uri: 'file:///test1.md' };
      const context2: ErrorContext = { uri: 'file:///test2.md' };

      await handler.handleError(error, context1);
      await handler.handleError(error, context1);
      await handler.handleError(error, context2);

      expect(handler.getRetryCount(context1)).toBe(2);
      expect(handler.getRetryCount(context2)).toBe(1);
    });

    it('should reset retry count', () => {
      const error = new AppError(ErrorCodes.WIKIPEDIA_REQUEST_FAILED, 'Request failed');
      const context: ErrorContext = { uri: 'file:///test.md' };

      handler.handleError(error, context);
      handler.handleError(error, context);
      handler.resetRetryCount(context);

      expect(handler.getRetryCount(context)).toBe(0);
    });
  });

  describe('exponential backoff', () => {
    it('should calculate correct backoff delay', () => {
      expect(handler.calculateBackoffDelay(0)).toBe(100);  // baseBackoffMs * 2^0
      expect(handler.calculateBackoffDelay(1)).toBe(200);  // baseBackoffMs * 2^1
      expect(handler.calculateBackoffDelay(2)).toBe(400);  // baseBackoffMs * 2^2
      expect(handler.calculateBackoffDelay(3)).toBe(800);  // baseBackoffMs * 2^3
    });

    it('should cap backoff at maximum', () => {
      handler = new ErrorHandler({
        logger: mockLogger,
        notifier: mockNotifier,
        maxRetries: 10,
        baseBackoffMs: 100,
        maxBackoffMs: 1000
      });

      expect(handler.calculateBackoffDelay(10)).toBeLessThanOrEqual(1000);
    });
  });

  describe('error recovery suggestions', () => {
    it('should provide recovery suggestion for ANALYZER_INIT_ERROR', () => {
      const suggestion = handler.getRecoverySuggestion(ErrorCodes.ANALYZER_INIT_ERROR);
      // kuromoji.jsでは初期化エラーの対応方法を提案
      expect(suggestion).toBeDefined();
    });

    it('should provide recovery suggestion for ANALYZER_DICT_ERROR', () => {
      const suggestion = handler.getRecoverySuggestion(ErrorCodes.ANALYZER_DICT_ERROR);
      expect(suggestion).toBeDefined();
    });

    it('should provide recovery suggestion for WIKIPEDIA_TIMEOUT', () => {
      const suggestion = handler.getRecoverySuggestion(ErrorCodes.WIKIPEDIA_TIMEOUT);
      expect(suggestion).toContain('タイムアウト');
    });

    it('should provide default suggestion for unknown error', () => {
      const suggestion = handler.getRecoverySuggestion('UNKNOWN_ERROR' as any);
      expect(suggestion).toBeDefined();
    });
  });

  describe('createError', () => {
    it('should create AppError with appropriate message', () => {
      const error = handler.createError(
        ErrorCodes.ANALYZER_INIT_ERROR,
        '形態素解析器の初期化に失敗しました'
      );

      expect(error).toBeInstanceOf(AppError);
      expect(error.code).toBe(ErrorCodes.ANALYZER_INIT_ERROR);
    });
  });
});

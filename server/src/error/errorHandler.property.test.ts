/**
 * Error Handler Property-Based Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 7.5
 */

import * as fc from 'fast-check';
import { ErrorHandler, ErrorContext, AppError } from './errorHandler';
import { ErrorCodes } from '../../../shared/src/types';

describe('Property-Based Tests: Error Handler', () => {
  /**
   * Feature: japanese-grammar-analyzer, Property 14: エラーログと通知
   * 任意の解析エラーに対して、システムはエラーをログに記録し、ユーザーに通知を表示する
   */
  describe('Property 14: エラーログと通知', () => {
    it('should always log errors regardless of error type', () => {
      const errorCodes = Object.values(ErrorCodes);

      fc.assert(
        fc.property(
          fc.constantFrom(...errorCodes),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (errorCode, message, uri) => {
            const mockLogger = jest.fn();
            const mockNotifier = jest.fn();
            const handler = new ErrorHandler({
              logger: mockLogger,
              notifier: mockNotifier,
              maxRetries: 3,
              baseBackoffMs: 100
            });

            const error = new AppError(errorCode, message);
            const context: ErrorContext = { uri: `file:///${uri}` };

            handler.handleError(error, context);

            // エラーは常にログに記録される
            expect(mockLogger).toHaveBeenCalled();
            expect(mockLogger).toHaveBeenCalledWith(
              expect.objectContaining({
                code: errorCode,
                message
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should notify user for non-retryable errors on first occurrence', () => {
      const nonRetryableCodes = [
        ErrorCodes.ANALYZER_INIT_ERROR,
        ErrorCodes.ANALYZER_DICT_ERROR,
        ErrorCodes.FILE_TOO_LARGE,
        ErrorCodes.ENCODING_ERROR
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...nonRetryableCodes),
          fc.string({ minLength: 1, maxLength: 50 }),
          (errorCode, uri) => {
            const mockLogger = jest.fn();
            const mockNotifier = jest.fn();
            const handler = new ErrorHandler({
              logger: mockLogger,
              notifier: mockNotifier,
              maxRetries: 3,
              baseBackoffMs: 100
            });

            const error = new AppError(errorCode, 'Error message');
            const context: ErrorContext = { uri: `file:///${uri}` };

            handler.handleError(error, context);

            // 非リトライ可能なエラーは即座に通知
            expect(mockNotifier).toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should delay notification for retryable errors until max retries exceeded', () => {
      const retryableCodes = [
        ErrorCodes.ANALYZER_PARSE_ERROR,
        ErrorCodes.WIKIPEDIA_REQUEST_FAILED,
        ErrorCodes.WIKIPEDIA_TIMEOUT
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...retryableCodes),
          fc.integer({ min: 1, max: 5 }),
          (errorCode, maxRetries) => {
            const mockLogger = jest.fn();
            const mockNotifier = jest.fn();
            const handler = new ErrorHandler({
              logger: mockLogger,
              notifier: mockNotifier,
              maxRetries,
              baseBackoffMs: 10
            });

            const error = new AppError(errorCode, 'Error message');
            const context: ErrorContext = { uri: 'file:///test.md' };

            // maxRetries回まではハンドルしても通知されない
            for (let i = 0; i < maxRetries; i++) {
              handler.handleError(error, context);
            }
            expect(mockNotifier).not.toHaveBeenCalled();

            // maxRetriesを超えると通知される
            handler.handleError(error, context);
            expect(mockNotifier).toHaveBeenCalled();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide recovery suggestion for all error codes', () => {
      const errorCodes = Object.values(ErrorCodes);

      fc.assert(
        fc.property(
          fc.constantFrom(...errorCodes),
          (errorCode) => {
            const handler = new ErrorHandler({
              logger: jest.fn(),
              notifier: jest.fn(),
              maxRetries: 3,
              baseBackoffMs: 100
            });

            const suggestion = handler.getRecoverySuggestion(errorCode);

            // すべてのエラーコードに対してリカバリー提案がある
            expect(suggestion).toBeDefined();
            expect(typeof suggestion).toBe('string');
            expect(suggestion.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should calculate valid exponential backoff delays', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 1000 }),
          fc.integer({ min: 1000, max: 30000 }),
          fc.integer({ min: 0, max: 10 }),
          (baseBackoffMs, maxBackoffMs, retryCount) => {
            const handler = new ErrorHandler({
              logger: jest.fn(),
              notifier: jest.fn(),
              maxRetries: 10,
              baseBackoffMs,
              maxBackoffMs
            });

            const delay = handler.calculateBackoffDelay(retryCount);

            // 遅延は常に正の値
            expect(delay).toBeGreaterThan(0);
            // 遅延は最大値を超えない
            expect(delay).toBeLessThanOrEqual(maxBackoffMs);
            // 遅延はbase値以上
            expect(delay).toBeGreaterThanOrEqual(baseBackoffMs);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should track retry counts independently per context', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }).filter(arr => {
            const unique = new Set(arr);
            return unique.size === arr.length;
          }),
          fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 5 }),
          (uris, retryCounts) => {
            const mockLogger = jest.fn();
            const mockNotifier = jest.fn();
            const handler = new ErrorHandler({
              logger: mockLogger,
              notifier: mockNotifier,
              maxRetries: 10,
              baseBackoffMs: 10
            });

            const error = new AppError(ErrorCodes.WIKIPEDIA_REQUEST_FAILED, 'Test');

            // 各URIに対して異なる回数のエラーを発生させる
            const expectedCounts: { [key: string]: number } = {};
            for (let i = 0; i < Math.min(uris.length, retryCounts.length); i++) {
              const context: ErrorContext = { uri: `file:///${uris[i]}` };
              const count = retryCounts[i];
              expectedCounts[uris[i]] = count;

              for (let j = 0; j < count; j++) {
                handler.handleError(error, context);
              }
            }

            // 各コンテキストのリトライ回数が独立していることを確認
            for (let i = 0; i < Math.min(uris.length, retryCounts.length); i++) {
              const context: ErrorContext = { uri: `file:///${uris[i]}` };
              expect(handler.getRetryCount(context)).toBe(expectedCounts[uris[i]]);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

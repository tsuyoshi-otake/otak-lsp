/**
 * Error Handler Utility Tests
 */

import {
  formatError,
  getErrorDetails,
  logError,
  logWarning,
  tryCatch,
  tryCatchAsync,
} from './errorHandler';
import { Logger } from './logger';

describe('Error Handler Utility', () => {
  describe('formatError', () => {
    it('should format Error instance', () => {
      const error = new Error('test error');
      expect(formatError(error)).toBe('test error');
    });

    it('should format string error', () => {
      expect(formatError('string error')).toBe('string error');
    });

    it('should format number error', () => {
      expect(formatError(123)).toBe('123');
    });

    it('should format object error', () => {
      const error = { code: 'ERR_001' };
      expect(formatError(error)).toBe('[object Object]');
    });

    it('should format null error', () => {
      expect(formatError(null)).toBe('null');
    });

    it('should format undefined error', () => {
      expect(formatError(undefined)).toBe('undefined');
    });
  });

  describe('getErrorDetails', () => {
    it('should get details from Error instance', () => {
      const error = new Error('test error');
      const details = getErrorDetails(error);

      expect(details.message).toBe('test error');
      expect(details.name).toBe('Error');
      expect(details.stack).toBeDefined();
    });

    it('should get details from string error', () => {
      const details = getErrorDetails('string error');

      expect(details.message).toBe('string error');
      expect(details.name).toBeUndefined();
      expect(details.stack).toBeUndefined();
    });

    it('should get details from custom error', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const error = new CustomError('custom error');
      const details = getErrorDetails(error);

      expect(details.message).toBe('custom error');
      expect(details.name).toBe('CustomError');
    });
  });

  describe('logError', () => {
    it('should log error with logger', () => {
      const logs: string[] = [];
      const logger: Logger = {
        debug: (msg) => logs.push(`DEBUG: ${msg}`),
        info: (msg) => logs.push(`INFO: ${msg}`),
        warn: (msg) => logs.push(`WARN: ${msg}`),
        error: (msg) => logs.push(`ERROR: ${msg}`),
      };

      const error = new Error('test error');
      logError(logger, 'Test context', error);

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toContain('ERROR:');
      expect(logs[0]).toContain('Test context');
      expect(logs[0]).toContain('test error');
    });

    it('should not throw when logger is undefined', () => {
      expect(() => {
        logError(undefined, 'Test context', new Error('test'));
      }).not.toThrow();
    });
  });

  describe('logWarning', () => {
    it('should log warning with logger', () => {
      const logs: string[] = [];
      const logger: Logger = {
        debug: (msg) => logs.push(`DEBUG: ${msg}`),
        info: (msg) => logs.push(`INFO: ${msg}`),
        warn: (msg) => logs.push(`WARN: ${msg}`),
        error: (msg) => logs.push(`ERROR: ${msg}`),
      };

      logWarning(logger, 'Test context', 'warning message');

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('WARN:');
      expect(logs[0]).toContain('Test context');
      expect(logs[0]).toContain('warning message');
    });

    it('should not throw when logger is undefined', () => {
      expect(() => {
        logWarning(undefined, 'Test context', 'warning');
      }).not.toThrow();
    });
  });

  describe('tryCatch', () => {
    it('should return function result on success', () => {
      const result = tryCatch(
        () => 42,
        undefined,
        'Test context',
        0
      );

      expect(result).toBe(42);
    });

    it('should return fallback on error', () => {
      const logs: string[] = [];
      const logger: Logger = {
        debug: (msg) => logs.push(msg),
        info: (msg) => logs.push(msg),
        warn: (msg) => logs.push(msg),
        error: (msg) => logs.push(msg),
      };

      const result = tryCatch(
        () => {
          throw new Error('test error');
        },
        logger,
        'Test context',
        'fallback'
      );

      expect(result).toBe('fallback');
      expect(logs.length).toBeGreaterThan(0);
    });
  });

  describe('tryCatchAsync', () => {
    it('should return function result on success', async () => {
      const result = await tryCatchAsync(
        async () => 42,
        undefined,
        'Test context',
        0
      );

      expect(result).toBe(42);
    });

    it('should return fallback on error', async () => {
      const logs: string[] = [];
      const logger: Logger = {
        debug: (msg) => logs.push(msg),
        info: (msg) => logs.push(msg),
        warn: (msg) => logs.push(msg),
        error: (msg) => logs.push(msg),
      };

      const result = await tryCatchAsync(
        async () => {
          throw new Error('test error');
        },
        logger,
        'Test context',
        'fallback'
      );

      expect(result).toBe('fallback');
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should handle rejected promises', async () => {
      const result = await tryCatchAsync(
        () => Promise.reject(new Error('rejected')),
        undefined,
        'Test context',
        'fallback'
      );

      expect(result).toBe('fallback');
    });
  });
});

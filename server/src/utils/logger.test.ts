/**
 * Logger Utility Tests
 */

import { createLogger, isDebugEnabled } from './logger';

describe('Logger Utility', () => {
  describe('createLogger', () => {
    it('should create a logger with all log levels', () => {
      const logs: string[] = [];
      const logger = createLogger((msg) => logs.push(msg), true);

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logs).toHaveLength(4);
      expect(logs[0]).toBe('[DEBUG] debug message');
      expect(logs[1]).toBe('[INFO] info message');
      expect(logs[2]).toBe('[WARN] warn message');
      expect(logs[3]).toBe('[ERROR] error message');
    });

    it('should not output debug logs when debug is disabled', () => {
      const logs: string[] = [];
      const logger = createLogger((msg) => logs.push(msg), false);

      logger.debug('debug message');
      logger.info('info message');

      expect(logs).toHaveLength(1);
      expect(logs[0]).toBe('[INFO] info message');
    });

    it('should always output info, warn, and error logs', () => {
      const logs: string[] = [];
      const logger = createLogger((msg) => logs.push(msg), false);

      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(logs).toHaveLength(3);
    });
  });

  describe('isDebugEnabled', () => {
    const originalEnv = process.env.OTAK_LCP_DEBUG;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.OTAK_LCP_DEBUG = originalEnv;
      } else {
        delete process.env.OTAK_LCP_DEBUG;
      }
    });

    it('should return true when OTAK_LCP_DEBUG is "1"', () => {
      process.env.OTAK_LCP_DEBUG = '1';
      expect(isDebugEnabled()).toBe(true);
    });

    it('should return false when OTAK_LCP_DEBUG is not "1"', () => {
      process.env.OTAK_LCP_DEBUG = '0';
      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when OTAK_LCP_DEBUG is undefined', () => {
      delete process.env.OTAK_LCP_DEBUG;
      expect(isDebugEnabled()).toBe(false);
    });
  });

});

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

    it('should evaluate predicate lazily per debug call (not at creation)', () => {
      const logs: string[] = [];
      let enabled = false;
      const logger = createLogger((msg) => logs.push(msg), () => enabled);

      logger.debug('first');
      expect(logs).toHaveLength(0);

      enabled = true;
      logger.debug('second');
      expect(logs).toEqual(['[DEBUG] second']);
    });

    it('should not throw when predicate reads an unassigned optional holder', () => {
      // main.ts の初期化順序を再現: 後から設定される manager を
      // optional chaining で遅延参照する predicate は初期化中も安全でなければならない。
      const logs: string[] = [];
      const holder: { manager?: { getConfig(): { debugLog?: boolean } } } = {};
      const logger = createLogger(
        (msg) => logs.push(msg),
        () => holder.manager?.getConfig().debugLog ?? false
      );

      expect(() => logger.debug('during init')).not.toThrow();
      expect(logs).toHaveLength(0);

      holder.manager = { getConfig: () => ({ debugLog: true }) };
      logger.debug('after init');
      expect(logs).toEqual(['[DEBUG] after init']);
    });
  });

  describe('isDebugEnabled', () => {
    const originalLcpEnv = process.env.OTAK_LCP_DEBUG;
    const originalLspEnv = process.env.OTAK_LSP_DEBUG;

    afterEach(() => {
      if (originalLcpEnv !== undefined) {
        process.env.OTAK_LCP_DEBUG = originalLcpEnv;
      } else {
        delete process.env.OTAK_LCP_DEBUG;
      }
      if (originalLspEnv !== undefined) {
        process.env.OTAK_LSP_DEBUG = originalLspEnv;
      } else {
        delete process.env.OTAK_LSP_DEBUG;
      }
    });

    it('should return true when OTAK_LCP_DEBUG is "1"', () => {
      delete process.env.OTAK_LSP_DEBUG;
      process.env.OTAK_LCP_DEBUG = '1';
      expect(isDebugEnabled()).toBe(true);
    });

    it('should return true when OTAK_LSP_DEBUG is "1" (new canonical name)', () => {
      delete process.env.OTAK_LCP_DEBUG;
      process.env.OTAK_LSP_DEBUG = '1';
      expect(isDebugEnabled()).toBe(true);
    });

    it('should return false when OTAK_LCP_DEBUG is not "1"', () => {
      delete process.env.OTAK_LSP_DEBUG;
      process.env.OTAK_LCP_DEBUG = '0';
      expect(isDebugEnabled()).toBe(false);
    });

    it('should return false when both env vars are undefined', () => {
      delete process.env.OTAK_LCP_DEBUG;
      delete process.env.OTAK_LSP_DEBUG;
      expect(isDebugEnabled()).toBe(false);
    });
  });

});

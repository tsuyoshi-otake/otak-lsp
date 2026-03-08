/**
 * テストユーティリティのテスト
 */

import { createMockTextDocument, testLogger, createTestLogger } from './testUtils';

describe('testUtils', () => {
  describe('createMockTextDocument', () => {
    it('指定されたパラメータでTextDocumentを作成する', () => {
      const doc = createMockTextDocument('file:///test.md', 1, 'テスト内容');
      
      expect(doc.uri).toBe('file:///test.md');
      expect(doc.version).toBe(1);
      expect(doc.getText()).toBe('テスト内容');
      expect(doc.languageId).toBe('markdown');
    });

    it('空のテキストでTextDocumentを作成できる', () => {
      const doc = createMockTextDocument('file:///empty.md', 0, '');
      
      expect(doc.getText()).toBe('');
      expect(doc.version).toBe(0);
    });
  });

  describe('testLogger', () => {
    it('すべてのログレベルのメソッドを持つ', () => {
      expect(typeof testLogger.debug).toBe('function');
      expect(typeof testLogger.info).toBe('function');
      expect(typeof testLogger.warn).toBe('function');
      expect(typeof testLogger.error).toBe('function');
    });

    it('呼び出してもエラーが発生しない', () => {
      expect(() => {
        testLogger.debug('test');
        testLogger.info('test');
        testLogger.warn('test');
        testLogger.error('test');
      }).not.toThrow();
    });
  });

  describe('createTestLogger', () => {
    it('ロガーとメッセージ配列を返す', () => {
      const { logger, messages } = createTestLogger();
      
      expect(logger).toBeDefined();
      expect(messages).toEqual([]);
    });

    it('debugメッセージを記録する', () => {
      const { logger, messages } = createTestLogger();
      
      logger.debug('デバッグメッセージ');
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ level: 'debug', message: 'デバッグメッセージ' });
    });

    it('infoメッセージを記録する', () => {
      const { logger, messages } = createTestLogger();
      
      logger.info('情報メッセージ');
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ level: 'info', message: '情報メッセージ' });
    });

    it('warnメッセージを記録する', () => {
      const { logger, messages } = createTestLogger();
      
      logger.warn('警告メッセージ');
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ level: 'warn', message: '警告メッセージ' });
    });

    it('errorメッセージを記録する', () => {
      const { logger, messages } = createTestLogger();
      
      logger.error('エラーメッセージ');
      
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ level: 'error', message: 'エラーメッセージ' });
    });

    it('複数のメッセージを順番に記録する', () => {
      const { logger, messages } = createTestLogger();
      
      logger.info('最初');
      logger.warn('2番目');
      logger.error('3番目');
      
      expect(messages).toHaveLength(3);
      expect(messages[0]).toEqual({ level: 'info', message: '最初' });
      expect(messages[1]).toEqual({ level: 'warn', message: '2番目' });
      expect(messages[2]).toEqual({ level: 'error', message: '3番目' });
    });
  });
});

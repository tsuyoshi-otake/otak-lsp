/**
 * MeCab Environment Checker Unit Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { MeCabEnvironmentChecker, MeCabEnvironmentStatus } from './environmentChecker';

describe('MeCab Environment Checker', () => {
  let checker: MeCabEnvironmentChecker;

  beforeEach(() => {
    checker = new MeCabEnvironmentChecker();
  });

  describe('checkMeCabExists', () => {
    it('should return true for valid mecab path', async () => {
      // モックでMeCabが存在する場合をシミュレート
      checker.setExecSync((cmd: string) => {
        if (cmd.includes('--version')) {
          return 'mecab of 0.996';
        }
        throw new Error('Command not found');
      });

      const result = await checker.checkMeCabExists('mecab');
      expect(result).toBe(true);
    });

    it('should return false for invalid mecab path', async () => {
      checker.setExecSync(() => {
        throw new Error('Command not found');
      });

      const result = await checker.checkMeCabExists('/invalid/path/mecab');
      expect(result).toBe(false);
    });
  });

  describe('checkDictionary', () => {
    it('should return true when dictionary exists', async () => {
      checker.setExecSync((cmd: string) => {
        if (cmd.includes('-D')) {
          return '/usr/local/lib/mecab/dic/ipadic';
        }
        return '';
      });

      const result = await checker.checkDictionary('mecab');
      expect(result).toBe(true);
    });

    it('should return false when dictionary check fails', async () => {
      checker.setExecSync(() => {
        throw new Error('Dictionary not found');
      });

      const result = await checker.checkDictionary('mecab');
      expect(result).toBe(false);
    });
  });

  describe('getVersion', () => {
    it('should return version string', async () => {
      checker.setExecSync(() => 'mecab of 0.996');

      const version = await checker.getVersion('mecab');
      expect(version).toBe('mecab of 0.996');
    });

    it('should return null when mecab not found', async () => {
      checker.setExecSync(() => {
        throw new Error('Not found');
      });

      const version = await checker.getVersion('mecab');
      expect(version).toBeNull();
    });
  });

  describe('checkEnvironment', () => {
    it('should return available status when everything is ok', async () => {
      checker.setExecSync((cmd: string) => {
        if (cmd.includes('--version')) {
          return 'mecab of 0.996';
        }
        if (cmd.includes('-D')) {
          return '/usr/local/lib/mecab/dic/ipadic';
        }
        return '';
      });

      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(true);
      expect(status.mecabFound).toBe(true);
      expect(status.dictionaryFound).toBe(true);
      expect(status.version).toBe('mecab of 0.996');
      expect(status.error).toBeUndefined();
    });

    it('should return unavailable status when mecab not found', async () => {
      checker.setExecSync(() => {
        throw new Error('Command not found');
      });

      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(false);
      expect(status.mecabFound).toBe(false);
      expect(status.error).toBeDefined();
    });

    it('should return unavailable status when dictionary not found', async () => {
      let callCount = 0;
      checker.setExecSync((cmd: string) => {
        callCount++;
        if (cmd.includes('--version')) {
          return 'mecab of 0.996';
        }
        throw new Error('Dictionary not found');
      });

      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(false);
      expect(status.mecabFound).toBe(true);
      expect(status.dictionaryFound).toBe(false);
    });
  });

  describe('getInstallationMessage', () => {
    it('should return installation message for mecab not found', () => {
      const status: MeCabEnvironmentStatus = {
        available: false,
        mecabFound: false,
        dictionaryFound: false
      };

      const message = checker.getInstallationMessage(status);

      expect(message).toContain('MeCab');
      expect(message).toContain('インストール');
    });

    it('should return dictionary message when only dictionary is missing', () => {
      const status: MeCabEnvironmentStatus = {
        available: false,
        mecabFound: true,
        dictionaryFound: false
      };

      const message = checker.getInstallationMessage(status);

      expect(message).toContain('辞書');
    });

    it('should return success message when available', () => {
      const status: MeCabEnvironmentStatus = {
        available: true,
        mecabFound: true,
        dictionaryFound: true,
        version: 'mecab of 0.996'
      };

      const message = checker.getInstallationMessage(status);

      expect(message).toContain('利用可能');
    });
  });

  describe('validatePath', () => {
    it('should validate existing path', async () => {
      checker.setExecSync(() => 'mecab of 0.996');

      const isValid = await checker.validatePath('/usr/local/bin/mecab');
      expect(isValid).toBe(true);
    });

    it('should reject invalid path', async () => {
      checker.setExecSync(() => {
        throw new Error('Not found');
      });

      const isValid = await checker.validatePath('/nonexistent/mecab');
      expect(isValid).toBe(false);
    });

    it('should reject empty path', async () => {
      const isValid = await checker.validatePath('');
      expect(isValid).toBe(false);
    });

    it('should reject path with suspicious characters', async () => {
      const isValid = await checker.validatePath('/path/with;command');
      expect(isValid).toBe(false);
    });
  });

  describe('getPlatformSpecificInstructions', () => {
    it('should return Windows instructions when platform is win32', () => {
      checker.setPlatform('win32');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('Windows');
    });

    it('should return macOS instructions when platform is darwin', () => {
      checker.setPlatform('darwin');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('brew');
    });

    it('should return Linux instructions when platform is linux', () => {
      checker.setPlatform('linux');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('apt');
    });
  });
});

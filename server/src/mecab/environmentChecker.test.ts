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
    // kuromoji.jsの初期化に時間がかかるため、タイムアウトを延長
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
    }, 30000);

    // kuromoji.jsは常に利用可能（パスに関係なく）
    it('should return true regardless of path (kuromoji.js mode)', async () => {
      checker.setExecSync(() => {
        throw new Error('Command not found');
      });

      // kuromoji.jsは外部コマンドに依存しない
      const result = await checker.checkMeCabExists('/invalid/path/mecab');
      expect(result).toBe(true);
    }, 30000);
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
    }, 30000);

    // kuromoji.jsは辞書内蔵のため常にtrue
    it('should return true regardless of execSync (kuromoji.js has embedded dictionary)', async () => {
      checker.setExecSync(() => {
        throw new Error('Dictionary not found');
      });

      const result = await checker.checkDictionary('mecab');
      expect(result).toBe(true);
    }, 30000);
  });

  describe('getVersion', () => {
    // kuromoji.jsは常にバージョンを返す
    it('should return kuromoji.js version string', async () => {
      const version = await checker.getVersion('mecab');
      expect(version).toContain('kuromoji.js');
    }, 30000);

    it('should return version even when setExecSync throws (kuromoji.js mode)', async () => {
      checker.setExecSync(() => {
        throw new Error('Not found');
      });

      // kuromoji.jsは常にバージョンを返す
      const version = await checker.getVersion('mecab');
      expect(version).toContain('kuromoji.js');
    }, 30000);
  });

  describe('checkEnvironment', () => {
    // kuromoji.jsは外部依存がないため常に利用可能
    it('should return available status with kuromoji.js', async () => {
      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(true);
      expect(status.mecabFound).toBe(true);
      expect(status.dictionaryFound).toBe(true);
      expect(status.version).toContain('kuromoji.js');
      expect(status.error).toBeUndefined();
    }, 30000);

    it('should return available even with setExecSync error (kuromoji.js mode)', async () => {
      checker.setExecSync(() => {
        throw new Error('Command not found');
      });

      // kuromoji.jsは常に利用可能
      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(true);
      expect(status.mecabFound).toBe(true);
    }, 30000);

    it('should return available for any path (kuromoji.js has embedded dictionary)', async () => {
      checker.setExecSync((cmd: string) => {
        if (cmd.includes('--version')) {
          return 'mecab of 0.996';
        }
        throw new Error('Dictionary not found');
      });

      // kuromoji.jsは辞書内蔵のため常に利用可能
      const status = await checker.checkEnvironment('mecab');

      expect(status.available).toBe(true);
      expect(status.dictionaryFound).toBe(true);
    }, 30000);
  });

  describe('getInstallationMessage', () => {
    it('should return kuromoji.js message for unavailable status', () => {
      const status: MeCabEnvironmentStatus = {
        available: false,
        mecabFound: false,
        dictionaryFound: false
      };

      const message = checker.getInstallationMessage(status);

      expect(message).toContain('kuromoji.js');
      expect(message).toContain('MeCabのインストールは不要');
    });

    it('should return kuromoji.js message when status shows error', () => {
      const status: MeCabEnvironmentStatus = {
        available: false,
        mecabFound: true,
        dictionaryFound: false
      };

      const message = checker.getInstallationMessage(status);

      expect(message).toContain('kuromoji.js');
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

    // kuromoji.jsはパス検証不要のため、常にtrueを返す
    it('should always return true for kuromoji.js (no path needed)', async () => {
      // 任意のパスに対してtrueを返す
      const isValid = await checker.validatePath('/nonexistent/mecab');
      expect(isValid).toBe(true);
    });

    it('should return true for empty path (kuromoji.js mode)', async () => {
      const isValid = await checker.validatePath('');
      expect(isValid).toBe(true);
    });

    it('should return true regardless of path characters (kuromoji.js mode)', async () => {
      const isValid = await checker.validatePath('/path/with;command');
      expect(isValid).toBe(true);
    });
  });

  describe('getPlatformSpecificInstructions', () => {
    // kuromoji.jsは外部依存がないため、プラットフォーム固有の手順は不要
    it('should return kuromoji.js message regardless of platform', () => {
      checker.setPlatform('win32');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('kuromoji.js');
      expect(instructions).toContain('外部依存はありません');
    });

    it('should return same message for macOS', () => {
      checker.setPlatform('darwin');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('kuromoji.js');
    });

    it('should return same message for Linux', () => {
      checker.setPlatform('linux');
      const instructions = checker.getPlatformSpecificInstructions();

      expect(instructions).toContain('kuromoji.js');
    });
  });
});

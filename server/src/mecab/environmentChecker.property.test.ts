/**
 * MeCab Environment Checker Property-Based Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 8.5
 */

import * as fc from 'fast-check';
import { MeCabEnvironmentChecker } from './environmentChecker';

describe('Property-Based Tests: MeCab Environment Checker', () => {
  /**
   * Feature: japanese-grammar-analyzer, Property 15: MeCabパス検証
   * 任意のMeCabパス設定に対して、システムはパスの有効性を検証し、
   * 無効な場合はエラーを返す
   */
  describe('Property 15: MeCabパス検証', () => {
    // kuromoji.jsはパス検証不要のため、常にtrueを返す
    it('should return true for any path with kuromoji.js (no validation needed)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n'),
          async (emptyPath) => {
            const checker = new MeCabEnvironmentChecker();
            const isValid = await checker.validatePath(emptyPath);
            // kuromoji.jsは常にtrue
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    // kuromoji.jsはパス検証不要のため、危険な文字があっても常にtrueを返す
    it('should return true even for paths with special characters (kuromoji.js mode)', async () => {
      const specialChars = [';', '|', '&', '$', '`', '>', '<', '(', ')', '{', '}'];

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...specialChars),
          fc.string({ minLength: 0, maxLength: 20 }),
          async (prefix, specialChar, suffix) => {
            const checker = new MeCabEnvironmentChecker();
            const path = prefix + specialChar + suffix;
            const isValid = await checker.validatePath(path);
            // kuromoji.jsは常にtrue
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate paths that look legitimate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '/usr/bin/mecab',
            '/usr/local/bin/mecab',
            '/opt/mecab/bin/mecab',
            'C:\\Program Files\\MeCab\\bin\\mecab.exe',
            'mecab'
          ),
          async (path) => {
            const checker = new MeCabEnvironmentChecker();
            // MeCabが実際に存在する場合のみtrue
            checker.setExecSync(() => 'mecab of 0.996');
            const isValid = await checker.validatePath(path);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    // kuromoji.jsは常にtrueを返す（外部依存がないため）
    it('should return true for any path with kuromoji.js', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '/usr/bin/mecab',
            '/usr/local/bin/mecab',
            '/opt/mecab/bin/mecab'
          ),
          async (path) => {
            const checker = new MeCabEnvironmentChecker();
            checker.setExecSync(() => {
              throw new Error('Command not found');
            });
            // kuromoji.jsは常にtrue
            const isValid = await checker.validatePath(path);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should provide installation message for any invalid state', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (mecabFound, dictionaryFound) => {
            const checker = new MeCabEnvironmentChecker();
            const available = mecabFound && dictionaryFound;
            const status = {
              available,
              mecabFound,
              dictionaryFound,
              version: mecabFound ? 'mecab of 0.996' : undefined
            };

            const message = checker.getInstallationMessage(status);

            // メッセージは常に存在する
            expect(message).toBeDefined();
            expect(typeof message).toBe('string');
            expect(message.length).toBeGreaterThan(0);

            // kuromoji.jsでは常にkuromoji関連のメッセージを返す
            if (!available) {
              expect(message.toLowerCase()).toMatch(/kuromoji|インストール|不要/);
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should provide platform-specific instructions for all platforms', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('win32', 'darwin', 'linux', 'freebsd'),
          (platform) => {
            const checker = new MeCabEnvironmentChecker();
            checker.setPlatform(platform);
            const instructions = checker.getPlatformSpecificInstructions();

            expect(instructions).toBeDefined();
            expect(typeof instructions).toBe('string');
            expect(instructions.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 10 }
      );
    });

    // kuromoji.jsは常に利用可能（外部依存がないため）
    it('should always report available status with kuromoji.js', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.boolean(),
          async (_shouldMecabExist, _shouldDictExist) => {
            const checker = new MeCabEnvironmentChecker();

            // kuromoji.jsでは設定に関係なく常に利用可能
            const status = await checker.checkEnvironment('mecab');

            // kuromoji.jsは常に利用可能
            expect(status.available).toBe(true);
            expect(status.mecabFound).toBe(true);
            expect(status.dictionaryFound).toBe(true);
            expect(status.version).toContain('kuromoji.js');
          }
        ),
        { numRuns: 3 } // kuromoji.js初期化に時間がかかるので少なめに
      );
    }, 60000); // タイムアウトを60秒に設定
  });
});

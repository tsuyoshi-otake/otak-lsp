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
    it('should reject empty paths', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', '   ', '\t', '\n'),
          async (emptyPath) => {
            const checker = new MeCabEnvironmentChecker();
            const isValid = await checker.validatePath(emptyPath);
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should reject paths with dangerous characters', async () => {
      const dangerousChars = [';', '|', '&', '$', '`', '>', '<', '(', ')', '{', '}'];

      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 20 }),
          fc.constantFrom(...dangerousChars),
          fc.string({ minLength: 0, maxLength: 20 }),
          async (prefix, dangerousChar, suffix) => {
            const checker = new MeCabEnvironmentChecker();
            const path = prefix + dangerousChar + suffix;
            const isValid = await checker.validatePath(path);
            expect(isValid).toBe(false);
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

    it('should return false for valid-looking paths when mecab not found', async () => {
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
            const isValid = await checker.validatePath(path);
            expect(isValid).toBe(false);
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

            // 利用不可能な場合はインストール手順を含む
            if (!available) {
              if (!mecabFound) {
                expect(message.toLowerCase()).toMatch(/mecab|インストール/);
              } else if (!dictionaryFound) {
                expect(message).toMatch(/辞書|dictionary/i);
              }
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

    it('should accurately report environment status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          fc.boolean(),
          async (shouldMecabExist, shouldDictExist) => {
            const checker = new MeCabEnvironmentChecker();

            checker.setExecSync((cmd: string) => {
              if (cmd.includes('--version')) {
                if (shouldMecabExist) {
                  return 'mecab of 0.996';
                }
                throw new Error('Command not found');
              }
              if (cmd.includes('-D')) {
                if (shouldDictExist) {
                  return '/path/to/dict';
                }
                throw new Error('Dictionary not found');
              }
              return '';
            });

            const status = await checker.checkEnvironment('mecab');

            // 状態が正しく報告されている
            expect(status.mecabFound).toBe(shouldMecabExist);

            // MeCabが見つかった場合のみ辞書チェックが実行される
            if (shouldMecabExist) {
              expect(status.dictionaryFound).toBe(shouldDictExist);
              expect(status.available).toBe(shouldMecabExist && shouldDictExist);
            } else {
              expect(status.available).toBe(false);
            }
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});

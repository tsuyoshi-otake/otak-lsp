/**
 * Language Server 命名規則テスト
 * Feature: package-name-refactoring
 *
 * プロパティ2: ログメッセージの命名統一
 * プロパティ5: 内部コードの命名統一
 * 検証対象: 要件 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Language Server 命名規則テスト', () => {
  let serverSource: string;

  beforeAll(() => {
    const serverPath = path.resolve(__dirname, 'main.ts');
    serverSource = fs.readFileSync(serverPath, 'utf-8');
  });

  describe('プロパティ2: ログメッセージの命名統一', () => {
    it('初期化ログメッセージには「otak-lcp」が使用されている', () => {
      expect(serverSource).toMatch(/console\.log\s*\([^)]*otak-lcp[^)]*\)/);
    });

    it('Language Server識別子には「otak-lcp」が使用されている', () => {
      expect(serverSource).toMatch(/otak-lcp Language Server/);
    });
  });

  describe('プロパティ5: 内部コードの命名統一', () => {
    it('設定読み込みは「otakLcp」を使用する', () => {
      expect(serverSource).toMatch(/settings\?\.otakLcp/);
    });

    it('診断情報のソースは「otak-lcp」を使用する', () => {
      expect(serverSource).toMatch(/source:\s*['"]otak-lcp['"]/);
    });
  });

  describe('プロパティ: 古い命名規則の排除', () => {
    it('japaneseGrammarAnalyzerパターンはコードに存在しない', () => {
      fc.assert(
        fc.property(fc.constant(serverSource), (source) => {
          const lines = source.split('\n');
          return lines.every((line) => {
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
              return true;
            }
            return !line.includes("'japaneseGrammarAnalyzer") &&
                   !line.includes('"japaneseGrammarAnalyzer') &&
                   !line.includes('?.japaneseGrammarAnalyzer');
          });
        }),
        { numRuns: 30 }
      );
    });
  });
});

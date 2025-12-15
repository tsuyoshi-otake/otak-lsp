/**
 * Language Server 命名規則テスト
 * Feature: package-name-refactoring
 *
 * プロパティ2: ログメッセージの命名統一
 * プロパティ5: 内部コードの命名統一
 * 検証対象: 要件 4.1, 4.2, 4.3, 4.4, 4.5
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Language Server 命名規則テスト', () => {
  let serverSource: string;

  beforeAll(() => {
    const serverPath = path.resolve(__dirname, 'main.ts');
    serverSource = fs.readFileSync(serverPath, 'utf-8');
  });

  describe('プロパティ2: ログメッセージの命名統一', () => {
    it('初期化ログメッセージには「otak-lsp」が使用されている', () => {
      expect(serverSource).toMatch(/console\.log\s*\([^)]*otak-lsp[^)]*\)/);
    });

    it('Language Server識別子には「otak-lsp」が使用されている', () => {
      expect(serverSource).toMatch(/otak-lsp Language Server/);
    });
  });

  describe('プロパティ5: 内部コードの命名統一', () => {
    it('設定読み込みは「otakLsp」を使用する', () => {
      expect(serverSource).toMatch(/settings\?\.otakLsp/);
    });

    it('診断情報のソースは「otak-lsp」を使用する', () => {
      expect(serverSource).toMatch(/source:\s*['"]otak-lsp['"]/);
    });
  });

  describe('プロパティ: 古い命名規則の排除', () => {
    it('japaneseGrammarAnalyzerパターンはコードに存在しない', () => {
      const lines = serverSource.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }
        expect(line).not.toContain("'japaneseGrammarAnalyzer");
        expect(line).not.toContain('"japaneseGrammarAnalyzer');
        expect(line).not.toContain('?.japaneseGrammarAnalyzer');
      }
    });
  });
});

/**
 * Extension Client 命名規則テスト
 * Feature: package-name-refactoring
 *
 * プロパティ2: ログメッセージの命名統一
 * プロパティ3: コマンド識別子の形式統一
 * 検証対象: 要件 1.5, 2.1, 2.2, 4.2, 4.3
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Extension Client 命名規則テスト', () => {
  let extensionSource: string;

  beforeAll(() => {
    const extensionPath = path.resolve(__dirname, 'extension.ts');
    extensionSource = fs.readFileSync(extensionPath, 'utf-8');
  });

  describe('プロパティ2: ログメッセージの命名統一', () => {
    it('Output Channel名は「otak-lcp」である', () => {
      // createOutputChannel('otak-lcp') の呼び出しを検証
      expect(extensionSource).toMatch(/createOutputChannel\s*\(\s*['"]otak-lcp['"]\s*\)/);
    });

    it('ログメッセージには「otak-lcp」が使用されている', () => {
      // appendLineに "otak-lcp" が含まれる
      expect(extensionSource).toMatch(/appendLine\s*\([^)]*otak-lcp/);
    });

    it('古いログ識別子「Japanese Grammar Analyzer」は使用されていない', () => {
      // 古い識別子を使用している箇所がないことを確認
      // ただし、コメントや表示名は許容
      const logStatements = extensionSource.match(/appendLine\s*\([^)]+\)/g) || [];
      for (const stmt of logStatements) {
        // 純粋なログメッセージでは古い識別子を使用しない
        if (stmt.includes("'Japanese Grammar Analyzer is")) {
          fail('古いログ識別子が使用されています: ' + stmt);
        }
      }
    });
  });

  describe('プロパティ3: コマンド識別子の形式統一', () => {
    it('コマンド登録は「otakLcp.」形式を使用する', () => {
      // registerCommand('otakLcp.xxx') の呼び出しを検証
      const commandRegistrations = extensionSource.match(/registerCommand\s*\(\s*['"][^'"]+['"]/g) || [];
      expect(commandRegistrations.length).toBeGreaterThan(0);

      for (const reg of commandRegistrations) {
        expect(reg).toMatch(/['"]otakLcp\./);
      }
    });

    it('ステータスバーのコマンドは「otakLcp.」形式である', () => {
      // statusBarItem.command = 'otakLcp.xxx' を検証
      expect(extensionSource).toMatch(/statusBarItem\.command\s*=\s*['"]otakLcp\./);
    });

    it('設定読み込みは「otakLcp」セクションを使用する', () => {
      // getConfiguration('otakLcp') を検証
      expect(extensionSource).toMatch(/getConfiguration\s*\(\s*['"]otakLcp['"]\s*\)/);
    });

    it('Language Client識別子は「otakLcp」である', () => {
      // new LanguageClient('otakLcp', ...) を検証
      expect(extensionSource).toMatch(/new\s+LanguageClient\s*\(\s*['"]otakLcp['"]/);
    });
  });

  describe('プロパティ5: 内部コードの命名統一', () => {
    it('configurationSectionは「otakLcp」である', () => {
      expect(extensionSource).toMatch(/configurationSection:\s*['"]otakLcp['"]/);
    });

    it('ステータスバーテキストには「otak-lcp」が使用されている', () => {
      // ステータスバーのテキストとして otak-lcp を使用
      expect(extensionSource).toMatch(/statusBarItem\.text\s*=\s*[^;]*otak-lcp/);
    });
  });

  describe('プロパティ: 古い命名規則の排除', () => {
    it('japaneseGrammarAnalyzerパターンはコードに存在しない', () => {
      fc.assert(
        fc.property(fc.constant(extensionSource), (source) => {
          // コメント以外でjapaneseGrammarAnalyzerを使用していないことを確認
          const lines = source.split('\n');
          return lines.every((line) => {
            // コメント行は許容
            if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
              return true;
            }
            // 文字列リテラルや識別子でjapaneseGrammarAnalyzerを使用していない
            return !line.includes("'japaneseGrammarAnalyzer") &&
                   !line.includes('"japaneseGrammarAnalyzer');
          });
        }),
        { numRuns: 30 }
      );
    });
  });
});

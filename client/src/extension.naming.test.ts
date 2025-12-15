/**
 * Extension Client 命名規則テスト
 * Feature: package-name-refactoring
 *
 * プロパティ2: ログメッセージの命名統一
 * プロパティ3: コマンド識別子の形式統一
 * 検証対象: 要件 1.5, 2.1, 2.2, 4.2, 4.3
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Extension Client 命名規則テスト', () => {
  let extensionSource: string;

  beforeAll(() => {
    const extensionPath = path.resolve(__dirname, 'extension.ts');
    extensionSource = fs.readFileSync(extensionPath, 'utf-8');
  });

  describe('プロパティ2: ログメッセージの命名統一', () => {
    it('Output Channel名は「otak-lsp」である', () => {
      // createOutputChannel('otak-lsp') の呼び出しを検証
      expect(extensionSource).toMatch(/createOutputChannel\s*\(\s*['"]otak-lsp['"]\s*\)/);
    });

    it('ログメッセージには「otak-lsp」が使用されている', () => {
      // appendLineに "otak-lsp" が含まれる
      expect(extensionSource).toMatch(/appendLine\s*\([^)]*otak-lsp/);
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
    it('コマンド登録は「otakLsp.」形式を使用する', () => {
      // registerCommand('otakLsp.xxx') の呼び出しを検証
      const commandRegistrations = extensionSource.match(/registerCommand\s*\(\s*['"][^'"]+['"]/g) || [];
      expect(commandRegistrations.length).toBeGreaterThan(0);

      for (const reg of commandRegistrations) {
        expect(reg).toMatch(/['"]otakLsp\./);
      }
    });

    it('ステータスバーのコマンドは「otakLsp.」形式である', () => {
      // statusBarItem.command = 'otakLsp.xxx' を検証
      expect(extensionSource).toMatch(/statusBarItem\.command\s*=\s*['"]otakLsp\./);
    });

    it('設定読み込みは「otakLsp」セクションを使用する', () => {
      // getConfiguration('otakLsp') を検証
      expect(extensionSource).toMatch(/getConfiguration\s*\(\s*['"]otakLsp['"]\s*\)/);
    });

    it('Language Client識別子は「otakLsp」である', () => {
      // new LanguageClient('otakLsp', ...) を検証
      expect(extensionSource).toMatch(/new\s+LanguageClient\s*\(\s*['"]otakLsp['"]/);
    });
  });

  describe('プロパティ5: 内部コードの命名統一', () => {
    it('configurationSectionは「otakLsp」である', () => {
      expect(extensionSource).toMatch(/configurationSection:\s*\[\s*['"]otakLsp['"]\s*,\s*['"]otakLsp\.advanced['"]\s*\]/);
    });

    it('ステータスバーテキストには「otak-lsp」が使用されている', () => {
      // ステータスバーのテキストとして otak-lsp を使用
      expect(extensionSource).toMatch(/statusBarItem\.text\s*=\s*[^;]*otak-lsp/);
    });
  });

  describe('プロパティ: 古い命名規則の排除', () => {
    it('japaneseGrammarAnalyzerパターンはコードに存在しない', () => {
      // コメント以外でjapaneseGrammarAnalyzerを使用していないことを確認
      const lines = extensionSource.split('\n');
      for (const line of lines) {
        // コメント行は許容
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }
        // 文字列リテラルや識別子でjapaneseGrammarAnalyzerを使用していない
        expect(line).not.toContain("'japaneseGrammarAnalyzer");
        expect(line).not.toContain('"japaneseGrammarAnalyzer');
      }
    });
  });
});

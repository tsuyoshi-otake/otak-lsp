/**
 * Language Server 命名規則テスト
 * Feature: package-name-refactoring
 * Feature: main-ts-refactoring
 *
 * プロパティ2: ログメッセージの命名統一
 * プロパティ5: 内部コードの命名統一
 * 検証対象: 要件 4.1, 4.2, 4.3, 4.4, 4.5
 *
 * Note: main-ts-refactoringにより、一部のコードはserver/モジュールに分離されました
 */

import * as fs from 'fs';
import * as path from 'path';

describe('Language Server 命名規則テスト', () => {
  let mainSource: string;
  let connectionSource: string;
  let documentAnalyzerSource: string;

  beforeAll(() => {
    const mainPath = path.resolve(__dirname, 'main.ts');
    mainSource = fs.readFileSync(mainPath, 'utf-8');

    const connectionPath = path.resolve(__dirname, 'server', 'connection.ts');
    connectionSource = fs.readFileSync(connectionPath, 'utf-8');

    const documentAnalyzerPath = path.resolve(__dirname, 'server', 'documentAnalyzer.ts');
    documentAnalyzerSource = fs.readFileSync(documentAnalyzerPath, 'utf-8');
  });

  describe('プロパティ2: ログメッセージの命名統一', () => {
    it('初期化ログメッセージには「otak-lsp」が使用されている', () => {
      // main.ts or connection.ts で logger 経由で otak-lsp メッセージを出力している
      const hasInMain = /otak-lsp/.test(mainSource);
      const hasInConnection = /otak-lsp/.test(connectionSource);
      expect(hasInMain || hasInConnection).toBe(true);
    });

    it('Language Server識別子には「otak-lsp」が使用されている', () => {
      // main.ts or connection.ts should have the identifier
      const hasInMain = /otak-lsp Language Server/.test(mainSource);
      const hasInConnection = /otak-lsp Language Server/.test(connectionSource);
      expect(hasInMain || hasInConnection).toBe(true);
    });
  });

  describe('プロパティ5: 内部コードの命名統一', () => {
    it('設定読み込みは「otakLsp」を使用する', () => {
      // connection.ts should have the settings pattern
      expect(connectionSource).toMatch(/otakLsp/);
    });

    it('診断情報のソースは「otak-lsp」を使用する', () => {
      // documentAnalyzer.ts で toLspDiagnostics に 'otak-lsp' を渡している
      expect(documentAnalyzerSource).toMatch(/['"]otak-lsp['"]/);
    });
  });

  describe('プロパティ: 古い命名規則の排除', () => {
    it('japaneseGrammarAnalyzerパターンはコードに存在しない', () => {
      const allSources = [mainSource, connectionSource, documentAnalyzerSource];
      for (const source of allSources) {
        const lines = source.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }
          expect(line).not.toContain("'japaneseGrammarAnalyzer");
          expect(line).not.toContain('"japaneseGrammarAnalyzer');
          expect(line).not.toContain('?.japaneseGrammarAnalyzer');
        }
      }
    });
  });
});

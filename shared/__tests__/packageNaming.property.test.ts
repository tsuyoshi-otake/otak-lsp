/**
 * パッケージ名リファクタリング - プロパティテスト
 * Feature: package-name-refactoring
 *
 * プロパティ1: パッケージ表示名の一貫性
 * 検証対象: 要件 1.1, 1.2, 1.4
 */

import * as fs from 'fs';
import * as path from 'path';

describe('パッケージ名リファクタリング - プロパティテスト', () => {
  let packageJson: {
    name: string;
    displayName: string;
    contributes: {
      commands: Array<{ command: string; title: string }>;
      configuration: {
        title: string;
        properties: Record<string, unknown>;
      };
    };
  };

  beforeAll(() => {
    const packagePath = path.resolve(__dirname, '../..', 'package.json');
    packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
  });

  describe('プロパティ1: パッケージ表示名の一貫性', () => {
    it('パッケージ名は「otak-lsp」である', () => {
      expect(packageJson.name).toBe('otak-lsp');
    });

    it('表示名は「otak-lsp - Japanese Grammar Analyzer」形式である', () => {
      expect(packageJson.displayName).toBe('otak-lsp - Japanese Grammar Analyzer');
    });

    it('表示名は「otak-lsp」で始まる', () => {
      expect(packageJson.displayName.startsWith('otak-lsp')).toBe(true);
    });
  });

  describe('プロパティ3: コマンド識別子の形式統一', () => {
    it('すべてのコマンド識別子は「otakLsp.」で始まる', () => {
      const commands = packageJson.contributes.commands;
      for (const cmd of commands) {
        expect(cmd.command).toMatch(/^otakLsp\./);
      }
    });

    it('すべてのコマンドタイトルは「otak-lsp:」で始まる', () => {
      const commands = packageJson.contributes.commands;
      for (const cmd of commands) {
        expect(cmd.title).toMatch(/^otak-lsp:/);
      }
    });

    it('コマンド識別子はcamelCase形式である', () => {
      const commands = packageJson.contributes.commands;
      for (const cmd of commands) {
        const suffix = cmd.command.replace('otakLsp.', '');
        // camelCaseパターン: 小文字で始まり、アンダースコアやハイフンを含まない
        expect(suffix).toMatch(/^[a-z][a-zA-Z]*$/);
      }
    });
  });

  describe('プロパティ4: 設定キーの形式統一', () => {
    it('設定カテゴリは「otak-lsp」である', () => {
      expect(packageJson.contributes.configuration.title).toBe('otak-lsp');
    });

    it('すべての設定キーは「otakLsp.」で始まる', () => {
      const properties = packageJson.contributes.configuration.properties;
      for (const key of Object.keys(properties)) {
        expect(key).toMatch(/^otakLsp\./);
      }
    });

    it('設定キーはドット区切りのcamelCase形式である', () => {
      const keys = Object.keys(packageJson.contributes.configuration.properties);
      for (const key of keys) {
        // otakLsp.xxx または otakLsp.category.xxx 形式
        expect(key).toMatch(/^otakLsp(\.[a-z][a-zA-Z]*)+$/);
      }
    });
  });

  describe('プロパティ: コマンドと設定の命名一貫性', () => {
    it('古い命名規則（japaneseGrammarAnalyzer）は使用されていない', () => {
      const commands = packageJson.contributes.commands;
      const properties = Object.keys(packageJson.contributes.configuration.properties);

      for (const cmd of commands) {
        expect(cmd.command).not.toMatch(/japaneseGrammarAnalyzer/);
        expect(cmd.title).not.toMatch(/Japanese Grammar Analyzer:/);
      }

      for (const key of properties) {
        expect(key).not.toMatch(/japaneseGrammarAnalyzer/);
      }
    });
  });
});

/**
 * Katakana Chouon Rule Test
 * カタカナ長音チェッカーのテスト
 * Feature: remaining-grammar-rules
 * Task: 17.1 - 17.4
 */

import { KatakanaChouonRule } from './katakanaChouonRule';
import { Token } from '../../../../shared/src/types';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('KatakanaChouonRule', () => {
  let rule: KatakanaChouonRule;

  beforeEach(() => {
    rule = new KatakanaChouonRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('katakana-chouon');
      expect(rule.description).toContain('長音');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of chouon errors', () => {
    // **Property 43: Katakana chouon error detection**
    // Test: Task 17.2

    it('should detect "メイル" and suggest "メール"', () => {
      const text = 'メイルを送る';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('メール'))).toBe(true);
    });

    it('should detect "サーバ" and suggest "サーバー"', () => {
      const text = 'サーバを設定する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('サーバー'))).toBe(true);
    });

    it('should detect "コンピュータ" and suggest "コンピューター"', () => {
      const text = 'コンピュータを使用する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.message.includes('コンピューター'))).toBe(true);
    });
  });

  describe('Standard chouon non-detection', () => {
    // **Property 44: Standard katakana chouon non-detection**
    // Test: Task 17.3

    it('should not flag standard "メール"', () => {
      const text = 'メールを送る';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForMail = diagnostics.filter(d =>
        d.message.includes('メール') && d.code === 'katakana-chouon'
      );
      expect(errorForMail.length).toBe(0);
    });

    it('should not flag standard "サーバー"', () => {
      const text = 'サーバーを設定する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForServer = diagnostics.filter(d =>
        d.message.includes('サーバー') && d.code === 'katakana-chouon'
      );
      expect(errorForServer.length).toBe(0);
    });

    it('should not flag standard "コンピューター"', () => {
      const text = 'コンピューターを使用する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      const errorForComputer = diagnostics.filter(d =>
        d.message.includes('コンピューター') && d.code === 'katakana-chouon'
      );
      expect(errorForComputer.length).toBe(0);
    });
  });

  describe('Chouon error suggestions', () => {
    // **Property 45: Katakana chouon error suggestion**
    // Test: Task 17.4

    it('should provide correct suggestions', () => {
      const text = 'メイルを送る';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions).toBeDefined();
      expect(diagnostics[0].suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('Common loanword patterns', () => {
    it('should detect "ユーザ" and suggest "ユーザー"', () => {
      const text = 'ユーザを追加する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect "ブラウザ" and suggest "ブラウザー"', () => {
      const text = 'ブラウザを開く';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect "フォルダ" and suggest "フォルダー"', () => {
      const text = 'フォルダを作成する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without katakana', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text with correct katakana', () => {
      const text = 'インフラをスケールする';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });
  });
});

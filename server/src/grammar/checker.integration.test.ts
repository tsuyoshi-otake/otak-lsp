/**
 * Grammar Checkerの統合テスト
 * Feature: advanced-grammar-rules
 * 要件: 12.5 - 基本ルールと高度なルールの統合検証
 *
 * このテストファイルは以下を検証する:
 * - 基本ルールと高度なルールが両方実行されること
 * - 診断情報のマージが正しく動作すること
 * - 設定による制御が正しく機能すること
 */

import { GrammarChecker } from './checker';
import { AdvancedRulesManager } from './advancedRulesManager';
import { Token, Diagnostic } from '../../../shared/src/types';
import {
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  Sentence
} from '../../../shared/src/advancedTypes';

/**
 * ヘルパー関数: トークンを作成
 */
const createToken = (
  surface: string,
  pos: string,
  start: number,
  posDetail1: string = '*',
  baseForm?: string
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1,
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm: baseForm || surface,
    reading: surface,
    pronunciation: surface,
    start,
    end: start + surface.length
  });
};

/**
 * 統合チェッカー - 基本ルールと高度なルールを組み合わせる
 */
class IntegratedGrammarChecker {
  private basicChecker: GrammarChecker;
  private advancedManager: AdvancedRulesManager;

  constructor(config?: Partial<AdvancedRulesConfig>) {
    this.basicChecker = new GrammarChecker();
    this.advancedManager = new AdvancedRulesManager(config);
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<AdvancedRulesConfig>): void {
    this.advancedManager.updateConfig(config);
  }

  /**
   * テキストとトークンをチェック
   * 基本ルールと高度なルールの診断情報をマージする
   */
  check(tokens: Token[], text: string): Diagnostic[] {
    // 基本ルールの診断
    const basicDiagnostics = this.basicChecker.check(tokens, text);

    // 高度なルールの診断
    const advancedDiagnostics = this.advancedManager.checkText(text, tokens);

    // 診断情報をマージ
    return [...basicDiagnostics, ...advancedDiagnostics];
  }
}

describe('Grammar Checker Integration Tests', () => {
  describe('Basic and Advanced Rules Execution', () => {
    it('should execute both basic and advanced rules', () => {
      const checker = new IntegratedGrammarChecker();
      const text = '私がが行きます。Javascriptを使用します。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('行き', '動詞', 3, '*', '行く'),
        createToken('ます', '助動詞', 5),
        createToken('。', '記号', 7)
      ];

      const diagnostics = checker.check(tokens, text);

      // 基本ルール: 二重助詞「がが」を検出
      const basicErrors = diagnostics.filter(d => d.code === 'double-particle');
      expect(basicErrors.length).toBeGreaterThan(0);

      // 高度なルール: 技術用語「Javascript」を検出
      const advancedErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(advancedErrors.length).toBeGreaterThan(0);
    });

    it('should detect style consistency issues along with basic errors', () => {
      const checker = new IntegratedGrammarChecker();
      const text = '私がが行きます。これは正しいである。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('行き', '動詞', 3, '*', '行く'),
        createToken('ます', '助動詞', 5),
        createToken('。', '記号', 7)
      ];

      const diagnostics = checker.check(tokens, text);

      // 基本ルール: 二重助詞
      const doubleParticle = diagnostics.filter(d => d.code === 'double-particle');
      expect(doubleParticle.length).toBeGreaterThan(0);

      // 高度なルール: 文体混在
      const styleInconsistency = diagnostics.filter(d => d.code === 'style-inconsistency');
      expect(styleInconsistency.length).toBeGreaterThan(0);
    });

    it('should detect multiple advanced rule violations in one text', () => {
      const checker = new IntegratedGrammarChecker();
      const text = 'Javascriptを使って下さい。awsはＡＢＣとabcの混在です。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      // 技術用語: Javascript, aws
      const termErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(termErrors.length).toBeGreaterThanOrEqual(2);

      // 漢字開き: 下さい
      const kanjiErrors = diagnostics.filter(d => d.code === 'kanji-opening');
      expect(kanjiErrors.length).toBeGreaterThan(0);

      // 全角半角混在
      const widthErrors = diagnostics.filter(d => d.code === 'alphabet-width');
      expect(widthErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Diagnostic Merging', () => {
    it('should merge diagnostics from different sources correctly', () => {
      const checker = new IntegratedGrammarChecker();
      const text = '私がが行きます。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('行き', '動詞', 3, '*', '行く'),
        createToken('ます', '助動詞', 5),
        createToken('。', '記号', 7)
      ];

      const diagnostics = checker.check(tokens, text);

      // すべての診断情報が含まれていることを確認
      expect(diagnostics.length).toBeGreaterThan(0);

      // 各診断にsourceが設定されていることを確認
      diagnostics.forEach(d => {
        expect(d.source).toBeDefined();
        expect(['japanese-grammar-analyzer', 'japanese-grammar-advanced']).toContain(d.source);
      });
    });

    it('should preserve all diagnostic properties after merging', () => {
      const checker = new IntegratedGrammarChecker();
      const text = 'Javascriptを使用します。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      diagnostics.forEach(d => {
        expect(d.range).toBeDefined();
        expect(d.range.start).toBeDefined();
        expect(d.range.end).toBeDefined();
        expect(d.message).toBeDefined();
        expect(d.message.length).toBeGreaterThan(0);
        expect(d.severity).toBeDefined();
        expect(d.code).toBeDefined();
      });
    });

    it('should not have duplicate diagnostics for the same issue', () => {
      const checker = new IntegratedGrammarChecker();
      const text = 'Javascriptを使用します。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      // 同じ位置で同じコードの診断がないことを確認
      const uniqueSet = new Set<string>();
      diagnostics.forEach(d => {
        const key = `${d.range.start.line}:${d.range.start.character}:${d.code}`;
        expect(uniqueSet.has(key)).toBe(false);
        uniqueSet.add(key);
      });
    });
  });

  describe('Settings Control', () => {
    it('should disable advanced rules when corresponding setting is false', () => {
      const checker = new IntegratedGrammarChecker({
        enableTermNotation: false
      });
      const text = 'Javascriptを使用します。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      // 技術用語ルールが無効化されているため検出されない
      const termErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(termErrors).toHaveLength(0);
    });

    it('should disable kanji opening rule when setting is false', () => {
      const checker = new IntegratedGrammarChecker({
        enableKanjiOpening: false
      });
      const text = '確認して下さい。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      const kanjiErrors = diagnostics.filter(d => d.code === 'kanji-opening');
      expect(kanjiErrors).toHaveLength(0);
    });

    it('should enable particle repetition rule when setting is true', () => {
      const checker = new IntegratedGrammarChecker({
        enableParticleRepetition: true
      });

      // 同じ助詞「は」が繰り返されるテキスト
      const text = '私は本を彼は読む。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('本', '名詞', 2),
        createToken('を', '助詞', 3),
        createToken('彼', '名詞', 4),
        createToken('は', '助詞', 5),
        createToken('読む', '動詞', 6)
      ];

      const diagnostics = checker.check(tokens, text);

      const repetitionErrors = diagnostics.filter(d => d.code === 'particle-repetition');
      expect(repetitionErrors.length).toBeGreaterThan(0);
    });

    it('should not detect particle repetition when setting is false (default)', () => {
      const checker = new IntegratedGrammarChecker(); // デフォルトではfalse

      const text = '私は本を彼は読む。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('本', '名詞', 2),
        createToken('を', '助詞', 3),
        createToken('彼', '名詞', 4),
        createToken('は', '助詞', 5),
        createToken('読む', '動詞', 6)
      ];

      const diagnostics = checker.check(tokens, text);

      const repetitionErrors = diagnostics.filter(d => d.code === 'particle-repetition');
      expect(repetitionErrors).toHaveLength(0);
    });

    it('should apply configuration update immediately', () => {
      const checker = new IntegratedGrammarChecker();
      const text = 'Javascriptを使用します。';
      const tokens: Token[] = [];

      // 最初は有効
      let diagnostics = checker.check(tokens, text);
      let termErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(termErrors.length).toBeGreaterThan(0);

      // 設定を更新して無効化
      checker.updateConfig({ enableTermNotation: false });
      diagnostics = checker.check(tokens, text);
      termErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(termErrors).toHaveLength(0);

      // 設定を更新して再度有効化
      checker.updateConfig({ enableTermNotation: true });
      diagnostics = checker.check(tokens, text);
      termErrors = diagnostics.filter(d => d.code === 'term-notation');
      expect(termErrors.length).toBeGreaterThan(0);
    });

    it('should respect tech dictionary settings', () => {
      // AWS辞書を無効化
      const checker = new IntegratedGrammarChecker({
        enableAWSDictionary: false,
        enableGenerativeAIDictionary: true
      });
      const text = 'awsとchatgptを使用します。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);
      const termErrors = diagnostics.filter(d => d.code === 'term-notation');

      // chatgptは検出されるが、awsは検出されない
      const chatgptError = termErrors.find(e => e.message.includes('chatgpt') || e.message.includes('ChatGPT'));
      const awsError = termErrors.find(e => e.message.includes('aws') || e.message.includes('AWS'));

      expect(chatgptError).toBeDefined();
      expect(awsError).toBeUndefined();
    });

    it('should use custom comma count threshold', () => {
      // 閾値を2に設定
      const checker = new IntegratedGrammarChecker({
        commaCountThreshold: 2
      });
      const text = '私は、今日、明日、行きます。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);
      const commaErrors = diagnostics.filter(d => d.code === 'comma-count');

      // 読点が3つで閾値2を超えるため検出される
      expect(commaErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty text', () => {
      const checker = new IntegratedGrammarChecker();
      const diagnostics = checker.check([], '');

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle text with no errors', () => {
      const checker = new IntegratedGrammarChecker();
      const text = '私は学校に行きます。';
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1, '係助詞'),
        createToken('学校', '名詞', 2),
        createToken('に', '助詞', 4, '格助詞'),
        createToken('行き', '動詞', 5, '*', '行く'),
        createToken('ます', '助動詞', 7),
        createToken('。', '記号', 9)
      ];

      const diagnostics = checker.check(tokens, text);

      // 文体混在以外のエラーがないことを確認
      const nonStyleErrors = diagnostics.filter(d => d.code !== 'style-inconsistency');
      expect(nonStyleErrors).toHaveLength(0);
    });

    it('should handle text with only advanced rule errors', () => {
      const checker = new IntegratedGrammarChecker();
      const text = 'JavaScriptは良いです。Javascriptも良いです。';
      const tokens: Token[] = [];

      const diagnostics = checker.check(tokens, text);

      // 高度なルールのエラーのみ
      const advancedErrors = diagnostics.filter(d => d.source === 'japanese-grammar-advanced');
      expect(advancedErrors.length).toBeGreaterThan(0);

      // 基本ルールのエラーはない（トークンが空なので）
      const basicErrors = diagnostics.filter(d => d.source === 'japanese-grammar-analyzer');
      expect(basicErrors).toHaveLength(0);
    });
  });
});

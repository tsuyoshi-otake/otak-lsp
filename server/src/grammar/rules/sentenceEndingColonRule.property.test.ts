/**
 * Sentence Ending Colon Ruleのプロパティベーステスト
 * Feature: sentence-ending-colon-detection
 * 要件: 5.2
 */

import * as fc from 'fast-check';
import { SentenceEndingColonRule } from './sentenceEndingColonRule';
import { Token } from '../../../../shared/src/types';
import {
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  Sentence,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: SentenceEndingColonRule', () => {
  const rule = new SentenceEndingColonRule();

  const createToken = (surface: string, pos: string, start: number): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  const createSentence = (text: string, start: number): Sentence => {
    return new Sentence({
      text,
      tokens: [createToken(text, '名詞', start)],
      start,
      end: start + text.length
    });
  };

  const createContext = (
    text: string,
    sentences?: Sentence[],
    config?: AdvancedRulesConfig
  ): RuleContext => ({
    documentText: text,
    sentences: sentences || [createSentence(text, 0)],
    config: config || DEFAULT_ADVANCED_RULES_CONFIG
  });

  // 日本語文字を生成するアービトラリ
  const japaneseChar = fc.constantFrom(
    'あ', 'い', 'う', 'え', 'お',
    'か', 'き', 'く', 'け', 'こ',
    'テ', 'ス', 'ト', '文', '字',
    '私', '今', '日', '行', '見'
  );

  const japaneseString = fc.array(japaneseChar, { minLength: 1, maxLength: 10 })
    .map(chars => chars.join(''));

  /**
   * プロパティ 1: 文末コロンの検出
   * 検証: 要件 1.1
   */
  describe('Property 1: 文末コロンの検出', () => {
    it('文末に全角コロンがある場合は必ず検出される', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          const textWithColon = text + '：';
          const context = createContext(textWithColon);
          const tokens = [createToken(textWithColon, '名詞', 0)];
          const diagnostics = rule.check(tokens, context);

          expect(diagnostics.length).toBeGreaterThan(0);
          expect(diagnostics[0].code).toBe('sentence-ending-colon');
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 2: 修正提案の提供
   * 検証: 要件 1.2, 3.2
   */
  describe('Property 2: 修正提案の提供', () => {
    it('すべての文末コロン検出に対して修正提案が含まれる', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          const textWithColon = text + '：';
          const context = createContext(textWithColon);
          const tokens = [createToken(textWithColon, '名詞', 0)];
          const diagnostics = rule.check(tokens, context);

          expect(diagnostics.length).toBeGreaterThan(0);
          expect(diagnostics[0].suggestions).toBeDefined();
          expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 3: 文中コロンの除外
   * 検証: 要件 1.3
   */
  describe('Property 3: 文中コロンの除外', () => {
    it('文中にコロンがあっても文末でなければ検出しない', () => {
      fc.assert(
        fc.property(
          japaneseString,
          japaneseString,
          (prefix, suffix) => {
            // 文中にコロンを入れて、句点で終わる
            const text = prefix + '：' + suffix + '。';
            const context = createContext(text);
            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 4: 箇条書き前置きの除外
   * 検証: 要件 1.4
   */
  describe('Property 4: 箇条書き前置きの除外', () => {
    it('箇条書きマーカーが続く場合は検出しない', () => {
      fc.assert(
        fc.property(
          japaneseString,
          fc.constantFrom('-', '*', '1.', '2.', '3.'),
          japaneseString,
          (prefix, marker, item) => {
            const sentenceText = prefix + '：';
            const fullText = sentenceText + '\n' + marker + ' ' + item;
            const sentence = createSentence(sentenceText, 0);
            const context = createContext(fullText, [sentence]);
            const tokens = [createToken(fullText, '名詞', 0)];
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 5: 半角コロンの除外
   * 検証: 要件 1.5
   */
  describe('Property 5: 半角コロンの除外', () => {
    it('半角コロンは検出しない', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          const textWithHalfColon = text + ':';
          const context = createContext(textWithHalfColon);
          const tokens = [createToken(textWithHalfColon, '名詞', 0)];
          const diagnostics = rule.check(tokens, context);

          expect(diagnostics).toHaveLength(0);
        }),
        { numRuns: 30 }
      );
    });

    it('半角コロンと全角コロンを区別する', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          // 半角コロンで終わる
          const textHalf = text + ':';
          const contextHalf = createContext(textHalf);
          const tokensHalf = [createToken(textHalf, '名詞', 0)];
          const diagnosticsHalf = rule.check(tokensHalf, contextHalf);

          // 全角コロンで終わる
          const textFull = text + '：';
          const contextFull = createContext(textFull);
          const tokensFull = [createToken(textFull, '名詞', 0)];
          const diagnosticsFull = rule.check(tokensFull, contextFull);

          expect(diagnosticsHalf).toHaveLength(0);
          expect(diagnosticsFull.length).toBeGreaterThan(0);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 6: 設定による制御
   * 検証: 要件 2.2
   */
  describe('Property 6: 設定による制御', () => {
    it('設定が無効の場合は検出しない', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          const textWithColon = text + '：';
          const disabledConfig: AdvancedRulesConfig = {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableSentenceEndingColon: false
          };

          // ルールが無効化されているか確認
          expect(rule.isEnabled(disabledConfig)).toBe(false);
        }),
        { numRuns: 30 }
      );
    });

    it('設定が有効の場合は検出する', () => {
      fc.assert(
        fc.property(japaneseString, (text) => {
          const textWithColon = text + '：';
          const enabledConfig: AdvancedRulesConfig = {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableSentenceEndingColon: true
          };

          expect(rule.isEnabled(enabledConfig)).toBe(true);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * エッジケーステスト
   */
  describe('Edge Cases', () => {
    it('空文字列でもエラーにならない', () => {
      const context = createContext('', [createSentence('', 0)]);
      const tokens: Token[] = [];

      expect(() => rule.check(tokens, context)).not.toThrow();
    });

    it('コロンのみでもエラーにならない', () => {
      const context = createContext('：');
      const tokens = [createToken('：', '記号', 0)];

      expect(() => rule.check(tokens, context)).not.toThrow();
    });

    it('非常に長い文でも正しく処理される', () => {
      fc.assert(
        fc.property(
          fc.array(japaneseChar, { minLength: 50, maxLength: 100 }),
          (chars) => {
            const text = chars.join('') + '：';
            const context = createContext(text);
            const tokens = [createToken(text, '名詞', 0)];
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

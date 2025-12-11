/**
 * Advanced Grammar Rulesのプロパティベーステスト
 * Feature: advanced-grammar-rules
 * プロパティ 5-13
 */

import * as fc from 'fast-check';
import { Token } from '../../../../shared/src/types';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';
import { ParticleRepetitionRule } from './particleRepetitionRule';
import { AlphabetWidthRule } from './alphabetWidthRule';
import { WeakExpressionRule } from './weakExpressionRule';
import { CommaCountRule } from './commaCountRule';
import { TermNotationRule } from './termNotationRule';
import { KanjiOpeningRule } from './kanjiOpeningRule';

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

const createContext = (text: string, sentences: Sentence[] = []): RuleContext => ({
  documentText: text,
  sentences,
  config: DEFAULT_ADVANCED_RULES_CONFIG
});

describe('Property-Based Tests: Advanced Grammar Rules', () => {
  /**
   * Feature: advanced-grammar-rules, Property 5: 助詞連続使用の設定依存検出
   */
  describe('Property 5: 助詞連続使用の設定依存検出', () => {
    const rule = new ParticleRepetitionRule();

    it('should be disabled by default', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('は', 'が', 'を', 'に', 'で'),
          (particle) => {
            const config = DEFAULT_ADVANCED_RULES_CONFIG;
            expect(rule.isEnabled(config)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should detect repetition when enabled', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('は', 'が', 'を', 'に', 'で'),
          (particle) => {
            const tokens = [
              createToken('私', '名詞', 0),
              createToken(particle, '助詞', 1),
              createToken('彼', '名詞', 2),
              createToken(particle, '助詞', 3)
            ];
            const sentence = new Sentence({
              text: `私${particle}彼${particle}`,
              tokens,
              start: 0,
              end: 4
            });
            const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableParticleRepetition: true };
            const context: RuleContext = {
              documentText: sentence.text,
              sentences: [sentence],
              config
            };
            const diagnostics = rule.check(tokens, context);

            expect(diagnostics.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 8: 全角半角混在の検出と提案
   */
  describe('Property 8: 全角半角混在の検出と提案', () => {
    const rule = new AlphabetWidthRule();

    it('should detect mixed width when both exist', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.constantFrom('ABC', 'XYZ', 'Test'),
            fc.constantFrom('ＡＢＣ', 'ＸＹＺ', 'Ｔｅｓｔ')
          ),
          ([half, full]) => {
            const text = `${half}と${full}`;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('alphabet-width');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect when only one width is used', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ABC', 'XYZ', 'Test', 'Hello'),
          (text) => {
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 9: 弱い表現の検出と強化提案
   */
  describe('Property 9: 弱い表現の検出と強化提案', () => {
    const rule = new WeakExpressionRule();

    it('should detect weak expressions and provide suggestions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { weak: 'かもしれない', stronger: '可能性がある' },
            { weak: 'と思われる', stronger: 'と考えられる' },
            { weak: 'ような気がする', stronger: 'と推測される' }
          ),
          ({ weak, stronger }) => {
            const text = `それは${weak}`;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('weak-expression');
            expect(diagnostics[0].suggestions.some(s => s.includes(stronger))).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 10: 読点数の閾値チェック
   */
  describe('Property 10: 読点数の閾値チェック', () => {
    const rule = new CommaCountRule();

    it('should detect when comma count exceeds threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 10 }),
          (commaCount) => {
            const text = 'これは' + '、テスト'.repeat(commaCount) + 'です。';
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence]);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('comma-count');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect when comma count is below threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          (commaCount) => {
            const parts = ['テスト'];
            for (let i = 0; i < commaCount; i++) {
              parts.push('、テスト');
            }
            const text = parts.join('') + 'です。';
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence]);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 11: 技術用語表記の統一
   */
  describe('Property 11: 技術用語表記の統一', () => {
    const rule = new TermNotationRule();

    it('should detect incorrect tech term notation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { incorrect: 'Javascript', correct: 'JavaScript' },
            { incorrect: 'Github', correct: 'GitHub' },
            { incorrect: 'Typescript', correct: 'TypeScript' },
            { incorrect: 'chatgpt', correct: 'ChatGPT' },
            { incorrect: 'aws', correct: 'AWS' }
          ),
          ({ incorrect, correct }) => {
            const text = `${incorrect}を使用する`;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('term-notation');
            expect(diagnostics[0].suggestions[0]).toContain(correct);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect correct notation', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('JavaScript', 'GitHub', 'TypeScript', 'ChatGPT', 'AWS'),
          (correct) => {
            const text = `${correct}を使用する`;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 12: 漢字開きの統一
   */
  describe('Property 12: 漢字開きの統一', () => {
    const rule = new KanjiOpeningRule();

    it('should detect closed kanji and suggest opened form', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { closed: '下さい', opened: 'ください' },
            { closed: '出来る', opened: 'できる' },
            { closed: '有難う', opened: 'ありがとう' },
            { closed: '宜しく', opened: 'よろしく' }
          ),
          ({ closed, opened }) => {
            const text = `${closed}`;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('kanji-opening');
            expect(diagnostics[0].suggestions[0]).toContain(opened);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not detect already opened kanji', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('ください', 'できる', 'ありがとう', 'よろしく'),
          (opened) => {
            const text = opened;
            const context = createContext(text);
            const diagnostics = rule.check([], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: advanced-grammar-rules, Property 13: 設定変更の即時反映
   */
  describe('Property 13: 設定変更の即時反映', () => {
    it('should reflect config changes immediately', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const rule = new CommaCountRule();
            const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableCommaCount: enabled };
            expect(rule.isEnabled(config)).toBe(enabled);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

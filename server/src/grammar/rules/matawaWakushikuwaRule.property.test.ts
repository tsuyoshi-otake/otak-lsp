/**
 * MatawaWakushikuwaRuleのプロパティベーステスト
 * Feature: official-document-rules
 * Property 1: 接続詞検出の完全性（又は/若しくは）
 * Property 2: 単独使用警告の正確性（若しくは）
 * 検証: 要件 2.1, 2.3
 */

import * as fc from 'fast-check';
import { MatawaWakushikuwaRule } from './matawaWakushikuwaRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: MatawaWakushikuwaRule', () => {
  const rule = new MatawaWakushikuwaRule();

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

  const createContext = (text: string, sentences: Sentence[]): RuleContext => ({
    documentText: text,
    sentences,
    config: { ...DEFAULT_ADVANCED_RULES_CONFIG, enableMatawaWakushikuwa: true }
  });

  /**
   * Feature: official-document-rules, Property 1: 接続詞検出の完全性（又は/若しくは）
   * 任意のテキストに「又は」「若しくは」が含まれる場合、
   * findConjunctionsメソッドはすべての出現箇所を検出する。
   *
   * 検証: 要件 2.1
   */
  describe('Property 1: 接続詞検出の完全性（又は/若しくは）', () => {
    it('「又は」を含むテキストでは、すべての「又は」が検出される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { minLength: 2, maxLength: 5 }),
          (elements) => {
            // 要素を「又は」で結合
            const text = elements.join('又は');
            const matches = rule.findConjunctions(text);

            // 「又は」の数は要素数 - 1
            const expectedMatawaCount = elements.length - 1;
            const actualMatawaCount = matches.filter(m => m.type === 'matawa').length;

            expect(actualMatawaCount).toBe(expectedMatawaCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「若しくは」を含むテキストでは、すべての「若しくは」が検出される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('選択肢1', '選択肢2', '選択肢3'), { minLength: 2, maxLength: 4 }),
          (choices) => {
            // 選択肢を「若しくは」で結合
            const text = choices.join('若しくは');
            const matches = rule.findConjunctions(text);

            // 「若しくは」の数は選択肢数 - 1
            const expectedWakushikuwaCount = choices.length - 1;
            const actualWakushikuwaCount = matches.filter(m => m.type === 'wakushikuwa').length;

            expect(actualWakushikuwaCount).toBe(expectedWakushikuwaCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「又は」と「若しくは」が混在するテキストでは、両方が正しく検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 2 }),
          (wakushikuwaCount, matawaCount) => {
            // 「A若しくはB」のようなグループを作成し、「又は」で結合
            const groups: string[] = [];
            for (let i = 0; i < matawaCount + 1; i++) {
              const elements: string[] = [];
              for (let j = 0; j < wakushikuwaCount + 1; j++) {
                elements.push(`要素${i}_${j}`);
              }
              groups.push(elements.join('若しくは'));
            }
            const text = groups.join('又は');
            const matches = rule.findConjunctions(text);

            const actualWakushikuwaCount = matches.filter(m => m.type === 'wakushikuwa').length;
            const actualMatawaCount = matches.filter(m => m.type === 'matawa').length;

            // 各グループ内の「若しくは」の数 × グループ数
            const expectedWakushikuwaCount = wakushikuwaCount * (matawaCount + 1);
            expect(actualWakushikuwaCount).toBe(expectedWakushikuwaCount);
            expect(actualMatawaCount).toBe(matawaCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「又は」「若しくは」を含まないテキストでは、検出結果が空である', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            'AかBかC',
            '私は学生です',
            '今日は晴れています'
          ),
          (text) => {
            const matches = rule.findConjunctions(text);
            expect(matches).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: official-document-rules, Property 2: 単独使用警告の正確性（若しくは）
   * 「若しくは」が含まれ「又は」が含まれない文では、警告が出力される。
   * 「又は」のみ、または「又は」と「若しくは」の両方を含む文では、
   * 単独使用警告は出力されない。
   *
   * 検証: 要件 2.3
   */
  describe('Property 2: 単独使用警告の正確性（若しくは）', () => {
    it('「若しくは」単独使用では警告が出力される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('項目A', '項目B', '項目C'), { minLength: 2, maxLength: 4 }),
          (items) => {
            // 「若しくは」のみで結合（「又は」なし）
            const text = items.join('若しくは');
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 「若しくは」の数だけ警告が出る
            const expectedWarningCount = items.length - 1;
            expect(diagnostics.length).toBe(expectedWarningCount);
            diagnostics.forEach(d => {
              expect(d.code).toBe('matawa-wakushikuwa');
              expect(d.message).toContain('若しくは');
              expect(d.message).toContain('又は');
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「又は」のみの使用では単独使用警告は出力されない', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('A', 'B'), { minLength: 2, maxLength: 2 }),
          (items) => {
            // 「又は」のみで結合
            const text = items.join('又は');
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 単独使用警告（「若しくは」に関する警告）は出ない
            const wakushikuwaWarnings = diagnostics.filter(d =>
              d.message.includes('「若しくは」は「又は」と組み合わせて使用します')
            );
            expect(wakushikuwaWarnings).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「又は」と「若しくは」の両方を含む文では単独使用警告は出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'A若しくはB又はC若しくはD',
            '甲若しくは乙又は丙若しくは丁',
            '項目1若しくは項目2又は項目3若しくは項目4'
          ),
          (text) => {
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 単独使用警告は出ない
            const wakushikuwaWarnings = diagnostics.filter(d =>
              d.message.includes('「若しくは」は「又は」と組み合わせて使用します')
            );
            expect(wakushikuwaWarnings).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('接続詞を含まない文では警告は出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            'AかBかC',
            '私は学生です',
            '今日は晴れています'
          ),
          (text) => {
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

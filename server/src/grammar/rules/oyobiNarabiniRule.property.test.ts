/**
 * OyobiNarabiniRuleのプロパティベーステスト
 * Feature: official-document-rules
 * Property 1: 接続詞検出の完全性（及び/並びに）
 * Property 2: 単独使用警告の正確性（並びに）
 * 検証: 要件 1.1, 1.3
 */

import * as fc from 'fast-check';
import { OyobiNarabiniRule } from './oyobiNarabiniRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: OyobiNarabiniRule', () => {
  const rule = new OyobiNarabiniRule();

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
    config: { ...DEFAULT_ADVANCED_RULES_CONFIG, enableOyobiNarabini: true }
  });

  /**
   * Feature: official-document-rules, Property 1: 接続詞検出の完全性（及び/並びに）
   * 任意のテキストに「及び」「並びに」が含まれる場合、
   * findConjunctionsメソッドはすべての出現箇所を検出する。
   *
   * 検証: 要件 1.1
   */
  describe('Property 1: 接続詞検出の完全性（及び/並びに）', () => {
    it('「及び」を含むテキストでは、すべての「及び」が検出される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('A', 'B', 'C', 'D', 'E'), { minLength: 2, maxLength: 5 }),
          (elements) => {
            // 要素を「及び」で結合
            const text = elements.join('及び');
            const matches = rule.findConjunctions(text);

            // 「及び」の数は要素数 - 1
            const expectedOyobiCount = elements.length - 1;
            const actualOyobiCount = matches.filter(m => m.type === 'oyobi').length;

            expect(actualOyobiCount).toBe(expectedOyobiCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「並びに」を含むテキストでは、すべての「並びに」が検出される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('グループ1', 'グループ2', 'グループ3'), { minLength: 2, maxLength: 4 }),
          (groups) => {
            // グループを「並びに」で結合
            const text = groups.join('並びに');
            const matches = rule.findConjunctions(text);

            // 「並びに」の数はグループ数 - 1
            const expectedNarabiniCount = groups.length - 1;
            const actualNarabiniCount = matches.filter(m => m.type === 'narabini').length;

            expect(actualNarabiniCount).toBe(expectedNarabiniCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「及び」と「並びに」が混在するテキストでは、両方が正しく検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 2 }),
          (oyobiCount, narabiniCount) => {
            // 「A及びB」のようなグループを作成し、「並びに」で結合
            const groups: string[] = [];
            for (let i = 0; i < narabiniCount + 1; i++) {
              const elements: string[] = [];
              for (let j = 0; j < oyobiCount + 1; j++) {
                elements.push(`要素${i}_${j}`);
              }
              groups.push(elements.join('及び'));
            }
            const text = groups.join('並びに');
            const matches = rule.findConjunctions(text);

            const actualOyobiCount = matches.filter(m => m.type === 'oyobi').length;
            const actualNarabiniCount = matches.filter(m => m.type === 'narabini').length;

            // 各グループ内の「及び」の数 × グループ数
            const expectedOyobiCount = oyobiCount * (narabiniCount + 1);
            expect(actualOyobiCount).toBe(expectedOyobiCount);
            expect(actualNarabiniCount).toBe(narabiniCount);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「及び」「並びに」を含まないテキストでは、検出結果が空である', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'これはテストです',
            'AとBとC',
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
   * Feature: official-document-rules, Property 2: 単独使用警告の正確性（並びに）
   * 「並びに」が含まれ「及び」が含まれない文では、警告が出力される。
   * 「及び」のみ、または「及び」と「並びに」の両方を含む文では、
   * 単独使用警告は出力されない。
   *
   * 検証: 要件 1.3
   */
  describe('Property 2: 単独使用警告の正確性（並びに）', () => {
    it('「並びに」単独使用では警告が出力される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('項目A', '項目B', '項目C'), { minLength: 2, maxLength: 4 }),
          (items) => {
            // 「並びに」のみで結合（「及び」なし）
            const text = items.join('並びに');
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 「並びに」の数だけ警告が出る
            const expectedWarningCount = items.length - 1;
            expect(diagnostics.length).toBe(expectedWarningCount);
            diagnostics.forEach(d => {
              expect(d.code).toBe('oyobi-narabini');
              expect(d.message).toContain('並びに');
              expect(d.message).toContain('及び');
            });
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「及び」のみの使用では単独使用警告は出力されない', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom('A', 'B'), { minLength: 2, maxLength: 2 }),
          (items) => {
            // 「及び」のみで結合
            const text = items.join('及び');
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 単独使用警告（「並びに」に関する警告）は出ない
            const narabiniWarnings = diagnostics.filter(d =>
              d.message.includes('「並びに」は「及び」と組み合わせて使用します')
            );
            expect(narabiniWarnings).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('「及び」と「並びに」の両方を含む文では単独使用警告は出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'A及びB並びにC及びD',
            '甲及び乙並びに丙及び丁',
            '項目1及び項目2並びに項目3及び項目4'
          ),
          (text) => {
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence]);
            const tokens = [createToken(text, '名詞', 0)];

            const diagnostics = rule.check(tokens, context);

            // 単独使用警告は出ない
            const narabiniWarnings = diagnostics.filter(d =>
              d.message.includes('「並びに」は「及び」と組み合わせて使用します')
            );
            expect(narabiniWarnings).toHaveLength(0);
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
            'AとBとC',
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

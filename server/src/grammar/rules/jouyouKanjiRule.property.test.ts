/**
 * JouyouKanjiRuleのプロパティベーステスト
 * Feature: official-document-rules
 * Property 3: 常用漢字判定の正確性
 * Property 4: 固有名詞除外オプションの動作
 * 検証: 要件 3.1, 3.2, 3.4
 */

import * as fc from 'fast-check';
import { JouyouKanjiRule } from './jouyouKanjiRule';
import { Token } from '../../../../shared/src/types';
import {
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  Sentence,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';
import {
  JOUYOU_KANJI_SET,
  isJouyouKanji,
  isKanji
} from '../../../../shared/src/jouyouKanjiData';

describe('Property-Based Tests: JouyouKanjiRule', () => {
  const rule = new JouyouKanjiRule();

  // 常用漢字のサンプル（テスト用）
  const SAMPLE_JOUYOU_KANJI = ['日', '本', '語', '文', '字', '学', '校', '生', '先', '人'];
  
  // 常用漢字外のサンプル（テスト用）
  // 注意: 「鬱」は2010年の改定で常用漢字に追加されたため除外
  const SAMPLE_NON_JOUYOU_KANJI = ['繋', '嘘', '噂', '麹', '齧', '鰯', '鯛', '鷹', '鸚', '靄'];

  const createToken = (
    surface: string,
    pos: string,
    posDetail1: string,
    start: number
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1,
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
      tokens: [createToken(text, '名詞', '一般', start)],
      start,
      end: start + text.length
    });
  };

  const createContext = (
    text: string,
    sentences: Sentence[],
    configOverrides: Partial<AdvancedRulesConfig> = {}
  ): RuleContext => ({
    documentText: text,
    sentences,
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      enableJouyouKanji: true,
      ...configOverrides
    }
  });

  /**
   * Feature: official-document-rules, Property 3: 常用漢字判定の正確性
   * 常用漢字表（2136字）に含まれる漢字は警告されず、
   * 含まれない漢字は警告される。
   *
   * 検証: 要件 3.1, 3.2
   */
  describe('Property 3: 常用漢字判定の正確性', () => {
    it('常用漢字のみを含むテキストでは警告が出力されない', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...SAMPLE_JOUYOU_KANJI), { minLength: 1, maxLength: 5 }),
          (kanjiArray) => {
            const text = kanjiArray.join('');
            const token = createToken(text, '名詞', '一般', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check([token], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('常用漢字外の漢字を含むテキストでは警告が出力される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI), { minLength: 1, maxLength: 3 }),
          (kanjiArray) => {
            const text = kanjiArray.join('');
            const token = createToken(text, '名詞', '一般', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check([token], context);

            // 常用漢字外の漢字の数だけ警告が出る
            expect(diagnostics.length).toBe(kanjiArray.length);
            diagnostics.forEach(d => {
              expect(d.code).toBe('jouyou-kanji');
              expect(d.message).toContain('常用漢字表にありません');
            });
          }
        ),
        { numRuns: 30 }
      );
    });


    it('常用漢字と常用漢字外が混在するテキストでは、常用漢字外のみ警告される', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(...SAMPLE_JOUYOU_KANJI), { minLength: 1, maxLength: 3 }),
          fc.array(fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI), { minLength: 1, maxLength: 2 }),
          (jouyouArray, nonJouyouArray) => {
            // 常用漢字と常用漢字外を交互に配置
            const chars: string[] = [];
            const maxLen = Math.max(jouyouArray.length, nonJouyouArray.length);
            for (let i = 0; i < maxLen; i++) {
              if (i < jouyouArray.length) chars.push(jouyouArray[i]);
              if (i < nonJouyouArray.length) chars.push(nonJouyouArray[i]);
            }
            const text = chars.join('');
            const token = createToken(text, '名詞', '一般', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check([token], context);

            // 常用漢字外の漢字の数だけ警告が出る
            expect(diagnostics.length).toBe(nonJouyouArray.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('isJouyouKanji関数は常用漢字セットと一致する判定を行う', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(JOUYOU_KANJI_SET).slice(0, 100)),
          (kanji) => {
            expect(isJouyouKanji(kanji)).toBe(true);
            expect(JOUYOU_KANJI_SET.has(kanji)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('isKanji関数は漢字を正しく判定する', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_JOUYOU_KANJI, ...SAMPLE_NON_JOUYOU_KANJI),
          (char) => {
            expect(isKanji(char)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ひらがな・カタカナは漢字として判定されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'),
          (char) => {
            expect(isKanji(char)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  /**
   * Feature: official-document-rules, Property 4: 固有名詞除外オプションの動作
   * 固有名詞（人名・地名・組織名）に含まれる常用漢字外の漢字について、
   * 除外オプションが有効な場合は警告が抑制される。
   *
   * 検証: 要件 3.4
   */
  describe('Property 4: 固有名詞除外オプションの動作', () => {
    it('固有名詞除外オプションが有効な場合、固有名詞の常用漢字外は警告されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI),
          (kanji) => {
            const text = kanji;
            // 固有名詞として設定
            const token = createToken(text, '名詞', '固有名詞', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: true
            });

            const diagnostics = rule.check([token], context);

            // 固有名詞は除外されるため警告なし
            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('固有名詞除外オプションが無効な場合、固有名詞の常用漢字外も警告される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI),
          (kanji) => {
            const text = kanji;
            // 固有名詞として設定
            const token = createToken(text, '名詞', '固有名詞', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check([token], context);

            // 固有名詞除外が無効なので警告あり
            expect(diagnostics.length).toBe(1);
            expect(diagnostics[0].code).toBe('jouyou-kanji');
          }
        ),
        { numRuns: 30 }
      );
    });


    it('人名品詞の常用漢字外は除外オプション有効時に警告されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI),
          (kanji) => {
            const text = kanji;
            // 人名として設定
            const token = createToken(text, '名詞', '人名', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: true
            });

            const diagnostics = rule.check([token], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('地名品詞の常用漢字外は除外オプション有効時に警告されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI),
          (kanji) => {
            const text = kanji;
            // 地名として設定
            const token = createToken(text, '名詞', '地名', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: true
            });

            const diagnostics = rule.check([token], context);

            expect(diagnostics).toHaveLength(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('一般名詞の常用漢字外は除外オプションに関係なく警告される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...SAMPLE_NON_JOUYOU_KANJI),
          fc.boolean(),
          (kanji, excludeProperNouns) => {
            const text = kanji;
            // 一般名詞として設定
            const token = createToken(text, '名詞', '一般', 0);
            const sentence = createSentence(text, 0);
            const context = createContext(text, [sentence], {
              excludeProperNounsFromJouyouKanji: excludeProperNouns
            });

            const diagnostics = rule.check([token], context);

            // 一般名詞は除外対象外なので常に警告
            expect(diagnostics.length).toBe(1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

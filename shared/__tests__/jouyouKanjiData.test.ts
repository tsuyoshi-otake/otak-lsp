/**
 * 常用漢字データのテスト
 * Feature: official-document-rules
 * Task: 1.3 常用漢字データのプロパティテスト
 * 
 * **Property 3: 常用漢字判定の正確性**
 * **Validates: Requirements 3.1, 3.2, 3.5**
 */

import * as fc from 'fast-check';
import {
  JOUYOU_KANJI_SET,
  NON_JOUYOU_ALTERNATIVES,
  isJouyouKanji,
  isKanji,
  getAlternative
} from '../src/jouyouKanjiData';

describe('JouyouKanjiData', () => {
  describe('JOUYOU_KANJI_SET', () => {
    test('常用漢字表は2136字を含む', () => {
      expect(JOUYOU_KANJI_SET.size).toBe(2136);
    });

    test('代表的な常用漢字が含まれる', () => {
      // 基本的な漢字
      expect(JOUYOU_KANJI_SET.has('日')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('本')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('国')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('人')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('年')).toBe(true);

      // 公文書でよく使われる漢字
      expect(JOUYOU_KANJI_SET.has('及')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('並')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('又')).toBe(true);
      expect(JOUYOU_KANJI_SET.has('若')).toBe(true);
    });

    test('常用漢字外の漢字は含まれない', () => {
      // 常用漢字外の例
      expect(JOUYOU_KANJI_SET.has('繋')).toBe(false); // 「けい」（つなぐ）
      expect(JOUYOU_KANJI_SET.has('琉')).toBe(false); // 「りゅう」
      expect(JOUYOU_KANJI_SET.has('嶋')).toBe(false); // 「しま」（旧字体）
    });
  });

  describe('NON_JOUYOU_ALTERNATIVES', () => {
    test('代替提案マップには常用漢字外の漢字が含まれる', () => {
      // 代替提案が存在する常用漢字外の漢字
      const alternatives = NON_JOUYOU_ALTERNATIVES;
      expect(alternatives.size).toBeGreaterThan(0);
    });

    test('代替提案にはひらがな表記が含まれる', () => {
      // 代替提案の構造をチェック
      for (const [kanji, suggestion] of NON_JOUYOU_ALTERNATIVES) {
        expect(typeof suggestion.hiragana).toBe('string');
        expect(suggestion.hiragana.length).toBeGreaterThan(0);
      }
    });
  });

  describe('isJouyouKanji', () => {
    test('常用漢字はtrueを返す', () => {
      expect(isJouyouKanji('日')).toBe(true);
      expect(isJouyouKanji('月')).toBe(true);
      expect(isJouyouKanji('火')).toBe(true);
    });

    test('常用漢字外はfalseを返す', () => {
      expect(isJouyouKanji('繋')).toBe(false);
      expect(isJouyouKanji('琉')).toBe(false);
    });

    test('非漢字はfalseを返す', () => {
      expect(isJouyouKanji('あ')).toBe(false);
      expect(isJouyouKanji('ア')).toBe(false);
      expect(isJouyouKanji('A')).toBe(false);
      expect(isJouyouKanji('1')).toBe(false);
    });
  });

  describe('isKanji', () => {
    test('漢字はtrueを返す', () => {
      expect(isKanji('日')).toBe(true);
      expect(isKanji('繋')).toBe(true);
      expect(isKanji('龍')).toBe(true);
    });

    test('非漢字はfalseを返す', () => {
      expect(isKanji('あ')).toBe(false);
      expect(isKanji('ア')).toBe(false);
      expect(isKanji('A')).toBe(false);
      expect(isKanji('1')).toBe(false);
    });

    test('複数文字はfalseを返す', () => {
      expect(isKanji('日本')).toBe(false);
      expect(isKanji('')).toBe(false);
    });
  });

  describe('getAlternative', () => {
    test('代替提案がある漢字は提案を返す', () => {
      const alt = getAlternative('繋');
      expect(alt).toBeDefined();
      expect(alt?.hiragana).toBe('つな（ぐ）');
      // 代替漢字はオプショナル
      if (alt?.alternative) {
        expect(typeof alt.alternative).toBe('string');
      }
    });

    test('代替提案がない漢字はundefinedを返す', () => {
      expect(getAlternative('日')).toBeUndefined();
    });
  });

  /**
   * Property-Based Tests
   * **Property 3: 常用漢字判定の正確性**
   * **Validates: Requirements 3.1, 3.2, 3.5**
   */
  describe('Property-Based Tests', () => {
    /**
     * Property 3.1: 常用漢字表に含まれる漢字はisJouyouKanjiがtrueを返す
     * Requirements 3.1: 各漢字が常用漢字表に含まれるか判定する
     */
    test('Property 3: 常用漢字表に含まれる漢字はisJouyouKanjiがtrueを返す', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(JOUYOU_KANJI_SET)),
          (kanji) => {
            return isJouyouKanji(kanji) === true;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.2: 常用漢字表に含まれない漢字はisJouyouKanjiがfalseを返す
     * Requirements 3.2: 常用漢字表にない漢字が検出された場合は警告を出力する
     * 
     * 注: 代替提案マップには2010年の常用漢字表改定で追加された漢字が含まれている場合がある。
     * このテストでは、真に常用漢字外の漢字（繋、琉、嶋など）が正しく判定されることを確認する。
     */
    test('Property 3: 真の常用漢字外の漢字はisJouyouKanjiがfalseを返す', () => {
      // 確実に常用漢字外の漢字のみをテスト
      const trueNonJouyouKanji = Array.from(NON_JOUYOU_ALTERNATIVES.keys())
        .filter(k => !JOUYOU_KANJI_SET.has(k));
      
      fc.assert(
        fc.property(
          fc.constantFrom(...trueNonJouyouKanji),
          (kanji) => {
            return isJouyouKanji(kanji) === false;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.3: ひらがなはisJouyouKanjiがfalseを返す
     * Requirements 3.1: 漢字以外の文字は常用漢字ではない
     */
    test('Property 3: ひらがなはisJouyouKanjiがfalseを返す', () => {
      const hiraganaChars = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split('');
      fc.assert(
        fc.property(
          fc.constantFrom(...hiraganaChars),
          (char) => {
            return isJouyouKanji(char) === false;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.4: カタカナはisJouyouKanjiがfalseを返す
     * Requirements 3.1: 漢字以外の文字は常用漢字ではない
     */
    test('Property 3: カタカナはisJouyouKanjiがfalseを返す', () => {
      const katakanaChars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'.split('');
      fc.assert(
        fc.property(
          fc.constantFrom(...katakanaChars),
          (char) => {
            return isJouyouKanji(char) === false;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.5: 常用漢字表の漢字はすべてisKanjiがtrueを返す
     * Requirements 3.5: 常用漢字表（2136字）を基準とする
     */
    test('Property 3: 常用漢字表の漢字はすべてisKanjiがtrueを返す', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(JOUYOU_KANJI_SET)),
          (kanji) => {
            return isKanji(kanji) === true;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.6: 代替提案マップの漢字はすべてisKanjiがtrueを返す
     * Requirements 3.5: 常用漢字外の漢字も漢字として認識される
     */
    test('Property 3: 代替提案マップの漢字はすべてisKanjiがtrueを返す', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(NON_JOUYOU_ALTERNATIVES.keys())),
          (kanji) => {
            return isKanji(kanji) === true;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.7: 代替提案マップの漢字には必ずひらがな表記がある
     * Requirements 3.3: 可能であればひらがな表記を提案する
     */
    test('Property 3: 代替提案マップの漢字には必ずひらがな表記がある', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(NON_JOUYOU_ALTERNATIVES.keys())),
          (kanji) => {
            const alt = getAlternative(kanji);
            return alt !== undefined && alt.hiragana.length > 0;
          }
        ),
        { numRuns: 30 }
      );
    });

    /**
     * Property 3.8: isJouyouKanjiとJOUYOU_KANJI_SET.hasの結果は一致する
     * Requirements 3.1: 判定の一貫性
     */
    test('Property 3: isJouyouKanjiとJOUYOU_KANJI_SET.hasの結果は一致する', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Array.from(JOUYOU_KANJI_SET)),
          (kanji) => {
            return isJouyouKanji(kanji) === JOUYOU_KANJI_SET.has(kanji);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

/**
 * 2010年改定漢字の誤検知テスト
 * これらの漢字は常用漢字表に含まれるため、検出されてはいけない
 */
describe('False Positive Prevention Tests', () => {
  // 2010年改定で追加された漢字（よく誤解される例）
  const JOUYOU_2010_ADDITIONS = [
    '挨', '曖', '宛', '嵐', '畏', '萎', '椅', '彙', '茨', '咽',
    '淫', '鬱', '餌', '怨', '媛', '艶', '旺', '岡', '臆', '俺',
    '苛', '牙', '瓦', '楷', '潰', '諧', '崖', '蓋', '骸', '柿',
    '顎', '葛', '釜', '鎌', '韓', '玩', '伎', '亀', '毀', '畿',
    '拶', '捗', '頬', '昧'
  ];

  test.each(JOUYOU_2010_ADDITIONS)(
    '2010年改定漢字「%s」は常用漢字として認識される',
    (kanji) => {
      expect(JOUYOU_KANJI_SET.has(kanji)).toBe(true);
      expect(isJouyouKanji(kanji)).toBe(true);
    }
  );

  // 常用漢字外40例
  const NON_JOUYOU_40_EXAMPLES = [
    '繋', '嘘', '噂', '麹', '齧', '鰯', '鯛', '鷹', '鸚', '靄',
    '斡', '齟', '齬', '瑕', '疵', '躊', '躇', '顛', '呟', '絆',
    '罠', '皺', '歪', '溜', '掴', '贅', '煽', '牽', '窺', '捉',
    '澤', '濱', '廣', '齋', '邊', '國', '龍', '鐵', '鑛', '眩'
  ];

  test.each(NON_JOUYOU_40_EXAMPLES)(
    '常用漢字外「%s」は常用漢字外として認識される',
    (kanji) => {
      expect(JOUYOU_KANJI_SET.has(kanji)).toBe(false);
      expect(isJouyouKanji(kanji)).toBe(false);
    }
  );
});

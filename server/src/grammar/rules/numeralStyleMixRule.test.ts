/**
 * Numeral Style Mix Rule Test
 * 数字表記混在バリデーターのテスト
 * Feature: remaining-grammar-rules
 * Task: 19.1 - 19.4
 */

import { NumeralStyleMixRule } from './numeralStyleMixRule';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';
import * as fc from 'fast-check';

describe('NumeralStyleMixRule', () => {
  let rule: NumeralStyleMixRule;

  beforeEach(() => {
    rule = new NumeralStyleMixRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('numeral-style-mix');
      expect(rule.description).toContain('数字');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of numeral style mix', () => {
    // **Property 49: Numeral style mix detection**
    // Test: Task 19.2

    it('should detect kanji and arabic numeral mix', () => {
      // Using multi-character kanji numerals to pass the filter
      const text = '二十人で5本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should detect mixed year notation', () => {
      const text = '二〇二五年に20件受注';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('Unified notation non-detection', () => {
    // **Property 50: Unified numeral style non-detection**
    // Test: Task 19.3

    it('should not flag all arabic numerals', () => {
      const text = '3人で5本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });

    it('should not flag all kanji numerals', () => {
      const text = '三人で五本の飲料を買った';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(0);
    });
  });

  describe('Unification suggestions', () => {
    it.each([
      ['十五', '15'], ['二十', '20'], ['三百', '300'], ['一万', '10000'],
      ['二〇二四', '2024'], ['一億二千三百四十五万六千七百八十九', '123456789'],
    ])('%sの数値を保って%sに変換する', (input, expected) => {
      expect(rule.kanjiToArabic(input)).toBe(expected);
    });

    it('アラビア数字を通常の桁数字に変換し、先頭のゼロも維持する', () => {
      expect(rule.arabicToKanji('2024')).toBe('二〇二四');
      expect(rule.arabicToKanji('０１２')).toBe('〇一二');
    });

    it.each(['十百', '一二十', '一万万', '一〇万', '百零五'])('曖昧または不正な位取り %s に変換候補を出さない', input => {
      expect(rule.kanjiToArabic(input)).toBeNull();
      const diagnostics = rule.check([], createContext(`${input}個と123456件`));
      expect(diagnostics.some(d => d.suggestions.length > 0)).toBe(false);
    });

    it('生成した百・十・一の位を独立した算術値へ変換する', () => {
      const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
      fc.assert(fc.property(fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }), fc.integer({ min: 1, max: 9 }), (hundreds, tens, ones) => {
        const written = `${digits[hundreds - 1]}百${digits[tens - 1]}十${digits[ones - 1]}`;
        expect(rule.kanjiToArabic(written)).toBe(String(hundreds * 100 + tens * 10 + ones));
      }), { numRuns: 30, seed: 20261027 });
    });

    it('生成した桁数字を通常の漢数字にし、先頭のゼロを含めて元に戻す', () => {
      const expectedDigits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
      fc.assert(fc.property(fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 20 }), digits => {
        const source = digits.join('');
        const written = rule.arabicToKanji(source);
        expect(written).toBe(digits.map(digit => expectedDigits[digit]).join(''));
        expect(rule.kanjiToArabic(written!)).toBe(source);
      }), { numRuns: 30, seed: 20261027 });
    });

    // **Property 51: Numeral style mix unification suggestion**
    // Test: Task 19.4

    it('should suggest unified format', () => {
      // Using multi-character kanji numerals to pass the filter
      const text = '二十人で5本';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.some(d => d.suggestions && d.suggestions.length > 0)).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const context = createContext('');
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle text without numerals', () => {
      const text = '今日は良い天気です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should handle single numeral type', () => {
      const text = '今日は25日です';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBe(0);
    });

    it('should allow fixed expressions with kanji numerals', () => {
      // Common expressions like "一人", "一つ" are often written in kanji
      const text = '一人で参加する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);
      // Single kanji numeral should not be flagged
      expect(diagnostics.length).toBe(0);
    });
  });
});

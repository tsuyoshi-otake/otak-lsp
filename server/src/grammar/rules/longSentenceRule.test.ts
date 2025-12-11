/**
 * Long Sentence Ruleのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 5.1, 5.3, 5.4
 */

import { LongSentenceRule } from './longSentenceRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('LongSentenceRule', () => {
  let rule: LongSentenceRule;

  beforeEach(() => {
    rule = new LongSentenceRule();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
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

  const createContext = (text: string, sentences: Sentence[], threshold?: number): RuleContext => ({
    documentText: text,
    sentences,
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      longSentenceThreshold: threshold ?? 120
    }
  });

  describe('check', () => {
    it('should detect sentence exceeding 120 characters (要件 5.1)', () => {
      const text = 'あ'.repeat(121) + '。';
      const sentences = [createSentence(text, 0)];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('long-sentence');
    });

    it('should not detect sentence with 120 characters or less (要件 5.3)', () => {
      // 119文字 + 。 = 120文字（閾値以下）
      const text = 'あ'.repeat(119) + '。';
      const sentences = [createSentence(text, 0)];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should include character count in message (要件 5.4)', () => {
      const text = 'あ'.repeat(150) + '。';
      const sentences = [createSentence(text, 0)];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('151'); // 150 + 。
      expect(diagnostics[0].message).toContain('120'); // threshold
    });

    it('should respect custom threshold setting', () => {
      const text = 'あ'.repeat(100) + '。'; // 101文字

      // 閾値150で検出されない
      const context150 = createContext(text, [createSentence(text, 0)], 150);
      const diagnostics150 = rule.check([], context150);
      expect(diagnostics150).toHaveLength(0);

      // 閾値80で検出される
      const context80 = createContext(text, [createSentence(text, 0)], 80);
      const diagnostics80 = rule.check([], context80);
      expect(diagnostics80.length).toBeGreaterThan(0);
    });

    it('should provide split suggestions (要件 5.2)', () => {
      const text = 'あ'.repeat(150) + '。';
      const sentences = [createSentence(text, 0)];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should detect long realistic sentence', () => {
      const text = '私は昨日の朝早く起きて朝食を食べてから会社に向かい午前中は会議に出席して午後は資料を作成し夕方には上司に報告して帰宅した。';
      const sentences = [createSentence(text, 0)];
      const context = createContext(text, sentences, 50); // 低い閾値で検出
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('long-sentence');
    });

    it('should detect multiple long sentences', () => {
      const longText1 = 'あ'.repeat(130) + '。';
      const longText2 = 'い'.repeat(140) + '。';
      const text = longText1 + longText2;
      const sentences = [
        createSentence(longText1, 0),
        createSentence(longText2, longText1.length)
      ];
      const context = createContext(text, sentences);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(2);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableLongSentence: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableLongSentence: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

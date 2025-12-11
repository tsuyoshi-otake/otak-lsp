/**
 * Tautology Ruleのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 2.1, 2.2, 2.3
 */

import { TautologyRule } from './tautologyRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('TautologyRule', () => {
  let rule: TautologyRule;

  beforeEach(() => {
    rule = new TautologyRule();
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

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('check', () => {
    it('should detect "頭痛が痛い" pattern (要件 2.1)', () => {
      const text = '頭痛が痛い';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('頭痛が痛い');
    });

    it('should detect "違和感を感じる" pattern (要件 2.2)', () => {
      const text = '違和感を感じる';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('違和感を感じる');
    });

    it('should detect "被害を被る" pattern (要件 2.3)', () => {
      const text = '被害を被る';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('被害を被る');
    });

    it('should detect "犯罪を犯す" pattern', () => {
      const text = '犯罪を犯す';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('犯罪を犯す');
    });

    it('should detect "危険が危ない" pattern', () => {
      const text = '危険が危ない';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('危険が危ない');
    });

    it('should detect "歌を歌う" pattern', () => {
      const text = '歌を歌う';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('tautology');
      expect(diagnostics[0].message).toContain('歌を歌う');
    });

    it('should not detect correct expressions', () => {
      const text = '頭が痛い';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "違和感がある"', () => {
      const text = '違和感がある';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "被害を受ける"', () => {
      const text = '被害を受ける';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should provide suggestions (要件 2.5)', () => {
      const text = '頭痛が痛い';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableTautology: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableTautology: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('multiple patterns', () => {
    it('should detect multiple tautologies in same text', () => {
      const text = '頭痛が痛いし、違和感を感じる';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });
});

/**
 * Ra-nuki Detection Ruleのユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 2.1, 2.2, 2.5
 */

import { RaNukiRule } from './raNukiRule';
import { Token } from '../../../../shared/src/types';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('RaNukiRule', () => {
  let rule: RaNukiRule;

  beforeEach(() => {
    rule = new RaNukiRule();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    baseForm?: string,
    conjugation?: string
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: conjugation || '*',
      conjugationForm: '*',
      baseForm: baseForm || surface,
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
    it('should detect "食べれる" as ra-nuki', () => {
      const tokens = [
        createToken('食べれる', '動詞', 0, '食べれる', '一段')
      ];
      const context = createContext('食べれる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
      expect(diagnostics[0].message).toContain('食べれる');
      expect(diagnostics[0].suggestions).toContain('食べられる');
    });

    it('should detect "見れる" as ra-nuki', () => {
      const tokens = [
        createToken('見れる', '動詞', 0, '見れる', '一段')
      ];
      const context = createContext('見れる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
      expect(diagnostics[0].suggestions).toContain('見られる');
    });

    it('should detect "起きれる" as ra-nuki', () => {
      const tokens = [
        createToken('起きれる', '動詞', 0, '起きれる', '一段')
      ];
      const context = createContext('起きれる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
      expect(diagnostics[0].suggestions).toContain('起きられる');
    });

    it('should detect "考えれる" as ra-nuki', () => {
      const tokens = [
        createToken('考えれる', '動詞', 0, '考えれる', '一段')
      ];
      const context = createContext('考えれる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
      expect(diagnostics[0].suggestions).toContain('考えられる');
    });

    it('should not detect "食べられる" as ra-nuki', () => {
      const tokens = [
        createToken('食べられる', '動詞', 0, '食べられる', '一段')
      ];
      const context = createContext('食べられる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "見られる" as ra-nuki', () => {
      const tokens = [
        createToken('見られる', '動詞', 0, '見られる', '一段')
      ];
      const context = createContext('見られる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "書ける" as ra-nuki (godan verb)', () => {
      const tokens = [
        createToken('書ける', '動詞', 0, '書ける', '五段')
      ];
      const context = createContext('書ける');
      const diagnostics = rule.check(tokens, context);

      // 五段活用動詞の「書ける」は正しい可能形
      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "走れる" as ra-nuki (godan verb)', () => {
      const tokens = [
        createToken('走れる', '動詞', 0, '走れる', '五段')
      ];
      const context = createContext('走れる');
      const diagnostics = rule.check(tokens, context);

      // 五段活用動詞の「走れる」は正しい可能形
      expect(diagnostics).toHaveLength(0);
    });

    it('should detect ra-nuki in sentence context', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('食べれる', '動詞', 2, '食べれる', '一段')
      ];
      const context = createContext('私は食べれる');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableRaNukiDetection: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableRaNukiDetection: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('conjugated forms', () => {
    it('should detect "食べれた" (past tense) as ra-nuki', () => {
      const tokens = [
        createToken('食べれた', '動詞', 0, '食べれる', '一段')
      ];
      const context = createContext('食べれた');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
    });

    it('should detect "食べれない" (negative) as ra-nuki', () => {
      const tokens = [
        createToken('食べれない', '動詞', 0, '食べれる', '一段')
      ];
      const context = createContext('食べれない');
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('ra-nuki');
    });
  });
});

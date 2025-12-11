/**
 * No Particle Chain Ruleのユニットテスト
 * Feature: additional-grammar-rules
 * 要件: 3.1, 3.3, 3.4
 */

import { NoParticleChainRule } from './noParticleChainRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('NoParticleChainRule', () => {
  let rule: NoParticleChainRule;

  beforeEach(() => {
    rule = new NoParticleChainRule();
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

  const createContext = (text: string, threshold?: number): RuleContext => ({
    documentText: text,
    sentences: [],
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      noParticleChainThreshold: threshold ?? 3
    }
  });

  describe('check', () => {
    it('should detect 3 consecutive "no" particles (要件 3.1)', () => {
      const text = '東京の会社の部長の息子';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('no-particle-chain');
      expect(diagnostics[0].message).toContain('の');
    });

    it('should detect 4 consecutive "no" particles', () => {
      const text = '東京の会社の部長の息子の友達';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('no-particle-chain');
    });

    it('should not detect 2 "no" particles (要件 3.3)', () => {
      const text = '彼の家の庭';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should include chain count in message (要件 3.4)', () => {
      const text = '東京の会社の部長の息子';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toMatch(/\d+回/);
    });

    it('should respect threshold setting', () => {
      const text = '東京の会社の部長の息子の友達'; // 4回

      // 閾値5で検出されない
      const context5 = createContext(text, 5);
      const diagnostics5 = rule.check([createToken(text, '名詞', 0)], context5);
      expect(diagnostics5).toHaveLength(0);

      // 閾値3で検出される
      const context3 = createContext(text, 3);
      const diagnostics3 = rule.check([createToken(text, '名詞', 0)], context3);
      expect(diagnostics3.length).toBeGreaterThan(0);
    });

    it('should provide suggestions for rewriting', () => {
      const text = '東京の会社の部長の息子';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should not detect text without "no" particle', () => {
      const text = 'これはテストです';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableNoParticleChain: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableNoParticleChain: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('multiple chains', () => {
    it('should detect multiple chains in same text', () => {
      const text = '東京の会社の部長の息子。大阪の支店の課長の娘。';
      const tokens = [createToken(text, '名詞', 0)];
      const context = createContext(text);
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });
});

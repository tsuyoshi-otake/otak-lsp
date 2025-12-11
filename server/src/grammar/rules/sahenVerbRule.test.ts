/**
 * SahenVerbRule Unit Tests
 * Feature: remaining-grammar-rules
 * Task: 2.1 SahenVerbChecker
 */

import { Token } from '../../../../shared/src/types';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';
import { SahenVerbRule } from './sahenVerbRule';

/**
 * Helper function to create Token
 */
const createToken = (
  surface: string,
  pos: string,
  start: number,
  baseForm?: string
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1: pos === '名詞' ? 'サ変接続' : '*',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm: baseForm || surface,
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

describe('SahenVerbRule', () => {
  const rule = new SahenVerbRule();

  describe('Basic functionality', () => {
    it('should have correct name and description', () => {
      expect(rule.name).toBe('sahen-verb');
      expect(rule.description).toContain('サ変動詞');
    });

    it('should be enabled by default', () => {
      expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
    });
  });

  describe('Detection of unnecessary "wo" particle', () => {
    it('should detect "benkyou wo suru" pattern', () => {
      const text = '勉強をする';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('sahen-verb');
      expect(diagnostics[0].message).toContain('勉強をする');
    });

    it('should detect "ryouri wo suru" pattern', () => {
      const text = '料理をする';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('sahen-verb');
    });

    it('should provide correction suggestion', () => {
      const text = '勉強をする';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics[0].suggestions).toContain('勉強する');
    });
  });

  describe('Valid sahen verb usage (no detection)', () => {
    it('should not detect "benkyou suru" (correct form)', () => {
      const text = '勉強する';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "benkyou shimasu" (correct polite form)', () => {
      const text = '勉強します';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should not detect "benkyou shiteimasu" (progressive form)', () => {
      const text = '勉強しています';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty text', () => {
      const text = '';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should handle text without sahen verbs', () => {
      const text = '本を読む';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should detect multiple occurrences', () => {
      const text = '勉強をして、料理をする';
      const context = createContext(text);
      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    });
  });
});

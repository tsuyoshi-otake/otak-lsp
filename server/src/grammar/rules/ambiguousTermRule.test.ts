/**
 * Ambiguous Term Rule Test
 * 曖昧語検出ルールのテスト
 */

import { AmbiguousTermRule } from './ambiguousTermRule';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('AmbiguousTermRule', () => {
  let rule: AmbiguousTermRule;

  beforeEach(() => {
    rule = new AmbiguousTermRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  it('should detect ambiguous time expression', () => {
    const text = '早めに提出してください。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('ambiguous-term');
  });

  it('should detect ambiguous quantity expression', () => {
    const text = '少人数で実施します。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('should detect approximate expression', () => {
    const text = 'だいたい1週間で届きます。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('should not flag when no ambiguous terms exist', () => {
    const text = '申請期限は令和8年1月10日です。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics).toHaveLength(0);
  });
});

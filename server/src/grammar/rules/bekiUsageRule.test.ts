/**
 * Beki Usage Rule Test
 * 「べき」用法ルールのテスト
 */

import { BekiUsageRule } from './bekiUsageRule';
import { RuleContext, Sentence, DEFAULT_ADVANCED_RULES_CONFIG } from '../../../../shared/src/advancedTypes';

describe('BekiUsageRule', () => {
  let rule: BekiUsageRule;

  beforeEach(() => {
    rule = new BekiUsageRule();
  });

  const createContext = (text: string): RuleContext => ({
    documentText: text,
    sentences: [new Sentence({ text, tokens: [], start: 0, end: text.length })],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  it('should detect "するべき"', () => {
    const text = '申請者は本人確認書類を提出するべきです。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].message).toContain('するべき');
  });

  it('should detect sentence ending with "べき"', () => {
    const text = '申請者は本人確認書類を提出すべき。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics.some(d => d.message.includes('文末を「べき」'))).toBe(true);
  });

  it('should not flag "べきである" ending', () => {
    const text = '申請者は本人確認書類を提出すべきである。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag non-sentence usage', () => {
    const text = '確認すべき事項を一覧化します。';
    const diagnostics = rule.check([], createContext(text));

    expect(diagnostics).toHaveLength(0);
  });
});

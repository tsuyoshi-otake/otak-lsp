/**
 * NounChainRule Tests
 */

import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';
import { NounChainRule } from './nounChainRule';

function nounToken(surface: string, start: number, end: number): Token {
  return new Token({
    surface,
    pos: '名詞',
    posDetail1: '*',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm: surface,
    reading: '*',
    pronunciation: '*',
    start,
    end
  });
}

describe('NounChainRule', () => {
  let rule: NounChainRule;
  let context: RuleContext;

  beforeEach(() => {
    rule = new NounChainRule();
    context = {
      documentText: '',
      sentences: [],
      config: { ...DEFAULT_ADVANCED_RULES_CONFIG, enableNounChain: true }
    };
  });

  it('should ignore noun chains in label style ("ラベル: 説明")', () => {
    context.documentText = '  **IPA辞書内蔵**: npm installだけですぐに使えます';

    // 5連続名詞（threshold=5）を意図的に作る
    const tokens = [
      nounToken('**IPA', 2, 7),
      nounToken('辞', 7, 8),
      nounToken('書', 8, 9),
      nounToken('内', 9, 10),
      nounToken('蔵**', 10, 13)
    ];

    const diagnostics = rule.check(tokens, context);
    expect(diagnostics.length).toBe(0);
  });

  it('should detect noun chains in normal sentences', () => {
    context.documentText = 'IPA辞書内蔵により、すぐに使えます。';

    const tokens = [
      nounToken('IPA', 0, 3),
      nounToken('辞', 3, 4),
      nounToken('書', 4, 5),
      nounToken('内', 5, 6),
      nounToken('蔵', 6, 7)
    ];

    const diagnostics = rule.check(tokens, context);
    expect(diagnostics.length).toBe(1);
    expect(diagnostics[0].code).toBe('noun-chain');
  });
});


import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';
import { AlphabetWidthRule } from './alphabetWidthRule';
import { NumberWidthMixRule } from './numberWidthMixRule';

describe('混在時の文字幅と修正候補', () => {
  const ascii = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const full = 'ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚ０１２３４５６７８９';

  it('英字と数字の各文字を、指定幅の文字へ値を変えずに変換する', () => {
    for (let i = 0; i < ascii.length; i++) {
      const text = `${full[i]} ${ascii[i]}`;
      const isNumber = i >= 52;
      const rule = isNumber ? new NumberWidthMixRule() : new AlphabetWidthRule();
      for (const preferred of ['full', 'half'] as const) {
        const context: RuleContext = {
          documentText: text, sentences: [],
          config: { ...DEFAULT_ADVANCED_RULES_CONFIG, proofreadingPreferredAlphabet: preferred, proofreadingPreferredNumeral: preferred },
        };
        const diagnostics = rule.check([], context);
        expect(diagnostics).toHaveLength(1);
        expect(diagnostics[0].range.start.character).toBe(preferred === 'full' ? 2 : 0);
        expect(diagnostics[0].suggestions).toEqual([
          isNumber
            ? `「${preferred === 'full' ? full[i] : ascii[i]}」に変更して統一する`
            : `「${preferred === 'full' ? full[i] : ascii[i]}」に変更する`,
        ]);
      }
    }
  });
});

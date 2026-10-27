import { Token } from '../../../../shared/src/types';
import { AdvancedDiagnostic, AdvancedGrammarRule, AdvancedRulesConfig, RuleContext } from '../../../../shared/src/advancedTypes';
import { isTypoInsideBracket, typoBracketRanges } from './typoBracketScope';

/** 五段動詞の未然形に余分な「さ」が接続した使役形を検出する。 */
export class SaIreRule implements AdvancedGrammarRule {
  name = 'sa-ire-detection';
  description = '五段動詞のさ入れ表現を検出します';

  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const brackets = typoBracketRanges(context);
    for (let i = 0; i + 1 < tokens.length; i++) {
      const verb = tokens[i];
      const auxiliary = tokens[i + 1];
      if (verb.end !== auxiliary.start || verb.pos !== '動詞' || !verb.conjugation.startsWith('五段') ||
          !verb.conjugationForm.startsWith('未然') || auxiliary.pos !== '動詞' || auxiliary.posDetail1 !== '接尾' ||
          auxiliary.baseForm !== 'させる' || !auxiliary.surface.startsWith('させ')) continue;
      if (isTypoInsideBracket(verb.start, brackets)) continue;
      const surface = verb.surface + auxiliary.surface;
      const suggestion = verb.surface + auxiliary.surface.slice(1);
      diagnostics.push(new AdvancedDiagnostic({
        range: { start: { line: 0, character: verb.start }, end: { line: 0, character: auxiliary.end } },
        message: `「${surface}」は、共通語では「${suggestion}」への言い換えを検討してください。`,
        code: 'sa-ire',
        ruleName: this.name,
        suggestions: [suggestion],
      }));
    }
    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableSaIreDetection;
  }
}

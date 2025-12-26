/**
 * Ambiguous Term Rule
 * 曖昧な表現を検出する
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

const AMBIGUOUS_TERM_PATTERNS: Array<{
  pattern: RegExp;
  guidance: string;
  suggestions: string[];
}> = [
  {
    pattern: /早めに/g,
    guidance: '期限を具体的な日時で示してください。',
    suggestions: ['具体的な期限や時刻を記載する']
  },
  {
    pattern: /少人数/g,
    guidance: '人数を具体的な数値で示してください。',
    suggestions: ['人数を数値で示す']
  },
  {
    pattern: /(?:だいたい|おおよそ|およそ)/g,
    guidance: '範囲を具体的な数値で示してください。',
    suggestions: ['範囲や日数を数値で示す']
  },
  {
    pattern: /(?:適宜|随時|順次)/g,
    guidance: 'タイミングや頻度を具体化してください。',
    suggestions: ['実施タイミングや頻度を明記する']
  },
  {
    pattern: /(?:なるべく|できるだけ|可能な限り)/g,
    guidance: '条件や上限を具体化してください。',
    suggestions: ['条件や上限を数値で示す']
  }
];

/**
 * 曖昧語検出ルール
 */
export class AmbiguousTermRule implements AdvancedGrammarRule {
  name = 'ambiguous-term';
  description = '曖昧な表現を検出します';

  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;

    for (const { pattern, guidance, suggestions } of AMBIGUOUS_TERM_PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: match.index },
            end: { line: 0, character: match.index + match[0].length }
          },
          message: `曖昧な表現「${match[0]}」が使用されています。${guidance}`,
          code: 'ambiguous-term',
          ruleName: this.name,
          suggestions
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAmbiguousTerm;
  }
}

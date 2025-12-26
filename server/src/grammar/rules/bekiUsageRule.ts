/**
 * Beki Usage Rule
 * 「べき」の用法を検出する
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

const SURU_BEKI_PATTERN = /するべき/g;
const BEKI_END_PATTERN = /べき(?=(?:[。！？!?]|$|\r?\n))/g;

/**
 * 「べき」用法検出ルール
 */
export class BekiUsageRule implements AdvancedGrammarRule {
  name = 'beki-usage';
  description = '「べき」の表現を整える';

  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;
    const suruBekiRanges: Array<{ start: number; end: number }> = [];

    SURU_BEKI_PATTERN.lastIndex = 0;
    let match;
    while ((match = SURU_BEKI_PATTERN.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      suruBekiRanges.push({ start, end });
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: start },
          end: { line: 0, character: end }
        },
        message: '「するべき」は「すべき」に統一することを推奨します。',
        code: 'beki-usage',
        ruleName: this.name,
        suggestions: ['「すべき」に変更する']
      }));
    }

    BEKI_END_PATTERN.lastIndex = 0;
    while ((match = BEKI_END_PATTERN.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      if (this.isInsideRanges(start, suruBekiRanges)) {
        continue;
      }

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: start },
          end: { line: 0, character: end }
        },
        message: '文末を「べき」で止めています。「べきである」などで言い切ることを推奨します。',
        code: 'beki-usage',
        ruleName: this.name,
        suggestions: ['「べきである」に変更する', '「べきです」に変更する']
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableBekiUsage;
  }

  private isInsideRanges(index: number, ranges: Array<{ start: number; end: number }>): boolean {
    return ranges.some((range) => index >= range.start && index < range.end);
  }
}

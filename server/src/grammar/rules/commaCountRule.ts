/**
 * Comma Count Rule
 * 1文中の読点の数をチェックする
 * Feature: advanced-grammar-rules
 * 要件: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';

/**
 * 読点数チェックルール
 */
export class CommaCountRule implements AdvancedGrammarRule {
  name = 'comma-count';
  description = '1文中の読点の数をチェックします';

  /**
   * 文中の読点をカウント
   */
  countCommas(text: string): number {
    return (text.match(/、/g) || []).length;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.commaCountThreshold;

    for (const sentence of context.sentences) {
      const commaCount = sentence.commaCount;

      if (commaCount > threshold) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: sentence.start },
            end: { line: 0, character: sentence.end }
          },
          message: `1文中に読点が${commaCount}個使用されています（閾値: ${threshold}個）。文を分割することを検討してください。`,
          code: 'comma-count',
          ruleName: this.name,
          suggestions: ['文を複数の短い文に分割する', '不要な修飾語を削除する']
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableCommaCount;
  }
}

/**
 * Double Negation Rule
 * 二重否定を検出する
 * Feature: advanced-grammar-rules
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  DoubleNegation
} from '../../../../shared/src/advancedTypes';

/**
 * 二重否定パターンと肯定表現への書き換え
 */
const DOUBLE_NEGATION_PATTERNS: Array<{ pattern: RegExp; name: string; suggestion: string }> = [
  {
    pattern: /ないわけではない/g,
    name: 'ないわけではない',
    suggestion: '肯定表現に書き換えることを検討してください（例：「ある」「する」など）'
  },
  {
    pattern: /ないことはない/g,
    name: 'ないことはない',
    suggestion: '肯定表現に書き換えることを検討してください（例：「ある」「できる」など）'
  },
  {
    pattern: /なくはない/g,
    name: 'なくはない',
    suggestion: '肯定表現に書き換えることを検討してください（例：「ある」など）'
  },
  {
    pattern: /ないとは言えない/g,
    name: 'ないとは言えない',
    suggestion: '肯定表現に書き換えることを検討してください（例：「あり得る」「可能性がある」など）'
  },
  {
    pattern: /ないではいられない/g,
    name: 'ないではいられない',
    suggestion: '「せずにはいられない」や肯定的な表現に書き換えることを検討してください'
  },
  {
    pattern: /ずにはいられない/g,
    name: 'ずにはいられない',
    suggestion: '肯定的な表現に書き換えることを検討してください'
  },
  {
    pattern: /ないとも限らない/g,
    name: 'ないとも限らない',
    suggestion: '「あり得る」「可能性がある」などの表現を検討してください'
  },
  {
    pattern: /ないでもない/g,
    name: 'ないでもない',
    suggestion: '肯定表現に書き換えることを検討してください'
  }
];

/**
 * 二重否定検出ルール
 */
export class DoubleNegationRule implements AdvancedGrammarRule {
  name = 'double-negation';
  description = '二重否定を検出します';

  /**
   * テキストから二重否定を検出
   * @param text テキスト
   * @returns 検出された二重否定のリスト
   */
  detectDoubleNegation(text: string): DoubleNegation[] {
    const results: DoubleNegation[] = [];

    for (const { pattern, name, suggestion } of DOUBLE_NEGATION_PATTERNS) {
      // パターンをリセット（グローバルフラグのため）
      pattern.lastIndex = 0;

      let match;
      while ((match = pattern.exec(text)) !== null) {
        results.push({
          tokens: [],
          pattern: name,
          range: {
            start: { line: 0, character: match.index },
            end: { line: 0, character: match.index + match[0].length }
          },
          positiveForm: suggestion
        });
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const doubleNegations = this.detectDoubleNegation(context.documentText);

    for (const negation of doubleNegations) {
      diagnostics.push(new AdvancedDiagnostic({
        range: negation.range,
        message: `二重否定「${negation.pattern}」が検出されました。わかりにくい表現になる可能性があります。`,
        code: 'double-negation',
        ruleName: this.name,
        suggestions: [negation.positiveForm || '肯定表現への書き換えを検討してください']
      }));
    }

    return diagnostics;
  }

  /**
   * ルールが有効かどうかを確認
   * @param config 設定
   * @returns 有効な場合true
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableDoubleNegation;
  }
}

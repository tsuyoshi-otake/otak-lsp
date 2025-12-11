/**
 * ModifierPositionRule
 * 修飾語の位置による曖昧さを検出する
 * Feature: remaining-grammar-rules
 * 要件: 7.1, 7.2, 7.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  ModifierPositionError
} from '../../../../shared/src/advancedTypes';

/**
 * 修飾語の順序ルール
 * 一般的な日本語では、大きさ > 色 の順序が自然
 */
const MODIFIER_ORDER_PATTERNS: Map<string, { suggestion: string; explanation: string }> = new Map([
  ['赤い大きな', {
    suggestion: '大きな赤い',
    explanation: '修飾語は「大きさ」→「色」の順序が自然です'
  }],
  ['青い小さな', {
    suggestion: '小さな青い',
    explanation: '修飾語は「大きさ」→「色」の順序が自然です'
  }],
  ['白い大きな', {
    suggestion: '大きな白い',
    explanation: '修飾語は「大きさ」→「色」の順序が自然です'
  }],
  ['黒い小さな', {
    suggestion: '小さな黒い',
    explanation: '修飾語は「大きさ」→「色」の順序が自然です'
  }],
  ['古い素敵な', {
    suggestion: '素敵な古い',
    explanation: '主観的な修飾語は客観的な修飾語の前に置くのが自然です'
  }],
  ['新しい素晴らしい', {
    suggestion: '素晴らしい新しい',
    explanation: '主観的な修飾語は客観的な修飾語の前に置くのが自然です'
  }]
]);

/**
 * 曖昧な係り受けパターン
 */
const AMBIGUOUS_MODIFIER_PATTERNS: Map<string, string> = new Map([
  ['美しい女性の写真', '「美しい」が「女性」と「写真」のどちらを修飾するか曖昧です'],
  ['大きな子供の靴', '「大きな」が「子供」と「靴」のどちらを修飾するか曖昧です'],
  ['新しい社員の机', '「新しい」が「社員」と「机」のどちらを修飾するか曖昧です']
]);

/**
 * 修飾語位置検出ルール
 */
export class ModifierPositionRule implements AdvancedGrammarRule {
  name = 'modifier-position';
  description = '修飾語の位置による曖昧さを検出します';

  /**
   * テキストから修飾語位置の問題を検出
   * @param text テキスト
   * @returns 検出された修飾語位置エラーのリスト
   */
  detectModifierPositionErrors(text: string): ModifierPositionError[] {
    const results: ModifierPositionError[] = [];

    // 修飾語順序パターンの検出
    for (const [pattern, info] of MODIFIER_ORDER_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          modifier: pattern,
          modified: '',
          suggestedOrder: info.suggestion,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          }
        });
        index = text.indexOf(pattern, index + 1);
      }
    }

    // 曖昧な係り受けパターンの検出
    for (const [pattern, explanation] of AMBIGUOUS_MODIFIER_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          modifier: pattern,
          modified: '',
          suggestedOrder: explanation,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          }
        });
        index = text.indexOf(pattern, index + 1);
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
    const errors = this.detectModifierPositionErrors(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `修飾語の位置に問題がある可能性があります。${error.suggestedOrder}`,
        code: 'modifier-position',
        ruleName: this.name,
        suggestions: [error.suggestedOrder]
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
    return config.enableModifierPosition;
  }
}

/**
 * PassiveOveruseRule
 * 受身表現の多用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 9.1, 9.2, 9.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  PassiveOveruse
} from '../../../../shared/src/advancedTypes';

/**
 * 受身表現のパターン
 */
const PASSIVE_PATTERNS: RegExp[] = [
  /れた[。、]/g,
  /られた[。、]/g,
  /された[。、]/g,
  /されました[。、]/g,
  /れました[。、]/g,
  /られました[。、]/g
];

/**
 * 受身表現多用検出ルール
 */
export class PassiveOveruseRule implements AdvancedGrammarRule {
  name = 'passive-overuse';
  description = '受身表現の多用を検出します';

  /**
   * テキストから受身表現の多用を検出
   * @param text テキスト
   * @param threshold 閾値
   * @returns 検出された受身表現多用のリスト
   */
  detectPassiveOveruse(text: string, threshold: number): PassiveOveruse[] {
    const results: PassiveOveruse[] = [];
    const passiveExpressions: string[] = [];

    // 受身表現を検出
    for (const pattern of PASSIVE_PATTERNS) {
      const matches = text.match(pattern);
      if (matches) {
        passiveExpressions.push(...matches);
      }
    }

    // 閾値を超えている場合
    if (passiveExpressions.length >= threshold) {
      results.push({
        passiveExpressions,
        count: passiveExpressions.length,
        threshold,
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: text.length }
        },
        suggestions: ['能動態への書き換えを検討してください']
      });
    }

    return results;
  }

  /**
   * 連続する受身表現を検出
   * @param text テキスト
   * @returns 検出結果
   */
  detectConsecutivePassive(text: string): PassiveOveruse | null {
    // 連続する受身文を検出
    const consecutivePattern = /[^。]*された[。][^。]*された[。][^。]*された[。]/;
    const match = text.match(consecutivePattern);

    if (match) {
      const index = match.index || 0;
      return {
        passiveExpressions: ['された', 'された', 'された'],
        count: 3,
        threshold: 3,
        range: {
          start: { line: 0, character: index },
          end: { line: 0, character: index + match[0].length }
        },
        suggestions: ['能動態に書き換えることを検討してください']
      };
    }

    return null;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.passiveOveruseThreshold;

    // 連続受身文の検出
    const consecutiveError = this.detectConsecutivePassive(context.documentText);
    if (consecutiveError) {
      diagnostics.push(new AdvancedDiagnostic({
        range: consecutiveError.range,
        message: `受身表現が${consecutiveError.count}回連続で使用されています。能動態への書き換えを検討してください。`,
        code: 'passive-overuse',
        ruleName: this.name,
        suggestions: consecutiveError.suggestions
      }));
    }

    // 全体的な受身多用の検出
    const overuseErrors = this.detectPassiveOveruse(context.documentText, threshold);
    for (const error of overuseErrors) {
      // 連続エラーと重複しない場合のみ追加
      if (!consecutiveError) {
        diagnostics.push(new AdvancedDiagnostic({
          range: error.range,
          message: `受身表現が${error.count}回使用されています（閾値: ${error.threshold}回）。能動態への書き換えを検討してください。`,
          code: 'passive-overuse',
          ruleName: this.name,
          suggestions: error.suggestions
        }));
      }
    }

    return diagnostics;
  }

  /**
   * ルールが有効かどうかを確認
   * @param config 設定
   * @returns 有効な場合true
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enablePassiveOveruse;
  }
}

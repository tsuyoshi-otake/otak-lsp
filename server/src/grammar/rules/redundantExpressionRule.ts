/**
 * Redundant Expression Rule
 * 冗長表現を検出する
 * Feature: additional-grammar-rules
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  RedundantExpression
} from '../../../../shared/src/advancedTypes';

/**
 * 冗長表現パターンと修正提案
 */
const REDUNDANT_PATTERNS: Map<string, string> = new Map([
  ['馬から落馬', '落馬'],
  ['後で後悔', '後悔'],
  ['一番最初', '最初'],
  ['各々それぞれ', 'それぞれ'],
  ['まず最初に', '最初に'],
  ['過半数を超える', '過半数'],
  ['元旦の朝', '元旦'],
  ['炎天下の下', '炎天下'],
  ['頭頂部の頭', '頭頂部'],
  ['射程距離', '射程'],
  ['製造メーカー', 'メーカー'],
  ['最後の切り札', '切り札'],
  ['思いがけないハプニング', 'ハプニング'],
  ['返事を返す', '返事をする'],
  ['連日続く', '連日'],
  ['日本に来日', '来日'],
  ['あらかじめ予約', '予約'],
  ['必ず必要', '必要'],
  ['全て全員', '全員'],
  ['今現在', '現在']
]);

/**
 * 冗長表現検出ルール
 */
export class RedundantExpressionRule implements AdvancedGrammarRule {
  name = 'redundant-expression';
  description = '冗長表現を検出します';

  /**
   * テキストから冗長表現を検出
   * @param text テキスト
   * @returns 検出された冗長表現のリスト
   */
  detectRedundantExpressions(text: string): RedundantExpression[] {
    const results: RedundantExpression[] = [];

    for (const [pattern, suggestion] of REDUNDANT_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          pattern,
          redundantPart: pattern,
          suggestion,
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
    const redundantExpressions = this.detectRedundantExpressions(context.documentText);

    for (const expression of redundantExpressions) {
      diagnostics.push(new AdvancedDiagnostic({
        range: expression.range,
        message: `冗長表現「${expression.pattern}」が検出されました。「${expression.suggestion}」に簡潔化できます。`,
        code: 'redundant-expression',
        ruleName: this.name,
        suggestions: [expression.suggestion]
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
    return config.enableRedundantExpression;
  }
}

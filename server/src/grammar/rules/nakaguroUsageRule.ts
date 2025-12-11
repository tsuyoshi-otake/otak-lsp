/**
 * Nakaguro Usage Rule
 * 中黒使用チェッカー
 * Feature: remaining-grammar-rules
 * Task: 24. 中黒使用チェッカーの実装
 * 要件: 22.1, 22.2, 22.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 中黒文字
 */
const NAKAGURO = '・';
const HALFWIDTH_NAKAGURO = '･'; // U+FF65

/**
 * 中黒使用チェッカー
 */
export class NakaguroUsageRule implements AdvancedGrammarRule {
  name = 'nakaguro-usage';
  description = '中黒の過不足を検出し、適切な使用を提案します';

  /**
   * 連続した中黒を検出
   */
  findConsecutiveNakaguro(text: string): Array<{ match: string; index: number }> {
    const results: Array<{ match: string; index: number }> = [];

    // 全角中黒の連続
    const fullwidthPattern = /・{2,}/g;
    let match: RegExpExecArray | null;
    while ((match = fullwidthPattern.exec(text)) !== null) {
      results.push({ match: match[0], index: match.index });
    }

    // 半角中黒の連続
    const halfwidthPattern = /･{2,}/g;
    while ((match = halfwidthPattern.exec(text)) !== null) {
      results.push({ match: match[0], index: match.index });
    }

    // 混在パターン
    const mixedPattern = /[・･]{2,}/g;
    while ((match = mixedPattern.exec(text)) !== null) {
      // 既に検出されていないかチェック
      const alreadyFound = results.some(
        r => r.index === match!.index && r.match.length >= match![0].length
      );
      if (!alreadyFound) {
        results.push({ match: match[0], index: match.index });
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);

    return results;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const consecutiveNakaguro = this.findConsecutiveNakaguro(context.documentText);

    for (const issue of consecutiveNakaguro) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: issue.index },
          end: { line: 0, character: issue.index + issue.match.length }
        },
        message: `中黒「${issue.match}」が${issue.match.length}個連続しています。1個に修正することを推奨します。`,
        code: 'nakaguro-usage',
        ruleName: this.name,
        suggestions: [`「${NAKAGURO}」（1個）に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableCommaCount; // 句読点関連として同じ設定を使用
  }
}

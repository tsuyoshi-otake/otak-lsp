/**
 * Number Width Mix Rule
 * 全角半角数字混在バリデーター
 * Feature: remaining-grammar-rules
 * Task: 16. 全角半角混在バリデーターの実装
 * 要件: 14.1, 14.2, 14.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 全角数字
 */
const FULLWIDTH_DIGITS = '０１２３４５６７８９';

/**
 * 半角数字
 */
const HALFWIDTH_DIGITS = '0123456789';

/**
 * 全角半角数字混在バリデーター
 */
export class NumberWidthMixRule implements AdvancedGrammarRule {
  name = 'number-width-mix';
  description = '全角半角数字の混在を検出し、統一を提案します';

  /**
   * 全角数字かどうかを判定
   */
  isFullwidthDigit(char: string): boolean {
    return FULLWIDTH_DIGITS.includes(char);
  }

  /**
   * 半角数字かどうかを判定
   */
  isHalfwidthDigit(char: string): boolean {
    return HALFWIDTH_DIGITS.includes(char);
  }

  /**
   * 全角数字を半角に変換
   */
  toHalfwidth(text: string): string {
    let result = '';
    for (const char of text) {
      const idx = FULLWIDTH_DIGITS.indexOf(char);
      if (idx !== -1) {
        result += HALFWIDTH_DIGITS[idx];
      } else {
        result += char;
      }
    }
    return result;
  }

  /**
   * 半角数字を全角に変換
   */
  toFullwidth(text: string): string {
    let result = '';
    for (const char of text) {
      const idx = HALFWIDTH_DIGITS.indexOf(char);
      if (idx !== -1) {
        result += FULLWIDTH_DIGITS[idx];
      } else {
        result += char;
      }
    }
    return result;
  }

  /**
   * テキスト内の数字を検出
   */
  findNumbers(text: string): Array<{ value: string; index: number; isFullwidth: boolean }> {
    const results: Array<{ value: string; index: number; isFullwidth: boolean }> = [];

    // 全角数字の検出
    const fullwidthPattern = /[０-９]+/g;
    let match: RegExpExecArray | null;
    while ((match = fullwidthPattern.exec(text)) !== null) {
      results.push({
        value: match[0],
        index: match.index,
        isFullwidth: true
      });
    }

    // 半角数字の検出
    const halfwidthPattern = /[0-9]+/g;
    while ((match = halfwidthPattern.exec(text)) !== null) {
      results.push({
        value: match[0],
        index: match.index,
        isFullwidth: false
      });
    }

    return results.sort((a, b) => a.index - b.index);
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const numbers = this.findNumbers(context.documentText);

    // 全角と半角の両方が存在するかチェック
    const hasFullwidth = numbers.some(n => n.isFullwidth);
    const hasHalfwidth = numbers.some(n => !n.isFullwidth);

    // 混在していない場合は問題なし
    if (!hasFullwidth || !hasHalfwidth) {
      return diagnostics;
    }

    // 多数派を判定
    const fullwidthCount = numbers.filter(n => n.isFullwidth).reduce((sum, n) => sum + n.value.length, 0);
    const halfwidthCount = numbers.filter(n => !n.isFullwidth).reduce((sum, n) => sum + n.value.length, 0);
    const dominantIsFullwidth = fullwidthCount > halfwidthCount;

    // 少数派を警告
    for (const num of numbers) {
      if (num.isFullwidth !== dominantIsFullwidth) {
        const suggestion = num.isFullwidth
          ? this.toHalfwidth(num.value)
          : this.toFullwidth(num.value);

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: num.index },
            end: { line: 0, character: num.index + num.value.length }
          },
          message: `数字「${num.value}」は${num.isFullwidth ? '全角' : '半角'}ですが、文書内では${dominantIsFullwidth ? '全角' : '半角'}が多く使用されています。表記を統一することを推奨します。`,
          code: 'number-width-mix',
          ruleName: this.name,
          suggestions: [`「${suggestion}」に変更して統一する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

/**
 * Alphabet Width Rule
 * 全角と半角アルファベットの混在を検出する
 * Feature: advanced-grammar-rules
 * 要件: 7.1, 7.2, 7.3, 7.4, 7.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  WidthInconsistency
} from '../../../../shared/src/advancedTypes';

/**
 * 全角アルファベットパターン
 */
const FULLWIDTH_ALPHA_REGEX = /[Ａ-Ｚａ-ｚ]+/g;

/**
 * 半角アルファベットパターン
 */
const HALFWIDTH_ALPHA_REGEX = /[A-Za-z]+/g;

/**
 * 全角半角混在検出ルール
 */
export class AlphabetWidthRule implements AdvancedGrammarRule {
  name = 'alphabet-width';
  description = '全角と半角アルファベットの混在を検出します';

  /**
   * テキスト内の全角アルファベットを検出
   */
  findFullwidthAlpha(text: string): Array<{ text: string; index: number }> {
    const results: Array<{ text: string; index: number }> = [];
    FULLWIDTH_ALPHA_REGEX.lastIndex = 0;
    let match;
    while ((match = FULLWIDTH_ALPHA_REGEX.exec(text)) !== null) {
      results.push({ text: match[0], index: match.index });
    }
    return results;
  }

  /**
   * テキスト内の半角アルファベットを検出
   */
  findHalfwidthAlpha(text: string): Array<{ text: string; index: number }> {
    const results: Array<{ text: string; index: number }> = [];
    HALFWIDTH_ALPHA_REGEX.lastIndex = 0;
    let match;
    while ((match = HALFWIDTH_ALPHA_REGEX.exec(text)) !== null) {
      results.push({ text: match[0], index: match.index });
    }
    return results;
  }

  /**
   * 支配的な幅（全角/半角）を判定
   */
  getDominantWidth(text: string): 'full' | 'half' {
    const fullwidthCount = (text.match(FULLWIDTH_ALPHA_REGEX) || []).join('').length;
    const halfwidthCount = (text.match(HALFWIDTH_ALPHA_REGEX) || []).join('').length;
    return fullwidthCount > halfwidthCount ? 'full' : 'half';
  }

  /**
   * 全角を半角に変換
   */
  toHalfwidth(text: string): string {
    return text.replace(/[Ａ-Ｚａ-ｚ]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;

    const fullwidth = this.findFullwidthAlpha(text);
    const halfwidth = this.findHalfwidthAlpha(text);

    // 両方存在する場合のみ混在として検出
    if (fullwidth.length > 0 && halfwidth.length > 0) {
      const dominantWidth = this.getDominantWidth(text);

      // 少数派の幅をエラーとして報告
      const minorityItems = dominantWidth === 'half' ? fullwidth : halfwidth;

      for (const item of minorityItems) {
        const suggestion = dominantWidth === 'half'
          ? this.toHalfwidth(item.text)
          : item.text; // 全角優先の場合はそのまま

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: item.index },
            end: { line: 0, character: item.index + item.text.length }
          },
          message: `全角と半角アルファベットが混在しています。「${item.text}」を${dominantWidth === 'half' ? '半角' : '全角'}に統一してください。`,
          code: 'alphabet-width',
          ruleName: this.name,
          suggestions: dominantWidth === 'half' ? [`「${suggestion}」に変更する`] : [`半角「${this.toHalfwidth(item.text)}」に変更する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

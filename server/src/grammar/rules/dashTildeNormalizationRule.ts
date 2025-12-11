/**
 * Dash Tilde Normalization Rule
 * ダッシュチルダ正規化器
 * Feature: remaining-grammar-rules
 * Task: 23. ダッシュチルダ正規化器の実装
 * 要件: 21.1, 21.2, 21.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 範囲を表す記号（正規化対象）
 */
const RANGE_SYMBOLS = [
  '-',    // ハイフンマイナス (U+002D)
  '\u2010', // ハイフン (U+2010)
  '\u2011', // ノンブレーキングハイフン (U+2011)
  '\u2012', // フィギュアダッシュ (U+2012)
  '\u2013', // エンダッシュ (U+2013)
  '\u2014', // エムダッシュ (U+2014)
  '\u2015', // 水平線 (U+2015)
  '\uFF0D', // 全角ハイフンマイナス (U+FF0D)
  '\u301C', // 波ダッシュ (U+301C)
  '\uFF5E', // 全角チルダ (U+FF5E)
  '~',    // チルダ (U+007E)
];

/**
 * 推奨される範囲記号（日本語では波ダッシュまたは全角チルダ）
 */
const RECOMMENDED_SYMBOL = '〜'; // U+301C 波ダッシュ

/**
 * 範囲表現のパターン
 */
interface RangeExpression {
  text: string;
  index: number;
  symbol: string;
  symbolIndex: number;
}

/**
 * ダッシュチルダ正規化器
 */
export class DashTildeNormalizationRule implements AdvancedGrammarRule {
  name = 'dash-tilde-normalization';
  description = 'ダッシュ・チルダの不統一を検出し、統一を提案します';

  /**
   * 範囲記号かどうかを判定
   */
  isRangeSymbol(char: string): boolean {
    return RANGE_SYMBOLS.includes(char);
  }

  /**
   * テキスト内の範囲表現を検出
   */
  findRangeExpressions(text: string): RangeExpression[] {
    const results: RangeExpression[] = [];

    // 数字/時刻 + 記号 + 数字/時刻 のパターンを検出
    // 例: 9:00-18:00, 10-15, 1〜10
    const patterns = [
      // 時刻範囲: HH:MM-HH:MM
      /(\d{1,2}:\d{2})([-−—–〜~～])(\d{1,2}:\d{2})/g,
      // 数字範囲: N-M
      /(\d+)([-−—–〜~～])(\d+)/g,
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const symbol = match[2];

        // 推奨記号以外の場合のみ記録
        if (symbol !== RECOMMENDED_SYMBOL) {
          results.push({
            text: match[0],
            index: match.index,
            symbol,
            symbolIndex: match.index + match[1].length
          });
        }
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);

    // 重複を除去（長いマッチを優先）
    const filtered: RangeExpression[] = [];
    for (const expr of results) {
      const overlapping = filtered.find(
        f => expr.index >= f.index && expr.index < f.index + f.text.length
      );
      if (!overlapping) {
        filtered.push(expr);
      } else if (expr.text.length > overlapping.text.length) {
        const idx = filtered.indexOf(overlapping);
        filtered[idx] = expr;
      }
    }

    return filtered;
  }

  /**
   * 記号名を取得
   */
  getSymbolName(symbol: string): string {
    switch (symbol) {
      case '-': return 'ハイフンマイナス';
      case '\u2013': return 'エンダッシュ';
      case '\u2014': return 'エムダッシュ';
      case '\uFF0D': return '全角ハイフン';
      case '~': return '半角チルダ';
      case '\uFF5E': return '全角チルダ';
      case '〜': return '波ダッシュ';
      default: return 'ダッシュ類';
    }
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const ranges = this.findRangeExpressions(context.documentText);

    for (const range of ranges) {
      const suggestedText = range.text.replace(range.symbol, RECOMMENDED_SYMBOL);

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: range.index },
          end: { line: 0, character: range.index + range.text.length }
        },
        message: `範囲表現「${range.text}」の${this.getSymbolName(range.symbol)}は、波ダッシュ「〜」に統一することを推奨します。`,
        code: 'dash-tilde-normalization',
        ruleName: this.name,
        suggestions: [`「${suggestedText}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

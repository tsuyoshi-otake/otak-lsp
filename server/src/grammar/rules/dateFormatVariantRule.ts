/**
 * Date Format Variant Rule
 * 日付表記バリアントバリデーター
 * Feature: remaining-grammar-rules
 * Task: 22. 日付表記バリアントバリデーターの実装
 * 要件: 20.1, 20.2, 20.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 日付フォーマットの種類
 */
type DateFormatType = 'kanji' | 'slash' | 'hyphen' | 'era';

/**
 * 検出された日付情報
 */
interface DateInfo {
  text: string;
  index: number;
  format: DateFormatType;
}

/**
 * 日付表記バリアントバリデーター
 */
export class DateFormatVariantRule implements AdvancedGrammarRule {
  name = 'date-format-variant';
  description = '日付表記の揺れを検出し、統一を提案します';

  /**
   * テキスト内の日付を検出
   */
  findDates(text: string): DateInfo[] {
    const results: DateInfo[] = [];

    // 漢字形式: 2025年12月11日 or 2025年12月 or 12月11日
    const kanjiPattern = /(\d{4}年\d{1,2}月\d{1,2}日|\d{4}年\d{1,2}月|\d{1,2}月\d{1,2}日)/g;
    let match: RegExpExecArray | null;
    while ((match = kanjiPattern.exec(text)) !== null) {
      // 完全な日付形式のみ検出（年月日が揃っているもの）
      if (match[0].includes('年') && match[0].includes('月') && match[0].includes('日')) {
        results.push({ text: match[0], index: match.index, format: 'kanji' });
      } else if (match[0].includes('年') && match[0].includes('月')) {
        results.push({ text: match[0], index: match.index, format: 'kanji' });
      }
    }

    // スラッシュ形式: 2025/12/11 or 2025/12
    const slashPattern = /(\d{4}\/\d{1,2}\/\d{1,2}|\d{4}\/\d{1,2})/g;
    while ((match = slashPattern.exec(text)) !== null) {
      results.push({ text: match[0], index: match.index, format: 'slash' });
    }

    // ハイフン形式: 2025-12-11 or 2025-12
    const hyphenPattern = /(\d{4}-\d{1,2}-\d{1,2}|\d{4}-\d{1,2})/g;
    while ((match = hyphenPattern.exec(text)) !== null) {
      results.push({ text: match[0], index: match.index, format: 'hyphen' });
    }

    // 和暦形式: 令和7年 or 平成31年 etc.
    const eraPattern = /(令和|平成|昭和|大正|明治)\d{1,2}年(\d{1,2}月)?(\d{1,2}日)?/g;
    while ((match = eraPattern.exec(text)) !== null) {
      results.push({ text: match[0], index: match.index, format: 'era' });
    }

    // インデックス順にソートし、重複を除去
    results.sort((a, b) => a.index - b.index);
    const filtered: DateInfo[] = [];
    for (const date of results) {
      const overlapping = filtered.find(
        f => date.index >= f.index && date.index < f.index + f.text.length
      );
      if (!overlapping) {
        filtered.push(date);
      } else if (date.text.length > overlapping.text.length) {
        const idx = filtered.indexOf(overlapping);
        filtered[idx] = date;
      }
    }

    return filtered;
  }

  /**
   * フォーマット名を日本語で取得
   */
  getFormatName(format: DateFormatType): string {
    switch (format) {
      case 'kanji': return '漢字形式（例: 2025年12月11日）';
      case 'slash': return 'スラッシュ形式（例: 2025/12/11）';
      case 'hyphen': return 'ハイフン形式（例: 2025-12-11）';
      case 'era': return '和暦形式（例: 令和7年）';
    }
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const dates = this.findDates(context.documentText);

    // 日付が2つ未満なら統一は不要
    if (dates.length < 2) {
      return diagnostics;
    }

    // フォーマットの統計を取る
    const formatCounts = new Map<DateFormatType, number>();
    for (const date of dates) {
      formatCounts.set(date.format, (formatCounts.get(date.format) || 0) + 1);
    }

    // 複数のフォーマットが存在するかチェック
    if (formatCounts.size <= 1) {
      return diagnostics;
    }

    // 最も多く使用されているフォーマットを特定
    let dominantFormat: DateFormatType = 'kanji';
    let maxCount = 0;
    for (const [format, count] of formatCounts) {
      if (count > maxCount) {
        maxCount = count;
        dominantFormat = format;
      }
    }

    // 少数派のフォーマットを警告
    for (const date of dates) {
      if (date.format !== dominantFormat) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: date.index },
            end: { line: 0, character: date.index + date.text.length }
          },
          message: `日付「${date.text}」は${this.getFormatName(date.format)}ですが、文書内では${this.getFormatName(dominantFormat)}が多く使用されています。表記を統一することを推奨します。`,
          code: 'date-format-variant',
          ruleName: this.name,
          suggestions: [`${this.getFormatName(dominantFormat)}に統一する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

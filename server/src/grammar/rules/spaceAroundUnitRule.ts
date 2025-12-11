/**
 * Space Around Unit Rule
 * スペース単位チェッカー
 * Feature: remaining-grammar-rules
 * Task: 20. スペース単位チェッカーの実装
 * 要件: 18.1, 18.2, 18.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 英字単位リスト（数字との間にスペースが必要）
 */
const ENGLISH_UNITS: Set<string> = new Set([
  // コンピュータ関連
  'KB', 'MB', 'GB', 'TB', 'PB',
  'kb', 'mb', 'gb', 'tb', 'pb',
  'kB', 'KiB', 'MiB', 'GiB', 'TiB',
  'Hz', 'kHz', 'MHz', 'GHz', 'THz',
  'bps', 'Kbps', 'Mbps', 'Gbps',
  'fps',
  // 物理単位
  'kg', 'g', 'mg',
  'km', 'm', 'cm', 'mm',
  'L', 'mL', 'ml',
  's', 'ms', 'ns',
  'W', 'kW', 'MW',
  'V', 'mV', 'kV',
  'A', 'mA',
  'dB',
  '%',
  // 温度
  'K',
]);

/**
 * 英字プレフィックスリスト（後ろに数字が来るもの）
 */
const ENGLISH_PREFIXES: Set<string> = new Set([
  'Version',
  'version',
  'Ver',
  'ver',
  'v',
  'V',
  'Rev',
  'rev',
  'No',
  'no',
  'Vol',
  'vol',
  'Chapter',
  'chapter',
  'Ch',
  'ch',
  'Section',
  'section',
  'Sec',
  'sec',
  'Page',
  'page',
  'P',
  'p',
]);

/**
 * スペース単位チェッカー
 */
export class SpaceAroundUnitRule implements AdvancedGrammarRule {
  name = 'space-around-unit';
  description = '英字・数字・単位間のスペースの過不足を検出します';

  /**
   * 数字+単位のパターンを検出（スペースなし）
   */
  findNumberUnitWithoutSpace(text: string): Array<{ match: string; index: number; suggestion: string }> {
    const results: Array<{ match: string; index: number; suggestion: string }> = [];

    // 数字+英字単位のパターン（スペースなし）
    const pattern = /(\d+\.?\d*)([A-Za-z]+)/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const number = match[1];
      const unit = match[2];

      // 単位リストに含まれているかチェック
      if (ENGLISH_UNITS.has(unit)) {
        results.push({
          match: match[0],
          index: match.index,
          suggestion: `${number} ${unit}`
        });
      }
    }

    return results;
  }

  /**
   * プレフィックス+数字のパターンを検出（スペースなし）
   */
  findPrefixNumberWithoutSpace(text: string): Array<{ match: string; index: number; suggestion: string }> {
    const results: Array<{ match: string; index: number; suggestion: string }> = [];

    // プレフィックス+数字のパターン（スペースなし）
    for (const prefix of ENGLISH_PREFIXES) {
      const pattern = new RegExp(`(${prefix})(\\d+\\.?\\d*)`, 'g');
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(text)) !== null) {
        results.push({
          match: match[0],
          index: match.index,
          suggestion: `${match[1]} ${match[2]}`
        });
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    // 数字+単位の検出
    const numberUnitIssues = this.findNumberUnitWithoutSpace(context.documentText);
    for (const issue of numberUnitIssues) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: issue.index },
          end: { line: 0, character: issue.index + issue.match.length }
        },
        message: `「${issue.match}」は数字と単位の間にスペースを入れることを推奨します。`,
        code: 'space-around-unit',
        ruleName: this.name,
        suggestions: [`「${issue.suggestion}」に変更する`]
      }));
    }

    // プレフィックス+数字の検出
    const prefixNumberIssues = this.findPrefixNumberWithoutSpace(context.documentText);
    for (const issue of prefixNumberIssues) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: issue.index },
          end: { line: 0, character: issue.index + issue.match.length }
        },
        message: `「${issue.match}」は英字と数字の間にスペースを入れることを推奨します。`,
        code: 'space-around-unit',
        ruleName: this.name,
        suggestions: [`「${issue.suggestion}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

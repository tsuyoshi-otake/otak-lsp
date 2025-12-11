/**
 * MissingSubjectRule
 * 主語の欠如を検出する
 * Feature: remaining-grammar-rules
 * 要件: 2.1, 2.2, 2.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  MissingSubject
} from '../../../../shared/src/advancedTypes';

/**
 * 主語が必要な文パターン
 * 短い文で主語がなく、文脈から推測困難なもの
 */
const MISSING_SUBJECT_PATTERNS: RegExp[] = [
  /^昨日、[^。]+ました。$/,
  /^今日、[^。]+ました。$/,
  /^明日、[^。]+ます。$/,
  /^[^。]{0,10}、[^は][^。]*ました。$/
];

/**
 * 主語欠如検出ルール
 */
export class MissingSubjectRule implements AdvancedGrammarRule {
  name = 'missing-subject';
  description = '主語が欠如している文を検出します';

  /**
   * テキストから主語欠如を検出
   * @param text テキスト
   * @returns 検出された主語欠如のリスト
   */
  detectMissingSubject(text: string): MissingSubject[] {
    const results: MissingSubject[] = [];

    // 文ごとに分割して検査
    const sentences = text.split(/(?<=[。！？!?])/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      // 短い文で主語指標（は、が）がない場合
      if (trimmed.length < 25 &&
          !trimmed.includes('は') &&
          !trimmed.includes('が') &&
          (trimmed.endsWith('ました。') ||
           trimmed.endsWith('ます。') ||
           trimmed.endsWith('です。') ||
           trimmed.endsWith('かったです。'))) {

        const index = text.indexOf(trimmed);
        results.push({
          sentence: null as any, // Simplified for pattern-based detection
          verbToken: null as any,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + trimmed.length }
          },
          suggestion: '主語を明示することを検討してください'
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
    const errors = this.detectMissingSubject(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `主語が明示されていない可能性があります。${error.suggestion}`,
        code: 'missing-subject',
        ruleName: this.name,
        suggestions: ['「私は」「彼は」などの主語を追加']
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
    return config.enableMissingSubject;
  }
}

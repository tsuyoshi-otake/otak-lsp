/**
 * HonorificErrorRule
 * 敬語の誤用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 5.1, 5.2, 5.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  HonorificError
} from '../../../../shared/src/advancedTypes';

/**
 * 二重敬語パターン
 */
const DOUBLE_HONORIFIC_PATTERNS: Map<string, string> = new Map([
  ['おっしゃられ', 'おっしゃい'],
  ['ご覧になられ', 'ご覧にな'],
  ['お見えになられ', 'お見えにな'],
  ['お越しになられ', 'お越しにな'],
  ['お帰りになられ', 'お帰りにな'],
  ['お召し上がりになられ', 'お召し上がりにな'],
  ['ご利用になられ', 'ご利用にな'],
  ['お読みになられ', 'お読みにな'],
  ['お書きになられ', 'お書きにな'],
  ['お聞きになられ', 'お聞きにな']
]);

/**
 * 敬語の誤用パターン
 */
const HONORIFIC_MISUSE_PATTERNS: Map<string, { correct: string; explanation: string }> = new Map([
  ['お客様がおっしゃられました', {
    correct: 'お客様がおっしゃいました',
    explanation: '「おっしゃる」はすでに尊敬語なので「られ」は不要です'
  }],
  ['ご覧になられる', {
    correct: 'ご覧になる',
    explanation: '「ご覧になる」はすでに尊敬語なので「られ」は不要です'
  }],
  ['部長がお見えになられる', {
    correct: '部長がお見えになる',
    explanation: '「お見えになる」はすでに尊敬語なので「られ」は不要です'
  }],
  ['お越しになられました', {
    correct: 'お越しになりました',
    explanation: '「お越しになる」はすでに尊敬語なので「られ」は不要です'
  }],
  ['お帰りになられました', {
    correct: 'お帰りになりました',
    explanation: '「お帰りになる」はすでに尊敬語なので「られ」は不要です'
  }]
]);

/**
 * 敬語誤用検出ルール
 */
export class HonorificErrorRule implements AdvancedGrammarRule {
  name = 'honorific-error';
  description = '敬語の誤用（二重敬語など）を検出します';

  /**
   * テキストから敬語の誤用を検出
   * @param text テキスト
   * @returns 検出された敬語エラーのリスト
   */
  detectHonorificErrors(text: string): HonorificError[] {
    const results: HonorificError[] = [];

    // 二重敬語パターンの検出
    for (const [pattern, correction] of DOUBLE_HONORIFIC_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          expression: pattern,
          errorType: 'double-honorific',
          correction: correction,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          }
        });
        index = text.indexOf(pattern, index + 1);
      }
    }

    // 敬語誤用パターンの検出
    for (const [pattern, info] of HONORIFIC_MISUSE_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        // 既に検出済みでないか確認
        const alreadyDetected = results.some(r =>
          r.range.start.character === index
        );

        if (!alreadyDetected) {
          results.push({
            expression: pattern,
            errorType: 'double-honorific',
            correction: info.correct,
            range: {
              start: { line: 0, character: index },
              end: { line: 0, character: index + pattern.length }
            }
          });
        }
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
    const errors = this.detectHonorificErrors(context.documentText);

    for (const error of errors) {
      const message = error.errorType === 'double-honorific'
        ? `二重敬語「${error.expression}」が検出されました。「${error.correction}」が正しい形式です。`
        : `敬語の誤用「${error.expression}」が検出されました。`;

      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message,
        code: 'honorific-error',
        ruleName: this.name,
        suggestions: [error.correction]
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
    return config.enableHonorificError;
  }
}

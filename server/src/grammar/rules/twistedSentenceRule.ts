/**
 * TwistedSentenceRule
 * ねじれ文を検出する
 * Feature: remaining-grammar-rules
 * 要件: 3.1, 3.2, 3.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  TwistedSentence
} from '../../../../shared/src/advancedTypes';

/**
 * ねじれ文パターンと修正提案
 */
const TWISTED_SENTENCE_PATTERNS: Map<string, { suggestion: string; explanation: string }> = new Map([
  ['私の夢は医者になりたいです', {
    suggestion: '私の夢は医者になることです',
    explanation: '主語「夢は」と述語「なりたい」が対応していません'
  }],
  ['彼の特技は絵を上手です', {
    suggestion: '彼の特技は絵を描くことです',
    explanation: '主語「特技は」と述語「上手です」が対応していません'
  }],
  ['私の趣味は映画を見たいです', {
    suggestion: '私の趣味は映画を見ることです',
    explanation: '主語「趣味は」と述語「見たい」が対応していません'
  }],
  ['私の目標は成功したいです', {
    suggestion: '私の目標は成功することです',
    explanation: '主語「目標は」と述語「したい」が対応していません'
  }],
  ['私の希望は合格したいです', {
    suggestion: '私の希望は合格することです',
    explanation: '主語「希望は」と述語「したい」が対応していません'
  }]
]);

/**
 * ねじれ文検出用の正規表現パターン
 */
const TWISTED_PATTERNS_REGEX: Array<{ pattern: RegExp; explanation: string }> = [
  {
    pattern: /私の(夢|目標|希望|願い)は[^。]*たいです/,
    explanation: '「〜は」と「〜たいです」が対応していません。「〜は〜ことです」の形式を検討してください'
  },
  {
    pattern: /[^の]の(特技|得意|長所)は[^を]*を[^。]*です/,
    explanation: '「〜は」と述語が対応していません。文の構造を見直してください'
  }
];

/**
 * ねじれ文検出ルール
 */
export class TwistedSentenceRule implements AdvancedGrammarRule {
  name = 'twisted-sentence';
  description = 'ねじれ文（主語と述語の不対応）を検出します';

  /**
   * テキストからねじれ文を検出
   * @param text テキスト
   * @returns 検出されたねじれ文のリスト
   */
  detectTwistedSentences(text: string): TwistedSentence[] {
    const results: TwistedSentence[] = [];

    // パターンマッチング
    for (const [pattern, info] of TWISTED_SENTENCE_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          sentence: null as any,
          subjectPart: pattern.split('は')[0] + 'は',
          predicatePart: pattern.split('は')[1] || '',
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          },
          suggestions: [info.suggestion]
        });
        index = text.indexOf(pattern, index + 1);
      }
    }

    // 正規表現パターンマッチング
    for (const { pattern, explanation } of TWISTED_PATTERNS_REGEX) {
      const match = text.match(pattern);
      if (match && match.index !== undefined) {
        // 既に同じ位置で検出済みでないか確認
        const alreadyDetected = results.some(r =>
          r.range.start.character <= match.index! &&
          r.range.end.character >= match.index! + match[0].length
        );

        if (!alreadyDetected) {
          results.push({
            sentence: null as any,
            subjectPart: match[0],
            predicatePart: '',
            range: {
              start: { line: 0, character: match.index },
              end: { line: 0, character: match.index + match[0].length }
            },
            suggestions: [explanation]
          });
        }
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
    const errors = this.detectTwistedSentences(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `ねじれ文が検出されました。主語と述語の対応を確認してください。`,
        code: 'twisted-sentence',
        ruleName: this.name,
        suggestions: error.suggestions
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
    return config.enableTwistedSentence;
  }
}

/**
 * AmbiguousDemonstrativeRule
 * 曖昧な指示語を検出する
 * Feature: remaining-grammar-rules
 * 要件: 8.1, 8.2, 8.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  AmbiguousDemonstrative
} from '../../../../shared/src/advancedTypes';

/**
 * 曖昧な指示語パターン
 */
const AMBIGUOUS_DEMONSTRATIVE_PATTERNS: Map<string, string> = new Map([
  ['それは問題だ。しかし、それも', '複数の「それ」が異なる対象を指している可能性があります'],
  ['これについては、あれを参照', '「これ」「あれ」の指す対象が不明確です'],
  ['それについて、それを', '「それ」が繰り返し使用され、指す対象が曖昧です'],
  ['あれは重要だ。あれも', '複数の「あれ」の指す対象を明確にしてください'],
  ['これが正しい。これは', '「これ」が繰り返し使用され、指す対象が曖昧です']
]);

/**
 * 単独の曖昧指示語パターン（文頭で先行詞がない場合）
 */
const STANDALONE_DEMONSTRATIVE_PATTERNS: RegExp[] = [
  /^それは[^。]*問題/,
  /^これは[^。]*重要/,
  /^あれは[^。]*必要/
];

/**
 * 曖昧な指示語検出ルール
 */
export class AmbiguousDemonstrativeRule implements AdvancedGrammarRule {
  name = 'ambiguous-demonstrative';
  description = '曖昧な指示語の使用を検出します';

  /**
   * テキストから曖昧な指示語を検出
   * @param text テキスト
   * @returns 検出された曖昧な指示語のリスト
   */
  detectAmbiguousDemonstratives(text: string): AmbiguousDemonstrative[] {
    const results: AmbiguousDemonstrative[] = [];

    // パターンマッチング
    for (const [pattern, explanation] of AMBIGUOUS_DEMONSTRATIVE_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          demonstrative: pattern,
          possibleReferents: [],
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          },
          suggestion: explanation
        });
        index = text.indexOf(pattern, index + 1);
      }
    }

    // 文頭の指示語チェック（先行詞がない可能性）
    for (const pattern of STANDALONE_DEMONSTRATIVE_PATTERNS) {
      const match = text.match(pattern);
      if (match && match.index === 0) {
        results.push({
          demonstrative: match[0],
          possibleReferents: [],
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: match[0].length }
          },
          suggestion: '文頭の指示語には先行詞がありません。具体的な名詞を使用することを検討してください'
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
    const errors = this.detectAmbiguousDemonstratives(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `曖昧な指示語が検出されました。${error.suggestion}`,
        code: 'ambiguous-demonstrative',
        ruleName: this.name,
        suggestions: ['具体的な名詞で置き換える']
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
    return config.enableAmbiguousDemonstrative;
  }
}

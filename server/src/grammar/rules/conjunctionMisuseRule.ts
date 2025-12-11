/**
 * ConjunctionMisuseRule
 * 接続詞の誤用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 11.1, 11.2, 11.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  ConjunctionMisuse
} from '../../../../shared/src/advancedTypes';

/**
 * 接続詞誤用パターン
 */
const CONJUNCTION_MISUSE_PATTERNS: Map<string, { correct: string; explanation: string }> = new Map([
  ['晴れた。しかし、外出した', {
    correct: '晴れた。そこで、外出した',
    explanation: '「しかし」は逆接の接続詞です。天気と外出は順接の関係では「そこで」「だから」が適切です'
  }],
  ['忙しい。だから、暇だ', {
    correct: '忙しい。しかし、暇だ',
    explanation: '「だから」は順接の接続詞です。矛盾する内容には「しかし」「けれども」が適切です'
  }],
  ['雨だ。だから、傘を持たない', {
    correct: '雨だ。しかし、傘を持たない',
    explanation: '「だから」は順接の接続詞です。逆の行動には「しかし」「けれども」が適切です'
  }],
  ['成功した。しかし、嬉しい', {
    correct: '成功した。だから、嬉しい',
    explanation: '「しかし」は逆接の接続詞です。成功と喜びは順接の関係では「だから」「そのため」が適切です'
  }]
]);

/**
 * 接続詞の種類と意味
 */
const CONJUNCTION_TYPES: Map<string, 'adversative' | 'additive' | 'causal' | 'sequential'> = new Map([
  ['しかし', 'adversative'],
  ['けれども', 'adversative'],
  ['ところが', 'adversative'],
  ['でも', 'adversative'],
  ['だが', 'adversative'],
  ['だから', 'causal'],
  ['そのため', 'causal'],
  ['したがって', 'causal'],
  ['ゆえに', 'causal'],
  ['そして', 'additive'],
  ['また', 'additive'],
  ['さらに', 'additive'],
  ['それから', 'sequential'],
  ['次に', 'sequential'],
  ['そこで', 'sequential']
]);

/**
 * 接続詞誤用検出ルール
 */
export class ConjunctionMisuseRule implements AdvancedGrammarRule {
  name = 'conjunction-misuse';
  description = '接続詞の誤用を検出します';

  /**
   * テキストから接続詞の誤用を検出
   * @param text テキスト
   * @returns 検出された接続詞誤用のリスト
   */
  detectConjunctionMisuse(text: string): ConjunctionMisuse[] {
    const results: ConjunctionMisuse[] = [];

    // パターンマッチング
    for (const [pattern, info] of CONJUNCTION_MISUSE_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        // 接続詞を特定
        let conjunction = '';
        for (const conj of CONJUNCTION_TYPES.keys()) {
          if (pattern.includes(conj)) {
            conjunction = conj;
            break;
          }
        }

        results.push({
          conjunction,
          expectedType: CONJUNCTION_TYPES.get(conjunction) || 'adversative',
          actualRelation: info.explanation,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          },
          suggestion: info.correct
        });
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
    const errors = this.detectConjunctionMisuse(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `接続詞「${error.conjunction}」の使い方が文脈に合わない可能性があります。${error.actualRelation}`,
        code: 'conjunction-misuse',
        ruleName: this.name,
        suggestions: [error.suggestion]
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
    return config.enableConjunctionMisuse;
  }
}

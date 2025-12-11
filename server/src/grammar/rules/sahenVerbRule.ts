/**
 * SahenVerbRule
 * サ変動詞の誤用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 1.1, 1.2, 1.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  SahenVerbError
} from '../../../../shared/src/advancedTypes';

/**
 * サ変動詞パターン（「〜をする」が冗長になりやすいもの）
 */
const SAHEN_VERB_PATTERNS: Map<string, string> = new Map([
  ['勉強をする', '勉強する'],
  ['料理をする', '料理する'],
  ['掃除をする', '掃除する'],
  ['洗濯をする', '洗濯する'],
  ['散歩をする', '散歩する'],
  ['運動をする', '運動する'],
  ['買物をする', '買物する'],
  ['買い物をする', '買い物する'],
  ['仕事をする', '仕事する'],
  ['練習をする', '練習する'],
  ['勉強をし', '勉強し'],
  ['料理をし', '料理し'],
  ['掃除をし', '掃除し'],
  ['洗濯をし', '洗濯し'],
  ['散歩をし', '散歩し'],
  ['運動をし', '運動し'],
  ['買物をし', '買物し'],
  ['買い物をし', '買い物し'],
  ['仕事をし', '仕事し'],
  ['練習をし', '練習し']
]);

/**
 * サ変動詞誤用検出ルール
 */
export class SahenVerbRule implements AdvancedGrammarRule {
  name = 'sahen-verb';
  description = 'サ変動詞の「〜をする」パターンを検出します';

  /**
   * テキストからサ変動詞の誤用を検出
   * @param text テキスト
   * @returns 検出されたサ変動詞エラーのリスト
   */
  detectSahenVerbErrors(text: string): SahenVerbError[] {
    const results: SahenVerbError[] = [];

    for (const [pattern, suggestion] of SAHEN_VERB_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          pattern,
          unnecessaryParticle: 'を',
          suggestion,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          }
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
    const errors = this.detectSahenVerbErrors(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `サ変動詞「${error.pattern}」の「${error.unnecessaryParticle}」は省略できます。「${error.suggestion}」への簡潔化を検討してください。`,
        code: 'sahen-verb',
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
    return config.enableSahenVerb;
  }
}

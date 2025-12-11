/**
 * AdverbAgreementRule
 * 副詞の呼応の誤りを検出する
 * Feature: remaining-grammar-rules
 * 要件: 6.1, 6.2, 6.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  AdverbAgreementError
} from '../../../../shared/src/advancedTypes';

/**
 * 副詞と呼応する文末表現のルール
 */
interface AdverbAgreementPattern {
  adverb: string;
  requiredEndings: string[];
  forbiddenEndings: string[];
  correctExample: string;
}

const ADVERB_AGREEMENT_RULES: AdverbAgreementPattern[] = [
  {
    adverb: '決して',
    requiredEndings: ['ない', 'ません', 'なかった', 'ませんでした'],
    forbiddenEndings: ['ます'],
    correctExample: '決して行きません'
  },
  {
    adverb: '全く',
    requiredEndings: ['ない', 'ません', 'なかった', 'ませんでした'],
    forbiddenEndings: ['ます'],
    correctExample: '全く分かりません'
  },
  {
    adverb: '必ずしも',
    requiredEndings: ['ない', 'ません', 'とは限らない', 'わけではない'],
    forbiddenEndings: ['ます', 'です'],
    correctExample: '必ずしも正しいとは限らない'
  },
  {
    adverb: 'たぶん',
    requiredEndings: ['だろう', 'でしょう', 'かもしれない', 'と思う'],
    forbiddenEndings: ['ません'],
    correctExample: 'たぶん行くでしょう'
  },
  {
    adverb: 'おそらく',
    requiredEndings: ['だろう', 'でしょう', 'かもしれない', 'と思われる'],
    forbiddenEndings: ['ません'],
    correctExample: 'おそらく正しいでしょう'
  },
  {
    adverb: 'もし',
    requiredEndings: ['なら', 'たら', 'ば', 'と'],
    forbiddenEndings: ['ない'],
    correctExample: 'もし晴れたら行きます'
  }
];

/**
 * 副詞呼応エラー検出ルール
 */
export class AdverbAgreementRule implements AdvancedGrammarRule {
  name = 'adverb-agreement';
  description = '副詞と述語の呼応の誤りを検出します';

  /**
   * テキストから副詞呼応エラーを検出
   * @param text テキスト
   * @returns 検出された副詞呼応エラーのリスト
   */
  detectAdverbAgreementErrors(text: string): AdverbAgreementError[] {
    const results: AdverbAgreementError[] = [];

    // 文ごとに分割
    const sentences = text.split(/(?<=[。！？!?])/);

    for (const sentence of sentences) {
      const trimmed = sentence.trim();
      if (!trimmed) continue;

      for (const rule of ADVERB_AGREEMENT_RULES) {
        if (trimmed.includes(rule.adverb)) {
          // 禁止されている文末表現をチェック
          for (const forbidden of rule.forbiddenEndings) {
            // 文末が禁止パターンで終わっているか確認
            const sentenceWithoutPunctuation = trimmed.replace(/[。！？!?]$/, '');
            if (sentenceWithoutPunctuation.endsWith(forbidden)) {
              const index = text.indexOf(trimmed);
              results.push({
                adverb: rule.adverb,
                expectedEnding: rule.requiredEndings.join('、'),
                actualEnding: forbidden,
                range: {
                  start: { line: 0, character: index },
                  end: { line: 0, character: index + trimmed.length }
                },
                suggestion: rule.correctExample
              });
              break;
            }
          }
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
    const errors = this.detectAdverbAgreementErrors(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `副詞「${error.adverb}」は「${error.expectedEnding}」などと呼応します。現在の文末「${error.actualEnding}」との呼応を確認してください。`,
        code: 'adverb-agreement',
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
    return config.enableAdverbAgreement;
  }
}

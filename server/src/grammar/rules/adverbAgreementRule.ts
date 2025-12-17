/**
 * AdverbAgreementRule
 * 副詞の呼応の誤りを検出する
 * Feature: remaining-grammar-rules
 * 要件: 6.1, 6.2, 6.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  AdverbAgreementError,
  Sentence
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
   * 文から副詞呼応エラーを検出
   * @param sentence 文
   * @returns 検出された副詞呼応エラーのリスト
   */
  detectAdverbAgreementErrors(sentence: Sentence): AdverbAgreementError[] {
    const results: AdverbAgreementError[] = [];

    const trimmed = sentence.text.trim();
    if (!trimmed) {
      return results;
    }

    // 文末記号を除外して文末表現を判定
    const sentenceWithoutPunctuation = trimmed.replace(/[。！？!?]$/, '');

    for (const rule of ADVERB_AGREEMENT_RULES) {
      const adverbTokens = sentence.tokens.filter((token) =>
        token.surface === rule.adverb && token.isAdverb()
      );
      if (adverbTokens.length === 0) {
        continue;
      }

      // 禁止されている文末表現をチェック
      for (const forbidden of rule.forbiddenEndings) {
        if (sentenceWithoutPunctuation.endsWith(forbidden)) {
          const adverbToken = adverbTokens[0];
          results.push({
            adverb: rule.adverb,
            expectedEnding: rule.requiredEndings.join('、'),
            actualEnding: forbidden,
            range: {
              start: { line: 0, character: adverbToken.start },
              end: { line: 0, character: adverbToken.end }
            },
            suggestion: rule.correctExample
          });
          break;
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

    for (const sentence of context.sentences) {
      const errors = this.detectAdverbAgreementErrors(sentence);

      for (const error of errors) {
        diagnostics.push(new AdvancedDiagnostic({
          range: error.range,
          message: `副詞「${error.adverb}」は「${error.expectedEnding}」などと呼応します。現在の文末「${error.actualEnding}」との呼応を確認してください。`,
          code: 'adverb-agreement',
          ruleName: this.name,
          suggestions: [error.suggestion]
        }));
      }
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

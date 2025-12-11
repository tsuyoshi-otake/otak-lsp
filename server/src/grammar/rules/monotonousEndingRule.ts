/**
 * Monotonous Ending Rule
 * 文末表現の単調さを検出する
 * Feature: additional-grammar-rules
 * 要件: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence,
  MonotonousEnding
} from '../../../../shared/src/advancedTypes';

/**
 * 文末表現パターンとそのバリエーション
 */
const ENDING_PATTERNS: RegExp[] = [
  /です[。！？!?]?$/,
  /ます[。！？!?]?$/,
  /である[。！？!?]?$/,
  /だ[。！？!?]?$/,
  /ました[。！？!?]?$/,
  /た[。！？!?]?$/,
  /でした[。！？!?]?$/,
  /だった[。！？!?]?$/
];

/**
 * 文末表現のバリエーション提案
 */
const ENDING_VARIATIONS: Map<string, string[]> = new Map([
  ['です', ['である', 'だ', 'になります', 'となります']],
  ['ます', ['る', 'である', 'だ', 'になる', 'となる']],
  ['である', ['です', 'だ', 'になる', 'となる']],
  ['だ', ['です', 'である', 'になる', 'となる']],
  ['ました', ['た', 'だった', 'でした']],
  ['た', ['ました', 'だった', 'でした']],
  ['でした', ['ました', 'た', 'だった']],
  ['だった', ['でした', 'た', 'ました']]
]);

/**
 * 文末表現の単調さ検出ルール
 */
export class MonotonousEndingRule implements AdvancedGrammarRule {
  name = 'monotonous-ending';
  description = '文末表現の単調さを検出します';

  /**
   * 文の文末表現を抽出
   */
  private extractEnding(sentence: Sentence): string | null {
    const text = sentence.text.trim().replace(/[。！？!?]$/, '');

    for (const pattern of ENDING_PATTERNS) {
      if (pattern.test(sentence.text)) {
        // 文末表現を抽出
        const match = sentence.text.match(/(です|ます|である|だった|でした|ました|だ|た)[。！？!?]?$/);
        if (match) {
          return match[1];
        }
      }
    }

    return null;
  }

  /**
   * 文末表現の単調さを検出
   * @param sentences 文のリスト
   * @param threshold 閾値
   * @returns 検出された単調さのリスト
   */
  detectMonotonousEndings(sentences: Sentence[], threshold: number): MonotonousEnding[] {
    const results: MonotonousEnding[] = [];

    if (sentences.length < threshold) {
      return results;
    }

    let currentEnding: string | null = null;
    let consecutiveCount = 0;
    let consecutiveSentences: Sentence[] = [];

    for (const sentence of sentences) {
      const ending = this.extractEnding(sentence);

      if (ending === currentEnding) {
        consecutiveCount++;
        consecutiveSentences.push(sentence);
      } else {
        // 前の連続をチェック
        if (currentEnding && consecutiveCount >= threshold) {
          results.push(this.createMonotonousEnding(
            currentEnding,
            consecutiveSentences,
            consecutiveCount
          ));
        }

        // リセット
        currentEnding = ending;
        consecutiveCount = 1;
        consecutiveSentences = [sentence];
      }
    }

    // 最後の連続をチェック
    if (currentEnding && consecutiveCount >= threshold) {
      results.push(this.createMonotonousEnding(
        currentEnding,
        consecutiveSentences,
        consecutiveCount
      ));
    }

    return results;
  }

  /**
   * MonotonousEnding情報を作成
   */
  private createMonotonousEnding(
    ending: string,
    sentences: Sentence[],
    count: number
  ): MonotonousEnding {
    const firstSentence = sentences[0];
    const lastSentence = sentences[sentences.length - 1];

    return {
      endingPattern: ending,
      sentences,
      consecutiveCount: count,
      range: {
        start: { line: 0, character: firstSentence.start },
        end: { line: 0, character: lastSentence.end }
      },
      variations: ENDING_VARIATIONS.get(ending) || ['文末表現を変化させてください']
    };
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.monotonousEndingThreshold || 3;
    const monotonousEndings = this.detectMonotonousEndings(context.sentences, threshold);

    for (const ending of monotonousEndings) {
      diagnostics.push(new AdvancedDiagnostic({
        range: ending.range,
        message: `文末「${ending.endingPattern}」が${ending.consecutiveCount}回連続しています（閾値: ${threshold}回）。表現を多様化してください。`,
        code: 'monotonous-ending',
        ruleName: this.name,
        suggestions: ending.variations
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
    return config.enableMonotonousEnding;
  }
}

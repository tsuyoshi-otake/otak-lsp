/**
 * Conjunction Repetition Rule
 * 同じ接続詞の連続使用を検出する
 * Feature: advanced-grammar-rules
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';

/**
 * 一般的な接続詞リスト
 */
const COMMON_CONJUNCTIONS = [
  'しかし', 'また', 'そして', 'それで', 'だから', 'ところが',
  'すると', 'それから', 'さらに', 'ただし', 'なお', 'ちなみに',
  'つまり', '要するに', 'したがって', 'ゆえに', 'なぜなら'
];

/**
 * 接続詞の代替候補
 */
const CONJUNCTION_ALTERNATIVES: Map<string, string[]> = new Map([
  ['しかし', ['ところが', 'けれども', '一方で']],
  ['また', ['さらに', '加えて', 'そのうえ']],
  ['そして', ['それから', 'さらに', '加えて']],
  ['だから', ['したがって', 'よって', 'そのため']],
  ['つまり', ['要するに', '言い換えれば', 'すなわち']]
]);

/**
 * 接続詞連続使用検出ルール
 */
export class ConjunctionRepetitionRule implements AdvancedGrammarRule {
  name = 'conjunction-repetition';
  description = '同じ接続詞の連続使用を検出します';

  /**
   * 文の先頭にある接続詞を取得
   */
  getLeadingConjunction(sentence: Sentence): string | null {
    const text = sentence.text.trim();
    for (const conj of COMMON_CONJUNCTIONS) {
      if (text.startsWith(conj)) {
        return conj;
      }
    }
    return null;
  }

  /**
   * 代替接続詞を取得
   */
  getAlternatives(conjunction: string): string[] {
    return CONJUNCTION_ALTERNATIVES.get(conjunction) || ['別の接続詞'];
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const sentences = context.sentences;

    for (let i = 1; i < sentences.length; i++) {
      const currentConj = this.getLeadingConjunction(sentences[i]);
      const prevConj = this.getLeadingConjunction(sentences[i - 1]);

      if (currentConj && currentConj === prevConj) {
        const alternatives = this.getAlternatives(currentConj);
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: sentences[i].start },
            end: { line: 0, character: sentences[i].start + currentConj.length }
          },
          message: `接続詞「${currentConj}」が連続して使用されています。`,
          code: 'conjunction-repetition',
          ruleName: this.name,
          suggestions: alternatives.map(alt => `「${alt}」に変更する`)
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableConjunctionRepetition;
  }
}

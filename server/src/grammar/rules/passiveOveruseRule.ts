/**
 * PassiveOveruseRule
 * 受身表現の多用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 9.1, 9.2, 9.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  PassiveOveruse,
  Sentence
} from '../../../../shared/src/advancedTypes';
import { isNotEmpty } from '../../utils/arrayUtils';

/**
 * 受身（れる/られる）を表すトークンの原形
 * NOTE: kuromoji は「れ/られ」を助動詞ではなく動詞として返す場合があるため baseForm で判定する。
 */
const PASSIVE_AUX_BASE_FORMS = new Set(['れる', 'られる']);
const PAST_AUX_BASE_FORM = 'た';
const POLITE_AUX_BASE_FORM = 'ます';

/**
 * 受身表現多用検出ルール
 */
export class PassiveOveruseRule implements AdvancedGrammarRule {
  name = 'passive-overuse';
  description = '受身表現の多用を検出します';

  private getPassiveOccurrencesInSentence(
    sentence: Sentence
  ): Array<{ start: number; end: number }> {
    const occurrences: Array<{ start: number; end: number }> = [];
    const tokens = sentence.tokens;
    if (!isNotEmpty(tokens)) {
      return occurrences;
    }

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (!PASSIVE_AUX_BASE_FORMS.has(token.baseForm)) {
        continue;
      }

      const next = tokens[i + 1];
      const nextNext = tokens[i + 2];

      // 受身の過去形: 〜れ + た
      if (next && next.baseForm === PAST_AUX_BASE_FORM) {
        occurrences.push({ start: token.start, end: next.end });
        continue;
      }

      // 受身の丁寧過去: 〜れ + ます + た（「まし」も baseForm は「ます」）
      if (next && nextNext && next.baseForm === POLITE_AUX_BASE_FORM && nextNext.baseForm === PAST_AUX_BASE_FORM) {
        occurrences.push({ start: token.start, end: nextNext.end });
      }
    }

    return occurrences;
  }

  /**
   * 文の列から受身表現の多用を検出（連続する文を対象）
   * @param sentences 文のリスト
   * @param threshold 閾値
   * @returns 検出された受身表現多用のリスト
   */
  detectPassiveOveruse(sentences: Sentence[], threshold: number): PassiveOveruse[] {
    const results: PassiveOveruse[] = [];
    if (!isNotEmpty(sentences)) {
      return results;
    }

    let sequenceStartIndex: number | null = null;
    let sequenceOccurrences: Array<{ start: number; end: number }> = [];

    const flushSequence = (endIndexExclusive: number): void => {
      if (sequenceStartIndex === null) {
        return;
      }
      if (sequenceOccurrences.length < threshold) {
        sequenceStartIndex = null;
        sequenceOccurrences = [];
        return;
      }

      const startSentence = sentences[sequenceStartIndex];
      const endSentence = sentences[endIndexExclusive - 1];
      if (!startSentence || !endSentence) {
        sequenceStartIndex = null;
        sequenceOccurrences = [];
        return;
      }

      results.push({
        passiveExpressions: sequenceOccurrences.map(() => '受身'),
        count: sequenceOccurrences.length,
        threshold,
        range: {
          start: { line: 0, character: startSentence.start },
          end: { line: 0, character: endSentence.end }
        },
        suggestions: ['能動態への書き換えを検討してください']
      });

      sequenceStartIndex = null;
      sequenceOccurrences = [];
    };

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const occurrences = this.getPassiveOccurrencesInSentence(sentence);

      if (occurrences.length === 0) {
        flushSequence(i);
        continue;
      }

      if (sequenceStartIndex === null) {
        sequenceStartIndex = i;
      }
      sequenceOccurrences.push(...occurrences);
    }

    flushSequence(sentences.length);

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
    const threshold = context.config.passiveOveruseThreshold;

    const overuseErrors = this.detectPassiveOveruse(context.sentences, threshold);
    for (const error of overuseErrors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `受身表現が${error.count}回使用されています（閾値: ${error.threshold}回）。能動態への書き換えを検討してください。`,
        code: 'passive-overuse',
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
    return config.enablePassiveOveruse;
  }
}

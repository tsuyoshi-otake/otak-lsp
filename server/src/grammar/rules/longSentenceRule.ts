/**
 * Long Sentence Rule
 * 長すぎる文を検出する
 * Feature: additional-grammar-rules
 * 要件: 5.1, 5.2, 5.3, 5.4
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence,
  LongSentence
} from '../../../../shared/src/advancedTypes';

/**
 * 長すぎる文検出ルール
 */
export class LongSentenceRule implements AdvancedGrammarRule {
  name = 'long-sentence';
  description = '長すぎる文を検出します';

  /**
   * 長すぎる文を検出
   * @param sentences 文のリスト
   * @param threshold 閾値
   * @returns 検出された長文のリスト
   */
  detectLongSentences(sentences: Sentence[], threshold: number): LongSentence[] {
    const results: LongSentence[] = [];

    for (const sentence of sentences) {
      const charCount = sentence.text.length;

      if (charCount > threshold) {
        results.push({
          sentence,
          characterCount: charCount,
          threshold,
          range: {
            start: { line: 0, character: sentence.start },
            end: { line: 0, character: sentence.end }
          },
          splitSuggestions: this.generateSplitSuggestions(sentence.text)
        });
      }
    }

    return results;
  }

  /**
   * 分割提案を生成
   */
  private generateSplitSuggestions(text: string): string[] {
    const suggestions: string[] = [];

    // 読点の位置で分割を提案
    if (text.includes('、')) {
      suggestions.push('読点「、」の位置で文を分割することを検討してください');
    }

    // 接続詞で分割を提案
    const conjunctions = ['そして', 'また', 'しかし', 'したがって', 'なお', 'ただし'];
    for (const conj of conjunctions) {
      if (text.includes(conj)) {
        suggestions.push(`「${conj}」の前後で文を分割することを検討してください`);
        break;
      }
    }

    // 一般的な提案
    suggestions.push('1文を2〜3文に分割して、読みやすくすることを検討してください');
    suggestions.push('主語と述語を明確にして、文の構造を単純化してください');

    return suggestions;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.longSentenceThreshold || 120;
    const longSentences = this.detectLongSentences(context.sentences, threshold);

    for (const longSentence of longSentences) {
      diagnostics.push(new AdvancedDiagnostic({
        range: longSentence.range,
        message: `文が長すぎます（${longSentence.characterCount}文字、閾値: ${threshold}文字）。文の分割を検討してください。`,
        code: 'long-sentence',
        ruleName: this.name,
        suggestions: longSentence.splitSuggestions
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
    return config.enableLongSentence;
  }
}

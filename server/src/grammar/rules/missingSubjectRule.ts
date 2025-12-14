/**
 * MissingSubjectRule
 * 主語の欠如を検出する
 * Feature: remaining-grammar-rules
 * 要件: 2.1, 2.2, 2.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';

/**
 * 主語欠如検出ルール
 */
export class MissingSubjectRule implements AdvancedGrammarRule {
  name = 'missing-subject';
  description = '主語が欠如している文を検出します';

  /**
   * 主語欠如の可能性があるか判定
   */
  private shouldReport(sentenceText: string): boolean {
    const trimmed = sentenceText.trim();
    if (!trimmed) {
      return false;
    }

    // Markdownのコードフェンス行は対象外
    if (/^(\s*(?:>\s*)*)(`{3,}|~{3,})(.*)$/.test(trimmed)) {
      return false;
    }

    // 短い文で主語指標（は、が）がない場合
    if (trimmed.length >= 25) {
      return false;
    }
    if (trimmed.includes('は') || trimmed.includes('が')) {
      return false;
    }

    return (
      trimmed.endsWith('ました。') ||
      trimmed.endsWith('ます。') ||
      trimmed.endsWith('です。') ||
      trimmed.endsWith('かったです。')
    );
  }

  private computeTrimmedOffsets(sentence: Sentence): { startOffset: number; endOffset: number } | null {
    const raw = sentence.text;
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }

    const startInSentence = raw.indexOf(trimmed);
    if (startInSentence < 0) {
      return null;
    }

    const startOffset = sentence.start + startInSentence;
    const endOffset = startOffset + trimmed.length;
    if (endOffset <= startOffset) {
      return null;
    }

    return { startOffset, endOffset };
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(_tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const sentence of context.sentences) {
      if (!this.shouldReport(sentence.text)) {
        continue;
      }

      const offsets = this.computeTrimmedOffsets(sentence);
      if (!offsets) {
        continue;
      }

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: offsets.startOffset },
          end: { line: 0, character: offsets.endOffset }
        },
        message: '主語が明示されていない可能性があります。主語を明示することを検討してください',
        code: 'missing-subject',
        ruleName: this.name,
        suggestions: ['「私は」「彼は」などの主語を追加']
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
    return config.enableMissingSubject;
  }
}

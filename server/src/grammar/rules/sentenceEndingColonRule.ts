/**
 * Sentence Ending Colon Rule
 * 文末のコロン（：）をチェックする
 * Feature: sentence-ending-colon-detection
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3
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
 * 文末コロン検出ルール
 * 日本語文の末尾に全角コロン（：）が使用されている場合に警告を生成する
 */
export class SentenceEndingColonRule implements AdvancedGrammarRule {
  name = 'sentence-ending-colon';
  description = '文末のコロン（：）をチェックします';

  /**
   * 文がコロンで終わるかどうかを判定
   * @param text 文のテキスト
   * @returns 全角コロンで終わる場合true
   */
  private endsWithColon(text: string): boolean {
    // 文末の空白を除去
    const trimmed = text.trim();
    // 全角コロンで終わるかチェック
    // 句読点の後にコロンがある場合も検出
    return /：$/.test(trimmed);
  }

  /**
   * 箇条書き前置き文かどうかを判定
   * 次の行が箇条書き（-、*、数字.）で始まる場合は前置き文と判定
   * @param sentence 文
   * @param documentText ドキュメント全体のテキスト
   * @returns 箇条書き前置き文の場合true
   */
  private isBulletListPrefix(sentence: Sentence, documentText: string): boolean {
    const sentenceEnd = sentence.end;
    const remainingText = documentText.substring(sentenceEnd);

    // 次の行が箇条書きマーカーで始まるかチェック
    // マーカー: -, *, 数字.
    const bulletPattern = /^\s*\n\s*[-*]\s/;
    const numberedPattern = /^\s*\n\s*\d+\.\s/;

    return bulletPattern.test(remainingText) || numberedPattern.test(remainingText);
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
      // 空の文はスキップ
      if (!sentence.text || sentence.text.trim().length === 0) {
        continue;
      }

      // 文末にコロンがあるかチェック
      if (this.endsWithColon(sentence.text)) {
        // 箇条書き前置き文の場合はスキップ
        if (this.isBulletListPrefix(sentence, context.documentText)) {
          continue;
        }

        // コロンの位置を特定
        const trimmed = sentence.text.trim();
        const colonIndex = trimmed.lastIndexOf('：');
        const colonPosition = sentence.start + colonIndex;

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: colonPosition },
            end: { line: 0, character: colonPosition + 1 }
          },
          message: '文末にコロン（：）が使用されています。句点（。）に変更するか、文を続けてください。',
          code: 'sentence-ending-colon',
          ruleName: this.name,
          suggestions: [
            'コロンを句点（。）に変更する',
            '文を続けて完結させる',
            '箇条書きを追加する'
          ]
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
    return config.enableSentenceEndingColon;
  }
}

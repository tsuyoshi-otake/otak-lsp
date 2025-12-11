/**
 * Style Consistency Rule
 * 文体の混在を検出する
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence,
  StyleType,
  StyleInconsistency
} from '../../../../shared/src/advancedTypes';

/**
 * 文体一貫性チェックルール
 * 敬体（です・ます調）と常体（である調）の混在を検出する
 */
export class StyleConsistencyRule implements AdvancedGrammarRule {
  name = 'style-consistency';
  description = '文体の混在（敬体/常体）を検出します';

  /**
   * 文の文体を判定
   * @param sentence 文
   * @returns 文体タイプ
   */
  detectStyle(sentence: Sentence): StyleType {
    const text = sentence.text.trim().replace(/[。！？!?]$/, '');

    // 敬体（です・ます）
    if (/です$/.test(text) || /ます$/.test(text)) {
      return 'keigo';
    }

    // 常体（である、〜ている、〜てある、〜た、〜だ）
    // 「である」は明確な常体
    if (/である$/.test(text)) {
      return 'joutai';
    }

    // 「〜ている」「〜てある」も常体として扱う
    if (/ている$/.test(text) || /てある$/.test(text)) {
      return 'joutai';
    }

    // 「〜た」で終わる場合も常体（ただし「ました」は除外）
    if (/[^し]た$/.test(text)) {
      return 'joutai';
    }

    // 「〜だ」で終わる場合も常体（ただし「んだ」などの口語は除外）
    if (/[^ん]だ$/.test(text)) {
      return 'joutai';
    }

    // 中立（その他）
    return 'neutral';
  }

  /**
   * 文書内で最も多く使用されている文体を取得
   * @param sentences 文のリスト
   * @returns 支配的な文体
   */
  getDominantStyle(sentences: Sentence[]): StyleType {
    let keigoCount = 0;
    let joutaiCount = 0;

    for (const sentence of sentences) {
      const style = this.detectStyle(sentence);
      if (style === 'keigo') {
        keigoCount++;
      } else if (style === 'joutai') {
        joutaiCount++;
      }
    }

    if (keigoCount > joutaiCount) {
      return 'keigo';
    } else if (joutaiCount > keigoCount) {
      return 'joutai';
    }

    // 同数の場合は敬体を優先
    return keigoCount > 0 ? 'keigo' : 'neutral';
  }

  /**
   * 文体の不整合を検出
   * @param sentences 文のリスト
   * @returns 不整合のリスト
   */
  findInconsistencies(sentences: Sentence[]): StyleInconsistency[] {
    const inconsistencies: StyleInconsistency[] = [];
    const dominantStyle = this.getDominantStyle(sentences);

    // 支配的な文体がneutralの場合は不整合なし
    if (dominantStyle === 'neutral') {
      return [];
    }

    for (const sentence of sentences) {
      const detectedStyle = this.detectStyle(sentence);

      // 敬体と常体の混在のみを検出（中立は無視）
      if (detectedStyle !== 'neutral' && detectedStyle !== dominantStyle) {
        inconsistencies.push({
          sentence,
          detectedStyle,
          dominantStyle,
          range: this.createRange(sentence)
        });
      }
    }

    return inconsistencies;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト（未使用、コンテキストの文を使用）
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const inconsistencies = this.findInconsistencies(context.sentences);

    for (const inconsistency of inconsistencies) {
      const styleName = inconsistency.detectedStyle === 'keigo' ? '敬体' : '常体';
      const dominantStyleName = inconsistency.dominantStyle === 'keigo' ? '敬体' : '常体';
      const suggestedEnding = inconsistency.dominantStyle === 'keigo' ? 'です/ます' : 'である';

      diagnostics.push(new AdvancedDiagnostic({
        range: inconsistency.range,
        message: `文体の混在が検出されました。この文は${styleName}ですが、文書全体は${dominantStyleName}が主に使用されています。`,
        code: 'style-inconsistency',
        ruleName: this.name,
        suggestions: [`文末を「${suggestedEnding}」に統一してください`]
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
    return config.enableStyleConsistency;
  }

  /**
   * 文から範囲を作成
   * @param sentence 文
   * @returns 範囲
   */
  private createRange(sentence: Sentence): Range {
    // 簡易的な行計算（実際の実装では行番号を考慮）
    return {
      start: { line: 0, character: sentence.start },
      end: { line: 0, character: sentence.end }
    };
  }
}

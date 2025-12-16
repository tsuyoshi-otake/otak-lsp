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
   * Markdownテーブル行から、文体判定に使う「例文」部分（インラインコード）を抽出する。
   * - `| ... | \`例文\` |` のような行だけを対象にする
   * - インラインコードが無いテーブル行は、文体チェックの対象外（neutral）として扱う
   */
  private extractInlineCodeFromTableRow(text: string): { text: string; start: number; end: number } | null {
    // テーブル行らしさの軽い判定（誤爆防止）
    if (!/^\s*\|/.test(text) || !text.includes('|')) {
      return null;
    }

    const matches = Array.from(text.matchAll(/`([^`]+)`/g));
    if (matches.length === 0) {
      return null;
    }

    // 最も「文っぽい」候補を優先（日本語を含む/長いもの）
    let best = matches[0];
    for (const m of matches) {
      const candidate = m[1] ?? '';
      const bestCandidate = best[1] ?? '';
      const candidateLooksJapanese = /[ぁ-んァ-ン一-龠]/.test(candidate);
      const bestLooksJapanese = /[ぁ-んァ-ン一-龠]/.test(bestCandidate);
      if (candidateLooksJapanese && !bestLooksJapanese) {
        best = m;
        continue;
      }
      if (candidateLooksJapanese === bestLooksJapanese && candidate.length > bestCandidate.length) {
        best = m;
      }
    }

    const fullMatch = best[0] ?? '';
    const inner = best[1] ?? '';
    const index = typeof best.index === 'number' ? best.index : text.indexOf(fullMatch);
    if (index < 0) {
      return null;
    }

    // backtick 内側のみを range 対象にする
    const start = index + 1;
    const end = start + inner.length;
    return { text: inner, start, end };
  }

  /**
   * 文の文体を判定
   * @param sentence 文
   * @returns 文体タイプ
   */
  detectStyle(sentence: Sentence): StyleType {
    const inline = this.extractInlineCodeFromTableRow(sentence.text);
    if (/^\s*\|/.test(sentence.text) && sentence.text.includes('|') && !inline) {
      // テーブル行（インラインコードなし）は文体判定の対象外にする
      return 'neutral';
    }

    const text = (inline ? inline.text : sentence.text)
      .trim()
      .replace(/^[\s|`]+/, '')
      .replace(/[\s|`]+$/, '')
      .replace(/[。！？!?]$/, '');

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
        const inline = this.extractInlineCodeFromTableRow(sentence.text);
        inconsistencies.push({
          sentence,
          detectedStyle,
          dominantStyle,
          range: inline ? this.createRange(sentence, inline.start, inline.end) : this.createRange(sentence)
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
  private createRange(sentence: Sentence, localStart = 0, localEnd = sentence.text.length): Range {
    const safeStart = Math.max(0, localStart);
    const safeEnd = Math.max(safeStart, localEnd);
    const startOffset = sentence.start + safeStart;
    const endOffset = sentence.start + safeEnd;
    return {
      start: { line: 0, character: startOffset },
      end: { line: 0, character: endOffset }
    };
  }
}

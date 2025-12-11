/**
 * Okurigana Variant Rule
 * 送り仮名揺れチェッカー
 * Feature: remaining-grammar-rules
 * Task: 14. 送り仮名揺れチェッカーの実装
 * 要件: 12.1, 12.2, 12.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 送り仮名の揺れパターン（誤 -> 正）
 * Map<非標準形, 標準形>
 */
const OKURIGANA_VARIANTS: Map<string, string> = new Map([
  // 動詞系
  ['表わす', '表す'],
  ['表わし', '表し'],
  ['表わせ', '表せ'],
  ['表わそ', '表そ'],
  ['現わす', '現す'],
  ['現わし', '現し'],
  ['現わせ', '現せ'],
  ['現わそ', '現そ'],
  ['行なう', '行う'],
  ['行ない', '行い'],
  ['行なえ', '行え'],
  ['行なお', '行お'],
  ['行なわ', '行わ'],
  ['行なっ', '行っ'],
  ['おこなう', '行う'],
  ['おこない', '行い'],
  ['おこなえ', '行え'],
  ['おこなっ', '行っ'],
  ['著わす', '著す'],
  ['著わし', '著し'],
  ['断わる', '断る'],
  ['断わり', '断り'],
  ['断わっ', '断っ'],
  ['当る', '当たる'],
  ['当り', '当たり'],
  ['当れ', '当たれ'],
  ['落す', '落とす'],
  ['落し', '落とし'],
  ['果す', '果たす'],
  ['果し', '果たし'],
  ['起る', '起こる'],
  ['起り', '起こり'],
  ['終る', '終わる'],
  ['終り', '終わり'],
  ['終れ', '終われ'],
  ['変る', '変わる'],
  ['変り', '変わり'],
  ['変れ', '変われ'],
  ['代る', '代わる'],
  ['代り', '代わり'],
  ['生れる', '生まれる'],
  ['生れ', '生まれ'],
  ['答る', '答える'],
  ['答え', '答え'],
  ['捕える', '捕らえる'],
  ['捕え', '捕らえ'],

  // 補助動詞系（漢字表記は本来「ひらがな」推奨）
  ['戴く', 'いただく'],
  ['戴き', 'いただき'],
  ['戴け', 'いただけ'],
  ['戴い', 'いただい'],
  ['頂く', 'いただく'],
  ['頂き', 'いただき'],
  ['頂け', 'いただけ'],
  ['頂い', 'いただい'],
  ['下さい', 'ください'],
  ['下さる', 'くださる'],
  ['下され', 'くだされ'],
  ['下さっ', 'くださっ'],
  ['致す', 'いたす'],
  ['致し', 'いたし'],
  ['致せ', 'いたせ'],
  ['致そ', 'いたそ'],

  // 形容詞系
  ['著るしい', '著しい'],
  ['著るしく', '著しく'],
  ['危い', '危ない'],
  ['危く', '危なく'],
  ['少い', '少ない'],
  ['少く', '少なく'],

  // 名詞系（送り仮名の揺れ）
  ['売上げ', '売り上げ'],
  ['取扱い', '取り扱い'],
  ['受付け', '受け付け'],
  ['申込み', '申し込み'],
  ['引越し', '引っ越し'],
  ['買物', '買い物'],
  ['読物', '読み物'],
  ['贈物', '贈り物'],
  ['届出', '届け出'],
  ['届出る', '届け出る'],
]);

/**
 * 送り仮名揺れチェッカー
 */
export class OkuriganaVariantRule implements AdvancedGrammarRule {
  name = 'okurigana-variant';
  description = '送り仮名の揺れを検出し、標準形を提案します';

  /**
   * 標準形を取得
   */
  getStandardForm(variant: string): string | null {
    return OKURIGANA_VARIANTS.get(variant) || null;
  }

  /**
   * テキスト内の送り仮名の揺れを検出
   */
  detectVariants(text: string): Array<{ variant: string; standard: string; index: number }> {
    const results: Array<{ variant: string; standard: string; index: number }> = [];

    for (const [variant, standard] of OKURIGANA_VARIANTS) {
      let index = text.indexOf(variant);
      while (index !== -1) {
        results.push({ variant, standard, index });
        index = text.indexOf(variant, index + 1);
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);

    // 重複を除去（同じ位置で複数マッチした場合、長い方を優先）
    const filtered: Array<{ variant: string; standard: string; index: number }> = [];
    for (const item of results) {
      const overlapping = filtered.find(
        f => item.index >= f.index && item.index < f.index + f.variant.length
      );
      if (!overlapping) {
        filtered.push(item);
      } else if (item.variant.length > overlapping.variant.length) {
        // より長いマッチで置き換え
        const idx = filtered.indexOf(overlapping);
        filtered[idx] = item;
      }
    }

    return filtered;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const variants = this.detectVariants(context.documentText);

    for (const item of variants) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.index },
          end: { line: 0, character: item.index + item.variant.length }
        },
        message: `送り仮名「${item.variant}」は「${item.standard}」が標準的な表記です。`,
        code: 'okurigana-variant',
        ruleName: this.name,
        suggestions: [`「${item.standard}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    // 送り仮名揺れは漢字開きルールと関連するため、漢字開きルールが有効なら有効
    return config.enableKanjiOpening;
  }
}

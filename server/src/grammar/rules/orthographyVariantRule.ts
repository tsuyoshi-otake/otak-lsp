/**
 * Orthography Variant Rule
 * 表記ゆれ検出器
 * Feature: remaining-grammar-rules
 * Task: 15. 表記ゆれ検出器の実装
 * 要件: 13.1, 13.2, 13.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 1文字形式名詞（複合語内では漢字のまま使用するのが適切）
 * これらは前後に漢字が続く場合（複合語内）は検出対象外とする
 *
 * 例:
 * - 「時」→「とき」: 「その時」は変換推奨、「時間」「食事時」は除外
 * - 「所」→「ところ」: 「その所」は変換推奨、「場所」「住所」は除外
 * - 「事」→「こと」: 「その事」は変換推奨、「食事」「事件」は除外
 */
const SINGLE_CHAR_FORMAL_NOUNS = new Set(['事', '物', '所', '時', '為', '筈', '訳', '様']);

/**
 * 漢字かどうかを判定（CJK統合漢字）
 */
const isKanji = (char: string): boolean => {
  if (!char) return false;
  const code = char.charCodeAt(0);
  return code >= 0x4E00 && code <= 0x9FFF;
};

/**
 * 表記ゆれパターン（漢字表記 -> ひらがな推奨）
 * Map<漢字表記, ひらがな推奨表記>
 */
const ORTHOGRAPHY_VARIANTS: Map<string, string> = new Map([
  // 「できる」系
  ['出来る', 'できる'],
  ['出来ます', 'できます'],
  ['出来ない', 'できない'],
  ['出来ません', 'できません'],
  ['出来た', 'できた'],
  ['出来ました', 'できました'],
  ['出来れば', 'できれば'],
  ['出来て', 'できて'],

  // 「ください」系
  ['下さい', 'ください'],
  ['下さる', 'くださる'],
  ['下さった', 'くださった'],
  ['下さって', 'くださって'],
  ['下さいます', 'くださいます'],

  // 「いたします」系
  ['致します', 'いたします'],
  ['致しました', 'いたしました'],
  ['致す', 'いたす'],
  ['致しまして', 'いたしまして'],

  // 「いただく」系
  ['頂く', 'いただく'],
  ['頂きます', 'いただきます'],
  ['頂ける', 'いただける'],
  ['頂ければ', 'いただければ'],
  ['頂き', 'いただき'],
  ['頂いた', 'いただいた'],
  ['頂いて', 'いただいて'],

  // 「ある・ない」系
  ['有る', 'ある'],
  ['有り', 'あり'],
  ['有ります', 'あります'],
  ['有った', 'あった'],
  ['有れば', 'あれば'],
  ['無い', 'ない'],
  ['無く', 'なく'],
  ['無かった', 'なかった'],
  ['無ければ', 'なければ'],

  // 「いる」系
  ['居る', 'いる'],
  ['居ます', 'います'],
  ['居ない', 'いない'],
  ['居た', 'いた'],

  // 「なる」系
  ['成る', 'なる'],
  ['成ります', 'なります'],
  ['成った', 'なった'],

  // 「おく」系（補助動詞）
  ['置く', 'おく'],
  ['置き', 'おき'],
  ['置いて', 'おいて'],

  // 「みる」系（補助動詞）
  ['見る', 'みる'],
  ['見て', 'みて'],

  // その他の副詞・接続詞
  ['又', 'また'],
  ['但し', 'ただし'],
  ['尚', 'なお'],
  ['及び', 'および'],
  ['並びに', 'ならびに'],
  ['若しくは', 'もしくは'],
  ['或いは', 'あるいは'],
  ['即ち', 'すなわち'],
  ['従って', 'したがって'],
  ['因みに', 'ちなみに'],
  ['更に', 'さらに'],
  ['殆ど', 'ほとんど'],
  ['僅か', 'わずか'],
  ['概ね', 'おおむね'],
  ['予め', 'あらかじめ'],
  ['既に', 'すでに'],
  ['直ぐ', 'すぐ'],
  ['未だ', 'いまだ'],
  ['漸く', 'ようやく'],

  // 数量表記
  ['カ月', 'か月'],
  ['ケ月', 'か月'],
  ['ヵ月', 'か月'],
  ['ヶ月', 'か月'],
  ['ヶ所', 'か所'],
  ['ケ所', 'か所'],
  ['カ所', 'か所'],
  ['ヵ所', 'か所'],

  // 形式名詞
  ['事', 'こと'],
  ['物', 'もの'],
  ['所', 'ところ'],
  ['時', 'とき'],
  ['為', 'ため'],
  ['筈', 'はず'],
  ['訳', 'わけ'],
  ['様', 'よう'],

  // よく使われる表現
  ['宜しく', 'よろしく'],
  ['御願い', 'お願い'],
  ['御座います', 'ございます'],
  ['有難う', 'ありがとう'],
  ['有難うございます', 'ありがとうございます'],
  ['是非', 'ぜひ'],
  ['沢山', 'たくさん'],
  ['色々', 'いろいろ'],
  ['様々', 'さまざま'],
  ['丁度', 'ちょうど'],
  ['何故', 'なぜ'],
  ['敢えて', 'あえて'],
]);

/**
 * 表記ゆれ検出器
 */
export class OrthographyVariantRule implements AdvancedGrammarRule {
  name = 'orthography-variant';
  description = '表記ゆれを検出し、統一された表記を提案します';

  /**
   * 推奨表記を取得
   */
  getRecommendedForm(variant: string): string | null {
    return ORTHOGRAPHY_VARIANTS.get(variant) || null;
  }

  /**
   * 1文字形式名詞が複合語内かどうかを判定
   * 前後に漢字が続く場合は複合語内と判断
   */
  private isInCompoundWord(text: string, index: number, variant: string): boolean {
    // 1文字形式名詞のみチェック
    if (!SINGLE_CHAR_FORMAL_NOUNS.has(variant)) {
      return false;
    }

    const prevChar = index > 0 ? text[index - 1] : '';
    const nextChar = index + variant.length < text.length ? text[index + variant.length] : '';

    // 前後どちらかに漢字が続く場合は複合語内
    return isKanji(prevChar) || isKanji(nextChar);
  }

  /**
   * テキスト内の表記ゆれを検出
   */
  detectVariants(text: string): Array<{ variant: string; recommended: string; index: number }> {
    const results: Array<{ variant: string; recommended: string; index: number }> = [];

    for (const [variant, recommended] of ORTHOGRAPHY_VARIANTS) {
      let index = text.indexOf(variant);
      while (index !== -1) {
        // 1文字形式名詞が複合語内にある場合は除外
        if (!this.isInCompoundWord(text, index, variant)) {
          results.push({ variant, recommended, index });
        }
        index = text.indexOf(variant, index + 1);
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);

    // 重複を除去（同じ位置で複数マッチした場合、長い方を優先）
    const filtered: Array<{ variant: string; recommended: string; index: number }> = [];
    for (const item of results) {
      const overlapping = filtered.find(
        f => item.index >= f.index && item.index < f.index + f.variant.length
      );
      if (!overlapping) {
        filtered.push(item);
      } else if (item.variant.length > overlapping.variant.length) {
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
        message: `表記「${item.variant}」は「${item.recommended}」に統一することが推奨されます。`,
        code: 'orthography-variant',
        ruleName: this.name,
        suggestions: [`「${item.recommended}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableOrthographyVariant;
  }
}

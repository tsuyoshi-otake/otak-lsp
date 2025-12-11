/**
 * Halfwidth Kana Rule
 * 半角カナ検出器
 * Feature: remaining-grammar-rules
 * Task: 18. 半角カナ検出器の実装
 * 要件: 16.1, 16.2, 16.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 半角カナから全角カナへの変換マップ
 */
const HALFWIDTH_TO_FULLWIDTH: Map<string, string> = new Map([
  ['ｱ', 'ア'], ['ｲ', 'イ'], ['ｳ', 'ウ'], ['ｴ', 'エ'], ['ｵ', 'オ'],
  ['ｶ', 'カ'], ['ｷ', 'キ'], ['ｸ', 'ク'], ['ｹ', 'ケ'], ['ｺ', 'コ'],
  ['ｻ', 'サ'], ['ｼ', 'シ'], ['ｽ', 'ス'], ['ｾ', 'セ'], ['ｿ', 'ソ'],
  ['ﾀ', 'タ'], ['ﾁ', 'チ'], ['ﾂ', 'ツ'], ['ﾃ', 'テ'], ['ﾄ', 'ト'],
  ['ﾅ', 'ナ'], ['ﾆ', 'ニ'], ['ﾇ', 'ヌ'], ['ﾈ', 'ネ'], ['ﾉ', 'ノ'],
  ['ﾊ', 'ハ'], ['ﾋ', 'ヒ'], ['ﾌ', 'フ'], ['ﾍ', 'ヘ'], ['ﾎ', 'ホ'],
  ['ﾏ', 'マ'], ['ﾐ', 'ミ'], ['ﾑ', 'ム'], ['ﾒ', 'メ'], ['ﾓ', 'モ'],
  ['ﾔ', 'ヤ'], ['ﾕ', 'ユ'], ['ﾖ', 'ヨ'],
  ['ﾗ', 'ラ'], ['ﾘ', 'リ'], ['ﾙ', 'ル'], ['ﾚ', 'レ'], ['ﾛ', 'ロ'],
  ['ﾜ', 'ワ'], ['ｦ', 'ヲ'], ['ﾝ', 'ン'],
  ['ｧ', 'ァ'], ['ｨ', 'ィ'], ['ｩ', 'ゥ'], ['ｪ', 'ェ'], ['ｫ', 'ォ'],
  ['ｬ', 'ャ'], ['ｭ', 'ュ'], ['ｮ', 'ョ'],
  ['ｯ', 'ッ'],
  ['ｰ', 'ー'],
  ['｡', '。'], ['｢', '「'], ['｣', '」'], ['､', '、'], ['･', '・'],
]);

/**
 * 濁点・半濁点
 */
const DAKUTEN = 'ﾞ';
const HANDAKUTEN = 'ﾟ';

/**
 * 濁点付き変換マップ
 */
const DAKUTEN_MAP: Map<string, string> = new Map([
  ['ｶ', 'ガ'], ['ｷ', 'ギ'], ['ｸ', 'グ'], ['ｹ', 'ゲ'], ['ｺ', 'ゴ'],
  ['ｻ', 'ザ'], ['ｼ', 'ジ'], ['ｽ', 'ズ'], ['ｾ', 'ゼ'], ['ｿ', 'ゾ'],
  ['ﾀ', 'ダ'], ['ﾁ', 'ヂ'], ['ﾂ', 'ヅ'], ['ﾃ', 'デ'], ['ﾄ', 'ド'],
  ['ﾊ', 'バ'], ['ﾋ', 'ビ'], ['ﾌ', 'ブ'], ['ﾍ', 'ベ'], ['ﾎ', 'ボ'],
  ['ｳ', 'ヴ'],
]);

/**
 * 半濁点付き変換マップ
 */
const HANDAKUTEN_MAP: Map<string, string> = new Map([
  ['ﾊ', 'パ'], ['ﾋ', 'ピ'], ['ﾌ', 'プ'], ['ﾍ', 'ペ'], ['ﾎ', 'ポ'],
]);

/**
 * 半角カナ検出器
 */
export class HalfwidthKanaRule implements AdvancedGrammarRule {
  name = 'halfwidth-kana';
  description = '半角カナを検出し、全角カナへの変換を提案します';

  /**
   * 半角カナを全角カナに変換
   */
  toFullwidth(text: string): string {
    let result = '';
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      const nextChar = text[i + 1];

      // 濁点・半濁点のチェック
      if (nextChar === DAKUTEN && DAKUTEN_MAP.has(char)) {
        result += DAKUTEN_MAP.get(char);
        i += 2;
        continue;
      }

      if (nextChar === HANDAKUTEN && HANDAKUTEN_MAP.has(char)) {
        result += HANDAKUTEN_MAP.get(char);
        i += 2;
        continue;
      }

      // 通常の変換
      if (HALFWIDTH_TO_FULLWIDTH.has(char)) {
        result += HALFWIDTH_TO_FULLWIDTH.get(char);
      } else {
        result += char;
      }
      i++;
    }

    return result;
  }

  /**
   * 半角カナかどうかを判定
   */
  isHalfwidthKana(char: string): boolean {
    const code = char.charCodeAt(0);
    // 半角カナの範囲: U+FF61 - U+FF9F
    return code >= 0xFF61 && code <= 0xFF9F;
  }

  /**
   * テキスト内の半角カナを検出
   */
  findHalfwidthKana(text: string): Array<{ value: string; index: number; fullwidth: string }> {
    const results: Array<{ value: string; index: number; fullwidth: string }> = [];
    let i = 0;

    while (i < text.length) {
      if (this.isHalfwidthKana(text[i])) {
        // 連続する半角カナを取得
        let j = i;
        while (j < text.length && this.isHalfwidthKana(text[j])) {
          j++;
        }

        const halfwidth = text.slice(i, j);
        const fullwidth = this.toFullwidth(halfwidth);

        results.push({
          value: halfwidth,
          index: i,
          fullwidth
        });

        i = j;
      } else {
        i++;
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const halfwidthKana = this.findHalfwidthKana(context.documentText);

    for (const item of halfwidthKana) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.index },
          end: { line: 0, character: item.index + item.value.length }
        },
        message: `半角カナ「${item.value}」は全角カナ「${item.fullwidth}」に変換することを推奨します。`,
        code: 'halfwidth-kana',
        ruleName: this.name,
        suggestions: [`「${item.fullwidth}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

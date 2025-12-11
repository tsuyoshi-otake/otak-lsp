/**
 * Kanji Opening Rule
 * 漢字の開き方を統一する
 * Feature: advanced-grammar-rules
 * 要件: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 漢字開きルール（漢字 → ひらがな）
 */
const KANJI_OPENING_RULES: Map<string, string> = new Map([
  // 補助動詞
  ['下さい', 'ください'],
  ['頂く', 'いただく'],
  ['頂きます', 'いただきます'],
  ['頂ける', 'いただける'],
  ['頂ければ', 'いただければ'],
  ['致します', 'いたします'],
  ['致しました', 'いたしました'],
  ['参ります', 'まいります'],
  ['参りました', 'まいりました'],

  // 可能・状態
  ['出来る', 'できる'],
  ['出来ます', 'できます'],
  ['出来ない', 'できない'],
  ['出来ません', 'できません'],
  ['出来た', 'できた'],
  ['出来ました', 'できました'],

  // 接続詞的表現
  ['但し', 'ただし'],
  ['又は', 'または'],
  ['及び', 'および'],
  ['並びに', 'ならびに'],
  ['若しくは', 'もしくは'],
  ['更に', 'さらに'],
  ['即ち', 'すなわち'],
  ['従って', 'したがって'],

  // 副詞的表現
  ['予め', 'あらかじめ'],
  ['概ね', 'おおむね'],
  ['既に', 'すでに'],
  ['直ぐ', 'すぐ'],
  ['未だ', 'いまだ'],
  ['殆ど', 'ほとんど'],
  ['僅か', 'わずか'],
  ['漸く', 'ようやく'],

  // 形式名詞
  ['事', 'こと'],
  ['物', 'もの'],
  ['所', 'ところ'],
  ['時', 'とき'],
  ['為', 'ため'],
  ['筈', 'はず'],
  ['訳', 'わけ'],
  ['様', 'よう'],

  // 挨拶・感謝
  ['有難う', 'ありがとう'],
  ['有難うございます', 'ありがとうございます'],
  ['御座います', 'ございます'],
  ['御願い', 'お願い'],
  ['宜しく', 'よろしく'],
  ['宜しくお願い', 'よろしくお願い'],

  // その他
  ['沢山', 'たくさん'],
  ['色々', 'いろいろ'],
  ['様々', 'さまざま'],
  ['是非', 'ぜひ'],
  ['丁度', 'ちょうど'],
  ['何故', 'なぜ'],
  ['尚', 'なお'],
  ['敢えて', 'あえて']
]);

/**
 * 漢字開きルール
 */
export class KanjiOpeningRule implements AdvancedGrammarRule {
  name = 'kanji-opening';
  description = '漢字の開き方を統一します';

  /**
   * ひらがな形を取得
   */
  getOpenedForm(kanji: string): string | null {
    return KANJI_OPENING_RULES.get(kanji) || null;
  }

  /**
   * テキスト内の開くべき漢字を検出
   */
  detectClosedKanji(text: string): Array<{ kanji: string; opened: string; index: number }> {
    const results: Array<{ kanji: string; opened: string; index: number }> = [];

    for (const [kanji, opened] of KANJI_OPENING_RULES) {
      let index = text.indexOf(kanji);
      while (index !== -1) {
        results.push({ kanji, opened, index });
        index = text.indexOf(kanji, index + 1);
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);
    return results;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const closedKanji = this.detectClosedKanji(context.documentText);

    for (const item of closedKanji) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.index },
          end: { line: 0, character: item.index + item.kanji.length }
        },
        message: `漢字「${item.kanji}」はひらがな「${item.opened}」で表記することが推奨されます。`,
        code: 'kanji-opening',
        ruleName: this.name,
        suggestions: [`「${item.opened}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableKanjiOpening;
  }
}

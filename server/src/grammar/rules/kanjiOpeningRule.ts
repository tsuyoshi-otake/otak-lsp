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
import { isEmpty, isNotEmpty } from '../../utils/arrayUtils';

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
 * 形式名詞など、同じ表層でも読み/用法で開くべきでないケースがある語の制約
 * - 例: 「起動時」の「時」は読みが「ジ」であり、「とき」への置換は不自然
 */
const READING_CONSTRAINTS: ReadonlyMap<string, string> = new Map([
  ['時', 'トキ'],
  ['事', 'コト'],
  ['物', 'モノ'],
  ['所', 'トコロ'],
  ['為', 'タメ'],
  ['筈', 'ハズ'],
  ['訳', 'ワケ'],
  ['様', 'ヨウ']
]);

const MAX_RULE_LENGTH = Math.max(...Array.from(KANJI_OPENING_RULES.keys(), (key) => key.length));

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
        if (this.isValidClosedKanjiOccurrence(text, kanji, index)) {
          results.push({ kanji, opened, index });
        }
        index = text.indexOf(kanji, index + 1);
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);
    return results;
  }

  private isValidClosedKanjiOccurrence(text: string, kanji: string, index: number): boolean {
    // 1文字の形式名詞は複合語内の部分一致（例: 時間/起動時）を避ける
    if (kanji.length !== 1) {
      return true;
    }

    const prev = index > 0 ? text[index - 1] : null;
    const next = index + kanji.length < text.length ? text[index + kanji.length] : null;

    const isKanjiLike = (ch: string | null): boolean => {
      if (!ch) return false;
      // CJK統合漢字 + 拡張A + 々（反復記号）
      return /[\u3400-\u4DBF\u4E00-\u9FFF\u3005]/.test(ch);
    };
    const isDigit = (ch: string | null): boolean => {
      if (!ch) return false;
      return /[0-9\uFF10-\uFF19]/.test(ch);
    };

    // 直前/直後が漢字・数字の場合は「複合語の一部」とみなして除外
    if (isKanjiLike(prev) || isKanjiLike(next) || isDigit(prev)) {
      return false;
    }

    return true;
  }

  /**
   * トークン列から開くべき漢字を検出（複合語内の部分一致を回避）
   * - kuromoji は「頂きます」等を複数トークンに分割するため、連続トークンの結合でマッチさせる
   */
  detectClosedKanjiFromTokens(tokens: Token[]): Array<{ kanji: string; opened: string; start: number; end: number }> {
    const matches: Array<{ kanji: string; opened: string; start: number; end: number }> = [];

    if (isEmpty(tokens)) {
      return matches;
    }

    for (let i = 0; i < tokens.length; i++) {
      let concatenated = '';

      for (let j = i; j < tokens.length; j++) {
        concatenated += tokens[j].surface;
        if (concatenated.length > MAX_RULE_LENGTH) {
          break;
        }

        const opened = KANJI_OPENING_RULES.get(concatenated);
        if (!opened) {
          continue;
        }

        if (!this.isValidClosedKanjiTokenMatch(tokens, i, j, concatenated)) {
          continue;
        }

        matches.push({
          kanji: concatenated,
          opened,
          start: tokens[i].start,
          end: tokens[j].end
        });
      }
    }

    // 同一開始位置ではより長い一致を優先し、重複を除去する
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      if (a.end !== b.end) return b.end - a.end;
      return b.kanji.length - a.kanji.length;
    });

    const deduped: Array<{ kanji: string; opened: string; start: number; end: number }> = [];
    let lastEnd = -1;
    for (const m of matches) {
      if (m.start < lastEnd) {
        continue;
      }
      deduped.push(m);
      lastEnd = m.end;
    }

    return deduped;
  }

  private isValidClosedKanjiTokenMatch(tokens: Token[], startIndex: number, endIndex: number, closedKanji: string): boolean {
    const expectedReading = READING_CONSTRAINTS.get(closedKanji);
    if (!expectedReading) {
      return true;
    }

    // 読み制約は単一トークン一致のみに適用する（複合一致には読みが定義しづらい）
    if (startIndex !== endIndex) {
      return true;
    }

    return tokens[startIndex].reading === expectedReading;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    if (isNotEmpty(tokens)) {
      const closedKanji = this.detectClosedKanjiFromTokens(tokens);
      for (const item of closedKanji) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: item.start },
            end: { line: 0, character: item.end }
          },
          message: `漢字「${item.kanji}」はひらがな「${item.opened}」で表記することが推奨されます。`,
          code: 'kanji-opening',
          ruleName: this.name,
          suggestions: [`「${item.opened}」に変更する`]
        }));
      }
    } else {
      // 形態素トークンが無い場合は文字列検索でフォールバック
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
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableKanjiOpening;
  }
}

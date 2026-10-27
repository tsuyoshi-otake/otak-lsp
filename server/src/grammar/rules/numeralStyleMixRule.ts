/**
 * Numeral Style Mix Rule
 * 数字表記混在バリデーター
 * Feature: remaining-grammar-rules
 * Task: 19. 数字表記混在バリデーターの実装
 * 要件: 17.1, 17.2, 17.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { isEmpty } from '../../utils/arrayUtils';

/**
 * 漢数字からアラビア数字への変換マップ
 */
const KANJI_TO_ARABIC: Map<string, string> = new Map([
  ['〇', '0'], ['零', '0'],
  ['一', '1'], ['壱', '1'],
  ['二', '2'], ['弐', '2'],
  ['三', '3'], ['参', '3'],
  ['四', '4'],
  ['五', '5'],
  ['六', '6'],
  ['七', '7'],
  ['八', '8'],
  ['九', '9'],
  ['十', '10'],
  ['百', '100'],
  ['千', '1000'],
  ['万', '10000'],
  ['億', '100000000'],
]);

/**
 * 漢数字のパターン
 */
const KANJI_NUMERAL_PATTERN = /[〇零一壱二弐三参四五六七八九十百千万億]+/g;

/**
 * アラビア数字のパターン
 */
const ARABIC_NUMERAL_PATTERN = /[0-9０-９]+/g;

/**
 * 数字表記混在バリデーター
 */
export class NumeralStyleMixRule implements AdvancedGrammarRule {
  name = 'numeral-style-mix';
  description = '漢数字とアラビア数字の混在を検出し、統一を提案します';

  /**
   * 漢数字かどうかを判定
   */
  isKanjiNumeral(char: string): boolean {
    return KANJI_TO_ARABIC.has(char);
  }

  /**
   * テキスト内の数字を検出
   */
  findNumerals(text: string, tokens: readonly Token[] = []): {
    kanji: Array<{ value: string; index: number }>;
    arabic: Array<{ value: string; index: number }>;
  } {
    const kanji: Array<{ value: string; index: number }> = [];
    const arabic: Array<{ value: string; index: number }> = [];
    const tokensByStart = new Map(tokens.map(token => [token.start, token]));

    // 漢数字の検出
    let match: RegExpExecArray | null;
    const kanjiPattern = new RegExp(KANJI_NUMERAL_PATTERN.source, 'g');
    while ((match = kanjiPattern.exec(text)) !== null) {
      const token = tokensByStart.get(match.index);
      // 一文字は数詞として独立したトークンだけを対象にする。
      // 慣用表記、複合語の接頭辞、住所の丁目と「第」に続く序数は除外する。
      const next = match.index + match[0].length;
      const fixedExpression = (match[0] === '一' && ['人', 'つ', '度'].includes(text[next])) ||
        (match[0] === '二' && (text.startsWith('重', next) || text.startsWith('点リーダ', next))) ||
        text.startsWith('丁目', next);
      const singleNumber = match[0].length === 1 && token?.surface === match[0] &&
        token.pos === '名詞' && token.posDetail1 === '数' && text[match.index - 1] !== '第' &&
        !fixedExpression;
      if (match[0].length >= 2 || singleNumber) {
        kanji.push({ value: match[0], index: match.index });
      }
    }

    // アラビア数字の検出
    const arabicPattern = new RegExp(ARABIC_NUMERAL_PATTERN.source, 'g');
    while ((match = arabicPattern.exec(text)) !== null) {
      arabic.push({ value: match[0], index: match.index });
    }

    return { kanji, arabic };
  }

  /**
   * 桁数字または万・億までの位取り表記を変換。不正・曖昧な表記は変換しない。
   */
  kanjiToArabic(kanjiNum: string): string | null {
    if (!kanjiNum || [...kanjiNum].some(char => !KANJI_TO_ARABIC.has(char))) return null;
    if (!/[十百千万億]/.test(kanjiNum)) {
      return [...kanjiNum].map(char => KANJI_TO_ARABIC.get(char)).join('');
    }

    const smallUnits: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };
    const largeUnits: Record<string, number> = { 万: 10000, 億: 100000000 };
    let total = 0;
    let group = 0;
    let pending: number | null = null;
    let previousSmall = 10000;
    let previousLarge = Infinity;
    for (const char of kanjiNum) {
      const digit = KANJI_TO_ARABIC.get(char)!;
      if (digit.length === 1) {
        if (digit === '0' || pending !== null) return null;
        pending = Number(digit);
      } else if (smallUnits[char]) {
        const unit = smallUnits[char];
        if (unit >= previousSmall) return null;
        group += (pending ?? 1) * unit;
        pending = null;
        previousSmall = unit;
      } else {
        const unit = largeUnits[char];
        if (!unit || unit >= previousLarge) return null;
        group += pending ?? 0;
        if (group === 0) return null;
        total += group * unit;
        group = 0;
        pending = null;
        previousSmall = 10000;
        previousLarge = unit;
      }
    }
    return String(total + group + (pending ?? 0));
  }

  /**
   * アラビア数字を通常の桁数字表記に変換する。
   */
  arabicToKanji(arabicNum: string): string | null {
    if (!/^[0-9０-９]+$/.test(arabicNum)) return null;
    const digits = '〇一二三四五六七八九';
    // 全角数字を半角に変換
    const normalized = arabicNum.replace(/[０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });

    return [...normalized].map(char => digits[Number(char)]).join('');
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const { kanji, arabic } = this.findNumerals(context.documentText, tokens);

    // 漢数字とアラビア数字の両方が存在するかチェック
    if (isEmpty(kanji) || isEmpty(arabic)) {
      return diagnostics;
    }

    // 多数派を判定
    const kanjiTotalLength = kanji.reduce((sum, k) => sum + k.value.length, 0);
    const arabicTotalLength = arabic.reduce((sum, a) => sum + a.value.length, 0);
    const dominantIsKanji = kanjiTotalLength > arabicTotalLength;

    // 少数派を警告
    if (dominantIsKanji) {
      // アラビア数字を警告
      for (const num of arabic) {
        const suggestion = this.arabicToKanji(num.value);
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: num.index },
            end: { line: 0, character: num.index + num.value.length }
          },
          message: `数字「${num.value}」はアラビア数字ですが、文書内では漢数字が多く使用されています。表記を統一することを推奨します。`,
          code: 'numeral-style-mix',
          ruleName: this.name,
          suggestions: suggestion === null ? [] : [`漢数字「${suggestion}」に変更して統一する`]
        }));
      }
    } else {
      // 漢数字を警告
      for (const num of kanji) {
        const suggestion = this.kanjiToArabic(num.value);
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: num.index },
            end: { line: 0, character: num.index + num.value.length }
          },
          message: `数字「${num.value}」は漢数字ですが、文書内ではアラビア数字が多く使用されています。表記を統一することを推奨します。`,
          code: 'numeral-style-mix',
          ruleName: this.name,
          suggestions: suggestion === null ? [] : [`アラビア数字「${suggestion}」に変更して統一する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableNumeralStyleMix;
  }
}

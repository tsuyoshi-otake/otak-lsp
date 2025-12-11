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
  findNumerals(text: string): {
    kanji: Array<{ value: string; index: number }>;
    arabic: Array<{ value: string; index: number }>;
  } {
    const kanji: Array<{ value: string; index: number }> = [];
    const arabic: Array<{ value: string; index: number }> = [];

    // 漢数字の検出
    let match: RegExpExecArray | null;
    const kanjiPattern = new RegExp(KANJI_NUMERAL_PATTERN.source, 'g');
    while ((match = kanjiPattern.exec(text)) !== null) {
      // 単独の漢数字表現（「一人」「一つ」など）は除外
      // 2文字以上、または後ろに単位がない場合のみ検出
      if (match[0].length >= 2) {
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
   * 漢数字をアラビア数字に変換（簡易版）
   */
  kanjiToArabic(kanjiNum: string): string {
    // 単純な変換（位取りは考慮しない簡易版）
    let result = '';
    for (const char of kanjiNum) {
      const arabic = KANJI_TO_ARABIC.get(char);
      if (arabic && arabic.length === 1) {
        result += arabic;
      }
    }
    return result || kanjiNum;
  }

  /**
   * アラビア数字を漢数字に変換（簡易版）
   */
  arabicToKanji(arabicNum: string): string {
    const reverseMap: Map<string, string> = new Map();
    for (const [kanji, arabic] of KANJI_TO_ARABIC) {
      if (arabic.length === 1) {
        reverseMap.set(arabic, kanji);
      }
    }

    // 全角数字を半角に変換
    const normalized = arabicNum.replace(/[０-９]/g, (char) => {
      return String.fromCharCode(char.charCodeAt(0) - 0xFEE0);
    });

    let result = '';
    for (const char of normalized) {
      result += reverseMap.get(char) || char;
    }
    return result;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const { kanji, arabic } = this.findNumerals(context.documentText);

    // 漢数字とアラビア数字の両方が存在するかチェック
    if (kanji.length === 0 || arabic.length === 0) {
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
          suggestions: [`漢数字「${suggestion}」に変更して統一する`]
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
          suggestions: [`アラビア数字「${suggestion}」に変更して統一する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

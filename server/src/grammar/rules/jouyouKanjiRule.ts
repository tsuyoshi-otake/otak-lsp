/**
 * JouyouKanji Rule
 * 常用漢字表にない漢字を検出する
 * Feature: official-document-rules
 * 要件: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import {
  isJouyouKanji,
  isKanji,
  getAlternative,
  NonJouyouAlternative
} from '../../../../shared/src/jouyouKanjiData';
import {
  isJinmeiKanji,
  isKyujitai,
  getShinjitai,
  matchesSurnamePattern,
  isLikelyName,
  SURNAME_SUFFIX_PATTERNS
} from '../../../../shared/src/jinmeiKanjiData';
import {
  isChimeiKanji,
  isChimeiKyujitai,
  getChimeiShinjitai,
  matchesFamousPlaceName,
  isLikelyPlaceName,
  isAddressContext
} from '../../../../shared/src/chimeiKanjiData';

/**
 * 除外理由
 */
type ExclusionReason = 'proper_noun' | 'jinmei_kanji' | 'surname' | 'place_name' | 'address' | null;

/**
 * 常用漢字外の漢字検出結果
 */
interface NonJouyouKanjiMatch {
  kanji: string;
  position: number;
  isProperNoun: boolean;
  isJinmeiKanji: boolean;
  isSurname: boolean;
  isPlaceName: boolean;
  exclusionReason: ExclusionReason;
  suggestion?: NonJouyouAlternative;
  shinjitaiSuggestion?: string;
}

/**
 * 固有名詞を判定するための品詞パターン
 */
const PROPER_NOUN_POS_PATTERNS = [
  '固有名詞',
  '人名',
  '地名',
  '組織'
];


/**
 * 常用漢字表にない漢字を検出するルール
 *
 * 根拠: 常用漢字表（平成22年内閣告示第2号）
 * - 2136字の常用漢字を基準
 * - 固有名詞は除外オプションあり
 * - 人名用漢字・旧字体姓・地名は除外オプションあり
 *
 * 公文書では常用漢字表にない漢字の使用を避け、
 * ひらがな表記または代替漢字を使用することが推奨される。
 */
export class JouyouKanjiRule implements AdvancedGrammarRule {
  name = 'jouyou-kanji';
  description = '常用漢字表にない漢字を検出します';

  /**
   * トークンが固有名詞かどうかを判定
   */
  isProperNoun(token: Token): boolean {
    const pos = token.pos || '';
    const posDetail = token.posDetail1 || '';

    // 品詞または品詞詳細に固有名詞パターンが含まれるかチェック
    return PROPER_NOUN_POS_PATTERNS.some(pattern =>
      pos.includes(pattern) || posDetail.includes(pattern)
    );
  }

  /**
   * 文字の除外理由を判定
   */
  getExclusionReason(
    char: string,
    text: string,
    position: number,
    isTokenProperNoun: boolean,
    config: {
      excludeProperNouns: boolean;
      excludeJinmeiKanji: boolean;
      excludePlaceNames: boolean;
    }
  ): ExclusionReason {
    // 1. 固有名詞除外（形態素解析ベース）
    if (config.excludeProperNouns && isTokenProperNoun) {
      return 'proper_noun';
    }

    // 2. 人名用漢字・旧字体姓の除外
    // ※人名用漢字は「名前コンテキスト」でのみ除外する
    // 　（噂話、斡旋など一般語に含まれる人名用漢字は検出する）
    if (config.excludeJinmeiKanji) {
      // 旧字体姓パターンにマッチ
      if (matchesSurnamePattern(text, position)) {
        return 'surname';
      }
      // 敬称付きの名前パターン
      if (isLikelyName(text, position)) {
        return 'surname';
      }
      // 注: isJinmeiKanji(char) による無条件除外は誤検知を招くため削除
    }

    // 3. 地名の除外
    if (config.excludePlaceNames) {
      // 有名な地名にマッチ
      if (matchesFamousPlaceName(text, position)) {
        return 'place_name';
      }
      // 地名パターンにマッチ
      if (isLikelyPlaceName(text, position)) {
        return 'place_name';
      }
      // 住所文脈
      if (isAddressContext(text, position)) {
        return 'address';
      }
    }

    return null;
  }

  /**
   * テキスト中の常用漢字外の漢字を検出
   */
  findNonJouyouKanji(
    text: string,
    tokens: Token[],
    config: {
      excludeProperNouns: boolean;
      excludeJinmeiKanji: boolean;
      excludePlaceNames: boolean;
    }
  ): NonJouyouKanjiMatch[] {
    const matches: NonJouyouKanjiMatch[] = [];

    // トークンごとに処理
    for (const token of tokens) {
      const surface = token.surface || '';
      const tokenStart = token.start;

      const isTokenProperNoun = this.isProperNoun(token);

      // トークン内の各文字をチェック
      for (let i = 0; i < surface.length; i++) {
        const char = surface[i];

        // 漢字かどうかをチェック
        if (!isKanji(char)) {
          continue;
        }

        // 常用漢字かどうかをチェック
        if (isJouyouKanji(char)) {
          continue;
        }

        const position = tokenStart + i;

        // 除外理由を判定
        const exclusionReason = this.getExclusionReason(
          char,
          text,
          position,
          isTokenProperNoun,
          config
        );

        // 除外対象の場合はスキップ
        if (exclusionReason !== null) {
          continue;
        }

        // 常用漢字外の漢字を検出
        const suggestion = getAlternative(char);

        // 旧字体の場合は新字体も提案
        let shinjitaiSuggestion: string | undefined;
        if (isKyujitai(char)) {
          shinjitaiSuggestion = getShinjitai(char);
        } else if (isChimeiKyujitai(char)) {
          shinjitaiSuggestion = getChimeiShinjitai(char);
        }

        matches.push({
          kanji: char,
          position,
          isProperNoun: isTokenProperNoun,
          isJinmeiKanji: isJinmeiKanji(char),
          isSurname: matchesSurnamePattern(text, position),
          isPlaceName: isLikelyPlaceName(text, position),
          exclusionReason: null,
          suggestion,
          shinjitaiSuggestion
        });
      }
    }

    return matches;
  }


  /**
   * 診断メッセージを生成
   */
  createDiagnosticMessage(match: NonJouyouKanjiMatch): string {
    const { kanji, suggestion, shinjitaiSuggestion } = match;

    let message = `「${kanji}」は常用漢字表にありません。`;

    // 旧字体の場合は新字体を優先的に提案
    if (shinjitaiSuggestion) {
      message += `新字体「${shinjitaiSuggestion}」への書き換えを検討してください。`;
    } else if (suggestion) {
      if (suggestion.alternative) {
        message += `「${suggestion.alternative}」または「${suggestion.hiragana}」への書き換えを検討してください。`;
      } else {
        message += `「${suggestion.hiragana}」への書き換えを検討してください。`;
      }
    } else {
      message += 'ひらがな表記への書き換えを検討してください。';
    }

    message += '（根拠: 常用漢字表 平成22年内閣告示第2号）';

    return message;
  }

  /**
   * 修正提案を生成
   */
  createSuggestions(match: NonJouyouKanjiMatch): string[] {
    const suggestions: string[] = [];
    const { suggestion, shinjitaiSuggestion } = match;

    // 旧字体の場合は新字体を優先
    if (shinjitaiSuggestion) {
      suggestions.push(`「${shinjitaiSuggestion}」に変更する（新字体）`);
    }

    if (suggestion) {
      if (suggestion.alternative && suggestion.alternative !== shinjitaiSuggestion) {
        suggestions.push(`「${suggestion.alternative}」に変更する`);
      }
      suggestions.push(`「${suggestion.hiragana}」に変更する`);
    } else if (!shinjitaiSuggestion) {
      suggestions.push('ひらがな表記に変更する');
    }

    return suggestions;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    const config = {
      excludeProperNouns: context.config.excludeProperNounsFromJouyouKanji,
      excludeJinmeiKanji: context.config.excludeJinmeiKanji ?? true,
      excludePlaceNames: context.config.excludePlaceNames ?? true
    };

    // 常用漢字外の漢字を検出
    const matches = this.findNonJouyouKanji(
      context.documentText,
      tokens,
      config
    );

    // 各検出結果に対して診断を生成
    for (const match of matches) {
      const message = this.createDiagnosticMessage(match);
      const suggestions = this.createSuggestions(match);

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: match.position },
          end: { line: 0, character: match.position + 1 }
        },
        message,
        code: 'jouyou-kanji',
        ruleName: this.name,
        suggestions,
        severity: DiagnosticSeverity.Information
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableJouyouKanji;
  }
}

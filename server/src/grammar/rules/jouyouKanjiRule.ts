/**
 * JouyouKanji Rule
 * 常用漢字表にない漢字を検出する
 * Feature: official-document-rules
 * 要件: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5
 *
 * Performance optimizations:
 * - 事前検索: 姓・地名パターンを解析サイクル開始時に一括検索
 * - キャッシュ: 除外判定結果を位置ベースでキャッシュ
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
  KYUJITAI_SURNAME_PATTERNS,
  SURNAME_SUFFIX_PATTERNS
} from '../../../../shared/src/jinmeiKanjiData';
import {
  isChimeiKanji,
  isChimeiKyujitai,
  getChimeiShinjitai,
  matchesFamousPlaceName,
  isLikelyPlaceName,
  isAddressContext,
  FAMOUS_PLACE_NAMES,
  CHIMEI_SUFFIX_PATTERNS
} from '../../../../shared/src/chimeiKanjiData';

/**
 * 除外理由
 */
type ExclusionReason = 'proper_noun' | 'jinmei_kanji' | 'surname' | 'place_name' | 'address' | null;

/**
 * 固有名詞の種別
 */
type ProperNounType = 'person' | 'place' | 'organization' | null;

/**
 * 事前検索されたコンテキスト（パフォーマンス最適化用）
 * 解析サイクルごとに1回だけ構築し、各文字の除外判定で再利用
 */
interface PreprocessedContext {
  /** 姓パターンにマッチした位置（位置 -> true） */
  surnamePatternPositions: Set<number>;
  /** 有名地名にマッチした位置（位置 -> true） */
  famousPlacePositions: Set<number>;
  /** 住所コンテキストの位置（位置 -> true） */
  addressContextPositions: Set<number>;
  /** 人名らしき位置（姓の後の名前部分） */
  likelyNamePositions: Set<number>;
  /** 地名接尾辞の位置 */
  placeNameSuffixPositions: Set<number>;
}

/**
 * トークンの除外判定用ヒント
 */
interface TokenExclusionContext {
  isProperNoun: boolean;
  isPlaceName: boolean;
}

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
 * 住所関連キーワード
 */
const ADDRESS_KEYWORDS = [
  '〒', '住所', '所在地', '居所', '本籍', '現住所',
  '送付先', '届出先', '連絡先', '勤務先', '配送先', '届け先',
];

/**
 * 事前コンパイルされた敬称パターン
 * 2-6文字の名前 + 敬称
 */
const COMPILED_SURNAME_SUFFIX_PATTERNS: RegExp[] = SURNAME_SUFFIX_PATTERNS.map(
  suffix => new RegExp(`^.{1,6}${suffix}`)
);

/**
 * 事前コンパイルされた地名接尾辞パターン
 * 0-8文字の地名 + 接尾辞
 */
const COMPILED_CHIMEI_SUFFIX_PATTERNS: RegExp[] = CHIMEI_SUFFIX_PATTERNS.map(
  suffix => new RegExp(`^.{0,8}${suffix}`)
);

/**
 * 住所表記パターン（都道府県市区町村郡）
 */
const ADDRESS_ADMIN_PATTERN = /^.{1,4}(都|道|府|県|市|区|町|村|郡)/;


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

  /** 除外判定キャッシュ（解析サイクルごとにクリア） */
  private exclusionCache: Map<number, ExclusionReason> = new Map();

  /**
   * トークンが固有名詞（人名・地名・組織）かどうかを判定
   */
  getProperNounType(token: Token): ProperNounType {
    const posDetail1 = token.posDetail1 || '';
    const posDetail2 = token.posDetail2 || '';
    const posDetail3 = token.posDetail3 || '';
    const details = [posDetail1, posDetail2, posDetail3];

    if (details.includes('人名')) {
      return 'person';
    }

    if (details.includes('地名') || details.includes('地域')) {
      return 'place';
    }

    if (details.includes('組織')) {
      return 'organization';
    }

    return null;
  }

  /**
   * トークンが固有名詞（人名・地名・組織）かどうかを判定
   */
  isProperNoun(token: Token): boolean {
    return this.getProperNounType(token) !== null;
  }

  /**
   * 事前検索コンテキストを構築（パフォーマンス最適化）
   * 解析サイクル開始時に1回だけ実行し、全パターンを一括検索
   */
  buildPreprocessedContext(text: string): PreprocessedContext {
    const surnamePatternPositions = new Set<number>();
    const famousPlacePositions = new Set<number>();
    const addressContextPositions = new Set<number>();
    const likelyNamePositions = new Set<number>();
    const placeNameSuffixPositions = new Set<number>();

    // 1. 姓パターンを一括検索
    for (const [_kyujitai, surnames] of KYUJITAI_SURNAME_PATTERNS) {
      for (const surname of surnames) {
        let idx = text.indexOf(surname);
        while (idx >= 0) {
          // 姓の各文字位置をマーク
          for (let i = 0; i < surname.length; i++) {
            surnamePatternPositions.add(idx + i);
          }
          // 姓の後に続く名前部分（最大4文字）もマーク
          for (let i = 1; i <= 4; i++) {
            likelyNamePositions.add(idx + surname.length + i);
            // スペースを考慮
            if (text[idx + surname.length] === ' ' || text[idx + surname.length] === '　') {
              likelyNamePositions.add(idx + surname.length + 1 + i);
            }
          }
          idx = text.indexOf(surname, idx + 1);
        }
      }
    }

    // 2. 有名地名を一括検索
    for (const placeName of FAMOUS_PLACE_NAMES) {
      let idx = text.indexOf(placeName);
      while (idx >= 0) {
        // 地名の各文字位置をマーク
        for (let i = 0; i < placeName.length; i++) {
          famousPlacePositions.add(idx + i);
        }
        idx = text.indexOf(placeName, idx + 1);
      }
    }

    // 3. 住所キーワードを検索し、後続100文字をマーク
    for (const keyword of ADDRESS_KEYWORDS) {
      let idx = text.indexOf(keyword);
      while (idx >= 0) {
        const rangeEnd = Math.min(idx + keyword.length + 100, text.length);
        for (let i = idx; i < rangeEnd; i++) {
          addressContextPositions.add(i);
        }
        idx = text.indexOf(keyword, idx + 1);
      }
    }

    // Note: ステップ4-5（敬称パターン・地名接尾辞の全位置走査）は
    // O(N × パターン数) で高コストのため削除。
    // これらは getExclusionReasonOptimized 内で必要時のみ
    // 従来ロジック（isLikelyName, isLikelyPlaceName）を使用する。

    return {
      surnamePatternPositions,
      famousPlacePositions,
      addressContextPositions,
      likelyNamePositions,
      placeNameSuffixPositions
    };
  }

  /**
   * 文字の除外理由を判定（最適化版）
   * PreprocessedContext を使用してO(1)で判定し、必要時のみフォールバック
   */
  getExclusionReasonOptimized(
    text: string,
    position: number,
    tokenContext: TokenExclusionContext,
    config: {
      excludeProperNouns: boolean;
      excludeJinmeiKanji: boolean;
      excludePlaceNames: boolean;
    },
    ctx: PreprocessedContext
  ): ExclusionReason {
    // キャッシュチェック
    const cached = this.exclusionCache.get(position);
    if (cached !== undefined) {
      return cached;
    }

    let reason: ExclusionReason = null;

    // 1. 固有名詞除外（形態素解析ベース）
    if (config.excludeProperNouns && tokenContext.isProperNoun) {
      reason = 'proper_noun';
    }

    // 2. 人名用漢字・旧字体姓の除外
    if (reason === null && config.excludeJinmeiKanji) {
      // 事前検索で見つかった姓パターン（O(1)）
      if (ctx.surnamePatternPositions.has(position)) {
        reason = 'surname';
      }
      // フォールバック: 敬称付き名前パターン（必要時のみ実行）
      else if (isLikelyName(text, position)) {
        reason = 'surname';
      }
    }

    // 3. 地名の除外
    if (reason === null && config.excludePlaceNames) {
      const char = text[position];
      const isPlaceNameCandidate = isChimeiKanji(char) || isChimeiKyujitai(char);

      if (tokenContext.isPlaceName) {
        reason = 'place_name';
      }
      // 事前検索で見つかった有名地名（O(1)）
      else if (ctx.famousPlacePositions.has(position)) {
        reason = 'place_name';
      }
      // 事前検索で見つかった住所コンテキスト（O(1)）
      else if (ctx.addressContextPositions.has(position)) {
        reason = 'address';
      }
      // フォールバック: 地名接尾辞パターン（必要時のみ実行）
      else if (isPlaceNameCandidate && isLikelyPlaceName(text, position)) {
        reason = 'place_name';
      }
    }

    // キャッシュに保存
    this.exclusionCache.set(position, reason);

    return reason;
  }

  /**
   * 文字の除外理由を判定（フォールバック版 - 互換性維持）
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
      // 住所文脈
      if (isAddressContext(text, position)) {
        return 'address';
      }

      const isPlaceNameCandidate = isChimeiKanji(char) || isChimeiKyujitai(char);

      // 地名パターンにマッチ
      if (isPlaceNameCandidate && isLikelyPlaceName(text, position)) {
        return 'place_name';
      }
    }

    return null;
  }

  /**
   * テキスト中の常用漢字外の漢字を検出（最適化版）
   * 事前検索コンテキストを使用してO(1)で除外判定を行う
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

    // キャッシュをクリア（解析サイクルの開始）
    this.exclusionCache.clear();

    // 事前検索コンテキストを構築（1回のみ）
    const ctx = this.buildPreprocessedContext(text);

    // トークンごとに処理
    for (const token of tokens) {
      const surface = token.surface || '';
      const tokenStart = token.start;

      const properNounType = this.getProperNounType(token);
      const tokenContext: TokenExclusionContext = {
        isProperNoun: properNounType !== null,
        isPlaceName: properNounType === 'place'
      };

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

        // 除外理由を判定（最適化版 - 事前検索結果はO(1)、フォールバックは必要時のみ）
        const exclusionReason = this.getExclusionReasonOptimized(
          text,
          position,
          tokenContext,
          config,
          ctx
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
          isProperNoun: tokenContext.isProperNoun,
          isJinmeiKanji: isJinmeiKanji(char),
          isSurname: ctx.surnamePatternPositions.has(position),
          isPlaceName: tokenContext.isPlaceName
            || ctx.famousPlacePositions.has(position)
            || ctx.placeNameSuffixPositions.has(position),
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

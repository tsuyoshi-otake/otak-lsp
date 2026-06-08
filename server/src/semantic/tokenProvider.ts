/**
 * Semantic Token Provider
 * 品詞に基づいたセマンティックトークン情報を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 4.1, 4.2, 4.3, 4.4
 */

import { Token, SemanticTokens } from '../../../shared/src/types';
import { computeLineStarts } from '../utils/lineStarts';
import { isEmpty } from '../utils/arrayUtils';

const ASCII_ONLY_RE = /^[\x00-\x7F]+$/;

/**
 * セマンティックトークンタイプ
 */
export enum TokenType {
  Noun = 0,
  Verb = 1,
  Adjective = 2,
  Particle = 3,
  Adverb = 4,
  Other = 5
}

/**
 * トークンタイプ名のリスト
 */
const TOKEN_TYPE_NAMES = ['noun', 'verb', 'adjective', 'particle', 'adverb', 'other'];

/**
 * エクスポート用のトークンタイプ
 */
export const tokenTypes = TOKEN_TYPE_NAMES;

/**
 * エクスポート用のトークン修飾子
 */
export const tokenModifiers: string[] = [];

/**
 * 品詞からTokenTypeへのマッピング
 */
const POS_TO_TOKEN_TYPE: Record<string, TokenType> = {
  '名詞': TokenType.Noun,
  '動詞': TokenType.Verb,
  // 補助動詞も動詞系として扱う
  '助動詞': TokenType.Verb,
  '形容詞': TokenType.Adjective,
  // 連体詞（この/その/あの等）は形容詞系として扱う
  '連体詞': TokenType.Adjective,
  '助詞': TokenType.Particle,
  // 接続詞（そして/しかし等）は機能語として助詞系に寄せる
  '接続詞': TokenType.Particle,
  // 接頭詞（お/ご/超等）は名詞系に寄せる
  '接頭詞': TokenType.Noun,
  // 感動詞（こんにちは/やった等）は内容語として名詞系に寄せる
  '感動詞': TokenType.Noun,
  // フィラー（えーと/あのー等）は話者の挿入語として副詞系に寄せる
  'フィラー': TokenType.Adverb,
  '副詞': TokenType.Adverb
};

/**
 * セマンティックトークンプロバイダー
 */
export class SemanticTokenProvider {
  /**
   * 品詞からTokenTypeへのマッピング
   */
  mapPosToTokenType(pos: string): TokenType {
    // 記号はハイライト対象外としてotherに固定する。
    // マッピングに無い未知品詞（「その他」など）は名詞として誤って色付けせず、
    // ハイライト対象外のOtherへ落とす（色分けの正確性を優先）。
    if (pos === '記号') {
      return TokenType.Other;
    }
    return POS_TO_TOKEN_TYPE[pos] ?? TokenType.Other;
  }

  /**
   * トークン情報（品詞細分類や表層）を含めてTokenTypeを決定
   * Markdown/コメント内での自然な色分けを優先する。
   */
  private mapTokenToTokenType(token: Token): TokenType {
    const pos = token.pos;

    // 記号は常にOther
    if (pos === '記号') {
      return TokenType.Other;
    }

    // 名詞の細分類による補正
    if (pos === '名詞') {
      // 形容動詞語幹（「静か」「便利」など）は形容詞系として扱う
      if (token.posDetail1 === '形容動詞語幹') {
        return TokenType.Adjective;
      }

      // 副詞可能名詞（「今日」「明日」など）は副詞系として扱う
      if (token.posDetail1 === '副詞可能') {
        return TokenType.Adverb;
      }

      // 数（数字トークン）は内容語としての名詞よりノイズになりやすいのでOtherへ
      if (token.posDetail1 === '数') {
        return TokenType.Other;
      }
    }

    // ASCIIのみのトークンは日本語品詞としての色分けがノイズになりやすい
    if (ASCII_ONLY_RE.test(token.surface)) {
      return TokenType.Other;
    }

    return this.mapPosToTokenType(pos);
  }

  /**
   * トークンリストからセマンティックトークンを生成
   * 形式: [line, startChar, length, tokenType, tokenModifiers]
   * 位置情報は相対位置で表現される
   */
  provideSemanticTokens(tokens: Token[], text: string, lineStarts?: number[]): SemanticTokens {
    if (isEmpty(tokens)) {
      return { data: [] };
    }

    const effectiveLineStarts = lineStarts ?? computeLineStarts(text);

    // セマンティックトークンの相対位置エンコード（deltaLine/deltaStartChar）は
    // 開始位置の昇順を前提とする。未ソートの入力をそのまま出力すると deltaStartChar が
    // 負になり LSP クライアント側のデコードが破綻するため、必ず昇順へ整列してから出力する。
    const isSortedByStart = (() => {
      for (let i = 1; i < tokens.length; i++) {
        if (tokens[i - 1].start > tokens[i].start) {
          return false;
        }
      }
      return true;
    })();
    const orderedTokens = isSortedByStart ? tokens : [...tokens].sort((a, b) => a.start - b.start);

    const data = new Array<number>(orderedTokens.length * 5);
    let dataIndex = 0;
    let prevLine = 0;
    let prevChar = 0;

    let currentLine = 0;
    let nextLineStartIndex = 1;

    for (const token of orderedTokens) {
      // 整列済みなので、行は単調増加で順次求められる
      while (nextLineStartIndex < effectiveLineStarts.length && token.start >= effectiveLineStarts[nextLineStartIndex]) {
        currentLine = nextLineStartIndex;
        nextLineStartIndex++;
      }
      const line = currentLine;
      const char = token.start - effectiveLineStarts[line];

      // 相対位置を計算
      const deltaLine = line - prevLine;
      const deltaChar = deltaLine === 0 ? char - prevChar : char;

      // セマンティックトークンのデータを追加
      // [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
      data[dataIndex++] = deltaLine; // 相対行
      data[dataIndex++] = deltaChar; // 相対文字位置
      data[dataIndex++] = token.surface.length; // トークンの長さ
      data[dataIndex++] = this.mapTokenToTokenType(token); // トークンタイプ
      data[dataIndex++] = 0; // トークン修飾子（現在は未使用）

      prevLine = line;
      prevChar = char;
    }

    if (dataIndex !== data.length) {
      data.length = dataIndex;
    }

    return { data };
  }

  /**
   * トークンタイプの凡例を取得
   */
  getTokenTypeLegend(): string[] {
    return [...TOKEN_TYPE_NAMES];
  }

  /**
   * トークン修飾子の凡例を取得
   */
  getTokenModifierLegend(): string[] {
    return [];
  }
}

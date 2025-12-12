/**
 * Semantic Token Provider
 * 品詞に基づいたセマンティックトークン情報を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 4.1, 4.2, 4.3, 4.4
 */

import { Token, SemanticTokens } from '../../../shared/src/types';

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
    // 記号はハイライト対象外としてotherに固定し、それ以外の未知品詞は名詞系として扱う
    if (pos === '記号') {
      return TokenType.Other;
    }
    return POS_TO_TOKEN_TYPE[pos] ?? TokenType.Noun;
  }

  /**
   * トークンリストからセマンティックトークンを生成
   * 形式: [line, startChar, length, tokenType, tokenModifiers]
   * 位置情報は相対位置で表現される
   */
  provideSemanticTokens(tokens: Token[], text: string): SemanticTokens {
    if (!tokens || tokens.length === 0) {
      return { data: [] };
    }

    // テキストから行ごとの開始位置を計算
    const lineStarts: number[] = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        lineStarts.push(i + 1);
      }
    }

    // オフセットから行と文字位置を取得する関数
    const getLineAndChar = (offset: number): { line: number; char: number } => {
      let line = 0;
      for (let i = 1; i < lineStarts.length; i++) {
        if (offset < lineStarts[i]) {
          break;
        }
        line = i;
      }
      return { line, char: offset - lineStarts[line] };
    };

    const data: number[] = [];
    let prevLine = 0;
    let prevChar = 0;

    for (const token of tokens) {
      // 現在のトークンの行と文字位置を計算
      const { line, char } = getLineAndChar(token.start);

      // 相対位置を計算
      const deltaLine = line - prevLine;
      const deltaChar = deltaLine === 0 ? char - prevChar : char;

      // セマンティックトークンのデータを追加
      // [deltaLine, deltaStartChar, length, tokenType, tokenModifiers]
      data.push(
        deltaLine,                           // 相対行
        deltaChar,                           // 相対文字位置
        token.surface.length,                // トークンの長さ
        this.mapPosToTokenType(token.pos),   // トークンタイプ
        0                                    // トークン修飾子（現在は未使用）
      );

      prevLine = line;
      prevChar = char;
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

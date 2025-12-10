/**
 * Hover Provider
 * ホバー情報を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Token } from '../../../shared/src/types';
import { WikipediaClient } from '../wikipedia/client';

/**
 * ホバー結果
 */
export interface HoverResult {
  contents: string;
  range: {
    start: number;
    end: number;
  };
}

/**
 * ホバー情報プロバイダー
 * 形態素情報とWikipediaサマリーを提供する
 */
export class HoverProvider {
  private wikipediaClient: WikipediaClient;
  private wikipediaEnabled: boolean = true;

  // Wikipedia検索をスキップする品詞
  private static readonly SKIP_WIKIPEDIA_POS = ['助詞', '助動詞', '記号', '接続詞'];

  constructor(wikipediaClient: WikipediaClient) {
    this.wikipediaClient = wikipediaClient;
  }

  /**
   * Wikipedia検索の有効/無効を設定
   */
  setWikipediaEnabled(enabled: boolean): void {
    this.wikipediaEnabled = enabled;
  }

  /**
   * 指定位置のトークンを取得
   * @param tokens トークンリスト
   * @param position 文字位置
   * @returns 該当トークン、または見つからない場合はnull
   */
  getTokenAtPosition(tokens: Token[], position: number): Token | null {
    if (!tokens || tokens.length === 0) {
      return null;
    }

    for (const token of tokens) {
      if (position >= token.start && position < token.end) {
        return token;
      }
    }

    return null;
  }

  /**
   * 形態素情報をフォーマット
   * @param token トークン
   * @returns マークダウン形式の形態素情報
   */
  formatMorphemeInfo(token: Token): string {
    const lines: string[] = [];

    // 表層形
    lines.push(`**表層形**: ${token.surface}`);

    // 品詞
    lines.push(`**品詞**: ${this.formatPos(token)}`);

    // 原形（*以外の場合のみ）
    if (token.baseForm && token.baseForm !== '*') {
      lines.push(`**原形**: ${token.baseForm}`);
    }

    // 読み（*以外の場合のみ）
    if (token.reading && token.reading !== '*') {
      lines.push(`**読み**: ${token.reading}`);
    }

    return lines.join('\n\n');
  }

  /**
   * 品詞情報をフォーマット
   */
  private formatPos(token: Token): string {
    const parts = [token.pos];

    if (token.posDetail1 && token.posDetail1 !== '*') {
      parts.push(token.posDetail1);
    }

    return parts.join('-');
  }

  /**
   * ホバー情報を提供
   * @param tokens トークンリスト
   * @param position 文字位置
   * @returns ホバー情報、または該当トークンがない場合はnull
   */
  async provideHover(tokens: Token[], position: number): Promise<HoverResult | null> {
    const token = this.getTokenAtPosition(tokens, position);
    if (!token) {
      return null;
    }

    let contents = this.formatMorphemeInfo(token);

    // Wikipedia検索（有効かつ対象品詞の場合）
    if (this.wikipediaEnabled && this.shouldFetchWikipedia(token)) {
      const summary = await this.fetchWikipediaSummary(token);
      if (summary) {
        contents += '\n\n---\n\n**Wikipedia**:\n\n' + summary;
      }
    }

    return {
      contents,
      range: {
        start: token.start,
        end: token.end
      }
    };
  }

  /**
   * Wikipedia検索対象かどうかを判定
   */
  private shouldFetchWikipedia(token: Token): boolean {
    return !HoverProvider.SKIP_WIKIPEDIA_POS.includes(token.pos);
  }

  /**
   * Wikipediaサマリーを取得
   */
  private async fetchWikipediaSummary(token: Token): Promise<string | null> {
    // 原形があれば原形で検索、なければ表層形で検索
    const searchTerm = (token.baseForm && token.baseForm !== '*')
      ? token.baseForm
      : token.surface;

    return this.wikipediaClient.getSummary(searchTerm);
  }
}

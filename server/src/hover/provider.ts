/**
 * Hover Provider
 * ホバー情報を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { GlossaryId, Token } from '../../../shared/src/types';
import { WikipediaClient } from '../wikipedia/client';
import { DEFAULT_ENABLED_GLOSSARIES, findGlossaryHit, findGlossaryMatch } from './glossary';

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
  private glossaryEnabled: boolean = true;
  private enabledGlossaries: GlossaryId[] = [...DEFAULT_ENABLED_GLOSSARIES];

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
   * 用語図鑑表示の有効/無効を設定
   */
  setGlossaryEnabled(enabled: boolean): void {
    this.glossaryEnabled = enabled;
  }

  /**
   * 有効な用語図鑑を設定
   */
  setEnabledGlossaries(glossaries: GlossaryId[]): void {
    this.enabledGlossaries = Array.isArray(glossaries) ? [...glossaries] : [...DEFAULT_ENABLED_GLOSSARIES];
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
   * @param documentText ドキュメント全体（用語図鑑の複合語マッチ用）
   * @returns ホバー情報、または該当トークンがない場合はnull
   */
  async provideHover(tokens: Token[], position: number, documentText?: string): Promise<HoverResult | null> {
    const token = this.getTokenAtPosition(tokens, position);
    let contents = '';
    if (token) {
      contents = this.formatMorphemeInfo(token);
    }

    // Wikipedia検索（有効かつ対象品詞の場合）
    if (token && this.wikipediaEnabled && this.shouldFetchWikipedia(token)) {
      const summary = await this.fetchWikipediaSummary(token);
      if (summary) {
        contents += '\n\n---\n\n**Wikipedia**:\n\n' + summary;
      }
    }

    // 用語図鑑（オフライン）
    let glossaryRange: { start: number; end: number } | null = null;
    if (this.glossaryEnabled) {
      const hitFromText = documentText ? findGlossaryMatch(documentText, position, this.enabledGlossaries) : null;
      const hit = hitFromText?.hit ?? (token ? findGlossaryHit(token, this.enabledGlossaries) : null);
      glossaryRange = hitFromText?.range ?? null;
      if (hit) {
        const extraLines: string[] = [];
        const normalize = (value: string): string => value.normalize('NFKC').trim().toLowerCase();
        const uniq = (values: ReadonlyArray<string> | undefined): string[] => {
          const baseKey = normalize(hit.term);
          const seen = new Set<string>();
          return (values ?? []).filter((value) => {
            const key = normalize(value);
            if (!key || key === baseKey || seen.has(key)) {
              return false;
            }
            seen.add(key);
            return true;
          });
        };

        const aliases = uniq(hit.aliases);
        if (aliases.length > 0) {
          extraLines.push(`**別名**: ${aliases.join(' / ')}`);
        }

        const synonyms = uniq(hit.synonyms);
        if (synonyms.length > 0) {
          extraLines.push(`**類義語**: ${synonyms.join(' / ')}`);
        }

        const antonyms = uniq(hit.antonyms);
        if (antonyms.length > 0) {
          extraLines.push(`**対義語**: ${antonyms.join(' / ')}`);
        }

        const extras = extraLines.length > 0 ? `\n\n${extraLines.join('\n\n')}` : '';
        const prefix = contents.length > 0 ? '\n\n---\n\n' : '';
        contents += `${prefix}**${hit.title}**:\n\n${hit.description}${extras}`;
      }
    }

    if (contents.length === 0) {
      return null;
    }

    let rangeStart = token?.start ?? glossaryRange?.start;
    let rangeEnd = token?.end ?? glossaryRange?.end;
    if (glossaryRange && token) {
      const tokenLen = token.end - token.start;
      const glossaryLen = glossaryRange.end - glossaryRange.start;
      if (glossaryLen > tokenLen) {
        rangeStart = glossaryRange.start;
        rangeEnd = glossaryRange.end;
      }
    }

    if (rangeStart === undefined || rangeEnd === undefined) {
      return null;
    }

    return {
      contents,
      range: {
        start: rangeStart,
        end: rangeEnd
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

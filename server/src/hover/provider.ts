/**
 * Hover Provider
 * ホバー情報を提供する
 * Feature: japanese-grammar-analyzer
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { GlossaryId, Token } from '../../../shared/src/types';
import { WikipediaClient } from '../wikipedia/client';
import { createGlossaryRank, DEFAULT_ENABLED_GLOSSARIES, findGlossaryHitWithRank, findGlossaryMatchWithRank } from './glossary';
import { isNotEmpty } from '../utils/arrayUtils';

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
  private glossaryRank: ReadonlyMap<GlossaryId, number> = createGlossaryRank(DEFAULT_ENABLED_GLOSSARIES);

  // Wikipedia検索をスキップする品詞
  private static readonly SKIP_WIKIPEDIA_POS = ['助詞', '助動詞', '記号', '接続詞'];

  // C++ / C# / Node.js など「英数字+記号」の用語抽出用
  private static readonly TECH_TERM_CHAR_REGEX = /[A-Za-z0-9+#.\-_]/;
  private static readonly TECH_TERM_HAS_ALNUM_REGEX = /[A-Za-z0-9]/;

  constructor(wikipediaClient: WikipediaClient) {
    this.wikipediaClient = wikipediaClient;
  }

  private refreshGlossaryRank(): void {
    this.glossaryRank = createGlossaryRank(this.enabledGlossaries);
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
    this.refreshGlossaryRank();
  }

  /**
   * 指定位置のトークンを取得
   * @param tokens トークンリスト
   * @param position 文字位置
   * @returns 該当トークン、または見つからない場合はnull
   */
  getTokenAtPosition(tokens: Token[], position: number): Token | null {
    if (!isNotEmpty(tokens)) {
      return null;
    }

    // tokens は通常 start 昇順なので二分探索で高速化（ホバーは高頻度で呼ばれる）
    let low = 0;
    let high = tokens.length - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      const token = tokens[mid];
      if (position < token.start) {
        high = mid - 1;
        continue;
      }
      if (position >= token.end) {
        low = mid + 1;
        continue;
      }
      return token;
    }

    // 念のためフォールバック（万一ソートされていない場合）
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
    const techTerm = documentText ? this.extractTechTermAtPosition(documentText, position) : null;
    let contents = '';

    const shouldShowTechTerm = !!(
      techTerm
      && (!token || token.pos === '記号' || techTerm.term.length > (token.end - token.start))
    );
    if (shouldShowTechTerm) {
      contents = `**用語**: ${techTerm!.term}`;
    }

    if (token) {
      const morphemeInfo = this.formatMorphemeInfo(token);
      if (contents.length > 0) {
        if (token.pos !== '記号') {
          contents += '\n\n---\n\n' + morphemeInfo;
        }
      } else {
        contents = morphemeInfo;
      }
    }

    // Wikipedia検索（有効かつ対象品詞の場合）
    if (this.wikipediaEnabled) {
      const search = this.getWikipediaSearch(token, techTerm);
      if (search) {
        const cachedSummary = this.wikipediaClient.getCachedSummary(search.term);
        if (cachedSummary) {
          contents += '\n\n---\n\n**Wikipedia**:\n\n' + cachedSummary;
        } else {
          // Hoverを待たせない（VS Codeの"Loading..."を出さない）ため、
          // サマリーはバックグラウンドで事前取得し、次回以降のHoverで表示する。
          this.wikipediaClient.prefetchSummary(search.term);
        }
      }
    }

    // 用語図鑑（オフライン）
    let glossaryRange: { start: number; end: number } | null = null;
    if (this.glossaryEnabled) {
      const hitFromText = documentText ? findGlossaryMatchWithRank(documentText, position, this.glossaryRank) : null;
      const hit = hitFromText?.hit ?? (token ? findGlossaryHitWithRank(token, this.glossaryRank) : null);
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

    const candidates: Array<{ start: number; end: number }> = [];
    if (token) {
      candidates.push({ start: token.start, end: token.end });
    }
    if (glossaryRange) {
      candidates.push({ start: glossaryRange.start, end: glossaryRange.end });
    }
    if (techTerm) {
      candidates.push({ start: techTerm.start, end: techTerm.end });
    }

    let selectedRange = candidates[0] ?? null;
    for (const c of candidates) {
      if (!selectedRange) {
        selectedRange = c;
        continue;
      }
      const currentLen = selectedRange.end - selectedRange.start;
      const nextLen = c.end - c.start;
      if (nextLen > currentLen) {
        selectedRange = c;
      }
    }

    if (!selectedRange) {
      return null;
    }

    return {
      contents,
      range: {
        start: selectedRange.start,
        end: selectedRange.end
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
   * Wikipedia検索用の用語（と範囲）を決定
   */
  private getWikipediaSearch(
    token: Token | null,
    techTerm: { term: string; start: number; end: number } | null
  ): { term: string; start: number; end: number } | null {
    if (techTerm) {
      if (!token) {
        return techTerm;
      }
      if (!this.shouldFetchWikipedia(token)) {
        return techTerm;
      }
      const tokenSurface = token.surface ?? '';
      if (techTerm.term.length > tokenSurface.length) {
        return techTerm;
      }
    }

    if (!token || !this.shouldFetchWikipedia(token)) {
      return null;
    }

    const searchTerm = (token.baseForm && token.baseForm !== '*') ? token.baseForm : token.surface;
    return { term: searchTerm, start: token.start, end: token.end };
  }

  /**
   * ドキュメント中の指定位置から「英数字+記号」の用語を抽出（例: C++, C#, Node.js）
   */
  private extractTechTermAtPosition(text: string, position: number): { term: string; start: number; end: number } | null {
    if (!text || position < 0) {
      return null;
    }

    let index = position;
    if (index >= text.length) {
      index = text.length - 1;
    }
    if (index < 0) {
      return null;
    }

    const isAllowed = (ch: string): boolean => HoverProvider.TECH_TERM_CHAR_REGEX.test(ch);

    if (!isAllowed(text[index]) && index > 0 && isAllowed(text[index - 1])) {
      index -= 1;
    }

    if (!isAllowed(text[index])) {
      return null;
    }

    let start = index;
    while (start > 0 && isAllowed(text[start - 1])) {
      start -= 1;
    }

    let end = index + 1;
    while (end < text.length && isAllowed(text[end])) {
      end += 1;
    }

    const term = text.slice(start, end);
    if (term.length < 2 || term.length > 80) {
      return null;
    }
    if (!HoverProvider.TECH_TERM_HAS_ALNUM_REGEX.test(term)) {
      return null;
    }

    return { term, start, end };
  }
}

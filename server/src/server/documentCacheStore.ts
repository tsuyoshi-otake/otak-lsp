/**
 * DocumentCacheStore
 *
 * 解析結果（トークン・テキスト・除外範囲・行開始位置・セマンティックトークン）の
 * URI 単位のキャッシュを集約管理する。
 */

import { SemanticTokens } from 'vscode-languageserver/node';
import { Token } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

export interface DocumentCacheEntry {
  tokens: Token[];
  text: string;
  excludedRanges: ExcludedRange[];
  lineStarts: number[];
}

interface SemanticTokensCacheValue {
  tokens: Token[];
  lineStarts: number[];
  semanticTokens: SemanticTokens;
}

export class DocumentCacheStore {
  private tokens: Map<string, Token[]> = new Map();
  private texts: Map<string, string> = new Map();
  private excludedRanges: Map<string, ExcludedRange[]> = new Map();
  private lineStarts: Map<string, number[]> = new Map();
  private semanticTokensCache: Map<string, SemanticTokensCacheValue> = new Map();

  setAnalysisResult(
    uri: string,
    tokens: Token[],
    text: string,
    excludedRanges: ExcludedRange[],
    lineStarts: number[]
  ): void {
    this.tokens.set(uri, tokens);
    this.texts.set(uri, text);
    if (excludedRanges.length > 0) {
      this.excludedRanges.set(uri, excludedRanges);
    }
    this.lineStarts.set(uri, lineStarts);
    this.semanticTokensCache.delete(uri);
  }

  getTokens(uri: string): Token[] | undefined {
    return this.tokens.get(uri);
  }

  getText(uri: string): string | undefined {
    return this.texts.get(uri);
  }

  getLineStarts(uri: string): number[] | undefined {
    return this.lineStarts.get(uri);
  }

  setLineStarts(uri: string, lineStarts: number[]): void {
    this.lineStarts.set(uri, lineStarts);
  }

  getSemanticTokensCache(uri: string): SemanticTokensCacheValue | undefined {
    return this.semanticTokensCache.get(uri);
  }

  setSemanticTokensCache(uri: string, value: SemanticTokensCacheValue): void {
    this.semanticTokensCache.set(uri, value);
  }

  getEntry(uri: string): DocumentCacheEntry | undefined {
    const tokens = this.tokens.get(uri);
    const text = this.texts.get(uri);
    if (!tokens || !text) {
      return undefined;
    }
    return {
      tokens,
      text,
      excludedRanges: this.excludedRanges.get(uri) ?? [],
      lineStarts: this.lineStarts.get(uri) ?? [0],
    };
  }

  setEntry(uri: string, entry: DocumentCacheEntry): void {
    this.tokens.set(uri, entry.tokens);
    this.texts.set(uri, entry.text);
    this.excludedRanges.set(uri, entry.excludedRanges);
    this.lineStarts.set(uri, entry.lineStarts);
  }

  clear(uri: string): void {
    this.tokens.delete(uri);
    this.texts.delete(uri);
    this.excludedRanges.delete(uri);
    this.lineStarts.delete(uri);
    this.semanticTokensCache.delete(uri);
  }

  clearAll(): void {
    this.tokens.clear();
    this.texts.clear();
    this.excludedRanges.clear();
    this.lineStarts.clear();
    this.semanticTokensCache.clear();
  }
}

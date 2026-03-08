/**
 * Kuromoji Analyzer
 * kuromoji-optimizedを使用した形態素解析器（MeCab互換）
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 1.2, 1.3
 */

import * as kuromoji from 'kuromoji-optimized';
import * as path from 'path';
import { Token } from '../../../shared/src/types';
import { formatError } from '../utils/errorHandler';
import { isBlank } from '../utils/stringUtils';

// kuromoji のトークン型定義
interface KuromojiToken {
  surface_form: string;
  pos: string;
  pos_detail_1: string;
  pos_detail_2: string;
  pos_detail_3: string;
  conjugated_type: string;
  conjugated_form: string;
  basic_form: string;
  reading?: string;
  pronunciation?: string;
  word_position: number;
}

/**
 * キャッシュエントリ
 */
interface CacheEntry {
  tokens: Token[];
  accessTime: number;
}

/**
 * Kuromoji形態素解析器（MeCab互換API）
 */
export class MeCabAnalyzer {
  // NOTE: kuromoji 初期化は重いので、プロセス内で共有して多重初期化を避ける
  private static tokenizer: kuromoji.Tokenizer<KuromojiToken> | null = null;
  private static initPromise: Promise<void> | null = null;

  // トークンキャッシュ（テキストハッシュ → トークン配列）
  private static tokenCache: Map<string, CacheEntry> = new Map();
  private static readonly MAX_CACHE_SIZE = 10; // 最大キャッシュ数
  private static cacheHits = 0;
  private static cacheMisses = 0;

  // mecabPathパラメータは互換性のために残すが使用しない（kuromoji-optimizedを使用）
  constructor(_mecabPath?: string) {
    // 何もしない - kuromoji-optimizedは外部依存なし
  }

  /**
   * 簡易ハッシュ関数（テキストからキャッシュキーを生成）
   */
  private static hashText(text: string): string {
    // 長さとサンプリングによる簡易ハッシュ
    const len = text.length;
    if (len < 100) {
      return `${len}:${text}`;
    }
    // 長いテキストは先頭・中央・末尾のサンプルでハッシュ
    const sample = text.slice(0, 50) + text.slice(len / 2 - 25, len / 2 + 25) + text.slice(-50);
    return `${len}:${sample}`;
  }

  /**
   * キャッシュ統計を取得
   */
  static getCacheStats(): { hits: number; misses: number; size: number } {
    return {
      hits: MeCabAnalyzer.cacheHits,
      misses: MeCabAnalyzer.cacheMisses,
      size: MeCabAnalyzer.tokenCache.size,
    };
  }

  /**
   * キャッシュをクリア
   */
  static clearCache(): void {
    MeCabAnalyzer.tokenCache.clear();
    MeCabAnalyzer.cacheHits = 0;
    MeCabAnalyzer.cacheMisses = 0;
  }

  /**
   * トークナイザーを初期化
   */
  private async initialize(): Promise<void> {
    if (MeCabAnalyzer.tokenizer) {
      return;
    }

    if (MeCabAnalyzer.initPromise) {
      return MeCabAnalyzer.initPromise;
    }

    MeCabAnalyzer.initPromise = new Promise((resolve, reject) => {
      // kuromoji の辞書パスを設定
      // require.resolve でkuromojiモジュールの場所を特定
      let dicPath: string;
      try {
        const kuromojiPath = require.resolve('kuromoji-optimized');
        dicPath = path.join(path.dirname(kuromojiPath), '..', 'dict');
      } catch {
        // フォールバック: __dirnameから相対パス
        dicPath = path.join(__dirname, '..', '..', 'node_modules', 'kuromoji-optimized', 'dict');
      }

      try {
        kuromoji.builder({ dicPath }).build((err, tokenizer) => {
          if (err) {
            MeCabAnalyzer.initPromise = null;
            reject(new Error(`辞書の読み込みに失敗しました: ${err.message}`));
            return;
          }
          MeCabAnalyzer.tokenizer = tokenizer as kuromoji.Tokenizer<KuromojiToken>;
          resolve();
        });
      } catch (err) {
        MeCabAnalyzer.initPromise = null;
        reject(err instanceof Error ? err : new Error(formatError(err)));
      }
    });

    return MeCabAnalyzer.initPromise;
  }

  /**
   * 解析器が利用可能かどうかを確認（常にtrue - 外部依存なし）
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initialize();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * バージョン情報を取得
   */
  async getVersion(): Promise<string> {
    return 'kuromoji-optimized 1.0.0 (IPA辞書内蔵)';
  }

  /**
   * テキストを形態素解析（キャッシュ付き）
   */
  async analyze(text: string): Promise<Token[]> {
    if (isBlank(text)) {
      return [];
    }

    // キャッシュチェック
    const cacheKey = MeCabAnalyzer.hashText(text);
    const cached = MeCabAnalyzer.tokenCache.get(cacheKey);
    if (cached) {
      // キャッシュヒット
      cached.accessTime = Date.now();
      MeCabAnalyzer.cacheHits++;
      return cached.tokens;
    }

    await this.initialize();

    if (!MeCabAnalyzer.tokenizer) {
      throw new Error('トークナイザーの初期化に失敗しました');
    }

    MeCabAnalyzer.cacheMisses++;
    const kuromojiTokens = MeCabAnalyzer.tokenizer.tokenize(text);
    const tokens = this.convertToTokens(kuromojiTokens);

    // キャッシュに保存
    this.addToCache(cacheKey, tokens);

    return tokens;
  }

  /**
   * キャッシュに追加（LRU方式で古いエントリを削除）
   */
  private addToCache(key: string, tokens: Token[]): void {
    // キャッシュサイズ制限チェック
    if (MeCabAnalyzer.tokenCache.size >= MeCabAnalyzer.MAX_CACHE_SIZE) {
      // 最も古いエントリを削除
      let oldestKey: string | null = null;
      let oldestTime = Infinity;
      for (const [k, v] of MeCabAnalyzer.tokenCache) {
        if (v.accessTime < oldestTime) {
          oldestTime = v.accessTime;
          oldestKey = k;
        }
      }
      if (oldestKey) {
        MeCabAnalyzer.tokenCache.delete(oldestKey);
      }
    }

    MeCabAnalyzer.tokenCache.set(key, {
      tokens,
      accessTime: Date.now(),
    });
  }

  /**
   * kuromojiのトークンをToken型に変換
   * kuromoji の word_position はバイトオフセットなので、文字オフセットに変換する
   */
  private convertToTokens(kuromojiTokens: KuromojiToken[]): Token[] {
    let charPosition = 0;

    return kuromojiTokens.map((kt) => {
      const start = charPosition;
      const end = charPosition + kt.surface_form.length;
      charPosition = end;

      return new Token({
        surface: kt.surface_form,
        pos: kt.pos || '*',
        posDetail1: kt.pos_detail_1 || '*',
        posDetail2: kt.pos_detail_2 || '*',
        posDetail3: kt.pos_detail_3 || '*',
        conjugation: kt.conjugated_type || '*',
        conjugationForm: kt.conjugated_form || '*',
        baseForm: kt.basic_form || '*',
        reading: kt.reading || '*',
        pronunciation: kt.pronunciation || '*',
        start,
        end
      });
    });
  }

  /**
   * MeCab出力形式をパース（互換性のために残す）
   * @deprecated kuromoji使用時は不要
   */
  parseMeCabOutput(output: string): Token[] {
    const tokens: Token[] = [];
    const lines = output.split('\n');
    let currentPosition = 0;

    for (const line of lines) {
      if (line === 'EOS' || isBlank(line)) {
        continue;
      }

      const tabIndex = line.indexOf('\t');
      if (tabIndex === -1) {
        continue;
      }

      const surface = line.substring(0, tabIndex);
      const features = line.substring(tabIndex + 1).split(',');

      const token = new Token({
        surface,
        pos: features[0] || '*',
        posDetail1: features[1] || '*',
        posDetail2: features[2] || '*',
        posDetail3: features[3] || '*',
        conjugation: features[4] || '*',
        conjugationForm: features[5] || '*',
        baseForm: features[6] || '*',
        reading: features[7] || '*',
        pronunciation: features[8] || '*',
        start: currentPosition,
        end: currentPosition + surface.length
      });

      tokens.push(token);
      currentPosition += surface.length;
    }

    return tokens;
  }
}

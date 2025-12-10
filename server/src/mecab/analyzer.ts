/**
 * Kuromoji Analyzer
 * kuromoji.jsを使用した形態素解析器（MeCab互換）
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 1.2, 1.3
 */

import * as kuromoji from 'kuromoji';
import * as path from 'path';
import { Token } from '../../../shared/src/types';

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
 * Kuromoji形態素解析器（MeCab互換API）
 */
export class MeCabAnalyzer {
  private tokenizer: kuromoji.Tokenizer<KuromojiToken> | null = null;
  private initPromise: Promise<void> | null = null;
  private initialized: boolean = false;

  constructor(_mecabPath?: string) {
    // mecabPath引数は互換性のために残すが、使用しない
  }

  /**
   * トークナイザーを初期化
   */
  private async initialize(): Promise<void> {
    if (this.initialized && this.tokenizer) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      // kuromoji の辞書パスを設定
      // require.resolve でkuromojiモジュールの場所を特定
      let dicPath: string;
      try {
        const kuromojiPath = require.resolve('kuromoji');
        dicPath = path.join(path.dirname(kuromojiPath), '..', 'dict');
      } catch {
        // フォールバック: __dirnameから相対パス
        dicPath = path.join(__dirname, '..', '..', 'node_modules', 'kuromoji', 'dict');
      }

      kuromoji.builder({ dicPath }).build((err, tokenizer) => {
        if (err) {
          this.initPromise = null;
          reject(new Error(`辞書の読み込みに失敗しました: ${err.message}`));
          return;
        }
        this.tokenizer = tokenizer as kuromoji.Tokenizer<KuromojiToken>;
        this.initialized = true;
        resolve();
      });
    });

    return this.initPromise;
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
    return 'kuromoji.js 0.1.2 (IPA辞書内蔵)';
  }

  /**
   * テキストを形態素解析
   */
  async analyze(text: string): Promise<Token[]> {
    if (!text || text.trim() === '') {
      return [];
    }

    await this.initialize();

    if (!this.tokenizer) {
      throw new Error('トークナイザーの初期化に失敗しました');
    }

    const kuromojiTokens = this.tokenizer.tokenize(text);
    return this.convertToTokens(kuromojiTokens);
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
      if (line === 'EOS' || line.trim() === '') {
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

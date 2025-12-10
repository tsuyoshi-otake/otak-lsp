/**
 * Analyzer Environment Checker
 * 形態素解析器（kuromoji.js）の状態を確認する
 * Feature: japanese-grammar-analyzer
 * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { MeCabAnalyzer } from './analyzer';

/**
 * 解析器環境ステータス
 */
export interface MeCabEnvironmentStatus {
  available: boolean;
  mecabFound: boolean;
  dictionaryFound: boolean;
  version?: string;
  dictionaryPath?: string;
  error?: string;
}

/**
 * execSync関数の型（互換性のため）
 */
type ExecSyncFunction = (command: string) => string;

/**
 * 解析器環境チェッカー（kuromoji.js対応）
 */
export class MeCabEnvironmentChecker {
  private platform: string;
  private analyzer: MeCabAnalyzer | null = null;

  constructor() {
    this.platform = process.platform;
  }

  /**
   * テスト用: execSync関数を設定（互換性のため - kuromoji使用時は無視）
   */
  setExecSync(_fn: ExecSyncFunction): void {
    // kuromoji使用時は不要だが、既存テストとの互換性のため残す
  }

  /**
   * テスト用: プラットフォームを設定
   */
  setPlatform(platform: string): void {
    this.platform = platform;
  }

  /**
   * 解析器が利用可能かを確認（kuromoji.jsは常に利用可能）
   */
  async checkMeCabExists(_mecabPath?: string): Promise<boolean> {
    try {
      if (!this.analyzer) {
        this.analyzer = new MeCabAnalyzer();
      }
      return await this.analyzer.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * 辞書の存在を確認（kuromoji.jsは辞書内蔵）
   */
  async checkDictionary(_mecabPath?: string): Promise<boolean> {
    // kuromoji.jsは辞書内蔵のため常にtrue
    return this.checkMeCabExists();
  }

  /**
   * バージョンを取得
   */
  async getVersion(_mecabPath?: string): Promise<string | null> {
    try {
      if (!this.analyzer) {
        this.analyzer = new MeCabAnalyzer();
      }
      return await this.analyzer.getVersion();
    } catch {
      return null;
    }
  }

  /**
   * 環境全体をチェック
   */
  async checkEnvironment(_mecabPath?: string): Promise<MeCabEnvironmentStatus> {
    const status: MeCabEnvironmentStatus = {
      available: false,
      mecabFound: false,
      dictionaryFound: false
    };

    try {
      if (!this.analyzer) {
        this.analyzer = new MeCabAnalyzer();
      }

      const isAvailable = await this.analyzer.isAvailable();

      if (isAvailable) {
        status.available = true;
        status.mecabFound = true;
        status.dictionaryFound = true;
        status.version = await this.analyzer.getVersion();
        status.dictionaryPath = 'kuromoji内蔵IPA辞書';
      } else {
        status.error = '形態素解析器の初期化に失敗しました';
      }
    } catch (err) {
      status.error = `エラー: ${err instanceof Error ? err.message : String(err)}`;
    }

    return status;
  }

  /**
   * ステータスメッセージを取得
   */
  getInstallationMessage(status: MeCabEnvironmentStatus): string {
    if (status.available) {
      return `${status.version || 'kuromoji.js'} が利用可能です（外部依存なし）`;
    }

    return `形態素解析器の初期化に問題があります: ${status.error || '不明なエラー'}

この拡張機能はkuromoji.jsを使用しており、MeCabのインストールは不要です。
問題が解決しない場合は、拡張機能を再インストールしてください。`;
  }

  /**
   * プラットフォーム固有の説明（kuromoji使用時は簡略化）
   */
  getPlatformSpecificInstructions(): string {
    return `この拡張機能はkuromoji.jsを使用しており、外部依存はありません。
npm installを実行してください。`;
  }

  /**
   * パスの有効性を検証（kuromoji使用時は常にtrue）
   */
  async validatePath(_path?: string): Promise<boolean> {
    // kuromoji使用時はパス設定不要
    return true;
  }
}

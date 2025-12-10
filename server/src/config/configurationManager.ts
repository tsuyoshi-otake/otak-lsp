/**
 * Configuration Manager
 * VSCode設定を管理する
 * Feature: japanese-grammar-analyzer
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Configuration, SupportedLanguage } from '../../../shared/src/types';

/**
 * 設定変更イベント
 */
export interface ConfigurationChangeEvent {
  configuration: Configuration;
  affectedKeys: (keyof Configuration)[];
}

/**
 * 購読解除用インターフェース
 */
export interface Disposable {
  dispose(): void;
}

/**
 * 設定変更リスナー型
 */
type ConfigurationChangeListener = (event: ConfigurationChangeEvent) => void;

/**
 * Configuration Manager
 * 設定の読み取り、更新、変更監視を管理する
 */
export class ConfigurationManager {
  private configuration: Configuration;
  private listeners: Set<ConfigurationChangeListener> = new Set();

  constructor() {
    this.configuration = this.getDefaultConfiguration();
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfiguration(): Configuration {
    return {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      targetLanguages: ['c', 'cpp', 'java', 'python', 'javascript', 'typescript', 'rust', 'markdown'],
      debounceDelay: 500
    };
  }

  /**
   * 現在の設定を取得
   * @returns 設定のコピー
   */
  getConfiguration(): Configuration {
    return { ...this.configuration };
  }

  /**
   * 特定の設定値を取得
   * @param key 設定キー
   * @returns 設定値
   */
  getValue<K extends keyof Configuration>(key: K): Configuration[K] {
    return this.configuration[key];
  }

  /**
   * 設定を更新
   * @param config 更新する設定（部分的）
   */
  updateConfiguration(config: Partial<Configuration>): void {
    const affectedKeys: (keyof Configuration)[] = [];

    // 変更されるキーを特定
    for (const key of Object.keys(config) as (keyof Configuration)[]) {
      if (config[key] !== undefined) {
        affectedKeys.push(key);
      }
    }

    // 設定を更新
    this.configuration = {
      ...this.configuration,
      ...config
    };

    // リスナーに通知
    if (affectedKeys.length > 0) {
      this.notifyListeners(affectedKeys);
    }
  }

  /**
   * 設定変更の監視を登録
   * @param listener 変更時に呼び出されるコールバック
   * @returns 購読解除用のDisposable
   */
  onDidChangeConfiguration(listener: ConfigurationChangeListener): Disposable {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      }
    };
  }

  /**
   * 設定をデフォルトにリセット
   */
  reset(): void {
    const allKeys: (keyof Configuration)[] = [
      'enableGrammarCheck',
      'enableSemanticHighlight',
      'targetLanguages',
      'debounceDelay'
    ];

    this.configuration = this.getDefaultConfiguration();
    this.notifyListeners(allKeys);
  }

  /**
   * 指定した言語が有効かどうかを確認
   * @param languageId 言語ID
   * @returns 有効な場合true
   */
  isLanguageEnabled(languageId: SupportedLanguage): boolean {
    return this.configuration.targetLanguages.includes(languageId);
  }

  /**
   * リスナーに変更を通知
   * @param affectedKeys 変更されたキー
   */
  private notifyListeners(affectedKeys: (keyof Configuration)[]): void {
    const event: ConfigurationChangeEvent = {
      configuration: this.getConfiguration(),
      affectedKeys
    };

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Configuration change listener error:', error);
      }
    }
  }
}

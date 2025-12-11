/**
 * Document Filter
 * Untitledファイルや拡張子なしファイルの解析判定
 * Feature: advanced-grammar-rules
 * 要件: 13.1, 13.2, 13.3, 13.4, 13.5
 */

import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';

/**
 * TextDocument インターフェース
 * VSCode の TextDocument と互換性を持つ最小インターフェース
 */
export interface TextDocument {
  uri: string;
  languageId: string;
  getText(): string;
}

/**
 * Document Filter インターフェース
 */
export interface DocumentFilter {
  shouldAnalyze(document: TextDocument, config: AdvancedRulesConfig): boolean;
}

/**
 * Japanese Document Filter
 * 日本語テキストを含むドキュメントの解析判定を行う
 */
export class JapaneseDocumentFilter implements DocumentFilter {
  /**
   * 日本語文字（ひらがな、カタカナ、漢字）を検出する正規表現
   */
  private readonly JAPANESE_PATTERN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;

  /**
   * Untitledファイルとして認識する言語ID
   */
  private readonly UNTITLED_LANGUAGE_IDS = ['plaintext', 'untitled', ''];

  /**
   * サポートされている言語ID（常に解析対象）
   */
  private readonly SUPPORTED_LANGUAGE_IDS = ['markdown', 'plaintext', 'untitled', ''];

  /**
   * 日本語判定のための文字数制限
   * パフォーマンス最適化のため、最初の1000文字のみで判定
   */
  private readonly JAPANESE_DETECTION_LIMIT = 1000;

  /**
   * ドキュメントを解析すべきかどうかを判定
   * @param document 対象ドキュメント
   * @param config 高度なルール設定
   * @returns 解析すべき場合は true
   */
  shouldAnalyze(document: TextDocument, config: AdvancedRulesConfig): boolean {
    // 除外リストに含まれる言語IDはスキップ
    if (config.excludedLanguageIds.includes(document.languageId)) {
      return false;
    }

    // Untitledファイルの処理が無効な場合
    if (!config.enableUntitledFiles && this.isUntitled(document)) {
      return false;
    }

    // サポートされている言語ID（markdown, plaintext, untitled, 空）は常に解析
    if (this.SUPPORTED_LANGUAGE_IDS.includes(document.languageId)) {
      return true;
    }

    // untitled URIスキームは常に解析
    if (document.uri.startsWith('untitled:')) {
      return true;
    }

    // 内容ベースの検出が有効な場合
    if (config.enableContentBasedDetection) {
      return this.containsJapanese(document);
    }

    return false;
  }

  /**
   * Untitledファイルかどうかを判定
   * @param document 対象ドキュメント
   * @returns Untitledファイルの場合は true
   */
  isUntitled(document: TextDocument): boolean {
    return this.UNTITLED_LANGUAGE_IDS.includes(document.languageId) ||
           document.uri.startsWith('untitled:');
  }

  /**
   * 日本語を含むかどうかを判定
   * パフォーマンス最適化のため、最初の1000文字のみで判定
   * （判定後、実際の文法チェックは全文に対して実行される）
   * @param document 対象ドキュメント
   * @returns 日本語を含む場合は true
   */
  containsJapanese(document: TextDocument): boolean {
    const text = document.getText().substring(0, this.JAPANESE_DETECTION_LIMIT);
    return this.JAPANESE_PATTERN.test(text);
  }
}

/**
 * Markdown Filter
 * マークダウン文書のフィルタリング機能を提供
 * Feature: markdown-document-filtering
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1
 */

import {
  DebugInfo,
  DEFAULT_FILTER_CONFIG,
  ExcludedRange,
  ExcludeType,
  FilterConfig,
  FilterResult,
  IMarkdownFilter
} from '../../../shared/src/markdownFilterTypes';
import { formatError } from '../utils/errorHandler';
import { isBlank } from '../utils/stringUtils';
import { applyMarkdownFilter } from './markdownFilter/applyFilter';
import { getMarkdownExcludedRanges } from './markdownFilter/excludedRanges';

/**
 * マークダウンフィルタークラス
 * コードブロック、テーブル、URL等を文法チェック対象から除外する
 */
export class MarkdownFilter implements IMarkdownFilter {
  private config: FilterConfig;
  private logs: string[] = [];

  constructor(config?: FilterConfig) {
    this.config = config ? { ...DEFAULT_FILTER_CONFIG, ...config } : { ...DEFAULT_FILTER_CONFIG };
  }

  /**
   * テキストをフィルタリング
   * @param text フィルタリング対象のテキスト
   * @param config フィルタリング設定（オプション）
   * @returns フィルタリング結果
   */
  filter(text: string, config?: FilterConfig): FilterResult {
    const startTime = Date.now();
    this.logs = [];

    const effectiveConfig = config ? { ...this.config, ...config } : this.config;
    this.log('フィルタリング処理開始');

    try {
      // 空テキストの処理
      if (isBlank(text)) {
        this.log('空テキストが入力されました');
        return this.createResult('', [], text, startTime, effectiveConfig);
      }

      // 除外範囲を取得
      const excludedRanges = this.getExcludedRanges(text, effectiveConfig);
      this.log(`除外範囲数: ${excludedRanges.length}`);

      // フィルタリング済みテキストを生成
      const filteredText = applyMarkdownFilter(text, excludedRanges, effectiveConfig);
      this.log('フィルタリング処理完了');

      return this.createResult(filteredText, excludedRanges, text, startTime, effectiveConfig);
    } catch (error) {
      this.log(`エラー発生: ${formatError(error)}`);
      // エラー時はGraceful Degradation: 元のテキストを返却
      return this.createResult(text, [], text, startTime, effectiveConfig);
    }
  }

  /**
   * 除外範囲を取得
   * @param text 対象テキスト
   * @param config フィルタリング設定（オプション）
   * @returns 除外範囲のリスト
   */
  getExcludedRanges(text: string, config?: FilterConfig): ExcludedRange[] {
    const effectiveConfig = config ? { ...this.config, ...config } : this.config;
    return getMarkdownExcludedRanges(text, effectiveConfig);
  }

  /**
   * フィルタリング結果を生成
   */
  private createResult(
    filteredText: string,
    excludedRanges: ExcludedRange[],
    originalText: string,
    startTime: number,
    config: FilterConfig
  ): FilterResult {
    const result: FilterResult = {
      filteredText,
      excludedRanges,
      originalText
    };

    if (config.debugMode) {
      result.debugInfo = this.createDebugInfo(excludedRanges, startTime);
    }

    return result;
  }

  /**
   * デバッグ情報を生成
   */
  private createDebugInfo(ranges: ExcludedRange[], startTime: number): DebugInfo {
    const excludedByType: Partial<Record<ExcludeType, number>> = {};
    let totalExcludedCharacters = 0;

    for (const range of ranges) {
      const length = range.end - range.start;
      totalExcludedCharacters += length;
      excludedByType[range.type] = (excludedByType[range.type] ?? 0) + length;
    }

    return {
      processingTimeMs: Date.now() - startTime,
      totalExcludedCharacters,
      excludedByType,
      logs: [...this.logs]
    };
  }

  /**
   * デバッグログを追加
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      this.logs.push(`[${new Date().toISOString()}] ${message}`);
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}

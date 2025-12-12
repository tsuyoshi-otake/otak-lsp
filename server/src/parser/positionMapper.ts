/**
 * Position Mapper
 * フィルタリング済みテキストの位置を元のテキストの位置にマッピングする機能
 */

import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

/**
 * 位置マッピング情報
 */
export interface PositionMapping {
  /** フィルタリング済みテキストでの位置 */
  filteredPosition: number;
  /** 元のテキストでの位置 */
  originalPosition: number;
  /** 行番号（0ベース） */
  line: number;
  /** 文字位置（0ベース） */
  character: number;
}

/**
 * 位置マッピングクラス
 * フィルタリング済みテキストと元のテキストの位置を相互変換する
 */
export class PositionMapper {
  private mappings: PositionMapping[] = [];
  private originalText: string;
  private filteredText: string;
  private excludedRanges: ExcludedRange[];

  constructor(originalText: string, filteredText: string, excludedRanges: ExcludedRange[]) {
    this.originalText = originalText;
    this.filteredText = filteredText;
    this.excludedRanges = excludedRanges.sort((a, b) => a.start - b.start);
    this.buildMappings();
  }

  /**
   * 位置マッピングテーブルを構築
   * 注: 現在の実装では直接計算を行うため、このメソッドは使用されません
   */
  private buildMappings(): void {
    this.mappings = [];
    // 実際のマッピングは mapToOriginal と mapToFiltered で直接計算
  }

  /**
   * フィルタリング済みテキストの位置を元のテキストの位置に変換
   * @param filteredPosition フィルタリング済みテキストでの位置
   * @returns 元のテキストでの位置情報
   */
  mapToOriginal(filteredPosition: number): { line: number; character: number } | null {
    // 範囲外チェック
    if (filteredPosition < 0 || filteredPosition >= this.filteredText.length) {
      return null;
    }

    // フィルタリング済みテキストでの位置に対応する元のテキストの位置を計算
    let filteredPos = 0;
    let originalPos = 0;
    let line = 0;
    let character = 0;

    while (originalPos < this.originalText.length && filteredPos <= filteredPosition) {
      const char = this.originalText[originalPos];
      
      // 除外範囲内かチェック
      const isExcluded = this.excludedRanges.some(
        range => originalPos >= range.start && originalPos < range.end
      );

      if (!isExcluded) {
        if (filteredPos === filteredPosition) {
          return { line, character };
        }
        filteredPos++;
      }

      // 行・文字位置を更新
      if (char === '\n') {
        line++;
        character = 0;
      } else {
        character++;
      }

      originalPos++;
    }

    return null;
  }

  /**
   * フィルタリング済みテキストの範囲を元のテキストの範囲に変換
   * @param startPos 開始位置
   * @param endPos 終了位置
   * @returns 元のテキストでの範囲
   */
  mapRangeToOriginal(startPos: number, endPos: number): {
    start: { line: number; character: number };
    end: { line: number; character: number };
  } | null {
    const start = this.mapToOriginal(startPos);
    const end = this.mapToOriginal(endPos);

    if (!start || !end) {
      return null;
    }

    return { start, end };
  }

  /**
   * 元のテキストの位置をフィルタリング済みテキストの位置に変換
   * @param originalPosition 元のテキストでの位置
   * @returns フィルタリング済みテキストでの位置
   */
  mapToFiltered(originalPosition: number): number | null {
    // 範囲外チェック
    if (originalPosition < 0 || originalPosition >= this.originalText.length) {
      return null;
    }

    // 除外範囲内かチェック
    const isExcluded = this.excludedRanges.some(
      range => originalPosition >= range.start && originalPosition < range.end
    );

    if (isExcluded) {
      return null; // 除外範囲内の位置はマッピングできない
    }

    // 指定位置より前の除外文字数を計算
    let excludedCount = 0;
    for (const range of this.excludedRanges) {
      if (range.end <= originalPosition) {
        excludedCount += range.end - range.start;
      } else if (range.start < originalPosition) {
        excludedCount += originalPosition - range.start;
        break;
      } else {
        break;
      }
    }

    return originalPosition - excludedCount;
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): {
    originalLength: number;
    filteredLength: number;
    mappingCount: number;
    excludedRangeCount: number;
  } {
    return {
      originalLength: this.originalText.length,
      filteredLength: this.filteredText.length,
      mappingCount: this.mappings.length,
      excludedRangeCount: this.excludedRanges.length
    };
  }
}
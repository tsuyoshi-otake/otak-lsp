/**
 * 引用行フィルタ
 * Feature: proofreading-settings-compat
 * タスク4: 引用行フィルタの追加
 *
 * 指定記号で始まる行を除外範囲として処理する
 */

import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

/**
 * フィルタ結果
 */
export interface QuoteLineFilterResult {
  /** フィルタ後のテキスト（引用行がスペースで置換） */
  filteredText: string;
  /** 除外範囲のリスト */
  excludedRanges: ExcludedRange[];
}

/**
 * 引用行フィルタクラス
 */
export class QuoteLineFilter {
  /**
   * テキストをフィルタし、引用行を除外範囲として返す
   * @param text 元のテキスト
   * @param markers 引用行とみなす記号のリスト
   * @returns フィルタ結果
   */
  filter(text: string, markers: string[]): QuoteLineFilterResult {
    if (markers.length === 0) {
      return {
        filteredText: text,
        excludedRanges: []
      };
    }

    const excludedRanges: ExcludedRange[] = [];
    const lines = text.split(/\r?\n/);
    let currentOffset = 0;
    const filteredLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trimStart();
      let isQuoteLine = false;

      for (const marker of markers) {
        if (trimmedLine.startsWith(marker)) {
          isQuoteLine = true;
          break;
        }
      }

      if (isQuoteLine) {
        const lineStart = currentOffset;
        const lineEnd = currentOffset + line.length;

        excludedRanges.push({
          type: 'quote-line' as ExcludedRange['type'],
          start: lineStart,
          end: lineEnd,
          content: line,
          reason: '引用行として除外'
        });

        // スペースで置換（改行は保持して位置を維持）
        filteredLines.push(' '.repeat(line.length));
      } else {
        filteredLines.push(line);
      }

      // 改行文字分を加算（最後の行以外）
      currentOffset += line.length;
      if (i < lines.length - 1) {
        // 元のテキストから改行文字を推測
        const nextLineOffset = text.indexOf(lines[i + 1], currentOffset);
        if (nextLineOffset > currentOffset) {
          currentOffset = nextLineOffset;
        } else {
          currentOffset += 1; // デフォルトは \n
        }
      }
    }

    // 改行文字を適切に復元
    let filteredText = '';
    let offset = 0;
    for (let i = 0; i < filteredLines.length; i++) {
      filteredText += filteredLines[i];
      offset += filteredLines[i].length;
      if (i < filteredLines.length - 1) {
        // 元の改行文字を維持
        if (text[offset] === '\r' && text[offset + 1] === '\n') {
          filteredText += '\r\n';
          offset += 2;
        } else {
          filteredText += '\n';
          offset += 1;
        }
      }
    }

    return {
      filteredText,
      excludedRanges
    };
  }

  /**
   * 既存の除外範囲とマージしてフィルタを適用
   * @param text 元のテキスト
   * @param markers 引用行とみなす記号のリスト
   * @param existingRanges 既存の除外範囲
   * @returns フィルタ結果
   */
  applyFilter(
    text: string,
    markers: string[],
    existingRanges: ExcludedRange[]
  ): QuoteLineFilterResult {
    const result = this.filter(text, markers);
    return {
      filteredText: result.filteredText,
      excludedRanges: [...existingRanges, ...result.excludedRanges]
    };
  }
}

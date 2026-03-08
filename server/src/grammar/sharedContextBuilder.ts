/**
 * Shared Context Builder
 * Feature: advanced-rules-shared-preprocessing-cache
 *
 * 高度ルールで共通して使用する前処理結果を生成する
 */

import {
  AdvancedRuleSharedContext,
  CodeRange
} from '../../../shared/src/advancedTypes';
import { computeLineStarts } from '../utils/lineStarts';

/**
 * コードブロック（```...```）の範囲を取得
 */
function getCodeBlockRanges(text: string): CodeRange[] {
  const ranges: CodeRange[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let match;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    ranges.push({ start: match.index, end: match.index + match[0].length });
  }
  return ranges;
}

/**
 * インラインコード（`...`）の範囲を取得
 * コードブロック内のバッククォートは除外する
 */
function getInlineCodeRanges(text: string, codeBlockRanges: CodeRange[]): CodeRange[] {
  const ranges: CodeRange[] = [];
  const inlineCodeRegex = /`[^`\n]+`/g;
  let match;

  const isInCodeBlock = (pos: number): boolean => {
    return codeBlockRanges.some(range => pos >= range.start && pos < range.end);
  };

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // コードブロック内のインラインコードは除外
    if (!isInCodeBlock(match.index)) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return ranges;
}

/**
 * 行テキストを抽出
 */
function splitLines(text: string): string[] {
  return text.split('\n');
}

/**
 * 共有コンテキストを生成
 *
 * @param text - 対象テキスト
 * @returns 共有コンテキスト
 */
export function buildSharedContext(text: string): AdvancedRuleSharedContext {
  const codeBlockRanges = getCodeBlockRanges(text);
  const inlineCodeRanges = getInlineCodeRanges(text, codeBlockRanges);
  const codeRanges = [...inlineCodeRanges, ...codeBlockRanges].sort((a, b) => a.start - b.start);
  const lineStarts = computeLineStarts(text);
  const lines = splitLines(text);

  return {
    codeBlockRanges,
    inlineCodeRanges,
    codeRanges,
    lineStarts,
    lines
  };
}

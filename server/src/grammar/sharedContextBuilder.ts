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
import { splitLines } from '../utils/stringUtils';

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
 *
 * codeBlockRanges は正規表現が出現順 (= start 昇順) に push しているため
 * ソート済み前提でポインタを前進させ、isInCodeBlock を O(1) 償却で行う。
 * 旧実装の `.some(...)` 版は O(M×K) だった。
 */
function getInlineCodeRanges(text: string, codeBlockRanges: CodeRange[]): CodeRange[] {
  const ranges: CodeRange[] = [];
  const inlineCodeRegex = /`[^`\n]+`/g;
  let match;
  let blockIdx = 0;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const pos = match.index;

    // pos より前に終わるコードブロックを読み飛ばす
    while (
      blockIdx < codeBlockRanges.length &&
      codeBlockRanges[blockIdx].end <= pos
    ) {
      blockIdx++;
    }

    const current = codeBlockRanges[blockIdx];
    const inBlock = !!current && current.start <= pos && pos < current.end;
    if (!inBlock) {
      ranges.push({ start: pos, end: pos + match[0].length });
    }
  }
  return ranges;
}

/**
 * 共有コンテキストを生成
 *
 * @param text - 対象テキスト
 * @param precomputedLineStarts - 既に算出済みの lineStarts（解析サイクル内で再計算を避ける）
 * @param precomputedLines - 既に算出済みの lines（解析サイクル内で再計算を避ける）
 * @returns 共有コンテキスト
 */
export function buildSharedContext(
  text: string,
  precomputedLineStarts?: number[],
  precomputedLines?: string[]
): AdvancedRuleSharedContext {
  const codeBlockRanges = getCodeBlockRanges(text);
  const inlineCodeRanges = getInlineCodeRanges(text, codeBlockRanges);
  const codeRanges = [...inlineCodeRanges, ...codeBlockRanges].sort((a, b) => a.start - b.start);
  const lineStarts = precomputedLineStarts ?? computeLineStarts(text);
  const lines = precomputedLines ?? splitLines(text);

  return {
    codeBlockRanges,
    inlineCodeRanges,
    codeRanges,
    lineStarts,
    lines
  };
}

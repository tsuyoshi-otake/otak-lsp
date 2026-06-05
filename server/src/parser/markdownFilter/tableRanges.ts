import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import {
  findMarkdownPipeTables,
  isMarkdownPipeTableSeparatorLine
} from '../../../../shared/src/markdownSyntax';
import { splitLines } from '../../utils/stringUtils';
import { isOverlapping } from './rangeUtils';

/**
 * テーブルを検出する。
 *
 * テーブルは他の除外要素（設定キー、URL等）を含むことがあるため、
 * コードブロックとのみ重複チェックを行う。
 */
export function findTables(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];
  const lines = splitLines(text);

  // 行開始オフセットを構築（テーブル範囲算出に使用）
  const lineStartOffsets: number[] = [];
  let position = 0;
  for (const line of lines) {
    lineStartOffsets.push(position);
    position += line.length + 1; // +1 for newline
  }

  // コードブロック範囲のみをチェック対象とする（テーブル内にURL等があっても検出可能にする）
  // ただし単一行の ```code``` はフェンスドブロックではなく、
  // テーブル検出を阻害しないよう「複数行のコードブロック」のみを対象にする。
  const codeBlockRanges = existingRanges.filter(
    (r) => r.type === 'code-block' && (r.content.includes('\n') || r.content.includes('\r'))
  );

  const tables = findMarkdownPipeTables(text);
  for (const table of tables) {
    const tableStart = lineStartOffsets[table.startLine] ?? 0;
    const tableEnd =
      table.endLineExclusive < lineStartOffsets.length
        ? lineStartOffsets[table.endLineExclusive]
        : text.length;

    if (isOverlapping(tableStart, tableEnd, codeBlockRanges)) {
      continue;
    }

    ranges.push({
      start: tableStart,
      end: tableEnd,
      type: 'table',
      content: text.substring(tableStart, tableEnd),
      reason: 'マークダウンテーブル検出'
    });

    for (let lineIndex = table.startLine; lineIndex < table.endLineExclusive; lineIndex++) {
      const line = lines[lineIndex] ?? '';
      const lineStart = lineStartOffsets[lineIndex] ?? 0;

      if (isMarkdownPipeTableSeparatorLine(line)) {
        ranges.push({
          start: lineStart,
          end: lineStart + line.length,
          type: 'table-separator',
          content: line,
          reason: 'マークダウンテーブルセパレーター行検出'
        });
        continue;
      }

      for (let j = 0; j < line.length; j++) {
        if (line[j] === '|') {
          const absPos = lineStart + j;
          ranges.push({
            start: absPos,
            end: absPos + 1,
            type: 'table-delimiter',
            content: '|',
            reason: 'マークダウンテーブル区切り文字検出'
          });
        }
      }
    }
  }

  return ranges;
}

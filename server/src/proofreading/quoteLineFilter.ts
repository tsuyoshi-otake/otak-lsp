import { CommentRange, SupportedLanguage } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { isMarkdownPipeTableSeparatorLine } from '../../../shared/src/markdownSyntax';
import { findTables } from '../parser/markdownFilter/tableRanges';
import { anyRangeOverlaps, normalizeRanges } from '../utils/rangeSweep';
import { QuoteLineConfig } from './proofreadingTypes';

/** 診断だけの除外範囲を原文から求める。実際のMarkdown表は表設定に従う。 */
export function findQuoteLineRanges(
  text: string,
  language: SupportedLanguage,
  comments: readonly CommentRange[],
  markdownRanges: ExcludedRange[],
  config: QuoteLineConfig,
): ExcludedRange[] {
  const markers = config.markers.map(marker => marker.trim()).filter(marker => marker.length > 0 && !/[\r\n]/.test(marker));
  if (!config.enable || markers.length === 0) return [];
  const isCode = language !== 'plaintext' && language !== 'markdown';
  const segments = isCode ? comments : [{ start: 0, end: text.length }];
  const tableRanges = language === 'markdown' && markers.some(marker => marker.startsWith('|'))
    ? normalizeRanges(findTables(text, markdownRanges).filter(range => {
      if (range.type !== 'table') return false;
      const lines = range.content.split('\n');
      return lines.length > 1 && isMarkdownPipeTableSeparatorLine(lines[1]);
    }))
    : [];
  const result: ExcludedRange[] = [];
  for (const segment of segments) {
    const segmentText = text.slice(segment.start, segment.end);
    let offset = 0;
    while (offset < segmentText.length) {
      const newline = segmentText.indexOf('\n', offset);
      const next = newline < 0 ? segmentText.length : newline;
      const start = segment.start + offset;
      const end = segment.start + next;
      const raw = segmentText.slice(offset, next).replace(/\r$/, '');
      let line = raw.replace(/^[ \t]*/, '');
      if (isCode) line = line.replace(/^(?:\/\/|#|\/\*|\*)[ \t]*/, '');
      if (markers.some(marker => line.startsWith(marker)) && !anyRangeOverlaps(tableRanges, start, end)) {
        result.push({ start, end, type: 'quote-line', content: raw, reason: '引用行' });
      }
      if (next === segmentText.length) break;
      offset = next + 1;
    }
  }
  return result;
}

import { ExcludedRange, FilterConfig } from '../../../../shared/src/markdownFilterTypes';
import { isNotEmpty } from '../../utils/arrayUtils';
import { isBlank } from '../../utils/stringUtils';
import { findCodeBlocks, findInlineCode, restoreInlineCodeInTables } from './codeRanges';
import { findEmphasisMarkers, findHeadings, findLinkMarkers, findListMarkers } from './structureRanges';
import { findTables } from './tableRanges';
import { findConfigKeys, findCustomPatterns, findUrls } from './urlRanges';

/**
 * Markdownテキストから除外範囲を取得する。
 */
export function getMarkdownExcludedRanges(text: string, config: FilterConfig): ExcludedRange[] {
  const ranges: ExcludedRange[] = [];

  if (isBlank(text)) {
    return ranges;
  }

  // 先に軽量な存在チェックを行い、不要な重い走査（split/正規表現）を避ける
  const hasBacktick = text.indexOf('`') !== -1;
  const hasCodeFence = text.indexOf('```') !== -1 || text.indexOf('~~~') !== -1;
  const hasUrlLike = text.indexOf('http') !== -1 || text.indexOf('://') !== -1 || text.indexOf('www.') !== -1;
  const hasConfigKeyLike =
    text.indexOf('otakLsp.') !== -1 || text.indexOf('config.') !== -1 || text.indexOf('settings.') !== -1;
  const hasPipe = text.indexOf('|') !== -1;
  const hasHeadingMarker = text.indexOf('#') !== -1;
  const hasAsterisk = text.indexOf('*') !== -1;
  const hasUnderscore = text.indexOf('_') !== -1;
  const hasTilde = text.indexOf('~') !== -1;
  const hasBracketLike = text.indexOf('[') !== -1 || text.indexOf(']') !== -1 || text.indexOf('(') !== -1;

  // 各フィルタリング処理を優先順位順に実行
  // 優先順位: コードブロック > インラインコード > URL > 設定キー > カスタムパターン > テーブル
  if (config.excludeCodeBlocks && hasCodeFence) {
    ranges.push(...findCodeBlocks(text));
  }

  if (config.excludeInlineCode && hasBacktick) {
    ranges.push(...findInlineCode(text, ranges));
  }

  if (config.excludeUrls && hasUrlLike) {
    ranges.push(...findUrls(text, ranges));
  }

  if (config.excludeConfigKeys && hasConfigKeyLike) {
    ranges.push(...findConfigKeys(text, ranges));
  }

  if (isNotEmpty(config.customExcludePatterns)) {
    ranges.push(...findCustomPatterns(text, config.customExcludePatterns, ranges));
  }

  if (config.excludeTables && hasPipe) {
    ranges.push(...findTables(text, ranges));
  }

  if (config.excludeHeadings && hasHeadingMarker) {
    ranges.push(...findHeadings(text, ranges));
  }

  if (config.excludeListMarkers) {
    ranges.push(...findListMarkers(text, ranges));
  }

  if (config.excludeEmphasisMarkers && (hasAsterisk || hasUnderscore || hasTilde)) {
    ranges.push(...findEmphasisMarkers(text, ranges));
  }

  if (config.excludeLinkMarkers && hasBracketLike) {
    ranges.push(...findLinkMarkers(text, ranges));
  }

  const adjustedRanges =
    config.excludeInlineCode && config.excludeTables
      ? restoreInlineCodeInTables(ranges)
      : ranges;

  return adjustedRanges.sort((a, b) => a.start - b.start);
}

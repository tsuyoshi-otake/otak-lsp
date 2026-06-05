/**
 * Advanced Rule Context
 * 高度ルール実行時のMarkdown文脈調整を管理する
 */

import {
  AdvancedGrammarRule,
  RuleContext,
  Sentence
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { isNotEmpty } from '../utils/arrayUtils';

const ORIGINAL_TEXT_FOR_MARKDOWN_STRUCTURE_RULES = new Set<string>([
  'bullet-style-mix',
  'emphasis-style-mix',
  'heading-level-skip',
  'table-column-mismatch',
  'code-block-language'
]);

const ORIGINAL_TEXT_FOR_TABLE_PROSE_RULES = new Set<string>([
  'weak-expression',
  'ambiguous-term',
  'beki-usage',
  'term-notation',
  'kanji-opening',
  'redundant-expression',
  'tautology',
  'okurigana-variant',
  'orthography-variant',
  'katakana-chouon',
  'halfwidth-kana',
  'dash-tilde-normalization',
  'nakaguro-usage'
]);

/**
 * code-block が「自然言語の例文」として書かれているかを判定
 */
export function isProseCodeBlock(range: ExcludedRange): boolean {
  if (range.type !== 'code-block') {
    return false;
  }

  // 単一行の ```code``` は既存互換の「コードブロック」扱いなので除外する
  if (!range.content.includes('\n') && !range.content.includes('\r')) {
    return false;
  }

  const firstLine = range.content.split(/\r?\n/, 1)[0] ?? '';
  const stripped = firstLine.replace(/^\s*(?:>\s*)*/, '');
  const match = stripped.match(/^([`~]{3,})(.*)$/);
  if (!match) {
    return false;
  }

  const info = match[2].trim();
  if (!info) {
    // 言語未指定はコードサンプルであることが多いので除外
    return false;
  }

  const language = info.split(/\s+/)[0].toLowerCase();
  return (
    language === 'markdown' ||
    language === 'md' ||
    language === 'text' ||
    language === 'plaintext' ||
    language === 'txt'
  );
}

/**
 * テーブル範囲に重なる文を除外
 * （Markdownの文法チェックではテーブル全体を対象外にする）
 */
export function filterOutTableSentences(sentences: Sentence[], excludedRanges: ExcludedRange[]): Sentence[] {
  const tableRanges = excludedRanges.filter((r) => r.type === 'table');
  if (tableRanges.length === 0) {
    return sentences;
  }

  return sentences.filter((sentence) =>
    !tableRanges.some((table) =>
      sentence.start < table.end && sentence.end > table.start
    )
  );
}

/**
 * テーブル内のテキストをスペースでマスクする
 * - 文法チェックからテーブル内容を除外するため
 * - 改行は保持して行位置を崩さない
 */
export function maskTableContent(text: string, excludedRanges: ExcludedRange[]): string {
  const tableRanges = excludedRanges.filter((r) => r.type === 'table');
  if (tableRanges.length === 0) {
    return text;
  }

  const chars = text.split('');
  for (const range of tableRanges) {
    const start = Math.max(0, Math.min(range.start, chars.length));
    const end = Math.max(start, Math.min(range.end, chars.length));
    for (let i = start; i < end; i++) {
      const ch = chars[i];
      // テーブル構造ルール（列数不一致など）のために区切り文字（|）とエスケープ（\）は保持する
      if (ch !== '\n' && ch !== '\r' && ch !== '|' && ch !== '\\' && ch !== '-' && ch !== ':') {
        chars[i] = ' ';
      }
    }
  }

  return chars.join('');
}

/**
 * monotonous-ending は「連続」を見るルールのため、Markdownテーブル内では行（=セル）の境界で連続判定をリセットする。
 * - 例: 各行の例文が「...です。」で終わる表だと誤検出しやすい
 * - 一方で 1セル内に複数文がある場合は検出したいので、行内の分割結果は維持する
 */
function insertBoundariesBetweenTableRows(
  sentences: Sentence[],
  documentText: string,
  excludedRanges: ExcludedRange[]
): Sentence[] {
  if (sentences.length < 2) {
    return sentences;
  }

  const tableRanges = excludedRanges.filter((r) => r.type === 'table');
  if (tableRanges.length === 0) {
    return sentences;
  }

  const findTableRange = (offset: number): ExcludedRange | null => {
    for (const range of tableRanges) {
      if (offset >= range.start && offset < range.end) {
        return range;
      }
    }
    return null;
  };

  const hasLineBreakBetween = (start: number, end: number): boolean => {
    const safeStart = Math.max(0, Math.min(start, documentText.length));
    const safeEnd = Math.max(safeStart, Math.min(end, documentText.length));
    const between = documentText.slice(safeStart, safeEnd);
    return between.includes('\n') || between.includes('\r');
  };

  const withBoundaries: Sentence[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const current = sentences[i];
    withBoundaries.push(current);

    if (i === sentences.length - 1) {
      break;
    }

    const next = sentences[i + 1];
    const currentTable = findTableRange(current.start);
    const nextTable = findTableRange(next.start);

    const shouldInsertBoundary =
      Boolean(currentTable || nextTable) &&
      (
        currentTable !== nextTable ||
        (currentTable !== null && nextTable !== null && hasLineBreakBetween(current.end, next.start))
      );

    if (!shouldInsertBoundary) {
      continue;
    }

    const boundaryStart = Math.max(0, Math.min(current.end, documentText.length));
    const boundaryEnd = Math.min(boundaryStart + 1, documentText.length);
    if (boundaryEnd <= boundaryStart) {
      continue;
    }

    withBoundaries.push(new Sentence({
      text: ' ',
      tokens: [],
      start: boundaryStart,
      end: boundaryEnd
    }));
  }

  return withBoundaries;
}

/**
 * 指定タイプの除外範囲内にある文を「境界」に置き換える
 * - 非本文（コードブロック等）を丸ごと取り除くと、前後の本文が隣接して誤検出が増える可能性がある
 * - そのため、除外区間は「本文セグメントの区切り」として扱う
 */
function replaceSentencesOverlappingExcludedTypesWithBoundary(
  sentences: Sentence[],
  excludedRanges: ExcludedRange[] | undefined,
  types: ExcludedRange['type'][]
): Sentence[] {
  if (!isNotEmpty(excludedRanges)) {
    return sentences;
  }

  const targets = excludedRanges.filter((r) => types.includes(r.type));
  if (targets.length === 0) {
    return sentences;
  }

  const overlaps = (sentence: Sentence): boolean => {
    return targets.some((range) => sentence.start < range.end && sentence.end > range.start);
  };

  const replaced: Sentence[] = [];
  let pendingBoundary = false;

  for (const sentence of sentences) {
    if (!overlaps(sentence)) {
      pendingBoundary = false;
      replaced.push(sentence);
      continue;
    }

    if (pendingBoundary) {
      continue;
    }

    const end = Math.min(sentence.end, sentence.start + 1);
    replaced.push(new Sentence({
      text: ' ',
      tokens: [],
      start: sentence.start,
      end
    }));
    pendingBoundary = true;
  }

  return replaced;
}

/**
 * ルールごとの文脈（RuleContext）調整
 * - Markdownの非本文（コードブロック等）を「本文」として扱うと誤検出しやすいルールがあるため、ここで除外する
 */
export function buildRuleContextForRule(
  rule: AdvancedGrammarRule,
  baseContext: RuleContext,
  excludedRanges?: ExcludedRange[],
  originalText?: string
): RuleContext {
  // Markdown テーブルのマスク（analyzeTables=false）でも、構造/表記の一部ルールは原文を参照したい。
  // - EVALS 表などの「例文」をテーブルに載せるケースで、記号がマスクされると検出できなくなるため
  if (
    ORIGINAL_TEXT_FOR_MARKDOWN_STRUCTURE_RULES.has(rule.name) &&
    typeof originalText === 'string'
  ) {
    return {
      ...baseContext,
      documentText: originalText
    };
  }

  // テーブルは既定でマスクされるが、「弱い表現」や「表記ゆれ」などは表セル内の自然言語でも有用なので原文で判定する
  if (
    ORIGINAL_TEXT_FOR_TABLE_PROSE_RULES.has(rule.name) &&
    typeof originalText === 'string'
  ) {
    return {
      ...baseContext,
      documentText: originalText
    };
  }

  // monotonous-ending はテーブルの行（セル）をまたいで「連続」と判定しない
  if (rule.name === 'monotonous-ending' && excludedRanges && excludedRanges.some((r) => r.type === 'table')) {
    return {
      ...baseContext,
      sentences: insertBoundariesBetweenTableRows(baseContext.sentences, baseContext.documentText, excludedRanges)
    };
  }

  // Markdownコードブロック内の文を本文扱いしない（誤検出抑止）
  if (rule.name === 'conjunction-repetition' || rule.name === 'adversative-ga') {
    const codeBlockRanges = excludedRanges?.filter((r) => r.type === 'code-block') ?? [];
    const codeBlocksToExclude = codeBlockRanges.filter((r) => !isProseCodeBlock(r));
    return {
      ...baseContext,
      sentences: replaceSentencesOverlappingExcludedTypesWithBoundary(baseContext.sentences, codeBlocksToExclude, ['code-block'])
    };
  }

  return baseContext;
}

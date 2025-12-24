/**
 * 文解析ユーティリティ
 * Feature: advanced-grammar-rules
 * 要件: 1.1, 9.4
 */

import { Token } from '../../../shared/src/types';
import { Sentence } from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';

/**
 * 文分割の終端記号
 */
const SENTENCE_TERMINATORS = /[。！？!?]/;

/**
 * 段落区切り（空行）を検出
 */
const PARAGRAPH_BREAK = /\n\s*\n/;

/**
 * 文解析ユーティリティクラス
 * テキストを文単位に分割し、各文にトークンを割り当てる
 */
export class SentenceParser {
  private static isOffsetInsideRange(offset: number, range: ExcludedRange): boolean {
    return offset >= range.start && offset < range.end;
  }

  private static isOffsetInsideExcludedType(
    offset: number,
    excludedRanges: ExcludedRange[] | undefined,
    type: ExcludedRange['type']
  ): boolean {
    if (!excludedRanges || excludedRanges.length === 0) {
      return false;
    }
    return excludedRanges.some((range) => range.type === type && SentenceParser.isOffsetInsideRange(offset, range));
  }

  /**
   * テキストを文に分割
   * @param text 解析対象のテキスト
   * @param tokens トークンリスト
   * @param excludedRanges Markdown除外範囲（MarkdownFilterの結果）
   * @param splitMode 文分割モード（'strict' | 'normal' | 'loose'）
   * @returns 文のリスト
   */
  static parseSentences(
    text: string, 
    tokens: Token[], 
    excludedRanges?: ExcludedRange[], 
    splitMode: 'strict' | 'normal' | 'loose' = 'normal'
  ): Sentence[] {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const sentences: Sentence[] = [];
    let currentStart = 0;
    const markdownBreaks = excludedRanges ? SentenceParser.computeMarkdownBreaks(text, excludedRanges) : null;
    const tableRanges = excludedRanges ? excludedRanges.filter((range) => range.type === 'table') : undefined;

    for (let i = 0; i < text.length; i++) {
      // Markdown特有の境界で強制分割
      if (markdownBreaks && markdownBreaks.has(i)) {
        SentenceParser.pushSentence(sentences, text, tokens, currentStart, i, excludedRanges, tableRanges);
        if (text[i] === '\n') {
          currentStart = i + 1;
        } else if (text[i] === '\r') {
          // CRLF (\r\n) の場合は両方をスキップ
          currentStart = i + 1;
          if (i + 1 < text.length && text[i + 1] === '\n') {
            currentStart++;
          }
        } else {
          currentStart = i;
        }
        continue;
      }

      // 文の終端記号をチェック
      if (SENTENCE_TERMINATORS.test(text[i])) {
        // Markdownテーブル内は行単位で扱う（セル抽出のため、終端記号では分割しない）
        if (SentenceParser.isOffsetInsideExcludedType(i, tableRanges, 'table')) {
          continue;
        }

        // 連続する終端記号をスキップ
        while (i + 1 < text.length && SENTENCE_TERMINATORS.test(text[i + 1])) {
          i++;
        }

        SentenceParser.pushSentence(sentences, text, tokens, currentStart, i + 1, excludedRanges, tableRanges);

        currentStart = i + 1;
      }
      // 改行をチェック（LFとCRLFの両方に対応）
      else if (text[i] === '\n') {
        // CRLF (\r\n) の場合、\r の位置を基準にする
        const newlineStart = (i > 0 && text[i - 1] === '\r') ? i - 1 : i;

        // Markdownテーブル内は1行=1単位として扱う（セル単位に分割して解析しやすくする）
        if (SentenceParser.isOffsetInsideExcludedType(newlineStart, tableRanges, 'table')) {
          SentenceParser.pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);
          currentStart = i + 1;
          continue;
        }
        
        // 段落区切り（空行）をチェック
        // 空行かどうかをチェック（次の非空白文字までに改行があるか）
        let j = i + 1;
        let hasEmptyLine = false;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r' || text[j] === '\n')) {
          if (text[j] === '\n') {
            hasEmptyLine = true;
            break;
          }
          j++;
        }

        if (hasEmptyLine) {
          SentenceParser.pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);

          // 空行をスキップ
          while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r' || text[j] === '\n')) {
            j++;
          }
          i = j - 1;
          currentStart = j;
        }
        // 単一の改行の場合、モードに応じて処理
        else if (splitMode !== 'loose') {
          // strict: 常に分割
          // normal: 文脈を考慮して判断
          if (splitMode === 'strict' || SentenceParser.shouldSplitOnNewline(text, newlineStart, tokens)) {
            SentenceParser.pushSentence(sentences, text, tokens, currentStart, newlineStart, excludedRanges, tableRanges);
            currentStart = i + 1;
          }
        }
      }
    }

    // 最後の文（終端記号なし）
    if (currentStart < text.length) {
      SentenceParser.pushSentence(sentences, text, tokens, currentStart, text.length, excludedRanges, tableRanges);
    }

    return sentences;
  }

  /**
   * Markdownの構造を考慮した強制分割位置を計算
   * - 見出し行の前後で分割
   * - 表/コードブロックの前後で分割
   * - 太字のみの単独行は独立させる
   * - ":" / "：" で終わる行の後で分割
   */
  private static computeMarkdownBreaks(text: string, excludedRanges: ExcludedRange[]): Set<number> {
    const breaks = new Set<number>();

    for (const range of excludedRanges) {
      if (range.type === 'table' || range.type === 'code-block') {
        breaks.add(range.start);
        breaks.add(range.end);

        // コードフェンス行（```lang / ```）が直後の本文と結合されると
        // 文ベースのルール（missing-subject 等）の範囲が崩れるため、
        // フェンスの開閉行を本文から分離する。
        if (range.type === 'code-block') {
          const findNewlineStartAtOrAfter = (start: number, endExclusive: number): number | null => {
            for (let i = start; i < endExclusive; i++) {
              const ch = text[i];
              if (ch === '\n') {
                return i > 0 && text[i - 1] === '\r' ? i - 1 : i;
              }
              if (ch === '\r') {
                return i;
              }
            }
            return null;
          };

          const findLastNewlineStartBefore = (endExclusive: number, lowerBound: number): number | null => {
            for (let i = endExclusive - 1; i >= lowerBound; i--) {
              const ch = text[i];
              if (ch === '\n') {
                return i > 0 && text[i - 1] === '\r' ? i - 1 : i;
              }
              if (ch === '\r') {
                return i;
              }
            }
            return null;
          };

          const openingFenceLineEnd = findNewlineStartAtOrAfter(range.start, range.end);
          if (openingFenceLineEnd !== null) {
            breaks.add(openingFenceLineEnd);
          }

          const closingFenceLineStart = findLastNewlineStartBefore(range.end, range.start);
          if (closingFenceLineStart !== null) {
            breaks.add(closingFenceLineStart);
          }
        }
      }

      if (range.type === 'heading') {
        breaks.add(range.start);
        const lineEnd = text.indexOf('\n', range.start);
        if (lineEnd !== -1) {
          breaks.add(lineEnd);
        }
      }

      // 箇条書きは、次の項目開始（=次行のlist-marker）直前の改行で分割する
      // - loose モードでもリスト項目同士が1文に連結されないようにする
      if (range.type === 'list-marker') {
        const newlineStart = SentenceParser.getNewlineStartBefore(text, range.start);
        if (newlineStart !== null) {
          breaks.add(newlineStart);
        }
      }
    }

    const lines = text.split('\n');
    let position = 0;
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      // CRLF対応: 行末の\rを削除
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      
      const lineStart = position;
      const lineEnd = position + line.length; // 改行を含まない行末
      const hasNewline = lineEnd < text.length && (text[lineEnd] === '\n' || text[lineEnd] === '\r');

      const trimmed = line.trim();
      if (trimmed.length > 0) {
        // **xxx** のみで構成される行
        if (/^\*\*.+\*\*$/.test(trimmed)) {
          breaks.add(lineStart);
          if (hasNewline) {
            breaks.add(lineEnd);
          }
        }

        // ":" / "：" で終わる行（リスト導入など）
        const trimmedEnd = line.trimEnd();
        if (hasNewline && (trimmedEnd.endsWith(':') || trimmedEnd.endsWith('：'))) {
          breaks.add(lineEnd);
        }
      }

      // 次の行の開始位置を計算（\r\nの場合は+2、\nの場合は+1）
      const originalLineLength = lines[i].length;
      position += originalLineLength + 1; // +1 for \n
    }

    return breaks;
  }

  private static getNewlineStartBefore(text: string, position: number): number | null {
    if (position <= 0) {
      return null;
    }

    const prev = position - 1;
    if (text[prev] === '\n') {
      if (prev - 1 >= 0 && text[prev - 1] === '\r') {
        return prev - 1;
      }
      return prev;
    }
    if (text[prev] === '\r') {
      return prev;
    }

    return null;
  }

  /**
   * 文を追加（空白のみの文はスキップ）
   */
  private static pushSentence(
    sentences: Sentence[],
    text: string,
    tokens: Token[],
    start: number,
    end: number,
    excludedRanges?: ExcludedRange[],
    tableRanges?: ExcludedRange[]
  ): void {
    if (end <= start) {
      return;
    }

    let effectiveStart = start;
    if (excludedRanges) {
      const prefixRange = excludedRanges.find(
        (r) =>
          (r.type === 'heading' || r.type === 'list-marker') &&
          r.start === start &&
          r.end <= end
      );
      if (prefixRange) {
        effectiveStart = prefixRange.end;
      }
    }

    if (end <= effectiveStart) {
      return;
    }

    const sentenceText = text.substring(effectiveStart, end);
    if (sentenceText.trim().length === 0) {
      return;
    }

    if (excludedRanges && SentenceParser.isMarkdownTableSeparatorLine(sentenceText)) {
      return;
    }

    // テーブル行はセル単位に分割して Sentence を作る（range を行全体にしないため）
    const insideTable = SentenceParser.isOffsetInsideExcludedType(effectiveStart, tableRanges ?? excludedRanges, 'table');
    if (insideTable && SentenceParser.isMarkdownTableRowLine(sentenceText)) {
      const cellRanges = SentenceParser.extractMarkdownTableCellRanges(text, effectiveStart, end);
      const selected = SentenceParser.selectBestTableCellRange(text, cellRanges);
      if (!selected) {
        return;
      }
      SentenceParser.pushSentencesFromRange(sentences, text, tokens, selected.start, selected.end);
      return;
    }

    const sentenceTokens = SentenceParser.getTokensInRange(tokens, effectiveStart, end);
    sentences.push(new Sentence({
      text: sentenceText,
      tokens: sentenceTokens,
      start: effectiveStart,
      end
    }));
  }

  private static pushPlainSentence(
    sentences: Sentence[],
    text: string,
    tokens: Token[],
    start: number,
    end: number
  ): void {
    if (end <= start) {
      return;
    }
    const sentenceText = text.substring(start, end);
    if (sentenceText.trim().length === 0) {
      return;
    }

    const sentenceTokens = SentenceParser.getTokensInRange(tokens, start, end);
    sentences.push(new Sentence({
      text: sentenceText,
      tokens: sentenceTokens,
      start,
      end
    }));
  }

  private static pushSentencesFromRange(
    sentences: Sentence[],
    text: string,
    tokens: Token[],
    start: number,
    end: number
  ): void {
    if (end <= start) {
      return;
    }

    let currentStart = start;
    for (let i = start; i < end; i++) {
      if (!SENTENCE_TERMINATORS.test(text[i])) {
        continue;
      }

      while (i + 1 < end && SENTENCE_TERMINATORS.test(text[i + 1])) {
        i++;
      }

      SentenceParser.pushPlainSentence(sentences, text, tokens, currentStart, i + 1);
      currentStart = i + 1;
    }

    if (currentStart < end) {
      SentenceParser.pushPlainSentence(sentences, text, tokens, currentStart, end);
    }
  }

  private static isMarkdownTableRowLine(lineText: string): boolean {
    const trimmed = lineText.trim();
    if (trimmed.length === 0) {
      return false;
    }
    // blockquote table (`> | a | b |`) も許容
    const withoutQuote = trimmed.replace(/^(?:>\s*)+/, '');
    if (!withoutQuote.includes('|')) {
      return false;
    }
    // 先頭に "|" が無いテーブルもあるが、誤判定を避けるためここでは "|" 起点のみ扱う
    return withoutQuote.startsWith('|');
  }

  private static isEscapedPipe(text: string, index: number): boolean {
    if (index <= 0 || text[index] !== '|') {
      return false;
    }
    let backslashes = 0;
    for (let i = index - 1; i >= 0 && text[i] === '\\'; i--) {
      backslashes++;
    }
    return backslashes % 2 === 1;
  }

  private static extractMarkdownTableCellRanges(text: string, lineStart: number, lineEnd: number): Array<{ start: number; end: number }> {
    const line = text.substring(lineStart, lineEnd);
    const trimmed = line.trimEnd();
    if (trimmed.length === 0) {
      return [];
    }

    // blockquote prefix を飛ばして最初の "|" を探す
    const quotePrefixMatch = trimmed.match(/^(?:\s*(?:>\s*)+)?/);
    const quotePrefixLength = quotePrefixMatch ? quotePrefixMatch[0].length : 0;

    const firstPipeLocal = trimmed.indexOf('|', quotePrefixLength);
    if (firstPipeLocal < 0) {
      return [];
    }

    const pipePositions: number[] = [];
    for (let i = firstPipeLocal; i < trimmed.length; i++) {
      if (trimmed[i] !== '|') continue;
      if (SentenceParser.isEscapedPipe(trimmed, i)) continue;
      pipePositions.push(i);
    }

    if (pipePositions.length < 2) {
      return [];
    }

    const ranges: Array<{ start: number; end: number }> = [];
    const delimiters = pipePositions.slice();
    // 末尾の '|' は省略可能なため、無い場合は行末を区切りとして扱う
    if (delimiters[delimiters.length - 1] !== trimmed.length - 1) {
      delimiters.push(trimmed.length);
    }

    for (let i = 0; i < delimiters.length - 1; i++) {
      const left = delimiters[i];
      const right = delimiters[i + 1];
      let contentStart = left + 1;
      let contentEnd = right;

      // trim spaces/tabs inside the cell but keep original offsets
      while (contentStart < contentEnd && (trimmed[contentStart] === ' ' || trimmed[contentStart] === '\t')) {
        contentStart++;
      }
      while (contentEnd > contentStart && (trimmed[contentEnd - 1] === ' ' || trimmed[contentEnd - 1] === '\t')) {
        contentEnd--;
      }

      const absStart = lineStart + contentStart;
      const absEnd = lineStart + contentEnd;
      if (absEnd > absStart) {
        ranges.push({ start: absStart, end: absEnd });
      }
    }

    return ranges;
  }

  private static scoreTableCell(text: string): number {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return -1;
    }

    // backticks only -> low value
    const withoutTicks = trimmed.replace(/`/g, '');
    const normalized = withoutTicks.trim();

    // "PASS"/"FAIL" などは基本的に解析対象として弱い
    if (/^(?:PASS|FAIL|OK|NG)$/i.test(normalized)) {
      return 0;
    }

    let score = 0;
    if (/[ぁ-んァ-ン一-龠]/.test(normalized)) {
      score += 100;
    }
    if (/[。！？!?]/.test(normalized)) {
      score += 40;
    }
    if (/、/.test(normalized)) {
      score += 20;
    }
    // 例文になりやすい: 助詞/述語らしき終端
    if (/(?:です|ます|である|だ|た|ない)$/.test(normalized.replace(/[。！？!?]$/, ''))) {
      score += 10;
    }
    score += Math.min(normalized.length, 200);
    return score;
  }

  private static selectBestTableCellRange(
    text: string,
    ranges: Array<{ start: number; end: number }>
  ): { start: number; end: number } | null {
    if (ranges.length === 0) {
      return null;
    }

    let best = ranges[0];
    let bestScore = SentenceParser.scoreTableCell(text.substring(best.start, best.end));

    for (const range of ranges.slice(1)) {
      const score = SentenceParser.scoreTableCell(text.substring(range.start, range.end));
      if (score > bestScore) {
        best = range;
        bestScore = score;
      }
    }

    if (bestScore <= 0) {
      return null;
    }
    return best;
  }

  private static isMarkdownTableSeparatorLine(lineText: string): boolean {
    const trimmed = lineText.trim();
    if (trimmed.length === 0) {
      return false;
    }

    if (!trimmed.startsWith('|') || !/-/.test(trimmed)) {
      return false;
    }

    return /^\|[\s\-:|]+\|?$/.test(trimmed);
  }

  /**
   * 改行で文を分割すべきかを判断（normalモード用）
   * @param text テキスト全体
   * @param newlinePos 改行の位置
   * @param tokens トークンリスト
   * @returns 分割すべきならtrue
   */
  private static shouldSplitOnNewline(text: string, newlinePos: number, tokens: Token[]): boolean {
    // 前の行と次の行を取得
    const beforeLine = SentenceParser.getLineContent(text, newlinePos, 'before');
    const afterLine = SentenceParser.getLineContent(text, newlinePos, 'after');

    // 空行の場合は分割
    if (beforeLine.trim().length === 0 || afterLine.trim().length === 0) {
      return true;
    }

    // 次の行がMarkdown構造で始まる場合は分割
    if (/^[#\-*+>]/.test(afterLine.trim())) {
      return true;
    }

    // 前の行が文末記号で終わる場合は分割
    if (/[。！？!?]$/.test(beforeLine.trim())) {
      return true;
    }

    // 前の行がコロンで終わる場合は分割（リスト導入など）
    if (/[:：]$/.test(beforeLine.trim())) {
      return true;
    }

    // 前の行が助詞で終わり、文が続きそうな場合は結合
    const beforeTrimmed = beforeLine.trim();
    if (/[はがをにへとでや、]$/.test(beforeTrimmed)) {
      // ただし、次の行が大文字や記号で始まる場合は分割
      if (/^[A-Z#\-*]/.test(afterLine.trim())) {
        return true;
      }
      return false; // 結合
    }

    // デフォルト：分割（Markdownでは各行が独立していることが多い）
    return true;
  }

  /**
   * 指定位置の前後の行内容を取得
   * @param text テキスト全体
   * @param pos 基準位置
   * @param direction 'before' または 'after'
   * @returns 行の内容
   */
  private static getLineContent(text: string, pos: number, direction: 'before' | 'after'): string {
    if (direction === 'before') {
      // 前の改行を探す（\nまたは\r）
      let start = pos - 1;
      while (start >= 0 && text[start] !== '\n' && text[start] !== '\r') {
        start--;
      }
      // posは\rまたは\nの位置なので、その直前までが行の内容
      return text.substring(start + 1, pos);
    } else {
      // 次の改行を探す（\nまたは\r）
      // posが\rの場合、次の文字が\nかもしれないのでスキップ
      let start = pos;
      if (text[start] === '\r' && start + 1 < text.length && text[start + 1] === '\n') {
        start++; // \r\nの場合、\nの次から開始
      }
      let end = start + 1;
      while (end < text.length && text[end] !== '\n' && text[end] !== '\r') {
        end++;
      }
      return text.substring(start + 1, end);
    }
  }

  /**
   * 指定範囲内のトークンを取得
   * @param tokens トークンリスト
   * @param start 開始位置
   * @param end 終了位置
   * @returns 範囲内のトークン
   */
  private static getTokensInRange(tokens: Token[], start: number, end: number): Token[] {
    if (tokens.length === 0) {
      return [];
    }

    let left = 0;
    let right = tokens.length;

    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (tokens[mid].start < start) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }

    const selected: Token[] = [];
    for (let i = left; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.start >= end) {
        break;
      }
      if (token.end > end) {
        break;
      }
      selected.push(token);
    }

    return selected;
  }

  /**
   * テキストから読点の数をカウント
   * @param text テキスト
   * @returns 読点の数
   */
  static countCommas(text: string): number {
    return (text.match(/、/g) || []).length;
  }
}

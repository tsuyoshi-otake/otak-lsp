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

    for (let i = 0; i < text.length; i++) {
      // Markdown特有の境界で強制分割
      if (markdownBreaks && markdownBreaks.has(i)) {
        SentenceParser.pushSentence(sentences, text, tokens, currentStart, i);
        currentStart = text[i] === '\n' ? i + 1 : i;
        continue;
      }

      // 文の終端記号をチェック
      if (SENTENCE_TERMINATORS.test(text[i])) {
        // 連続する終端記号をスキップ
        while (i + 1 < text.length && SENTENCE_TERMINATORS.test(text[i + 1])) {
          i++;
        }

        SentenceParser.pushSentence(sentences, text, tokens, currentStart, i + 1);

        currentStart = i + 1;
      }
      // 改行をチェック（LFとCRLFの両方に対応）
      else if (text[i] === '\n') {
        // CRLF (\r\n) の場合、\r の位置を基準にする
        const newlineStart = (i > 0 && text[i - 1] === '\r') ? i - 1 : i;
        
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
          SentenceParser.pushSentence(sentences, text, tokens, currentStart, newlineStart);

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
            SentenceParser.pushSentence(sentences, text, tokens, currentStart, newlineStart);
            currentStart = i + 1;
          }
        }
      }
    }

    // 最後の文（終端記号なし）
    if (currentStart < text.length) {
      SentenceParser.pushSentence(sentences, text, tokens, currentStart, text.length);
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
      }

      if (range.type === 'heading') {
        breaks.add(range.start);
        const lineEnd = text.indexOf('\n', range.start);
        if (lineEnd !== -1) {
          breaks.add(lineEnd);
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

  /**
   * 文を追加（空白のみの文はスキップ）
   */
  private static pushSentence(
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
    return tokens.filter(token => token.start >= start && token.end <= end);
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

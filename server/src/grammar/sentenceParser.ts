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
   * @returns 文のリスト
   */
  static parseSentences(text: string, tokens: Token[], excludedRanges?: ExcludedRange[]): Sentence[] {
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
      // 段落区切り（空行）をチェック
      else if (text[i] === '\n') {
        // 空行かどうかをチェック（次の非空白文字までに改行があるか）
        let j = i + 1;
        let hasEmptyLine = false;
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n')) {
          if (text[j] === '\n') {
            hasEmptyLine = true;
            break;
          }
          j++;
        }

        if (hasEmptyLine) {
          SentenceParser.pushSentence(sentences, text, tokens, currentStart, i);

          // 空行をスキップ
          while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\n')) {
            j++;
          }
          i = j - 1;
          currentStart = j;
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
      const line = lines[i];
      const lineStart = position;
      const lineEnd = position + line.length; // 改行を含まない行末
      const hasNewline = lineEnd < text.length && text[lineEnd] === '\n';

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

      position += line.length + 1; // +1 for newline
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

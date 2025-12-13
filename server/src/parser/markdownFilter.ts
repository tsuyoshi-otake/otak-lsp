/**
 * Markdown Filter
 * マークダウン文書のフィルタリング機能を提供
 * Feature: markdown-document-filtering
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1
 */

import {
  FilterConfig,
  FilterResult,
  ExcludedRange,
  DebugInfo,
  IMarkdownFilter,
  DEFAULT_FILTER_CONFIG,
  ExcludeType,
  FilterError
} from '../../../shared/src/markdownFilterTypes';

/**
 * マークダウンフィルタークラス
 * コードブロック、テーブル、URL等を文法チェック対象から除外する
 */
export class MarkdownFilter implements IMarkdownFilter {
  private config: FilterConfig;
  private logs: string[] = [];

  constructor(config?: FilterConfig) {
    this.config = config ? { ...DEFAULT_FILTER_CONFIG, ...config } : { ...DEFAULT_FILTER_CONFIG };
  }

  private stripBlockquotePrefix(
    line: string,
    maxDepth: number = Number.POSITIVE_INFINITY
  ): { strippedLine: string; depth: number; strippedLength: number } {
    let index = 0;
    let depth = 0;

    while (depth < maxDepth) {
      const whitespaceStart = index;
      while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
        index++;
      }

      if (index < line.length && line[index] === '>') {
        depth++;
        index++;
        // CommonMark: ">" の直後の 1 空白は無視される
        if (index < line.length && line[index] === ' ') {
          index++;
        }
        continue;
      }

      // '>' が続かない場合、この空白は本文のインデントなので戻す
      index = whitespaceStart;
      break;
    }

    return { strippedLine: line.substring(index), depth, strippedLength: index };
  }

  /**
   * テキストをフィルタリング
   * @param text フィルタリング対象のテキスト
   * @param config フィルタリング設定（オプション）
   * @returns フィルタリング結果
   */
  filter(text: string, config?: FilterConfig): FilterResult {
    const startTime = Date.now();
    this.logs = [];

    const effectiveConfig = config ? { ...this.config, ...config } : this.config;
    this.log('フィルタリング処理開始');

    try {
      // 空テキストの処理
      if (!text || text.length === 0) {
        this.log('空テキストが入力されました');
        return this.createResult('', [], text, startTime, effectiveConfig);
      }

      // 除外範囲を取得
      const excludedRanges = this.getExcludedRanges(text, effectiveConfig);
      this.log(`除外範囲数: ${excludedRanges.length}`);

      // フィルタリング済みテキストを生成
      const filteredText = this.applyFilter(text, excludedRanges);
      this.log('フィルタリング処理完了');

      return this.createResult(filteredText, excludedRanges, text, startTime, effectiveConfig);
    } catch (error) {
      this.log(`エラー発生: ${error instanceof Error ? error.message : String(error)}`);
      // エラー時はGraceful Degradation: 元のテキストを返却
      return this.createResult(text, [], text, startTime, effectiveConfig);
    }
  }

  /**
   * 除外範囲を取得
   * @param text 対象テキスト
   * @param config フィルタリング設定（オプション）
   * @returns 除外範囲のリスト
   */
  getExcludedRanges(text: string, config?: FilterConfig): ExcludedRange[] {
    const effectiveConfig = config ? { ...this.config, ...config } : this.config;
    const ranges: ExcludedRange[] = [];

    if (!text || text.length === 0) {
      return ranges;
    }

    // 各フィルタリング処理を優先順位順に実行
    // 優先順位: コードブロック > インラインコード > URL > 設定キー > カスタムパターン > テーブル

    if (effectiveConfig.excludeCodeBlocks) {
      ranges.push(...this.findCodeBlocks(text));
    }

    if (effectiveConfig.excludeInlineCode) {
      ranges.push(...this.findInlineCode(text, ranges));
    }

    if (effectiveConfig.excludeUrls) {
      ranges.push(...this.findUrls(text, ranges));
    }

    if (effectiveConfig.excludeConfigKeys) {
      ranges.push(...this.findConfigKeys(text, ranges));
    }

    if (effectiveConfig.customExcludePatterns.length > 0) {
      ranges.push(...this.findCustomPatterns(text, effectiveConfig.customExcludePatterns, ranges));
    }

    if (effectiveConfig.excludeTables) {
      ranges.push(...this.findTables(text, ranges));
    }

    if (effectiveConfig.excludeHeadings) {
      ranges.push(...this.findHeadings(text, ranges));
    }

    if (effectiveConfig.excludeListMarkers) {
      ranges.push(...this.findListMarkers(text, ranges));
    }

    // 範囲をソート（開始位置順）
    return ranges.sort((a, b) => a.start - b.start);
  }

  /**
   * コードブロックを検出
   */
  private findCodeBlocks(text: string): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];

    // NOTE:
    // 以前は /```[\\s\\S]*?```/ で検出していたが、
    // これは行途中の ```...``` を「コードブロック」と誤認し、
    // テーブル検出を阻害する（README の evals など）ため、
    // CommonMark 互換の「行頭フェンス」を優先しつつ、
    // 後方互換のため単一行の ```code``` 形式も検出する。
    const lines = text.split('\n');
    let position = 0;

    let inCodeBlock = false;
    let codeBlockStart = -1;
    let fenceChar: '`' | '~' | null = null;
    let fenceLength = 0;

    const openingFencePattern = /^\s*(`{3,}|~{3,})(.*)$/;
    let codeBlockBlockquoteDepth = 0;

    for (const line of lines) {
      const lineStart = position;

      if (!inCodeBlock) {
        const { strippedLine, depth } = this.stripBlockquotePrefix(line);
        const match = strippedLine.match(openingFencePattern);
        if (match) {
          inCodeBlock = true;
          codeBlockStart = lineStart;
          fenceChar = match[1][0] as '`' | '~';
          fenceLength = match[1].length;
          codeBlockBlockquoteDepth = depth;
        }
      } else if (fenceChar) {
        const { strippedLine, depth: actualDepth } = this.stripBlockquotePrefix(line, codeBlockBlockquoteDepth);
        if (actualDepth === codeBlockBlockquoteDepth) {
          const closingFencePattern = new RegExp(`^\\s*${fenceChar}{${fenceLength},}\\s*$`);
          if (closingFencePattern.test(strippedLine)) {
            const codeBlockEnd = lineStart + line.length;
            ranges.push({
              start: codeBlockStart,
              end: codeBlockEnd,
              type: 'code-block',
              content: text.substring(codeBlockStart, codeBlockEnd),
              reason: 'コードブロック検出'
            });

            inCodeBlock = false;
            codeBlockStart = -1;
            fenceChar = null;
            fenceLength = 0;
            codeBlockBlockquoteDepth = 0;
          }
        }
      }

      position += line.length + 1; // +1 for newline
    }

    // 単一行の ```code``` 形式（GFMでは通常コードブロック扱いではないが、既存挙動維持）
    // - ただし複数行ブロック検出と重複する場合は除外
    const inlineFencePattern = /```[^`\n]+```/g;
    let inlineMatch;
    while ((inlineMatch = inlineFencePattern.exec(text)) !== null) {
      const start = inlineMatch.index;
      const end = inlineMatch.index + inlineMatch[0].length;
      if (!this.isOverlapping(start, end, ranges)) {
        ranges.push({
          start,
          end,
          type: 'code-block',
          content: inlineMatch[0],
          reason: 'コードブロック検出'
        });
      }
    }

    return ranges;
  }

  /**
   * インラインコードを検出
   */
  private findInlineCode(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];
    const lines = text.split('\n');
    let position = 0;

    for (const line of lines) {
      let i = 0;
      while (i < line.length) {
        if (line[i] !== '`') {
          i++;
          continue;
        }

        const openingStart = i;
        let tickCount = 0;
        while (i < line.length && line[i] === '`') {
          tickCount++;
          i++;
        }

        let closingEnd = -1;
        let j = i;
        while (j < line.length) {
          if (line[j] !== '`') {
            j++;
            continue;
          }

          let k = j;
          while (k < line.length && line[k] === '`') {
            k++;
          }
          const runLength = k - j;
          if (runLength === tickCount) {
            closingEnd = k;
            break;
          }
          j = k;
        }

        if (closingEnd !== -1) {
          const absStart = position + openingStart;
          const absEnd = position + closingEnd;
          if (!this.isOverlapping(absStart, absEnd, existingRanges)) {
            ranges.push({
              start: absStart,
              end: absEnd,
              type: 'inline-code',
              content: text.substring(absStart, absEnd),
              reason: 'インラインコード検出'
            });
          }
          i = closingEnd;
        } else {
          // 閉じバッククォートがない場合はリテラルとして扱い、1文字進める
          i = openingStart + 1;
        }
      }

      position += line.length + 1; // +1 for newline
    }

    return ranges;
  }

  /**
   * URLを検出
   */
  private findUrls(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];

    // プレーンテキストURL
    const plainUrlPattern = /https?:\/\/[^\s<>\[\]()]+/g;
    let match;

    while ((match = plainUrlPattern.exec(text)) !== null) {
      if (!this.isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'url',
          content: match[0],
          reason: 'URL検出'
        });
      }
    }

    // マークダウンリンクのURL部分 [text](url)
    const mdLinkPattern = /\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdLinkPattern.exec(text)) !== null) {
      const urlStart = match.index + match[1].length + 3; // [text](の後
      const urlEnd = match.index + match[0].length - 1; // )の前
      if (!this.isOverlapping(urlStart, urlEnd, existingRanges)) {
        ranges.push({
          start: urlStart,
          end: urlEnd,
          type: 'url',
          content: match[2],
          reason: 'マークダウンリンクURL検出'
        });
      }
    }

    // 自動リンク <url>
    const autoLinkPattern = /<(https?:\/\/[^>]+)>/g;
    while ((match = autoLinkPattern.exec(text)) !== null) {
      if (!this.isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'url',
          content: match[0],
          reason: '自動リンク検出'
        });
      }
    }

    return ranges;
  }

  /**
   * 設定キー名を検出
   */
  private findConfigKeys(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];
    // otakLcp.*, config.*, settings.* などのパターン
    const configKeyPattern = /\b(?:otakLcp|config|settings)\.[a-zA-Z0-9_.]+/g;
    let match;

    while ((match = configKeyPattern.exec(text)) !== null) {
      if (!this.isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
        ranges.push({
          start: match.index,
          end: match.index + match[0].length,
          type: 'config-key',
          content: match[0],
          reason: '設定キー名検出'
        });
      }
    }

    return ranges;
  }

  /**
   * カスタムパターンを検出
   */
  private findCustomPatterns(
    text: string,
    patterns: RegExp[],
    existingRanges: ExcludedRange[]
  ): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];

    for (const pattern of patterns) {
      // グローバルフラグを追加（なければ）
      const globalPattern = pattern.global
        ? pattern
        : new RegExp(pattern.source, pattern.flags + 'g');

      let match;
      while ((match = globalPattern.exec(text)) !== null) {
        if (!this.isOverlapping(match.index, match.index + match[0].length, existingRanges)) {
          ranges.push({
            start: match.index,
            end: match.index + match[0].length,
            type: 'custom',
            content: match[0],
            reason: `カスタムパターン検出: ${pattern.source}`
          });
        }
      }
    }

    return ranges;
  }

  /**
   * テーブルを検出
   * 注: テーブルは他の除外要素（設定キー、URL等）を含むことがあるため、
   * コードブロックとのみ重複チェックを行う。
   *
   * 変更点:
   * - テーブル全体（type: 'table'）に加えて、構造要素のみを除外範囲として返す
   *   * 区切り文字（|）: table-delimiter
   *   * セパレーター行（|---|---| 等）: table-separator
   */
  private findTables(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];
    const lines = text.split('\n');
    let position = 0;
    let tableStart = -1;
    let inTable = false;
    const tableDelimiters: ExcludedRange[] = [];
    const tableSeparators: ExcludedRange[] = [];

    // コードブロック範囲のみをチェック対象とする（テーブル内にURL等があっても検出可能にする）
    // ただし単一行の ```code``` はフェンスドブロックではなく、
    // テーブル検出を阻害しないよう「複数行のコードブロック」のみを対象にする。
    const codeBlockRanges = existingRanges.filter(
      (r) => r.type === 'code-block' && (r.content.includes('\n') || r.content.includes('\r'))
    );

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = position;
      const { strippedLine } = this.stripBlockquotePrefix(line);
      const trimmed = strippedLine.trim();
      const compact = trimmed.replace(/\s+/g, '');
      const isTableRow = trimmed.startsWith('|') && trimmed.indexOf('|', 1) !== -1;
      const isSeparator = /^\|[-:|]+\|?$/.test(compact);

      if ((isTableRow || isSeparator) && !inTable) {
        inTable = true;
        tableStart = lineStart;
      }

      if (inTable && (isTableRow || isSeparator)) {
        if (isSeparator) {
          // セパレーター行全体を除外
          tableSeparators.push({
            start: lineStart,
            end: lineStart + line.length,
            type: 'table-separator',
            content: line,
            reason: 'マークダウンテーブルセパレーター行検出'
          });
        } else {
          // 区切り文字（|）のみを除外
          for (let j = 0; j < line.length; j++) {
            if (line[j] === '|') {
              const absPos = lineStart + j;
              tableDelimiters.push({
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

      if (inTable && !isTableRow && !isSeparator) {
        const tableEnd = lineStart;
        if (!this.isOverlapping(tableStart, tableEnd, codeBlockRanges)) {
          const tableContent = text.substring(tableStart, tableEnd);
          ranges.push({
            start: tableStart,
            end: tableEnd,
            type: 'table',
            content: tableContent,
            reason: 'マークダウンテーブル検出'
          });
          // テーブル構造要素を追加
          ranges.push(...tableDelimiters);
          ranges.push(...tableSeparators);
        }
        inTable = false;
        tableStart = -1;
        tableDelimiters.length = 0;
        tableSeparators.length = 0;
      }

      position += line.length + 1; // +1 for newline
    }

    // 最後まで続くテーブルの処理
    if (inTable && tableStart >= 0) {
      if (!this.isOverlapping(tableStart, text.length, codeBlockRanges)) {
        const tableContent = text.substring(tableStart);
        ranges.push({
          start: tableStart,
          end: text.length,
          type: 'table',
          content: tableContent,
          reason: 'マークダウンテーブル検出'
        });
        // テーブル構造要素を追加
        ranges.push(...tableDelimiters);
        ranges.push(...tableSeparators);
      }
    }

    return ranges;
  }

  /**
   * 見出しマーカーを検出
   * # で始まる行の「# 」部分のみを除外（タイトルテキストは検出対象に残す）
   */
  private findHeadings(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];
    const lines = text.split('\n');
    let position = 0;

    // コードブロック範囲のみをチェック対象とする
    const codeBlockRanges = existingRanges.filter((r) => r.type === 'code-block');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = position;

      // マークダウン見出し: # で始まる行のマーカー部分のみ除外
      const headingMatch = line.match(/^(\s*(?:>\s*)*)(#{1,6}\s)/);
      if (headingMatch) {
        const markerEnd = lineStart + headingMatch[1].length + headingMatch[2].length;
        if (!this.isOverlapping(lineStart, markerEnd, codeBlockRanges)) {
          ranges.push({
            start: lineStart,
            end: markerEnd,
            type: 'heading',
            content: headingMatch[0],
            reason: 'マークダウン見出しマーカー検出'
          });
        }
      }

      position += line.length + 1; // +1 for newline
    }

    return ranges;
  }

  /**
   * リストマーカーを検出
   * - * + や 1. などのマーカー部分のみを除外（内容テキストは検出対象に残す）
   */
  private findListMarkers(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
    const ranges: ExcludedRange[] = [];
    const lines = text.split('\n');
    let position = 0;

    // コードブロック範囲のみをチェック対象とする
    const codeBlockRanges = existingRanges.filter((r) => r.type === 'code-block');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = position;

      // リストマーカー: - * + または 1. 2. などで始まる行のマーカー部分のみ除外
      const listMatch =
        line.match(/^(\s*(?:>\s*)*)(\s*[-*+]\s)/) ||
        line.match(/^(\s*(?:>\s*)*)(\s*\d+\.\s)/);
      if (listMatch) {
        const markerEnd = lineStart + listMatch[1].length + listMatch[2].length;
        if (!this.isOverlapping(lineStart, markerEnd, codeBlockRanges)) {
          ranges.push({
            start: lineStart,
            end: markerEnd,
            type: 'list-marker',
            content: listMatch[0],
            reason: 'リストマーカー検出'
          });
        }
      }

      position += line.length + 1; // +1 for newline
    }

    return ranges;
  }

  /**
   * 行の開始位置を取得
   */
  private getLineStart(text: string, lineIndex: number): number {
    const lines = text.split('\n');
    let position = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    return position;
  }

  /**
   * 範囲が既存の範囲と重複しているかチェック
   */
  private isOverlapping(start: number, end: number, existingRanges: ExcludedRange[]): boolean {
    return existingRanges.some(
      (range) => start < range.end && end > range.start
    );
  }

  /**
   * フィルタリングを適用してテキストを生成
   */
  private applyFilter(text: string, ranges: ExcludedRange[]): string {
    if (ranges.length === 0) {
      return text;
    }

    // NOTE:
    // - 位置（オフセット）だけでなく行構造も保持するため、\n/\r は置換しない
    // - Markdown構造ルール（見出し/箇条書き/テーブル/コードブロック等）が参照できるよう、
    //   一部の構文記号は保持する（トークン側は TokenFilter で除外する）
    const chars = text.split('');

    const maskRangePreservingNewlines = (start: number, end: number): void => {
      const safeStart = Math.max(0, Math.min(start, chars.length));
      const safeEnd = Math.max(safeStart, Math.min(end, chars.length));
      for (let i = safeStart; i < safeEnd; i++) {
        const ch = chars[i];
        if (ch !== '\n' && ch !== '\r') {
          chars[i] = ' ';
        }
      }
    };

    const sanitizeCodeFenceLanguageSpec = (lineStart: number, lineEndExclusive: number): void => {
      const line = text.substring(lineStart, lineEndExclusive);
      const match = line.match(/^(\s*(?:>\s*)*)(`{3,}|~{3,})(.*)$/);
      if (!match) {
        return;
      }

      const prefixLength = match[1].length + match[2].length;
      const rest = match[3];
      if (rest.trim().length === 0) {
        return;
      }

      const restStart = lineStart + prefixLength;
      for (let i = restStart; i < lineEndExclusive; i++) {
        const ch = chars[i];
        if (ch !== ' ' && ch !== '\t' && ch !== '\r') {
          chars[i] = 'x';
        }
      }
    };

    const maskCodeBlockContentPreservingFences = (range: ExcludedRange): void => {
      const start = Math.max(0, Math.min(range.start, chars.length));
      const end = Math.max(start, Math.min(range.end, chars.length));
      const blockText = text.substring(start, end);

      // 単一行の ```code``` 形式など（改行なし）は全体をマスク
      const firstNewlineRel = blockText.indexOf('\n');
      if (firstNewlineRel === -1) {
        maskRangePreservingNewlines(start, end);
        return;
      }

      // 先頭行（フェンス）は保持しつつ、言語指定部分は規則検出（term-notation 等）のノイズにならないよう無害化
      const openingFenceLineEndExclusive = start + firstNewlineRel;
      sanitizeCodeFenceLanguageSpec(start, openingFenceLineEndExclusive);

      // 末尾行（閉じフェンス）は保持し、間の内容だけをマスク
      const lastNewlineRel = blockText.lastIndexOf('\n');
      const openingFenceLineEnd = start + firstNewlineRel + 1; // include \n
      const closingFenceLineStart = start + lastNewlineRel + 1; // start of last line

      if (openingFenceLineEnd < closingFenceLineStart) {
        maskRangePreservingNewlines(openingFenceLineEnd, closingFenceLineStart);
      }
    };

    for (const range of ranges) {
      // 無効な範囲はスキップ
      if (range.start >= range.end) {
        continue;
      }

      // table 全体は文法チェック用の除外情報として保持しつつ、
      // セマンティックハイライトのために内容は残す
      if (range.type === 'table') {
        continue;
      }

      // Markdown構造を維持したい要素は置換しない（TokenFilterでトークン側を除外する）
      if (
        range.type === 'heading' ||
        range.type === 'list-marker' ||
        range.type === 'table-delimiter' ||
        range.type === 'table-separator'
      ) {
        continue;
      }

      // コードブロックは内容だけをマスク（フェンス行は残す）
      if (range.type === 'code-block') {
        maskCodeBlockContentPreservingFences(range);
        continue;
      }

      // その他の除外範囲はスペースで置換（改行は保持して行位置を崩さない）
      maskRangePreservingNewlines(range.start, range.end);
    }

    return chars.join('');
  }

  /**
   * フィルタリング結果を生成
   */
  private createResult(
    filteredText: string,
    excludedRanges: ExcludedRange[],
    originalText: string,
    startTime: number,
    config: FilterConfig
  ): FilterResult {
    const result: FilterResult = {
      filteredText,
      excludedRanges,
      originalText
    };

    if (config.debugMode) {
      result.debugInfo = this.createDebugInfo(excludedRanges, startTime);
    }

    return result;
  }

  /**
   * デバッグ情報を生成
   */
  private createDebugInfo(ranges: ExcludedRange[], startTime: number): DebugInfo {
    const excludedByType: Partial<Record<ExcludeType, number>> = {};
    let totalExcludedCharacters = 0;

    for (const range of ranges) {
      const length = range.end - range.start;
      totalExcludedCharacters += length;
      excludedByType[range.type] = (excludedByType[range.type] || 0) + length;
    }

    return {
      processingTimeMs: Date.now() - startTime,
      totalExcludedCharacters,
      excludedByType,
      logs: [...this.logs]
    };
  }

  /**
   * デバッグログを追加
   */
  private log(message: string): void {
    if (this.config.debugMode) {
      this.logs.push(`[${new Date().toISOString()}] ${message}`);
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<FilterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): FilterConfig {
    return { ...this.config };
  }
}

/**
 * English Case Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 8 - Detect mixing of case variations in English words
 *
 * Detects when the same English word appears with different capitalizations
 * (e.g., API/api/Api)
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * English Case Mix Detection Rule
 * 英語表記の大文字小文字混在を検出する
 */
export class EnglishCaseMixRule extends MixDetectionRule {
  name = 'english-case-mix';
  description = '英語表記の大文字小文字混在を検出します';

  // コマンド文脈は表記揺れチェックの対象外（例: npm install / git commit）
  private readonly cliCommandHeads = new Set([
    'npm',
    'npx',
    'pnpm',
    'yarn',
    'git',
    'docker',
    'kubectl',
    'cargo',
    'python',
    'python3',
    'pip',
    'pip3',
    'node',
    'deno',
    'bun'
  ]);

  // 既知のCLIコマンドヘッドのみを検出する（1行ごとに走査し、表記揺れ検出から除外する）
  private readonly cliCommandHeadRegex = new RegExp(
    `\\b(?:${Array.from(this.cliCommandHeads).join('|')})\\b`,
    'gi'
  );

  /**
   * コードブロック（```...```）とインラインコード（`...`）の範囲を取得
   */
  private getCodeRanges(text: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];

    // コードブロック（```...```）
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    // インラインコード（`...`）
    const inlineCodeRegex = /`[^`\n]+`/g;
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    // メンバーシップ判定をO(1)に近づけるため、開始位置でソートしておく
    ranges.sort((a, b) => a.start - b.start);
    return ranges;
  }

  /**
   * 拡張子パターンかどうかを判定（例: .vsix, .md, .js）
   */
  private isFileExtension(text: string, index: number): boolean {
    // 前の文字がドットかどうか
    if (index > 0 && text[index - 1] === '.') {
      return true;
    }
    return false;
  }

  /**
   * ハイフンで繋がった識別子内かどうかを判定（例: otak-lsp の lsp）
   */
  private isInHyphenatedIdentifier(text: string, index: number, wordLength: number): boolean {
    // 前後にハイフンがある場合は識別子の一部
    const prevChar = index > 0 ? text[index - 1] : '';
    const nextChar = index + wordLength < text.length ? text[index + wordLength] : '';

    return prevChar === '-' || nextChar === '-';
  }

  /**
   * Override check to provide more specific diagnostics per word
   * Feature: advanced-rules-shared-preprocessing-cache
   * - context.shared がある場合は共有コンテキストのコード範囲を使用
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const wordVariants = this.findWordVariantsWithContext(context.documentText, context);
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const [normalizedWord, variants] of wordVariants) {
      if (variants.size > 1) {
        const variantList = Array.from(variants.keys());

        let firstIndex = Number.POSITIVE_INFINITY;
        let firstVariant = normalizedWord;
        for (const [variant, index] of variants) {
          if (index < firstIndex) {
            firstIndex = index;
            firstVariant = variant;
          }
        }

        const startOffset = Number.isFinite(firstIndex) ? firstIndex : 0;
        const endOffset = Math.min(startOffset + firstVariant.length, context.documentText.length);

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: startOffset },
            end: { line: 0, character: endOffset }
          },
          message: `英語表記「${normalizedWord}」の大文字小文字が統一されていません。${variantList.join('、')}が混在しています。`,
          code: 'english-case-mix',
          ruleName: this.name,
          suggestions: [`「${variantList[0]}」または「${normalizedWord.toUpperCase()}」に統一してください`]
        }));
      }
    }

    return diagnostics;
  }

  /**
   * Find all variants of English words in text with shared context support
   * Feature: advanced-rules-shared-preprocessing-cache
   * - context.shared がある場合は共有コンテキストのコード範囲を使用
   * - context.shared がない場合は従来通り個別に計算（フォールバック）
   */
  private findWordVariantsWithContext(text: string, context: RuleContext): Map<string, Map<string, number>> {
    // 共有コンテキストがあれば再利用、なければ個別計算
    const codeRanges = context.shared?.codeRanges ?? this.getCodeRanges(text);
    return this.findWordVariantsWithCodeRanges(text, codeRanges);
  }

  /**
   * Find all variants of English words in text
   * コードブロック、拡張子、ハイフン識別子内は除外
   */
  private findWordVariants(text: string): Map<string, Map<string, number>> {
    const codeRanges = this.getCodeRanges(text);
    return this.findWordVariantsWithCodeRanges(text, codeRanges);
  }

  /**
   * Find all variants of English words in text with given code ranges
   * 内部実装: コード範囲は引数で受け取る
   */
  private findWordVariantsWithCodeRanges(text: string, codeRanges: Array<{ start: number; end: number }>): Map<string, Map<string, number>> {
    // 値は「その表記（variant）の最初の出現位置」のみ保持する
    // - 既存実装は全出現位置を配列に保存していたが、診断生成では最初の位置しか使っていないため
    const wordVariants = new Map<string, Map<string, number>>();

    // Match English words (2+ characters)
    const wordRegex = /[a-zA-Z]{2,}/g;
    let match;

    // codeRanges は start 昇順を前提に、カーソルで所属判定する（O(matches + ranges)）
    let codeRangeIndex = 0;

    // CLI判定は「行」単位でキャッシュし、同一行内の複数マッチで再走査しない
    const findLineEnd = (from: number): number => {
      let lineEnd = text.indexOf('\n', from);
      const crEnd = text.indexOf('\r', from);
      if (lineEnd === -1 || (crEnd !== -1 && crEnd < lineEnd)) {
        lineEnd = crEnd;
      }
      return lineEnd === -1 ? text.length : lineEnd;
    };

    let lineStart = 0;
    let lineEnd = findLineEnd(0);
    let cliSegments = this.findCliCommandSegments(text.slice(lineStart, lineEnd));

    const isInCliCommandFast = (offset: number): boolean => {
      while (offset >= lineEnd) {
        if (lineEnd >= text.length) {
          return false;
        }

        // 改行コード分をスキップ（\r\n と \n/\r を両対応）
        let nextStart = lineEnd + 1;
        if (text[lineEnd] === '\r' && text[lineEnd + 1] === '\n') {
          nextStart = lineEnd + 2;
        }

        lineStart = nextStart;
        lineEnd = findLineEnd(lineStart);
        cliSegments = this.findCliCommandSegments(text.slice(lineStart, lineEnd));
      }

      const localOffset = offset - lineStart;
      for (const segment of cliSegments) {
        if (localOffset >= segment.start && localOffset < segment.end) {
          return true;
        }
      }
      return false;
    };

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const index = match.index;

      // 除外条件をチェック
      if (this.isFileExtension(text, index)) {
        continue;
      }
      if (this.isInHyphenatedIdentifier(text, index, word.length)) {
        continue;
      }
      while (codeRangeIndex < codeRanges.length && index >= codeRanges[codeRangeIndex].end) {
        codeRangeIndex++;
      }
      if (codeRangeIndex < codeRanges.length) {
        const range = codeRanges[codeRangeIndex];
        if (index >= range.start && index < range.end) {
          continue;
        }
      }
      if (isInCliCommandFast(index)) {
        continue;
      }

      const normalizedWord = word.toLowerCase();

      if (!wordVariants.has(normalizedWord)) {
        wordVariants.set(normalizedWord, new Map<string, number>());
      }

      const variants = wordVariants.get(normalizedWord)!;
      if (!variants.has(word)) {
        variants.set(word, index);
      }
    }

    return wordVariants;
  }

  private findCliCommandSegments(line: string): Array<{ start: number; end: number }> {
    const segments: Array<{ start: number; end: number }> = [];

    // Find known command heads and consume subsequent "command-ish" tokens until a non-command character.
    const isAllowedTokenChar = (ch: string) => /[A-Za-z0-9@._/:-]/.test(ch) || ch === '-' || ch === '+';
    const isAllowedInSegment = (ch: string) => isAllowedTokenChar(ch) || /[ \t]/.test(ch);

    this.cliCommandHeadRegex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = this.cliCommandHeadRegex.exec(line)) !== null) {
      const head = match[0];

      const headStart = match.index;
      const headEnd = headStart + head.length;

      // Require at least one whitespace + one command token after the head.
      let i = headEnd;
      if (i >= line.length || !/[ \t]/.test(line[i])) {
        continue;
      }
      while (i < line.length && /[ \t]/.test(line[i])) {
        i++;
      }
      if (i >= line.length) {
        continue;
      }

      let end = i;
      while (end < line.length && isAllowedInSegment(line[end])) {
        end++;
      }

      segments.push({ start: headStart, end });
    }

    return segments;
  }

  /**
   * Not used - we override check() directly
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    return new Map();
  }

  /**
   * Not used - we override check() directly
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    return '';
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'english-case-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableEnglishCaseMix';
  }
}

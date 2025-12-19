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

  // Minimum length of English word to check
  private readonly minWordLength = 2;

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

    return ranges;
  }

  /**
   * 位置がコード範囲内かどうかを判定
   */
  private isInCodeRange(pos: number, codeRanges: Array<{ start: number; end: number }>): boolean {
    return codeRanges.some(range => pos >= range.start && pos < range.end);
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
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const wordVariants = this.findWordVariants(context.documentText);
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const [normalizedWord, variants] of wordVariants) {
      if (variants.size > 1) {
        const variantList = Array.from(variants.keys());

        let firstIndex: number | null = null;
        let firstVariant = normalizedWord;
        for (const [variant, indexes] of variants) {
          for (const index of indexes) {
            if (firstIndex === null || index < firstIndex) {
              firstIndex = index;
              firstVariant = variant;
            }
          }
        }

        const startOffset = firstIndex ?? 0;
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
   * Find all variants of English words in text
   * コードブロック、拡張子、ハイフン識別子内は除外
   */
  private findWordVariants(text: string): Map<string, Map<string, number[]>> {
    const wordVariants = new Map<string, Map<string, number[]>>();

    // コード範囲を事前に取得
    const codeRanges = this.getCodeRanges(text);

    // Match English words (2+ characters)
    const wordRegex = /[a-zA-Z]{2,}/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const index = match.index;

      // 除外条件をチェック
      if (this.isInCliCommand(text, index)) {
        continue;
      }
      if (this.isInCodeRange(index, codeRanges)) {
        continue;
      }
      if (this.isFileExtension(text, index)) {
        continue;
      }
      if (this.isInHyphenatedIdentifier(text, index, word.length)) {
        continue;
      }

      const normalizedWord = word.toLowerCase();

      if (!wordVariants.has(normalizedWord)) {
        wordVariants.set(normalizedWord, new Map());
      }

      const variants = wordVariants.get(normalizedWord)!;
      if (!variants.has(word)) {
        variants.set(word, []);
      }
      variants.get(word)!.push(index);
    }

    return wordVariants;
  }

  private isInCliCommand(text: string, offset: number): boolean {
    if (offset < 0 || offset >= text.length) {
      return false;
    }

    const lineStart = Math.max(text.lastIndexOf('\n', offset - 1), text.lastIndexOf('\r', offset - 1)) + 1;
    let lineEnd = text.indexOf('\n', offset);
    const crEnd = text.indexOf('\r', offset);
    if (lineEnd === -1 || (crEnd !== -1 && crEnd < lineEnd)) {
      lineEnd = crEnd;
    }
    if (lineEnd === -1) {
      lineEnd = text.length;
    }

    const line = text.slice(lineStart, lineEnd);
    const localOffset = offset - lineStart;

    for (const segment of this.findCliCommandSegments(line)) {
      if (localOffset >= segment.start && localOffset < segment.end) {
        return true;
      }
    }
    return false;
  }

  private findCliCommandSegments(line: string): Array<{ start: number; end: number }> {
    const segments: Array<{ start: number; end: number }> = [];

    // Find known command heads and consume subsequent "command-ish" tokens until a non-command character.
    const headRegex = /\b[a-zA-Z][a-zA-Z0-9]{0,15}\b/g;
    let match: RegExpExecArray | null;
    while ((match = headRegex.exec(line)) !== null) {
      const head = match[0];
      const normalizedHead = head.toLowerCase();
      if (!this.cliCommandHeads.has(normalizedHead)) {
        continue;
      }

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

      const isAllowedTokenChar = (ch: string) => /[A-Za-z0-9@._/:-]/.test(ch) || ch === '-' || ch === '+';
      const isAllowedInSegment = (ch: string) => isAllowedTokenChar(ch) || /[ \t]/.test(ch);

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

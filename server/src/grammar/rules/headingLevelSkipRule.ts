/**
 * Heading Level Skip Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 12 - Detect heading level skips in Markdown
 *
 * Detects when heading levels are skipped (e.g., h1 directly to h3)
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { splitMarkdownPipeTableRowCells, stripMarkdownBlockquotePrefix } from '../../../../shared/src/markdownSyntax';

/**
 * Heading Level Skip Detection Rule
 * 見出しレベルの飛びを検出する
 */
export class HeadingLevelSkipRule implements AdvancedGrammarRule {
  name = 'heading-level-skip';
  description = '見出しレベルの飛び（h1の次にh3など）を検出します';

  private countBlockquoteDepth(prefix: string): number {
    return (prefix.match(/>/g) || []).length;
  }

  private extractHeadingsFromTableLine(
    strippedLine: string,
    strippedLength: number
  ): Array<{ level: number; character: number }> {
    const headings: Array<{ level: number; character: number }> = [];

    const leadingWhitespace = strippedLine.length - strippedLine.trimStart().length;
    const tableLine = strippedLine.slice(leadingWhitespace);
    if (!tableLine.startsWith('|')) {
      return headings;
    }

    const cells = splitMarkdownPipeTableRowCells(tableLine);
    for (const cell of cells) {
      const raw = cell.raw;
      if (!raw.includes('#')) {
        continue;
      }

      const re = /(^|\s)(#{1,6})\s+/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(raw)) !== null) {
        const hashStartInCell = match.index + match[1].length;
        headings.push({
          level: match[2].length,
          character: strippedLength + leadingWhitespace + cell.start + hashStartInCell
        });
      }
    }

    return headings;
  }

  /**
   * Check for heading level skips
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const lines = context.documentText.split('\n');

    // Track if we're inside a code block
    let inCodeBlock = false;
    let codeBlockFenceChar = '';
    let codeBlockFenceLength = 0;
    let codeBlockBlockquoteDepth = 0;
    let previousLevel = 0;
    let previousLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Toggle code block state (supports indentation / blockquote / ~~~)
      if (!inCodeBlock) {
        const startMatch = line.match(/^(\s*(?:>\s*)*)(`{3,}|~{3,})(.*)$/);
        if (startMatch) {
          const prefix = startMatch[1];
          const fence = startMatch[2];
          inCodeBlock = true;
          codeBlockFenceChar = fence.charAt(0);
          codeBlockFenceLength = fence.length;
          codeBlockBlockquoteDepth = this.countBlockquoteDepth(prefix);
          continue;
        }
      } else {
        const endPattern =
          codeBlockBlockquoteDepth > 0
            ? new RegExp(`^\\s*(?:>\\s*){${codeBlockBlockquoteDepth}}\\s*${codeBlockFenceChar}{${codeBlockFenceLength},}\\s*$`)
            : new RegExp(`^\\s*${codeBlockFenceChar}{${codeBlockFenceLength},}\\s*$`);
        if (endPattern.test(line)) {
          inCodeBlock = false;
          codeBlockFenceChar = '';
          codeBlockFenceLength = 0;
          codeBlockBlockquoteDepth = 0;
          continue;
        }
      }

      // Skip if inside code block
      if (inCodeBlock) {
        continue;
      }

      // 見出し（ATX #）を抽出:
      // - 通常の見出し行（行頭）
      // - Markdownテーブルセル内の「圧縮例文」（例: `# タイトル ### サブセクション`）
      const occurrences: Array<{ level: number; character: number }> = [];

      const stripped = stripMarkdownBlockquotePrefix(line);
      const strippedLine = stripped.strippedLine;
      const strippedLength = stripped.strippedLength;

      const startMatch = strippedLine.match(/^\s{0,3}(#{1,6})\s+/);
      if (startMatch) {
        const hashStart = startMatch[0].indexOf('#');
        occurrences.push({
          level: startMatch[1].length,
          character: strippedLength + hashStart
        });
      }

      if (strippedLine.includes('|') && strippedLine.includes('#')) {
        occurrences.push(...this.extractHeadingsFromTableLine(strippedLine, strippedLength));
      }

      occurrences.sort((a, b) => a.character - b.character);

      for (const occ of occurrences) {
        const currentLevel = occ.level;

        // Check for skip (only when going deeper)
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: i, character: occ.character },
              end: { line: i, character: Math.min(occ.character + currentLevel, line.length) }
            },
            message: `見出しレベルが飛んでいます。h${previousLevel}の次にh${currentLevel}が使用されています。h${previousLevel + 1}を使用してください。`,
            code: 'heading-level-skip',
            ruleName: this.name,
            suggestions: [`h${previousLevel + 1}（${'#'.repeat(previousLevel + 1)} ）を使用してください`]
          }));
        }

        previousLevel = currentLevel;
        previousLineIndex = i;
      }
    }

    return diagnostics;
  }

  /**
   * Check if this rule is enabled
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableHeadingLevelSkip;
  }

  // getLineRange は未使用（セル内検出でより局所的なレンジを返すため）
}

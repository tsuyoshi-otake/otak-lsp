/**
 * Heading Level Skip Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 12 - Detect heading level skips in Markdown
 *
 * Detects when heading levels are skipped (e.g., h1 directly to h3)
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

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

      // Check for heading (ATX style only: #, ##, ###, etc.)
      const strippedLine = line.replace(/^\s*(?:>\s*)*/, '');
      const match = strippedLine.match(/^(#{1,6})\s+/);
      if (match) {
        const currentLevel = match[1].length;

        // Check for skip (only when going deeper)
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          const range = this.getLineRange(context.documentText, i);
          diagnostics.push(new AdvancedDiagnostic({
            range,
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

  /**
   * Get range for a specific line
   */
  private getLineRange(text: string, lineIndex: number): Range {
    const lines = text.split('\n');
    let start = 0;

    for (let i = 0; i < lineIndex; i++) {
      start += lines[i].length + 1; // +1 for newline
    }

    return {
      start: { line: lineIndex, character: 0 },
      end: { line: lineIndex, character: lines[lineIndex].length }
    };
  }
}

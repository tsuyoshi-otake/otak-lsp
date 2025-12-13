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

  /**
   * Check for heading level skips
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const lines = context.documentText.split('\n');

    // Track if we're inside a code block
    let inCodeBlock = false;
    let previousLevel = 0;
    let previousLineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Toggle code block state
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip if inside code block
      if (inCodeBlock) {
        continue;
      }

      // Check for heading (ATX style only: #, ##, ###, etc.)
      const match = line.match(/^(#{1,6})\s+/);
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

/**
 * Code Block Language Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 14 - Detect code blocks without language specification
 *
 * Detects fenced code blocks that don't specify a language
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * Code Block Language Detection Rule
 * コードブロックの言語指定欠落を検出する
 */
export class CodeBlockLanguageRule implements AdvancedGrammarRule {
  name = 'code-block-language';
  description = 'コードブロックの言語指定欠落を検出します';

  /**
   * Check for code blocks without language specification
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const lines = context.documentText.split('\n');

    let inCodeBlock = false;
    let codeBlockFence = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check for fenced code block start (``` or ~~~)
      const startMatch = line.match(/^(`{3,}|~{3,})(.*)$/);
      if (startMatch && !inCodeBlock) {
        const fence = startMatch[1];
        const langSpec = startMatch[2].trim();

        inCodeBlock = true;
        codeBlockFence = fence.charAt(0); // Store the fence character (` or ~)

        // Check if language specification is missing
        if (langSpec === '') {
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: i, character: 0 },
              end: { line: i, character: line.length }
            },
            message: 'コードブロックに言語指定がありません。シンタックスハイライトのために言語を指定してください。',
            code: 'code-block-language',
            ruleName: this.name,
            suggestions: [
              '```javascript、```python、```bash などの言語指定を追加してください',
              'プレーンテキストの場合は ```text を使用できます'
            ]
          }));
        }
      } else if (inCodeBlock) {
        // Check for code block end (same fence type)
        const endMatch = line.match(new RegExp(`^${codeBlockFence}{3,}\\s*$`));
        if (endMatch) {
          inCodeBlock = false;
          codeBlockFence = '';
        }
      }
    }

    return diagnostics;
  }

  /**
   * Check if this rule is enabled
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableCodeBlockLanguage;
  }
}

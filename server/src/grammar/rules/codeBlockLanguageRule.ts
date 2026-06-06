/**
 * Code Block Language Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 14 - Detect code blocks without language specification
 *
 * Detects fenced code blocks that don't specify a language
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { isBlank, splitLines } from '../../utils/stringUtils';

/**
 * Code Block Language Detection Rule
 * コードブロックの言語指定欠落を検出する
 */
export class CodeBlockLanguageRule implements AdvancedGrammarRule {
  name = 'code-block-language';
  description = 'コードブロックの言語指定欠落を検出します';

  private countBlockquoteDepth(prefix: string): number {
    return (prefix.match(/>/g) ?? []).length;
  }

  private findInlineFencedCodeSnippets(line: string): Array<{ start: number; end: number }> {
    // ` ``` code ``` ` のような「単一行フェンス」は、EVALS 表などで複数行コードブロックを圧縮して載せる際に使われる。
    // - opening fence 直後に空白がある（= 言語指定が無い可能性が高い）パターンのみ対象
    // - 同一行内に closing fence があるもののみ対象
    const results: Array<{ start: number; end: number }> = [];
    const re = /(^|[\s|])([`~]{3,})\s+([^\r\n]*?)\2/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(line)) !== null) {
      const leading = match[1] ?? '';
      const fence = match[2] ?? '';
      if (!fence) {
        continue;
      }
      const start = match.index + leading.length;
      const end = start + fence.length;
      results.push({ start, end });
    }
    return results;
  }

  /**
   * Check for code blocks without language specification
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    // 共有コンテキストの lines を再利用して splitLines の重複を避ける
    const lines = context.shared?.lines ?? splitLines(context.documentText);

    let inCodeBlock = false;
    let codeBlockFenceChar = '';
    let codeBlockFenceLength = 0;
    let codeBlockBlockquoteDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // 単一行フェンス（例: ` ``` const x = 1; ``` `）を先に検出する
      // NOTE: 本文のコードブロック検出（複数行）とは独立に扱う
      if (!inCodeBlock && (line.includes('```') || line.includes('~~~'))) {
        const inlineSnippets = this.findInlineFencedCodeSnippets(line);
        for (const snippet of inlineSnippets) {
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: i, character: snippet.start },
              end: { line: i, character: snippet.end }
            },
            message: 'コードブロックに言語指定がありません。シンタックスハイライトのために言語を指定してください。',
            code: 'code-block-language',
            ruleName: this.name,
            suggestions: [
              '```javascript\nconst x = 1;\n``` のように複数行にして言語指定を追加してください',
              'プレーンテキストの場合は ```text を使用できます'
            ]
          }));
        }
      }

      // Check for fenced code block start (``` or ~~~)
      const startMatch = line.match(/^(\s*(?:>\s*)*)(`{3,}|~{3,})(.*)$/);
      if (startMatch && !inCodeBlock) {
        const prefix = startMatch[1];
        const fence = startMatch[2];
        const langSpec = startMatch[3].trim();

        inCodeBlock = true;
        codeBlockFenceChar = fence.charAt(0); // Store the fence character (` or ~)
        codeBlockFenceLength = fence.length;
        codeBlockBlockquoteDepth = this.countBlockquoteDepth(prefix);

        // Check if language specification is missing
        if (isBlank(langSpec)) {
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
        const endPattern =
          codeBlockBlockquoteDepth > 0
            ? new RegExp(`^\\s*(?:>\\s*){${codeBlockBlockquoteDepth}}\\s*${codeBlockFenceChar}{${codeBlockFenceLength},}\\s*$`)
            : new RegExp(`^\\s*${codeBlockFenceChar}{${codeBlockFenceLength},}\\s*$`);
        if (endPattern.test(line)) {
          inCodeBlock = false;
          codeBlockFenceChar = '';
          codeBlockFenceLength = 0;
          codeBlockBlockquoteDepth = 0;
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

/**
 * Bracket Quote Mismatch Rule
 * 括弧引用符不一致検出器
 * Feature: remaining-grammar-rules
 * Task: 21. 括弧引用符不一致検出器の実装
 * 要件: 19.1, 19.2, 19.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 括弧ペアの定義
 */
const BRACKET_PAIRS: Map<string, string> = new Map([
  // 日本語括弧
  ['「', '」'],
  ['『', '』'],
  ['（', '）'],
  ['【', '】'],
  ['〈', '〉'],
  ['《', '》'],
  ['〔', '〕'],
  ['｛', '｝'],
  ['［', '］'],
  // ASCII括弧
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['<', '>'],
  // 引用符
  ['"', '"'],
  ["'", "'"],
]);

/**
 * 閉じ括弧から開き括弧を取得するマップ
 */
const CLOSING_TO_OPENING: Map<string, string> = new Map();
for (const [open, close] of BRACKET_PAIRS) {
  CLOSING_TO_OPENING.set(close, open);
}

/**
 * 括弧引用符不一致検出器
 */
export class BracketQuoteMismatchRule implements AdvancedGrammarRule {
  name = 'bracket-quote-mismatch';
  description = '括弧・引用符の不一致を検出し、正しい対応を提案します';

  /**
   * 括弧の対応を検証
   */
  validateBrackets(text: string): Array<{
    type: 'unclosed' | 'unopened';
    bracket: string;
    index: number;
    expectedBracket: string;
  }> {
    const issues: Array<{
      type: 'unclosed' | 'unopened';
      bracket: string;
      index: number;
      expectedBracket: string;
    }> = [];

    // スタック：開き括弧の情報
    const stack: Array<{ bracket: string; index: number }> = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      // 開き括弧の処理
      if (BRACKET_PAIRS.has(char)) {
        stack.push({ bracket: char, index: i });
        continue;
      }

      // 閉じ括弧の処理
      if (CLOSING_TO_OPENING.has(char)) {
        const expectedOpen = CLOSING_TO_OPENING.get(char)!;

        if (stack.length === 0) {
          // スタックが空なのに閉じ括弧が出現
          issues.push({
            type: 'unopened',
            bracket: char,
            index: i,
            expectedBracket: expectedOpen
          });
          continue;
        }

        const lastOpen = stack[stack.length - 1];

        // 対応する開き括弧かチェック
        if (lastOpen.bracket === expectedOpen) {
          // 正しいペア
          stack.pop();
        } else {
          // 不正なペア
          // 最も近い対応する開き括弧を探す
          let foundMatch = false;
          for (let j = stack.length - 1; j >= 0; j--) {
            if (stack[j].bracket === expectedOpen) {
              // 対応する開き括弧を見つけた
              // 間にある開き括弧は未閉じとしてマーク
              for (let k = stack.length - 1; k > j; k--) {
                const unclosed = stack.pop()!;
                issues.push({
                  type: 'unclosed',
                  bracket: unclosed.bracket,
                  index: unclosed.index,
                  expectedBracket: BRACKET_PAIRS.get(unclosed.bracket)!
                });
              }
              stack.pop(); // 対応する開き括弧を削除
              foundMatch = true;
              break;
            }
          }

          if (!foundMatch) {
            // 対応する開き括弧がない
            issues.push({
              type: 'unopened',
              bracket: char,
              index: i,
              expectedBracket: expectedOpen
            });
          }
        }
      }
    }

    // スタックに残っている開き括弧は未閉じ
    while (stack.length > 0) {
      const unclosed = stack.pop()!;
      issues.push({
        type: 'unclosed',
        bracket: unclosed.bracket,
        index: unclosed.index,
        expectedBracket: BRACKET_PAIRS.get(unclosed.bracket)!
      });
    }

    return issues;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const issues = this.validateBrackets(context.documentText);

    for (const issue of issues) {
      let message: string;
      let suggestion: string;

      if (issue.type === 'unclosed') {
        message = `開き括弧「${issue.bracket}」に対応する閉じ括弧「${issue.expectedBracket}」がありません。`;
        suggestion = `対応する「${issue.expectedBracket}」を追加する`;
      } else {
        message = `閉じ括弧「${issue.bracket}」に対応する開き括弧「${issue.expectedBracket}」がありません。`;
        suggestion = `対応する「${issue.expectedBracket}」を追加するか、不要な「${issue.bracket}」を削除する`;
      }

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: issue.index },
          end: { line: 0, character: issue.index + 1 }
        },
        message,
        code: 'bracket-quote-mismatch',
        ruleName: this.name,
        suggestions: [suggestion]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableCommaCount; // 句読点関連として同じ設定を使用
  }
}

/**
 * Weak Expression Rule
 * 弱い日本語表現を検出する
 * Feature: advanced-grammar-rules
 * 要件: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  WeakExpressionLevel
} from '../../../../shared/src/advancedTypes';

/**
 * 弱い表現パターンと代替表現
 */
const WEAK_PATTERNS: Array<{
  pattern: RegExp;
  name: string;
  stronger: string;
  level: 'strict' | 'normal' | 'loose';
}> = [
  {
    pattern: /かもしれない/g,
    name: 'かもしれない',
    stronger: '可能性がある',
    level: 'normal'
  },
  {
    pattern: /かもしれません/g,
    name: 'かもしれません',
    stronger: '可能性があります',
    level: 'normal'
  },
  {
    pattern: /と思われる/g,
    name: 'と思われる',
    stronger: 'と考えられる',
    level: 'normal'
  },
  {
    pattern: /と思われます/g,
    name: 'と思われます',
    stronger: 'と考えられます',
    level: 'normal'
  },
  {
    pattern: /ような気がする/g,
    name: 'ような気がする',
    stronger: 'と推測される',
    level: 'normal'
  },
  {
    pattern: /ような気がします/g,
    name: 'ような気がします',
    stronger: 'と推測されます',
    level: 'normal'
  },
  {
    pattern: /気がする/g,
    name: '気がする',
    stronger: 'と感じる',
    level: 'strict'
  },
  {
    pattern: /と思う(?!われ)/g,
    name: 'と思う',
    stronger: 'と考える',
    level: 'strict'
  },
  {
    pattern: /と思います(?!が)/g,
    name: 'と思います',
    stronger: 'と考えます',
    level: 'strict'
  },
  {
    pattern: /多分/g,
    name: '多分',
    stronger: 'おそらく',
    level: 'loose'
  },
  {
    pattern: /たぶん/g,
    name: 'たぶん',
    stronger: 'おそらく',
    level: 'loose'
  },
  {
    pattern: /なんとなく/g,
    name: 'なんとなく',
    stronger: '具体的な理由を述べる',
    level: 'strict'
  },
  {
    pattern: /一応/g,
    name: '一応',
    stronger: '念のため',
    level: 'loose'
  }
];

/**
 * 弱い表現検出ルール
 */
export class WeakExpressionRule implements AdvancedGrammarRule {
  name = 'weak-expression';
  description = '弱い日本語表現を検出します';

  /**
   * 検出レベルに基づいてパターンをフィルタリング
   */
  getActivePatterns(level: WeakExpressionLevel): typeof WEAK_PATTERNS {
    switch (level) {
      case 'strict':
        return WEAK_PATTERNS;
      case 'normal':
        return WEAK_PATTERNS.filter(p => p.level !== 'strict');
      case 'loose':
        return WEAK_PATTERNS.filter(p => p.level === 'loose');
      default:
        return WEAK_PATTERNS.filter(p => p.level !== 'strict');
    }
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;
    const level = context.config.weakExpressionLevel;
    const patterns = this.getActivePatterns(level);

    for (const { pattern, name, stronger } of patterns) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(text)) !== null) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: match.index },
            end: { line: 0, character: match.index + match[0].length }
          },
          message: `弱い表現「${name}」が使用されています。より断定的な表現を検討してください。`,
          code: 'weak-expression',
          ruleName: this.name,
          suggestions: [`「${stronger}」に変更する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableWeakExpression;
  }
}

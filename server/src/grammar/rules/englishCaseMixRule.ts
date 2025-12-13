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

  /**
   * Override check to provide more specific diagnostics per word
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const wordVariants = this.findWordVariants(context.documentText);
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const [normalizedWord, variants] of wordVariants) {
      if (variants.size > 1) {
        const variantList = Array.from(variants.keys());
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: context.documentText.length }
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
   */
  private findWordVariants(text: string): Map<string, Map<string, number[]>> {
    const wordVariants = new Map<string, Map<string, number[]>>();

    // Match English words (2+ characters)
    const wordRegex = /[a-zA-Z]{2,}/g;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
      const word = match[0];
      const normalizedWord = word.toLowerCase();

      if (!wordVariants.has(normalizedWord)) {
        wordVariants.set(normalizedWord, new Map());
      }

      const variants = wordVariants.get(normalizedWord)!;
      if (!variants.has(word)) {
        variants.set(word, []);
      }
      variants.get(word)!.push(match.index);
    }

    return wordVariants;
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

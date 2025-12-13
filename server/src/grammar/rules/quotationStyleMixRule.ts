/**
 * Quotation Style Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 4 - Detect mixing of quotation mark styles
 *
 * Detects mixing of:
 * - Japanese: 「」『』
 * - Double quotes: ""
 * - Single quotes: ''
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Quotation Style Mix Detection Rule
 * 引用符スタイルの混在を検出する
 */
export class QuotationStyleMixRule extends MixDetectionRule {
  name = 'quotation-style-mix';
  description = '引用符スタイルの混在（「」と""と\'\'）を検出します';

  /**
   * Collect quotation patterns from text
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    // Japanese quotes: 「」『』
    const japaneseQuotes = this.findAllPositions(text, /[「」『』]/g);
    if (japaneseQuotes.length > 0) {
      patterns.set('japanese', {
        count: japaneseQuotes.length,
        positions: japaneseQuotes
      });
    }

    // Double quotes: "" (curly) or "" (straight full-width)
    const doubleQuotes = this.findAllPositions(text, /[""「」]/g);
    // Filter out Japanese quotes already counted
    const pureDoubleQuotes = this.findAllPositions(text, /[""]|["]/g);
    if (pureDoubleQuotes.length > 0) {
      patterns.set('double', {
        count: pureDoubleQuotes.length,
        positions: pureDoubleQuotes
      });
    }

    // Single quotes: '' (curly) or '' (straight)
    const singleQuotes = this.findAllPositions(text, /['']/g);
    if (singleQuotes.length > 0) {
      patterns.set('single', {
        count: singleQuotes.length,
        positions: singleQuotes
      });
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const styleNames: string[] = [];
    if (patterns.has('japanese')) {
      styleNames.push(`「」（${patterns.get('japanese')!.count}箇所）`);
    }
    if (patterns.has('double')) {
      styleNames.push(`""（${patterns.get('double')!.count}箇所）`);
    }
    if (patterns.has('single')) {
      styleNames.push(`''（${patterns.get('single')!.count}箇所）`);
    }

    return `引用符のスタイルが混在しています。${styleNames.join('と')}が使用されています。どれかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    return [
      '日本語文書では「」を使用してください',
      'ネスト時は『』を使用できます'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'quotation-style-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableQuotationStyleMix';
  }

  /**
   * Find all positions of a pattern in text
   */
  private findAllPositions(text: string, regex: RegExp): number[] {
    const positions: number[] = [];
    let match;
    const globalRegex = new RegExp(regex.source, 'g');
    while ((match = globalRegex.exec(text)) !== null) {
      positions.push(match.index);
    }
    return positions;
  }
}

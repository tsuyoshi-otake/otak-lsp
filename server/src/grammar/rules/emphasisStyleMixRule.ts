/**
 * Emphasis Style Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 6 - Detect mixing of emphasis marker styles
 *
 * Detects mixing of:
 * - Asterisk bold: **text**
 * - Underscore bold: __text__
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Emphasis Style Mix Detection Rule
 * 強調記号スタイルの混在を検出する
 */
export class EmphasisStyleMixRule extends MixDetectionRule {
  name = 'emphasis-style-mix';
  description = '強調記号スタイルの混在（**と__）を検出します';

  /**
   * Collect emphasis patterns from text
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    // Asterisk bold: **text**
    const asteriskBold = this.findAllPositions(text, /\*\*[^*]+\*\*/g);
    if (asteriskBold.length > 0) {
      patterns.set('asterisk', {
        count: asteriskBold.length,
        positions: asteriskBold
      });
    }

    // Underscore bold: __text__
    const underscoreBold = this.findAllPositions(text, /__[^_]+__/g);
    if (underscoreBold.length > 0) {
      patterns.set('underscore', {
        count: underscoreBold.length,
        positions: underscoreBold
      });
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const styleNames: string[] = [];
    if (patterns.has('asterisk')) {
      styleNames.push(`**（${patterns.get('asterisk')!.count}箇所）`);
    }
    if (patterns.has('underscore')) {
      styleNames.push(`__（${patterns.get('underscore')!.count}箇所）`);
    }

    return `強調記号のスタイルが混在しています。${styleNames.join('と')}が使用されています。どちらかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    return [
      '一般的には **太字** を使用してください',
      '__太字__ でも同じ意味ですが、統一することが重要です'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'emphasis-style-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableEmphasisStyleMix';
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

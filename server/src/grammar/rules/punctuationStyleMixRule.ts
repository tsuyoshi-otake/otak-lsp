/**
 * Punctuation Style Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 3 - Detect mixing of Japanese and Western punctuation
 *
 * Detects mixing of:
 * - Japanese: 、。
 * - Western: ，．
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Punctuation Style Mix Detection Rule
 * 句読点スタイルの混在を検出する
 */
export class PunctuationStyleMixRule extends MixDetectionRule {
  name = 'punctuation-style-mix';
  description = '句読点スタイルの混在（、。と，．）を検出します';

  /**
   * Collect punctuation patterns from text
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    // Japanese punctuation: 、。
    const japaneseCommas = this.findAllPositions(text, /、/g);
    const japanesePeriods = this.findAllPositions(text, /。/g);
    const japanesePositions = [...japaneseCommas, ...japanesePeriods].sort((a, b) => a - b);

    if (japanesePositions.length > 0) {
      patterns.set('japanese', {
        count: japanesePositions.length,
        positions: japanesePositions
      });
    }

    // Western punctuation: ，．(full-width)
    const westernCommas = this.findAllPositions(text, /，/g);
    const westernPeriods = this.findAllPositions(text, /．/g);
    const westernPositions = [...westernCommas, ...westernPeriods].sort((a, b) => a - b);

    if (westernPositions.length > 0) {
      patterns.set('western', {
        count: westernPositions.length,
        positions: westernPositions
      });
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const japaneseCount = patterns.get('japanese')?.count || 0;
    const westernCount = patterns.get('western')?.count || 0;

    return `句読点のスタイルが混在しています。日本語スタイル（、。）が${japaneseCount}箇所、欧文スタイル（，．）が${westernCount}箇所あります。どちらかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    return [
      '日本語文書では「、。」を使用してください',
      '学術論文などでは「，．」で統一することもあります'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'punctuation-style-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enablePunctuationStyleMix';
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

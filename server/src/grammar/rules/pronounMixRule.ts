/**
 * Pronoun Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 10 - Detect mixing of first-person pronouns
 *
 * Detects mixing of:
 * - 私 (watashi)
 * - 僕 (boku)
 * - 自分 (jibun)
 * - 当方 (touhou)
 * - 俺 (ore)
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Pronoun Mix Detection Rule
 * 人称代名詞の混在を検出する
 */
export class PronounMixRule extends MixDetectionRule {
  name = 'pronoun-mix';
  description = '人称代名詞の混在（私/僕/自分/当方）を検出します';

  private readonly pronouns = [
    { name: '私', pattern: /私[はがも]/g },
    { name: '僕', pattern: /僕[はがも]/g },
    { name: '自分', pattern: /自分[はがも]/g },
    { name: '当方', pattern: /当方[はがも]/g },
    { name: '俺', pattern: /俺[はがも]/g }
  ];

  /**
   * Collect pronoun patterns from text
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    for (const pronoun of this.pronouns) {
      const positions = this.findAllPositions(text, pronoun.pattern);
      if (positions.length > 0) {
        patterns.set(pronoun.name, {
          count: positions.length,
          positions
        });
      }
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const pronounList = Array.from(patterns.entries())
      .map(([name, info]) => `${name}（${info.count}箇所）`)
      .join('と');

    return `人称代名詞が混在しています。${pronounList}が使用されています。どれかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    return [
      '公式文書では「私」を使用してください',
      'ビジネス文書では「当方」も使用できます'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'pronoun-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enablePronounMix';
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

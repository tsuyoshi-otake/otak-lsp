/**
 * Bullet Style Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 5 - Detect mixing of bullet point styles
 *
 * Detects mixing of:
 * - Nakaguro: ・
 * - Hyphen: -
 * - Asterisk: *
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedRulesConfig,
  RuleContext,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';

/**
 * Bullet Style Mix Detection Rule
 * 箇条書き記号の混在を検出する
 */
export class BulletStyleMixRule extends MixDetectionRule {
  name = 'bullet-style-mix';
  description = '箇条書き記号の混在（・と-と*）を検出します';

  /**
   * Collect bullet patterns from text
   * Only counts bullets at the beginning of lines
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();
    const lines = text.split('\n');

    const nakaguroPositions: number[] = [];
    const hyphenPositions: number[] = [];
    const asteriskPositions: number[] = [];

    let offset = 0;
    for (const line of lines) {
      const trimmed = line.trimStart();
      const leadingSpaces = line.length - trimmed.length;

      // Check for bullet at line start (after optional whitespace)
      if (trimmed.startsWith('・')) {
        nakaguroPositions.push(offset + leadingSpaces);
      } else if (trimmed.startsWith('- ') || trimmed === '-') {
        hyphenPositions.push(offset + leadingSpaces);
      } else if (trimmed.startsWith('* ') || trimmed === '*') {
        asteriskPositions.push(offset + leadingSpaces);
      }

      offset += line.length + 1; // +1 for newline
    }

    if (nakaguroPositions.length > 0) {
      patterns.set('nakaguro', {
        count: nakaguroPositions.length,
        positions: nakaguroPositions
      });
    }

    if (hyphenPositions.length > 0) {
      patterns.set('hyphen', {
        count: hyphenPositions.length,
        positions: hyphenPositions
      });
    }

    if (asteriskPositions.length > 0) {
      patterns.set('asterisk', {
        count: asteriskPositions.length,
        positions: asteriskPositions
      });
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const styleNames: string[] = [];
    if (patterns.has('nakaguro')) {
      styleNames.push(`・（${patterns.get('nakaguro')!.count}箇所）`);
    }
    if (patterns.has('hyphen')) {
      styleNames.push(`-（${patterns.get('hyphen')!.count}箇所）`);
    }
    if (patterns.has('asterisk')) {
      styleNames.push(`*（${patterns.get('asterisk')!.count}箇所）`);
    }

    return `箇条書き記号が混在しています。${styleNames.join('と')}が使用されています。どれかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    return [
      '日本語文書では「・」を使用してください',
      'Markdown文書では「-」または「*」で統一してください'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'bullet-style-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableBulletStyleMix';
  }
}

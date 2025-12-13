/**
 * Unit Notation Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 9 - Detect mixing of unit notation styles
 *
 * Detects mixing of:
 * - Symbol notation: km, kg, cm, etc.
 * - Katakana notation: キロメートル, キログラム, センチメートル, etc.
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
 * Unit category with symbol and katakana forms
 */
interface UnitCategory {
  name: string;
  symbolPattern: RegExp;
  katakanaPattern: RegExp;
}

/**
 * Unit Notation Mix Detection Rule
 * 単位表記の混在を検出する
 */
export class UnitNotationMixRule extends MixDetectionRule {
  name = 'unit-notation-mix';
  description = '単位表記の混在（記号とカタカナ）を検出します';

  private readonly unitCategories: UnitCategory[] = [
    {
      name: 'distance',
      symbolPattern: /\d+\s*(km|m|cm|mm)/gi,
      katakanaPattern: /キロメートル|メートル|センチメートル|ミリメートル/g
    },
    {
      name: 'weight',
      symbolPattern: /\d+\s*(kg|g|mg)/gi,
      katakanaPattern: /キログラム|グラム|ミリグラム/g
    },
    {
      name: 'time',
      symbolPattern: /\d+\s*(h|min|sec|s)(?![a-zA-Z])/gi,
      katakanaPattern: /時間|分|秒/g
    },
    {
      name: 'speed',
      symbolPattern: /\d+\s*km\/h/gi,
      katakanaPattern: /キロメートル毎時/g
    }
  ];

  /**
   * Override check to provide category-specific diagnostics
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const category of this.unitCategories) {
      const symbolMatches = context.documentText.match(category.symbolPattern);
      const katakanaMatches = context.documentText.match(category.katakanaPattern);

      if (symbolMatches && symbolMatches.length > 0 && katakanaMatches && katakanaMatches.length > 0) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: context.documentText.length }
          },
          message: `単位表記が混在しています。記号表記（${symbolMatches.join('、')}）とカタカナ表記（${katakanaMatches.join('、')}）が使用されています。`,
          code: 'unit-notation-mix',
          ruleName: this.name,
          suggestions: ['記号表記（km、kg）またはカタカナ表記（キロメートル、キログラム）のどちらかに統一してください']
        }));
        break; // One diagnostic per document is enough
      }
    }

    return diagnostics;
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
    return 'unit-notation-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableUnitNotationMix';
  }
}

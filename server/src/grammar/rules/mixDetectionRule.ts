/**
 * Mix Detection Rule Base Class
 * Feature: evals-ng-pattern-expansion
 * Task: 2 - Base class for mix detection rules
 *
 * Provides common functionality for detecting style/notation mixing in documents
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  AdvancedGrammarErrorType,
  DEFAULT_ADVANCED_RULES_CONFIG
} from '../../../../shared/src/advancedTypes';

/**
 * Pattern information collected from document
 */
export interface PatternInfo {
  /** Number of occurrences */
  count: number;
  /** Positions in the text */
  positions: number[];
}

/**
 * Abstract base class for mix detection rules
 * Implements common pattern for detecting style/notation mixing
 */
export abstract class MixDetectionRule implements AdvancedGrammarRule {
  abstract name: string;
  abstract description: string;

  /**
   * Collect patterns from the document text
   * @param text Document text to analyze
   * @returns Map of pattern names to their information
   */
  protected abstract collectPatterns(text: string): Map<string, PatternInfo>;

  /**
   * Create diagnostic message for detected mix
   * @param patterns Detected patterns
   * @returns Diagnostic message
   */
  protected abstract createDiagnosticMessage(patterns: Map<string, PatternInfo>): string;

  /**
   * Get the rule code for diagnostics
   * @returns Rule code string
   */
  protected abstract getRuleCode(): AdvancedGrammarErrorType;

  /**
   * Get the config key for enabling/disabling this rule
   * @returns Key of AdvancedRulesConfig
   */
  protected abstract getConfigKey(): keyof AdvancedRulesConfig;

  /**
   * Detect if patterns are mixed (more than one pattern type exists)
   * @param patterns Map of collected patterns
   * @returns true if patterns are mixed
   */
  protected detectMix(patterns: Map<string, PatternInfo>): boolean {
    return patterns.size > 1;
  }

  /**
   * Get all positions from patterns for diagnostic range
   * @param patterns Map of collected patterns
   * @returns All positions sorted
   */
  protected getAllPositions(patterns: Map<string, PatternInfo>): number[] {
    const allPositions: number[] = [];
    for (const info of patterns.values()) {
      allPositions.push(...info.positions);
    }
    return allPositions.sort((a, b) => a - b);
  }

  /**
   * Create range for diagnostic
   * @param text Document text
   * @param patterns Detected patterns
   * @returns Range covering the document
   */
  protected createRange(text: string, patterns: Map<string, PatternInfo>): Range {
    // Return range covering entire document by default
    // Subclasses can override for more specific ranges
    return {
      start: { line: 0, character: 0 },
      end: { line: 0, character: text.length }
    };
  }

  /**
   * Check for pattern mixing in document
   * @param tokens Tokenized text (may not be used by all rules)
   * @param context Rule context with document text
   * @returns Array of diagnostics
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const patterns = this.collectPatterns(context.documentText);

    if (!this.detectMix(patterns)) {
      return [];
    }

    const range = this.createRange(context.documentText, patterns);

    return [
      new AdvancedDiagnostic({
        range,
        message: this.createDiagnosticMessage(patterns),
        code: this.getRuleCode(),
        ruleName: this.name,
        suggestions: this.getSuggestions(patterns)
      })
    ];
  }

  /**
   * Get suggestions for fixing the mix
   * @param patterns Detected patterns
   * @returns Array of suggestion strings
   */
  protected getSuggestions(patterns: Map<string, PatternInfo>): string[] {
    const patternNames = Array.from(patterns.keys());
    return [`Use only one style consistently: ${patternNames.join(' or ')}`];
  }

  /**
   * Check if this rule is enabled in config
   * @param config Rules configuration
   * @returns true if enabled
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    const key = this.getConfigKey();
    return config[key] as boolean;
  }
}

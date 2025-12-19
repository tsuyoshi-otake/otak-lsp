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
   * @returns Range pointing at the first occurrence
   */
  protected createRange(text: string, patterns: Map<string, PatternInfo>): Range {
    // 既定では最初の出現箇所を指す（ドキュメント全体に波線を引かない）
    // サブクラスでより具体的な範囲に上書き可能
    const positions = this.getAllPositions(patterns);
    const startOffset = positions.length > 0 ? positions[0] : 0;
    const endOffset = Math.min(startOffset + 1, text.length);
    return {
      start: { line: 0, character: startOffset },
      end: { line: 0, character: endOffset }
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

    // カウントに基づいて「支配的（Dominant）」なパターンと「少数派（Minority）」なパターンを判定
    const entries = Array.from(patterns.entries());
    let maxCount = -1;
    for (const [, info] of entries) {
      if (info.count > maxCount) {
        maxCount = info.count;
      }
    }

    const dominantPatterns: string[] = [];
    const minorityPatterns: string[] = [];

    for (const [name, info] of entries) {
      if (info.count === maxCount) {
        dominantPatterns.push(name);
      } else {
        minorityPatterns.push(name);
      }
    }

    const diagnostics: AdvancedDiagnostic[] = [];
    const allPatternsName = entries.map(([name]) => name).join('と');

    // 少数派が存在する場合：少数派の出現箇所すべてに警告を出す
    if (minorityPatterns.length > 0) {
      const suggestion = `「${dominantPatterns.join('」または「')}」に統一してください`;
      
      for (const patternName of minorityPatterns) {
        const info = patterns.get(patternName)!;
        for (const pos of info.positions) {
          const endOffset = Math.min(pos + 1, context.documentText.length); // 簡易的に1文字ハイライト（またはパターン長さに応じて調整可能だが、MixDetectionRuleは汎用なので最小限）
          
          // PatternInfoにlength情報があればそれを使う（サブクラスの実装依存）
          // ここでは簡易的に直近の改行まで、あるいは単語境界までなどが望ましいが、
          // 既存実装の createRange は positions[0] しか使っていなかった。
          // ここでは safe に 1文字とするが、本来はパターン文字列長を知りたい。
          // しかし PatternInfo には length がない。
          // 実装を複雑にしないため、一旦 pos から pos+1 とする。
          
          const range = {
            start: { line: 0, character: pos },
            end: { line: 0, character: endOffset }
          };

          diagnostics.push(new AdvancedDiagnostic({
            range,
            message: `${this.createDiagnosticMessage(patterns)} 文書全体では「${dominantPatterns.join('/')}」が支配的です。`,
            code: this.getRuleCode(),
            ruleName: this.name,
            suggestions: [suggestion]
          }));
        }
      }
    } else {
      // カウントが同点（Tie）の場合：すべてのパターンのすべての出現箇所に警告を出す（どれに統一すべきか不明なため）
      const suggestion = `いずれか一つのスタイルに統一してください`;
      
      for (const [patternName, info] of entries) {
        for (const pos of info.positions) {
          const endOffset = Math.min(pos + 1, context.documentText.length);
          const range = {
            start: { line: 0, character: pos },
            end: { line: 0, character: endOffset }
          };

          diagnostics.push(new AdvancedDiagnostic({
            range,
            message: `${this.createDiagnosticMessage(patterns)} 使用頻度が同じです。`,
            code: this.getRuleCode(),
            ruleName: this.name,
            suggestions: [suggestion]
          }));
        }
      }
    }

    return diagnostics;
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

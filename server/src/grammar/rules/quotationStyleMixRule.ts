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
  AdvancedDiagnostic,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';
import { isNotEmpty } from '../../utils/arrayUtils';

/**
 * Quotation Style Mix Detection Rule
 * 引用符スタイルの混在を検出する
 */
export class QuotationStyleMixRule extends MixDetectionRule {
  name = 'quotation-style-mix';
  description = '引用符スタイルの混在（「」と""と\'\'）を検出します';

  /**
   * コードブロック（```...```）とインラインコード（`...`）の範囲を取得
   */
  private getExcludedRanges(text: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];

    // コードブロック（```...```）
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    // インラインコード（`...`）- 複数行にまたがらないもの
    const inlineCodeRegex = /`[^`\n]+`/g;
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      ranges.push({ start: match.index, end: match.index + match[0].length });
    }

    return ranges;
  }

  /**
   * 位置が除外範囲内かどうかを判定
   */
  private isInExcludedRange(pos: number, excludedRanges: Array<{ start: number; end: number }>): boolean {
    return excludedRanges.some(range => pos >= range.start && pos < range.end);
  }

  /**
   * 除外範囲を考慮した位置検索
   */
  private findAllPositionsExcluding(
    text: string,
    regex: RegExp,
    excludedRanges: Array<{ start: number; end: number }>
  ): number[] {
    const positions: number[] = [];
    let match;
    const globalRegex = new RegExp(regex.source, 'g');
    while ((match = globalRegex.exec(text)) !== null) {
      if (!this.isInExcludedRange(match.index, excludedRanges)) {
        positions.push(match.index);
      }
    }
    return positions;
  }

  // Feature: advanced-rules-shared-preprocessing-cache
  // 現在のコンテキストを一時保持（check -> collectPatterns 間で共有）
  private currentContext: RuleContext | null = null;

  /**
   * Override check to pass context for shared preprocessing
   * Feature: advanced-rules-shared-preprocessing-cache
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    this.currentContext = context;
    try {
      return super.check(tokens, context);
    } finally {
      this.currentContext = null;
    }
  }

  /**
   * Collect quotation patterns from text
   * コードブロック・インラインコード内は除外
   * Feature: advanced-rules-shared-preprocessing-cache
   * - context.shared がある場合は共有コンテキストのコード範囲を使用
   * - context.shared がない場合は従来通り個別に計算（フォールバック）
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();

    // 除外範囲を取得（コードブロック、インラインコード）
    // 共有コンテキストがあれば再利用、なければ個別計算
    const excludedRanges = this.currentContext?.shared?.codeRanges ?? this.getExcludedRanges(text);

    // Japanese quotes: 「」『』
    const japaneseQuotes = this.findAllPositionsExcluding(text, /[「」『』]/g, excludedRanges);
    if (isNotEmpty(japaneseQuotes)) {
      patterns.set('japanese', {
        count: japaneseQuotes.length,
        positions: japaneseQuotes
      });
    }

    // Double quotes: "" (curly) or "" (straight full-width)
    // Filter out Japanese quotes already counted
    const pureDoubleQuotes = this.findAllPositionsExcluding(text, /[""]|["]/g, excludedRanges);
    if (isNotEmpty(pureDoubleQuotes)) {
      patterns.set('double', {
        count: pureDoubleQuotes.length,
        positions: pureDoubleQuotes
      });
    }

    // Single quotes: '' (curly) or '' (straight)
    const singleQuotes = this.findAllPositionsExcluding(text, /['']/g, excludedRanges);
    if (isNotEmpty(singleQuotes)) {
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

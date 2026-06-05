/**
 * Advanced Rules Manager
 * 高度な文法ルールを管理し、実行を制御する
 * Feature: advanced-grammar-rules
 * Feature: advanced-rules-tiered-execution
 */

import { Token, Diagnostic, Position } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  AdvancedDiagnostic,
  RuleProfilingEntry,
  RuleProfilingCollector,
  AdvancedRuleSharedContext
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { SentenceParser } from './sentenceParser';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { logError, formatError } from '../utils/errorHandler';
import {
  buildRuleContextForRule,
  filterOutTableSentences,
  maskTableContent
} from './advancedRuleContext';
import { createDefaultAdvancedRules, LIGHTWEIGHT_RULE_NAMES } from './advancedRuleRegistry';
import { buildSharedContext as createSharedContext } from './sharedContextBuilder';

type RuleExecutionOptions = { analyzeTables?: boolean };

interface PreparedRuleContext {
  readonly baseContext: RuleContext;
  readonly originalText: string;
}

/**
 * Advanced Rules Manager
 * すべての高度な文法ルールを管理・実行する
 */
export class AdvancedRulesManager {
  private rules: AdvancedGrammarRule[];
  private config: AdvancedRulesConfig;
  private lineStarts: number[] = [];
  private firstLineLength: number = 0;
  private logger: Logger | undefined;

  /**
   * テキストから行開始位置を計算
   * (Feature: diagnostic-range-fix)
   */
  private calculateLineStarts(text: string): void {
    this.lineStarts = computeLineStarts(text);
    let firstNewlineIndex = text.indexOf('\n');
    this.firstLineLength = firstNewlineIndex === -1 ? text.length : firstNewlineIndex;
  }

  /**
   * 共有コンテキストを構築する
   * Feature: advanced-rules-shared-preprocessing-cache
   *
   * 複数のルールで共通して使用する前処理結果を1回の解析で計算し、
   * 解析サイクル内で再利用できるようにする。
   *
   * @param text 解析対象のテキスト
   * @returns 共有コンテキスト
   */
  private buildSharedContext(text: string): AdvancedRuleSharedContext {
    return createSharedContext(text);
  }

  /**
   * オフセットから行と文字位置を取得
   * (Feature: diagnostic-range-fix)
   */
  private offsetToPosition(offset: number): Position {
    return offsetToLineAndCharacter(this.lineStarts, offset);
  }

  /**
   * 診断のrangeがオフセットベースかどうかを判定して必要に応じて変換
   * (Feature: diagnostic-range-fix)
   *
   * 判定ロジック:
   * - line: 0 かつ character が最初の行の長さを超えている場合はオフセットベースと判断
   * - それ以外は正しい行/文字ベースと判断してそのまま返す
   *
   * 要件 1.2: 既に正しい範囲を持っている場合は変更しない
   * 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
   */
  private fixDiagnosticRange(diagnostic: Diagnostic): Diagnostic {
    const { start, end } = diagnostic.range;

    // 行番号が0でない場合、または両方の行番号が異なる場合は
    // 既に正しい行/文字ベースの位置を持っていると判断
    if (start.line !== 0 || end.line !== 0 || start.line !== end.line) {
      return diagnostic;
    }

    // line: 0 の場合、character が最初の行の長さを超えているかチェック
    // 超えている場合はオフセットベースと判断して変換
    const maxChar = Math.max(start.character, end.character);
    if (maxChar > this.firstLineLength) {
      // オフセットベースの範囲を行/文字ベースに変換
      const newStart = this.offsetToPosition(start.character);
      const newEnd = this.offsetToPosition(end.character);
      return {
        ...diagnostic,
        range: { start: newStart, end: newEnd }
      };
    }

    // 最初の行の範囲内なので、正しい行/文字ベースと判断
    return diagnostic;
  }

  private prepareRuleContext(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions
  ): PreparedRuleContext {
    const shouldExcludeTables = Boolean(excludedRanges) && options?.analyzeTables !== true;
    const effectiveText = shouldExcludeTables && excludedRanges
      ? maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）
    this.calculateLineStarts(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode);
    const sentences = shouldExcludeTables && excludedRanges
      ? filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;

    const baseContext: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config,
      shared: this.buildSharedContext(effectiveText)
    };

    return {
      baseContext,
      originalText: text
    };
  }

  private runRules(
    rules: AdvancedGrammarRule[],
    tokens: Token[],
    baseContext: RuleContext,
    excludedRanges: ExcludedRange[] | undefined,
    originalText: string,
    profilingCollector?: RuleProfilingCollector
  ): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const rule of rules) {
      // Feature: advanced-rules-profiling - ルール別計測
      const startTime = profilingCollector ? Date.now() : 0;
      let ruleDiagnostics: AdvancedDiagnostic[] = [];
      let ruleSuccess = true;
      let ruleErrorMessage: string | undefined;

      try {
        const ruleContext = buildRuleContextForRule(rule, baseContext, excludedRanges, originalText);
        ruleDiagnostics = rule.check(tokens, ruleContext);
        diagnostics.push(...ruleDiagnostics);
      } catch (error) {
        logError(this.logger, `Error in rule ${rule.name}`, error);
        ruleSuccess = false;
        ruleErrorMessage = formatError(error);
      }

      if (profilingCollector) {
        const executionTimeMs = Date.now() - startTime;
        const entry: RuleProfilingEntry = {
          ruleName: rule.name,
          executionTimeMs,
          diagnosticsCount: ruleDiagnostics.length,
          success: ruleSuccess,
          errorMessage: ruleErrorMessage
        };
        profilingCollector.entries.push(entry);
        profilingCollector.totalTimeMs += executionTimeMs;
      }
    }

    return diagnostics;
  }

  private checkSelectedRules(
    text: string,
    tokens: Token[],
    selectedRules: AdvancedGrammarRule[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    const { baseContext, originalText } = this.prepareRuleContext(text, tokens, excludedRanges, options);
    const diagnostics = this.runRules(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      profilingCollector
    );

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }

  constructor(config?: Partial<AdvancedRulesConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config };
    this.logger = logger;
    this.rules = createDefaultAdvancedRules();
  }

  /**
   * ルールを登録
   */
  registerRule(rule: AdvancedGrammarRule): void {
    this.rules.push(rule);
  }

  /**
   * ルールを解除
   */
  unregisterRule(ruleName: string): void {
    this.rules = this.rules.filter(r => r.name !== ruleName);
  }

  /**
   * 有効なルールを取得
   */
  getEnabledRules(): AdvancedGrammarRule[] {
    return this.rules.filter(rule => rule.isEnabled(this.config));
  }

  /**
   * 軽量ルール名リストを取得
   * Feature: advanced-rules-tiered-execution
   */
  getLightweightRuleNames(): readonly string[] {
    return LIGHTWEIGHT_RULE_NAMES;
  }

  /**
   * ルールが軽量ルールかどうかを判定
   * Feature: advanced-rules-tiered-execution
   */
  isLightweightRule(ruleName: string): boolean {
    return LIGHTWEIGHT_RULE_NAMES.includes(ruleName);
  }

  /**
   * 軽量ルールのみでチェック
   * Feature: advanced-rules-tiered-execution
   *
   * 入力中のレスポンス改善のため、コストの低いルールのみを実行する。
   */
  checkLightweightRules(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    return this.checkWithRules(
      text,
      tokens,
      [...LIGHTWEIGHT_RULE_NAMES],
      excludedRanges,
      options,
      profilingCollector
    );
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<AdvancedRulesConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): AdvancedRulesConfig {
    return { ...this.config };
  }

  /**
   * テキストをチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   * (Feature: advanced-rules-profiling) - コレクタが渡された場合はルール別計測を実行
   */
  checkText(
    text: string,
    tokens: Token[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    const enabledRules = this.getEnabledRules();
    return this.checkSelectedRules(text, tokens, enabledRules, excludedRanges, options, profilingCollector);
  }

  /**
   * 特定のルールのみでチェック
   * 診断の範囲はオフセットベースの場合のみ行/文字ベースに変換する
   * (Feature: diagnostic-range-fix)
   * (Feature: advanced-rules-profiling) - コレクタが渡された場合はルール別計測を実行
   */
  checkWithRules(
    text: string,
    tokens: Token[],
    ruleNames: string[],
    excludedRanges?: ExcludedRange[],
    options?: RuleExecutionOptions,
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    const selectedRules = this.rules.filter(r => ruleNames.includes(r.name) && r.isEnabled(this.config));
    return this.checkSelectedRules(text, tokens, selectedRules, excludedRanges, options, profilingCollector);
  }
}

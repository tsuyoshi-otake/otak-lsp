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
import { splitLines as splitLinesUtil } from '../utils/stringUtils';

type RuleExecutionOptions = { analyzeTables?: boolean };

interface PreparedRuleContext {
  readonly baseContext: RuleContext;
  readonly originalText: string;
  /**
   * originalText に対する shared context。
   * effectiveText !== originalText のときだけ計算する（テーブルマスク有りの Markdown）。
   * ORIGINAL_TEXT 系ルールの documentText 差し替え時にこれを使い、lines/codeRanges の再計算を抑える。
   */
  readonly originalShared?: AdvancedRuleSharedContext;
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
   *
   * 解析サイクルの上位で既に lineStarts が算出済みなら、それを使い回す。
   * テキスト先頭行長 (firstLineLength) も上位から渡せる場合は再計算を避ける。
   */
  private calculateLineStarts(text: string, precomputed?: number[]): void {
    this.lineStarts = precomputed ?? computeLineStarts(text);
    if (this.lineStarts.length >= 2) {
      // computeLineStarts は最初の改行直後の位置を index=1 に持つので、
      // それから 1 を引いた値が「最初の改行までの長さ」になる
      this.firstLineLength = this.lineStarts[1] - 1;
    } else {
      this.firstLineLength = text.length;
    }
  }

  /**
   * 共有コンテキストを構築する
   * Feature: advanced-rules-shared-preprocessing-cache
   *
   * 複数のルールで共通して使用する前処理結果を1回の解析で計算し、
   * 解析サイクル内で再利用できるようにする。
   *
   * @param text 解析対象のテキスト
   * @param precomputedLineStarts 既に算出済みの lineStarts
   * @param precomputedLines 既に算出済みの lines
   * @returns 共有コンテキスト
   */
  private buildSharedContext(
    text: string,
    precomputedLineStarts?: number[],
    precomputedLines?: string[]
  ): AdvancedRuleSharedContext {
    return createSharedContext(text, precomputedLineStarts, precomputedLines);
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
    options?: RuleExecutionOptions,
    precomputedLineStarts?: number[]
  ): PreparedRuleContext {
    const shouldExcludeTables = Boolean(excludedRanges) && options?.analyzeTables !== true;
    const effectiveText = shouldExcludeTables && excludedRanges
      ? maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）。
    // maskTableContent も MarkdownFilter も改行と長さを保持するため、
    // 上位で算出した lineStarts と effectiveText の lineStarts は一致する。
    this.calculateLineStarts(effectiveText, precomputedLineStarts);

    // 解析サイクル全体で利用する行配列を 1 度だけ計算する。
    // SentenceParser / 共有コンテキスト / Markdown 構造系ルールがすべて再利用するため、
    // ここで作って明示的に渡すことで splitLines の重複を解析サイクル単位で 1 回にまとめる。
    const effectiveLines = splitLinesUtil(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(
      effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode, effectiveLines
    );
    const sentences = shouldExcludeTables && excludedRanges
      ? filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;

    const baseShared = this.buildSharedContext(effectiveText, this.lineStarts, effectiveLines);
    const baseContext: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config,
      shared: baseShared
    };

    // originalText !== effectiveText のときのみ originalShared を作る。
    // 行構造は maskTableContent が改行・長さを保持するため lineStarts は共有可能。
    // ただし lines (= 行の中身) と code/inline 範囲は元テキストに依存するため別計算する。
    const originalShared = effectiveText === text
      ? undefined
      : this.buildSharedContext(text, this.lineStarts);

    return {
      baseContext,
      originalText: text,
      originalShared
    };
  }

  private runRules(
    rules: AdvancedGrammarRule[],
    tokens: Token[],
    baseContext: RuleContext,
    excludedRanges: ExcludedRange[] | undefined,
    originalText: string,
    originalShared: AdvancedRuleSharedContext | undefined,
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
        const ruleContext = buildRuleContextForRule(rule, baseContext, excludedRanges, originalText, originalShared);
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
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const { baseContext, originalText, originalShared } = this.prepareRuleContext(
      text, tokens, excludedRanges, options, precomputedLineStarts
    );
    const diagnostics = this.runRules(
      selectedRules,
      tokens,
      baseContext,
      excludedRanges,
      originalText,
      originalShared,
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
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    return this.checkWithRules(
      text,
      tokens,
      [...LIGHTWEIGHT_RULE_NAMES],
      excludedRanges,
      options,
      profilingCollector,
      precomputedLineStarts
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
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const enabledRules = this.getEnabledRules();
    return this.checkSelectedRules(
      text, tokens, enabledRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
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
    profilingCollector?: RuleProfilingCollector,
    precomputedLineStarts?: number[]
  ): Diagnostic[] {
    const selectedRules = this.rules.filter(r => ruleNames.includes(r.name) && r.isEnabled(this.config));
    return this.checkSelectedRules(
      text, tokens, selectedRules, excludedRanges, options, profilingCollector, precomputedLineStarts
    );
  }
}

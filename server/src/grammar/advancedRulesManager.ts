/**
 * Advanced Rules Manager
 * 高度な文法ルールを管理し、実行を制御する
 * Feature: advanced-grammar-rules
 * Feature: advanced-rules-tiered-execution
 */

import { Token, Diagnostic, Range, Position } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
  TieredExecutionConfig,
  DEFAULT_TIERED_EXECUTION_CONFIG,
  RuleContext,
  AdvancedDiagnostic,
  Sentence,
  RuleProfilingEntry,
  RuleProfilingCollector,
  AdvancedRuleSharedContext,
  CodeRange
} from '../../../shared/src/advancedTypes';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { SentenceParser } from './sentenceParser';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { isNotEmpty } from '../utils/arrayUtils';
import { Logger } from '../utils/logger';
import { splitLines } from '../utils/stringUtils';
import { logError, formatError } from '../utils/errorHandler';
import {
  StyleConsistencyRule,
  RaNukiRule,
  DoubleNegationRule,
  ParticleRepetitionRule,
  ConjunctionRepetitionRule,
  AdversativeGaRule,
  AlphabetWidthRule,
  WeakExpressionRule,
  CommaCountRule,
  TermNotationRule,
  KanjiOpeningRule,
  // Additional Grammar Rules (Feature: additional-grammar-rules)
  RedundantExpressionRule,
  TautologyRule,
  NoParticleChainRule,
  MonotonousEndingRule,
  LongSentenceRule,
  // Remaining Grammar Rules (Feature: remaining-grammar-rules)
  SahenVerbRule,
  MissingSubjectRule,
  TwistedSentenceRule,
  HomophoneRule,
  HonorificErrorRule,
  AdverbAgreementRule,
  ModifierPositionRule,
  AmbiguousDemonstrativeRule,
  PassiveOveruseRule,
  NounChainRule,
  ConjunctionMisuseRule,
  AmbiguousTermRule,
  BekiUsageRule,
  // Extended Grammar Rules - Tasks 14-25 (Feature: remaining-grammar-rules)
  OkuriganaVariantRule,
  OrthographyVariantRule,
  NumberWidthMixRule,
  KatakanaChouonRule,
  HalfwidthKanaRule,
  NumeralStyleMixRule,
  SpaceAroundUnitRule,
  BracketQuoteMismatchRule,
  DateFormatVariantRule,
  DashTildeNormalizationRule,
  NakaguroUsageRule,
  SymbolWidthMixRule,
  // Sentence Ending Colon Detection (Feature: sentence-ending-colon-detection)
  SentenceEndingColonRule,
  // Evals NG Pattern Expansion (Feature: evals-ng-pattern-expansion)
  PunctuationStyleMixRule,
  QuotationStyleMixRule,
  BulletStyleMixRule,
  EmphasisStyleMixRule,
  EnglishCaseMixRule,
  UnitNotationMixRule,
  PronounMixRule,
  HeadingLevelSkipRule,
  TableColumnMismatchRule,
  CodeBlockLanguageRule,
  // Official Document Rules (Feature: official-document-rules)
  OyobiNarabiniRule,
  MatawaWakushikuwaRule,
  JouyouKanjiRule,
  BulletPunctuationRule,
  // Sentence Complexity Rule (Feature: sentence-complexity-rule)
  SentenceComplexityRule
} from './rules';

/**
 * 軽量ルール名リスト
 * Feature: advanced-rules-tiered-execution
 *
 * 走査コストが低く即時実行に適したルール。
 * 正規表現マッチや単純な文字列検査のみで完結するルールを含む。
 */
const LIGHTWEIGHT_RULE_NAMES: readonly string[] = [
  'alphabet-width',
  'halfwidth-kana',
  'number-width-mix',
  'symbol-width-mix',
  'katakana-chouon',
  'okurigana-variant',
  'orthography-variant',
  'dash-tilde-normalization',
  'nakaguro-usage',
  'bracket-quote-mismatch',
  'space-around-unit',
  'date-format-variant',
  'numeral-style-mix',
  'punctuation-style-mix',
  'quotation-style-mix',
  'bullet-style-mix',
  'emphasis-style-mix',
  'sentence-ending-colon',
  'ambiguous-term',
  'beki-usage'
] as const;

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
   * code-block が「自然言語の例文」として書かれているかを判定
   * - ```markdown / ```md / ```text / ```plaintext / ```txt は例文扱い（文脈依存ルールも適用）
   * - それ以外、および言語未指定のコードブロックは従来通り除外（誤検出抑止）
   */
  private isProseCodeBlock(range: ExcludedRange): boolean {
    if (range.type !== 'code-block') {
      return false;
    }

    // 単一行の ```code``` は既存互換の「コードブロック」扱いなので除外する
    if (!range.content.includes('\n') && !range.content.includes('\r')) {
      return false;
    }

    const firstLine = range.content.split(/\r?\n/, 1)[0] ?? '';
    const stripped = firstLine.replace(/^\s*(?:>\s*)*/, '');
    const match = stripped.match(/^([`~]{3,})(.*)$/);
    if (!match) {
      return false;
    }

    const info = match[2].trim();
    if (!info) {
      // 言語未指定はコードサンプルであることが多いので除外
      return false;
    }

    const language = info.split(/\s+/)[0].toLowerCase();
    return (
      language === 'markdown' ||
      language === 'md' ||
      language === 'text' ||
      language === 'plaintext' ||
      language === 'txt'
    );
  }

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
    // コードブロック範囲を検出（```...```）
    const codeBlockRanges: CodeRange[] = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let match: RegExpExecArray | null;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlockRanges.push({
        start: match.index,
        end: match.index + match[0].length
      });
    }

    // インラインコード範囲を検出（`...`）
    // コードブロック内のバッククォートを除外するため、コードブロック範囲と重なるものは除外
    const inlineCodeRanges: CodeRange[] = [];
    const inlineCodeRegex = /`[^`\n]+`/g;
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;

      // コードブロック範囲と重なるかチェック
      const overlapsCodeBlock = codeBlockRanges.some(
        range => start < range.end && end > range.start
      );

      if (!overlapsCodeBlock) {
        inlineCodeRanges.push({ start, end });
      }
    }

    // codeRanges: コードブロックとインラインコードの結合
    const codeRanges: CodeRange[] = [...codeBlockRanges, ...inlineCodeRanges];
    // 位置でソート
    codeRanges.sort((a, b) => a.start - b.start);

    // 行開始位置を計算
    const lineStarts = computeLineStarts(text);

    // 行テキストを分割
    const lines = splitLines(text);

    return {
      codeBlockRanges,
      inlineCodeRanges,
      codeRanges,
      lineStarts,
      lines
    };
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

  /**
   * テーブル範囲に重なる文を除外
   * （Markdownの文法チェックではテーブル全体を対象外にする）
   */
  private filterOutTableSentences(sentences: Sentence[], excludedRanges: ExcludedRange[]): Sentence[] {
    const tableRanges = excludedRanges.filter((r) => r.type === 'table');
    if (tableRanges.length === 0) {
      return sentences;
    }

    return sentences.filter((sentence) =>
      !tableRanges.some((table) =>
        sentence.start < table.end && sentence.end > table.start
      )
    );
  }

  /**
   * テーブル内のテキストをスペースでマスクする
   * - 文法チェックからテーブル内容を除外するため
   * - 改行は保持して行位置を崩さない
   */
  private maskTableContent(text: string, excludedRanges: ExcludedRange[]): string {
    const tableRanges = excludedRanges.filter((r) => r.type === 'table');
    if (tableRanges.length === 0) {
      return text;
    }

    const chars = text.split('');
    for (const range of tableRanges) {
      const start = Math.max(0, Math.min(range.start, chars.length));
      const end = Math.max(start, Math.min(range.end, chars.length));
      for (let i = start; i < end; i++) {
        const ch = chars[i];
        // テーブル構造ルール（列数不一致など）のために区切り文字（|）とエスケープ（\）は保持する
        if (ch !== '\n' && ch !== '\r' && ch !== '|' && ch !== '\\' && ch !== '-' && ch !== ':') {
          chars[i] = ' ';
        }
      }
    }

    return chars.join('');
  }

  /**
   * monotonous-ending は「連続」を見るルールのため、Markdownテーブル内では行（=セル）の境界で連続判定をリセットする。
   * - 例: 各行の例文が「...です。」で終わる表だと誤検出しやすい
   * - 一方で 1セル内に複数文がある場合は検出したいので、行内の分割結果は維持する
   */
  private insertBoundariesBetweenTableRows(
    sentences: Sentence[],
    documentText: string,
    excludedRanges: ExcludedRange[]
  ): Sentence[] {
    if (sentences.length < 2) {
      return sentences;
    }

    const tableRanges = excludedRanges.filter((r) => r.type === 'table');
    if (tableRanges.length === 0) {
      return sentences;
    }

    const findTableRange = (offset: number): ExcludedRange | null => {
      for (const range of tableRanges) {
        if (offset >= range.start && offset < range.end) {
          return range;
        }
      }
      return null;
    };

    const hasLineBreakBetween = (start: number, end: number): boolean => {
      const safeStart = Math.max(0, Math.min(start, documentText.length));
      const safeEnd = Math.max(safeStart, Math.min(end, documentText.length));
      const between = documentText.slice(safeStart, safeEnd);
      return between.includes('\n') || between.includes('\r');
    };

    const withBoundaries: Sentence[] = [];
    for (let i = 0; i < sentences.length; i++) {
      const current = sentences[i];
      withBoundaries.push(current);

      if (i === sentences.length - 1) {
        break;
      }

      const next = sentences[i + 1];
      const currentTable = findTableRange(current.start);
      const nextTable = findTableRange(next.start);

      const shouldInsertBoundary =
        Boolean(currentTable || nextTable) &&
        (
          currentTable !== nextTable ||
          (currentTable !== null && nextTable !== null && hasLineBreakBetween(current.end, next.start))
        );

      if (!shouldInsertBoundary) {
        continue;
      }

      const boundaryStart = Math.max(0, Math.min(current.end, documentText.length));
      const boundaryEnd = Math.min(boundaryStart + 1, documentText.length);
      if (boundaryEnd <= boundaryStart) {
        continue;
      }

      withBoundaries.push(new Sentence({
        text: ' ',
        tokens: [],
        start: boundaryStart,
        end: boundaryEnd
      }));
    }

    return withBoundaries;
  }

  /**
   * 指定タイプの除外範囲内にある文を「境界」に置き換える
   * - 非本文（コードブロック等）を丸ごと取り除くと、前後の本文が隣接して誤検出が増える可能性がある
   * - そのため、除外区間は「本文セグメントの区切り」として扱う
   */
  private replaceSentencesOverlappingExcludedTypesWithBoundary(
    sentences: Sentence[],
    excludedRanges: ExcludedRange[] | undefined,
    types: ExcludedRange['type'][]
  ): Sentence[] {
    if (!isNotEmpty(excludedRanges)) {
      return sentences;
    }

    // TypeScriptの型ガード: isNotEmptyがtrueの場合、excludedRangesは配列
    const targets = excludedRanges!.filter((r) => types.includes(r.type));
    if (targets.length === 0) {
      return sentences;
    }

    const overlaps = (sentence: Sentence): boolean => {
      return targets.some((range) => sentence.start < range.end && sentence.end > range.start);
    };

    const replaced: Sentence[] = [];
    let pendingBoundary = false;

    for (const sentence of sentences) {
      if (!overlaps(sentence)) {
        pendingBoundary = false;
        replaced.push(sentence);
        continue;
      }

      if (pendingBoundary) {
        continue;
      }

      const end = Math.min(sentence.end, sentence.start + 1);
      replaced.push(new Sentence({
        text: ' ',
        tokens: [],
        start: sentence.start,
        end
      }));
      pendingBoundary = true;
    }

    return replaced;
  }

  /**
   * ルールごとの文脈（RuleContext）調整
   * - Markdownの非本文（コードブロック等）を「本文」として扱うと誤検出しやすいルールがあるため、ここで除外する
   */
  private buildRuleContextForRule(
    rule: AdvancedGrammarRule,
    baseContext: RuleContext,
    excludedRanges?: ExcludedRange[],
    originalText?: string
  ): RuleContext {
    // Markdown テーブルのマスク（analyzeTables=false）でも、構造/表記の一部ルールは原文を参照したい。
    // - EVALS 表などの「例文」をテーブルに載せるケースで、記号がマスクされると検出できなくなるため
    if (
      (rule.name === 'bullet-style-mix' ||
        rule.name === 'emphasis-style-mix' ||
        rule.name === 'heading-level-skip' ||
        rule.name === 'table-column-mismatch' ||
        rule.name === 'code-block-language') &&
      typeof originalText === 'string'
    ) {
      return {
        ...baseContext,
        documentText: originalText
      };
    }

    // テーブルは既定でマスクされるが、「弱い表現」や「表記ゆれ」などは表セル内の自然言語でも有用なので原文で判定する
    if (
      (rule.name === 'weak-expression' ||
        rule.name === 'ambiguous-term' ||
        rule.name === 'beki-usage' ||
        rule.name === 'term-notation' ||
        rule.name === 'kanji-opening' ||
        rule.name === 'redundant-expression' ||
        rule.name === 'tautology' ||
        rule.name === 'okurigana-variant' ||
        rule.name === 'orthography-variant' ||
        rule.name === 'katakana-chouon' ||
        rule.name === 'halfwidth-kana' ||
        rule.name === 'dash-tilde-normalization' ||
        rule.name === 'nakaguro-usage') &&
      typeof originalText === 'string'
    ) {
      return {
        ...baseContext,
        documentText: originalText
      };
    }

    // monotonous-ending はテーブルの行（セル）をまたいで「連続」と判定しない
    if (rule.name === 'monotonous-ending' && excludedRanges && excludedRanges.some((r) => r.type === 'table')) {
      return {
        ...baseContext,
        sentences: this.insertBoundariesBetweenTableRows(baseContext.sentences, baseContext.documentText, excludedRanges)
      };
    }

    // Markdownコードブロック内の文を本文扱いしない（誤検出抑止）
    if (rule.name === 'conjunction-repetition' || rule.name === 'adversative-ga') {
      const codeBlockRanges = excludedRanges?.filter((r) => r.type === 'code-block') ?? [];
      const codeBlocksToExclude = codeBlockRanges.filter((r) => !this.isProseCodeBlock(r));
      return {
        ...baseContext,
        sentences: this.replaceSentencesOverlappingExcludedTypesWithBoundary(baseContext.sentences, codeBlocksToExclude, ['code-block'])
      };
    }

    return baseContext;
  }

  constructor(config?: Partial<AdvancedRulesConfig>, logger?: Logger) {
    this.config = { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config };
    this.logger = logger;
    this.rules = [
      new StyleConsistencyRule(),
      new RaNukiRule(),
      new DoubleNegationRule(),
      new ParticleRepetitionRule(),
      new ConjunctionRepetitionRule(),
      new AdversativeGaRule(),
      new AlphabetWidthRule(),
      new WeakExpressionRule(),
      new CommaCountRule(),
      new TermNotationRule(),
      new KanjiOpeningRule(),
      // Additional Grammar Rules (Feature: additional-grammar-rules)
      new RedundantExpressionRule(),
      new TautologyRule(),
      new NoParticleChainRule(),
      new MonotonousEndingRule(),
      new LongSentenceRule(),
      // Remaining Grammar Rules (Feature: remaining-grammar-rules)
      new SahenVerbRule(),
      new MissingSubjectRule(),
      new TwistedSentenceRule(),
      new HomophoneRule(),
      new HonorificErrorRule(),
      new AdverbAgreementRule(),
      new ModifierPositionRule(),
      new AmbiguousDemonstrativeRule(),
      new PassiveOveruseRule(),
      new NounChainRule(),
      new ConjunctionMisuseRule(),
      new AmbiguousTermRule(),
      new BekiUsageRule(),
      // Extended Grammar Rules - Tasks 14-25 (Feature: remaining-grammar-rules)
      new OkuriganaVariantRule(),
      new OrthographyVariantRule(),
      new NumberWidthMixRule(),
      new KatakanaChouonRule(),
      new HalfwidthKanaRule(),
      new NumeralStyleMixRule(),
      new SpaceAroundUnitRule(),
      new BracketQuoteMismatchRule(),
      new DateFormatVariantRule(),
      new DashTildeNormalizationRule(),
      new NakaguroUsageRule(),
      new SymbolWidthMixRule(),
      // Sentence Ending Colon Detection (Feature: sentence-ending-colon-detection)
      new SentenceEndingColonRule(),
      // Evals NG Pattern Expansion (Feature: evals-ng-pattern-expansion)
      new PunctuationStyleMixRule(),
      new QuotationStyleMixRule(),
      new BulletStyleMixRule(),
      new EmphasisStyleMixRule(),
      new EnglishCaseMixRule(),
      new UnitNotationMixRule(),
      new PronounMixRule(),
      new HeadingLevelSkipRule(),
      new TableColumnMismatchRule(),
      new CodeBlockLanguageRule(),
      // Official Document Rules (Feature: official-document-rules)
      new OyobiNarabiniRule(),
      new MatawaWakushikuwaRule(),
      new JouyouKanjiRule(),
      new BulletPunctuationRule(),
      // Sentence Complexity Rule (Feature: sentence-complexity-rule)
      new SentenceComplexityRule()
    ];
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
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    const shouldExcludeTables = Boolean(excludedRanges) && options?.analyzeTables !== true;
    const originalText = text;
    const effectiveText = shouldExcludeTables && excludedRanges
      ? this.maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）
    this.calculateLineStarts(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode);
    const sentences = shouldExcludeTables && excludedRanges
      ? this.filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;

    // Feature: advanced-rules-shared-preprocessing-cache
    // 共有コンテキストを解析サイクルごとに生成
    const shared = this.buildSharedContext(effectiveText);

    const baseContext: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config,
      shared
    };

    const diagnostics: AdvancedDiagnostic[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      // Feature: advanced-rules-profiling - ルール別計測
      const startTime = profilingCollector ? Date.now() : 0;
      let ruleDiagnostics: AdvancedDiagnostic[] = [];
      let ruleSuccess = true;
      let ruleErrorMessage: string | undefined;

      try {
        const ruleContext = this.buildRuleContextForRule(rule, baseContext, excludedRanges, originalText);
        ruleDiagnostics = rule.check(tokens, ruleContext);
        diagnostics.push(...ruleDiagnostics);
      } catch (error) {
        logError(this.logger, `Error in rule ${rule.name}`, error);
        ruleSuccess = false;
        ruleErrorMessage = formatError(error);
      }

      // Feature: advanced-rules-profiling - 計測結果を記録
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

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
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
    options?: { analyzeTables?: boolean },
    profilingCollector?: RuleProfilingCollector
  ): Diagnostic[] {
    const shouldExcludeTables = Boolean(excludedRanges) && options?.analyzeTables !== true;
    const originalText = text;
    const effectiveText = shouldExcludeTables && excludedRanges
      ? this.maskTableContent(text, excludedRanges)
      : text;

    // 行開始位置を計算（オフセットベース範囲の変換に使用）
    this.calculateLineStarts(effectiveText);

    const parsedSentences = SentenceParser.parseSentences(effectiveText, tokens, excludedRanges, this.config.sentenceSplitMode);
    const sentences = shouldExcludeTables && excludedRanges
      ? this.filterOutTableSentences(parsedSentences, excludedRanges)
      : parsedSentences;

    // Feature: advanced-rules-shared-preprocessing-cache
    // 共有コンテキストを解析サイクルごとに生成
    const shared = this.buildSharedContext(effectiveText);

    const baseContext: RuleContext = {
      documentText: effectiveText,
      sentences,
      config: this.config,
      shared
    };

    const diagnostics: AdvancedDiagnostic[] = [];
    const selectedRules = this.rules.filter(r => ruleNames.includes(r.name) && r.isEnabled(this.config));

    for (const rule of selectedRules) {
      // Feature: advanced-rules-profiling - ルール別計測
      const startTime = profilingCollector ? Date.now() : 0;
      let ruleDiagnostics: AdvancedDiagnostic[] = [];
      let ruleSuccess = true;
      let ruleErrorMessage: string | undefined;

      try {
        const ruleContext = this.buildRuleContextForRule(rule, baseContext, excludedRanges, originalText);
        ruleDiagnostics = rule.check(tokens, ruleContext);
        diagnostics.push(...ruleDiagnostics);
      } catch (error) {
        logError(this.logger, `Error in rule ${rule.name}`, error);
        ruleSuccess = false;
        ruleErrorMessage = formatError(error);
      }

      // Feature: advanced-rules-profiling - 計測結果を記録
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

    // オフセットベースの範囲のみ行/文字ベースに変換（要件 1.2, 1.3）
    return diagnostics.map(d => this.fixDiagnosticRange(d.toDiagnostic()));
  }
}

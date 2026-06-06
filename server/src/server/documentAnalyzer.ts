/**
 * DocumentAnalyzer Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.4, 4.4
 *
 * 文書解析（形態素解析、文法チェック、セマンティックトークン生成）を担当
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic as LSPDiagnostic } from 'vscode-languageserver/node';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { parseSuppressionDirectives, applySuppressions } from '../grammar/suppressionDirectives';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { CommentRange, Configuration, Token, SupportedLanguage, Diagnostic } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { AdvancedRulesConfig, RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { Profiler, ProfileStep } from './profiler';
import { convertSeverity } from './diagnosticsPublisher';
import { computeLineStarts } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { isNotEmpty } from '../utils/arrayUtils';
import {
  buildMaskedTextByKeepRanges,
  normalizeRanges,
  sweepFilterByContainment,
} from '../utils/rangeSweep';

/**
 * プロファイルステップ記録用コールバック
 */
type RecordStep = (name: string, ms: number, meta?: string) => void;

function createStepRecorder(isEnabled: boolean, steps: ProfileStep[]): RecordStep {
  if (!isEnabled) {
    return () => undefined;
  }
  return (name, ms, meta) => {
    steps.push(meta === undefined ? { name, ms } : { name, ms, meta });
  };
}

/**
 * 内部診断をLSP診断に変換
 */
function toLspDiagnostics(diags: Diagnostic[], source: string): LSPDiagnostic[] {
  return diags.map((diag) => ({
    severity: convertSeverity(diag.severity),
    range: {
      start: { line: diag.range.start.line, character: diag.range.start.character },
      end: { line: diag.range.end.line, character: diag.range.end.character },
    },
    message: diag.message,
    source,
    code: diag.code,
  }));
}

function keepOnlyCommentRanges(text: string, comments: CommentRange[]): string {
  if (comments.length === 0) {
    return '';
  }
  // O(N) で keep 範囲のみ原文を残し、外はスペース、改行は保持。
  // 旧実装の `text.split('')` を回避して N 個の文字列割当を抑える。
  return buildMaskedTextByKeepRanges(text, comments);
}

/**
 * 解析結果
 */
export interface AnalysisResult {
  tokens: Token[];
  diagnostics: LSPDiagnostic[];
  excludedRanges: ExcludedRange[];
  lineStarts: number[];
  profileSteps: ProfileStep[];
}

/**
 * DocumentAnalyzerインターフェース
 */
export interface DocumentAnalyzer {
  /**
   * 文書を解析
   *
   * @param document 解析対象の文書
   * @param config 基本設定
   * @param advancedConfig 高度ルール設定
   * @param lightweightOnly 軽量ルールのみ実行するか
   * @param profiler プロファイラー（オプション）
   * @param ruleProfilingCollector ルール別プロファイリング用コレクタ（オプション）
   */
  analyze(
    document: TextDocument,
    config: Configuration,
    advancedConfig: AdvancedRulesConfig,
    lightweightOnly: boolean,
    profiler?: Profiler,
    ruleProfilingCollector?: RuleProfilingCollector
  ): Promise<AnalysisResult>;
}

interface ExtractedText {
  textToAnalyze: string;
  excludedRanges: ExcludedRange[];
  commentRanges: CommentRange[];
}

function extractAnalysisText(
  text: string,
  languageId: SupportedLanguage,
  commentExtractor: CommentExtractor,
  markdownFilter: MarkdownFilter,
  analyzeCodeBlocks: boolean,
  recordStep: RecordStep
): ExtractedText {
  if (languageId === 'markdown') {
    const start = Date.now();
    const filterResult = markdownFilter.filter(text, {
      ...markdownFilter.getConfig(),
      preserveCodeBlockContent: analyzeCodeBlocks,
    });
    recordStep('Markdownフィルタ', Date.now() - start, `除外=${filterResult.excludedRanges.length}`);
    return {
      textToAnalyze: filterResult.filteredText,
      excludedRanges: filterResult.excludedRanges,
      commentRanges: [],
    };
  }

  if (languageId !== 'plaintext') {
    const start = Date.now();
    const commentRanges = commentExtractor.extract(text, languageId);
    const textToAnalyze = keepOnlyCommentRanges(text, commentRanges);
    recordStep('コメント抽出', Date.now() - start, `件数=${commentRanges.length}`);
    return { textToAnalyze, excludedRanges: [], commentRanges };
  }

  return { textToAnalyze: text, excludedRanges: [], commentRanges: [] };
}

async function runMorphologicalAnalysis(
  textToAnalyze: string,
  languageId: SupportedLanguage,
  commentRanges: CommentRange[],
  mecabAnalyzer: MeCabAnalyzer,
  recordStep: RecordStep
): Promise<Token[]> {
  const start = Date.now();
  const cacheStatsBefore = MeCabAnalyzer.getCacheStats();
  let tokens = await mecabAnalyzer.analyze(textToAnalyze);
  if (languageId !== 'markdown' && languageId !== 'plaintext') {
    // 空白トークンを除外したうえで、コメント範囲に「完全包含」される token のみ残す。
    // 旧実装は tokens.filter(commentRanges.some(...)) で O(T×R) だったが、
    // 正規化済み範囲に対する containment スイープで O(T+R) に圧縮する。
    const sortedRanges = normalizeRanges(commentRanges);
    const nonBlankTokens = tokens.filter((token) => token.surface.trim().length > 0);
    tokens = sweepFilterByContainment(nonBlankTokens, sortedRanges, /* keepContained */ true);
  }
  const cacheHit = MeCabAnalyzer.getCacheStats().hits > cacheStatsBefore.hits;
  recordStep('形態素解析', Date.now() - start, `tokens=${tokens.length} cache=${cacheHit ? 'HIT' : 'MISS'}`);
  return tokens;
}

interface TokenPartition {
  semanticTokens: Token[];
  grammarTokens: Token[];
}

function partitionMarkdownTokens(
  allTokens: Token[],
  excludedRanges: ExcludedRange[],
  config: Configuration,
  tokenFilter: TokenFilter,
  recordStep: RecordStep
): TokenPartition {
  const start = Date.now();

  let semanticTokens = allTokens;
  if (config.enableSemanticHighlight) {
    let ranges = excludedRanges;
    if (config.excludeTableDelimiters !== false) {
      ranges = ranges.filter((r) => r.type !== 'table');
    }
    if (config.markdown.analyzeCodeBlocks) {
      ranges = ranges.filter((r) => r.type !== 'code-block');
    }
    if (isNotEmpty(ranges)) {
      semanticTokens = tokenFilter.filterTokens(allTokens, ranges);
    }
  }

  let grammarTokens = allTokens;
  if (config.enableGrammarCheck) {
    let ranges = config.markdown.analyzeCodeBlocks
      ? excludedRanges.filter((r) => r.type !== 'code-block')
      : excludedRanges;
    if (config.markdown.analyzeTables) {
      ranges = ranges.filter((r) => r.type !== 'table');
    }
    if (isNotEmpty(ranges)) {
      grammarTokens = tokenFilter.filterTokens(allTokens, ranges);
    }
  }

  recordStep('トークンフィルタ', Date.now() - start);
  return { semanticTokens, grammarTokens };
}

interface GrammarCheckDeps {
  grammarChecker: GrammarChecker;
  advancedRulesManager: AdvancedRulesManager;
  proofreadingRulesManager: ProofreadingRulesManager;
}

async function runAdvancedRules(
  textToAnalyze: string,
  grammarTokens: Token[],
  languageId: SupportedLanguage,
  excludedRanges: ExcludedRange[],
  config: Configuration,
  lightweightOnly: boolean,
  advancedRulesManager: AdvancedRulesManager,
  ruleProfilingCollector?: RuleProfilingCollector,
  precomputedLineStarts?: number[]
): Promise<Diagnostic[]> {
  const isMarkdown = languageId === 'markdown';
  const mdRanges = isMarkdown ? excludedRanges : undefined;
  const mdOptions = isMarkdown ? { analyzeTables: config.markdown.analyzeTables } : undefined;

  // Feature: parallel-advanced-rules
  // フラグ on かつ worker bundle が利用可能なら worker_threads で並列実行する。
  // フラグ off / 環境不適合の場合は async 協調版にフォールバックする。
  //
  // 軽量ルールは件数が少なく (20 件程度)、worker への serialize コストが
  // 並列化の利益を上回りやすいので、parallel パスは「フル実行」だけに適用する。
  const parallelEnabled = advancedRulesManager.getConfig().parallelExecution?.enabled === true;
  const useParallel = parallelEnabled && !lightweightOnly;

  if (useParallel) {
    return await advancedRulesManager.checkTextParallel(
      textToAnalyze, grammarTokens, mdRanges, mdOptions, ruleProfilingCollector, precomputedLineStarts
    );
  }

  // 非同期協調版: K=8 件ごとに `setImmediate` で yield することで
  // 解析中も LSP サーバが他リクエストへ応答できる。
  return lightweightOnly
    ? await advancedRulesManager.checkLightweightRulesAsync(
        textToAnalyze, grammarTokens, mdRanges, mdOptions, ruleProfilingCollector, precomputedLineStarts
      )
    : await advancedRulesManager.checkTextAsync(
        textToAnalyze, grammarTokens, mdRanges, mdOptions, ruleProfilingCollector, precomputedLineStarts
      );
}

/**
 * 文法チェック群を実行する。
 *
 * 旧実装は basic → advanced → proofreading を順次実行していたが、
 * これらは完全に独立した処理なので Promise.all で並行スケジュールする。
 *
 * Node.js の event loop は単一スレッドなので CPU は依然として直列だが、
 * - advanced ルールは中で `setImmediate` で yield する
 * - その隙間に proofreading のチャンクや LSP の他リクエストが入り込める
 *
 * Amdahl 観点: 順次部分を「協調的に分割」してイベントループに譲ることで、
 * 体感のレスポンスを大きく改善する。
 */
async function runGrammarChecks(
  textToAnalyze: string,
  grammarTokens: Token[],
  languageId: SupportedLanguage,
  excludedRanges: ExcludedRange[],
  config: Configuration,
  lightweightOnly: boolean,
  deps: GrammarCheckDeps,
  recordStep: RecordStep,
  ruleProfilingCollector?: RuleProfilingCollector,
  precomputedLineStarts?: number[]
): Promise<LSPDiagnostic[]> {
  const basicStart = Date.now();
  const advancedStart = Date.now();
  const proofreadingStart = Date.now();

  // 3 系統を Promise.all で並行スケジュール。
  // advanced は内部で setImmediate yield するため、他系統が間に入りやすい。
  const [basicDiags, advancedDiags, proofreadingDiags] = await Promise.all([
    Promise.resolve().then(() => {
      const diags = deps.grammarChecker.check(grammarTokens, textToAnalyze, precomputedLineStarts);
      recordStep('基本ルール評価', Date.now() - basicStart, `件数=${diags.length}`);
      return diags;
    }),
    runAdvancedRules(
      textToAnalyze, grammarTokens, languageId, excludedRanges, config,
      lightweightOnly, deps.advancedRulesManager, ruleProfilingCollector, precomputedLineStarts
    ).then((diags) => {
      // parallel パスが有効かを meta に出す (Feature: parallel-advanced-rules / REQ-10)
      const parallelOn = deps.advancedRulesManager.getConfig().parallelExecution?.enabled === true;
      const mode = !lightweightOnly && parallelOn ? 'parallel' : 'async';
      recordStep(
        lightweightOnly ? '軽量ルール評価' : '高度ルール評価',
        Date.now() - advancedStart,
        `件数=${diags.length} mode=${mode}`
      );
      return diags;
    }),
    Promise.resolve().then(() => {
      const diags = deps.proofreadingRulesManager.checkText(
        textToAnalyze, grammarTokens, precomputedLineStarts
      );
      recordStep('校正ルール評価', Date.now() - proofreadingStart, `件数=${diags.length}`);
      return diags;
    }),
  ]);

  const diagnostics: LSPDiagnostic[] = [];
  diagnostics.push(...toLspDiagnostics(basicDiags, 'otak-lsp'));
  diagnostics.push(...toLspDiagnostics(advancedDiags, 'otak-lsp'));
  diagnostics.push(...toLspDiagnostics(proofreadingDiags, 'otak-lsp-proofreading'));
  return diagnostics;
}

/**
 * DocumentAnalyzerを作成
 */
export function createDocumentAnalyzer(
  mecabAnalyzer: MeCabAnalyzer,
  commentExtractor: CommentExtractor,
  markdownFilter: MarkdownFilter,
  tokenFilter: TokenFilter,
  grammarChecker: GrammarChecker,
  advancedRulesManager: AdvancedRulesManager,
  proofreadingRulesManager: ProofreadingRulesManager,
  logger?: Logger
): DocumentAnalyzer {
  function debugLog(message: string): void {
    logger?.debug(message);
  }

  const checkDeps: GrammarCheckDeps = {
    grammarChecker,
    advancedRulesManager,
    proofreadingRulesManager,
  };

  return {
    async analyze(
      document: TextDocument,
      config: Configuration,
      _advancedConfig: AdvancedRulesConfig,
      lightweightOnly: boolean,
      profiler?: Profiler,
      ruleProfilingCollector?: RuleProfilingCollector
    ): Promise<AnalysisResult> {
      const text = document.getText();
      const languageId = document.languageId as SupportedLanguage;
      const profileSteps: ProfileStep[] = [];
      const recordStep = createStepRecorder(profiler?.isEnabled() ?? false, profileSteps);

      const lineStartsStart = Date.now();
      const lineStarts = computeLineStarts(text);
      recordStep('行開始位置計算', Date.now() - lineStartsStart);

      if (!config.targetLanguages.includes(languageId)) {
        debugLog(`Language ${languageId} not in target languages, skipping`);
        return { tokens: [], diagnostics: [], excludedRanges: [], lineStarts, profileSteps };
      }

      const { textToAnalyze, excludedRanges, commentRanges } = extractAnalysisText(
        text, languageId, commentExtractor, markdownFilter,
        config.markdown.analyzeCodeBlocks, recordStep
      );
      if (languageId !== 'markdown' && languageId !== 'plaintext') {
        debugLog(`Extracted ${commentRanges.length} comments`);
      } else if (languageId === 'markdown') {
        debugLog(`Markdown filtered: ${excludedRanges.length} ranges excluded`);
      }

      if (!textToAnalyze.trim()) {
        debugLog(`No text to analyze, skipping`);
        return { tokens: [], diagnostics: [], excludedRanges, lineStarts, profileSteps };
      }

      const allTokens = await runMorphologicalAnalysis(
        textToAnalyze, languageId, commentRanges, mecabAnalyzer, recordStep
      );
      debugLog(`Analysis complete, ${allTokens.length} tokens found`);

      const { semanticTokens: semanticTokensList, grammarTokens: grammarTokensList } =
        languageId === 'markdown'
          ? partitionMarkdownTokens(allTokens, excludedRanges, config, tokenFilter, recordStep)
          : { semanticTokens: allTokens, grammarTokens: allTokens };

      let diagnostics: LSPDiagnostic[] = [];
      if (config.enableGrammarCheck) {
        // textToAnalyze は MarkdownFilter / keepOnlyCommentRanges どちらの経路でも
        // 改行と長さを保持するため、原文の lineStarts をそのまま使い回せる。
        diagnostics.push(...(await runGrammarChecks(
          textToAnalyze, grammarTokensList, languageId, excludedRanges, config,
          lightweightOnly, checkDeps, recordStep, ruleProfilingCollector, lineStarts
        )));

        // インライン抑制ディレクティブ（otak-lsp-disable-next-line 等）を適用する。
        // 走査は原文 text に対して行い、コメント構文に依存しない。
        // ディレクティブが無ければ applySuppressions は即リターンする。
        const suppressStart = Date.now();
        const suppressionScan = parseSuppressionDirectives(text);
        if (suppressionScan.hasDirectives) {
          const before = diagnostics.length;
          diagnostics = applySuppressions(diagnostics, suppressionScan);
          recordStep('抑制ディレクティブ適用', Date.now() - suppressStart, `抑制=${before - diagnostics.length}`);
        }
      }

      return {
        tokens: semanticTokensList,
        diagnostics,
        excludedRanges,
        lineStarts,
        profileSteps,
      };
    },
  };
}

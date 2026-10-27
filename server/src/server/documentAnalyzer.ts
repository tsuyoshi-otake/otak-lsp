/**
 * DocumentAnalyzer Module
 * Feature: main-ts-refactoring
 * Requirements: 1.1, 1.2, 2.4, 4.4
 *
 * 文書解析（形態素解析、文法チェック、セマンティックトークン生成）を担当
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic as LSPDiagnostic, DiagnosticSeverity as LSPDiagnosticSeverity } from 'vscode-languageserver/node';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { parseSuppressionDirectives, applySuppressions, DirectiveScopeOptions } from '../grammar/suppressionDirectives';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { ProofreadingSettingsConfig } from '../proofreading/proofreadingConfig';
import { findQuoteLineRanges } from '../proofreading/quoteLineFilter';
import { CommentRange, Configuration, Token, SupportedLanguage, Diagnostic } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { AdvancedRulesConfig, RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { Profiler, ProfileStep } from './profiler';
import { convertSeverity } from './diagnosticsPublisher';
import { computeLineStarts } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { isNotEmpty } from '../utils/arrayUtils';
import { DictionaryExecutor } from '../dictionaries/dictionaryExecutor';
import { ProofreadingDictionaryService } from '../dictionaries/proofreadingDictionaryService';
import {
  buildMaskedTextByKeepRanges,
  buildMaskedTextByMaskRanges,
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
 * data.documentVersion / data.suggestions は CodeAction が
 * 古い文書versionへの適用を防ぎ、修正候補を表示するために使う。
 */
function toLspDiagnostics(diags: Diagnostic[], source: string, documentVersion: number): LSPDiagnostic[] {
  return diags.map((diag) => ({
    severity: convertSeverity(diag.severity),
    range: {
      start: { line: diag.range.start.line, character: diag.range.start.character },
      end: { line: diag.range.end.line, character: diag.range.end.character },
    },
    message: diag.message,
    source,
    code: diag.code,
    data: { suggestions: diag.suggestions, documentVersion },
  }));
}

/**
 * 利用者向けの情報診断（Hint）を作成する。
 * 抑制ディレクティブの対象外とし、診断上限にも消費されないマーカー用途。
 */
function makeHintDiagnostic(
  range: LSPDiagnostic['range'],
  code: string,
  message: string
): LSPDiagnostic {
  return {
    range,
    severity: LSPDiagnosticSeverity.Hint,
    message,
    source: 'otak-lsp',
    code,
  };
}

/**
 * 抑制ディレクティブの走査範囲を言語別に決める。
 * - markdown: HTML コメント（<!-- -->）内のみ、コードブロック等の除外範囲は除く。
 * - コード言語: CommentExtractor が抽出した実コメント内のみ
 *   （文字列リテラル内の "// otak-lsp-..." 等はディレクティブにしない）。
 * - plaintext: コメント構文が無いため行内位置ルールに委ねる（undefined）。
 */
function buildDirectiveScope(
  text: string,
  languageId: SupportedLanguage,
  commentRanges: CommentRange[],
  excludedRanges: ExcludedRange[],
  quoteRanges: ExcludedRange[],
): DirectiveScopeOptions | undefined {
  if (languageId === 'plaintext') {
    return quoteRanges.length > 0 ? { excludeRanges: quoteRanges } : undefined;
  }
  if (languageId === 'markdown') {
    const includeRanges: { start: number; end: number }[] = [];
    const re = /<!--[\s\S]*?-->/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      includeRanges.push({ start: m.index, end: m.index + m[0].length });
    }
    return { includeRanges, excludeRanges: [...excludedRanges, ...quoteRanges] };
  }
  return { includeRanges: commentRanges, excludeRanges: quoteRanges };
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
 * 解析スキップ理由
 */
export type AnalysisSkipReason = 'not-target-language' | 'document-too-large' | 'empty-content';

/**
 * 解析結果
 */
export interface AnalysisResult {
  /** 解析が最後まで実行されたか、途中でスキップされたか */
  status: 'completed' | 'skipped';
  /** status === 'skipped' の理由 */
  skipReason?: AnalysisSkipReason;
  tokens: Token[];
  diagnostics: LSPDiagnostic[];
  /** 診断上限で切り捨てた件数 */
  omittedDiagnostics: number;
  excludedRanges: ExcludedRange[];
  /**
   * 解析対象になった文字オフセット範囲（コード言語のコメント範囲）。
   * 未設定の場合は「全テキスト - excludedRanges」が解析対象。
   */
  includedRanges?: { start: number; end: number }[];
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
    ruleProfilingCollector?: RuleProfilingCollector,
    proofreadingConfig?: ProofreadingSettingsConfig
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
  if (languageId !== 'markdown' && languageId !== 'plaintext') {
    const tokens = await analyzeCommentRanges(commentRanges, mecabAnalyzer);
    const cacheHit = MeCabAnalyzer.getCacheStats().hits > cacheStatsBefore.hits;
    recordStep('形態素解析', Date.now() - start, `tokens=${tokens.length} cache=${cacheHit ? 'HIT' : 'MISS'}`);
    return tokens;
  }

  const tokens = await mecabAnalyzer.analyze(textToAnalyze);
  const cacheHit = MeCabAnalyzer.getCacheStats().hits > cacheStatsBefore.hits;
  recordStep('形態素解析', Date.now() - start, `tokens=${tokens.length} cache=${cacheHit ? 'HIT' : 'MISS'}`);
  return tokens;
}

async function analyzeCommentRanges(
  commentRanges: CommentRange[],
  mecabAnalyzer: MeCabAnalyzer
): Promise<Token[]> {
  const tokens: Token[] = [];
  for (const range of commentRanges) {
    if (!range.text.trim()) {
      continue;
    }

    const localTokens = await mecabAnalyzer.analyze(range.text);
    for (const token of localTokens) {
      if (token.surface.trim().length === 0) {
        continue;
      }
      tokens.push(new Token({
        surface: token.surface,
        pos: token.pos,
        posDetail1: token.posDetail1,
        posDetail2: token.posDetail2,
        posDetail3: token.posDetail3,
        conjugation: token.conjugation,
        conjugationForm: token.conjugationForm,
        baseForm: token.baseForm,
        reading: token.reading,
        pronunciation: token.pronunciation,
        start: range.start + token.start,
        end: range.start + token.end
      }));
    }
  }
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
  proofreadingDictionaries: ProofreadingDictionaryService;
}

async function runAdvancedRules(
  textToAnalyze: string,
  grammarTokens: Token[],
  languageId: SupportedLanguage,
  excludedRanges: ExcludedRange[],
  config: Configuration,
  advancedConfig: AdvancedRulesConfig,
  lightweightOnly: boolean,
  advancedRulesManager: AdvancedRulesManager,
  ruleProfilingCollector?: RuleProfilingCollector,
  precomputedLineStarts?: number[]
): Promise<Diagnostic[]> {
  const isMarkdown = languageId === 'markdown';
  const mdRanges = isMarkdown ? excludedRanges : undefined;
  const mdOptions = { analyzeTables: isMarkdown ? config.markdown.analyzeTables : undefined, config: advancedConfig };

  // Feature: parallel-advanced-rules
  // フラグ on かつ worker bundle が利用可能なら worker_threads で並列実行する。
  // フラグ off / 環境不適合の場合は async 協調版にフォールバックする。
  //
  // 軽量ルールは件数が少なく (20 件程度)、worker への serialize コストが
  // 並列化の利益を上回りやすいので、parallel パスは「フル実行」だけに適用する。
  const parallelEnabled = advancedConfig.parallelExecution?.enabled === true;
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
  advancedConfig: AdvancedRulesConfig,
  lightweightOnly: boolean,
  deps: GrammarCheckDeps,
  recordStep: RecordStep,
  ruleProfilingCollector?: RuleProfilingCollector,
  precomputedLineStarts?: number[],
  proofreadingConfig?: ProofreadingSettingsConfig,
  documentVersion: number = 0,
  documentUri: string = '',
  commentRanges: CommentRange[] = [],
  quoteRanges: ExcludedRange[] = [],
): Promise<LSPDiagnostic[]> {
  const basicStart = Date.now();
  const advancedStart = Date.now();
  const proofreadingStart = Date.now();

  // 3 系統を Promise.all で並行スケジュール。
  // advanced は内部で setImmediate yield するため、他系統が間に入りやすい。
  const [basicDiags, advancedDiags, proofreadingDiags, dictionaryResult] = await Promise.all([
    Promise.resolve().then(() => {
      const diags = deps.grammarChecker.check(grammarTokens, textToAnalyze, precomputedLineStarts);
      recordStep('基本ルール評価', Date.now() - basicStart, `件数=${diags.length}`);
      return diags;
    }),
    runAdvancedRules(
      textToAnalyze, grammarTokens, languageId, excludedRanges, config, advancedConfig,
      lightweightOnly, deps.advancedRulesManager, ruleProfilingCollector, precomputedLineStarts
    ).then((diags) => {
      // parallel パスが有効かを meta に出す (Feature: parallel-advanced-rules / REQ-10)
      const parallelOn = advancedConfig.parallelExecution?.enabled === true;
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
        textToAnalyze, grammarTokens, precomputedLineStarts, proofreadingConfig,
        languageId === 'markdown' ? excludedRanges : undefined
      );
      recordStep('校正ルール評価', Date.now() - proofreadingStart, `件数=${diags.length}`);
      return diags;
    }),
    (async () => {
      const settings = proofreadingConfig ?? deps.proofreadingRulesManager.getConfig();
      if (settings.dictionaries.proofreading.length === 0 && (!settings.categories.rule.enable || settings.dictionaries.rule.length === 0) && !settings.categories.spell.enable) return { diagnostics: [], errors: [], truncated: false };
      let blocked: Array<{ start: number; end: number }> = languageId === 'markdown'
        ? excludedRanges.filter(range =>
          !(range.type === 'table' && config.markdown.analyzeTables) &&
          !(range.type === 'code-block' && config.markdown.analyzeCodeBlocks))
        : [];
      if (languageId !== 'markdown' && languageId !== 'plaintext') {
        blocked = [];
        let cursor = 0;
        for (const range of commentRanges.slice().sort((a, b) => a.start - b.start)) {
          if (range.start > cursor) blocked.push({ start: cursor, end: range.start });
          cursor = Math.max(cursor, range.end);
        }
        if (cursor < textToAnalyze.length) blocked.push({ start: cursor, end: textToAnalyze.length });
      }
      blocked.push(...quoteRanges);
      const results = await Promise.all([
        deps.proofreadingDictionaries.check(textToAnalyze, documentUri, settings.dictionaries.proofreading, settings.categories.typo.checkInBrackets, blocked),
        deps.proofreadingDictionaries.check(textToAnalyze, documentUri, settings.categories.rule.enable ? settings.dictionaries.rule : [], true, blocked, 'rule'),
        settings.categories.spell.enable
          ? deps.proofreadingDictionaries.checkSpell(textToAnalyze, documentUri, settings.dictionaries.spell, blocked, settings.categories.spell)
          : Promise.resolve({ diagnostics: [], errors: [], truncated: false }),
      ]);
      return { diagnostics: results.flatMap(result => result.diagnostics), errors: results.flatMap(result => result.errors), truncated: results.some(result => result.truncated) };
    })(),
  ]);

  const diagnostics: LSPDiagnostic[] = [];
  // 診断は上限適用前に大量になり得る。引数展開はエンジンの引数上限を超える。
  for (const diagnostic of toLspDiagnostics(basicDiags, 'otak-lsp', documentVersion)) diagnostics.push(diagnostic);
  for (const diagnostic of toLspDiagnostics(advancedDiags, 'otak-lsp', documentVersion)) diagnostics.push(diagnostic);
  for (const diagnostic of toLspDiagnostics(proofreadingDiags, 'otak-lsp-proofreading', documentVersion)) diagnostics.push(diagnostic);
  for (const diagnostic of toLspDiagnostics(dictionaryResult.diagnostics, 'otak-lsp-proofreading', documentVersion)) diagnostics.push(diagnostic);
  for (const error of dictionaryResult.errors) {
    diagnostics.push(makeHintDiagnostic({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, 'dictionary-check-failed', error));
  }
  if (dictionaryResult.truncated) {
    diagnostics.push(makeHintDiagnostic({ start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, 'dictionary-truncated', '辞書の診断を上限で打ち切りました。'));
  }
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
  logger?: Logger,
  dictionaryExecutor?: DictionaryExecutor
): DocumentAnalyzer {
  function debugLog(message: string): void {
    logger?.debug(message);
  }

  const checkDeps: GrammarCheckDeps = {
    grammarChecker,
    advancedRulesManager,
    proofreadingRulesManager,
    proofreadingDictionaries: new ProofreadingDictionaryService(dictionaryExecutor ?? new DictionaryExecutor(), logger),
  };

  return {
    async analyze(
      document: TextDocument,
      config: Configuration,
      advancedConfig: AdvancedRulesConfig,
      lightweightOnly: boolean,
      profiler?: Profiler,
      ruleProfilingCollector?: RuleProfilingCollector,
      proofreadingConfig?: ProofreadingSettingsConfig
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
        return { status: 'skipped', skipReason: 'not-target-language', tokens: [], diagnostics: [], omittedDiagnostics: 0, excludedRanges: [], lineStarts, profileSteps };
      }

      // 巨大ファイルガード: 文字数が上限を超える文書は解析しない。
      // 形態素解析・ルール評価は文書長にほぼ比例してヒープを消費するため、
      // 生成物やミニファイ済みバンドル等を解析するとプロセスごと OOM し得る。
      // ここでスキップすることで、再起動直後に大量文書を再同期されても暴走しない。
      const maxChars = config.maxDocumentChars;
      if (typeof maxChars === 'number' && maxChars > 0 && text.length > maxChars) {
        debugLog(`Document too large (${text.length} > ${maxChars} chars), skipping analysis: ${document.uri}`);
        return {
          status: 'skipped',
          skipReason: 'document-too-large',
          tokens: [],
          diagnostics: [makeHintDiagnostic(
            { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
            'analysis-skipped',
            `文書サイズが上限（${maxChars.toLocaleString()}文字）を超えているため解析をスキップしています（現在 ${text.length.toLocaleString()}文字）。otakLsp.maxDocumentChars で上限を変更できます。`
          )],
          omittedDiagnostics: 0,
          excludedRanges: [],
          lineStarts,
          profileSteps,
        };
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
        return {
          status: 'skipped',
          skipReason: 'empty-content',
          tokens: [],
          diagnostics: [],
          omittedDiagnostics: 0,
          excludedRanges,
          includedRanges: commentRanges.length > 0 ? commentRanges.map((r) => ({ start: r.start, end: r.end })) : undefined,
          lineStarts,
          profileSteps,
        };
      }

      const allTokens = await runMorphologicalAnalysis(
        textToAnalyze, languageId, commentRanges, mecabAnalyzer, recordStep
      );
      debugLog(`Analysis complete, ${allTokens.length} tokens found`);

      const { semanticTokens: semanticTokensList, grammarTokens: grammarTokensList } =
        languageId === 'markdown'
          ? partitionMarkdownTokens(allTokens, excludedRanges, config, tokenFilter, recordStep)
          : { semanticTokens: allTokens, grammarTokens: allTokens };

      const quoteConfig = (proofreadingConfig ?? proofreadingRulesManager.getConfig()).categories.quoteLine;
      const quoteRanges = findQuoteLineRanges(text, languageId, commentRanges, excludedRanges, quoteConfig);
      const grammarText = quoteRanges.length > 0 ? buildMaskedTextByMaskRanges(textToAnalyze, quoteRanges) : textToAnalyze;
      const grammarTokens = quoteRanges.length > 0 ? tokenFilter.filterTokens(grammarTokensList, quoteRanges) : grammarTokensList;
      const grammarExcludedRanges = quoteRanges.length > 0
        ? [...excludedRanges, ...quoteRanges].sort((a, b) => a.start - b.start)
        : excludedRanges;

      let diagnostics: LSPDiagnostic[] = [];
      let omittedDiagnostics = 0;
      if (config.enableGrammarCheck) {
        // textToAnalyze は MarkdownFilter / keepOnlyCommentRanges どちらの経路でも
        // 改行と長さを保持するため、原文の lineStarts をそのまま使い回せる。
        diagnostics = await runGrammarChecks(
          grammarText, grammarTokens, languageId, grammarExcludedRanges, config, advancedConfig,
          lightweightOnly, checkDeps, recordStep, ruleProfilingCollector, lineStarts, proofreadingConfig,
          document.version, document.uri, commentRanges, quoteRanges
        );
        // 辞書の不完全な検査は通常の診断抑制や件数制限で隠さない。
        const dictionaryNotices = diagnostics.filter(d => d.source === 'otak-lsp' &&
          (d.code === 'dictionary-check-failed' || d.code === 'dictionary-truncated'));
        diagnostics = diagnostics.filter(d => !dictionaryNotices.includes(d));

        // インライン抑制ディレクティブ（otak-lsp-disable-next-line 等）を適用する。
        // 走査は原文 text に対して行い、コメント構文に依存しない。
        // ディレクティブが無ければ applySuppressions は即リターンする。
        const suppressStart = Date.now();
        const suppressionScan = parseSuppressionDirectives(
          text, buildDirectiveScope(text, languageId, commentRanges, excludedRanges, quoteRanges)
        );
        if (suppressionScan.hasDirectives) {
          const before = diagnostics.length;
          diagnostics = applySuppressions(diagnostics, suppressionScan);
          recordStep('抑制ディレクティブ適用', Date.now() - suppressStart, `抑制=${before - diagnostics.length}`);
        }

        // 無効な抑制ディレクティブ（コードとして解釈できないトークンを含む等）は
        // 抑制自体を適用しないが、ユーザーが修正できるよう警告診断にする。
        // これらは抑制対象外の Hint で、文書内のどのディレクティブよりも優先して残す。
        for (const inv of suppressionScan.invalidDirectives) {
          const lineStart = lineStarts[inv.line] ?? 0;
          const lineEnd = inv.line + 1 < lineStarts.length ? lineStarts[inv.line + 1] - 1 : text.length;
          diagnostics.push(makeHintDiagnostic(
            {
              start: { line: inv.line, character: 0 },
              end: { line: inv.line, character: Math.max(0, lineEnd - lineStart) },
            },
            'otak-lsp-invalid-directive',
            `otak-lsp-${inv.kind}: "${inv.offendingToken}" は診断コードとして解釈できません。このディレクティブは適用されていません。`
          ));
        }

        // 診断は文書位置順に並べてから上限で切り捨てる（ルール系統の実行順で
        // 偏らないようにする）。上限超過分は末尾に省略マーカーを付けて可視化する。
        diagnostics.sort((a, b) =>
          a.range.start.line - b.range.start.line
          || a.range.start.character - b.range.start.character
          || String(a.code).localeCompare(String(b.code))
        );
        const maxProblems = config.maxNumberOfProblems;
        if (typeof maxProblems === 'number' && maxProblems > 0 && diagnostics.length > maxProblems) {
          debugLog(`Diagnostics capped: ${diagnostics.length} -> ${maxProblems} for ${document.uri}`);
          const omitted = diagnostics.length - maxProblems;
          diagnostics = diagnostics.slice(0, maxProblems);
          const lastLine = lineStarts.length - 1;
          const lastChar = Math.max(0, text.length - (lineStarts[lastLine] ?? 0));
          diagnostics.push(makeHintDiagnostic(
            { start: { line: lastLine, character: lastChar }, end: { line: lastLine, character: lastChar } },
            'diagnostics-truncated',
            `診断が上限（${maxProblems.toLocaleString()}件）を超えたため、残り ${omitted.toLocaleString()} 件を省略しています。`
          ));
          omittedDiagnostics = omitted;
        }
        diagnostics.push(...dictionaryNotices);
      }

      return {
        status: 'completed',
        tokens: semanticTokensList,
        diagnostics,
        omittedDiagnostics,
        excludedRanges,
        includedRanges: commentRanges.length > 0 ? commentRanges.map((r) => ({ start: r.start, end: r.end })) : undefined,
        lineStarts,
        profileSteps,
      };
    },
  };
}

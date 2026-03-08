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
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { Configuration, Token, SupportedLanguage, Diagnostic } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { AdvancedRulesConfig, RuleProfilingCollector } from '../../../shared/src/advancedTypes';
import { Profiler, ProfileStep } from './profiler';
import { convertSeverity } from './diagnosticsPublisher';
import { computeLineStarts } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { isEmpty, isNotEmpty } from '../utils/arrayUtils';

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
    if (logger) {
      logger.debug(message);
    }
  }

  return {
    async analyze(
      document: TextDocument,
      config: Configuration,
      advancedConfig: AdvancedRulesConfig,
      lightweightOnly: boolean,
      profiler?: Profiler,
      ruleProfilingCollector?: RuleProfilingCollector
    ): Promise<AnalysisResult> {
      const text = document.getText();
      const languageId = document.languageId as SupportedLanguage;
      const profileSteps: ProfileStep[] = [];
      const isProfileEnabled = profiler?.isEnabled() ?? false;

      const lineStartsStart = isProfileEnabled ? Date.now() : 0;
      const lineStarts = computeLineStarts(text);
      if (isProfileEnabled) {
        profileSteps.push({ name: '行開始位置計算', ms: Date.now() - lineStartsStart });
      }

      // 言語がサポートされているか確認
      if (!config.targetLanguages.includes(languageId)) {
        debugLog(`Language ${languageId} not in target languages, skipping`);
        return { tokens: [], diagnostics: [], excludedRanges: [], lineStarts, profileSteps };
      }

      // 解析対象テキストを抽出
      let textToAnalyze = text;
      let excludedRanges: ExcludedRange[] = [];

      if (languageId !== 'markdown' && languageId !== 'plaintext') {
        // コードファイルの場合はコメントのみ抽出
        const commentStart = isProfileEnabled ? Date.now() : 0;
        const comments = commentExtractor.extract(text, languageId);
        textToAnalyze = comments.map((c) => c.text).join('\n');
        if (isProfileEnabled) {
          profileSteps.push({ name: 'コメント抽出', ms: Date.now() - commentStart, meta: `件数=${comments.length}` });
        }
        debugLog(`Extracted ${comments.length} comments`);
      } else if (languageId === 'markdown') {
        // Markdownの場合はフィルタを適用
        const filterStart = isProfileEnabled ? Date.now() : 0;
        const filterResult = markdownFilter.filter(textToAnalyze, {
          ...markdownFilter.getConfig(),
          preserveCodeBlockContent: config.markdown.analyzeCodeBlocks,
        });
        textToAnalyze = filterResult.filteredText;
        excludedRanges = filterResult.excludedRanges;
        if (isProfileEnabled) {
          profileSteps.push({ name: 'Markdownフィルタ', ms: Date.now() - filterStart, meta: `除外=${excludedRanges.length}` });
        }
        debugLog(`Markdown filtered: ${excludedRanges.length} ranges excluded`);
      }

      // 空テキストはスキップ
      if (!textToAnalyze.trim()) {
        debugLog(`No text to analyze, skipping`);
        return { tokens: [], diagnostics: [], excludedRanges, lineStarts, profileSteps };
      }

      // 形態素解析（キャッシュ付き）
      const mecabStart = isProfileEnabled ? Date.now() : 0;
      const cacheStatsBefore = MeCabAnalyzer.getCacheStats();
      const allTokens = await mecabAnalyzer.analyze(textToAnalyze);
      const cacheStatsAfter = MeCabAnalyzer.getCacheStats();
      const cacheHit = cacheStatsAfter.hits > cacheStatsBefore.hits;
      if (isProfileEnabled) {
        profileSteps.push({
          name: '形態素解析',
          ms: Date.now() - mecabStart,
          meta: `tokens=${allTokens.length} cache=${cacheHit ? 'HIT' : 'MISS'}`
        });
      }
      debugLog(`Analysis complete, ${allTokens.length} tokens found (cache: ${cacheHit ? 'HIT' : 'MISS'})`);

      // トークンフィルタリング
      let semanticTokensList: Token[] = allTokens;
      let grammarTokensList: Token[] = allTokens;

      if (languageId === 'markdown') {
        const tokenFilterStart = isProfileEnabled ? Date.now() : 0;

        // セマンティックハイライト用のフィルタリング
        if (config.enableSemanticHighlight) {
          let semanticExcludedRanges = excludedRanges;
          if (config.excludeTableDelimiters !== false) {
            semanticExcludedRanges = semanticExcludedRanges.filter((r) => r.type !== 'table');
          }
          if (config.markdown.analyzeCodeBlocks) {
            semanticExcludedRanges = semanticExcludedRanges.filter((r) => r.type !== 'code-block');
          }
          if (isNotEmpty(semanticExcludedRanges)) {
            semanticTokensList = tokenFilter.filterTokens(allTokens, semanticExcludedRanges);
          }
        }

        // 文法チェック用のフィルタリング
        if (config.enableGrammarCheck) {
          let grammarExcludedRanges = config.markdown.analyzeCodeBlocks
            ? excludedRanges.filter((r) => r.type !== 'code-block')
            : excludedRanges;
          if (config.markdown.analyzeTables) {
            grammarExcludedRanges = grammarExcludedRanges.filter((r) => r.type !== 'table');
          }
          if (isNotEmpty(grammarExcludedRanges)) {
            grammarTokensList = tokenFilter.filterTokens(allTokens, grammarExcludedRanges);
          }
        }

        if (isProfileEnabled) {
          profileSteps.push({ name: 'トークンフィルタ', ms: Date.now() - tokenFilterStart });
        }
      }

      // 文法チェック
      const diagnostics: LSPDiagnostic[] = [];

      if (config.enableGrammarCheck) {
        // 基本文法ルール
        const basicStart = isProfileEnabled ? Date.now() : 0;
        const grammarDiagnostics = grammarChecker.check(grammarTokensList, textToAnalyze);
        if (isProfileEnabled) {
          profileSteps.push({ name: '基本ルール評価', ms: Date.now() - basicStart, meta: `件数=${grammarDiagnostics.length}` });
        }
        debugLog(`Basic grammar check found ${grammarDiagnostics.length} issues`);

        for (const diag of grammarDiagnostics) {
          diagnostics.push({
            severity: convertSeverity(diag.severity),
            range: {
              start: { line: diag.range.start.line, character: diag.range.start.character },
              end: { line: diag.range.end.line, character: diag.range.end.character },
            },
            message: diag.message,
            source: 'otak-lsp',
            code: diag.code,
          });
        }

        // 高度文法ルール
        const advancedStart = isProfileEnabled ? Date.now() : 0;
        let advancedDiagnostics: Diagnostic[];

        if (lightweightOnly) {
          advancedDiagnostics = languageId === 'markdown'
            ? advancedRulesManager.checkLightweightRules(
                textToAnalyze,
                grammarTokensList,
                excludedRanges,
                { analyzeTables: config.markdown.analyzeTables },
                ruleProfilingCollector
              )
            : advancedRulesManager.checkLightweightRules(
                textToAnalyze,
                grammarTokensList,
                undefined,
                undefined,
                ruleProfilingCollector
              );
          if (isProfileEnabled) {
            profileSteps.push({ name: '軽量ルール評価', ms: Date.now() - advancedStart, meta: `件数=${advancedDiagnostics.length}` });
          }
        } else {
          advancedDiagnostics = languageId === 'markdown'
            ? advancedRulesManager.checkText(
                textToAnalyze,
                grammarTokensList,
                excludedRanges,
                { analyzeTables: config.markdown.analyzeTables },
                ruleProfilingCollector
              )
            : advancedRulesManager.checkText(
                textToAnalyze,
                grammarTokensList,
                undefined,
                undefined,
                ruleProfilingCollector
              );
          if (isProfileEnabled) {
            profileSteps.push({ name: '高度ルール評価', ms: Date.now() - advancedStart, meta: `件数=${advancedDiagnostics.length}` });
          }
        }
        debugLog(`Advanced grammar check found ${advancedDiagnostics.length} issues`);

        for (const diag of advancedDiagnostics) {
          diagnostics.push({
            severity: convertSeverity(diag.severity),
            range: {
              start: { line: diag.range.start.line, character: diag.range.start.character },
              end: { line: diag.range.end.line, character: diag.range.end.character },
            },
            message: diag.message,
            source: 'otak-lsp',
            code: diag.code,
          });
        }

        // 校正ルール
        const proofreadingStart = isProfileEnabled ? Date.now() : 0;
        const proofreadingDiagnostics = proofreadingRulesManager.checkText(textToAnalyze, grammarTokensList);
        if (isProfileEnabled) {
          profileSteps.push({ name: '校正ルール評価', ms: Date.now() - proofreadingStart, meta: `件数=${proofreadingDiagnostics.length}` });
        }
        debugLog(`Proofreading rules check found ${proofreadingDiagnostics.length} issues`);

        for (const diag of proofreadingDiagnostics) {
          diagnostics.push({
            severity: convertSeverity(diag.severity),
            range: {
              start: { line: diag.range.start.line, character: diag.range.start.character },
              end: { line: diag.range.end.line, character: diag.range.end.character },
            },
            message: diag.message,
            source: 'otak-lsp-proofreading',
            code: diag.code,
          });
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

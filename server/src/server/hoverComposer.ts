/**
 * Hover レスポンスの組み立て
 *
 * 形態素ホバー情報 + 用語図鑑 + 文複雑度メトリクスを合成する。
 */

import { Hover, TextDocumentPositionParams, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider, HoverOptions } from '../hover/provider';
import { SentenceParser } from '../grammar/sentenceParser';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';
import { Configuration, SupportedLanguage, Token } from '../../../shared/src/types';
import { DocumentCacheEntry, DocumentCacheStore } from './documentCacheStore';
import { hasMinLength } from '../utils/stringUtils';
import { isNotEmpty } from '../utils/arrayUtils';

export interface HoverComposerDeps {
  documents: TextDocuments<TextDocument>;
  cacheStore: DocumentCacheStore;
  hoverProvider: HoverProvider;
  sentenceComplexityRule: SentenceComplexityRule;
  advancedRulesManager?: AdvancedRulesManager;
  getAdvancedConfig: () => AdvancedRulesConfig;
  /** 解析設定を取得する。指定時は OFF/対象外言語/解析範囲外のホバーを抑止する。 */
  getConfig?: (uri: string) => Configuration;
  hoverOptions?: HoverOptions;
}

/**
 * 指定オフセットが「実際に解析された範囲」に含まれるか判定する。
 * - includedRanges がある（コード言語のコメントのみ解析）場合はその内側のみ true。
 * - それ以外は excludedRanges の外側が解析対象。
 *   ただし設定で解析対象に戻されている種別（code-block/table）は除外から外す。
 */
function isOffsetAnalyzed(offset: number, entry: DocumentCacheEntry, config?: Configuration): boolean {
  if (entry.includedRanges) {
    return entry.includedRanges.some((r) => offset >= r.start && offset < r.end);
  }
  const effectiveExcluded = entry.excludedRanges.filter((r) => {
    if (r.type === 'code-block' && config?.markdown?.analyzeCodeBlocks) return false;
    if (r.type === 'table' && (config?.excludeTableDelimiters !== false || config?.markdown?.analyzeTables)) return false;
    return true;
  });
  return !effectiveExcluded.some((r) => offset >= r.start && offset < r.end);
}

function classifyComplexityLevel(score: number): string {
  if (score <= 25) return '低';
  if (score <= 50) return '中';
  if (score <= 75) return '高';
  return '非常に高';
}

function buildComplexityInfo(
  documentText: string,
  tokens: Token[],
  offset: number,
  sentenceComplexityRule: SentenceComplexityRule,
  advancedConfig: AdvancedRulesConfig
): string {
  const sentences = SentenceParser.parseSentences(documentText, tokens);
  const currentSentence = sentences.find((s) => offset >= s.start && offset < s.end);
  if (!currentSentence || !hasMinLength(currentSentence.text, 10)) {
    return '';
  }

  const metrics = sentenceComplexityRule.calculateMetrics(currentSentence, advancedConfig);
  const level = classifyComplexityLevel(metrics.score);

  const details: string[] = [
    `文字数: ${metrics.characterCount}`,
    `読点: ${metrics.commaCount}`,
  ];
  if (metrics.clauseDepth > 0) {
    details.push(`節深度: ${metrics.clauseDepth}`);
  }
  if (metrics.maxNoChainLength > 1) {
    details.push(`の連続: ${metrics.maxNoChainLength}`);
  }
  if (metrics.maxNounChainLength > 2) {
    details.push(`名詞連続: ${metrics.maxNounChainLength}`);
  }

  return `\n\n---\n\n**文複雑度**: ${metrics.score}/100（${level}）\n\n${details.join(' | ')}`;
}

export async function composeHoverResponse(
  params: TextDocumentPositionParams,
  deps: HoverComposerDeps
): Promise<Hover | null> {
  const uri = params.textDocument.uri;
  const tokens = deps.cacheStore.getTokens(uri) ?? [];
  const document = deps.documents.get(uri);

  if (!document) {
    return null;
  }

  // Issue #14: OFF/対象外言語/解析範囲外の位置ではホバーを出さない。
  // 拒否対象はここで早期 return するため、HoverProvider/Wikipedia への問い合わせは発生しない。
  const config = deps.getConfig?.(uri);
  if (config) {
    if (!config.enableGrammarCheck && !config.enableSemanticHighlight) {
      return null;
    }
    if (!config.targetLanguages.includes(document.languageId as SupportedLanguage)) {
      return null;
    }
  }

  // スキップ時にも空トークンのキャッシュは作成される。存在確認だけでは
  // 未解析文書のフォールバック検索を防げないため、トークンと本文を照合する。
  const entry = deps.cacheStore.getEntry(uri);
  if (!entry || entry.tokens.length === 0 || entry.text !== document.getText()) {
    return null;
  }
  const offset = document.offsetAt(params.position);
  if (!isOffsetAnalyzed(offset, entry, config)) {
    return null;
  }

  const documentText = deps.cacheStore.getText(uri) ?? document.getText();
  const hoverResult = await deps.hoverProvider.provideHover(tokens, offset, documentText, deps.hoverOptions);

  let complexityInfo = '';
  if (isNotEmpty(tokens) && documentText && deps.advancedRulesManager) {
    complexityInfo = buildComplexityInfo(
      documentText,
      tokens,
      offset,
      deps.sentenceComplexityRule,
      deps.getAdvancedConfig()
    );
  }

  if (!hoverResult && !complexityInfo) {
    return null;
  }

  const contents = (hoverResult?.contents ?? '') + complexityInfo;

  let range = hoverResult?.range;
  if (!range && isNotEmpty(tokens)) {
    const token = tokens.find((t) => offset >= t.start && offset < t.end);
    if (token) {
      range = { start: token.start, end: token.end };
    }
  }

  if (!range) {
    return null;
  }

  return {
    contents: {
      kind: 'markdown',
      value: contents,
    },
    range: {
      start: document.positionAt(range.start),
      end: document.positionAt(range.end),
    },
  };
}

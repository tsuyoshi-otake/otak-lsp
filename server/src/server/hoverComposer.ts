/**
 * Hover レスポンスの組み立て
 *
 * 形態素ホバー情報 + 用語図鑑 + 文複雑度メトリクスを合成する。
 */

import { Hover, TextDocumentPositionParams, TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { HoverProvider } from '../hover/provider';
import { SentenceParser } from '../grammar/sentenceParser';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';
import { Token } from '../../../shared/src/types';
import { DocumentCacheStore } from './documentCacheStore';
import { hasMinLength } from '../utils/stringUtils';
import { isNotEmpty } from '../utils/arrayUtils';

export interface HoverComposerDeps {
  documents: TextDocuments<TextDocument>;
  cacheStore: DocumentCacheStore;
  hoverProvider: HoverProvider;
  sentenceComplexityRule: SentenceComplexityRule;
  advancedRulesManager?: AdvancedRulesManager;
  getAdvancedConfig: () => AdvancedRulesConfig;
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

  const offset = document.offsetAt(params.position);
  const documentText = deps.cacheStore.getText(uri) ?? document.getText();
  const hoverResult = await deps.hoverProvider.provideHover(tokens, offset, documentText);

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

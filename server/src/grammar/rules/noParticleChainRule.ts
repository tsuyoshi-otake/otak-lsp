/**
 * No Particle Chain Rule
 * 助詞「の」の連続使用を検出する
 * Feature: additional-grammar-rules
 * 要件: 3.1, 3.2, 3.3, 3.4
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  NoParticleChain,
  Sentence
} from '../../../../shared/src/advancedTypes';
import { isNotEmpty } from '../../utils/arrayUtils';

/**
 * 助詞「の」連続使用検出ルール
 */
export class NoParticleChainRule implements AdvancedGrammarRule {
  name = 'no-particle-chain';
  description = '助詞「の」の連続使用を検出します';

  /**
   * 連続判定で「境界」として扱う文字
   * - 括弧内は補足情報であることが多く、本文と同一チェーンにすると誤検知が増えるため
   */
  private static readonly CHAIN_BOUNDARY_PATTERN = /[（）()]/;

  /**
   * 「の」同士を同一チェーンとして扱う最大距離（文字オフセット差）
   */
  private static readonly DEFAULT_MAX_GAP = 20;

  /**
   * テキストから助詞「の」の連続を検出
   * @param text テキスト（documentText）
   * @param sentences 文リスト（SentenceParserの結果）
   * @param threshold 閾値
   * @returns 検出された連続使用のリスト
   */
  detectNoChains(text: string, sentences: Sentence[], threshold: number): NoParticleChain[] {
    const results: NoParticleChain[] = [];

    for (const sentence of sentences) {
      if (!sentence.text.trim()) continue;

      const noTokens = sentence.tokens
        .filter((t) => t.surface === 'の')
        .sort((a, b) => a.start - b.start);

      if (noTokens.length < threshold) continue;

      // 連続した「の」を検出
      let chainStart = 0;
      let chainCount = 1;

      for (let i = 1; i < noTokens.length; i++) {
        const prev = noTokens[i - 1];
        const current = noTokens[i];
        const gap = current.start - prev.start;
        const between = text.slice(prev.end, current.start);

        // 「の」の間に他のテキストがある場合（最大20文字程度）
        // ただし括弧をまたぐ場合は補足情報として扱い、チェーンを分断する
        if (gap <= NoParticleChainRule.DEFAULT_MAX_GAP && !NoParticleChainRule.CHAIN_BOUNDARY_PATTERN.test(between)) {
          chainCount++;
        } else {
          // 連続が途切れた
          if (chainCount >= threshold) {
            const startOffset = noTokens[chainStart].start;
            const endOffset = noTokens[i - 1].end;
            const chainText = text.substring(startOffset, endOffset);
            results.push(this.createChain(chainText, chainCount, startOffset, endOffset));
          }
          chainStart = i;
          chainCount = 1;
        }
      }

      // 最後のチェーンを確認
      if (chainCount >= threshold) {
        const startOffset = noTokens[chainStart].start;
        const endOffset = noTokens[noTokens.length - 1].end;
        const chainText = text.substring(startOffset, endOffset);
        results.push(this.createChain(chainText, chainCount, startOffset, endOffset));
      }
    }

    return results;
  }

  /**
   * チェーン情報を作成
   */
  private createChain(_text: string, count: number, start: number, end: number): NoParticleChain {
    return {
      tokens: [],
      chainLength: count,
      range: {
        start: { line: 0, character: start },
        end: { line: 0, character: end }
      },
      suggestions: this.generateSuggestions(count)
    };
  }

  /**
   * 修正提案を生成
   */
  private generateSuggestions(_count: number): string[] {
    return [
      '文を分割して「の」の使用回数を減らす',
      '一部を別の表現に置き換える（例：「における」「に関する」）',
      '主語を明確にして文を書き換える'
    ];
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.noParticleChainThreshold || 3;

    const sentences =
      isNotEmpty(context.sentences)
        ? context.sentences
        : [new Sentence({ text: context.documentText, tokens, start: 0, end: context.documentText.length })];

    const chains = this.detectNoChains(context.documentText, sentences, threshold);

    for (const chain of chains) {
      diagnostics.push(new AdvancedDiagnostic({
        range: chain.range,
        message: `助詞「の」が${chain.chainLength}回連続しています（閾値: ${threshold}回）。文の書き換えを検討してください。`,
        code: 'no-particle-chain',
        ruleName: this.name,
        suggestions: chain.suggestions
      }));
    }

    return diagnostics;
  }

  /**
   * ルールが有効かどうかを確認
   * @param config 設定
   * @returns 有効な場合true
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableNoParticleChain;
  }
}

/**
 * No Particle Chain Rule
 * 助詞「の」の連続使用を検出する
 * Feature: additional-grammar-rules
 * 要件: 3.1, 3.2, 3.3, 3.4
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  NoParticleChain
} from '../../../../shared/src/advancedTypes';

/**
 * 助詞「の」連続使用検出ルール
 */
export class NoParticleChainRule implements AdvancedGrammarRule {
  name = 'no-particle-chain';
  description = '助詞「の」の連続使用を検出します';

  /**
   * テキストから助詞「の」の連続を検出
   * @param text テキスト
   * @param threshold 閾値
   * @returns 検出された連続使用のリスト
   */
  detectNoChains(text: string, threshold: number): NoParticleChain[] {
    const results: NoParticleChain[] = [];

    // 「の」で分割してカウント
    // 例: "東京の会社の部長の息子" → ["東京", "会社", "部長", "息子"] (4パート = 3回の「の」)
    const sentences = text.split(/[。！？!?\n]/);

    for (const sentence of sentences) {
      if (!sentence.trim()) continue;

      // 「の」の出現位置を取得
      const noPositions: number[] = [];
      let searchIndex = 0;
      const sentenceStart = text.indexOf(sentence);

      while (true) {
        const index = sentence.indexOf('の', searchIndex);
        if (index === -1) break;
        noPositions.push(sentenceStart + index);
        searchIndex = index + 1;
      }

      if (noPositions.length < threshold) continue;

      // 連続した「の」を検出
      let chainStart = 0;
      let chainCount = 1;

      for (let i = 1; i < noPositions.length; i++) {
        const gap = noPositions[i] - noPositions[i - 1];
        // 「の」の間に他のテキストがある場合（最大20文字程度）
        if (gap <= 20) {
          chainCount++;
        } else {
          // 連続が途切れた
          if (chainCount >= threshold) {
            const chainText = text.substring(noPositions[chainStart], noPositions[i - 1] + 1);
            results.push(this.createChain(chainText, chainCount, noPositions[chainStart], noPositions[i - 1] + 1));
          }
          chainStart = i;
          chainCount = 1;
        }
      }

      // 最後のチェーンを確認
      if (chainCount >= threshold) {
        const chainText = text.substring(noPositions[chainStart], noPositions[noPositions.length - 1] + 1);
        results.push(this.createChain(chainText, chainCount, noPositions[chainStart], noPositions[noPositions.length - 1] + 1));
      }
    }

    return results;
  }

  /**
   * チェーン情報を作成
   */
  private createChain(text: string, count: number, start: number, end: number): NoParticleChain {
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
  private generateSuggestions(count: number): string[] {
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
    const chains = this.detectNoChains(context.documentText, threshold);

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

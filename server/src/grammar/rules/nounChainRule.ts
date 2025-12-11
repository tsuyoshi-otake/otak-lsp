/**
 * NounChainRule
 * 名詞の連続を検出する
 * Feature: remaining-grammar-rules
 * 要件: 10.1, 10.2, 10.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  NounChain
} from '../../../../shared/src/advancedTypes';

/**
 * 名詞連続パターン（読みにくい例）
 */
const NOUN_CHAIN_PATTERNS: Map<string, string> = new Map([
  ['東京都渋谷区松濤一丁目住所', '「東京都渋谷区松濤一丁目の住所」のように助詞を挿入'],
  ['品質管理体制強化計画書', '「品質管理体制の強化計画書」のように分割'],
  ['情報システム管理者連絡先', '「情報システム管理者の連絡先」のように分割'],
  ['顧客満足度向上施策検討会議', '「顧客満足度向上のための施策検討会議」のように分割']
]);

/**
 * 名詞連続検出ルール
 */
export class NounChainRule implements AdvancedGrammarRule {
  name = 'noun-chain';
  description = '名詞の連続による読みにくさを検出します';

  /**
   * テキストから名詞連続を検出
   * @param text テキスト
   * @param tokens トークンリスト
   * @param threshold 閾値
   * @returns 検出された名詞連続のリスト
   */
  detectNounChains(text: string, tokens: Token[], threshold: number): NounChain[] {
    const results: NounChain[] = [];

    // パターンマッチング（既知の問題パターン）
    for (const [pattern, suggestion] of NOUN_CHAIN_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          nouns: [],
          chainLength: pattern.length,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          },
          suggestion
        });
        index = text.indexOf(pattern, index + 1);
      }
    }

    // トークンベースの名詞連続検出
    if (tokens.length > 0) {
      let consecutiveNouns: Token[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        if (token.isNoun()) {
          consecutiveNouns.push(token);
        } else {
          // 名詞連続が終了
          if (consecutiveNouns.length >= threshold) {
            const firstNoun = consecutiveNouns[0];
            const lastNoun = consecutiveNouns[consecutiveNouns.length - 1];

            // 既にパターンマッチで検出済みでないか確認
            const alreadyDetected = results.some(r =>
              r.range.start.character <= firstNoun.start &&
              r.range.end.character >= lastNoun.end
            );

            if (!alreadyDetected) {
              results.push({
                nouns: [...consecutiveNouns],
                chainLength: consecutiveNouns.length,
                range: {
                  start: { line: 0, character: firstNoun.start },
                  end: { line: 0, character: lastNoun.end }
                },
                suggestion: '名詞の間に助詞を挿入して読みやすくしてください'
              });
            }
          }
          consecutiveNouns = [];
        }
      }

      // 最後の連続をチェック
      if (consecutiveNouns.length >= threshold) {
        const firstNoun = consecutiveNouns[0];
        const lastNoun = consecutiveNouns[consecutiveNouns.length - 1];

        const alreadyDetected = results.some(r =>
          r.range.start.character <= firstNoun.start &&
          r.range.end.character >= lastNoun.end
        );

        if (!alreadyDetected) {
          results.push({
            nouns: [...consecutiveNouns],
            chainLength: consecutiveNouns.length,
            range: {
              start: { line: 0, character: firstNoun.start },
              end: { line: 0, character: lastNoun.end }
            },
            suggestion: '名詞の間に助詞を挿入して読みやすくしてください'
          });
        }
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const threshold = context.config.nounChainThreshold;
    const errors = this.detectNounChains(context.documentText, tokens, threshold);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `名詞が連続して読みにくくなっています。${error.suggestion}`,
        code: 'noun-chain',
        ruleName: this.name,
        suggestions: [error.suggestion]
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
    return config.enableNounChain;
  }
}

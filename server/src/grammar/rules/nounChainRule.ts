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

  private shouldIgnoreAsLabel(text: string, startOffset: number, endOffset: number): boolean {
    const clamp = (n: number) => Math.max(0, Math.min(n, text.length));
    const start = clamp(startOffset);
    const end = clamp(endOffset);
    if (end <= start) {
      return false;
    }

    // 行頭（ブロッククォート/箇条書きマーカーを除いた先頭）に現れる「ラベル: 説明」形式は許容する
    // 例: **IPA辞書内蔵**: npm installだけですぐに使えます
    const lineStart = Math.max(
      text.lastIndexOf('\n', start - 1),
      text.lastIndexOf('\r', start - 1)
    ) + 1;
    let lineEnd = text.indexOf('\n', start);
    const crEnd = text.indexOf('\r', start);
    if (lineEnd === -1 || (crEnd !== -1 && crEnd < lineEnd)) {
      lineEnd = crEnd;
    }
    if (lineEnd === -1) {
      lineEnd = text.length;
    }

    const line = text.slice(lineStart, lineEnd);
    let contentLocalIndex = line.search(/[^\t ]/);
    if (contentLocalIndex === -1) {
      return false;
    }

    // 先頭のブロッククォート/箇条書きマーカーは除外してラベル判定する（MarkdownFilter がマーカーを保持するため）
    const listMatch =
      line.match(/^(\s*(?:>\s*)*)(\s*[-*+]\s+)/) ||
      line.match(/^(\s*(?:>\s*)*)(\s*\d+\.\s+)/);
    if (listMatch) {
      contentLocalIndex = listMatch[1].length + listMatch[2].length;
    } else {
      const blockquoteMatch = line.match(/^\s*(?:>\s*)+/);
      if (blockquoteMatch) {
        contentLocalIndex = blockquoteMatch[0].length;
      }
    }
    while (contentLocalIndex < line.length && /[ \t]/.test(line[contentLocalIndex])) {
      contentLocalIndex++;
    }

    const contentStart = lineStart + contentLocalIndex;

    // チェーンが行頭ラベルの範囲外（途中から始まっている）なら対象外
    if (start < contentStart) {
      return false;
    }

    const restOfLine = text.slice(contentStart, lineEnd);
    const colonMatch = /[:：]/.exec(restOfLine);
    if (!colonMatch || colonMatch.index === undefined) {
      return false;
    }

    const colonLocalIndex = colonMatch.index;
    if (colonLocalIndex > 40) {
      return false;
    }

    const colonOffset = contentStart + colonLocalIndex;
    if (colonOffset + 1 < end) {
      return false;
    }

    // チェーンがラベル範囲内に収まっていないなら対象外
    if (start > colonOffset + 1) {
      return false;
    }

    const label = restOfLine.slice(0, colonLocalIndex);
    if (/[ \t]/.test(label)) {
      return false;
    }

    let core = label;
    if ((core.startsWith('**') && core.endsWith('**')) || (core.startsWith('__') && core.endsWith('__'))) {
      core = core.slice(2, -2);
    }
    if (core.trim().length === 0) {
      return false;
    }

    return true;
  }

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
      const startOffset = error.range.start.character;
      const endOffset = error.range.end.character;
      if (this.shouldIgnoreAsLabel(context.documentText, startOffset, endOffset)) {
        continue;
      }
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

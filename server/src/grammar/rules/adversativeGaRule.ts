/**
 * Adversative Ga Rule
 * 逆接の「が」の連続使用を検出する
 * Feature: advanced-grammar-rules
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';

/**
 * 逆接「が」検出ルール
 * 格助詞の「が」（主語を示す）と逆接の「が」を区別する
 */
export class AdversativeGaRule implements AdvancedGrammarRule {
  name = 'adversative-ga';
  description = '逆接の「が」の連続使用を検出します';

  /**
   * 「が」が逆接として使用されているかを判定
   * 逆接の「が」は通常、述語の後に来る
   */
  isAdversativeGa(token: Token, prevToken: Token | null): boolean {
    if (token.surface !== 'が' || token.pos !== '助詞') {
      return false;
    }

    // 前のトークンが動詞、形容詞、助動詞の場合は逆接の可能性が高い
    if (prevToken) {
      if (prevToken.pos === '動詞' || prevToken.pos === '形容詞' || prevToken.pos === '助動詞') {
        return true;
      }
      // 「ですが」「ますが」のパターン
      if (prevToken.surface === 'です' || prevToken.surface === 'ます') {
        return true;
      }
    }

    return false;
  }

  /**
   * 文内の逆接の「が」を検出
   */
  findAdversativeGa(sentence: Sentence): Token[] {
    const adversativeGas: Token[] = [];
    const tokens = sentence.tokens;

    for (let i = 0; i < tokens.length; i++) {
      const prevToken = i > 0 ? tokens[i - 1] : null;
      if (this.isAdversativeGa(tokens[i], prevToken)) {
        adversativeGas.push(tokens[i]);
      }
    }

    return adversativeGas;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const sentences = context.sentences;

    // 連続する文での逆接「が」使用をチェック
    for (let i = 1; i < sentences.length; i++) {
      const currentGas = this.findAdversativeGa(sentences[i]);
      const prevGas = this.findAdversativeGa(sentences[i - 1]);

      if (currentGas.length > 0 && prevGas.length > 0) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: currentGas[0].start },
            end: { line: 0, character: currentGas[0].end }
          },
          message: '逆接の「が」が連続する文で使用されています。文の分割や接続詞の変更を検討してください。',
          code: 'adversative-ga',
          ruleName: this.name,
          suggestions: ['文を分割する', '「しかし」「けれども」などの接続詞に変更する']
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAdversativeGa;
  }
}

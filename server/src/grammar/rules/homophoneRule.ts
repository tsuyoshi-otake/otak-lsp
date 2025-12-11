/**
 * HomophoneRule
 * 同音異義語の誤用を検出する
 * Feature: remaining-grammar-rules
 * 要件: 4.1, 4.2, 4.3
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  HomophoneError
} from '../../../../shared/src/advancedTypes';

/**
 * 同音異義語の誤用パターン
 * キー: 誤用パターン、値: 正しい表現と説明
 */
const HOMOPHONE_ERROR_PATTERNS: Map<string, { correct: string[]; explanation: string }> = new Map([
  ['意志が低い', {
    correct: ['意識が低い', '志が低い'],
    explanation: '「意志」は決意や意図、「意識」は認識や自覚を意味します'
  }],
  ['異動の制約', {
    correct: ['移動の制約'],
    explanation: '物理的な移動には「移動」、人事には「異動」を使用します'
  }],
  ['移動の制約', {
    correct: ['異動の制約'],
    explanation: '人事異動の文脈では「異動」を使用します'
  }],
  ['移動の辞令', {
    correct: ['異動の辞令'],
    explanation: '人事関連には「異動」を使用します'
  }],
  ['以外に多い', {
    correct: ['意外に多い'],
    explanation: '予想外を表す場合は「意外」を使用します'
  }],
  ['意外の人', {
    correct: ['以外の人'],
    explanation: '〜を除いてを表す場合は「以外」を使用します'
  }],
  ['過程が良い', {
    correct: ['家庭が良い'],
    explanation: '家族関係を表す場合は「家庭」を使用します'
  }],
  ['家庭で作る', {
    correct: ['過程で作る'],
    explanation: 'プロセスを表す場合は「過程」を使用します'
  }],
  ['完了の報告', {
    correct: ['感慨深い'],
    explanation: '文脈を確認してください'
  }]
]);

/**
 * 同音異義語検出ルール
 */
export class HomophoneRule implements AdvancedGrammarRule {
  name = 'homophone';
  description = '同音異義語の誤用を検出します';

  /**
   * テキストから同音異義語の誤用を検出
   * @param text テキスト
   * @returns 検出された同音異義語エラーのリスト
   */
  detectHomophoneErrors(text: string): HomophoneError[] {
    const results: HomophoneError[] = [];

    for (const [pattern, info] of HOMOPHONE_ERROR_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        results.push({
          used: pattern,
          expected: info.correct,
          reading: '',
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          },
          context: info.explanation
        });
        index = text.indexOf(pattern, index + 1);
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
    const errors = this.detectHomophoneErrors(context.documentText);

    for (const error of errors) {
      diagnostics.push(new AdvancedDiagnostic({
        range: error.range,
        message: `同音異義語「${error.used}」の使い方を確認してください。${error.context}`,
        code: 'homophone',
        ruleName: this.name,
        suggestions: error.expected
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
    return config.enableHomophone;
  }
}

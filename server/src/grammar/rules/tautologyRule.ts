/**
 * Tautology Rule
 * 重複表現（同語反復）を検出する
 * Feature: additional-grammar-rules
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Tautology
} from '../../../../shared/src/advancedTypes';

/**
 * 重複表現パターンと修正提案
 */
const TAUTOLOGY_PATTERNS: Map<string, string[]> = new Map([
  ['頭痛が痛い', ['頭が痛い', '頭痛がする']],
  ['違和感を感じる', ['違和感がある', '違和感を覚える']],
  ['被害を被る', ['被害を受ける', '被害にあう']],
  ['犯罪を犯す', ['罪を犯す', '犯罪を行う']],
  ['危険が危ない', ['危険がある', '危ない']],
  ['心配が心配', ['心配がある', '心配だ']],
  ['不安が不安', ['不安がある', '不安だ']],
  ['問題が問題', ['問題がある', '問題だ']],
  ['歌を歌う', ['歌う', '歌を披露する']],
  ['踊りを踊る', ['踊る', '踊りを披露する']],
  ['話を話す', ['話す', '話をする']],
  ['旅行を旅する', ['旅行する', '旅をする']],
  ['返事を返す', ['返事をする', '答える']],
  ['挨拶を挨拶する', ['挨拶をする', '挨拶する']],
  ['過去を振り返る', ['過去を思い出す', '振り返る']],
  ['日本に来日', ['来日する', '日本に来る']],
  ['アメリカに渡米', ['渡米する', 'アメリカに行く']],
  ['電車に乗車', ['乗車する', '電車に乗る']],
  ['車から下車', ['下車する', '車から降りる']]
]);

/**
 * 重複要素の説明
 */
const DUPLICATED_ELEMENTS: Map<string, string> = new Map([
  ['頭痛が痛い', '「頭」と「痛い」'],
  ['違和感を感じる', '「感」'],
  ['被害を被る', '「被」'],
  ['犯罪を犯す', '「犯」'],
  ['危険が危ない', '「危」'],
  ['歌を歌う', '「歌」'],
  ['踊りを踊る', '「踊」'],
  ['話を話す', '「話」'],
  ['日本に来日', '「日」'],
  ['アメリカに渡米', '「米」'],
  ['電車に乗車', '「車」'],
  ['車から下車', '「車」']
]);

/**
 * 重複表現（同語反復）検出ルール
 */
export class TautologyRule implements AdvancedGrammarRule {
  name = 'tautology';
  description = '重複表現（同語反復）を検出します';

  /**
   * テキストから重複表現を検出
   * @param text テキスト
   * @returns 検出された重複表現のリスト
   */
  detectTautologies(text: string): Tautology[] {
    const results: Tautology[] = [];

    for (const [pattern, suggestions] of TAUTOLOGY_PATTERNS) {
      let index = text.indexOf(pattern);
      while (index !== -1) {
        const duplicatedElement = DUPLICATED_ELEMENTS.get(pattern) || pattern;
        results.push({
          pattern,
          duplicatedElement,
          suggestions,
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + pattern.length }
          }
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
    const tautologies = this.detectTautologies(context.documentText);

    for (const tautology of tautologies) {
      diagnostics.push(new AdvancedDiagnostic({
        range: tautology.range,
        message: `重複表現「${tautology.pattern}」が検出されました。${tautology.duplicatedElement}が重複しています。`,
        code: 'tautology',
        ruleName: this.name,
        suggestions: tautology.suggestions
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
    return config.enableTautology;
  }
}

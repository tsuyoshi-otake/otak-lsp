/**
 * OyobiNarabini Rule
 * 「及び」「並びに」の使い分けをチェックする
 * Feature: official-document-rules
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { isEmpty } from '../../utils/arrayUtils';

/**
 * 接続詞の出現情報
 */
interface ConjunctionMatch {
  type: 'oyobi' | 'narabini';
  position: number;
  length: number;
}

/**
 * 「及び」「並びに」の使い分けをチェックするルール
 *
 * 公用文のルール（「公用文作成の考え方」2022年）:
 * - 「及び」: 小さな並列（同レベルの要素を結ぶ）
 * - 「並びに」: 大きな並列（「及び」で結ばれたグループ同士を結ぶ）
 * - 「並びに」は「及び」と組み合わせて使う
 * - 「並びに」単独使用は不適切
 *
 * 例:
 * - 正: 「AとB及びCとD」（同レベル）
 * - 正: 「A及びB並びにC及びD」（階層構造）
 * - 誤: 「A並びにB」（「及び」なしで「並びに」を使用）
 */
export class OyobiNarabiniRule implements AdvancedGrammarRule {
  name = 'oyobi-narabini';
  description = '「及び」「並びに」の使い分けをチェックします';

  /**
   * 文中の「及び」「並びに」を検出
   */
  findConjunctions(text: string): ConjunctionMatch[] {
    const matches: ConjunctionMatch[] = [];

    // 「及び」を検出
    let index = 0;
    while ((index = text.indexOf('及び', index)) !== -1) {
      matches.push({
        type: 'oyobi',
        position: index,
        length: 2
      });
      index += 2;
    }

    // 「並びに」を検出
    index = 0;
    while ((index = text.indexOf('並びに', index)) !== -1) {
      matches.push({
        type: 'narabini',
        position: index,
        length: 3
      });
      index += 3;
    }

    // 位置順にソート
    matches.sort((a, b) => a.position - b.position);

    return matches;
  }

  /**
   * 文中の「、」で区切られた要素数をカウント
   * 3つ以上の要素がある場合、「並びに」の使用を提案する
   */
  countParallelElements(text: string): number {
    // 「及び」で区切られた要素をカウント
    const oyobiCount = (text.match(/及び/g) ?? []).length;
    // 「、」で区切られた要素をカウント（「及び」の前後）
    const commaCount = (text.match(/、/g) ?? []).length;

    // 要素数 = 区切り数 + 1
    return oyobiCount + commaCount + 1;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const sentences = context.sentences;

    for (const sentence of sentences) {
      const text = sentence.text;
      const matches = this.findConjunctions(text);

      if (isEmpty(matches)) {
        continue;
      }

      const hasOyobi = matches.some(m => m.type === 'oyobi');
      const hasNarabini = matches.some(m => m.type === 'narabini');

      // 要件 1.3: 「並びに」が単独で使用されている場合は警告
      if (hasNarabini && !hasOyobi) {
        for (const match of matches.filter(m => m.type === 'narabini')) {
          const startOffset = sentence.start + match.position;
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: 0, character: startOffset },
              end: { line: 0, character: startOffset + match.length }
            },
            message: '「並びに」は「及び」と組み合わせて使用します。単独で使用する場合は「及び」を使用してください。（根拠: 公用文作成の考え方）',
            code: 'oyobi-narabini',
            ruleName: this.name,
            suggestions: ['「及び」に変更する'],
            severity: DiagnosticSeverity.Information
          }));
        }
      }

      // 要件 1.4: 3つ以上の要素を「及び」のみで並列している場合は提案
      if (hasOyobi && !hasNarabini) {
        const elementCount = this.countParallelElements(text);
        if (elementCount >= 3) {
          // 最後の「及び」の位置を取得
          const lastOyobi = matches.filter(m => m.type === 'oyobi').pop();
          if (lastOyobi) {
            const startOffset = sentence.start + lastOyobi.position;
            diagnostics.push(new AdvancedDiagnostic({
              range: {
                start: { line: 0, character: startOffset },
                end: { line: 0, character: startOffset + lastOyobi.length }
              },
              message: '3つ以上の要素を並列する場合、階層構造を明確にするために「並びに」の使用を検討してください。（根拠: 公用文作成の考え方）',
              code: 'oyobi-narabini',
              ruleName: this.name,
              suggestions: ['階層構造がある場合は「並びに」を使用する'],
              severity: DiagnosticSeverity.Information
            }));
          }
        }
      }

      // 要件 1.2: 「及び」と「並びに」が混在する場合、階層構造の妥当性を検証
      // 公用文では「並びに」は「及び」より大きな並列を表すため、
      // 「並びに」の後に「及び」が来るのは正しい構造
      // 「及び」の後に「並びに」が来るのも正しい構造（グループを結ぶ）
      // ここでは基本的な検出のみ行い、複雑な階層構造の検証は将来の拡張とする
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableOyobiNarabini;
  }
}

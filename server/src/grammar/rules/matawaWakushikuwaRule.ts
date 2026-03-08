/**
 * MatawaWakushikuwa Rule
 * 「又は」「若しくは」の使い分けをチェックする
 * Feature: official-document-rules
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5
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
  type: 'matawa' | 'wakushikuwa';
  position: number;
  length: number;
}

/**
 * 「又は」「若しくは」の使い分けをチェックするルール
 *
 * 公用文のルール（「公用文作成の考え方」2022年）:
 * - 「又は」: 大きな選択（最上位の選択肢を結ぶ）
 * - 「若しくは」: 小さな選択（下位の選択肢を結ぶ）
 * - 「若しくは」は「又は」と組み合わせて使う
 * - 「若しくは」単独使用は不適切
 *
 * 例:
 * - 正: 「AかB又はCかD」（同レベル）
 * - 正: 「A若しくはB又はC若しくはD」（階層構造）
 * - 誤: 「A若しくはB」（「又は」なしで「若しくは」を使用）
 */
export class MatawaWakushikuwaRule implements AdvancedGrammarRule {
  name = 'matawa-wakushikuwa';
  description = '「又は」「若しくは」の使い分けをチェックします';

  /**
   * 文中の「又は」「若しくは」を検出
   */
  findConjunctions(text: string): ConjunctionMatch[] {
    const matches: ConjunctionMatch[] = [];

    // 「又は」を検出
    let index = 0;
    while ((index = text.indexOf('又は', index)) !== -1) {
      matches.push({
        type: 'matawa',
        position: index,
        length: 2
      });
      index += 2;
    }

    // 「若しくは」を検出
    index = 0;
    while ((index = text.indexOf('若しくは', index)) !== -1) {
      matches.push({
        type: 'wakushikuwa',
        position: index,
        length: 4
      });
      index += 4;
    }

    // 位置順にソート
    matches.sort((a, b) => a.position - b.position);

    return matches;
  }

  /**
   * 文中の「、」で区切られた選択肢数をカウント
   * 3つ以上の選択肢がある場合、「若しくは」の使用を提案する
   */
  countChoiceElements(text: string): number {
    // 「又は」で区切られた要素をカウント
    const matawaCount = (text.match(/又は/g) || []).length;
    // 「、」で区切られた要素をカウント（「又は」の前後）
    const commaCount = (text.match(/、/g) || []).length;

    // 要素数 = 区切り数 + 1
    return matawaCount + commaCount + 1;
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

      const hasMatawa = matches.some(m => m.type === 'matawa');
      const hasWakushikuwa = matches.some(m => m.type === 'wakushikuwa');

      // 要件 2.3: 「若しくは」が単独で使用されている場合は警告
      if (hasWakushikuwa && !hasMatawa) {
        for (const match of matches.filter(m => m.type === 'wakushikuwa')) {
          const startOffset = sentence.start + match.position;
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: 0, character: startOffset },
              end: { line: 0, character: startOffset + match.length }
            },
            message: '「若しくは」は「又は」と組み合わせて使用します。単独で使用する場合は「又は」を使用してください。（根拠: 公用文作成の考え方）',
            code: 'matawa-wakushikuwa',
            ruleName: this.name,
            suggestions: ['「又は」に変更する'],
            severity: DiagnosticSeverity.Information
          }));
        }
      }

      // 要件 2.4: 3つ以上の選択肢を「又は」のみで並列している場合は提案
      if (hasMatawa && !hasWakushikuwa) {
        const elementCount = this.countChoiceElements(text);
        if (elementCount >= 3) {
          // 最後の「又は」の位置を取得
          const lastMatawa = matches.filter(m => m.type === 'matawa').pop();
          if (lastMatawa) {
            const startOffset = sentence.start + lastMatawa.position;
            diagnostics.push(new AdvancedDiagnostic({
              range: {
                start: { line: 0, character: startOffset },
                end: { line: 0, character: startOffset + lastMatawa.length }
              },
              message: '3つ以上の選択肢を並列する場合、階層構造を明確にするために「若しくは」の使用を検討してください。（根拠: 公用文作成の考え方）',
              code: 'matawa-wakushikuwa',
              ruleName: this.name,
              suggestions: ['階層構造がある場合は「若しくは」を使用する'],
              severity: DiagnosticSeverity.Information
            }));
          }
        }
      }

      // 要件 2.2: 「又は」と「若しくは」が混在する場合、階層構造の妥当性を検証
      // 公用文では「又は」は「若しくは」より大きな選択を表すため、
      // 「又は」の後に「若しくは」が来るのは正しい構造
      // 「若しくは」の後に「又は」が来るのも正しい構造（グループを結ぶ）
      // ここでは基本的な検出のみ行い、複雑な階層構造の検証は将来の拡張とする
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableMatawaWakushikuwa;
  }
}

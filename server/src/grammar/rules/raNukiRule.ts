/**
 * Ra-nuki Detection Rule
 * ら抜き言葉を検出する
 * Feature: advanced-grammar-rules
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  RaNukiInfo
} from '../../../../shared/src/advancedTypes';

/**
 * ら抜き言葉のパターン
 * 一段活用動詞の語幹 + れる
 */
const RA_NUKI_PATTERNS: Map<string, string> = new Map([
  // 食べる類（下一段活用）
  ['食べれる', '食べられる'],
  ['食べれた', '食べられた'],
  ['食べれない', '食べられない'],
  ['食べれます', '食べられます'],
  ['食べれません', '食べられません'],

  // 見る類（上一段活用）
  ['見れる', '見られる'],
  ['見れた', '見られた'],
  ['見れない', '見られない'],
  ['見れます', '見られます'],
  ['見れません', '見られません'],

  // 起きる類（上一段活用）
  ['起きれる', '起きられる'],
  ['起きれた', '起きられた'],
  ['起きれない', '起きられない'],
  ['起きれます', '起きられます'],

  // 考える類（下一段活用）
  ['考えれる', '考えられる'],
  ['考えれた', '考えられた'],
  ['考えれない', '考えられない'],
  ['考えれます', '考えられます'],

  // 出る類（下一段活用）
  ['出れる', '出られる'],
  ['出れた', '出られた'],
  ['出れない', '出られない'],

  // 寝る類（下一段活用）
  ['寝れる', '寝られる'],
  ['寝れた', '寝られた'],
  ['寝れない', '寝られない'],

  // 着る類（上一段活用）
  ['着れる', '着られる'],
  ['着れた', '着られた'],
  ['着れない', '着られない'],

  // 居る類（上一段活用）
  ['居れる', '居られる'],
  ['いれる', 'いられる'],

  // 受ける類（下一段活用）
  ['受けれる', '受けられる'],
  ['受けれた', '受けられた'],

  // 信じる類（上一段活用）
  ['信じれる', '信じられる'],
  ['信じれた', '信じられた'],

  // 感じる類（上一段活用）
  ['感じれる', '感じられる'],
  ['感じれた', '感じられた'],

  // 落ちる類（上一段活用）
  ['落ちれる', '落ちられる'],
  ['落ちれた', '落ちられた'],

  // 生きる類（上一段活用）
  ['生きれる', '生きられる'],
  ['生きれた', '生きられた'],

  // 降りる類（上一段活用）
  ['降りれる', '降りられる'],
  ['降りれた', '降りられた'],

  // 始める類（下一段活用）
  ['始めれる', '始められる'],
  ['始めれた', '始められた'],

  // 決める類（下一段活用）
  ['決めれる', '決められる'],
  ['決めれた', '決められた'],

  // 変える類（下一段活用）
  ['変えれる', '変えられる'],
  ['変えれた', '変えられた'],

  // 止める類（下一段活用）
  ['止めれる', '止められる'],
  ['止めれた', '止められた'],

  // 覚える類（下一段活用）
  ['覚えれる', '覚えられる'],
  ['覚えれた', '覚えられた'],

  // 教える類（下一段活用）
  ['教えれる', '教えられる'],
  ['教えれた', '教えられた'],

  // 逃げる類（下一段活用）
  ['逃げれる', '逃げられる'],
  ['逃げれた', '逃げられた'],

  // 開ける類（下一段活用）
  ['開けれる', '開けられる'],
  ['開けれた', '開けられた'],

  // 閉める類（下一段活用）
  ['閉めれる', '閉められる'],
  ['閉めれた', '閉められた']
]);

/**
 * ら抜き言葉検出の正規表現パターン
 * 一段活用動詞の語幹 + れる/れた/れない/れます
 */
const RA_NUKI_REGEX = /^(.+[えいけげせてねべめれ])れ(る|た|ない|ます|ません)$/;

/**
 * ら抜き言葉検出ルール
 */
export class RaNukiRule implements AdvancedGrammarRule {
  name = 'ra-nuki-detection';
  description = 'ら抜き言葉を検出します';

  /**
   * ら抜き言葉かどうかを判定
   * @param surface 表層形
   * @param conjugation 活用タイプ
   * @returns ら抜き言葉の場合、正しい形を返す
   */
  detectRaNuki(surface: string, conjugation?: string): string | null {
    // 辞書に登録されている場合
    if (RA_NUKI_PATTERNS.has(surface)) {
      return RA_NUKI_PATTERNS.get(surface) || null;
    }

    // 五段活用動詞の可能形は正しい（例：書ける、読める）
    if (conjugation === '五段') {
      return null;
    }

    // 一段活用動詞のら抜きパターンをチェック
    const match = RA_NUKI_REGEX.exec(surface);
    if (match) {
      const stem = match[1];
      const ending = match[2];
      // 「られ」を挿入した正しい形を生成
      return `${stem}られ${ending}`;
    }

    return null;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // パターン1: 単一トークンのら抜き言葉（例：「見れる」）
      if (token.pos === '動詞') {
        const correctForm = this.detectRaNuki(token.surface, token.conjugation);
        if (correctForm) {
          diagnostics.push(new AdvancedDiagnostic({
            range: this.createRange(token),
            message: `ら抜き言葉「${token.surface}」が検出されました。正しくは「${correctForm}」です。`,
            code: 'ra-nuki',
            ruleName: this.name,
            suggestions: [correctForm]
          }));
          continue;
        }
      }

      // パターン2: 2トークンに分割されたら抜き言葉（例：「食べ」+「れる」）
      if (i < tokens.length - 1) {
        const nextToken = tokens[i + 1];
        const result = this.checkTwoTokenRaNuki(token, nextToken);
        if (result) {
          diagnostics.push(new AdvancedDiagnostic({
            range: this.createRangeForTokens(token, nextToken),
            message: `ら抜き言葉「${result.surface}」が検出されました。正しくは「${result.correctForm}」です。`,
            code: 'ra-nuki',
            ruleName: this.name,
            suggestions: [result.correctForm]
          }));
          i++; // 次のトークンはスキップ
        }
      }
    }

    return diagnostics;
  }

  /**
   * 2つのトークンがら抜き言葉を構成しているかチェック
   * @param verb 動詞トークン
   * @param auxiliary 助動詞トークン
   * @returns ら抜き情報（検出された場合）
   */
  private checkTwoTokenRaNuki(
    verb: Token,
    auxiliary: Token
  ): { surface: string; correctForm: string } | null {
    // 動詞 + 「れる」のパターン
    if (verb.pos !== '動詞' || auxiliary.pos !== '動詞') {
      return null;
    }

    // 「れる」で始まる助動詞かチェック
    if (!auxiliary.surface.startsWith('れ')) {
      return null;
    }

    // 一段活用動詞かチェック
    if (verb.conjugation !== '一段') {
      return null;
    }

    // 動詞の基本形が「〜る」で終わるかチェック
    if (!verb.baseForm.endsWith('る')) {
      return null;
    }

    // ら抜き言葉として検出
    const surface = verb.surface + auxiliary.surface;
    const stem = verb.surface;
    const ending = auxiliary.surface.substring(1); // 「れる」→「える」
    const correctForm = `${stem}られ${ending}`;

    return { surface, correctForm };
  }

  /**
   * ルールが有効かどうかを確認
   * @param config 設定
   * @returns 有効な場合true
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableRaNukiDetection;
  }

  /**
   * トークンから範囲を作成
   * @param token トークン
   * @returns 範囲
   */
  private createRange(token: Token): Range {
    return {
      start: { line: 0, character: token.start },
      end: { line: 0, character: token.end }
    };
  }

  /**
   * 複数のトークンから範囲を作成
   * @param startToken 開始トークン
   * @param endToken 終了トークン
   * @returns 範囲
   */
  private createRangeForTokens(startToken: Token, endToken: Token): Range {
    return {
      start: { line: 0, character: startToken.start },
      end: { line: 0, character: endToken.end }
    };
  }
}

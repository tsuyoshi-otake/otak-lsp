/**
 * Katakana Chouon Rule
 * カタカナ長音チェッカー
 * Feature: remaining-grammar-rules
 * Task: 17. カタカナ長音チェッカーの実装
 * 要件: 15.1, 15.2, 15.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 長音の揺れパターン（誤 -> 正）
 * Map<非標準形, 標準形>
 */
const CHOUON_VARIANTS: Map<string, string> = new Map([
  // 長音欠落パターン（JIS規格では長音符を付けることを推奨）
  ['サーバ', 'サーバー'],
  ['コンピュータ', 'コンピューター'],
  ['ユーザ', 'ユーザー'],
  ['ブラウザ', 'ブラウザー'],
  ['フォルダ', 'フォルダー'],
  ['プリンタ', 'プリンター'],
  ['スキャナ', 'スキャナー'],
  ['モニタ', 'モニター'],
  ['ルータ', 'ルーター'],
  ['コントローラ', 'コントローラー'],
  ['マネージャ', 'マネージャー'],
  ['エンジニア', 'エンジニアー'],  // これは議論あり、通常はエンジニアが正しい
  ['ドライバ', 'ドライバー'],
  ['メモリ', 'メモリー'],
  ['カテゴリ', 'カテゴリー'],
  ['エントリ', 'エントリー'],
  ['ディレクトリ', 'ディレクトリー'],
  ['ライブラリ', 'ライブラリー'],
  ['レジストリ', 'レジストリー'],
  ['ヒストリ', 'ヒストリー'],
  ['ストーリ', 'ストーリー'],
  ['ファクトリ', 'ファクトリー'],
  ['インベントリ', 'インベントリー'],
  ['ギャラリ', 'ギャラリー'],
  ['バッテリ', 'バッテリー'],
  ['プロパティ', 'プロパティー'],
  ['セキュリティ', 'セキュリティー'],
  ['ユーティリティ', 'ユーティリティー'],
  ['アクセサリ', 'アクセサリー'],
  ['スケジューラ', 'スケジューラー'],
  ['ハンドラ', 'ハンドラー'],
  ['コンパイラ', 'コンパイラー'],
  ['インタプリタ', 'インタプリター'],
  ['デバッガ', 'デバッガー'],
  ['エディタ', 'エディター'],
  ['クリエイタ', 'クリエイター'],
  ['オペレータ', 'オペレーター'],
  ['インジケータ', 'インジケーター'],
  ['イテレータ', 'イテレーター'],
  ['ジェネレータ', 'ジェネレーター'],
  ['シミュレータ', 'シミュレーター'],
  ['エミュレータ', 'エミュレーター'],
  ['アクセラレータ', 'アクセラレーター'],
  ['レギュレータ', 'レギュレーター'],
  ['センサ', 'センサー'],
  ['プロセッサ', 'プロセッサー'],
  ['トランジスタ', 'トランジスター'],
  ['レジスタ', 'レジスター'],
  ['フィルタ', 'フィルター'],
  ['アダプタ', 'アダプター'],
  ['コネクタ', 'コネクター'],
  ['コンバータ', 'コンバーター'],
  ['インバータ', 'インバーター'],
  ['スピーカ', 'スピーカー'],
  ['プレイヤ', 'プレイヤー'],
  ['レイヤ', 'レイヤー'],
  ['パラメタ', 'パラメーター'],
  ['パラメータ', 'パラメーター'],
  ['カウンタ', 'カウンター'],
  ['ポインタ', 'ポインター'],
  ['キャラクタ', 'キャラクター'],
  ['セパレータ', 'セパレーター'],
  ['デリミタ', 'デリミター'],
  ['マーカ', 'マーカー'],
  ['トリガ', 'トリガー'],
  ['スライダ', 'スライダー'],
  ['ホルダ', 'ホルダー'],
  ['バインダ', 'バインダー'],
  ['ローダ', 'ローダー'],
  ['リーダ', 'リーダー'],
  ['ライタ', 'ライター'],
  ['ヘルパ', 'ヘルパー'],
  ['ワーカ', 'ワーカー'],
  ['パーサ', 'パーサー'],
  ['レンダラ', 'レンダラー'],
  ['ビルダ', 'ビルダー'],
  ['ランナ', 'ランナー'],
  ['スキャナ', 'スキャナー'],
  ['プランナ', 'プランナー'],
  ['デザイナ', 'デザイナー'],
  ['コンテナ', 'コンテナー'],
  ['リスナ', 'リスナー'],
  ['オーナ', 'オーナー'],
  ['パートナ', 'パートナー'],
  ['メンバ', 'メンバー'],
  ['ナンバ', 'ナンバー'],
  ['メータ', 'メーター'],
  ['データ', 'データー'], // これは議論あり、通常はデータが正しい

  // メールの揺れ
  ['メイル', 'メール'],
  ['Ｅメイル', 'Eメール'],
  ['イーメイル', 'イーメール'],

  // その他の誤用パターン
  ['デフォルトー', 'デフォルト'],
  ['スケールー', 'スケール'],
  ['インストールー', 'インストール'],
  ['アンインストールー', 'アンインストール'],
]);

// 「データ」「エンジニア」など、長音なしが正しいもの（除外リスト）
const EXCEPTIONS: Set<string> = new Set([
  'データ',
  'エンジニア',
  'アイデア',
  'エリア',
  'メディア',
  'クリア',
  'インテリア',
  'フロンティア',
  'ボランティア',
  'キャリア',
]);

/**
 * カタカナ長音チェッカー
 */
export class KatakanaChouonRule implements AdvancedGrammarRule {
  name = 'katakana-chouon';
  description = 'カタカナ長音の欠落・過剰を検出し、標準形を提案します';

  /**
   * 標準形を取得
   */
  getStandardForm(variant: string): string | null {
    // 除外リストに含まれる場合はnullを返す
    if (EXCEPTIONS.has(variant)) {
      return null;
    }
    return CHOUON_VARIANTS.get(variant) || null;
  }

  /**
   * テキスト内の長音の揺れを検出
   */
  detectVariants(text: string): Array<{ variant: string; standard: string; index: number }> {
    const results: Array<{ variant: string; standard: string; index: number }> = [];

    for (const [variant, standard] of CHOUON_VARIANTS) {
      // 除外リストのチェック
      if (EXCEPTIONS.has(variant)) {
        continue;
      }

      let index = text.indexOf(variant);
      while (index !== -1) {
        // 標準形が既に使用されていないかチェック（重複検出を防ぐ）
        const nextChar = text[index + variant.length] || '';
        const prevChar = text[index - 1] || '';

        // 長音符が続いている場合は既に正しい可能性があるのでスキップ
        if (nextChar === 'ー' && standard.endsWith('ー')) {
          index = text.indexOf(variant, index + 1);
          continue;
        }

        results.push({ variant, standard, index });
        index = text.indexOf(variant, index + 1);
      }
    }

    // インデックス順にソート
    results.sort((a, b) => a.index - b.index);

    // 重複を除去
    const filtered: Array<{ variant: string; standard: string; index: number }> = [];
    for (const item of results) {
      const overlapping = filtered.find(
        f => item.index >= f.index && item.index < f.index + f.variant.length
      );
      if (!overlapping) {
        filtered.push(item);
      } else if (item.variant.length > overlapping.variant.length) {
        const idx = filtered.indexOf(overlapping);
        filtered[idx] = item;
      }
    }

    return filtered;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const variants = this.detectVariants(context.documentText);

    for (const item of variants) {
      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.index },
          end: { line: 0, character: item.index + item.variant.length }
        },
        message: `カタカナ表記「${item.variant}」は「${item.standard}」が標準的です。`,
        code: 'katakana-chouon',
        ruleName: this.name,
        suggestions: [`「${item.standard}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableTermNotation;
  }
}

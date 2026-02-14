/**
 * Symbol Width Mix Rule
 * 記号幅混在バリデーター
 * Feature: remaining-grammar-rules
 * Task: 25. 記号幅混在バリデーターの実装
 * 要件: 23.1, 23.2, 23.3
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

/**
 * 全角記号と半角記号のペア
 */
type SymbolPair = { fullwidth: string; halfwidth: string; name: string };

const SYMBOL_PAIRS: SymbolPair[] = [
  { fullwidth: '：', halfwidth: ':', name: 'コロン' },
  { fullwidth: '；', halfwidth: ';', name: 'セミコロン' },
  { fullwidth: '／', halfwidth: '/', name: 'スラッシュ' },
  { fullwidth: '＼', halfwidth: '\\', name: 'バックスラッシュ' },
  { fullwidth: '？', halfwidth: '?', name: '疑問符' },
  { fullwidth: '！', halfwidth: '!', name: '感嘆符' },
  { fullwidth: '＆', halfwidth: '&', name: 'アンパサンド' },
  { fullwidth: '＝', halfwidth: '=', name: 'イコール' },
  { fullwidth: '＋', halfwidth: '+', name: 'プラス' },
  { fullwidth: '＊', halfwidth: '*', name: 'アスタリスク' },
  { fullwidth: '＃', halfwidth: '#', name: 'シャープ' },
  { fullwidth: '＄', halfwidth: '$', name: 'ドル記号' },
  { fullwidth: '％', halfwidth: '%', name: 'パーセント' },
  { fullwidth: '＠', halfwidth: '@', name: 'アットマーク' },
];

const SYMBOL_PAIR_BY_CHAR: Record<string, SymbolPair> = (() => {
  const map: Record<string, SymbolPair> = Object.create(null);
  for (const pair of SYMBOL_PAIRS) {
    map[pair.fullwidth] = pair;
    map[pair.halfwidth] = pair;
  }
  return map;
})();

/**
 * 検出された記号情報
 */
interface SymbolInfo {
  char: string;
  index: number;
  isFullwidth: boolean;
  name: string;
  counterpart: string;
}

/**
 * 記号幅混在バリデーター
 */
export class SymbolWidthMixRule implements AdvancedGrammarRule {
  name = 'symbol-width-mix';
  description = '全角半角記号の混在を検出し、統一を提案します';

  /**
   * 記号情報を取得
   */
  getSymbolInfo(char: string): { isFullwidth: boolean; name: string; counterpart: string } | null {
    const pair = SYMBOL_PAIR_BY_CHAR[char];
    if (!pair) {
      return null;
    }
    if (char === pair.fullwidth) {
      return { isFullwidth: true, name: pair.name, counterpart: pair.halfwidth };
    }
    return { isFullwidth: false, name: pair.name, counterpart: pair.fullwidth };
  }

  /**
   * テキスト内の記号を検出
   */
  findSymbols(text: string): SymbolInfo[] {
    const results: SymbolInfo[] = [];

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const info = this.getSymbolInfo(char);
      if (info) {
        results.push({
          char,
          index: i,
          isFullwidth: info.isFullwidth,
          name: info.name,
          counterpart: info.counterpart
        });
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;

    type Group = {
      pair: SymbolPair;
      fullwidthPositions: number[];
      halfwidthPositions: number[];
    };

    // 記号タイプごとに位置を収集（SymbolInfoオブジェクトを大量生成しない）
    const groups = new Map<string, Group>();
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const pair = SYMBOL_PAIR_BY_CHAR[char];
      if (!pair) {
        continue;
      }

      let group = groups.get(pair.name);
      if (!group) {
        group = {
          pair,
          fullwidthPositions: [],
          halfwidthPositions: []
        };
        groups.set(pair.name, group);
      }

      if (char === pair.fullwidth) {
        group.fullwidthPositions.push(i);
      } else {
        group.halfwidthPositions.push(i);
      }
    }

    // 各記号タイプについて混在をチェック
    for (const group of groups.values()) {
      const fullwidthCount = group.fullwidthPositions.length;
      const halfwidthCount = group.halfwidthPositions.length;

      // 混在していない場合は問題なし
      if (fullwidthCount === 0 || halfwidthCount === 0) {
        continue;
      }

      // 多数派を判定（同数は halfwidth を支配的として扱う: 既存実装互換）
      const dominantIsFullwidth = fullwidthCount > halfwidthCount;

      const minorityIsFullwidth = !dominantIsFullwidth;
      const minorityPositions = dominantIsFullwidth ? group.halfwidthPositions : group.fullwidthPositions;
      const minorityChar = dominantIsFullwidth ? group.pair.halfwidth : group.pair.fullwidth;
      const counterpart = dominantIsFullwidth ? group.pair.fullwidth : group.pair.halfwidth;

      for (const index of minorityPositions) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: index },
            end: { line: 0, character: index + 1 }
          },
          message: `${group.pair.name}「${minorityChar}」は${minorityIsFullwidth ? '全角' : '半角'}ですが、文書内では${dominantIsFullwidth ? '全角' : '半角'}が多く使用されています。表記を統一することを推奨します。`,
          code: 'symbol-width-mix',
          ruleName: this.name,
          suggestions: [`「${counterpart}」に変更して統一する`]
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableSymbolWidthMix;
  }
}

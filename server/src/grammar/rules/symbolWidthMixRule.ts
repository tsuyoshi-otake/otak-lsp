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
const SYMBOL_PAIRS: Array<{ fullwidth: string; halfwidth: string; name: string }> = [
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
    for (const pair of SYMBOL_PAIRS) {
      if (char === pair.fullwidth) {
        return { isFullwidth: true, name: pair.name, counterpart: pair.halfwidth };
      }
      if (char === pair.halfwidth) {
        return { isFullwidth: false, name: pair.name, counterpart: pair.fullwidth };
      }
    }
    return null;
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
    const symbols = this.findSymbols(context.documentText);

    // 記号タイプごとにグループ化
    const symbolsByName = new Map<string, SymbolInfo[]>();
    for (const symbol of symbols) {
      const list = symbolsByName.get(symbol.name) || [];
      list.push(symbol);
      symbolsByName.set(symbol.name, list);
    }

    // 各記号タイプについて混在をチェック
    for (const [name, symbolList] of symbolsByName) {
      const hasFullwidth = symbolList.some(s => s.isFullwidth);
      const hasHalfwidth = symbolList.some(s => !s.isFullwidth);

      // 混在していない場合は問題なし
      if (!hasFullwidth || !hasHalfwidth) {
        continue;
      }

      // 多数派を判定
      const fullwidthCount = symbolList.filter(s => s.isFullwidth).length;
      const halfwidthCount = symbolList.filter(s => !s.isFullwidth).length;
      const dominantIsFullwidth = fullwidthCount > halfwidthCount;

      // 少数派を警告
      for (const symbol of symbolList) {
        if (symbol.isFullwidth !== dominantIsFullwidth) {
          diagnostics.push(new AdvancedDiagnostic({
            range: {
              start: { line: 0, character: symbol.index },
              end: { line: 0, character: symbol.index + 1 }
            },
            message: `${symbol.name}「${symbol.char}」は${symbol.isFullwidth ? '全角' : '半角'}ですが、文書内では${dominantIsFullwidth ? '全角' : '半角'}が多く使用されています。表記を統一することを推奨します。`,
            code: 'symbol-width-mix',
            ruleName: this.name,
            suggestions: [`「${symbol.counterpart}」に変更して統一する`]
          }));
        }
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableAlphabetWidth;
  }
}

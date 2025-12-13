/**
 * AdvancedRulesManager Unit Tests
 * Feature: diagnostic-range-fix
 * 要件: 3.1, 3.3
 *
 * 診断の範囲が正しく処理されることを検証するテスト
 *
 * 改善されたロジック:
 * - 要件 1.2: 既に正しい行/文字ベースの位置を持っている場合は変更しない
 * - 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
 *
 * 判定ロジック:
 * - line: 0 かつ character が最初の行の長さを超えている場合はオフセットベースと判断
 * - それ以外は正しい行/文字ベースと判断
 */

import { AdvancedRulesManager } from './advancedRulesManager';
import { Token, Range, Diagnostic, DiagnosticSeverity } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedDiagnostic,
  RuleContext,
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG
} from '../../../shared/src/advancedTypes';

describe('AdvancedRulesManager - Diagnostic Range Fix', () => {
  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    posDetail1: string = '*'
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1,
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  /**
   * モックルールを作成
   * 指定された範囲で診断を生成するルール
   */
  const createMockRule = (
    diagnosticRange: Range,
    ruleName: string = 'mock-rule'
  ): AdvancedGrammarRule => {
    return {
      name: ruleName,
      description: 'Mock rule for testing',
      check: (_tokens: Token[], _context: RuleContext): AdvancedDiagnostic[] => {
        return [
          new AdvancedDiagnostic({
            range: diagnosticRange,
            message: 'Test diagnostic message',
            code: 'style-inconsistency',
            ruleName
          })
        ];
      },
      isEnabled: (_config: AdvancedRulesConfig): boolean => true
    };
  };

  describe('要件 1.2: 正しい行/文字ベースの範囲は変更しない', () => {
    it('行0で最初の行の長さ内の範囲は変更されない', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "短い行" (4文字)
      // 範囲: line:0, char:0-3 (最初の行の長さ内)
      const expectedRange: Range = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 }
      };
      const mockRule = createMockRule(expectedRange);
      manager.registerRule(mockRule);

      const text = '短い行';
      const tokens = [createToken('短い行', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(0);
      expect(diagnostics[0].range.start.character).toBe(0);
      expect(diagnostics[0].range.end.line).toBe(0);
      expect(diagnostics[0].range.end.character).toBe(3);
    });

    it('行番号が0以外の範囲は変更されない', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // 複数行にまたがる範囲
      const expectedRange: Range = {
        start: { line: 1, character: 3 },
        end: { line: 2, character: 8 }
      };
      const mockRule = createMockRule(expectedRange);
      manager.registerRule(mockRule);

      const text = '最初の行です。\n二番目の行です。\n三番目の行です。';
      const tokens = [createToken('これ', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(1);
      expect(diagnostics[0].range.start.character).toBe(3);
      expect(diagnostics[0].range.end.line).toBe(2);
      expect(diagnostics[0].range.end.character).toBe(8);
    });

    it('同じ行で行番号が0以外の範囲は変更されない', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // 行5の中間位置
      const expectedRange: Range = {
        start: { line: 5, character: 10 },
        end: { line: 5, character: 20 }
      };
      const mockRule = createMockRule(expectedRange);
      manager.registerRule(mockRule);

      const text = '行1\n行2\n行3\n行4\n行5\nここにテスト文字列があります。';
      const tokens = [createToken('ここ', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(5);
      expect(diagnostics[0].range.start.character).toBe(10);
      expect(diagnostics[0].range.end.line).toBe(5);
      expect(diagnostics[0].range.end.character).toBe(20);
    });
  });

  describe('要件 1.3: オフセットベースの範囲は行/文字ベースに変換する', () => {
    it('オフセットベースの範囲が正しく変換される', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "最初の行\n二番目" (12文字)
      // 最初の行の長さ: 4文字
      // オフセット5-8は "二番目" の先頭部分 -> line:1, char:0-3 に変換されるべき
      const offsetBasedRange: Range = {
        start: { line: 0, character: 5 },  // オフセット5 = 行1の先頭
        end: { line: 0, character: 8 }     // オフセット8 = 行1の4文字目
      };
      const mockRule = createMockRule(offsetBasedRange);
      manager.registerRule(mockRule);

      const text = '最初の行\n二番目';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      // character が最初の行の長さ(4)を超えているので変換される
      expect(diagnostics[0].range.start.line).toBe(1);
      expect(diagnostics[0].range.start.character).toBe(0);
      expect(diagnostics[0].range.end.line).toBe(1);
      expect(diagnostics[0].range.end.character).toBe(3);
    });

    it('複数行にまたがるオフセットも正しく変換される', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "AB\nCD\nEF" (8文字)
      // 最初の行の長さ: 2文字
      // オフセット6-7は "EF" -> line:2, char:0-1 に変換されるべき
      const offsetBasedRange: Range = {
        start: { line: 0, character: 6 },
        end: { line: 0, character: 8 }
      };
      const mockRule = createMockRule(offsetBasedRange);
      manager.registerRule(mockRule);

      const text = 'AB\nCD\nEF';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(2);
      expect(diagnostics[0].range.start.character).toBe(0);
      expect(diagnostics[0].range.end.line).toBe(2);
      expect(diagnostics[0].range.end.character).toBe(2);
    });
  });

  describe('複数診断の処理 (要件 1.4)', () => {
    it('複数の診断がそれぞれ正しく処理される', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "最初の行\n二番目の行\n三番目の行"
      // 最初の行の長さ: 4文字

      // range1: line:0で最初の行内 -> 変換なし
      const range1: Range = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 3 }
      };
      // range2: line:2 -> 変換なし
      const range2: Range = {
        start: { line: 2, character: 0 },
        end: { line: 2, character: 5 }
      };

      const mockRule1 = createMockRule(range1, 'rule1');
      const mockRule2 = createMockRule(range2, 'rule2');

      manager.registerRule(mockRule1);
      manager.registerRule(mockRule2);

      const text = '最初の行\n二番目の行\n三番目の行';
      const tokens = [createToken('最初', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(2);

      // range1を持つ診断（変換なし）
      const diag1 = diagnostics.find(d => d.range.start.line === 0);
      expect(diag1).toBeDefined();
      expect(diag1!.range.start.character).toBe(0);
      expect(diag1!.range.end.character).toBe(3);

      // range2を持つ診断（変換なし）
      const diag2 = diagnostics.find(d => d.range.start.line === 2);
      expect(diag2).toBeDefined();
      expect(diag2!.range.start.character).toBe(0);
      expect(diag2!.range.end.character).toBe(5);
    });
  });

  describe('checkWithRulesでも正しく処理される', () => {
    it('特定ルール実行時も範囲が正しく処理される', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      const expectedRange: Range = {
        start: { line: 1, character: 5 },
        end: { line: 1, character: 15 }
      };
      const mockRule = createMockRule(expectedRange, 'test-rule');
      manager.registerRule(mockRule);

      const text = '最初の行\nテスト対象の文です。';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkWithRules(text, tokens, ['test-rule']);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].range.start.line).toBe(1);
      expect(diagnostics[0].range.start.character).toBe(5);
      expect(diagnostics[0].range.end.line).toBe(1);
      expect(diagnostics[0].range.end.character).toBe(15);
    });
  });

  describe('エッジケースの処理', () => {
    it('空のトークンリストでもエラーなく処理される', () => {
      const manager = new AdvancedRulesManager();

      expect(() => {
        manager.checkText('テスト', []);
      }).not.toThrow();
    });

    it('空のテキストでもエラーなく処理される', () => {
      const manager = new AdvancedRulesManager();
      const tokens = [createToken('', '名詞', 0)];

      expect(() => {
        manager.checkText('', tokens);
      }).not.toThrow();
    });

    it('改善されたfixDiagnosticRangeメソッドが存在する', () => {
      const manager = new AdvancedRulesManager();

      // 改善されたfixDiagnosticRangeメソッドが存在することを確認
      expect((manager as unknown as Record<string, unknown>)['fixDiagnosticRange']).toBeDefined();
    });

    it('改善されたoffsetToPositionメソッドが存在する', () => {
      const manager = new AdvancedRulesManager();

      // 改善されたoffsetToPositionメソッドが存在することを確認
      expect((manager as unknown as Record<string, unknown>)['offsetToPosition']).toBeDefined();
    });

    it('firstLineLengthプロパティが存在する', () => {
      const manager = new AdvancedRulesManager();

      // 改善されたロジック用のfirstLineLengthプロパティが存在することを確認
      expect((manager as unknown as Record<string, unknown>)['firstLineLength']).toBeDefined();
    });
  });

  describe('境界値テスト', () => {
    it('最初の行の長さちょうどの位置は変換されない', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "ABCD\nEFGH" -> 最初の行の長さは4
      // character: 4 はちょうど最初の行の長さと同じ
      const borderRange: Range = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 4 }
      };
      const mockRule = createMockRule(borderRange);
      manager.registerRule(mockRule);

      const text = 'ABCD\nEFGH';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      // character: 4 は最初の行の長さと同じなので変換されない
      expect(diagnostics[0].range.start.line).toBe(0);
      expect(diagnostics[0].range.end.line).toBe(0);
      expect(diagnostics[0].range.end.character).toBe(4);
    });

    it('最初の行の長さ+1の位置は変換される', () => {
      const manager = new AdvancedRulesManager();
      manager['rules'] = [];

      // テキスト: "ABCD\nEFGH" -> 最初の行の長さは4
      // character: 5 は最初の行の長さを超えている -> オフセット5 = 行1の先頭
      const beyondRange: Range = {
        start: { line: 0, character: 5 },
        end: { line: 0, character: 6 }
      };
      const mockRule = createMockRule(beyondRange);
      manager.registerRule(mockRule);

      const text = 'ABCD\nEFGH';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkText(text, tokens);

      expect(diagnostics).toHaveLength(1);
      // 最初の行の長さを超えているので変換される
      expect(diagnostics[0].range.start.line).toBe(1);
      expect(diagnostics[0].range.start.character).toBe(0);
      expect(diagnostics[0].range.end.line).toBe(1);
      expect(diagnostics[0].range.end.character).toBe(1);
    });
  });
});

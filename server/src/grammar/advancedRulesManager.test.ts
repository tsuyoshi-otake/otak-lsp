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
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleProfilingEntry,
  RuleProfilingCollector
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

/**
 * AdvancedRulesManager プロファイリング機能テスト
 * Feature: advanced-rules-profiling
 * 要件: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2
 */
describe('AdvancedRulesManager - Rule Profiling', () => {
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

  describe('RuleProfilingEntry 型', () => {
    it('計測エントリが正しい構造を持つ', () => {
      const entry: RuleProfilingEntry = {
        ruleName: 'style-consistency',
        executionTimeMs: 25.0,
        diagnosticsCount: 12,
        success: true
      };

      expect(entry.ruleName).toBe('style-consistency');
      expect(entry.executionTimeMs).toBe(25.0);
      expect(entry.diagnosticsCount).toBe(12);
      expect(entry.success).toBe(true);
      expect(entry.errorMessage).toBeUndefined();
    });

    it('失敗した計測エントリにエラーメッセージが含まれる', () => {
      const entry: RuleProfilingEntry = {
        ruleName: 'broken-rule',
        executionTimeMs: 1.5,
        diagnosticsCount: 0,
        success: false,
        errorMessage: 'Unexpected error in rule execution'
      };

      expect(entry.success).toBe(false);
      expect(entry.errorMessage).toBe('Unexpected error in rule execution');
    });
  });

  describe('RuleProfilingCollector 型', () => {
    it('コレクタが計測エントリを収集できる', () => {
      const collector: RuleProfilingCollector = {
        entries: [],
        totalTimeMs: 0
      };

      const entry1: RuleProfilingEntry = {
        ruleName: 'style-consistency',
        executionTimeMs: 25.0,
        diagnosticsCount: 12,
        success: true
      };

      const entry2: RuleProfilingEntry = {
        ruleName: 'term-notation',
        executionTimeMs: 18.2,
        diagnosticsCount: 5,
        success: true
      };

      collector.entries.push(entry1);
      collector.entries.push(entry2);
      collector.totalTimeMs = entry1.executionTimeMs + entry2.executionTimeMs;

      expect(collector.entries).toHaveLength(2);
      expect(collector.totalTimeMs).toBe(43.2);
    });
  });

  describe('checkText でのプロファイリング', () => {
    it('コレクタが渡された場合に計測データが収集される', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      manager.checkText(text, tokens, undefined, undefined, collector);

      // 有効なルールの数だけエントリが作成される
      const enabledRulesCount = manager.getEnabledRules().length;
      expect(collector.entries.length).toBe(enabledRulesCount);
      expect(collector.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('コレクタが渡されない場合は計測処理をスキップする', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];

      // コレクタなしで呼び出してもエラーにならない
      expect(() => {
        manager.checkText(text, tokens);
      }).not.toThrow();
    });

    it('計測中でも診断結果が正しく返される（要件 1.3）', () => {
      const manager = new AdvancedRulesManager();
      // ら抜き言葉を含むテキスト
      const text = '食べれる。';
      const tokens = [
        createToken('食べ', '動詞', 0, '自立'),
        createToken('れる', '動詞', 2, '接尾'),
        createToken('。', '記号', 4)
      ];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      const diagnosticsWithCollector = manager.checkText(text, tokens, undefined, undefined, collector);
      const diagnosticsWithoutCollector = manager.checkText(text, tokens);

      // 計測の有無に関わらず同じ診断結果
      expect(diagnosticsWithCollector.length).toBe(diagnosticsWithoutCollector.length);
    });
  });

  describe('checkWithRules でのプロファイリング', () => {
    it('特定ルールのみの計測が正しく動作する', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      manager.checkWithRules(text, tokens, ['style-consistency'], undefined, undefined, collector);

      expect(collector.entries.length).toBe(1);
      expect(collector.entries[0].ruleName).toBe('style-consistency');
    });
  });

  describe('エラー耐性（要件 4.1, 4.2）', () => {
    it('ルール実行中の例外でも他ルールの計測が継続される', () => {
      const manager = new AdvancedRulesManager();

      // 例外を投げるモックルールを追加
      const brokenRule: AdvancedGrammarRule = {
        name: 'broken-rule',
        description: 'A rule that throws an error',
        check: (): AdvancedDiagnostic[] => {
          throw new Error('Intentional error for testing');
        },
        isEnabled: (): boolean => true
      };
      manager.registerRule(brokenRule);

      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      // 例外が発生してもエラーにならない
      expect(() => {
        manager.checkText(text, tokens, undefined, undefined, collector);
      }).not.toThrow();

      // broken-rule のエントリが存在し、失敗としてマークされている
      const brokenEntry = collector.entries.find(e => e.ruleName === 'broken-rule');
      expect(brokenEntry).toBeDefined();
      expect(brokenEntry!.success).toBe(false);
      expect(brokenEntry!.errorMessage).toContain('Intentional error');

      // 他のルールは正常に計測されている
      const successfulEntries = collector.entries.filter(e => e.success);
      expect(successfulEntries.length).toBeGreaterThan(0);
    });
  });

  describe('計測エントリの内容', () => {
    it('各エントリにルール名・実行時間・診断件数が含まれる（要件 2.1, 2.2）', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      manager.checkText(text, tokens, undefined, undefined, collector);

      for (const entry of collector.entries) {
        expect(typeof entry.ruleName).toBe('string');
        expect(entry.ruleName.length).toBeGreaterThan(0);
        expect(typeof entry.executionTimeMs).toBe('number');
        expect(entry.executionTimeMs).toBeGreaterThanOrEqual(0);
        expect(typeof entry.diagnosticsCount).toBe('number');
        expect(entry.diagnosticsCount).toBeGreaterThanOrEqual(0);
        expect(typeof entry.success).toBe('boolean');
      }
    });

    it('合計時間が全エントリの実行時間の合計と一致する（要件 2.3）', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('これ', '名詞', 0)];
      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };

      manager.checkText(text, tokens, undefined, undefined, collector);

      const sumOfEntries = collector.entries.reduce((sum, e) => sum + e.executionTimeMs, 0);
      expect(collector.totalTimeMs).toBeCloseTo(sumOfEntries, 2);
    });
  });
});

/**
 * AdvancedRulesManager 共有コンテキストテスト
 * Feature: advanced-rules-shared-preprocessing-cache
 * 要件: 1.1, 1.2, 2.1, 2.2, 3.1, 4.1, 4.2
 */
describe('AdvancedRulesManager - Shared Preprocessing Context', () => {
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

  describe('共有コンテキスト生成（要件 1.1, 1.2）', () => {
    it('buildSharedContextメソッドが存在する', () => {
      const manager = new AdvancedRulesManager();
      expect(typeof (manager as any).buildSharedContext).toBe('function');
    });

    it('コードブロック範囲が正しく検出される', () => {
      const manager = new AdvancedRulesManager();
      const text = 'テキスト\n```javascript\nconst x = 1;\n```\n続き';

      const shared = (manager as any).buildSharedContext(text);

      expect(shared.codeBlockRanges).toBeDefined();
      expect(shared.codeBlockRanges.length).toBe(1);
      // ```javascript から 閉じ``` までの範囲
      expect(shared.codeBlockRanges[0].start).toBe(text.indexOf('```javascript'));
      // 閉じ```を含む位置までを検出（```の直後まで）
      expect(shared.codeBlockRanges[0].end).toBe(text.indexOf('```\n続き') + 3);
    });

    it('インラインコード範囲が正しく検出される', () => {
      const manager = new AdvancedRulesManager();
      const text = 'これは`code`と`another`です。';

      const shared = (manager as any).buildSharedContext(text);

      expect(shared.inlineCodeRanges).toBeDefined();
      expect(shared.inlineCodeRanges.length).toBe(2);
    });

    it('codeRangesがコードブロックとインラインコードの結合になる', () => {
      const manager = new AdvancedRulesManager();
      const text = '`inline`テスト\n```\nblock\n```\n終わり';

      const shared = (manager as any).buildSharedContext(text);

      expect(shared.codeRanges).toBeDefined();
      expect(shared.codeRanges.length).toBe(2);
    });

    it('行開始位置が正しく計算される', () => {
      const manager = new AdvancedRulesManager();
      const text = '行1\n行2\n行3';

      const shared = (manager as any).buildSharedContext(text);

      expect(shared.lineStarts).toEqual([0, 3, 6]);
    });

    it('行テキストが正しく分割される', () => {
      const manager = new AdvancedRulesManager();
      const text = '行1\n行2\n行3';

      const shared = (manager as any).buildSharedContext(text);

      expect(shared.lines).toEqual(['行1', '行2', '行3']);
    });
  });

  describe('共有コンテキストのルールへの受け渡し（要件 2.1, 2.2）', () => {
    it('checkText時にcontext.sharedが設定される', () => {
      const manager = new AdvancedRulesManager();

      // 共有コンテキストを受け取るモックルールを作成
      let receivedShared: any = null;
      const mockRule: AdvancedGrammarRule = {
        name: 'test-shared-context',
        description: 'Test rule to verify shared context',
        check: (_tokens: Token[], context: RuleContext): AdvancedDiagnostic[] => {
          receivedShared = context.shared;
          return [];
        },
        isEnabled: (): boolean => true
      };

      manager['rules'] = [mockRule];
      const text = '`code`テスト\n```\nblock\n```';
      const tokens = [createToken('テスト', '名詞', 6)];

      manager.checkText(text, tokens);

      expect(receivedShared).toBeDefined();
      expect(receivedShared.codeBlockRanges).toBeDefined();
      expect(receivedShared.inlineCodeRanges).toBeDefined();
      expect(receivedShared.codeRanges).toBeDefined();
      expect(receivedShared.lineStarts).toBeDefined();
      expect(receivedShared.lines).toBeDefined();
    });

    it('context.sharedが未設定の場合も既存ロジックで動作する', () => {
      // 共有コンテキストなしでもルールが動作することを確認
      const manager = new AdvancedRulesManager();
      const text = 'これはテストです。';
      const tokens = [createToken('テスト', '名詞', 3)];

      // エラーなく実行できることを確認
      expect(() => {
        manager.checkText(text, tokens);
      }).not.toThrow();
    });
  });

  describe('キャッシュスコープ（要件 4.1, 4.2）', () => {
    it('共有コンテキストは解析サイクルごとに新しく生成される', () => {
      const manager = new AdvancedRulesManager();

      let sharedContext1: any = null;
      let sharedContext2: any = null;
      let callCount = 0;

      const mockRule: AdvancedGrammarRule = {
        name: 'test-shared-scope',
        description: 'Test rule to verify shared context scope',
        check: (_tokens: Token[], context: RuleContext): AdvancedDiagnostic[] => {
          callCount++;
          if (callCount === 1) {
            sharedContext1 = context.shared;
          } else if (callCount === 2) {
            sharedContext2 = context.shared;
          }
          return [];
        },
        isEnabled: (): boolean => true
      };

      manager['rules'] = [mockRule];
      const tokens = [createToken('テスト', '名詞', 0)];

      // 1回目の解析
      manager.checkText('テキスト1', tokens);
      // 2回目の解析（異なるテキスト）
      manager.checkText('テキスト2', tokens);

      // 各解析で異なる共有コンテキストが生成される
      expect(sharedContext1).not.toBe(sharedContext2);
      expect(sharedContext1.lines[0]).toBe('テキスト1');
      expect(sharedContext2.lines[0]).toBe('テキスト2');
    });

    it('文書間で共有コンテキストが再利用されない', () => {
      const manager = new AdvancedRulesManager();
      const sharedContexts: any[] = [];

      const mockRule: AdvancedGrammarRule = {
        name: 'test-no-reuse',
        description: 'Test rule to verify no reuse between documents',
        check: (_tokens: Token[], context: RuleContext): AdvancedDiagnostic[] => {
          sharedContexts.push(context.shared);
          return [];
        },
        isEnabled: (): boolean => true
      };

      manager['rules'] = [mockRule];
      const tokens = [createToken('テスト', '名詞', 0)];

      manager.checkText('ドキュメント1\n```\ncode\n```', tokens);
      manager.checkText('ドキュメント2', tokens);

      expect(sharedContexts.length).toBe(2);
      // 異なるオブジェクト参照であることを確認
      expect(sharedContexts[0]).not.toBe(sharedContexts[1]);
      // 内容も異なることを確認
      expect(sharedContexts[0].codeBlockRanges.length).toBe(1);
      expect(sharedContexts[1].codeBlockRanges.length).toBe(0);
    });
  });

  describe('正確性の維持（要件 3.1）', () => {
    it('コードブロック内の誤検出が抑制される', () => {
      const manager = new AdvancedRulesManager();
      const text = '```javascript\nconst Chatgpt = "test";\n```\nChatgptを使う。';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkWithRules(text, tokens, ['term-notation']);

      // コードブロック外のChatgptのみ検出される
      const termNotationDiags = diagnostics.filter(d => d.code === 'term-notation');
      // コードブロック内は検出されない
      expect(termNotationDiags.length).toBeLessThanOrEqual(1);
    });

    it('インラインコード内の誤検出が抑制される', () => {
      const manager = new AdvancedRulesManager();
      const text = '`Chatgpt`を使う。Chatgptは便利。';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkWithRules(text, tokens, ['term-notation']);

      // インラインコード外のChatgptのみ検出される
      const termNotationDiags = diagnostics.filter(d => d.code === 'term-notation');
      expect(termNotationDiags.length).toBeLessThanOrEqual(1);
    });
  });

  describe('ルール側の共有コンテキスト参照（要件 2.1, 2.2）', () => {
    it('TermNotationRuleが共有コンテキストのコード範囲を利用できる', () => {
      const manager = new AdvancedRulesManager();

      // コードブロック内とインラインコード内に誤表記がある場合
      const text = '```\nChatgpt\n```\n`Chatgpt`テスト。Chatgptを使う。';
      const tokens = [createToken('テスト', '名詞', 0)];

      // 共有コンテキストを受け取るか確認するためモックを使わず実行
      const diagnostics = manager.checkWithRules(text, tokens, ['term-notation']);

      // コード範囲外のChatgptのみ検出されるはず
      const termNotationDiags = diagnostics.filter(d => d.code === 'term-notation');
      expect(termNotationDiags.length).toBe(1);
    });

    it('EnglishCaseMixRuleが共有コンテキストのコード範囲を利用できる', () => {
      const manager = new AdvancedRulesManager();

      // コードブロック外で大文字小文字の混在
      const text = '```\napi\n```\nAPIとapiを使う。';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkWithRules(text, tokens, ['english-case-mix']);

      // コード外のAPI/apiの混在を検出
      const englishCaseDiags = diagnostics.filter(d => d.code === 'english-case-mix');
      // コードブロック内のapiは無視され、本文のAPI/apiのみ検出
      expect(englishCaseDiags.length).toBe(1);
    });

    it('QuotationStyleMixRuleが共有コンテキストのコード範囲を利用できる', () => {
      const manager = new AdvancedRulesManager();

      // コードブロック外で引用符の混在
      const text = '```\n"code"\n```\n「日本語」と"英語"を使う。';
      const tokens = [createToken('テスト', '名詞', 0)];

      const diagnostics = manager.checkWithRules(text, tokens, ['quotation-style-mix']);

      // コード外の引用符混在を検出（混在検出ルールは各出現箇所に診断を生成）
      const quotationDiags = diagnostics.filter(d => d.code === 'quotation-style-mix');
      // コードブロック内は無視され、本文の「」と""のみで混在検出
      expect(quotationDiags.length).toBeGreaterThan(0);
    });

    it('context.sharedがない場合もフォールバックして動作する', () => {
      // 直接ルールを呼び出してcontext.sharedなしでも動作することを確認
      const { TermNotationRule } = require('./rules/termNotationRule');
      const rule = new TermNotationRule();

      const context = {
        documentText: 'Chatgptを使う。',
        sentences: [],
        config: DEFAULT_ADVANCED_RULES_CONFIG
        // shared は未設定
      };

      // エラーなく動作する
      expect(() => {
        rule.check([], context);
      }).not.toThrow();
    });
  });
});

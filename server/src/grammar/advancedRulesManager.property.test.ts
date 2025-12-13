/**
 * AdvancedRulesManager Property-Based Tests
 * Feature: diagnostic-range-fix
 * 要件: 3.2
 *
 * プロパティベーステストで診断範囲の処理を検証
 *
 * 改善されたロジック:
 * - 要件 1.2: 既に正しい行/文字ベースの位置を持っている場合は変更しない
 * - 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
 */

import * as fc from 'fast-check';
import { AdvancedRulesManager } from './advancedRulesManager';
import { Token, Range, Diagnostic } from '../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedDiagnostic,
  RuleContext,
  AdvancedRulesConfig
} from '../../../shared/src/advancedTypes';

describe('Property-Based Tests: AdvancedRulesManager - Diagnostic Range Fix', () => {
  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: '*',
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
   */
  const createMockRule = (diagnosticRange: Range): AdvancedGrammarRule => {
    return {
      name: 'property-test-mock-rule',
      description: 'Mock rule for property testing',
      check: (_tokens: Token[], _context: RuleContext): AdvancedDiagnostic[] => {
        return [
          new AdvancedDiagnostic({
            range: diagnosticRange,
            message: 'Test diagnostic',
            code: 'style-inconsistency',
            ruleName: 'property-test-mock-rule'
          })
        ];
      },
      isEnabled: (_config: AdvancedRulesConfig): boolean => true
    };
  };

  /**
   * プロパティ 1: 行番号が0以外の範囲は変更されない
   * 要件 1.2: 既に正しい行/文字ベースの位置を持っている場合は変更しない
   */
  describe('Property 1: 行番号0以外の範囲は保持される', () => {
    it('行番号が1以上の範囲はそのまま保持される', () => {
      fc.assert(
        fc.property(
          fc.record({
            startLine: fc.integer({ min: 1, max: 100 }),
            startChar: fc.integer({ min: 0, max: 1000 }),
            endLine: fc.integer({ min: 1, max: 100 }),
            endChar: fc.integer({ min: 0, max: 1000 })
          }),
          ({ startLine, startChar, endLine, endChar }) => {
            // endLine >= startLine を保証
            const actualEndLine = Math.max(startLine, endLine);
            // 同じ行の場合、endChar >= startChar を保証
            const actualEndChar = startLine === actualEndLine
              ? Math.max(startChar, endChar)
              : endChar;

            const inputRange: Range = {
              start: { line: startLine, character: startChar },
              end: { line: actualEndLine, character: actualEndChar }
            };

            const manager = new AdvancedRulesManager();
            manager['rules'] = [];
            manager.registerRule(createMockRule(inputRange));

            const text = 'テスト文章です。\n二行目です。\n三行目です。';
            const tokens = [createToken('テスト', '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);

            expect(diagnostics).toHaveLength(1);
            // 行番号が1以上なので変換されない
            expect(diagnostics[0].range.start.line).toBe(startLine);
            expect(diagnostics[0].range.start.character).toBe(startChar);
            expect(diagnostics[0].range.end.line).toBe(actualEndLine);
            expect(diagnostics[0].range.end.character).toBe(actualEndChar);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 2: 行0で最初の行の長さ内の範囲は変更されない
   * 要件 1.2: 既に正しい行/文字ベースの位置を持っている場合は変更しない
   */
  describe('Property 2: 行0で最初の行内の範囲は保持される', () => {
    it('行0で最初の行の長さ内の範囲はそのまま保持される', () => {
      fc.assert(
        fc.property(
          fc.record({
            // 最初の行の長さ
            firstLineLength: fc.integer({ min: 5, max: 50 }),
            // 範囲は最初の行内に収まる
            startChar: fc.integer({ min: 0, max: 4 }),
            endChar: fc.integer({ min: 0, max: 4 })
          }),
          ({ firstLineLength, startChar, endChar }) => {
            const actualEndChar = Math.max(startChar, endChar);

            const inputRange: Range = {
              start: { line: 0, character: startChar },
              end: { line: 0, character: actualEndChar }
            };

            const manager = new AdvancedRulesManager();
            manager['rules'] = [];
            manager.registerRule(createMockRule(inputRange));

            // 最初の行を生成（firstLineLength文字）
            const firstLine = 'A'.repeat(firstLineLength);
            const text = firstLine + '\n二行目';
            const tokens = [createToken('テスト', '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);

            // 範囲が最初の行の長さ内なら変換されない
            expect(diagnostics).toHaveLength(1);
            expect(diagnostics[0].range.start.line).toBe(0);
            expect(diagnostics[0].range.start.character).toBe(startChar);
            expect(diagnostics[0].range.end.line).toBe(0);
            expect(diagnostics[0].range.end.character).toBe(actualEndChar);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 3: オフセットベースの範囲は正しく変換される
   * 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
   */
  describe('Property 3: オフセットベースの範囲は変換される', () => {
    it('最初の行の長さを超える character はオフセットとして変換される', () => {
      fc.assert(
        fc.property(
          fc.record({
            // オフセットは最初の行を超える値
            offset: fc.integer({ min: 10, max: 50 })
          }),
          ({ offset }) => {
            // テキスト: "ABC\nDEF\nGHI" (11文字)
            // 最初の行の長さ: 3
            const text = 'ABC\nDEF\nGHI';
            const firstLineLength = 3;

            // オフセットが最初の行の長さを超えているので変換される
            const inputRange: Range = {
              start: { line: 0, character: offset },
              end: { line: 0, character: offset + 1 }
            };

            const manager = new AdvancedRulesManager();
            manager['rules'] = [];
            manager.registerRule(createMockRule(inputRange));

            const tokens = [createToken('テスト', '名詞', 0)];
            const diagnostics = manager.checkText(text, tokens);

            expect(diagnostics).toHaveLength(1);
            // オフセットベースなので変換される（line: 0 ではなくなる可能性がある）
            // 少なくとも character が最初の行の長さを超えることはない
            if (diagnostics[0].range.start.line === 0) {
              expect(diagnostics[0].range.start.character).toBeLessThanOrEqual(firstLineLength);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 4: 範囲の有効性
   * 出力される診断の範囲は常に有効（開始 <= 終了）
   */
  describe('Property 4: 範囲の有効性', () => {
    it('出力される診断の範囲は有効である（開始 <= 終了）', () => {
      fc.assert(
        fc.property(
          fc.record({
            startLine: fc.integer({ min: 0, max: 50 }),
            startChar: fc.integer({ min: 0, max: 500 }),
            lineDiff: fc.integer({ min: 0, max: 10 }),
            charDiff: fc.integer({ min: 0, max: 100 })
          }),
          ({ startLine, startChar, lineDiff, charDiff }) => {
            // 有効な範囲を生成（開始 <= 終了）
            const endLine = startLine + lineDiff;
            const endChar = lineDiff === 0 ? startChar + charDiff : charDiff;

            const inputRange: Range = {
              start: { line: startLine, character: startChar },
              end: { line: endLine, character: endChar }
            };

            const manager = new AdvancedRulesManager();
            manager['rules'] = [];
            manager.registerRule(createMockRule(inputRange));

            const text = 'テスト\n二行目\n三行目';
            const tokens = [createToken('テスト', '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);

            expect(diagnostics).toHaveLength(1);
            const diag = diagnostics[0];

            // 範囲の有効性を検証
            if (diag.range.start.line === diag.range.end.line) {
              expect(diag.range.start.character).toBeLessThanOrEqual(diag.range.end.character);
            } else {
              expect(diag.range.start.line).toBeLessThan(diag.range.end.line);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 5: 複数診断の独立性
   * 複数のルールから生成された診断は、それぞれ独立して処理される
   */
  describe('Property 5: 複数診断の独立性', () => {
    it('複数の診断がそれぞれ独立して処理される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              line: fc.integer({ min: 1, max: 20 }),
              startChar: fc.integer({ min: 0, max: 50 }),
              endChar: fc.integer({ min: 0, max: 50 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (rangeParams) => {
            const manager = new AdvancedRulesManager();
            manager['rules'] = [];

            const inputRanges: Range[] = rangeParams.map((p, index) => {
              const range: Range = {
                start: { line: p.line, character: p.startChar },
                end: { line: p.line, character: Math.max(p.startChar, p.endChar) }
              };
              manager.registerRule({
                name: `mock-rule-${index}`,
                description: `Mock rule ${index}`,
                check: () => [
                  new AdvancedDiagnostic({
                    range,
                    message: `Diagnostic ${index}`,
                    code: 'style-inconsistency',
                    ruleName: `mock-rule-${index}`
                  })
                ],
                isEnabled: () => true
              });
              return range;
            });

            const text = 'テスト\n二行目\n三行目';
            const tokens = [createToken('テスト', '名詞', 0)];

            const diagnostics = manager.checkText(text, tokens);

            // 各診断が正しく処理されている
            expect(diagnostics).toHaveLength(inputRanges.length);
            // 行番号が1以上なので変換されずに保持される
            for (let i = 0; i < inputRanges.length; i++) {
              const expectedRange = inputRanges[i];
              const matchingDiag = diagnostics.find(
                d =>
                  d.range.start.line === expectedRange.start.line &&
                  d.range.start.character === expectedRange.start.character &&
                  d.range.end.line === expectedRange.end.line &&
                  d.range.end.character === expectedRange.end.character
              );
              expect(matchingDiag).toBeDefined();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * プロパティ 6: checkWithRulesでも同じ処理が適用される
   */
  describe('Property 6: checkWithRulesでの処理', () => {
    it('checkWithRulesでも同じ変換ロジックが適用される', () => {
      fc.assert(
        fc.property(
          fc.record({
            line: fc.integer({ min: 1, max: 50 }),
            startChar: fc.integer({ min: 0, max: 100 }),
            charLen: fc.integer({ min: 1, max: 50 })
          }),
          ({ line, startChar, charLen }) => {
            const inputRange: Range = {
              start: { line, character: startChar },
              end: { line, character: startChar + charLen }
            };

            const manager = new AdvancedRulesManager();
            manager['rules'] = [];
            manager.registerRule({
              name: 'specific-rule',
              description: 'Specific rule',
              check: () => [
                new AdvancedDiagnostic({
                  range: inputRange,
                  message: 'Test',
                  code: 'style-inconsistency',
                  ruleName: 'specific-rule'
                })
              ],
              isEnabled: () => true
            });

            const text = 'テスト\n二行目\n三行目';
            const tokens = [createToken('テスト', '名詞', 0)];

            const diagnostics = manager.checkWithRules(text, tokens, ['specific-rule']);

            // 行番号が1以上なので変換されない
            expect(diagnostics).toHaveLength(1);
            expect(diagnostics[0].range.start.line).toBe(line);
            expect(diagnostics[0].range.start.character).toBe(startChar);
            expect(diagnostics[0].range.end.line).toBe(line);
            expect(diagnostics[0].range.end.character).toBe(startChar + charLen);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

/**
 * DiagnosticRangeFixer Unit Tests
 * Feature: diagnostic-range-fix
 *
 * AdvancedRulesManager から分離した「オフセットベース range → 行/文字ベース」変換ロジックを
 * コンポーネント単体で直接保護する。
 */

import { DiagnosticRangeFixer } from './diagnosticRangeFixer';
import { Diagnostic, DiagnosticSeverity } from '../../../shared/src/types';

function makeDiag(
  startLine: number,
  startChar: number,
  endLine: number,
  endChar: number
): Diagnostic {
  return {
    range: {
      start: { line: startLine, character: startChar },
      end: { line: endLine, character: endChar },
    },
    severity: DiagnosticSeverity.Warning,
    message: 'test',
    code: 'test-code',
    source: 'test',
  };
}

describe('DiagnosticRangeFixer', () => {
  describe('行/文字ベースの range は変更しない', () => {
    it('行番号が0以外の range はそのまま返す', () => {
      const fixer = DiagnosticRangeFixer.fromText('ABCD\nEFGH');
      const diag = makeDiag(1, 0, 1, 2);
      expect(fixer.fix(diag)).toBe(diag);
    });

    it('行0で先頭行長以内の range はそのまま返す', () => {
      // "ABCD\nEFGH" -> 先頭行長は4
      const fixer = DiagnosticRangeFixer.fromText('ABCD\nEFGH');
      const diag = makeDiag(0, 0, 0, 4);
      const fixed = fixer.fix(diag);
      expect(fixed.range.start).toEqual({ line: 0, character: 0 });
      expect(fixed.range.end).toEqual({ line: 0, character: 4 });
    });
  });

  describe('オフセットベースの range は行/文字ベースへ変換する', () => {
    it('先頭行長+1 の character はオフセットとして次行へ変換される', () => {
      // "ABCD\nEFGH" -> 先頭行長は4。オフセット5 = 行1の先頭
      const fixer = DiagnosticRangeFixer.fromText('ABCD\nEFGH');
      const fixed = fixer.fix(makeDiag(0, 5, 0, 6));
      expect(fixed.range.start).toEqual({ line: 1, character: 0 });
      expect(fixed.range.end).toEqual({ line: 1, character: 1 });
    });

    it('複数行にまたがるオフセットも正しく変換される', () => {
      // "行1\n行2\n行3" lineStarts = [0,3,6]
      const text = '行1\n行2\n行3';
      const fixer = DiagnosticRangeFixer.fromText(text);
      // オフセット6 = 行2先頭(=行index2), オフセット8 = 行2の3文字目
      const fixed = fixer.fix(makeDiag(0, 6, 0, 8));
      expect(fixed.range.start).toEqual({ line: 2, character: 0 });
      expect(fixed.range.end).toEqual({ line: 2, character: 2 });
    });
  });

  describe('境界値', () => {
    it('先頭行長ちょうどは変換されない', () => {
      const fixer = DiagnosticRangeFixer.fromText('ABCD\nEFGH');
      const fixed = fixer.fix(makeDiag(0, 0, 0, 4));
      expect(fixed.range.end.line).toBe(0);
      expect(fixed.range.end.character).toBe(4);
    });

    it('改行のない単一行テキストでは先頭行長 = 全長として扱う', () => {
      const fixer = DiagnosticRangeFixer.fromText('ABCDEFGH');
      const diag = makeDiag(0, 0, 0, 8);
      // 全長8 以内なので変換されない
      expect(fixer.fix(diag)).toBe(diag);
    });
  });

  describe('precomputed lineStarts の再利用', () => {
    it('外部から渡した lineStarts を getLineStarts で参照できる', () => {
      const lineStarts = [0, 3, 6];
      const fixer = DiagnosticRangeFixer.fromText('行1\n行2\n行3', lineStarts);
      expect(fixer.getLineStarts()).toBe(lineStarts);
    });
  });
});

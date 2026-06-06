/**
 * Diagnostic Range Fixer
 * Feature: diagnostic-range-fix
 *
 * 診断の range がオフセットベース（line:0 に文字オフセットが詰められた状態）の場合だけ、
 * 行/文字ベースへ変換する純粋なドメインロジック。
 *
 * AdvancedRulesManager から分離された責務:
 *   - 解析対象テキストの行構造（lineStarts / 先頭行長）の保持
 *   - オフセット → 行/文字 への変換
 *   - 「オフセットベースかどうか」の判定と必要時の変換
 *
 * 1 解析サイクルにつき 1 インスタンスを `fromText` で生成して使う想定（不変オブジェクト）。
 */

import { Diagnostic, Position } from '../../../shared/src/types';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';

export class DiagnosticRangeFixer {
  private readonly lineStarts: number[];
  /**
   * 「最初の改行までの長さ」。range が line:0 のとき、character がこれを超えていれば
   * オフセットベースと判断する閾値になる。
   */
  private readonly firstLineLength: number;

  private constructor(lineStarts: number[], firstLineLength: number) {
    this.lineStarts = lineStarts;
    this.firstLineLength = firstLineLength;
  }

  /**
   * テキスト（と任意の算出済み lineStarts）から fixer を生成する。
   *
   * 解析サイクルの上位で既に lineStarts が算出済みなら、それを使い回す。
   * maskTableContent / MarkdownFilter は改行と長さを保持するため、
   * 上位で算出した lineStarts と effectiveText の lineStarts は一致する。
   */
  static fromText(text: string, precomputedLineStarts?: number[]): DiagnosticRangeFixer {
    const lineStarts = precomputedLineStarts ?? computeLineStarts(text);
    let firstLineLength: number;
    if (lineStarts.length >= 2) {
      // computeLineStarts は最初の改行直後の位置を index=1 に持つので、
      // それから 1 を引いた値が「最初の改行までの長さ」になる
      firstLineLength = lineStarts[1] - 1;
    } else {
      firstLineLength = text.length;
    }
    return new DiagnosticRangeFixer(lineStarts, firstLineLength);
  }

  /**
   * この fixer が保持する行開始位置配列（共有コンテキスト構築での再利用用）。
   */
  getLineStarts(): number[] {
    return this.lineStarts;
  }

  /**
   * オフセットから行と文字位置を取得
   */
  private offsetToPosition(offset: number): Position {
    return offsetToLineAndCharacter(this.lineStarts, offset);
  }

  /**
   * 診断の range がオフセットベースかどうかを判定して必要に応じて変換する。
   *
   * 判定ロジック:
   * - line: 0 かつ character が最初の行の長さを超えている場合はオフセットベースと判断
   * - それ以外は正しい行/文字ベースと判断してそのまま返す
   *
   * 要件 1.2: 既に正しい範囲を持っている場合は変更しない
   * 要件 1.3: オフセットベースの場合は行/文字ベースに変換する
   */
  fix(diagnostic: Diagnostic): Diagnostic {
    const { start, end } = diagnostic.range;

    // 行番号が0でない場合、または両方の行番号が異なる場合は
    // 既に正しい行/文字ベースの位置を持っていると判断
    if (start.line !== 0 || end.line !== 0 || start.line !== end.line) {
      return diagnostic;
    }

    // line: 0 の場合、character が最初の行の長さを超えているかチェック
    // 超えている場合はオフセットベースと判断して変換
    const maxChar = Math.max(start.character, end.character);
    if (maxChar > this.firstLineLength) {
      // オフセットベースの範囲を行/文字ベースに変換
      const newStart = this.offsetToPosition(start.character);
      const newEnd = this.offsetToPosition(end.character);
      return {
        ...diagnostic,
        range: { start: newStart, end: newEnd }
      };
    }

    // 最初の行の範囲内なので、正しい行/文字ベースと判断
    return diagnostic;
  }
}

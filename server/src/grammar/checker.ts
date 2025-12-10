/**
 * Grammar Checker
 * 日本語文法エラーを検出する
 * Feature: japanese-grammar-analyzer
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { Token, Diagnostic, DiagnosticSeverity, Range, GrammarError, GrammarErrorType } from '../../../shared/src/types';

/**
 * 文法ルールインターフェース
 */
interface GrammarRule {
  name: string;
  check(tokens: Token[], index: number): GrammarError | null;
}

/**
 * 自動詞リスト（「を」と合わない動詞）
 */
const INTRANSITIVE_VERBS = new Set([
  '行く', '来る', '帰る', '走る', '歩く', '泳ぐ', '飛ぶ', '落ちる',
  'いる', 'ある', 'なる', 'できる', '起きる', '寝る', '座る', '立つ',
  '住む', '通う', '届く', '届く', '入る', '出る', '着く', '戻る'
]);

/**
 * 有効な助詞の組み合わせ（係助詞との組み合わせ）
 */
const VALID_PARTICLE_COMBINATIONS = new Set([
  'には', 'では', 'とは', 'からは', 'まで', 'への', 'からの', 'との'
]);

/**
 * 問題のある助詞の組み合わせ（格助詞同士）
 */
const PROBLEMATIC_PARTICLE_COMBINATIONS = new Set([
  'がを', 'をが', 'がに', 'にが', 'がで', 'でが', 'をに', 'にを', 'をで', 'でを'
]);

/**
 * 文法チェッカー
 */
export class GrammarChecker {
  private rules: GrammarRule[];
  private lineStarts: number[] = [0];

  constructor() {
    this.rules = [
      new DoubleParticleRule(this),
      new ParticleSequenceRule(this),
      new VerbParticleMismatchRule(this),
      new RedundantCopulaRule(this)
    ];
  }

  /**
   * テキストから行開始位置を計算
   */
  private calculateLineStarts(text: string): void {
    this.lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  /**
   * オフセットから行と文字位置を取得
   */
  getLineAndChar(offset: number): { line: number; character: number } {
    let line = 0;
    for (let i = 1; i < this.lineStarts.length; i++) {
      if (offset < this.lineStarts[i]) {
        break;
      }
      line = i;
    }
    return { line, character: offset - this.lineStarts[line] };
  }

  /**
   * トークンリストをチェックして文法エラーを検出
   */
  check(tokens: Token[], text?: string): Diagnostic[] {
    if (!tokens || tokens.length === 0) {
      return [];
    }

    // テキストがあれば行開始位置を計算
    if (text) {
      this.calculateLineStarts(text);
    }

    const diagnostics: Diagnostic[] = [];

    for (let i = 0; i < tokens.length; i++) {
      for (const rule of this.rules) {
        const error = rule.check(tokens, i);
        if (error) {
          diagnostics.push(error.toDiagnostic());
        }
      }
    }

    return diagnostics;
  }
}

/**
 * 二重助詞検出ルール
 * 同じ助詞が連続して出現する場合を検出
 */
class DoubleParticleRule implements GrammarRule {
  name = 'double-particle';
  private checker: GrammarChecker;

  constructor(checker: GrammarChecker) {
    this.checker = checker;
  }

  check(tokens: Token[], index: number): GrammarError | null {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (!current || !next) {
      return null;
    }

    // 両方が助詞で、同じ表層形の場合
    if (current.isParticle() && next.isParticle() && current.surface === next.surface) {
      const range = this.createRange(current, next);
      return new GrammarError({
        type: 'double-particle',
        tokens: [current, next],
        range,
        message: `二重助詞「${current.surface}${next.surface}」が検出されました。「${current.surface}」を1つにしてください。`,
        suggestion: `「${current.surface}」を1つにする`
      });
    }

    return null;
  }

  private createRange(start: Token, end: Token): Range {
    const startPos = this.checker.getLineAndChar(start.start);
    const endPos = this.checker.getLineAndChar(end.end);
    return {
      start: startPos,
      end: endPos
    };
  }
}

/**
 * 助詞連続検出ルール
 * 不適切な助詞の連続を検出
 */
class ParticleSequenceRule implements GrammarRule {
  name = 'particle-sequence';
  private checker: GrammarChecker;

  constructor(checker: GrammarChecker) {
    this.checker = checker;
  }

  check(tokens: Token[], index: number): GrammarError | null {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (!current || !next) {
      return null;
    }

    // 両方が助詞の場合
    if (!current.isParticle() || !next.isParticle()) {
      return null;
    }

    // 同じ助詞の連続は DoubleParticleRule で処理
    if (current.surface === next.surface) {
      return null;
    }

    const combination = current.surface + next.surface;

    // 有効な組み合わせは許可
    if (VALID_PARTICLE_COMBINATIONS.has(combination)) {
      return null;
    }

    // 問題のある組み合わせを検出
    if (PROBLEMATIC_PARTICLE_COMBINATIONS.has(combination)) {
      const range = this.createRange(current, next);
      return new GrammarError({
        type: 'particle-sequence',
        tokens: [current, next],
        range,
        message: `不適切な助詞連続「${combination}」が検出されました。文の構造を見直してください。`,
        suggestion: `助詞の使い方を見直す`
      });
    }

    return null;
  }

  private createRange(start: Token, end: Token): Range {
    const startPos = this.checker.getLineAndChar(start.start);
    const endPos = this.checker.getLineAndChar(end.end);
    return {
      start: startPos,
      end: endPos
    };
  }
}

/**
 * 動詞-助詞不整合検出ルール
 * 自動詞と「を」の組み合わせなど不自然な組み合わせを検出
 */
class VerbParticleMismatchRule implements GrammarRule {
  name = 'verb-particle-mismatch';
  private checker: GrammarChecker;

  constructor(checker: GrammarChecker) {
    this.checker = checker;
  }

  check(tokens: Token[], index: number): GrammarError | null {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (!current || !next) {
      return null;
    }

    // 「を」+ 動詞のパターンをチェック
    if (current.isParticle() && current.surface === 'を' && next.isVerb()) {
      // 自動詞との組み合わせをチェック
      if (INTRANSITIVE_VERBS.has(next.baseForm) || INTRANSITIVE_VERBS.has(next.surface)) {
        const range = this.createRange(current, next);
        return new GrammarError({
          type: 'verb-particle-mismatch',
          tokens: [current, next],
          range,
          message: `動詞「${next.surface}」は自動詞のため、助詞「を」との組み合わせが不自然です。「に」や「へ」を使用してください。`,
          suggestion: `「を」を「に」または「へ」に変更する`
        });
      }
    }

    return null;
  }

  private createRange(start: Token, end: Token): Range {
    const startPos = this.checker.getLineAndChar(start.start);
    const endPos = this.checker.getLineAndChar(end.end);
    return {
      start: startPos,
      end: endPos
    };
  }
}

/**
 * 冗長な助動詞検出ルール
 * 「でです」「にます」のような不自然な組み合わせを検出
 */
class RedundantCopulaRule implements GrammarRule {
  name = 'redundant-copula';
  private checker: GrammarChecker;

  // 問題のある組み合わせパターン
  private static readonly PROBLEMATIC_PATTERNS: Array<{particle: string; auxiliary: string; message: string}> = [
    { particle: 'で', auxiliary: 'です', message: '「でです」は冗長です。「です」のみにしてください。' },
    { particle: 'で', auxiliary: 'ます', message: '「でます」は不自然です。文の構造を見直してください。' },
    { particle: 'に', auxiliary: 'です', message: '「にです」は不自然です。文の構造を見直してください。' },
  ];

  constructor(checker: GrammarChecker) {
    this.checker = checker;
  }

  check(tokens: Token[], index: number): GrammarError | null {
    const current = tokens[index];
    const next = tokens[index + 1];

    if (!current || !next) {
      return null;
    }

    // 助詞 + 助動詞のパターンをチェック
    if (!current.isParticle()) {
      return null;
    }

    // 助動詞かどうかをチェック（品詞が助動詞）
    if (next.pos !== '助動詞') {
      return null;
    }

    // 問題のあるパターンを検索
    for (const pattern of RedundantCopulaRule.PROBLEMATIC_PATTERNS) {
      if (current.surface === pattern.particle && next.surface === pattern.auxiliary) {
        const range = this.createRange(current, next);
        return new GrammarError({
          type: 'particle-sequence' as GrammarErrorType,
          tokens: [current, next],
          range,
          message: pattern.message,
          suggestion: `「${pattern.particle}」を削除する`
        });
      }
    }

    return null;
  }

  private createRange(start: Token, end: Token): Range {
    const startPos = this.checker.getLineAndChar(start.start);
    const endPos = this.checker.getLineAndChar(end.end);
    return {
      start: startPos,
      end: endPos
    };
  }
}

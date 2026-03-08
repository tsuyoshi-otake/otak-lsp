/**
 * Particle Repetition Rule
 * 同じ助詞の連続使用を検出する
 * Feature: advanced-grammar-rules
 * 要件: 4.1, 4.3, 4.4, 4.5
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence
} from '../../../../shared/src/advancedTypes';
import { containsJapanese } from '../../utils/regexPatterns';
import { isBlank } from '../../utils/stringUtils';

/**
 * 助詞連続使用検出ルール
 */
export class ParticleRepetitionRule implements AdvancedGrammarRule {
  name = 'particle-repetition';
  description = '同じ助詞の連続使用を検出します';

  private static readonly IGNORED_PARTICLES = new Set(['の']);
  private static readonly PREDICATE_BOUNDARY_POS = new Set(['動詞', '形容詞', '助動詞']);
  private static readonly TABLE_ROW_PREFIX = /^\s*\|/;

  private static readonly QUOTE_PAIRS: ReadonlyArray<[string, string]> = [
    ['「', '」'],
    ['『', '』'],
    ['（', '）'],
    ['(', ')'],
    ['【', '】'],
    ['〈', '〉'],
    ['《', '》'],
    ['“', '”'],
    ['"', '"'],
    ["'", "'"]
  ];

  private isQuotedToken(token: Token, documentText: string): boolean {
    const beforeIndex = token.start - 1;
    const afterIndex = token.end;
    if (beforeIndex < 0 || afterIndex >= documentText.length) {
      return false;
    }

    const before = documentText[beforeIndex];
    const after = documentText[afterIndex];
    return ParticleRepetitionRule.QUOTE_PAIRS.some(
      ([open, close]) => before === open && after === close
    );
  }

  /**
   * テーブル行からインラインコードを抽出
   */
  private extractInlineCodeFromTableRow(text: string): { text: string; start: number; end: number } | null {
    if (!ParticleRepetitionRule.TABLE_ROW_PREFIX.test(text) || !text.includes('|')) {
      return null;
    }

    const matches = Array.from(text.matchAll(/`([^`]+)`/g));
    if (matches.length === 0) {
      return null;
    }

    // 例文っぽいもの（日本語を含む/長いもの）を優先
    let best = matches[0];
    for (const m of matches) {
      const candidate = m[1] ?? '';
      const bestCandidate = best[1] ?? '';
      const candidateLooksJapanese = containsJapanese(candidate);
      const bestLooksJapanese = containsJapanese(bestCandidate);
      if (candidateLooksJapanese && !bestLooksJapanese) {
        best = m;
        continue;
      }
      if (candidateLooksJapanese === bestLooksJapanese && candidate.length > bestCandidate.length) {
        best = m;
      }
    }

    const fullMatch = best[0] ?? '';
    const inner = best[1] ?? '';
    const index = typeof best.index === 'number' ? best.index : text.indexOf(fullMatch);
    if (index < 0) {
      return null;
    }

    const start = index + 1;
    const end = start + inner.length;
    return { text: inner, start, end };
  }

  /**
   * テーブル行の最後のセルを抽出（インラインコードがない場合のフォールバック）
   * EVALSテーブル形式: | カテゴリ | ステータス | 例文 |
   */
  private extractLastCellFromTableRow(text: string): { text: string; start: number; end: number } | null {
    if (!ParticleRepetitionRule.TABLE_ROW_PREFIX.test(text) || !text.includes('|')) {
      return null;
    }

    // パイプで分割してセルを取得
    const cells = text.split('|');
    if (cells.length < 3) {
      return null;
    }

    // 最後のセル（末尾の空セルを除く）
    let lastCellIndex = cells.length - 1;
    while (lastCellIndex > 0 && isBlank(cells[lastCellIndex])) {
      lastCellIndex--;
    }

    const lastCell = cells[lastCellIndex].trim();

    // 日本語を含むセルのみ対象（例文セル）
    if (!/[ぁ-んァ-ン一-龠]/.test(lastCell)) {
      return null;
    }

    // テーブル区切り行（---）は除外
    if (/^[-:]+$/.test(lastCell)) {
      return null;
    }

    // セルの開始位置を計算
    let startPos = 0;
    for (let i = 0; i < lastCellIndex; i++) {
      startPos += cells[i].length + 1; // +1 for '|'
    }
    // セル内の先頭空白をスキップ
    const cellContent = cells[lastCellIndex];
    const leadingSpaces = cellContent.length - cellContent.trimStart().length;
    startPos += leadingSpaces;

    return {
      text: lastCell,
      start: startPos,
      end: startPos + lastCell.length
    };
  }

  private buildSentenceForInlineCode(sentence: Sentence, inline: { text: string; start: number; end: number }): Sentence {
    const startOffset = sentence.start + Math.max(0, inline.start);
    const endOffset = sentence.start + Math.max(Math.max(0, inline.start), inline.end);
    return new Sentence({
      text: inline.text,
      tokens: sentence.tokens.filter((t) => t.start >= startOffset && t.end <= endOffset),
      start: startOffset,
      end: endOffset
    });
  }

  /**
   * 文内の同じ助詞の連続使用を検出
   */
  findRepeatedParticles(
    sentence: Sentence,
    documentText: string
  ): Array<{ particle: string; positions: number[] }> {
    const particles: Map<string, { totalPositions: number[]; positionsBySegment: Map<number, number[]> }> = new Map();
    let segmentIndex = 0;

    for (let index = 0; index < sentence.tokens.length; index++) {
      const token = sentence.tokens[index];
      const prev = index > 0 ? sentence.tokens[index - 1] : undefined;

      // 述語（動詞/形容詞/助動詞）が出現したら、以降は別節として扱う
      // 例: 「Aを解析し、Bを検出する」の「を」は別述語に掛かるため誤検知しやすい
      if (ParticleRepetitionRule.PREDICATE_BOUNDARY_POS.has(token.pos)) {
        segmentIndex++;
      }

      if (token.pos !== '助詞') {
        continue;
      }
      if (ParticleRepetitionRule.IGNORED_PARTICLES.has(token.surface)) {
        continue;
      }
      if (this.isQuotedToken(token, documentText)) {
        continue;
      }

      // 「がが」「をを」などの二重助詞は基本ルールで検出するため、ここでは重複して報告しない
      if (prev && prev.pos === '助詞' && prev.surface === token.surface) {
        continue;
      }

      const entry = particles.get(token.surface) ?? {
        totalPositions: [],
        positionsBySegment: new Map<number, number[]>()
      };
      entry.totalPositions.push(token.start);
      const segmentPositions = entry.positionsBySegment.get(segmentIndex) ?? [];
      segmentPositions.push(token.start);
      entry.positionsBySegment.set(segmentIndex, segmentPositions);
      particles.set(token.surface, entry);
    }

    const repetitions: Array<{ particle: string; positions: number[] }> = [];
    for (const [particle, entry] of particles) {
      if (entry.totalPositions.length < 2) {
        continue;
      }
      const hasProblemSegment = Array.from(entry.positionsBySegment.values()).some(
        (positions) => positions.length >= 2
      );
      if (!hasProblemSegment) {
        continue;
      }
      repetitions.push({ particle, positions: entry.totalPositions });
    }

    return repetitions;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const sentence of context.sentences) {
      let sentenceToCheck = sentence;
      const isTableRow = ParticleRepetitionRule.TABLE_ROW_PREFIX.test(sentence.text) && sentence.text.includes('|');
      if (isTableRow) {
        // まずインラインコードを探す
        let cellContent = this.extractInlineCodeFromTableRow(sentence.text);
        // インラインコードがなければ最後のセル（例文セル）を使用
        if (!cellContent) {
          cellContent = this.extractLastCellFromTableRow(sentence.text);
        }
        if (!cellContent) {
          continue;
        }
        sentenceToCheck = this.buildSentenceForInlineCode(sentence, cellContent);
      }

      const repetitions = this.findRepeatedParticles(sentenceToCheck, context.documentText);

      for (const rep of repetitions) {
        const startChar = Math.min(...rep.positions);
        const endChar = Math.max(...rep.positions) + rep.particle.length;
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: startChar },
            end: { line: 0, character: endChar }
          },
          message: `同じ助詞「${rep.particle}」が${rep.positions.length}回使用されています。文の構造を見直してください。`,
          code: 'particle-repetition',
          ruleName: this.name,
          suggestions: ['文を分割する', '別の表現に言い換える']
        }));
      }
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableParticleRepetition;
  }
}

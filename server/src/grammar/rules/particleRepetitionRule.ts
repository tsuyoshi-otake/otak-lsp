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

/**
 * 助詞連続使用検出ルール
 */
export class ParticleRepetitionRule implements AdvancedGrammarRule {
  name = 'particle-repetition';
  description = '同じ助詞の連続使用を検出します';

  private static readonly IGNORED_PARTICLES = new Set(['の']);
  private static readonly PREDICATE_BOUNDARY_POS = new Set(['動詞', '形容詞', '助動詞']);

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
      const repetitions = this.findRepeatedParticles(sentence, context.documentText);

      for (const rep of repetitions) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: 0, character: sentence.start },
            end: { line: 0, character: sentence.end }
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

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

  /**
   * 文内の同じ助詞の連続使用を検出
   */
  findRepeatedParticles(sentence: Sentence): Array<{ particle: string; positions: number[] }> {
    const particles: Map<string, number[]> = new Map();

    for (const token of sentence.tokens) {
      if (token.pos === '助詞') {
        const positions = particles.get(token.surface) || [];
        positions.push(token.start);
        particles.set(token.surface, positions);
      }
    }

    const repetitions: Array<{ particle: string; positions: number[] }> = [];
    for (const [particle, positions] of particles) {
      if (positions.length >= 2) {
        repetitions.push({ particle, positions });
      }
    }

    return repetitions;
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];

    for (const sentence of context.sentences) {
      const repetitions = this.findRepeatedParticles(sentence);

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

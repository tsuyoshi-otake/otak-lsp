/**
 * Sentence Complexity Rule
 * 文単位の複雑度を計測し、閾値を超えた場合に警告する
 * Feature: sentence-complexity-rule
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic,
  Sentence,
  ComplexityMetrics,
  SentenceComplexity,
  CodeRange
} from '../../../../shared/src/advancedTypes';
import { isNotEmpty } from '../../utils/arrayUtils';

/**
 * デフォルトの重み付け（合計100）
 */
const DEFAULT_WEIGHTS = {
  characterCount: 30,
  commaCount: 20,
  clauseDepth: 20,
  noChainLength: 15,
  nounChainLength: 15
} as const;

/**
 * 各要素の正規化閾値
 */
const NORMALIZATION_THRESHOLDS = {
  characterCount: { min: 0, max: 200 },
  commaCount: { min: 0, max: 8 },
  clauseDepth: { min: 0, max: 5 },
  noChainLength: { min: 0, max: 5 },
  nounChainLength: { min: 0, max: 8 }
} as const;

// 一項目だけが極端に高い場合も、他項目の低さで警告が消えないようにする。
// 一般的な組合せは従来の加重スコアを維持する。最大スコアは100。
const EXTREME_FACTOR_SCORES = {
  noChainLength: 6,
  nounChainLength: 3,
  clauseDepth: 12
} as const;

/**
 * 文複雑度計測ルール
 * Japanese Sentence Complexity Index (JSCI)
 */
export class SentenceComplexityRule implements AdvancedGrammarRule {
  name = 'sentence-complexity';
  description = '文単位の複雑度を計測し、複雑すぎる文を検出します';

  /**
   * 値を0-1の範囲に正規化
   */
  private normalizeValue(value: number, min: number, max: number): number {
    if (value <= min) return 0;
    if (value >= max) return 1;
    return (value - min) / (max - min);
  }

  /**
   * 助詞「の」の最大連続長を計算
   * @param tokens トークンリスト
   * @returns 最大連続長
   */
  calculateMaxNoChainLength(tokens: Token[]): number {
    let maxChain = 0;
    let currentChain = 0;
    let previousEnd = 0;
    const maxGap = 20; // 「の」間の最大許容距離（文字数）

    for (const token of tokens) {
      if (token.surface === 'の' && token.isParticle()) {
        currentChain = currentChain > 0 && token.start - previousEnd <= maxGap
          ? currentChain + 1
          : 1;
        maxChain = Math.max(maxChain, currentChain);
        previousEnd = token.end;
      } else if (token.isParticle() || token.isVerb() || token.pos === '助動詞' || token.pos === '記号') {
        // 別の節や文をまたぐ「の」は、同じ名詞句の連続ではない。
        currentChain = 0;
      }
    }

    return maxChain;
  }

  /**
   * 名詞の最大連続長を計算
   * @param tokens トークンリスト
   * @returns 最大連続長
   */
  calculateMaxNounChainLength(tokens: Token[]): number {
    let maxChain = 0;
    let currentChain = 0;

    for (const token of tokens) {
      if (token.isNoun()) {
        currentChain++;
        maxChain = Math.max(maxChain, currentChain);
      } else {
        currentChain = 0;
      }
    }

    return maxChain;
  }

  /**
   * 従属節の深さを推定
   * 助詞と動詞の連用形・連体形の組み合わせから深さを推定する
   * @param tokens トークンリスト
   * @returns 推定された従属節の深さ
   */
  estimateClauseDepth(tokens: Token[]): number {
    // 従属節を形成する可能性のある助詞
    const clauseMarkers = ['が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'へ'];

    let maxDepth = 0;
    let currentDepth = 0;
    let hasPotentialClause = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // 読点で区切られた並列動作を、前の節への入れ子として加算しない。
      if (token.surface === '、' || token.surface === '，') {
        currentDepth = 0;
        hasPotentialClause = false;
        continue;
      }

      // 接続助詞「て・で」の後に独立した動作が続く場合は並列として区切る。
      // 「読んでいた」「教えてくれた」のような非自立動詞は同じ述語を構成する。
      if (token.isParticle() && token.posDetail1 === '接続助詞' &&
          (token.surface === 'て' || token.surface === 'で')) {
        const next = tokens[i + 1];
        if (!next?.isVerb() || next.posDetail1 !== '非自立') {
          currentDepth = 0;
          hasPotentialClause = false;
        }
        continue;
      }

      // 格助詞が現れたら従属節の可能性
      if (token.isParticle() && token.posDetail1 !== '接続助詞' && clauseMarkers.includes(token.surface)) {
        hasPotentialClause = true;
      }

      // kuromojiは名詞を修飾する「読む本」「負担する債務」も基本形と返す。
      // 連続する名詞がある場合は文末の終止形と区別する。
      const next = tokens[i + 1];
      const isBasicRelative = token.isVerb() && hasPotentialClause &&
        (token.conjugationForm.includes('基本形') || token.conjugationForm.includes('終止形')) &&
        next?.isNoun() && token.end === next.start;

      // 動詞が現れた場合
      if (token.isVerb() && hasPotentialClause) {
        // 連用形・連体形は従属節の終端を示す可能性
        if (
          token.conjugationForm.includes('連用') ||
          token.conjugationForm.includes('連体') ||
          isBasicRelative
        ) {
          currentDepth++;
          maxDepth = Math.max(maxDepth, currentDepth);
        }
        hasPotentialClause = false;
      }

      // 終止形に近いパターンで深さをリセット
      if (
        token.isVerb() && !isBasicRelative &&
        (token.conjugationForm.includes('基本形') ||
          token.conjugationForm.includes('終止形'))
      ) {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }

    return maxDepth;
  }

  /**
   * 複雑度メトリクスを計算
   * @param sentence 文
   * @param config 設定（未使用だが将来の拡張用）
   * @returns 複雑度メトリクス
   */
  calculateMetrics(sentence: Sentence, _config: AdvancedRulesConfig, characterCount = sentence.text.length): ComplexityMetrics {
    const commaCount = sentence.commaCount;
    const clauseDepth = this.estimateClauseDepth(sentence.tokens);
    const maxNoChainLength = this.calculateMaxNoChainLength(sentence.tokens);
    const maxNounChainLength = this.calculateMaxNounChainLength(sentence.tokens);

    // 正規化
    const normalized = {
      characterCount: this.normalizeValue(
        characterCount,
        NORMALIZATION_THRESHOLDS.characterCount.min,
        NORMALIZATION_THRESHOLDS.characterCount.max
      ),
      commaCount: this.normalizeValue(
        commaCount,
        NORMALIZATION_THRESHOLDS.commaCount.min,
        NORMALIZATION_THRESHOLDS.commaCount.max
      ),
      clauseDepth: this.normalizeValue(
        clauseDepth,
        NORMALIZATION_THRESHOLDS.clauseDepth.min,
        NORMALIZATION_THRESHOLDS.clauseDepth.max
      ),
      noChainLength: this.normalizeValue(
        maxNoChainLength,
        NORMALIZATION_THRESHOLDS.noChainLength.min,
        NORMALIZATION_THRESHOLDS.noChainLength.max
      ),
      nounChainLength: this.normalizeValue(
        maxNounChainLength,
        NORMALIZATION_THRESHOLDS.nounChainLength.min,
        NORMALIZATION_THRESHOLDS.nounChainLength.max
      )
    };

    // 重み付けスコア計算
    const weightedScore =
      normalized.characterCount * DEFAULT_WEIGHTS.characterCount +
        normalized.commaCount * DEFAULT_WEIGHTS.commaCount +
        normalized.clauseDepth * DEFAULT_WEIGHTS.clauseDepth +
        normalized.noChainLength * DEFAULT_WEIGHTS.noChainLength +
        normalized.nounChainLength * DEFAULT_WEIGHTS.nounChainLength;
    // 複数の負担が重なる文では、節の深さが他の要素の読みづらさも増幅する。
    // 正規化済みの深さを使い、加算済みのスコアは最大2倍・全体は100まで。
    const combinedScore = weightedScore * (1 + normalized.clauseDepth);
    const score = Math.round(
      Math.min(100, Math.max(
        combinedScore,
        maxNoChainLength * EXTREME_FACTOR_SCORES.noChainLength,
        maxNounChainLength * EXTREME_FACTOR_SCORES.nounChainLength,
        clauseDepth * EXTREME_FACTOR_SCORES.clauseDepth
      ))
    );

    return {
      characterCount,
      commaCount,
      clauseDepth,
      maxNoChainLength,
      maxNounChainLength,
      score
    };
  }

  /**
   * 改善提案を生成
   * @param metrics 複雑度メトリクス
   * @returns 改善提案のリスト
   */
  private generateSuggestions(metrics: ComplexityMetrics): string[] {
    const suggestions: string[] = [];

    if (metrics.characterCount > 120) {
      suggestions.push('文を2〜3文に分割することを検討してください');
    }
    if (metrics.commaCount > 4) {
      suggestions.push('読点の位置で文を分割することを検討してください');
    }
    if (metrics.clauseDepth > 2) {
      suggestions.push('入れ子になった修飾関係を整理してください');
    }
    if (metrics.maxNoChainLength > 3) {
      suggestions.push('「の」の連続を「における」「に関する」などに置き換えてください');
    }
    if (metrics.maxNounChainLength > 4) {
      suggestions.push('名詞の間に助詞を挿入して読みやすくしてください');
    }

    if (suggestions.length === 0) {
      suggestions.push('主語と述語を明確にして、文の構造を単純化してください');
    }

    return suggestions;
  }

  /**
   * 複雑な文を検出
   * @param sentences 文のリスト
   * @param config 設定
   * @returns 複雑な文のリスト
   */
  detectComplexSentences(
    sentences: Sentence[],
    config: AdvancedRulesConfig,
    hiddenRanges: CodeRange[] = []
  ): SentenceComplexity[] {
    const results: SentenceComplexity[] = [];
    const threshold = config.sentenceComplexityThreshold;
    let rangeIndex = 0;

    for (const sentence of sentences) {
      while (rangeIndex < hiddenRanges.length && hiddenRanges[rangeIndex].end <= sentence.start) rangeIndex++;
      let characterCount = sentence.text.length;
      let trimmedCharacterCount = sentence.text.trim().length;
      const trimmedStart = sentence.start + sentence.text.length - sentence.text.trimStart().length;
      const trimmedEnd = sentence.start + sentence.text.trimEnd().length;
      for (let i = rangeIndex; i < hiddenRanges.length && hiddenRanges[i].start < sentence.end; i++) {
        characterCount -= Math.max(0, Math.min(sentence.end, hiddenRanges[i].end) - Math.max(sentence.start, hiddenRanges[i].start));
        trimmedCharacterCount -= Math.max(0, Math.min(trimmedEnd, hiddenRanges[i].end) - Math.max(trimmedStart, hiddenRanges[i].start));
      }
      // 空文や極端に短い文はスキップ
      if (trimmedCharacterCount < 10) continue;

      const metrics = this.calculateMetrics(sentence, config, characterCount);

      if (metrics.score >= threshold) {
        results.push({
          sentence,
          metrics,
          range: {
            start: { line: 0, character: sentence.start },
            end: { line: 0, character: sentence.end }
          },
          suggestions: this.generateSuggestions(metrics)
        });
      }
    }

    return results;
  }

  /**
   * 文法チェックを実行
   * @param tokens トークンリスト
   * @param context ルールコンテキスト
   * @returns 診断情報のリスト
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const complexSentences = this.detectComplexSentences(context.sentences, context.config, context.hiddenTextRanges);

    for (const complex of complexSentences) {
      const { metrics } = complex;
      const detailParts: string[] = [];

      // 詳細情報を生成（閾値を超えた要素のみ）
      if (metrics.characterCount > 80) {
        detailParts.push(`文字数:${metrics.characterCount}`);
      }
      if (metrics.commaCount > 2) {
        detailParts.push(`読点:${metrics.commaCount}`);
      }
      if (metrics.clauseDepth > 1) {
        detailParts.push(`節深度:${metrics.clauseDepth}`);
      }
      if (metrics.maxNoChainLength > 2) {
        detailParts.push(`の連続:${metrics.maxNoChainLength}`);
      }
      if (metrics.maxNounChainLength > 3) {
        detailParts.push(`名詞連続:${metrics.maxNounChainLength}`);
      }

      const detail = isNotEmpty(detailParts) ? `（${detailParts.join('、')}）` : '';

      diagnostics.push(
        new AdvancedDiagnostic({
          range: complex.range,
          message: `文の複雑度が高いです（スコア: ${metrics.score}/100、閾値: ${context.config.sentenceComplexityThreshold}）${detail}。文の分割や構造の簡素化を検討してください。`,
          code: 'sentence-complexity',
          ruleName: this.name,
          suggestions: complex.suggestions
        })
      );
    }

    return diagnostics;
  }

  /**
   * ルールが有効かどうかを確認
   * @param config 設定
   * @returns 有効な場合true
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableSentenceComplexity;
  }
}

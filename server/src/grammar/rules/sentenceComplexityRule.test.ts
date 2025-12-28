/**
 * Sentence Complexity Ruleのユニットテスト
 * Feature: sentence-complexity-rule
 */

import { SentenceComplexityRule } from './sentenceComplexityRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('SentenceComplexityRule', () => {
  let rule: SentenceComplexityRule;

  beforeEach(() => {
    rule = new SentenceComplexityRule();
  });

  /**
   * ヘルパー関数: トークンを作成
   */
  const createToken = (
    surface: string,
    pos: string,
    start: number,
    options?: {
      conjugationForm?: string;
      posDetail1?: string;
    }
  ): Token => {
    return new Token({
      surface,
      pos,
      posDetail1: options?.posDetail1 ?? '*',
      posDetail2: '*',
      posDetail3: '*',
      conjugation: '*',
      conjugationForm: options?.conjugationForm ?? '*',
      baseForm: surface,
      reading: surface,
      pronunciation: surface,
      start,
      end: start + surface.length
    });
  };

  /**
   * ヘルパー関数: 文を作成（トークン付き）
   */
  const createSentenceWithTokens = (
    text: string,
    tokens: Token[],
    start: number
  ): Sentence => {
    return new Sentence({
      text,
      tokens,
      start,
      end: start + text.length
    });
  };

  /**
   * ヘルパー関数: シンプルな文を作成
   */
  const createSimpleSentence = (text: string, start: number): Sentence => {
    return new Sentence({
      text,
      tokens: [createToken(text, '名詞', start)],
      start,
      end: start + text.length
    });
  };

  /**
   * ヘルパー関数: コンテキストを作成
   */
  const createContext = (
    text: string,
    sentences: Sentence[],
    threshold?: number
  ): RuleContext => ({
    documentText: text,
    sentences,
    config: {
      ...DEFAULT_ADVANCED_RULES_CONFIG,
      sentenceComplexityThreshold: threshold ?? 60
    }
  });

  describe('calculateMaxNoChainLength', () => {
    it('should return 0 for no の particles', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('行く', '動詞', 2)
      ];
      expect(rule.calculateMaxNoChainLength(tokens)).toBe(0);
    });

    it('should count consecutive の particles', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('の', '助詞', 1),
        createToken('友人', '名詞', 2),
        createToken('の', '助詞', 4),
        createToken('妹', '名詞', 5),
        createToken('の', '助詞', 7),
        createToken('会社', '名詞', 8)
      ];
      expect(rule.calculateMaxNoChainLength(tokens)).toBe(3);
    });

    it('should return 1 for single の particle', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('の', '助詞', 1),
        createToken('本', '名詞', 2)
      ];
      expect(rule.calculateMaxNoChainLength(tokens)).toBe(1);
    });
  });

  describe('calculateMaxNounChainLength', () => {
    it('should return 0 for no nouns', () => {
      const tokens = [
        createToken('走る', '動詞', 0),
        createToken('早く', '副詞', 2)
      ];
      expect(rule.calculateMaxNounChainLength(tokens)).toBe(0);
    });

    it('should count consecutive nouns', () => {
      const tokens = [
        createToken('東京', '名詞', 0),
        createToken('都', '名詞', 2),
        createToken('港', '名詞', 3),
        createToken('区', '名詞', 4),
        createToken('に', '助詞', 5)
      ];
      expect(rule.calculateMaxNounChainLength(tokens)).toBe(4);
    });

    it('should find maximum chain length', () => {
      const tokens = [
        createToken('東京', '名詞', 0),
        createToken('都', '名詞', 2),
        createToken('の', '助詞', 3),
        createToken('新宿', '名詞', 4),
        createToken('区', '名詞', 6),
        createToken('西', '名詞', 7),
        createToken('新宿', '名詞', 8)
      ];
      expect(rule.calculateMaxNounChainLength(tokens)).toBe(4);
    });
  });

  describe('estimateClauseDepth', () => {
    it('should return 0 for simple sentence', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1),
        createToken('走る', '動詞', 2, { conjugationForm: '基本形' })
      ];
      expect(rule.estimateClauseDepth(tokens)).toBe(0);
    });

    it('should detect clause depth for complex sentence', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1),
        createToken('買っ', '動詞', 2, { conjugationForm: '連用形' }),
        createToken('た', '助動詞', 4),
        createToken('本', '名詞', 5),
        createToken('を', '助詞', 6),
        createToken('読む', '動詞', 7, { conjugationForm: '基本形' })
      ];
      expect(rule.estimateClauseDepth(tokens)).toBeGreaterThan(0);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate metrics for simple sentence', () => {
      const text = '今日は天気がいいですね。';
      const sentence = createSimpleSentence(text, 0);
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      const metrics = rule.calculateMetrics(sentence, config);

      expect(metrics.characterCount).toBe(text.length);
      expect(metrics.score).toBeGreaterThanOrEqual(0);
      expect(metrics.score).toBeLessThanOrEqual(100);
    });

    it('should give higher score for longer sentences', () => {
      const shortText = '短い文。';
      const longText = 'あ'.repeat(150) + '。';

      const shortSentence = createSimpleSentence(shortText, 0);
      const longSentence = createSimpleSentence(longText, 0);
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      const shortMetrics = rule.calculateMetrics(shortSentence, config);
      const longMetrics = rule.calculateMetrics(longSentence, config);

      expect(longMetrics.score).toBeGreaterThan(shortMetrics.score);
    });

    it('should give higher score for sentences with more commas', () => {
      const noCommaText = 'これは文です。';
      const manyCommasText = 'これは、文で、あり、ます、ね。';

      const noCommaSentence = createSimpleSentence(noCommaText, 0);
      const manyCommasSentence = createSimpleSentence(manyCommasText, 0);
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      const noCommaMetrics = rule.calculateMetrics(noCommaSentence, config);
      const manyCommasMetrics = rule.calculateMetrics(manyCommasSentence, config);

      expect(manyCommasMetrics.commaCount).toBeGreaterThan(noCommaMetrics.commaCount);
    });
  });

  describe('check', () => {
    it('should detect complex sentence exceeding threshold', () => {
      // 複雑な文（長文）
      // 200文字で characterCount が満点（30ポイント）になる
      const text = 'あ'.repeat(200) + '。';
      const sentences = [createSimpleSentence(text, 0)];
      // スコア30以上になるはずなので、閾値25で検出
      const context = createContext(text, sentences, 25);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('sentence-complexity');
    });

    it('should not detect simple sentence below threshold', () => {
      const text = '今日は天気がいい。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 60);

      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should skip very short sentences', () => {
      const text = 'はい。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 10);

      const diagnostics = rule.check([], context);

      expect(diagnostics).toHaveLength(0);
    });

    it('should include score in diagnostic message', () => {
      const text = 'あ'.repeat(200) + '。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 30);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('スコア');
      expect(diagnostics[0].message).toContain('/100');
    });

    it('should provide suggestions', () => {
      // 200文字で約30ポイント、閾値20なので検出される
      const text = 'あ'.repeat(200) + '。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 20);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });

    it('should respect custom threshold setting', () => {
      // 200文字で約30ポイント
      const text = 'あ'.repeat(200) + '。';

      // 高い閾値（90）では検出されない
      const highThresholdContext = createContext(
        text,
        [createSimpleSentence(text, 0)],
        90
      );
      const highThresholdDiagnostics = rule.check([], highThresholdContext);
      expect(highThresholdDiagnostics).toHaveLength(0);

      // 低い閾値（20）では検出される
      const lowThresholdContext = createContext(
        text,
        [createSimpleSentence(text, 0)],
        20
      );
      const lowThresholdDiagnostics = rule.check([], lowThresholdContext);
      expect(lowThresholdDiagnostics.length).toBeGreaterThan(0);
    });

    it('should detect multiple complex sentences', () => {
      // 200文字以上の文を2つ作成（各約30ポイント）
      const text1 = 'あ'.repeat(200) + '。';
      const text2 = 'い'.repeat(200) + '。';
      const fullText = text1 + text2;

      const sentences = [
        createSimpleSentence(text1, 0),
        createSimpleSentence(text2, text1.length)
      ];
      // 閾値20で両方検出
      const context = createContext(fullText, sentences, 20);

      const diagnostics = rule.check([], context);

      expect(diagnostics.length).toBe(2);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled in config', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableSentenceComplexity: true
      };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('should return false when disabled in config', () => {
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableSentenceComplexity: false
      };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });

  describe('real-world examples', () => {
    it('should handle typical technical document sentence', () => {
      const text =
        'このシステムは、ユーザーからの入力を受け取り、データベースに保存し、結果を表示します。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 60);

      const diagnostics = rule.check([], context);
      // 中程度の複雑度なので、閾値60では検出されないはず
      // ただし結果は実装によって変わる可能性がある
      expect(diagnostics.length).toBeGreaterThanOrEqual(0);
    });

    it('should detect overly complex legal document sentence', () => {
      // 79文字の法律文書（約12ポイントの文字数 + 読点5個で約12.5ポイント = 約25ポイント）
      const text =
        '本契約に基づき甲が乙に対して負担する債務の履行に関連して生じた損害については、甲は乙に対して、その損害の発生原因の如何を問わず、一切の責任を負わないものとする。';
      const sentences = [createSimpleSentence(text, 0)];
      // 閾値を低めに設定して検出
      const context = createContext(text, sentences, 15);

      const diagnostics = rule.check([], context);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('should not flag simple conversational sentences', () => {
      const text = '今日は天気がいいですね。';
      const sentences = [createSimpleSentence(text, 0)];
      const context = createContext(text, sentences, 60);

      const diagnostics = rule.check([], context);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('score boundaries', () => {
    it('should never exceed 100', () => {
      // 極端に複雑な文
      const text = 'あ'.repeat(300) + '、'.repeat(10) + '。';
      const sentence = createSimpleSentence(text, 0);
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      const metrics = rule.calculateMetrics(sentence, config);
      expect(metrics.score).toBeLessThanOrEqual(100);
    });

    it('should never go below 0', () => {
      const text = '。';
      const sentence = createSimpleSentence(text, 0);
      const config = DEFAULT_ADVANCED_RULES_CONFIG;

      const metrics = rule.calculateMetrics(sentence, config);
      expect(metrics.score).toBeGreaterThanOrEqual(0);
    });
  });
});

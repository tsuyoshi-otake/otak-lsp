/**
 * Grammar Checkerのユニットテスト
 * Feature: japanese-grammar-analyzer
 * 要件: 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { GrammarChecker } from './checker';
import { Token, GrammarError, Diagnostic } from '../../../shared/src/types';

describe('Grammar Checker', () => {
  let checker: GrammarChecker;

  beforeEach(() => {
    checker = new GrammarChecker();
  });

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

  describe('check', () => {
    it('should return empty array for empty token list', () => {
      const diagnostics = checker.check([]);
      expect(diagnostics).toHaveLength(0);
    });

    it('should return empty array for valid text', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('は', '助詞', 1, '係助詞'),
        createToken('学校', '名詞', 2),
        createToken('に', '助詞', 4, '格助詞'),
        createToken('行く', '動詞', 5)
      ];
      const diagnostics = checker.check(tokens);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('Double particle detection (二重助詞)', () => {
    it('should detect "がが" pattern', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('行く', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('double-particle');
      expect(diagnostics[0].message).toContain('がが');
    });

    it('should detect "をを" pattern', () => {
      const tokens = [
        createToken('本', '名詞', 0),
        createToken('を', '助詞', 1, '格助詞'),
        createToken('を', '助詞', 2, '格助詞'),
        createToken('読む', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('double-particle');
    });

    it('should detect "にに" pattern', () => {
      const tokens = [
        createToken('学校', '名詞', 0),
        createToken('に', '助詞', 2, '格助詞'),
        createToken('に', '助詞', 3, '格助詞'),
        createToken('行く', '動詞', 4)
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].code).toBe('double-particle');
    });

    it('should not detect different consecutive particles', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('を', '助詞', 2, '格助詞'),
        createToken('行く', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      // 異なる助詞の連続は二重助詞ではない
      const doubleParticleErrors = diagnostics.filter(d => d.code === 'double-particle');
      expect(doubleParticleErrors).toHaveLength(0);
    });

    it('should provide suggestion for double particle', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞')
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics).toHaveLength(1);
      // メッセージに修正候補が含まれることを確認
      expect(diagnostics[0].message.length).toBeGreaterThan(0);
    });
  });

  describe('Particle sequence detection (助詞連続)', () => {
    it('should detect problematic particle sequence "がを"', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('を', '助詞', 2, '格助詞'),
        createToken('行く', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
      expect(sequenceErrors).toHaveLength(1);
    });

    it('should detect problematic particle sequence "をが"', () => {
      const tokens = [
        createToken('本', '名詞', 0),
        createToken('を', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('ある', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
      expect(sequenceErrors).toHaveLength(1);
    });

    it('should not flag valid particle combinations like "には"', () => {
      const tokens = [
        createToken('学校', '名詞', 0),
        createToken('に', '助詞', 2, '格助詞'),
        createToken('は', '助詞', 3, '係助詞'),
        createToken('行く', '動詞', 4)
      ];
      const diagnostics = checker.check(tokens);

      const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
      expect(sequenceErrors).toHaveLength(0);
    });

    it('should not flag valid particle combinations like "では"', () => {
      const tokens = [
        createToken('ここ', '名詞', 0),
        createToken('で', '助詞', 2, '格助詞'),
        createToken('は', '助詞', 3, '係助詞'),
        createToken('ない', '形容詞', 4)
      ];
      const diagnostics = checker.check(tokens);

      const sequenceErrors = diagnostics.filter(d => d.code === 'particle-sequence');
      expect(sequenceErrors).toHaveLength(0);
    });
  });

  describe('Verb-particle mismatch detection (動詞-助詞不整合)', () => {
    it('should detect mismatch with intransitive verb and を', () => {
      const tokens = [
        createToken('学校', '名詞', 0),
        createToken('を', '助詞', 2, '格助詞'),
        createToken('行く', '動詞', 3)  // 「行く」は自動詞なので「を」とは合わない
      ];
      const diagnostics = checker.check(tokens);

      const mismatchErrors = diagnostics.filter(d => d.code === 'verb-particle-mismatch');
      expect(mismatchErrors).toHaveLength(1);
    });

    it('should not flag valid verb-particle combination', () => {
      const tokens = [
        createToken('本', '名詞', 0),
        createToken('を', '助詞', 1, '格助詞'),
        createToken('読む', '動詞', 2)  // 「読む」は他動詞なので「を」と合う
      ];
      const diagnostics = checker.check(tokens);

      const mismatchErrors = diagnostics.filter(d => d.code === 'verb-particle-mismatch');
      expect(mismatchErrors).toHaveLength(0);
    });

    it('should provide suggestion for verb-particle mismatch', () => {
      const tokens = [
        createToken('学校', '名詞', 0),
        createToken('を', '助詞', 2, '格助詞'),
        createToken('行く', '動詞', 3)
      ];
      const diagnostics = checker.check(tokens);

      const mismatchErrors = diagnostics.filter(d => d.code === 'verb-particle-mismatch');
      expect(mismatchErrors).toHaveLength(1);
      // メッセージに修正候補が含まれる
      expect(mismatchErrors[0].message.length).toBeGreaterThan(0);
    });
  });

  describe('Diagnostic format', () => {
    it('should include range information', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞')
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics[0].range).toBeDefined();
      expect(diagnostics[0].range.start).toBeDefined();
      expect(diagnostics[0].range.end).toBeDefined();
    });

    it('should include severity as warning', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞')
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics[0].severity).toBe(1); // Warning
    });

    it('should include source as japanese-grammar-analyzer', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞')
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics[0].source).toBe('japanese-grammar-analyzer');
    });
  });

  describe('Multiple errors', () => {
    it('should detect multiple errors in the same text', () => {
      const tokens = [
        createToken('私', '名詞', 0),
        createToken('が', '助詞', 1, '格助詞'),
        createToken('が', '助詞', 2, '格助詞'),
        createToken('学校', '名詞', 3),
        createToken('を', '助詞', 5, '格助詞'),
        createToken('行く', '動詞', 6)
      ];
      const diagnostics = checker.check(tokens);

      expect(diagnostics.length).toBeGreaterThanOrEqual(2);
    });
  });
});

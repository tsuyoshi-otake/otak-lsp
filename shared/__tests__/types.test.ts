/**
 * コア型定義のテスト
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 1.2, 1.3
 */

import { Token, DocumentAnalysis, GrammarError, CommentRange, SupportedLanguage } from '../src/types';

describe('Token', () => {
  describe('constructor and properties', () => {
    it('should create a token with all required properties', () => {
      const token = new Token({
        surface: '日本語',
        pos: '名詞',
        posDetail1: '一般',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: '日本語',
        reading: 'ニホンゴ',
        pronunciation: 'ニホンゴ',
        start: 0,
        end: 3
      });

      expect(token.surface).toBe('日本語');
      expect(token.pos).toBe('名詞');
      expect(token.posDetail1).toBe('一般');
      expect(token.baseForm).toBe('日本語');
      expect(token.reading).toBe('ニホンゴ');
      expect(token.start).toBe(0);
      expect(token.end).toBe(3);
    });
  });

  describe('isParticle', () => {
    it('should return true for particle tokens', () => {
      const token = new Token({
        surface: 'が',
        pos: '助詞',
        posDetail1: '格助詞',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: 'が',
        reading: 'ガ',
        pronunciation: 'ガ',
        start: 0,
        end: 1
      });

      expect(token.isParticle()).toBe(true);
    });

    it('should return false for non-particle tokens', () => {
      const token = new Token({
        surface: '行く',
        pos: '動詞',
        posDetail1: '自立',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '五段・カ行促音便',
        conjugationForm: '基本形',
        baseForm: '行く',
        reading: 'イク',
        pronunciation: 'イク',
        start: 0,
        end: 2
      });

      expect(token.isParticle()).toBe(false);
    });
  });

  describe('isVerb', () => {
    it('should return true for verb tokens', () => {
      const token = new Token({
        surface: '行く',
        pos: '動詞',
        posDetail1: '自立',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '五段・カ行促音便',
        conjugationForm: '基本形',
        baseForm: '行く',
        reading: 'イク',
        pronunciation: 'イク',
        start: 0,
        end: 2
      });

      expect(token.isVerb()).toBe(true);
    });

    it('should return false for non-verb tokens', () => {
      const token = new Token({
        surface: '日本語',
        pos: '名詞',
        posDetail1: '一般',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: '日本語',
        reading: 'ニホンゴ',
        pronunciation: 'ニホンゴ',
        start: 0,
        end: 3
      });

      expect(token.isVerb()).toBe(false);
    });
  });

  describe('isNoun', () => {
    it('should return true for noun tokens', () => {
      const token = new Token({
        surface: '日本語',
        pos: '名詞',
        posDetail1: '一般',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: '日本語',
        reading: 'ニホンゴ',
        pronunciation: 'ニホンゴ',
        start: 0,
        end: 3
      });

      expect(token.isNoun()).toBe(true);
    });

    it('should return false for non-noun tokens', () => {
      const token = new Token({
        surface: 'が',
        pos: '助詞',
        posDetail1: '格助詞',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: 'が',
        reading: 'ガ',
        pronunciation: 'ガ',
        start: 0,
        end: 1
      });

      expect(token.isNoun()).toBe(false);
    });
  });

  describe('isAdjective', () => {
    it('should return true for adjective tokens', () => {
      const token = new Token({
        surface: '美しい',
        pos: '形容詞',
        posDetail1: '自立',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '形容詞・イ段',
        conjugationForm: '基本形',
        baseForm: '美しい',
        reading: 'ウツクシイ',
        pronunciation: 'ウツクシイ',
        start: 0,
        end: 3
      });

      expect(token.isAdjective()).toBe(true);
    });

    it('should return false for non-adjective tokens', () => {
      const token = new Token({
        surface: '行く',
        pos: '動詞',
        posDetail1: '自立',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '五段・カ行促音便',
        conjugationForm: '基本形',
        baseForm: '行く',
        reading: 'イク',
        pronunciation: 'イク',
        start: 0,
        end: 2
      });

      expect(token.isAdjective()).toBe(false);
    });
  });

  describe('isAdverb', () => {
    it('should return true for adverb tokens', () => {
      const token = new Token({
        surface: 'とても',
        pos: '副詞',
        posDetail1: '一般',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: 'とても',
        reading: 'トテモ',
        pronunciation: 'トテモ',
        start: 0,
        end: 3
      });

      expect(token.isAdverb()).toBe(true);
    });

    it('should return false for non-adverb tokens', () => {
      const token = new Token({
        surface: '日本語',
        pos: '名詞',
        posDetail1: '一般',
        posDetail2: '*',
        posDetail3: '*',
        conjugation: '*',
        conjugationForm: '*',
        baseForm: '日本語',
        reading: 'ニホンゴ',
        pronunciation: 'ニホンゴ',
        start: 0,
        end: 3
      });

      expect(token.isAdverb()).toBe(false);
    });
  });
});

describe('DocumentAnalysis', () => {
  const createMockToken = (surface: string, start: number): Token => {
    return new Token({
      surface,
      pos: '名詞',
      posDetail1: '一般',
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

  describe('constructor', () => {
    it('should create a document analysis with all properties', () => {
      const tokens = [createMockToken('テスト', 0)];
      const analysis = new DocumentAnalysis({
        uri: 'file:///test.md',
        version: 1,
        tokens,
        diagnostics: [],
        semanticTokens: { data: [] },
        timestamp: Date.now()
      });

      expect(analysis.uri).toBe('file:///test.md');
      expect(analysis.version).toBe(1);
      expect(analysis.tokens).toHaveLength(1);
      expect(analysis.diagnostics).toHaveLength(0);
    });
  });

  describe('isStale', () => {
    it('should return true when current version is greater than analysis version', () => {
      const analysis = new DocumentAnalysis({
        uri: 'file:///test.md',
        version: 1,
        tokens: [],
        diagnostics: [],
        semanticTokens: { data: [] },
        timestamp: Date.now()
      });

      expect(analysis.isStale(2)).toBe(true);
    });

    it('should return false when current version equals analysis version', () => {
      const analysis = new DocumentAnalysis({
        uri: 'file:///test.md',
        version: 1,
        tokens: [],
        diagnostics: [],
        semanticTokens: { data: [] },
        timestamp: Date.now()
      });

      expect(analysis.isStale(1)).toBe(false);
    });
  });
});

describe('GrammarError', () => {
  const createMockToken = (surface: string, pos: string, start: number): Token => {
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

  describe('constructor', () => {
    it('should create a grammar error with double-particle type', () => {
      const tokens = [
        createMockToken('が', '助詞', 0),
        createMockToken('が', '助詞', 1)
      ];
      const error = new GrammarError({
        type: 'double-particle',
        tokens,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 2 } },
        message: '二重助詞「がが」が検出されました',
        suggestion: '「が」を1つにしてください'
      });

      expect(error.type).toBe('double-particle');
      expect(error.message).toBe('二重助詞「がが」が検出されました');
      expect(error.suggestion).toBe('「が」を1つにしてください');
    });

    it('should create a grammar error with particle-sequence type', () => {
      const tokens = [
        createMockToken('が', '助詞', 0),
        createMockToken('を', '助詞', 1)
      ];
      const error = new GrammarError({
        type: 'particle-sequence',
        tokens,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 2 } },
        message: '不適切な助詞連続「がを」が検出されました'
      });

      expect(error.type).toBe('particle-sequence');
      expect(error.suggestion).toBeUndefined();
    });

    it('should create a grammar error with verb-particle-mismatch type', () => {
      const tokens = [
        createMockToken('行く', '動詞', 0),
        createMockToken('を', '助詞', 2)
      ];
      const error = new GrammarError({
        type: 'verb-particle-mismatch',
        tokens,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 3 } },
        message: '動詞「行く」と助詞「を」の組み合わせが不自然です',
        suggestion: '「行く」には「に」や「へ」を使用してください'
      });

      expect(error.type).toBe('verb-particle-mismatch');
      expect(error.suggestion).toBe('「行く」には「に」や「へ」を使用してください');
    });
  });

  describe('toDiagnostic', () => {
    it('should convert grammar error to diagnostic', () => {
      const tokens = [
        createMockToken('が', '助詞', 0),
        createMockToken('が', '助詞', 1)
      ];
      const error = new GrammarError({
        type: 'double-particle',
        tokens,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 2 } },
        message: '二重助詞「がが」が検出されました',
        suggestion: '「が」を1つにしてください'
      });

      const diagnostic = error.toDiagnostic();

      expect(diagnostic.range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: 2 } });
      expect(diagnostic.severity).toBe(1); // DiagnosticSeverity.Warning
      expect(diagnostic.message).toBe('二重助詞「がが」が検出されました');
      expect(diagnostic.code).toBe('double-particle');
      expect(diagnostic.source).toBe('japanese-grammar-analyzer');
    });
  });
});

describe('CommentRange', () => {
  it('should represent a line comment range', () => {
    const range: CommentRange = {
      start: 0,
      end: 20,
      text: '// これはコメントです',
      type: 'line'
    };

    expect(range.type).toBe('line');
    expect(range.text).toContain('コメント');
  });

  it('should represent a block comment range', () => {
    const range: CommentRange = {
      start: 0,
      end: 30,
      text: '/* これはブロックコメントです */',
      type: 'block'
    };

    expect(range.type).toBe('block');
  });
});

describe('SupportedLanguage', () => {
  it('should include all supported languages', () => {
    const languages: SupportedLanguage[] = ['c', 'cpp', 'java', 'python', 'javascript', 'typescript', 'rust', 'markdown'];

    expect(languages).toHaveLength(8);
    expect(languages).toContain('javascript');
    expect(languages).toContain('typescript');
    expect(languages).toContain('python');
    expect(languages).toContain('markdown');
    expect(languages).toContain('c');
    expect(languages).toContain('cpp');
    expect(languages).toContain('java');
    expect(languages).toContain('rust');
  });
});

/**
 * Comment Extractorのユニットテスト
 * Feature: japanese-grammar-analyzer
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { CommentExtractor } from './commentExtractor';
import { CommentRange } from '../../../shared/src/types';

describe('Comment Extractor', () => {
  let extractor: CommentExtractor;

  beforeEach(() => {
    extractor = new CommentExtractor();
  });

  describe('C/C++/Java comments', () => {
    const languages = ['c', 'cpp', 'java'] as const;

    languages.forEach(lang => {
      describe(`${lang} language`, () => {
        it('should extract single line comments', () => {
          const code = `int x = 1; // これはコメントです
int y = 2;`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].type).toBe('line');
          expect(comments[0].text).toContain('これはコメントです');
        });

        it('should extract block comments', () => {
          const code = `int x = 1;
/* これは
ブロックコメントです */
int y = 2;`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].type).toBe('block');
          expect(comments[0].text).toContain('これは');
          expect(comments[0].text).toContain('ブロックコメントです');
        });

        it('should extract multiple comments', () => {
          const code = `// 最初のコメント
int x = 1;
/* 二番目のコメント */
// 三番目のコメント`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(3);
        });

        it('should not extract comments in strings', () => {
          const code = `char* s = "// これはコメントではない";
int x = 1; // これはコメント`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].text).toContain('これはコメント');
          expect(comments[0].text).not.toContain('これはコメントではない');
        });

        it('should handle empty input', () => {
          const comments = extractor.extract('', lang);
          expect(comments).toHaveLength(0);
        });

        it('should provide correct position information', () => {
          const code = `// コメント`;
          const comments = extractor.extract(code, lang);

          expect(comments[0].start).toBe(0);
          expect(comments[0].end).toBe(code.length);
        });
      });
    });
  });

  describe('Python comments', () => {
    it('should extract hash comments', () => {
      const code = `x = 1  # これはコメントです
y = 2`;
      const comments = extractor.extract(code, 'python');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('line');
      expect(comments[0].text).toContain('これはコメントです');
    });

    it('should extract docstring comments', () => {
      const code = `def func():
    """
    これはドキュメント文字列です
    複数行にまたがります
    """
    pass`;
      const comments = extractor.extract(code, 'python');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('block');
      expect(comments[0].text).toContain('これはドキュメント文字列です');
    });

    it('should extract single quote docstrings', () => {
      const code = `'''
これはシングルクォートのドキュメント文字列です
'''`;
      const comments = extractor.extract(code, 'python');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('block');
    });

    it('should not extract hash in strings', () => {
      const code = `s = "# これはコメントではない"
x = 1  # これはコメント`;
      const comments = extractor.extract(code, 'python');

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toContain('これはコメント');
    });

    it('should handle multiple hash comments', () => {
      const code = `# 最初のコメント
x = 1
# 二番目のコメント`;
      const comments = extractor.extract(code, 'python');

      expect(comments).toHaveLength(2);
    });
  });

  describe('JavaScript/TypeScript comments', () => {
    const languages = ['javascript', 'typescript'] as const;

    languages.forEach(lang => {
      describe(`${lang} language`, () => {
        it('should extract single line comments', () => {
          const code = `const x = 1; // これはコメントです
const y = 2;`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].type).toBe('line');
          expect(comments[0].text).toContain('これはコメントです');
        });

        it('should extract block comments', () => {
          const code = `const x = 1;
/* これは
ブロックコメントです */
const y = 2;`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].type).toBe('block');
        });

        it('should extract JSDoc comments', () => {
          const code = `/**
 * これはJSDocコメントです
 * @param x パラメータの説明
 */
function func(x) {}`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].type).toBe('block');
          expect(comments[0].text).toContain('これはJSDocコメントです');
        });

        it('should not extract comments in template literals', () => {
          const code = `const s = \`// これはコメントではない\`;
const x = 1; // これはコメント`;
          const comments = extractor.extract(code, lang);

          expect(comments).toHaveLength(1);
          expect(comments[0].text).toContain('これはコメント');
        });
      });
    });
  });

  describe('Rust comments', () => {
    it('should extract single line comments', () => {
      const code = `let x = 1; // これはコメントです
let y = 2;`;
      const comments = extractor.extract(code, 'rust');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('line');
      expect(comments[0].text).toContain('これはコメントです');
    });

    it('should extract block comments', () => {
      const code = `let x = 1;
/* これは
ブロックコメントです */
let y = 2;`;
      const comments = extractor.extract(code, 'rust');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('block');
    });

    it('should extract doc comments', () => {
      const code = `/// これはドキュメントコメントです
fn func() {}`;
      const comments = extractor.extract(code, 'rust');

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toContain('これはドキュメントコメントです');
    });

    it('should handle nested block comments', () => {
      const code = `/* 外側のコメント /* 内側のコメント */ 外側の続き */`;
      const comments = extractor.extract(code, 'rust');

      expect(comments).toHaveLength(1);
      expect(comments[0].text).toContain('外側のコメント');
      expect(comments[0].text).toContain('内側のコメント');
    });
  });

  describe('Markdown', () => {
    it('should return entire file content as single block', () => {
      const content = `# タイトル

これは本文です。
日本語のテキストが含まれています。`;
      const comments = extractor.extract(content, 'markdown');

      expect(comments).toHaveLength(1);
      expect(comments[0].type).toBe('block');
      expect(comments[0].text).toBe(content);
      expect(comments[0].start).toBe(0);
      expect(comments[0].end).toBe(content.length);
    });

    it('should handle empty markdown', () => {
      const comments = extractor.extract('', 'markdown');
      expect(comments).toHaveLength(0);
    });
  });

  describe('Unsupported languages', () => {
    it('should return empty array for unsupported languages', () => {
      const comments = extractor.extract('some code', 'unknown' as any);
      expect(comments).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle comment at end of file without newline', () => {
      const code = `int x = 1; // コメント`;
      const comments = extractor.extract(code, 'c');

      expect(comments).toHaveLength(1);
    });

    it('should handle consecutive block comments', () => {
      const code = `/* コメント1 *//* コメント2 */`;
      const comments = extractor.extract(code, 'c');

      expect(comments).toHaveLength(2);
    });

    it('should handle unclosed block comment gracefully', () => {
      const code = `int x = 1;
/* これは閉じられていないコメント`;
      const comments = extractor.extract(code, 'c');

      // 閉じられていないコメントも抽出する（ファイル末尾まで）
      expect(comments).toHaveLength(1);
    });
  });
});

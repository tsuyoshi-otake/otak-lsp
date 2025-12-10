/**
 * Comment Extractorのプロパティベーステスト
 * Feature: japanese-grammar-analyzer
 * プロパティ 4: コメント抽出の正確性
 * 検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as fc from 'fast-check';
import { CommentExtractor } from './commentExtractor';

describe('Property-Based Tests: Comment Extractor', () => {
  const extractor = new CommentExtractor();

  /**
   * Feature: japanese-grammar-analyzer, Property 4: コメント抽出の正確性
   * 任意のサポートされているプログラミング言語のソースコードに対して、
   * コメント抽出を実行したとき、抽出されたすべての範囲はその言語のコメント構文に一致し、
   * コメント外のコードは含まれない。Markdownファイルの場合は、ファイル全体が解析対象となる
   */
  describe('Property 4: コメント抽出の正確性', () => {
    describe('C-style languages (C, C++, Java, JavaScript, TypeScript)', () => {
      const languages = ['c', 'cpp', 'java', 'javascript', 'typescript'] as const;

      languages.forEach(lang => {
        it(`should extract only valid line comments for ${lang}`, () => {
          fc.assert(
            fc.property(
              // 日本語を含むコメントテキストを生成
              fc.stringOf(fc.constantFrom(...'あいうえおかきくけこ日本語テスト'), { minLength: 1, maxLength: 20 }),
              (commentText) => {
                const code = `int x = 1; // ${commentText}\nint y = 2;`;
                const comments = extractor.extract(code, lang);

                expect(comments).toHaveLength(1);
                expect(comments[0].type).toBe('line');
                expect(comments[0].text).toContain(commentText);
                expect(comments[0].start).toBeGreaterThanOrEqual(0);
                expect(comments[0].end).toBeLessThanOrEqual(code.length);
              }
            ),
            { numRuns: 100 }
          );
        });

        it(`should extract only valid block comments for ${lang}`, () => {
          fc.assert(
            fc.property(
              fc.stringOf(fc.constantFrom(...'あいうえおかきくけこ日本語テスト'), { minLength: 1, maxLength: 20 }),
              (commentText) => {
                const code = `int x = 1;\n/* ${commentText} */\nint y = 2;`;
                const comments = extractor.extract(code, lang);

                expect(comments).toHaveLength(1);
                expect(comments[0].type).toBe('block');
                expect(comments[0].text).toContain(commentText);
              }
            ),
            { numRuns: 100 }
          );
        });

        it(`should not include non-comment code for ${lang}`, () => {
          fc.assert(
            fc.property(
              fc.record({
                code: fc.stringOf(fc.constantFrom(...'abcdefghij1234567890'), { minLength: 1, maxLength: 10 }),
                comment: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 10 })
              }),
              ({ code, comment }) => {
                const fullCode = `int ${code} = 1; // ${comment}`;
                const comments = extractor.extract(fullCode, lang);

                expect(comments).toHaveLength(1);
                // コメントテキストにはコード部分が含まれない（//以前の部分）
                expect(comments[0].text.startsWith('//')).toBe(true);
              }
            ),
            { numRuns: 100 }
          );
        });
      });
    });

    describe('Python', () => {
      it('should extract only valid hash comments', () => {
        fc.assert(
          fc.property(
            fc.stringOf(fc.constantFrom(...'あいうえおかきくけこ日本語'), { minLength: 1, maxLength: 20 }),
            (commentText) => {
              const code = `x = 1  # ${commentText}\ny = 2`;
              const comments = extractor.extract(code, 'python');

              expect(comments).toHaveLength(1);
              expect(comments[0].type).toBe('line');
              expect(comments[0].text).toContain(commentText);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should extract only valid docstrings', () => {
        fc.assert(
          fc.property(
            fc.stringOf(fc.constantFrom(...'あいうえおかきくけこ日本語'), { minLength: 1, maxLength: 20 }),
            (commentText) => {
              const code = `"""\n${commentText}\n"""\nx = 1`;
              const comments = extractor.extract(code, 'python');

              expect(comments).toHaveLength(1);
              expect(comments[0].type).toBe('block');
              expect(comments[0].text).toContain(commentText);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Rust', () => {
      it('should extract only valid line comments', () => {
        fc.assert(
          fc.property(
            fc.stringOf(fc.constantFrom(...'あいうえおかきくけこ日本語'), { minLength: 1, maxLength: 20 }),
            (commentText) => {
              const code = `let x = 1; // ${commentText}\nlet y = 2;`;
              const comments = extractor.extract(code, 'rust');

              expect(comments).toHaveLength(1);
              expect(comments[0].type).toBe('line');
              expect(comments[0].text).toContain(commentText);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should correctly handle nested block comments', () => {
        fc.assert(
          fc.property(
            fc.record({
              outer: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 5 }),
              inner: fc.stringOf(fc.constantFrom(...'かきくけこ'), { minLength: 1, maxLength: 5 })
            }),
            ({ outer, inner }) => {
              const code = `/* ${outer} /* ${inner} */ ${outer} */`;
              const comments = extractor.extract(code, 'rust');

              expect(comments).toHaveLength(1);
              expect(comments[0].type).toBe('block');
              expect(comments[0].text).toContain(outer);
              expect(comments[0].text).toContain(inner);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Markdown', () => {
      it('should return entire content', () => {
        fc.assert(
          fc.property(
            fc.stringOf(fc.constantFrom(...'あいうえおかきくけこさしすせそたちつてとなにぬねの日本語テスト'), { minLength: 1, maxLength: 100 }),
            (content) => {
              const comments = extractor.extract(content, 'markdown');

              expect(comments).toHaveLength(1);
              expect(comments[0].text).toBe(content);
              expect(comments[0].start).toBe(0);
              expect(comments[0].end).toBe(content.length);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('Position consistency', () => {
      it('should have consistent start and end positions for all languages', () => {
        fc.assert(
          fc.property(
            fc.constantFrom('c', 'cpp', 'java', 'javascript', 'typescript', 'python', 'rust'),
            fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 10 }),
            (lang, commentText) => {
              let code: string;
              if (lang === 'python') {
                code = `x = 1  # ${commentText}`;
              } else {
                code = `int x = 1; // ${commentText}`;
              }

              const comments = extractor.extract(code, lang);

              expect(comments).toHaveLength(1);
              // 位置情報の整合性
              expect(comments[0].start).toBeGreaterThanOrEqual(0);
              expect(comments[0].end).toBeLessThanOrEqual(code.length);
              expect(comments[0].start).toBeLessThan(comments[0].end);
              // テキストの長さと位置の整合性
              expect(comments[0].end - comments[0].start).toBe(comments[0].text.length);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});

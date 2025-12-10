/**
 * Comment Extractor
 * プログラミング言語のコメントを抽出する
 * Feature: japanese-grammar-analyzer
 * 要件: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { CommentRange, SupportedLanguage } from '../../../shared/src/types';

/**
 * コメント抽出器
 */
export class CommentExtractor {
  /**
   * テキストからコメントを抽出
   */
  extract(text: string, languageId: string): CommentRange[] {
    if (!text || text.length === 0) {
      return [];
    }

    switch (languageId) {
      case 'c':
      case 'cpp':
      case 'java':
      case 'javascript':
      case 'typescript':
        return this.extractCStyleComments(text);
      case 'python':
        return this.extractPythonComments(text);
      case 'rust':
        return this.extractRustComments(text);
      case 'markdown':
        return this.extractMarkdown(text);
      default:
        return [];
    }
  }

  /**
   * C系言語のコメントを抽出（C, C++, Java, JavaScript, TypeScript）
   */
  private extractCStyleComments(text: string): CommentRange[] {
    const comments: CommentRange[] = [];
    let i = 0;
    let inString = false;
    let stringChar = '';
    let inTemplateString = false;

    while (i < text.length) {
      const char = text[i];
      const nextChar = text[i + 1];

      // 文字列リテラルの処理
      if (!inString && !inTemplateString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          i++;
          continue;
        }
        if (char === '`') {
          inTemplateString = true;
          i++;
          continue;
        }
      } else if (inString) {
        if (char === '\\') {
          i += 2; // エスケープシーケンスをスキップ
          continue;
        }
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        i++;
        continue;
      } else if (inTemplateString) {
        if (char === '\\') {
          i += 2;
          continue;
        }
        if (char === '`') {
          inTemplateString = false;
        }
        i++;
        continue;
      }

      // 行コメント
      if (char === '/' && nextChar === '/') {
        const start = i;
        let end = text.indexOf('\n', i);
        if (end === -1) {
          end = text.length;
        }
        comments.push({
          start,
          end,
          text: text.substring(start, end),
          type: 'line'
        });
        i = end + 1;
        continue;
      }

      // ブロックコメント
      if (char === '/' && nextChar === '*') {
        const start = i;
        let end = text.indexOf('*/', i + 2);
        if (end === -1) {
          end = text.length;
        } else {
          end += 2; // '*/' を含める
        }
        comments.push({
          start,
          end,
          text: text.substring(start, end),
          type: 'block'
        });
        i = end;
        continue;
      }

      i++;
    }

    return comments;
  }

  /**
   * Pythonのコメントを抽出
   */
  private extractPythonComments(text: string): CommentRange[] {
    const comments: CommentRange[] = [];
    let i = 0;
    let inString = false;
    let stringChar = '';
    let inTripleString = false;
    let tripleStringChar = '';

    while (i < text.length) {
      const char = text[i];
      const nextChars = text.substring(i, i + 3);

      // トリプルクォート文字列（docstring）の処理
      if (!inString && !inTripleString) {
        if (nextChars === '"""' || nextChars === "'''") {
          const start = i;
          tripleStringChar = nextChars;
          i += 3;

          // 終了を探す
          let end = text.indexOf(tripleStringChar, i);
          if (end === -1) {
            end = text.length;
          } else {
            end += 3;
          }

          comments.push({
            start,
            end,
            text: text.substring(start, end),
            type: 'block'
          });
          i = end;
          continue;
        }
      }

      // 通常の文字列リテラルの処理
      if (!inString && !inTripleString) {
        if (char === '"' || char === "'") {
          inString = true;
          stringChar = char;
          i++;
          continue;
        }
      } else if (inString) {
        if (char === '\\') {
          i += 2;
          continue;
        }
        if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
        i++;
        continue;
      }

      // ハッシュコメント
      if (char === '#') {
        const start = i;
        let end = text.indexOf('\n', i);
        if (end === -1) {
          end = text.length;
        }
        comments.push({
          start,
          end,
          text: text.substring(start, end),
          type: 'line'
        });
        i = end + 1;
        continue;
      }

      i++;
    }

    return comments;
  }

  /**
   * Rustのコメントを抽出
   */
  private extractRustComments(text: string): CommentRange[] {
    const comments: CommentRange[] = [];
    let i = 0;
    let inString = false;
    let inRawString = false;

    while (i < text.length) {
      const char = text[i];
      const nextChar = text[i + 1];

      // 文字列リテラルの処理
      if (!inString && !inRawString) {
        // Raw string literal r"..." or r#"..."#
        if (char === 'r' && (nextChar === '"' || nextChar === '#')) {
          inRawString = true;
          let hashes = 0;
          let j = i + 1;
          while (text[j] === '#') {
            hashes++;
            j++;
          }
          // 閉じるパターンを探す
          const closePattern = '"' + '#'.repeat(hashes);
          let end = text.indexOf(closePattern, j + 1);
          if (end !== -1) {
            i = end + closePattern.length;
          } else {
            i = text.length;
          }
          inRawString = false;
          continue;
        }
        if (char === '"') {
          inString = true;
          i++;
          continue;
        }
      } else if (inString) {
        if (char === '\\') {
          i += 2;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        i++;
        continue;
      }

      // ドキュメントコメント (///)
      if (char === '/' && nextChar === '/' && text[i + 2] === '/') {
        const start = i;
        let end = text.indexOf('\n', i);
        if (end === -1) {
          end = text.length;
        }
        comments.push({
          start,
          end,
          text: text.substring(start, end),
          type: 'line'
        });
        i = end + 1;
        continue;
      }

      // 行コメント
      if (char === '/' && nextChar === '/') {
        const start = i;
        let end = text.indexOf('\n', i);
        if (end === -1) {
          end = text.length;
        }
        comments.push({
          start,
          end,
          text: text.substring(start, end),
          type: 'line'
        });
        i = end + 1;
        continue;
      }

      // ネストされたブロックコメント
      if (char === '/' && nextChar === '*') {
        const start = i;
        let depth = 1;
        i += 2;

        while (i < text.length && depth > 0) {
          if (text[i] === '/' && text[i + 1] === '*') {
            depth++;
            i += 2;
          } else if (text[i] === '*' && text[i + 1] === '/') {
            depth--;
            i += 2;
          } else {
            i++;
          }
        }

        comments.push({
          start,
          end: i,
          text: text.substring(start, i),
          type: 'block'
        });
        continue;
      }

      i++;
    }

    return comments;
  }

  /**
   * Markdownファイル全体を抽出
   */
  private extractMarkdown(text: string): CommentRange[] {
    if (!text || text.length === 0) {
      return [];
    }

    return [{
      start: 0,
      end: text.length,
      text: text,
      type: 'block'
    }];
  }
}

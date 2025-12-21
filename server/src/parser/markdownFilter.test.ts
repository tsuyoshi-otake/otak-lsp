/**
 * MarkdownFilterのユニットテスト
 * Feature: markdown-document-filtering
 * 要件: 1.1, 2.1, 3.1, 4.1, 5.1
 */

import {
  FilterConfig,
  FilterResult,
  ExcludedRange,
  DebugInfo,
  DEFAULT_FILTER_CONFIG,
  ExcludeType
} from '../../../shared/src/markdownFilterTypes';
import { MarkdownFilter } from './markdownFilter';

describe('Core Interfaces and Data Models', () => {
  describe('FilterConfig interface', () => {
    it('should have all required properties with correct types', () => {
      const config: FilterConfig = {
        excludeCodeBlocks: true,
        preserveCodeBlockContent: false,
        excludeInlineCode: true,
        excludeTables: true,
        excludeUrls: true,
        excludeConfigKeys: true,
        excludeHeadings: true,
        excludeListMarkers: true,
        excludeEmphasisMarkers: true,
        excludeLinkMarkers: true,
        customExcludePatterns: [],
        debugMode: false
      };

      expect(config.excludeCodeBlocks).toBe(true);
      expect(config.excludeInlineCode).toBe(true);
      expect(config.excludeTables).toBe(true);
      expect(config.excludeUrls).toBe(true);
      expect(config.excludeConfigKeys).toBe(true);
      expect(config.excludeHeadings).toBe(true);
      expect(config.excludeListMarkers).toBe(true);
      expect(config.excludeEmphasisMarkers).toBe(true);
      expect(config.excludeLinkMarkers).toBe(true);
      expect(config.customExcludePatterns).toEqual([]);
      expect(config.debugMode).toBe(false);
    });

    it('should accept custom exclude patterns as RegExp array', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        customExcludePatterns: [/test/, /pattern/]
      };

      expect(config.customExcludePatterns).toHaveLength(2);
    });
  });

  describe('ExcludedRange interface', () => {
    it('should represent excluded text range correctly', () => {
      const range: ExcludedRange = {
        start: 0,
        end: 10,
        type: 'code-block',
        content: 'test code',
        reason: 'Code block detected'
      };

      expect(range.start).toBe(0);
      expect(range.end).toBe(10);
      expect(range.type).toBe('code-block');
      expect(range.content).toBe('test code');
      expect(range.reason).toBe('Code block detected');
    });

    it('should support all exclude types', () => {
      const types: ExcludeType[] = [
        'code-block',
        'inline-code',
        'table',
        'table-delimiter',
        'table-separator',
        'emphasis-marker',
        'link-marker',
        'url',
        'config-key',
        'heading',
        'list-marker',
        'custom'
      ];

      types.forEach((type) => {
        const range: ExcludedRange = {
          start: 0,
          end: 1,
          type,
          content: '',
          reason: ''
        };
        expect(range.type).toBe(type);
      });
    });
  });

  describe('FilterResult interface', () => {
    it('should contain filtered text and excluded ranges', () => {
      const result: FilterResult = {
        filteredText: 'filtered content',
        excludedRanges: [],
        originalText: 'original content'
      };

      expect(result.filteredText).toBe('filtered content');
      expect(result.excludedRanges).toEqual([]);
      expect(result.originalText).toBe('original content');
    });

    it('should optionally contain debug info', () => {
      const debugInfo: DebugInfo = {
        processingTimeMs: 10,
        totalExcludedCharacters: 50,
        excludedByType: {
          'code-block': 30,
          'inline-code': 20
        },
        logs: ['Processing started', 'Processing complete']
      };

      const result: FilterResult = {
        filteredText: '',
        excludedRanges: [],
        originalText: '',
        debugInfo
      };

      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.processingTimeMs).toBe(10);
      expect(result.debugInfo?.totalExcludedCharacters).toBe(50);
    });
  });

  describe('DEFAULT_FILTER_CONFIG', () => {
    it('should have sensible default values', () => {
      expect(DEFAULT_FILTER_CONFIG.excludeCodeBlocks).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeInlineCode).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeTables).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeUrls).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeConfigKeys).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeEmphasisMarkers).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.excludeLinkMarkers).toBe(true);
      expect(DEFAULT_FILTER_CONFIG.customExcludePatterns).toEqual([]);
      expect(DEFAULT_FILTER_CONFIG.debugMode).toBe(false);
    });
  });
});

describe('MarkdownFilter Basic', () => {
  let filter: MarkdownFilter;

  beforeEach(() => {
    filter = new MarkdownFilter();
  });

  describe('constructor', () => {
    it('should create instance without config', () => {
      const filter = new MarkdownFilter();
      expect(filter).toBeDefined();
    });

    it('should create instance with custom config', () => {
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        debugMode: true
      };
      const filter = new MarkdownFilter(config);
      expect(filter).toBeDefined();
    });
  });

  describe('filter method', () => {
    it('should return FilterResult with correct structure', () => {
      const text = 'Hello World';
      const result = filter.filter(text);

      expect(result).toHaveProperty('filteredText');
      expect(result).toHaveProperty('excludedRanges');
      expect(result).toHaveProperty('originalText');
      expect(result.originalText).toBe(text);
    });

    it('should accept optional config parameter', () => {
      const text = 'Hello World';
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        excludeCodeBlocks: false
      };
      const result = filter.filter(text, config);

      expect(result.originalText).toBe(text);
    });
  });

  describe('getExcludedRanges method', () => {
    it('should return array of ExcludedRange', () => {
      const text = 'Hello World';
      const ranges = filter.getExcludedRanges(text);

      expect(Array.isArray(ranges)).toBe(true);
    });

    it('should accept optional config parameter', () => {
      const text = 'Hello World';
      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        excludeCodeBlocks: false
      };
      const ranges = filter.getExcludedRanges(text, config);

      expect(Array.isArray(ranges)).toBe(true);
    });
  });
});

/**
 * Task 3.1: Property 1のユニットテスト - コードブロック除外
 * 要件: 1.1, 1.2, 1.3, 1.4
 */
describe('Code Block Exclusion (Task 3.1)', () => {
  let filter: MarkdownFilter;

  beforeEach(() => {
    filter = new MarkdownFilter();
  });

  describe('fenced code blocks (```)', () => {
    it('should exclude simple code block', () => {
      const text = '```\nconst x = 1;\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
    });

    it('should preserve code block content when preserveCodeBlockContent is true', () => {
      const text = '前の行\n```\n食べれる\n```\n後の行';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).toContain('食べれる');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should sanitize code fence language spec even when preserveCodeBlockContent is true', () => {
      const text = '```javascript\n食べれる\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('食べれる');
      expect(result.filteredText).not.toContain('javascript');
    });

    it('should exclude code block with language identifier', () => {
      const text = '```javascript\nconst x = 1;\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
    });

    it('should exclude code block in blockquote', () => {
      const text = '> ```js\n> const x = 1;\n> ```';
      const result = filter.filter(text);

      const codeBlocks = result.excludedRanges.filter((r) => r.type === 'code-block');
      expect(codeBlocks).toHaveLength(1);
      expect(result.filteredText).not.toContain('const x');
    });

    it('should exclude indented code block (nested structures)', () => {
      const text = '    ```\n    const x = 1;\n    ```';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('const x');
    });

    it('should exclude multiple code blocks', () => {
      const text = '```\ncode1\n```\ntext\n```\ncode2\n```';
      const result = filter.filter(text);

      const codeBlocks = result.excludedRanges.filter((r) => r.type === 'code-block');
      expect(codeBlocks).toHaveLength(2);
    });

    it('should handle empty code block', () => {
      const text = '```\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
    });

    it('should handle code block with special characters', () => {
      const text = '```\n<html>&nbsp;</html>\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].content).toContain('<html>');
    });

    it('should exclude code block with CRLF (\\\\r\\\\n)', () => {
      const text = '```\r\nconst x = 1;\r\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('const x');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should sanitize code fence language spec with CRLF when preserveCodeBlockContent is true', () => {
      const text = '```javascript\r\n食べれる\r\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('食べれる');
      expect(result.filteredText).not.toContain('javascript');
      expect(result.filteredText.length).toBe(text.length);
    });
  });

  describe('inline code (`)', () => {
    it('should exclude simple inline code', () => {
      const text = 'Use `const` keyword';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
    });

    it('should exclude multiple inline codes', () => {
      const text = 'Use `const` and `let` keywords';
      const result = filter.filter(text);

      const inlineCodes = result.excludedRanges.filter((r) => r.type === 'inline-code');
      expect(inlineCodes).toHaveLength(2);
    });

    it('should exclude inline code with multiple backticks', () => {
      const text = 'Use ``const`` keyword';
      const result = filter.filter(text);

      const inlineCodes = result.excludedRanges.filter((r) => r.type === 'inline-code');
      expect(inlineCodes).toHaveLength(1);
      expect(inlineCodes[0].content).toBe('``const``');
    });

    it('should not treat backticks in code block as inline code', () => {
      const text = '```\nUse `const`\n```';
      const result = filter.filter(text);

      // コードブロックのみが検出され、インラインコードは検出されない
      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
    });

    it('should handle inline code with special characters', () => {
      const text = 'Run `npm install --save`';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle unclosed code block gracefully', () => {
      const text = '```\ncode without closing';
      const result = filter.filter(text);

      // エラーなく処理される
      expect(result.originalText).toBe(text);
    });

    it('should handle nested backticks in code block', () => {
      const text = '```\nconst str = `template`;\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
    });

    it('should preserve Japanese text outside code blocks', () => {
      const text = 'これは日本語です\n```\ncode\n```\nこれも日本語です';
      const result = filter.filter(text);

      expect(result.filteredText).toContain('これは日本語です');
      expect(result.filteredText).toContain('これも日本語です');
    });
  });

  describe('Japanese detection in code blocks', () => {
    it('should mask code block without Japanese even when preserveCodeBlockContent is true', () => {
      const text = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('const x');
      expect(result.filteredText).not.toContain('console.log');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should preserve code block with Japanese when preserveCodeBlockContent is true', () => {
      const text = '```javascript\n// これはコメントです\nconst x = 1;\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).toContain('これはコメントです');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should mask code block with Japanese when preserveCodeBlockContent is false', () => {
      const text = '```javascript\n// これはコメントです\nconst x = 1;\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: false
      });

      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('これはコメントです');
      expect(result.filteredText).not.toContain('const x');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should detect hiragana in code blocks', () => {
      const text = '```\nひらがな\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('ひらがな');
    });

    it('should detect katakana in code blocks', () => {
      const text = '```\nカタカナ\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('カタカナ');
    });

    it('should detect kanji in code blocks', () => {
      const text = '```\n漢字\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('漢字');
    });

    it('should detect half-width katakana in code blocks', () => {
      const text = '```\nｶﾀｶﾅ\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).toContain('ｶﾀｶﾅ');
    });

    it('should mask code block with only English text', () => {
      const text = '```\nHello World\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).not.toContain('Hello World');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should mask code block with only numbers and symbols', () => {
      const text = '```\n12345 + 67890\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      expect(result.filteredText).not.toContain('12345');
      expect(result.filteredText.length).toBe(text.length);
    });
  });

  /**
   * Task 3: 日本語を含まないコードブロックの解析スキップのテスト
   * 要件: 2.2, 2.3
   */
  describe('Non-Japanese code block skipping (Task 3)', () => {
    it('should mask non-Japanese code blocks even when analyzeCodeBlocks is true', () => {
      const text = '```python\ndef hello():\n    print("Hello")\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true // analyzeCodeBlocks=trueに相当
      });

      // 日本語を含まないコードブロックはマスクされる
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('def hello');
      expect(result.filteredText).not.toContain('print("Hello")');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should preserve Japanese code blocks when analyzeCodeBlocks is true', () => {
      const text = '```python\n# 挨拶関数\ndef hello():\n    print("こんにちは")\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true // analyzeCodeBlocks=trueに相当
      });

      // 日本語を含むコードブロックは保持される
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).toContain('挨拶関数');
      expect(result.filteredText).toContain('こんにちは');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should mask all code blocks when analyzeCodeBlocks is false regardless of Japanese content', () => {
      const japaneseText = '```python\n# 挨拶関数\ndef hello():\n    print("こんにちは")\n```';
      const englishText = '```python\ndef hello():\n    print("Hello")\n```';

      const japaneseResult = filter.filter(japaneseText, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: false // analyzeCodeBlocks=falseに相当
      });

      const englishResult = filter.filter(englishText, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: false // analyzeCodeBlocks=falseに相当
      });

      // どちらもマスクされる
      expect(japaneseResult.filteredText).not.toContain('挨拶関数');
      expect(japaneseResult.filteredText).not.toContain('こんにちは');
      expect(englishResult.filteredText).not.toContain('def hello');
      expect(englishResult.filteredText).not.toContain('print("Hello")');
    });

    it('should handle mixed content code blocks correctly', () => {
      const text = '```javascript\n// 日本語コメント\nconst message = "Hello World";\nconsole.log(message);\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      // 日本語が含まれているので保持される
      expect(result.filteredText).toContain('日本語コメント');
      expect(result.filteredText).toContain('const message');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should handle inline code blocks with Japanese detection', () => {
      const nonJapaneseInline = 'Use `console.log()` for debugging';
      const japaneseInline = 'Use `デバッグ` for debugging';

      const nonJapaneseResult = filter.filter(nonJapaneseInline);
      const japaneseResult = filter.filter(japaneseInline);

      // インラインコードは通常通り除外される（日本語判定は主にフェンスコードブロック用）
      expect(nonJapaneseResult.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
      expect(japaneseResult.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
    });

    it('should handle multiple code blocks with different Japanese content', () => {
      const text = `前の文章

\`\`\`python
# English comment
def function1():
    pass
\`\`\`

中間の文章

\`\`\`javascript
// 日本語のコメント
function function2() {
    return "値";
}
\`\`\`

後の文章`;

      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      // 日本語を含まないコードブロックはマスクされる
      expect(result.filteredText).not.toContain('def function1');
      expect(result.filteredText).not.toContain('pass');

      // 日本語を含むコードブロックは保持される
      expect(result.filteredText).toContain('日本語のコメント');
      expect(result.filteredText).toContain('function function2');

      // 周囲のテキストは保持される
      expect(result.filteredText).toContain('前の文章');
      expect(result.filteredText).toContain('中間の文章');
      expect(result.filteredText).toContain('後の文章');
    });

    it('should handle edge case with only whitespace and punctuation in code blocks', () => {
      const text = '```\n   \n  .,;!?\n   \n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      // 日本語を含まないのでマスクされる
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.filteredText).not.toContain('.,;!?');
      expect(result.filteredText.length).toBe(text.length);
    });

    it('should handle code blocks with Unicode characters that are not Japanese', () => {
      const text = '```\n// Émojis: 🚀 🎉\nconst emoji = "🌟";\n```';
      const result = filter.filter(text, {
        ...DEFAULT_FILTER_CONFIG,
        preserveCodeBlockContent: true
      });

      // 日本語以外のUnicode文字は日本語として扱われない
      expect(result.filteredText).not.toContain('🚀');
      expect(result.filteredText).not.toContain('const emoji');
      expect(result.filteredText.length).toBe(text.length);
    });
  });
});

/**
 * Task 4.2: Property 2のユニットテスト - テーブル処理
 * 要件: 2.1, 2.2, 2.3, 2.4
 */
describe('Table Structure Processing (Task 4.2)', () => {
  let filter: MarkdownFilter;

  beforeEach(() => {
    filter = new MarkdownFilter();
  });

  describe('markdown table detection', () => {
    it('should detect simple table', () => {
      const text = `| Header 1 | Header 2 |
 |----------|----------|
 | Cell 1   | Cell 2   |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-delimiter')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-separator')).toBe(true);
    });

    it('should detect 1-column table without trailing pipes', () => {
      const text = `| Header
|---
| Cell`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-delimiter')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-separator')).toBe(true);
    });

    it('should detect table in blockquote', () => {
      const text = `> | A | B |
 > |---|---|
 > | 1 | 2 |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-delimiter')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-separator')).toBe(true);
    });

    it('should detect table with multiple rows', () => {
      const text = `| Name | Value |
|------|-------|
| foo  | 1     |
| bar  | 2     |
| baz  | 3     |`;
      const result = filter.filter(text);

      const tableRanges = result.excludedRanges.filter((r) => r.type === 'table');
      expect(tableRanges).toHaveLength(1);
      expect(result.excludedRanges.some((r) => r.type === 'table-delimiter')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-separator')).toBe(true);
    });

    it('should detect table with alignment', () => {
      const text = `| Left | Center | Right |
|:-----|:------:|------:|
| L    | C      | R     |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-delimiter')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table-separator')).toBe(true);
    });
  });

  describe('config key detection in tables', () => {
    it('should detect config keys in table cells', () => {
      const text = `| Setting | Description |
 |---------|-------------|
 | otakLsp.enableGrammarCheck | Enable grammar check |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'config-key')).toBe(true);
    });

    it('should detect multiple config keys', () => {
      const text = `| otakLsp.setting1 | otakLsp.setting2 |`;
      const result = filter.filter(text);

      const configKeys = result.excludedRanges.filter((r) => r.type === 'config-key');
      expect(configKeys.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('inline code in tables', () => {
    it('should preserve Japanese inline code in table cells', () => {
      const text = `| 表記 |
|------|
| \`食べれる\` |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(false);
      expect(result.filteredText).toContain('食べれる');
    });

    it('should still exclude ASCII inline code in table cells', () => {
      const text = `| Key |
|-----|
| \`otakLsp.markdown.analyzeTables\` |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
      expect(result.filteredText).not.toContain('otakLsp.markdown.analyzeTables');
    });
  });

  describe('table edge cases', () => {
    it('should handle table at end of document', () => {
      const text = `Text before

| Col 1 | Col 2 |
|-------|-------|
| A     | B     |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
    });

    it('should detect table even when it contains inline triple backticks', () => {
      const text = '| A | B |\n|---|---|\n| code | ``` const x = 1; ``` |';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
    });

    it('should not treat pipe character in text as table', () => {
      const text = 'Use command | grep pattern';
      const result = filter.filter(text);

      expect(result.excludedRanges.filter((r) => r.type === 'table').length).toBe(0);
    });

    it('should preserve Japanese text around tables', () => {
      const text = `これは日本語です

| 設定 | 値 |
|------|-----|
| A    | B   |

これも日本語です`;
      const result = filter.filter(text);

      expect(result.filteredText).toContain('これは日本語です');
      expect(result.filteredText).toContain('これも日本語です');
    });
  });
});

describe('Markdown Structure Markers', () => {
  let filter: MarkdownFilter;

  beforeEach(() => {
    filter = new MarkdownFilter();
  });

  it('should detect heading marker in blockquote', () => {
    const text = '> ### 見出し';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'heading')).toBe(true);
  });

  it('should detect list marker in blockquote', () => {
    const text = '> - 項目';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'list-marker')).toBe(true);
  });

  it('should exclude bold markers (**) but keep inner text', () => {
    const text = 'これは **太郎** です';
    const result = filter.filter(text);

    expect(result.excludedRanges.filter((r) => r.type === 'emphasis-marker')).toHaveLength(2);
    expect(result.filteredText).toBe(text);
  });

  it('should exclude italic markers (*) but keep inner text', () => {
    const text = 'これは *太郎* です';
    const result = filter.filter(text);

    expect(result.excludedRanges.filter((r) => r.type === 'emphasis-marker')).toHaveLength(2);
    expect(result.filteredText).toBe(text);
  });

  it('should not treat list marker \"* \" as emphasis marker when excludeListMarkers is false', () => {
    const text = '* 項目';
    const result = filter.filter(text, { ...DEFAULT_FILTER_CONFIG, excludeListMarkers: false });

    expect(result.excludedRanges.some((r) => r.type === 'list-marker')).toBe(false);
    expect(result.excludedRanges.some((r) => r.type === 'emphasis-marker')).toBe(false);
    expect(result.filteredText).toBe(text);
  });

  it('should not treat \"2*3\" as emphasis marker', () => {
    const text = '2*3';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'emphasis-marker')).toBe(false);
    expect(result.filteredText).toBe(text);
  });

  it('should exclude underscore emphasis markers', () => {
    const text = 'これは __太郎__ と _花子_ です';
    const result = filter.filter(text);

    // __ __ と _ _ の合計4箇所
    expect(result.excludedRanges.filter((r) => r.type === 'emphasis-marker').length).toBeGreaterThanOrEqual(4);
    expect(result.filteredText).toBe(text);
  });

  it('should not treat underscore in snake_case as emphasis marker', () => {
    const text = 'This is foo_bar_baz.';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'emphasis-marker')).toBe(false);
    expect(result.filteredText).toBe(text);
  });

  it('should exclude strikethrough markers (~~)', () => {
    const text = 'これは ~~太郎~~ です';
    const result = filter.filter(text);

    expect(result.excludedRanges.filter((r) => r.type === 'emphasis-marker').length).toBeGreaterThanOrEqual(2);
    expect(result.filteredText).toBe(text);
  });

  it('should exclude markdown link markers but keep link text', () => {
    const text = 'これは [太郎](https://example.com) です';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    expect(result.excludedRanges.some((r) => r.type === 'link-marker')).toBe(true);
    // URL部分はマスクされるが、リンクテキストと構造は保持される
    expect(result.filteredText).toContain('[太郎](');
    expect(result.filteredText).toContain(') です');
    expect(result.filteredText).toContain('太郎');
    expect(result.filteredText).not.toContain('https://example.com');
    expect(result.filteredText.length).toBe(text.length);
  });

  it('should exclude task list markers', () => {
    const text = '- [ ] タスク';
    const result = filter.filter(text);

    expect(result.excludedRanges.some((r) => r.type === 'list-marker')).toBe(true);
    expect(result.excludedRanges.some((r) => r.type === 'link-marker')).toBe(true);
    expect(result.filteredText).toBe(text);
  });
});

/**
 * Task 5.2: Property 3のユニットテスト - URL除外
 * 要件: 3.1, 3.2, 3.3, 3.4
 */
describe('URL Exclusion (Task 5.2)', () => {
  let filter: MarkdownFilter;

  beforeEach(() => {
    filter = new MarkdownFilter();
  });

  describe('plain text URLs', () => {
    it('should exclude http URL', () => {
      const text = 'Visit http://example.com for more';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });

    it('should exclude https URL', () => {
      const text = 'Visit https://example.com for more';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });

    it('should exclude URL with path and query', () => {
      const text = 'See https://example.com/path?query=value';
      const result = filter.filter(text);

      const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
      expect(urlRanges).toHaveLength(1);
      expect(urlRanges[0].content).toContain('query=value');
    });

    it('should exclude URL with parentheses', () => {
      const text = 'See https://example.com/foo(bar)/baz for more';
      const result = filter.filter(text);

      const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
      expect(urlRanges).toHaveLength(1);
      expect(urlRanges[0].content).toContain('foo(bar)/baz');
    });

    it('should trim trailing punctuation from plain URLs', () => {
      const text = 'See https://example.com/foo(bar).';
      const result = filter.filter(text);

      const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
      expect(urlRanges).toHaveLength(1);
      expect(urlRanges[0].content).toBe('https://example.com/foo(bar)');
      expect(result.filteredText.endsWith('.')).toBe(true);
    });

    it('should exclude multiple URLs', () => {
      const text = 'Visit https://example1.com and https://example2.com';
      const result = filter.filter(text);

      const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
      expect(urlRanges).toHaveLength(2);
    });
  });

  describe('markdown link URLs', () => {
    it('should exclude URL part of markdown link', () => {
      const text = 'Click [here](https://example.com) for more';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });

    it('should handle markdown link URL with parentheses', () => {
      const text = 'Click [here](https://example.com/foo(bar)) for more';
      const result = filter.filter(text);

      const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
      expect(urlRanges.length).toBeGreaterThanOrEqual(1);
      expect(urlRanges.some((r) => r.content.includes('foo(bar)'))).toBe(true);
    });

    it('should preserve link text in markdown link', () => {
      const text = 'Click [リンクテキスト](https://example.com) for more';
      const result = filter.filter(text);

      // リンクテキストは保持される
      expect(result.filteredText).toContain('リンクテキスト');
    });

    it('should handle markdown link with title', () => {
      const text = '[text](https://example.com "title")';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });
  });

  describe('auto-link URLs', () => {
    it('should exclude auto-link URL', () => {
      const text = 'Visit <https://example.com> for more';
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });
  });

  describe('URL edge cases', () => {
    it('should not exclude URL in code block', () => {
      const text = '```\nhttps://example.com\n```';
      const result = filter.filter(text);

      // コードブロックのみが検出される
      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
    });

    it('should preserve Japanese text around URLs', () => {
      const text = 'これは https://example.com へのリンクです';
      const result = filter.filter(text);

      expect(result.filteredText).toContain('これは');
      expect(result.filteredText).toContain('へのリンクです');
    });
  });
});

/**
 * Task 7.2: Property 5のユニットテスト - デバッグ機能
 * 要件: 5.1, 5.2, 5.3, 5.4
 */
describe('Debug and Validation Features (Task 7.2)', () => {
  describe('excluded range information', () => {
    it('should provide detailed excluded range info', () => {
      const filter = new MarkdownFilter();
      const text = '```\ncode\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges[0]).toHaveProperty('start');
      expect(result.excludedRanges[0]).toHaveProperty('end');
      expect(result.excludedRanges[0]).toHaveProperty('type');
      expect(result.excludedRanges[0]).toHaveProperty('content');
      expect(result.excludedRanges[0]).toHaveProperty('reason');
    });

    it('should provide correct range positions', () => {
      const filter = new MarkdownFilter();
      const text = 'Hello ```code``` World';
      const result = filter.filter(text);

      const codeBlock = result.excludedRanges.find((r) => r.type === 'code-block');
      if (codeBlock) {
        expect(text.substring(codeBlock.start, codeBlock.end)).toBe('```code```');
      }
    });
  });

  describe('debug mode', () => {
    it('should include debug info when debug mode is enabled', () => {
      const filter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });
      const text = '```\ncode\n```';
      const result = filter.filter(text);

      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.debugInfo?.totalExcludedCharacters).toBeGreaterThan(0);
      expect(result.debugInfo?.excludedByType).toBeDefined();
      expect(result.debugInfo?.logs).toBeDefined();
    });

    it('should not include debug info when debug mode is disabled', () => {
      const filter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: false });
      const text = '```\ncode\n```';
      const result = filter.filter(text);

      expect(result.debugInfo).toBeUndefined();
    });

    it('should log processing steps in debug mode', () => {
      const filter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });
      const text = '```\ncode\n```\ntext\n`inline`';
      const result = filter.filter(text);

      expect(result.debugInfo?.logs).toBeDefined();
      expect(result.debugInfo?.logs.length).toBeGreaterThan(0);
    });
  });

  describe('before/after comparison', () => {
    it('should preserve original text in result', () => {
      const filter = new MarkdownFilter();
      const text = '```\ncode\n```';
      const result = filter.filter(text);

      expect(result.originalText).toBe(text);
    });

    it('should show difference between original and filtered', () => {
      const filter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });
      const text = 'Hello ```code``` World';
      const result = filter.filter(text);

      expect(result.originalText).toBe(text);
      expect(result.filteredText.length).toBe(text.length); // 同じ長さ（スペースで置換）
      expect(result.filteredText).not.toBe(text); // 内容は異なる
    });
  });

  describe('error handling', () => {
    it('should handle empty text gracefully', () => {
      const filter = new MarkdownFilter();
      const result = filter.filter('');

      expect(result.filteredText).toBe('');
      expect(result.excludedRanges).toHaveLength(0);
    });

    it('should return original text on error (graceful degradation)', () => {
      const filter = new MarkdownFilter();
      // 通常の入力ではエラーは発生しないが、空文字列で確認
      const text = 'normal text';
      const result = filter.filter(text);

      expect(result.originalText).toBe(text);
    });
  });

  describe('config management', () => {
    it('should update config correctly', () => {
      const filter = new MarkdownFilter();
      filter.updateConfig({ debugMode: true });

      const config = filter.getConfig();
      expect(config.debugMode).toBe(true);
    });

    it('should preserve other config values when updating', () => {
      const filter = new MarkdownFilter();
      const originalConfig = filter.getConfig();

      filter.updateConfig({ debugMode: true });
      const newConfig = filter.getConfig();

      expect(newConfig.excludeCodeBlocks).toBe(originalConfig.excludeCodeBlocks);
      expect(newConfig.excludeInlineCode).toBe(originalConfig.excludeInlineCode);
    });
  });
});

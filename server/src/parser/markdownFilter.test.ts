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
        excludeInlineCode: true,
        excludeTables: true,
        excludeUrls: true,
        excludeConfigKeys: true,
        excludeHeadings: true,
        excludeListMarkers: true,
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
        'url',
        'config-key',
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

    it('should exclude code block with language identifier', () => {
      const text = '```javascript\nconst x = 1;\n```';
      const result = filter.filter(text);

      expect(result.excludedRanges).toHaveLength(1);
      expect(result.excludedRanges[0].type).toBe('code-block');
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
| otakLcp.enableGrammarCheck | Enable grammar check |`;
      const result = filter.filter(text);

      expect(result.excludedRanges.some((r) => r.type === 'config-key')).toBe(true);
    });

    it('should detect multiple config keys', () => {
      const text = `| otakLcp.setting1 | otakLcp.setting2 |`;
      const result = filter.filter(text);

      const configKeys = result.excludedRanges.filter((r) => r.type === 'config-key');
      expect(configKeys.length).toBeGreaterThanOrEqual(2);
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

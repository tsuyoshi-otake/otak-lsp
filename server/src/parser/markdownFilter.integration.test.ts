/**
 * MarkdownFilterの統合テスト
 * Feature: markdown-document-filtering
 * Task 8.1: 既存システムとの統合テスト
 * 要件: 1.1, 2.1, 3.1, 4.1
 */

import { MarkdownFilter } from './markdownFilter';
import { CommentExtractor } from './commentExtractor';
import {
  DEFAULT_FILTER_CONFIG,
  FilterConfig
} from '../../../shared/src/markdownFilterTypes';

describe('Integration Tests: Markdown Filter with Existing System', () => {
  describe('CommentExtractor Integration', () => {
    const commentExtractor = new CommentExtractor();
    const markdownFilter = new MarkdownFilter();

    it('should filter markdown content extracted by CommentExtractor', () => {
      // マークダウンファイルの内容をシミュレート
      const markdownContent = `# Title

This is normal text.

\`\`\`javascript
const x = 1;
\`\`\`

More text with \`inline code\` here.

Visit https://example.com for more.
`;

      // CommentExtractorでマークダウンを抽出
      const comments = commentExtractor.extract(markdownContent, 'markdown');
      expect(comments).toHaveLength(1);

      // MarkdownFilterでフィルタリング
      const result = markdownFilter.filter(comments[0].text);

      // 検証
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
      expect(result.filteredText).toContain('This is normal text.');
      expect(result.filteredText).toContain('More text with');
    });

    it('should handle code comments in JavaScript with Japanese', () => {
      const jsCode = `// これは日本語コメントです
const x = 1;
/*
 * ブロックコメント with https://example.com
 */
const y = \`template\`;`;

      // CommentExtractorでコメントを抽出
      const comments = commentExtractor.extract(jsCode, 'javascript');
      expect(comments.length).toBeGreaterThan(0);

      // 各コメントをMarkdownFilterでフィルタリング（URL除外のみ）
      for (const comment of comments) {
        const result = markdownFilter.filter(comment.text);
        // URLがある場合は除外される
        if (comment.text.includes('https://')) {
          expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
        }
      }
    });
  });

  describe('End-to-End Filtering', () => {
    const filter = new MarkdownFilter();

    it('should process complete markdown document', () => {
      const document = `# 日本語マークダウン文書

これは通常のテキストです。文法チェックの対象になります。

## コードセクション

以下のコードを参照してください：

\`\`\`typescript
// このコードは除外されます
const greeting = "こんにちは";
console.log(greeting);
\`\`\`

## テーブルセクション

| 設定キー | 説明 |
|----------|------|
| otakLcp.enable | 機能を有効化 |
| config.debug | デバッグモード |

## リンクセクション

詳細は[公式サイト](https://example.com)を参照してください。

また、<https://github.com>もご覧ください。

### インラインコード

\`npm install\` コマンドを実行してください。

---

以上で説明を終わります。
`;

      const result = filter.filter(document, { ...DEFAULT_FILTER_CONFIG, debugMode: true });

      // 各種除外が正しく行われていることを確認
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'config-key')).toBe(true);

      // 通常テキストは保持される
      expect(result.filteredText).toContain('これは通常のテキストです');
      expect(result.filteredText).toContain('以上で説明を終わります');

      // デバッグ情報が含まれる
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo?.totalExcludedCharacters).toBeGreaterThan(0);
    });

    it('should correctly apply filtering with custom patterns', () => {
      const text = `Text with CUSTOM_PATTERN_1 and CUSTOM_PATTERN_2.

Also contains \`code\` and https://example.com.`;

      const config: FilterConfig = {
        ...DEFAULT_FILTER_CONFIG,
        customExcludePatterns: [/CUSTOM_PATTERN_\d+/g]
      };

      const result = filter.filter(text, config);

      // カスタムパターンが除外される
      expect(result.excludedRanges.some((r) => r.type === 'custom')).toBe(true);
      // 他の除外も正常に動作
      expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
    });

    it('should maintain position information for diagnostic integration', () => {
      const text = `行1: 通常テキスト
行2: \`インラインコード\`
行3: 通常テキスト`;

      const result = filter.filter(text);
      const inlineCode = result.excludedRanges.find((r) => r.type === 'inline-code');

      if (inlineCode) {
        // 位置情報が正確であることを確認
        const extractedContent = text.substring(inlineCode.start, inlineCode.end);
        expect(extractedContent).toBe('`インラインコード`');
      }
    });
  });

  describe('Configuration Scenarios', () => {
    it('should work with all filters disabled', () => {
      const filter = new MarkdownFilter({
        excludeCodeBlocks: false,
        excludeInlineCode: false,
        excludeTables: false,
        excludeUrls: false,
        excludeConfigKeys: false,
        excludeHeadings: false,
        excludeListMarkers: false,
        customExcludePatterns: [],
        debugMode: false
      });

      const text = '```code``` and `inline` and https://url.com';
      const result = filter.filter(text);

      // 何も除外されない
      expect(result.excludedRanges).toHaveLength(0);
      expect(result.filteredText).toBe(text);
    });

    it('should work with selective filters enabled', () => {
      const filter = new MarkdownFilter({
        excludeCodeBlocks: true,
        excludeInlineCode: false,
        excludeTables: false,
        excludeUrls: true,
        excludeConfigKeys: false,
        excludeHeadings: false,
        excludeListMarkers: false,
        customExcludePatterns: [],
        debugMode: false
      });

      const text = '```code``` and `inline` and https://url.com';
      const result = filter.filter(text);

      // コードブロックとURLのみ除外
      expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
      expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
      expect(result.excludedRanges.filter((r) => r.type === 'inline-code').length).toBe(0);
    });
  });

  describe('Performance with Real-World Content', () => {
    it('should handle large markdown documents efficiently', () => {
      const filter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });

      // 大きなマークダウン文書を生成
      const sections = [];
      for (let i = 0; i < 100; i++) {
        sections.push(`## セクション ${i}

これはセクション${i}の内容です。

\`\`\`javascript
console.log("Section ${i}");
\`\`\`

詳細は https://example.com/section/${i} を参照。

| 項目 | 値 |
|------|-----|
| item | ${i} |
`);
      }
      const largeDocument = sections.join('\n');

      const startTime = Date.now();
      const result = filter.filter(largeDocument);
      const processingTime = Date.now() - startTime;

      // 処理が完了すること
      expect(result.filteredText.length).toBe(largeDocument.length);
      expect(result.excludedRanges.length).toBeGreaterThan(0);

      // 合理的な時間内に完了すること（1秒以内）
      expect(processingTime).toBeLessThan(1000);

      // デバッグ情報に処理時間が含まれる
      expect(result.debugInfo?.processingTimeMs).toBeDefined();
    });

    it('should handle deeply nested structures', () => {
      const filter = new MarkdownFilter();

      const text = `
> 引用内の \`インラインコード\`
>
> \`\`\`
> 引用内のコードブロック
> \`\`\`
>
> 引用内の https://example.com
`;

      const result = filter.filter(text);

      // 引用内でも正しくフィルタリングされる
      expect(result.excludedRanges.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from malformed markdown', () => {
      const filter = new MarkdownFilter();

      // 閉じていないコードブロック
      const malformed1 = '```\nunclosed code block';
      const result1 = filter.filter(malformed1);
      expect(result1.originalText).toBe(malformed1);

      // 不正なテーブル構造
      const malformed2 = '| incomplete\n| table';
      const result2 = filter.filter(malformed2);
      expect(result2.originalText).toBe(malformed2);

      // 不正なリンク構文
      const malformed3 = '[unclosed link(https://example.com';
      const result3 = filter.filter(malformed3);
      expect(result3.originalText).toBe(malformed3);
    });
  });
});

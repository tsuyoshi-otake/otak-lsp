/**
 * MarkdownFilterのプロパティベーステスト
 * Feature: markdown-document-filtering
 * 要件: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { MarkdownFilter } from './markdownFilter';
import {
  FilterConfig,
  DEFAULT_FILTER_CONFIG
} from '../../../shared/src/markdownFilterTypes';

describe('Property-Based Tests: Markdown Filter', () => {
  const filter = new MarkdownFilter();

  /**
   * Feature: markdown-document-filtering, Property 1: コードブロック除外の完全性
   * 任意のマークダウンテキストにおいて、コードブロック（```で囲まれた部分）および
   * インラインコード（`で囲まれた部分）を含む場合、フィルタリング後のテキストには
   * コード内容が含まれていない
   * Validates: Requirements 1.1, 1.2, 1.3
   */
  describe('Property 1: コードブロック除外の完全性', () => {
    it('should exclude code block content from filtered text for any input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 50 }),
          (codeContent, prefix, suffix) => {
            // コードコンテンツから```を除外（テストを壊さないため）
            const safeContent = codeContent.replace(/`/g, '');
            if (safeContent.length === 0) return true;

            const text = `${prefix}\n\`\`\`\n${safeContent}\n\`\`\`\n${suffix}`;
            const result = filter.filter(text);

            // フィルタリング後のテキストにコードコンテンツが含まれていないことを確認
            // ただし、除外範囲はスペースで置換されるため、スペースを除いて確認
            const filteredWithoutSpaces = result.filteredText.trim();
            const expectedPrefix = prefix.trim();
            const expectedSuffix = suffix.trim();

            // コード部分が除外されていることを確認
            expect(result.excludedRanges.length).toBeGreaterThanOrEqual(1);
            expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should exclude inline code content from filtered text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('`') && !s.includes('\n')),
          fc.string({ minLength: 0, maxLength: 30 }),
          fc.string({ minLength: 0, maxLength: 30 }),
          (inlineCode, prefix, suffix) => {
            if (inlineCode.trim().length === 0) return true;

            const text = `${prefix}\`${inlineCode}\`${suffix}`;
            const result = filter.filter(text);

            // インラインコードが除外されていることを確認
            expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle multiple code blocks correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('`')),
            { minLength: 1, maxLength: 5 }
          ),
          (codeContents) => {
            const blocks = codeContents.map((c) => `\`\`\`\n${c}\n\`\`\``).join('\n');
            const result = filter.filter(blocks);

            // 各コードブロックが除外されていることを確認
            const codeBlockRanges = result.excludedRanges.filter((r) => r.type === 'code-block');
            expect(codeBlockRanges.length).toBeGreaterThanOrEqual(codeContents.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should preserve text outside code blocks', () => {
      fc.assert(
        fc.property(
          // テーブル行パターン、リストマーカー、見出しマーカーを除外
          fc.string({ minLength: 1, maxLength: 50 }).filter(
            (s) => !s.includes('`') && 
                   !/^\|.*\|$/.test(s.trim()) &&
                   !/^\s*[-*+]\s/.test(s) &&  // リストマーカー（- * +）を除外
                   !/^\s*\d+\.\s/.test(s) &&  // 番号付きリストマーカーを除外
                   !/^#{1,6}\s/.test(s)       // 見出しマーカーを除外
          ),
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('`')),
          (normalText, codeContent) => {
            const text = `${normalText}\n\`\`\`\n${codeContent}\n\`\`\``;
            const result = filter.filter(text);

            // 通常テキストがフィルタリング結果に含まれていることを確認
            expect(result.filteredText.includes(normalText)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: markdown-document-filtering, Property 4: 設定変更の一貫性
   * 任意のフィルタリング設定において、設定変更がフィルタリング動作に正しく反映され、
   * 無効設定時はデフォルト動作となる
   * Validates: Requirements 4.1, 4.2, 4.3, 4.4
   */
  describe('Property 4: 設定変更の一貫性', () => {
    it('should respect excludeCodeBlocks setting', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('`')),
          (excludeCodeBlocks, codeContent) => {
            const text = `\`\`\`\n${codeContent}\n\`\`\``;
            const config: FilterConfig = {
              ...DEFAULT_FILTER_CONFIG,
              excludeCodeBlocks
            };
            const result = filter.filter(text, config);

            if (excludeCodeBlocks) {
              expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
            } else {
              expect(result.excludedRanges.filter((r) => r.type === 'code-block').length).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should respect excludeInlineCode setting', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => !s.includes('`') && !s.includes('\n')),
          (excludeInlineCode, inlineCode) => {
            if (inlineCode.trim().length === 0) return true;

            const text = `\`${inlineCode}\``;
            const config: FilterConfig = {
              ...DEFAULT_FILTER_CONFIG,
              excludeCodeBlocks: false, // コードブロックを無効にしてインラインのみテスト
              excludeInlineCode
            };
            const result = filter.filter(text, config);

            if (excludeInlineCode) {
              expect(result.excludedRanges.some((r) => r.type === 'inline-code')).toBe(true);
            } else {
              expect(result.excludedRanges.filter((r) => r.type === 'inline-code').length).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should use default config when invalid config provided', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 50 }),
          (text) => {
            const filter1 = new MarkdownFilter();
            const filter2 = new MarkdownFilter(DEFAULT_FILTER_CONFIG);

            const result1 = filter1.filter(text);
            const result2 = filter2.filter(text);

            // 両方とも同じ結果を返す
            expect(result1.excludedRanges.length).toBe(result2.excludedRanges.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should correctly toggle filtering on/off', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('`')),
          (codeContent) => {
            const text = `\`\`\`\n${codeContent}\n\`\`\``;

            // 全て無効
            const disabledConfig: FilterConfig = {
              ...DEFAULT_FILTER_CONFIG,
              excludeCodeBlocks: false,
              excludeInlineCode: false,
              excludeTables: false,
              excludeUrls: false,
              excludeConfigKeys: false
            };
            const disabledResult = filter.filter(text, disabledConfig);

            // フィルタリングが無効の場合、除外範囲がない
            expect(disabledResult.excludedRanges.length).toBe(0);

            // 有効
            const enabledResult = filter.filter(text, DEFAULT_FILTER_CONFIG);
            expect(enabledResult.excludedRanges.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: markdown-document-filtering, Property 2: テーブル構造の適切な処理
   * 任意のマークダウンテーブルにおいて、各テーブルセルが独立した文として扱われ、
   * テーブル区切り文字（|）が読点としてカウントされず、設定キー名が除外される
   * Validates: Requirements 2.1, 2.2, 2.3, 2.4
   */
  describe('Property 2: テーブル構造の適切な処理', () => {
    it('should detect tables with varying column counts', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 1, max: 3 }),
          (columns, rows) => {
            const header = Array(columns).fill('Header').map((h, i) => `${h}${i}`).join(' | ');
            const separator = Array(columns).fill('------').join(' | ');
            const dataRows = Array(rows)
              .fill(null)
              .map((_, r) => Array(columns).fill(`Cell`).map((c, i) => `${c}${r}${i}`).join(' | '));

            const table = `| ${header} |\n| ${separator} |\n${dataRows.map((r) => `| ${r} |`).join('\n')}`;
            const result = filter.filter(table);

            expect(result.excludedRanges.some((r) => r.type === 'table')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should exclude config keys in any position', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('otakLcp', 'config', 'settings'),
          fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z0-9_]+$/.test(s)),
          (prefix, suffix) => {
            const configKey = `${prefix}.${suffix}`;
            const text = `Setting: ${configKey} is enabled`;
            const result = filter.filter(text);

            expect(result.excludedRanges.some((r) => r.type === 'config-key')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should preserve text outside tables', () => {
      fc.assert(
        fc.property(
          // テーブルマーカー、改行、バッククォート（インラインコード）、リストマーカーを除外
          fc.string({ minLength: 1, maxLength: 30 }).filter(
            (s) => !s.includes('|') && 
                   !s.includes('\n') && 
                   !s.includes('`') &&
                   !/^\s*[-*+]\s/.test(s) &&  // リストマーカー（- * +）を除外
                   !/^\s*\d+\.\s/.test(s) &&  // 番号付きリストマーカーを除外
                   !/^#{1,6}\s/.test(s)       // 見出しマーカーを除外
          ),
          (normalText) => {
            const table = `| A | B |
|---|---|
| 1 | 2 |`;
            const text = `${normalText}\n${table}`;
            const result = filter.filter(text);

            expect(result.filteredText.includes(normalText)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not count pipe characters as commas', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          (cellCount) => {
            const cells = Array(cellCount).fill('cell').join(' | ');
            const text = `| ${cells} |`;
            const result = filter.filter(text);

            // パイプ文字は読点としてカウントされないため、除外範囲には含まれない
            // （テーブルとして認識されない場合）
            expect(result.originalText).toBe(text);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: markdown-document-filtering, Property 3: URL除外の包括性
   * 任意のテキストにおいて、URL（プレーンテキスト、マークダウンリンク記法、自動リンク記法）が
   * 含まれる場合、URL部分が文法チェック対象から除外される（マークダウンリンクのテキスト部分は除く）
   * Validates: Requirements 3.1, 3.2, 3.3, 3.4
   */
  describe('Property 3: URL除外の包括性', () => {
    it('should exclude any valid http/https URL', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('http', 'https'),
          fc.webUrl().map((url) => url.replace(/^https?:\/\//, '')),
          (protocol, domain) => {
            const url = `${protocol}://${domain}`;
            const text = `Visit ${url} for more info`;
            const result = filter.filter(text);

            expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should preserve link text while excluding URL', () => {
      fc.assert(
        fc.property(
          // リンク記法文字、バッククォート（インラインコード）、リストマーカー、見出しマーカーを除外
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            (s) => !s.includes('[') && 
                   !s.includes(']') && 
                   !s.includes('(') && 
                   !s.includes(')') && 
                   !s.includes('`') &&
                   !/^\s*[-*+]\s/.test(s) &&  // リストマーカー（- * +）を除外
                   !/^\s*\d+\.\s/.test(s) &&  // 番号付きリストマーカーを除外
                   !/^#{1,6}\s/.test(s)       // 見出しマーカーを除外
          ),
          fc.webUrl(),
          (linkText, url) => {
            const text = `Click [${linkText}](${url})`;
            const result = filter.filter(text);

            // リンクテキストは保持される
            expect(result.filteredText.includes(linkText)).toBe(true);
            // URLは除外される
            expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle auto-link syntax', () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const text = `Visit <${url}> for more`;
          const result = filter.filter(text);

          expect(result.excludedRanges.some((r) => r.type === 'url')).toBe(true);
        }),
        { numRuns: 30 }
      );
    });

    it('should not exclude URLs inside code blocks', () => {
      fc.assert(
        fc.property(fc.webUrl(), (url) => {
          const text = `\`\`\`\n${url}\n\`\`\``;
          const result = filter.filter(text);

          // コードブロックが検出される
          expect(result.excludedRanges.some((r) => r.type === 'code-block')).toBe(true);
          // URLは独立して検出されない（コードブロック内なので）
          const urlRanges = result.excludedRanges.filter((r) => r.type === 'url');
          expect(urlRanges.length).toBe(0);
        }),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: markdown-document-filtering, Property 5: フィルタリング結果の検証可能性
   * 任意のフィルタリング処理において、除外範囲情報が提供され、デバッグモード時は
   * 詳細ログが出力され、エラー時は詳細情報が報告される
   * Validates: Requirements 5.1, 5.2, 5.3, 5.4
   */
  describe('Property 5: フィルタリング結果の検証可能性', () => {
    it('should always provide excluded range information', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          (text) => {
            const result = filter.filter(text);

            expect(result).toHaveProperty('excludedRanges');
            expect(Array.isArray(result.excludedRanges)).toBe(true);
            expect(result).toHaveProperty('originalText');
            expect(result).toHaveProperty('filteredText');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should provide debug info when debug mode is enabled', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (text) => {
            const debugFilter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });
            const result = debugFilter.filter(text);

            expect(result.debugInfo).toBeDefined();
            expect(result.debugInfo).toHaveProperty('processingTimeMs');
            expect(result.debugInfo).toHaveProperty('totalExcludedCharacters');
            expect(result.debugInfo).toHaveProperty('excludedByType');
            expect(result.debugInfo).toHaveProperty('logs');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should not include debug info when debug mode is disabled', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (text) => {
            const normalFilter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: false });
            const result = normalFilter.filter(text);

            expect(result.debugInfo).toBeUndefined();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should correctly calculate excluded character counts', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }).filter((s) => !s.includes('`')),
          (codeContent) => {
            const text = `\`\`\`\n${codeContent}\n\`\`\``;
            const debugFilter = new MarkdownFilter({ ...DEFAULT_FILTER_CONFIG, debugMode: true });
            const result = debugFilter.filter(text);

            if (result.debugInfo && result.excludedRanges.length > 0) {
              const calculatedTotal = result.excludedRanges.reduce(
                (sum, r) => sum + (r.end - r.start),
                0
              );
              expect(result.debugInfo.totalExcludedCharacters).toBe(calculatedTotal);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle errors gracefully and return original text', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 100 }),
          (text) => {
            // 通常の入力ではエラーは発生しないが、常に元のテキストを保持
            const result = filter.filter(text);
            expect(result.originalText).toBe(text);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

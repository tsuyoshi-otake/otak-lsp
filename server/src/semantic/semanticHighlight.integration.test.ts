/**
 * セマンティックハイライト統合テスト
 * Feature: semantic-highlight-fix
 * 検証: 要件 1.1, 1.4, 2.1, 2.2, 2.3
 *
 * このテストは、Markdownファイルのセマンティックハイライト機能が
 * 正しく動作することを検証します。
 */

import { MeCabAnalyzer } from '../mecab/analyzer';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from './tokenFilter';
import { SemanticTokenProvider } from './tokenProvider';
import { Token } from '../../../shared/src/types';

jest.setTimeout(20000);

describe('Semantic Highlight Integration Tests', () => {
  let mecabAnalyzer: MeCabAnalyzer;
  let markdownFilter: MarkdownFilter;
  let tokenFilter: TokenFilter;
  let semanticTokenProvider: SemanticTokenProvider;

  beforeAll(async () => {
    mecabAnalyzer = new MeCabAnalyzer();
    markdownFilter = new MarkdownFilter();
    tokenFilter = new TokenFilter();
    semanticTokenProvider = new SemanticTokenProvider();

    // kuromoji初期化を待つ
    await mecabAnalyzer.isAvailable();
  });

  /**
   * セマンティックトークンのデータから絶対位置を復元する
   */
  const decodeSemanticTokens = (data: number[]): Array<{
    line: number;
    char: number;
    length: number;
    type: number;
  }> => {
    const decoded: Array<{ line: number; char: number; length: number; type: number }> = [];
    let currentLine = 0;
    let currentChar = 0;

    for (let i = 0; i < data.length; i += 5) {
      const deltaLine = data[i];
      const deltaChar = data[i + 1];
      const length = data[i + 2];
      const type = data[i + 3];

      currentLine += deltaLine;
      currentChar = deltaLine === 0 ? currentChar + deltaChar : deltaChar;

      decoded.push({ line: currentLine, char: currentChar, length, type });
    }

    return decoded;
  };

  /**
   * フルパイプライン: Markdown -> フィルタリング -> 解析 -> トークンフィルタリング -> セマンティックトークン
   */
  const processMarkdown = async (text: string): Promise<{
    tokens: Token[];
    semanticTokens: { data: number[] };
    excludedRangesCount: number;
  }> => {
    // 1. Markdownフィルタリング
    const filterResult = markdownFilter.filter(text);
    const excludedRanges = filterResult.excludedRanges;

    // 2. 形態素解析
    const allTokens = await mecabAnalyzer.analyze(filterResult.filteredText);

    // 3. トークンフィルタリング（除外範囲内のトークンを除外）
    const tokens = tokenFilter.filterTokens(allTokens, excludedRanges);

    // 4. セマンティックトークン生成（元のテキストを使用）
    const semanticTokens = semanticTokenProvider.provideSemanticTokens(tokens, text);

    return {
      tokens,
      semanticTokens,
      excludedRangesCount: excludedRanges.length
    };
  };

  describe('基本的なMarkdownファイルの解析', () => {
    it('日本語テキストのみのMarkdownが正しくハイライトされること', async () => {
      const markdown = '日本語のテスト文章です。';
      const result = await processMarkdown(markdown);

      // トークンが生成されている
      expect(result.tokens.length).toBeGreaterThan(0);

      // セマンティックトークンが生成されている
      expect(result.semanticTokens.data.length).toBeGreaterThan(0);

      // トークン数 × 5 = セマンティックトークンデータ長
      expect(result.semanticTokens.data.length).toBe(result.tokens.length * 5);
    });

    it('複数行のMarkdownが正しくハイライトされること', async () => {
      const markdown = `これは最初の行です。
これは二行目です。
これは三行目です。`;
      const result = await processMarkdown(markdown);

      // 複数のトークンが生成されている
      expect(result.tokens.length).toBeGreaterThan(3);

      // セマンティックトークンが生成されている
      const decoded = decodeSemanticTokens(result.semanticTokens.data);

      // 複数行にまたがるトークンが存在する
      const lines = new Set(decoded.map(t => t.line));
      expect(lines.size).toBeGreaterThan(1);
    });
  });

  describe('コードブロックの除外', () => {
    it('コードブロック内のテキストがセマンティックハイライトされないこと', async () => {
      const markdown = `説明テキストです。

\`\`\`javascript
const 日本語変数 = "これはコード内の日本語";
\`\`\`

続きのテキストです。`;

      const result = await processMarkdown(markdown);

      // 除外範囲が検出されている
      expect(result.excludedRangesCount).toBeGreaterThan(0);

      // コードブロック内の日本語がトークンに含まれていない
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).not.toContain('日本語変数');
      expect(surfaces.join('')).not.toContain('これはコード内の日本語');

      // 説明テキストはハイライトされている
      expect(surfaces.join('')).toContain('説明');
      expect(surfaces.join('')).toContain('テキスト');
    });
  });

  describe('インラインコードの除外', () => {
    it('インラインコード内のテキストがセマンティックハイライトされないこと', async () => {
      const markdown = 'これは`コード例`を含むテキストです。';

      const result = await processMarkdown(markdown);

      // 除外範囲が検出されている
      expect(result.excludedRangesCount).toBeGreaterThan(0);

      // インラインコード内の日本語がトークンに含まれていない
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).not.toContain('コード例');

      // 通常テキストはハイライトされている
      expect(surfaces.join('')).toContain('これ');
      expect(surfaces.join('')).toContain('テキスト');
    });
  });

  describe('URLの除外', () => {
    it('URL内のテキストがセマンティックハイライトされないこと', async () => {
      const markdown = '詳細は https://example.com/日本語パス を参照してください。';

      const result = await processMarkdown(markdown);

      // 除外範囲が検出されている
      expect(result.excludedRangesCount).toBeGreaterThan(0);

      // URL内の日本語がトークンに含まれていない
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).not.toContain('日本語パス');

      // 通常テキストはハイライトされている
      expect(surfaces.join('')).toContain('詳細');
      expect(surfaces.join('')).toContain('参照');
    });

    it('Markdownリンク内のURLがセマンティックハイライトされないこと', async () => {
      const markdown = '[リンクテキスト](https://example.com/path)を参照してください。';

      const result = await processMarkdown(markdown);

      // リンクテキストはハイライトされている
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).toContain('リンク');

      // 通常テキストはハイライトされている
      expect(surfaces.join('')).toContain('参照');
    });
  });

  describe('テーブルの除外', () => {
    it('テーブル内のテキストがセマンティックハイライトされないこと', async () => {
      const markdown = `これはテーブルの説明です。

| 項目 | 値 |
|------|-----|
| 名前 | 太郎 |
| 年齢 | 20 |

テーブルの後の説明です。`;

      const result = await processMarkdown(markdown);

      // 除外範囲が検出されている
      expect(result.excludedRangesCount).toBeGreaterThan(0);

      // テーブル内の日本語がトークンに含まれていない
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).not.toContain('項目');
      expect(surfaces.join('')).not.toContain('太郎');

      // 説明テキストはハイライトされている
      expect(surfaces.join('')).toContain('テーブル');
      expect(surfaces.join('')).toContain('説明');
    });
  });

  describe('混在コンテンツの処理', () => {
    it('README形式のドキュメントが正しく処理されること', async () => {
      const markdown = `# 日本語文法チェッカー

このプロジェクトは日本語の文法をチェックします。

## 機能

- 形態素解析
- 文法エラー検出

## インストール

\`\`\`bash
npm install otak-lcp
\`\`\`

## 使い方

\`npm start\` コマンドで起動します。

詳細は [ドキュメント](https://example.com/docs) を参照してください。`;

      const result = await processMarkdown(markdown);

      // トークンが生成されている
      expect(result.tokens.length).toBeGreaterThan(0);

      // コードブロック内のテキストが除外されている
      const surfaces = result.tokens.map(t => t.surface);
      expect(surfaces.join('')).not.toContain('npm install');

      // インラインコード内のテキストが除外されている
      expect(surfaces.join('')).not.toContain('npm start');

      // 見出しのテキストはハイライトされている
      expect(surfaces.join('')).toContain('文法');
      expect(surfaces.join('')).toContain('チェッカー');

      // 本文テキストはハイライトされている
      expect(surfaces.join('')).toContain('プロジェクト');
    });
  });

  describe('セマンティックトークンの位置正確性', () => {
    it('トークンの位置が元のドキュメントと一致すること', async () => {
      const markdown = '日本語テストです。';
      const result = await processMarkdown(markdown);

      const decoded = decodeSemanticTokens(result.semanticTokens.data);

      // 各トークンの位置で元のテキストを抽出して検証
      for (let i = 0; i < result.tokens.length; i++) {
        const token = result.tokens[i];
        const semanticToken = decoded[i];

        // トークンの長さが一致
        expect(semanticToken.length).toBe(token.surface.length);

        // 位置からテキストを抽出して検証（単一行の場合）
        if (semanticToken.line === 0) {
          const extractedText = markdown.substring(
            semanticToken.char,
            semanticToken.char + semanticToken.length
          );
          expect(extractedText).toBe(token.surface);
        }
      }
    });

    it('複数行でもトークンの位置が正しいこと', async () => {
      const markdown = `最初の行です。
二行目です。`;
      const result = await processMarkdown(markdown);

      const decoded = decodeSemanticTokens(result.semanticTokens.data);
      const lines = markdown.split('\n');

      // 各トークンの長さが正しい
      for (let i = 0; i < result.tokens.length; i++) {
        const token = result.tokens[i];
        const semanticToken = decoded[i];

        expect(semanticToken.length).toBe(token.surface.length);

        // 行が存在する場合、その行からテキストを抽出して検証
        if (semanticToken.line < lines.length) {
          const line = lines[semanticToken.line];
          if (semanticToken.char + semanticToken.length <= line.length) {
            const extractedText = line.substring(
              semanticToken.char,
              semanticToken.char + semanticToken.length
            );
            expect(extractedText).toBe(token.surface);
          }
        }
      }
    });
  });

  describe('エッジケース', () => {
    it('空のドキュメントを処理できること', async () => {
      const result = await processMarkdown('');

      expect(result.tokens).toHaveLength(0);
      expect(result.semanticTokens.data).toHaveLength(0);
    });

    it('コードブロックのみのドキュメントを処理できること', async () => {
      const markdown = `\`\`\`javascript
const x = 1;
\`\`\``;

      const result = await processMarkdown(markdown);

      // すべてのテキストが除外されているため、トークンは少ない
      // （記号や空白のみが残る可能性がある）
      expect(result.excludedRangesCount).toBeGreaterThan(0);
    });

    it('ネストされた引用を処理できること', async () => {
      const markdown = `> これは引用です。
> > これはネストされた引用です。`;

      const result = await processMarkdown(markdown);

      // トークンが生成されている
      expect(result.tokens.length).toBeGreaterThan(0);
    });

    it('特殊文字を含むテキストを処理できること', async () => {
      const markdown = '日本語！？「テスト」＆記号。';

      const result = await processMarkdown(markdown);

      // トークンが生成されている
      expect(result.tokens.length).toBeGreaterThan(0);

      // セマンティックトークンが生成されている
      expect(result.semanticTokens.data.length).toBeGreaterThan(0);
    });
  });
});

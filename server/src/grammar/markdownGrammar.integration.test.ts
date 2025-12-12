/**
 * Markdown + Grammar Checker End-to-End Integration Test
 * Feature: markdown-document-filtering
 *
 * main.ts と同一条件でのテスト:
 * MarkdownFilter -> MeCabAnalyzer -> GrammarChecker + AdvancedRulesManager
 *
 * 検証項目:
 * 1. コードブロック内のサンプルテキストが検出されないこと
 * 2. 見出しやリスト内の日本語テキストが正しくチェックされること
 * 3. テーブル内のテキストが除外されること
 * 4. URLが除外されること
 */

import { MarkdownFilter } from '../parser/markdownFilter';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { GrammarChecker } from './checker';
import { AdvancedRulesManager } from './advancedRulesManager';
import { Token, Diagnostic } from '../../../shared/src/types';

/**
 * main.ts の analyzeDocument と同じ処理を行うテストヘルパー
 */
async function analyzeMarkdown(text: string): Promise<Diagnostic[]> {
  const markdownFilter = new MarkdownFilter();
  const mecabAnalyzer = new MeCabAnalyzer();
  const grammarChecker = new GrammarChecker();
  const advancedRulesManager = new AdvancedRulesManager();

  // 1. Markdown filtering
  const filterResult = markdownFilter.filter(text);
  const textToAnalyze = filterResult.filteredText;

  // 2. Morphological analysis with kuromoji
  const tokens = await mecabAnalyzer.analyze(textToAnalyze);

  // 3. Grammar check (basic + advanced)
  const basicDiagnostics = grammarChecker.check(tokens, textToAnalyze);
  const advancedDiagnostics = advancedRulesManager.checkText(textToAnalyze, tokens);

  return [...basicDiagnostics, ...advancedDiagnostics];
}

/**
 * 診断情報のコードでフィルタ
 */
function filterByCode(diagnostics: Diagnostic[], code: string): Diagnostic[] {
  return diagnostics.filter(d => d.code === code);
}

/**
 * 診断情報に特定のメッセージが含まれるか
 */
function hasMessageContaining(diagnostics: Diagnostic[], text: string): boolean {
  return diagnostics.some(d => d.message.includes(text));
}

describe('Markdown + Grammar Checker E2E Integration', () => {
  jest.setTimeout(30000); // kuromoji loading time

  describe('Code Block Exclusion', () => {
    it('should NOT detect ra-nuki in code block samples', async () => {
      const markdown = `# ら抜き言葉の例

以下はサンプルです：

\`\`\`
食べれる -> 食べられる
見れる -> 見られる
\`\`\`

上記を参照してください。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // コードブロック内の「食べれる」「見れる」は検出されない
      expect(hasMessageContaining(raNukiErrors, '食べれる')).toBe(false);
      expect(hasMessageContaining(raNukiErrors, '見れる')).toBe(false);
    });

    it('should NOT detect double-negation in code block samples', async () => {
      const markdown = `# 二重否定の例

\`\`\`
できないわけではない -> できる
知らないことはない -> 知っている
\`\`\`
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const doubleNegErrors = filterByCode(diagnostics, 'double-negation');

      expect(hasMessageContaining(doubleNegErrors, 'ないわけではない')).toBe(false);
      expect(hasMessageContaining(doubleNegErrors, 'ないことはない')).toBe(false);
    });

    it('should NOT detect redundant expressions in code block samples', async () => {
      const markdown = `# 冗長表現の例

\`\`\`
馬から落馬 -> 落馬
後で後悔 -> 後悔
\`\`\`
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const redundantErrors = filterByCode(diagnostics, 'redundant-expression');

      expect(hasMessageContaining(redundantErrors, '馬から落馬')).toBe(false);
      expect(hasMessageContaining(redundantErrors, '後で後悔')).toBe(false);
    });

    it('should NOT detect term-notation errors in code block samples', async () => {
      const markdown = `# 技術用語サンプル

\`\`\`javascript
// Javascriptのコード
const aws = require('aws-sdk');
\`\`\`
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // コードブロック内の誤表記は検出されない
      expect(termErrors.length).toBe(0);
    });
  });

  describe('Heading Text Detection', () => {
    it('should detect grammar errors in heading text', async () => {
      const markdown = `# 食べれる機能の説明

これは通常のテキストです。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // 見出し内の「食べれる」が検出される
      expect(hasMessageContaining(raNukiErrors, '食べれる')).toBe(true);
    });

    it('should detect term-notation errors in heading text', async () => {
      const markdown = `# Javascriptの使い方

説明文です。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // 見出し内の「Javascript」が検出される
      expect(hasMessageContaining(termErrors, 'JavaScript')).toBe(true);
    });
  });

  describe('List Item Text Detection', () => {
    it('should detect grammar errors in list item text', async () => {
      const markdown = `# 機能一覧

- 食べれる機能を提供します
- 見れる機能もあります
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // リストアイテム内の「食べれる」「見れる」が検出される
      expect(hasMessageContaining(raNukiErrors, '食べれる')).toBe(true);
      expect(hasMessageContaining(raNukiErrors, '見れる')).toBe(true);
    });

    it('should detect kanji-opening errors in list item text', async () => {
      const markdown = `# 操作手順

- 確認して下さい
- 準備をお願い致します
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const kanjiErrors = filterByCode(diagnostics, 'kanji-opening');

      // リストアイテム内の漢字開きエラーが検出される
      expect(hasMessageContaining(kanjiErrors, 'ください') || hasMessageContaining(kanjiErrors, '下さい')).toBe(true);
    });
  });

  describe('Table Exclusion', () => {
    it('should NOT detect errors in table content', async () => {
      const markdown = `# 設定一覧

| 設定キー | 説明 |
|----------|------|
| Javascript | 技術用語 |
| aws | クラウド |

上記を参照。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // テーブル内の誤表記は検出されない
      expect(termErrors.length).toBe(0);
    });
  });

  describe('URL Exclusion', () => {
    it('should NOT detect errors in URLs', async () => {
      const markdown = `# リンク

詳細は https://example.com/javascript を参照してください。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // URL内の「javascript」は検出されない
      expect(hasMessageContaining(termErrors, 'javascript')).toBe(false);
    });
  });

  describe('Inline Code Exclusion', () => {
    it('should NOT detect errors in inline code', async () => {
      const markdown = `# コマンド

\`npm install javascript\` を実行してください。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // インラインコード内の誤表記は検出されない
      expect(hasMessageContaining(termErrors, 'javascript')).toBe(false);
    });
  });

  describe('Normal Text Detection', () => {
    it('should detect ra-nuki in normal text', async () => {
      const markdown = `# 説明

この機能を使うと食べれるようになります。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // 通常テキスト内の「食べれる」が検出される
      expect(hasMessageContaining(raNukiErrors, '食べれる')).toBe(true);
    });

    it('should detect term-notation errors in normal text', async () => {
      const markdown = `# 概要

このプロジェクトはJavascriptで書かれています。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const termErrors = filterByCode(diagnostics, 'term-notation');

      // 通常テキスト内の「Javascript」が検出される
      expect(hasMessageContaining(termErrors, 'JavaScript')).toBe(true);
    });

    it('should detect double-negation in normal text', async () => {
      const markdown = `# 注意事項

この機能は使えないわけではないので安心してください。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const doubleNegErrors = filterByCode(diagnostics, 'double-negation');

      // 通常テキスト内の二重否定が検出される
      expect(doubleNegErrors.length).toBeGreaterThan(0);
    });

    it('should detect redundant expressions in normal text', async () => {
      const markdown = `# 注意

馬から落馬しないように気をつけてください。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const redundantErrors = filterByCode(diagnostics, 'redundant-expression');

      // 通常テキスト内の冗長表現が検出される
      expect(hasMessageContaining(redundantErrors, '馬から落馬') || redundantErrors.length > 0).toBe(true);
    });
  });

  describe('Mixed Content Document', () => {
    it('should correctly handle README-like document', async () => {
      const readme = `# サンプルプロジェクト

このプロジェクトは食べれる機能を提供します。

## 使い方

- 確認して下さい
- 設定を変更します

### コードサンプル

\`\`\`javascript
// Javascriptのサンプル
const result = "食べれる";
\`\`\`

| 設定 | 値 |
|------|-----|
| enabled | true |

詳細は https://example.com を参照してください。
`;

      const diagnostics = await analyzeMarkdown(readme);

      // 通常テキストやリスト内のエラーは検出される
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');
      expect(raNukiErrors.length).toBeGreaterThan(0);

      // コードブロック内のエラーは検出されない（term-notation）
      const termErrorsInCode = filterByCode(diagnostics, 'term-notation').filter(
        d => d.message.includes('Javascript')
      );
      // 通常テキストにはJavascriptがないので、term-notationは0のはず
      // (コードブロック内のJavascriptは除外される)
      expect(termErrorsInCode.length).toBe(0);

      // 漢字開きエラー（リスト内）は検出される
      const kanjiErrors = filterByCode(diagnostics, 'kanji-opening');
      expect(kanjiErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Position Accuracy', () => {
    it('should report correct line numbers for detected issues', async () => {
      const markdown = `# タイトル

通常のテキストです。

食べれるのは良いことです。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // 「食べれる」は5行目（0-indexed: 4）にある
      expect(raNukiErrors.length).toBeGreaterThan(0);
      const error = raNukiErrors[0];
      expect(error.range.start.line).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document', async () => {
      const diagnostics = await analyzeMarkdown('');
      expect(diagnostics.length).toBe(0);
    });

    it('should handle document with only code blocks', async () => {
      const markdown = `\`\`\`javascript
const x = "食べれる";
\`\`\``;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // コードブロックのみの文書では検出されない
      expect(raNukiErrors.length).toBe(0);
    });

    it('should handle document with nested quotes', async () => {
      const markdown = `> 引用内の食べれる表現

通常のテキストです。
`;

      const diagnostics = await analyzeMarkdown(markdown);
      const raNukiErrors = filterByCode(diagnostics, 'ra-nuki');

      // 引用内のテキストも検出される
      expect(raNukiErrors.length).toBeGreaterThan(0);
    });
  });
});

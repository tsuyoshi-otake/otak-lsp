/**
 * Bullet Punctuation Rule
 * 箇条書き項目の句点運用をチェックする
 * Feature: official-document-rules
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5, 5.1, 5.2, 5.3, 5.4
 *
 * 公用文の運用:
 * - 名詞句の箇条書き: 句点「。」は付けない
 * - 文の箇条書き: 句点「。」を付ける
 * - 判定が曖昧な場合は診断しない
 * - 末尾が「：」や括弧/引用符閉じの場合は診断しない
 */

import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { splitMarkdownPipeTableRowCells, stripMarkdownBlockquotePrefix } from '../../../../shared/src/markdownSyntax';

/**
 * 箇条書き項目の分類
 */
export type BulletItemClassification = 'noun-phrase' | 'sentence' | 'ambiguous';

/**
 * 箇条書き項目の情報
 */
export interface BulletItem {
  /** 項目のテキスト（マーカー除く） */
  text: string;
  /** 元テキストでの開始位置 */
  start: number;
  /** 元テキストでの終了位置 */
  end: number;
  /** 句点で終わるか */
  hasPeriod: boolean;
  /** 分類 */
  classification: BulletItemClassification;
}

/**
 * 箇条書きマーカーの正規表現
 * - Markdown: `-`, `*`, `+`, `番号.`
 * - 日本語: `・`
 */
const BULLET_MARKER_REGEX = /^(\s*)([-*+]|\d+\.|・)\s+(.*)$/;

/**
 * 末尾例外パターン（診断しない）
 * - コロン（：:）
 * - 括弧閉じ（）」】』）
 * - 引用符閉じ（"'）
 */
const TRAILING_EXCEPTION_REGEX = /[：:）」】』"']$/;

/**
 * 文末を示す品詞パターン（動詞・形容詞・助動詞）
 */
const SENTENCE_ENDING_POS = [
  '動詞',
  '形容詞',
  '助動詞'
];

/**
 * 文末を示す特定の表現（です・ます・だ・である等）
 */
const SENTENCE_ENDING_PATTERNS = [
  /です$/,
  /ます$/,
  /だ$/,
  /である$/,
  /ない$/,
  /ある$/,
  /いる$/,
  /する$/,
  /なる$/,
  /れる$/,
  /られる$/,
  /せる$/,
  /させる$/,
  /た$/,
  /ました$/,
  /でした$/
];

/**
 * 名詞句を示す品詞パターン
 */
const NOUN_PHRASE_POS = [
  '名詞',
  '接尾辞'
];

/**
 * 箇条書き句点運用をチェックするルール
 */
export class BulletPunctuationRule implements AdvancedGrammarRule {
  name = 'bullet-punctuation';
  description = '箇条書き項目の句点運用をチェックします';

  /**
   * 任意の断片（行/セル）から箇条書き項目を抽出
   */
  private extractBulletItemFromFragment(fragment: string, fragmentStart: number): BulletItem | null {
    const match = fragment.match(BULLET_MARKER_REGEX);
    if (!match) {
      return null;
    }

    const [, , , content] = match;
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      return null;
    }

    const matchOffset = match.index ?? 0;
    const contentOffset = matchOffset + match[0].length - content.length;
    const contentStart = fragmentStart + contentOffset;

    return {
      text: trimmedContent,
      start: contentStart,
      end: contentStart + trimmedContent.length,
      hasPeriod: trimmedContent.endsWith('。'),
      classification: 'ambiguous' // 後で分類
    };
  }

  /**
   * 行から箇条書き項目を抽出
   */
  extractBulletItem(line: string, lineStart: number): BulletItem | null {
    // blockquoteプレフィックスを除去
    const { strippedLine, strippedLength } = stripMarkdownBlockquotePrefix(line);
    return this.extractBulletItemFromFragment(strippedLine, lineStart + strippedLength);
  }

  /**
   * 行から箇条書き項目（複数）を抽出
   */
  private extractBulletItemsFromLine(line: string, lineStart: number): BulletItem[] {
    const items: BulletItem[] = [];
    const { strippedLine, strippedLength } = stripMarkdownBlockquotePrefix(line);
    const trimmed = strippedLine.trimStart();
    const leadingSpaces = strippedLine.length - trimmed.length;

    // テーブル行はセル単位で箇条書きを検出
    if (trimmed.startsWith('|')) {
      const tableStartInStripped = leadingSpaces;
      const tableCells = splitMarkdownPipeTableRowCells(strippedLine.slice(tableStartInStripped));
      for (const cell of tableCells) {
        const cellStart = lineStart + strippedLength + tableStartInStripped + cell.start;
        const item = this.extractBulletItemFromFragment(cell.raw, cellStart);
        if (item) {
          items.push(item);
        }
      }
      return items;
    }

    const item = this.extractBulletItemFromFragment(strippedLine, lineStart + strippedLength);
    if (item) {
      items.push(item);
    }

    return items;
  }

  /**
   * 項目が末尾例外パターンに該当するか
   */
  isTrailingException(text: string): boolean {
    // 句点を除いた末尾をチェック
    const textWithoutPeriod = text.replace(/。$/, '');
    return TRAILING_EXCEPTION_REGEX.test(textWithoutPeriod);
  }

  /**
   * トークン列から項目を分類
   */
  classifyItem(text: string, tokens: Token[]): BulletItemClassification {
    // 空のトークン列は曖昧
    if (tokens.length === 0) {
      return 'ambiguous';
    }

    // 句点を除いたテキストで判定
    const textWithoutPeriod = text.replace(/。$/, '');
    
    // 末尾から有効なトークンを探す
    const effectiveTokens = tokens.filter(t => {
      const surface = t.surface.trim();
      // 句読点・記号は除外
      if (t.pos === '記号' || surface === '。' || surface === '、') {
        return false;
      }
      return surface.length > 0;
    });

    if (effectiveTokens.length === 0) {
      return 'ambiguous';
    }

    const lastToken = effectiveTokens[effectiveTokens.length - 1];
    
    // 文末パターンをチェック
    for (const pattern of SENTENCE_ENDING_PATTERNS) {
      if (pattern.test(textWithoutPeriod)) {
        return 'sentence';
      }
    }

    // 品詞で判定
    if (SENTENCE_ENDING_POS.some(pos => lastToken.pos.startsWith(pos))) {
      // 動詞・形容詞・助動詞で終わる場合は文
      return 'sentence';
    }

    if (NOUN_PHRASE_POS.some(pos => lastToken.pos.startsWith(pos))) {
      // 名詞・接尾辞で終わる場合は名詞句
      return 'noun-phrase';
    }

    // その他は曖昧
    return 'ambiguous';
  }

  /**
   * 項目テキストに対応するトークンを抽出
   */
  getTokensForItem(item: BulletItem, allTokens: Token[]): Token[] {
    return allTokens.filter(t => {
      const tokenStart = t.start;
      const tokenEnd = t.end;
      return tokenStart >= item.start && tokenEnd <= item.end;
    });
  }

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;
    const lines = text.split('\n');

    let lineStart = 0;
    for (const line of lines) {
      const items = this.extractBulletItemsFromLine(line, lineStart);

      for (const item of items) {
        // 末尾例外パターンは診断しない（要件 6.5）
        if (!this.isTrailingException(item.text)) {
          // トークンを取得して分類
          const itemTokens = this.getTokensForItem(item, tokens);
          item.classification = this.classifyItem(item.text, itemTokens);

          // 曖昧な場合は診断しない（要件 6.4）
          if (item.classification !== 'ambiguous') {
            const diagnostic = this.createDiagnostic(item);
            if (diagnostic) {
              diagnostics.push(diagnostic);
            }
          }
        }
      }

      lineStart += line.length + 1; // +1 for newline
    }

    return diagnostics;
  }

  /**
   * 診断を作成
   */
  createDiagnostic(item: BulletItem): AdvancedDiagnostic | null {
    // 要件 6.2: 名詞句 + 句点あり → 警告
    if (item.classification === 'noun-phrase' && item.hasPeriod) {
      return new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.end - 1 },
          end: { line: 0, character: item.end }
        },
        message: '名詞句の箇条書きには句点「。」を付けないのが一般的です。（根拠: 公用文作成の考え方）',
        code: 'bullet-punctuation',
        ruleName: this.name,
        suggestions: ['句点「。」を削除する'],
        severity: DiagnosticSeverity.Information
      });
    }

    // 要件 6.3: 文 + 句点なし → 警告
    if (item.classification === 'sentence' && !item.hasPeriod) {
      return new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: item.end - 1 },
          end: { line: 0, character: item.end }
        },
        message: '文の箇条書きには句点「。」を付けるのが一般的です。（根拠: 公用文作成の考え方）',
        code: 'bullet-punctuation',
        ruleName: this.name,
        suggestions: ['句点「。」を追加する'],
        severity: DiagnosticSeverity.Information
      });
    }

    return null;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableBulletPunctuation;
  }
}

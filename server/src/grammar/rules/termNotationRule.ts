/**
 * Term Notation Rule
 * 技術用語の表記を統一する
 * Feature: advanced-grammar-rules
 * 要件: 10.1, 10.2, 10.3, 10.4, 10.5, 12.1, 12.2, 12.3, 12.4, 12.5, 13.4
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import {
  AWS_NOTATION_RULES,
  AZURE_NOTATION_RULES,
  GENERATIVE_AI_NOTATION_RULES,
  OCI_NOTATION_RULES,
  WEB_TECH_NOTATION_RULES
} from '../../dictionaries/termNotationDictionary';
import { findCodeBlockRanges, findInlineCodeRanges, TERM_TOKEN_PATTERN, WORD_SEGMENT_PATTERN } from '../../utils/regexPatterns';
import { isNotBlank, splitLines } from '../../utils/stringUtils';

type PhraseTrieNode = {
  correct?: string;
  children: Map<string, PhraseTrieNode>;
};

type CompiledDictionary = {
  singleWord: Map<string, string>;
  phraseTrieRoot: PhraseTrieNode;
  maxPhraseWords: number;
};

/**
 * 技術用語表記統一ルール
 */
export class TermNotationRule implements AdvancedGrammarRule {
  name = 'term-notation';
  description = '技術用語の表記を統一します';

  private customRules: Map<string, string> = new Map();
  private cachedDictionaryKey: string | null = null;
  private cachedDictionaries: Map<string, string> | null = null;
  private cachedCompiledKey: string | null = null;
  private cachedCompiled: CompiledDictionary | null = null;

  /**
   * コードブロック（```...```）の範囲を取得
   */
  private getCodeBlockRanges(text: string): Array<{ start: number; end: number }> {
    return findCodeBlockRanges(text);
  }

  /**
   * インラインコード（`...`）の範囲を取得
   */
  private getInlineCodeRanges(text: string): Array<{ start: number; end: number }> {
    return findInlineCodeRanges(text);
  }

  /**
   * テーブルの「誤表記例」列の範囲を取得
   * 形式: | 誤った表記 | 正しい表記 |
   */
  private getTableExampleColumnRanges(text: string): Array<{ start: number; end: number }> {
    const ranges: Array<{ start: number; end: number }> = [];
    const lines = splitLines(text);
    let offset = 0;

    for (const line of lines) {
      // テーブル行（| で始まる）
      if (/^\s*\|/.test(line) && line.includes('|')) {
        const cells = line.split('|');
        // 最初の非空セル（誤表記例列）を除外
        if (cells.length >= 3) {
          let cellStart = 0;
          for (let i = 0; i < cells.length; i++) {
            if (i === 0) {
              cellStart = cells[i].length + 1; // 最初の空セル + |
              continue;
            }
            if (i === 1 && isNotBlank(cells[i]) && !/^[-:]+$/.test(cells[i].trim())) {
              // 最初の内容セル（誤表記例）を除外範囲に追加
              const cellEnd = cellStart + cells[i].length;
              ranges.push({ start: offset + cellStart, end: offset + cellEnd });
            }
            break;
          }
        }
      }
      offset += line.length + 1; // +1 for newline
    }
    return ranges;
  }

  /**
   * 指定位置が除外範囲内かどうかを判定
   */
  private isInExcludedRegion(
    index: number,
    length: number,
    excludedRanges: Array<{ start: number; end: number }>
  ): boolean {
    const end = index + length;
    return excludedRanges.some(range =>
      (index >= range.start && index < range.end) ||
      (end > range.start && end <= range.end) ||
      (index <= range.start && end >= range.end)
    );
  }

  /**
   * 有効な辞書を取得
   */
  getActiveDictionaries(config: AdvancedRulesConfig): Map<string, string> {
    const cacheKey = this.buildDictionaryKey(config);
    if (this.cachedDictionaryKey === cacheKey && this.cachedDictionaries) {
      return this.cachedDictionaries;
    }

    const combined = new Map<string, string>();

    if (config.enableWebTechDictionary) {
      for (const [incorrect, correct] of WEB_TECH_NOTATION_RULES) {
        combined.set(incorrect, correct);
      }
    }
    if (config.enableGenerativeAIDictionary) {
      for (const [incorrect, correct] of GENERATIVE_AI_NOTATION_RULES) {
        combined.set(incorrect, correct);
      }
    }
    if (config.enableAWSDictionary) {
      for (const [incorrect, correct] of AWS_NOTATION_RULES) {
        combined.set(incorrect, correct);
      }
    }
    if (config.enableAzureDictionary) {
      for (const [incorrect, correct] of AZURE_NOTATION_RULES) {
        combined.set(incorrect, correct);
      }
    }
    if (config.enableOCIDictionary) {
      for (const [incorrect, correct] of OCI_NOTATION_RULES) {
        combined.set(incorrect, correct);
      }
    }

    // カスタムルールを追加
    if (config.customNotationRules) {
      for (const [k, v] of config.customNotationRules) {
        combined.set(k, v);
      }
    }
    for (const [k, v] of this.customRules) {
      combined.set(k, v);
    }

    this.cachedDictionaryKey = cacheKey;
    this.cachedDictionaries = combined;
    return combined;
  }

  /**
   * カスタムルールを追加
   */
  addCustomRule(incorrect: string, correct: string): void {
    this.customRules.set(incorrect, correct);
    this.cachedDictionaryKey = null;
    this.cachedDictionaries = null;
    this.cachedCompiledKey = null;
    this.cachedCompiled = null;
  }

  /**
   * 正しい表記を取得
   */
  getCorrectNotation(term: string, config: AdvancedRulesConfig): string | null {
    const dictionaries = this.getActiveDictionaries(config);
    return dictionaries.get(term) ?? null;
  }

  /**
   * テキスト内の誤った表記を検出
   */
  detectIncorrectNotation(text: string, config: AdvancedRulesConfig): Array<{ incorrect: string; correct: string; index: number }> {
    const { singleWord, phraseTrieRoot, maxPhraseWords } = this.getCompiledDictionaries(config);

    const termTokenRegex = new RegExp(TERM_TOKEN_PATTERN.source, TERM_TOKEN_PATTERN.flags);
    const tokens: Array<{ value: string; start: number; end: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = termTokenRegex.exec(text)) !== null) {
      const value = m[0];
      const start = m.index;
      tokens.push({ value, start, end: start + value.length });
    }

    const isWhitespaceOnly = (between: string): boolean => /^\s+$/.test(between);

    const results: Array<{ incorrect: string; correct: string; index: number }> = [];

    for (let i = 0; i < tokens.length; ) {
      let node: PhraseTrieNode | null = phraseTrieRoot;
      let best: { endIndex: number; correct: string } | null = null;

      for (let j = i; j < tokens.length && j < i + maxPhraseWords; j += 1) {
        if (j > i) {
          const between = text.slice(tokens[j - 1].end, tokens[j].start);
          if (!isWhitespaceOnly(between)) {
            break;
          }
        }

        node = node.children.get(tokens[j].value) ?? null;
        if (!node) {
          break;
        }

        if (node.correct) {
          best = { endIndex: j, correct: node.correct };
        }
      }

      if (best) {
        const start = tokens[i].start;
        const end = tokens[best.endIndex].end;
        results.push({
          incorrect: text.slice(start, end),
          correct: best.correct,
          index: start
        });
        i = best.endIndex + 1;
        continue;
      }

      const token = tokens[i];
      const correct = singleWord.get(token.value);
      if (correct) {
        results.push({
          incorrect: token.value,
          correct,
          index: token.start
        });
        i += 1;
        continue;
      }

      // vscode-languageclient のような複合語に対して、区切り文字（-/.など）で分割して部分一致も拾う。
      // 既存実装（正規表現 + \\b）と同等の検出を目指す。
      const segmentRegex = new RegExp(WORD_SEGMENT_PATTERN.source, WORD_SEGMENT_PATTERN.flags);
      let segment: RegExpExecArray | null;
      while ((segment = segmentRegex.exec(token.value)) !== null) {
        const part = segment[0];
        const partCorrect = singleWord.get(part);
        if (!partCorrect) {
          continue;
        }

        results.push({
          incorrect: part,
          correct: partCorrect,
          index: token.start + segment.index
        });
      }

      i += 1;
    }

    return results;
  }

  private buildDictionaryKey(config: AdvancedRulesConfig): string {
    const flags = [
      config.enableWebTechDictionary ? '1' : '0',
      config.enableGenerativeAIDictionary ? '1' : '0',
      config.enableAWSDictionary ? '1' : '0',
      config.enableAzureDictionary ? '1' : '0',
      config.enableOCIDictionary ? '1' : '0'
    ].join('');

    const customEntries: Array<[string, string]> = [];
    if (config.customNotationRules) {
      for (const [k, v] of config.customNotationRules) {
        customEntries.push([k, v]);
      }
    }
    for (const [k, v] of this.customRules) {
      customEntries.push([k, v]);
    }

    customEntries.sort((a, b) => {
      if (a[0] < b[0]) return -1;
      if (a[0] > b[0]) return 1;
      if (a[1] < b[1]) return -1;
      if (a[1] > b[1]) return 1;
      return 0;
    });

    const customKey = customEntries.map(([k, v]) => `${k}=>${v}`).join('|');
    return `${flags}:${customKey}`;
  }

  private getCompiledDictionaries(config: AdvancedRulesConfig): CompiledDictionary {
    const cacheKey = this.buildDictionaryKey(config);
    if (this.cachedCompiledKey === cacheKey && this.cachedCompiled) {
      return this.cachedCompiled;
    }

    const dictionaries = this.getActiveDictionaries(config);

    const singleWord = new Map<string, string>();
    const phraseTrieRoot: PhraseTrieNode = { children: new Map() };
    let maxPhraseWords = 1;

    for (const [incorrect, correct] of dictionaries) {
      if (incorrect === correct) {
        continue;
      }

      const parts = incorrect.trim().split(/\s+/g).filter((v) => v.length > 0);
      if (parts.length <= 1) {
        singleWord.set(incorrect, correct);
        continue;
      }

      maxPhraseWords = Math.max(maxPhraseWords, parts.length);
      let node = phraseTrieRoot;
      for (const part of parts) {
        const next = node.children.get(part) ?? { children: new Map() };
        node.children.set(part, next);
        node = next;
      }
      node.correct = correct;
    }

    const compiled = { singleWord, phraseTrieRoot, maxPhraseWords };
    this.cachedCompiledKey = cacheKey;
    this.cachedCompiled = compiled;
    return compiled;
  }

  /**
   * 文法チェックを実行
   * Feature: advanced-rules-shared-preprocessing-cache
   * - context.shared がある場合は共有コンテキストのコード範囲を使用
   * - context.shared がない場合は従来通り個別に計算（フォールバック）
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const text = context.documentText;

    // 除外範囲を取得（コードブロック、インラインコード、テーブル誤表記例列）
    // Feature: advanced-rules-shared-preprocessing-cache
    // 共有コンテキストがあれば再利用、なければ個別計算
    const codeBlockRanges = context.shared?.codeBlockRanges ?? this.getCodeBlockRanges(text);
    const inlineCodeRanges = context.shared?.inlineCodeRanges ?? this.getInlineCodeRanges(text);
    const excludedRanges = [
      ...codeBlockRanges,
      ...inlineCodeRanges,
      ...this.getTableExampleColumnRanges(text)
    ];

    const errors = this.detectIncorrectNotation(text, context.config);

    for (const error of errors) {
      // 除外範囲内の検出はスキップ
      if (this.isInExcludedRegion(error.index, error.incorrect.length, excludedRanges)) {
        continue;
      }

      diagnostics.push(new AdvancedDiagnostic({
        range: {
          start: { line: 0, character: error.index },
          end: { line: 0, character: error.index + error.incorrect.length }
        },
        message: `技術用語の表記「${error.incorrect}」は「${error.correct}」に統一してください。`,
        code: 'term-notation',
        ruleName: this.name,
        suggestions: [`「${error.correct}」に変更する`]
      }));
    }

    return diagnostics;
  }

  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableTermNotation;
  }
}

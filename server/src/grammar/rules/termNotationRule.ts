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

/**
 * 技術用語表記統一ルール
 */
export class TermNotationRule implements AdvancedGrammarRule {
  name = 'term-notation';
  description = '技術用語の表記を統一します';

  private customRules: Map<string, string> = new Map();

  /**
   * 有効な辞書を取得
   */
  getActiveDictionaries(config: AdvancedRulesConfig): Map<string, string> {
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
      config.customNotationRules.forEach((v, k) => combined.set(k, v));
    }
    this.customRules.forEach((v, k) => combined.set(k, v));

    return combined;
  }

  /**
   * カスタムルールを追加
   */
  addCustomRule(incorrect: string, correct: string): void {
    this.customRules.set(incorrect, correct);
  }

  /**
   * 正しい表記を取得
   */
  getCorrectNotation(term: string, config: AdvancedRulesConfig): string | null {
    const dictionaries = this.getActiveDictionaries(config);
    return dictionaries.get(term) || null;
  }

  /**
   * テキスト内の誤った表記を検出
   */
  detectIncorrectNotation(text: string, config: AdvancedRulesConfig): Array<{ incorrect: string; correct: string; index: number }> {
    type PhraseTrieNode = {
      correct?: string;
      children: Map<string, PhraseTrieNode>;
    };

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

    const termTokenRegex = /[A-Za-z0-9.+#/_:-]+/g;
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
      const segmentRegex = /[A-Za-z0-9_]+/g;
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

  /**
   * 文法チェックを実行
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const errors = this.detectIncorrectNotation(context.documentText, context.config);

    for (const error of errors) {
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

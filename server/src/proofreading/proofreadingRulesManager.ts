/**
 * 校正設定向けルールマネージャー
 * Feature: proofreading-settings-compat
 *
 * 校正設定固有のルールを集約して管理する
 */

import { Token, Diagnostic, Position } from '../../../shared/src/types';
import { ProofreadingSettingsConfig, DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { BracketRangeDetector } from './bracketRangeDetector';
import { DictionaryEntry } from '../dictionaries/proofreadingDictionaryLoader';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
import { isNotEmpty } from '../utils/arrayUtils';
import {
  ProofreadingDiagnostic,
  ProofreadingRuleContext,
} from './rules/proofreadingRuleTypes';
import { checkEraFirstYear } from './rules/eraFirstYearRule';
import { checkCharTypeRunLength } from './rules/charTypeRunLengthRule';
import { checkPunctuationEvenCount } from './rules/punctuationEvenCountRule';
import { checkSpaceAfterQuestionExclamation } from './rules/spaceAfterQuestionExclamationRule';
import { checkPeriodBeforeCloseBracket } from './rules/periodBeforeCloseBracketRule';
import { checkBracketDepth } from './rules/bracketDepthRule';
import { checkDictionaryEntries } from './rules/proofreadingDictionaryRule';

/**
 * 校正設定向けルールマネージャー
 */
export class ProofreadingRulesManager {
  private config: ProofreadingSettingsConfig;
  private bracketDetector: BracketRangeDetector;
  private dictionaryEntries: DictionaryEntry[] = [];
  private lineStarts: number[] = [];

  constructor(config?: ProofreadingSettingsConfig, _logger?: Logger) {
    this.config = config ?? DEFAULT_PROOFREADING_CONFIG;
    this.bracketDetector = new BracketRangeDetector();
  }

  updateConfig(config: ProofreadingSettingsConfig): void {
    this.config = config;
  }

  getConfig(): ProofreadingSettingsConfig {
    return this.config;
  }

  setDictionaryEntries(entries: DictionaryEntry[]): void {
    this.dictionaryEntries = entries;
  }

  private offsetToPosition = (offset: number): Position => {
    return offsetToLineAndCharacter(this.lineStarts, offset);
  };

  /**
   * テキストをチェック
   */
  checkText(text: string, _tokens: Token[]): Diagnostic[] {
    this.lineStarts = computeLineStarts(text);
    const categories = this.config.categories;
    const checkInBrackets = categories.typo.checkInBrackets;
    const bracketRanges = this.bracketDetector.detect(text);

    const ctx: ProofreadingRuleContext = {
      text,
      bracketRanges,
      checkInBrackets,
      bracketDetector: this.bracketDetector,
      offsetToPosition: this.offsetToPosition,
    };

    const diagnostics: ProofreadingDiagnostic[] = [];

    if (categories.typo.enable && categories.typo.eraFirstYear) {
      diagnostics.push(...checkEraFirstYear(ctx));
    }

    if (categories.length.enable) {
      diagnostics.push(...checkCharTypeRunLength(ctx, {
        hiragana: categories.length.hiragana,
        katakana: categories.length.katakana,
        kanji: categories.length.kanji,
      }));
    }

    if (categories.punctuation.enable) {
      diagnostics.push(...checkPunctuationEvenCount(ctx, {
        evenLeader: categories.punctuation.evenLeader,
        evenDash: categories.punctuation.evenDash,
        evenWave: categories.punctuation.evenWave,
      }));

      if (categories.punctuation.spaceAfterQE) {
        diagnostics.push(...checkSpaceAfterQuestionExclamation(ctx));
      }
      if (categories.punctuation.periodBeforeCloseBracket) {
        diagnostics.push(...checkPeriodBeforeCloseBracket(ctx));
      }
    }

    if (categories.bracket.enable) {
      diagnostics.push(...checkBracketDepth(ctx, bracketRanges, categories.bracket.maxDepth));
    }

    if (isNotEmpty(this.dictionaryEntries)) {
      diagnostics.push(...checkDictionaryEntries(ctx, this.dictionaryEntries));
    }

    return diagnostics.map((d) => ({
      range: d.range,
      message: d.message,
      severity: d.severity,
      code: d.code,
      source: 'otak-lsp-proofreading',
    }));
  }
}

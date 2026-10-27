/**
 * 校正設定向けルールマネージャー
 * Feature: proofreading-settings-compat
 *
 * 校正設定固有のルールを集約して管理する
 */

import { Token, Diagnostic, Position } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { ProofreadingSettingsConfig, DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { BracketRangeDetector } from './bracketRangeDetector';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { Logger } from '../utils/logger';
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
import { checkPrivateUseCharacters } from './rules/privateUseCharacterRule';

/**
 * 校正設定向けルールマネージャー
 */
export class ProofreadingRulesManager {
  private config: ProofreadingSettingsConfig;
  private bracketDetector: BracketRangeDetector;
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

  private offsetToPosition = (offset: number): Position => {
    return offsetToLineAndCharacter(this.lineStarts, offset);
  };

  /**
   * テキストをチェック
   *
   * @param text 対象テキスト
   * @param _tokens トークン（現状未使用）
   * @param precomputedLineStarts 既に算出済みの lineStarts。指定時は再計算しない
   */
  checkText(text: string, _tokens: Token[], precomputedLineStarts?: number[], config: ProofreadingSettingsConfig = this.config, markdownRanges?: readonly ExcludedRange[]): Diagnostic[] {
    this.lineStarts = precomputedLineStarts ?? computeLineStarts(text);
    const categories = config.categories;
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
    // 誤字カテゴリの括弧設定は、長さ・約物の検査には適用しない。
    const nonTypoContext: ProofreadingRuleContext = { ...ctx, checkInBrackets: true };

    if (categories.typo.enable && categories.typo.eraFirstYear) {
      diagnostics.push(...checkEraFirstYear(ctx));
    }

    if (categories.length.enable) {
      diagnostics.push(...checkCharTypeRunLength(nonTypoContext, {
        hiragana: categories.length.hiragana,
        katakana: categories.length.katakana,
        kanji: categories.length.kanji,
      }));
    }

    if (categories.envDependent.enable && categories.envDependent.checkUserCreatedGaiji) {
      for (const diagnostic of checkPrivateUseCharacters(nonTypoContext)) {
        diagnostics.push(diagnostic);
      }
    }

    if (categories.punctuation.enable) {
      diagnostics.push(...checkPunctuationEvenCount(nonTypoContext, {
        evenLeader: categories.punctuation.evenLeader,
        evenDash: categories.punctuation.evenDash,
        evenWave: categories.punctuation.evenWave,
      }));

      if (categories.punctuation.spaceAfterQE) {
        diagnostics.push(...checkSpaceAfterQuestionExclamation(nonTypoContext, markdownRanges));
      }
      if (categories.punctuation.periodBeforeCloseBracket) {
        diagnostics.push(...checkPeriodBeforeCloseBracket(nonTypoContext));
      }
    }

    if (categories.bracket.enable) {
      diagnostics.push(...checkBracketDepth(ctx, bracketRanges, categories.bracket.maxDepth));
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

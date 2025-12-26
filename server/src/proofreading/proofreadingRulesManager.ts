/**
 * 校正設定向けルールマネージャー
 * Feature: proofreading-settings-compat
 * タスク7, 8, 9, 16: 各ルールとマネージャーの実装
 *
 * 校正設定固有のルールを集約して管理する
 */

import { Token, Diagnostic, DiagnosticSeverity, Range, Position } from '../../../shared/src/types';
import { ProofreadingSettingsConfig, DEFAULT_PROOFREADING_CONFIG } from './proofreadingConfig';
import { BracketRangeDetector, BracketRange } from './bracketRangeDetector';
import { DictionaryEntry } from '../dictionaries/proofreadingDictionaryLoader';

/**
 * 校正ルールの診断情報
 */
interface ProofreadingDiagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  code: string;
}

/**
 * 校正設定向けルールマネージャー
 */
export class ProofreadingRulesManager {
  private config: ProofreadingSettingsConfig;
  private bracketDetector: BracketRangeDetector;
  private dictionaryEntries: DictionaryEntry[] = [];
  private lineStarts: number[] = [];

  constructor(config?: ProofreadingSettingsConfig) {
    this.config = config ?? DEFAULT_PROOFREADING_CONFIG;
    this.bracketDetector = new BracketRangeDetector();
  }

  /**
   * 設定を更新
   */
  updateConfig(config: ProofreadingSettingsConfig): void {
    this.config = config;
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): ProofreadingSettingsConfig {
    return this.config;
  }

  /**
   * 辞書エントリを設定
   */
  setDictionaryEntries(entries: DictionaryEntry[]): void {
    this.dictionaryEntries = entries;
  }

  /**
   * 行開始位置を計算
   */
  private calculateLineStarts(text: string): void {
    this.lineStarts = [0];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '\n') {
        this.lineStarts.push(i + 1);
      }
    }
  }

  /**
   * オフセットから位置を取得
   */
  private offsetToPosition(offset: number): Position {
    let line = 0;
    for (let i = 1; i < this.lineStarts.length; i++) {
      if (offset < this.lineStarts[i]) {
        break;
      }
      line = i;
    }
    return { line, character: offset - this.lineStarts[line] };
  }

  /**
   * テキストをチェック
   */
  checkText(text: string, tokens: Token[]): Diagnostic[] {
    this.calculateLineStarts(text);
    const diagnostics: ProofreadingDiagnostic[] = [];

    // 括弧範囲を検出
    const bracketRanges = this.bracketDetector.detect(text);
    const checkInBrackets = this.config.categories.typo.checkInBrackets;

    // 各ルールを実行
    if (this.config.categories.typo.enable && this.config.categories.typo.eraFirstYear) {
      diagnostics.push(...this.checkEraFirstYear(text, bracketRanges, checkInBrackets));
    }

    if (this.config.categories.length.enable) {
      diagnostics.push(...this.checkCharTypeRunLength(text, bracketRanges, checkInBrackets));
    }

    if (this.config.categories.punctuation.enable) {
      diagnostics.push(...this.checkPunctuationEvenCount(text, bracketRanges, checkInBrackets));

      if (this.config.categories.punctuation.spaceAfterQE) {
        diagnostics.push(...this.checkSpaceAfterQuestionExclamation(text, bracketRanges, checkInBrackets));
      }
      if (this.config.categories.punctuation.periodBeforeCloseBracket) {
        diagnostics.push(...this.checkPeriodBeforeCloseBracket(text, bracketRanges, checkInBrackets));
      }
    }

    // 括弧階層チェック
    if (this.config.categories.bracket.enable) {
      diagnostics.push(...this.checkBracketDepth(bracketRanges));
    }

    // 辞書ベースのチェック
    if (this.dictionaryEntries.length > 0) {
      diagnostics.push(...this.checkDictionaryEntries(text, bracketRanges, checkInBrackets));
    }

    // 診断をDiagnostic形式に変換
    return diagnostics.map(d => ({
      range: d.range,
      message: d.message,
      severity: d.severity,
      code: d.code,
      source: 'otak-lsp-proofreading'
    }));
  }

  /**
   * 和暦初年のチェック（タスク8: EraFirstYearRule）
   */
  private checkEraFirstYear(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];

    // 令和1年、平成1年、昭和1年 などを検出
    const eraPattern = /(令和|平成|昭和|大正|明治)[1１一]年/g;
    let match;

    while ((match = eraPattern.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;

      // 括弧内チェックの制御
      if (!checkInBrackets && this.bracketDetector.isInsideBracket(start, bracketRanges)) {
        continue;
      }

      const eraName = match[1];
      diagnostics.push({
        range: {
          start: this.offsetToPosition(start),
          end: this.offsetToPosition(end)
        },
        message: `「${match[0]}」は「${eraName}元年」と表記することを推奨します`,
        severity: DiagnosticSeverity.Information,
        code: 'era-first-year'
      });
    }

    return diagnostics;
  }

  /**
   * 文字種連続長のチェック（タスク9: CharTypeRunLengthRule）
   */
  private checkCharTypeRunLength(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    const { hiragana, katakana, kanji } = this.config.categories.length;

    // ひらがな連続
    if (hiragana > 0) {
      const hiraganaPattern = new RegExp(`[ぁ-ん]{${hiragana + 1},}`, 'g');
      diagnostics.push(...this.findRunLengthViolations(
        text,
        hiraganaPattern,
        bracketRanges,
        checkInBrackets,
        'ひらがな',
        hiragana,
        'hiragana-run-length'
      ));
    }

    // カタカナ連続
    if (katakana > 0) {
      const katakanaPattern = new RegExp(`[ァ-ヴー]{${katakana + 1},}`, 'g');
      diagnostics.push(...this.findRunLengthViolations(
        text,
        katakanaPattern,
        bracketRanges,
        checkInBrackets,
        'カタカナ',
        katakana,
        'katakana-run-length'
      ));
    }

    // 漢字連続
    if (kanji > 0) {
      const kanjiPattern = new RegExp(`[一-龯]{${kanji + 1},}`, 'g');
      diagnostics.push(...this.findRunLengthViolations(
        text,
        kanjiPattern,
        bracketRanges,
        checkInBrackets,
        '漢字',
        kanji,
        'kanji-run-length'
      ));
    }

    return diagnostics;
  }

  /**
   * 連続長違反を検出
   */
  private findRunLengthViolations(
    text: string,
    pattern: RegExp,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean,
    charTypeName: string,
    threshold: number,
    code: string
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;

      if (!checkInBrackets && this.bracketDetector.isInsideBracket(start, bracketRanges)) {
        continue;
      }

      diagnostics.push({
        range: {
          start: this.offsetToPosition(start),
          end: this.offsetToPosition(end)
        },
        message: `${charTypeName}が${match[0].length}文字連続しています（閾値: ${threshold}文字）`,
        severity: DiagnosticSeverity.Information,
        code
      });
    }

    return diagnostics;
  }

  /**
   * 約物の偶数チェック（タスク12: PunctuationEvenCountRule）
   */
  private checkPunctuationEvenCount(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    const { evenLeader, evenDash, evenWave } = this.config.categories.punctuation;

    // 二点リーダ
    if (evenLeader) {
      diagnostics.push(...this.checkEvenCount(text, '‥', '二点リーダ', 'even-leader'));
    }

    // ダッシュ
    if (evenDash) {
      diagnostics.push(...this.checkEvenCount(text, '―', 'ダッシュ', 'even-dash'));
      diagnostics.push(...this.checkEvenCount(text, '—', 'ダッシュ', 'even-dash'));
    }

    // 波線
    if (evenWave) {
      diagnostics.push(...this.checkEvenCount(text, '〜', '波線', 'even-wave'));
      diagnostics.push(...this.checkEvenCount(text, '～', '波線', 'even-wave'));
    }

    return diagnostics;
  }

  /**
   * 特定文字の偶数チェック
   */
  private checkEvenCount(
    text: string,
    char: string,
    charName: string,
    code: string
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];

    // 連続した文字のグループを検出
    const pattern = new RegExp(`${this.escapeRegex(char)}+`, 'g');
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const count = match[0].length;
      if (count % 2 !== 0) {
        const start = match.index;
        const end = match.index + match[0].length;

        diagnostics.push({
          range: {
            start: this.offsetToPosition(start),
            end: this.offsetToPosition(end)
          },
          message: `${charName}は偶数個で使用することを推奨します（現在: ${count}個）`,
          severity: DiagnosticSeverity.Information,
          code
        });
      }
    }

    return diagnostics;
  }

  /**
   * 疑問符/感嘆符の後の空白をチェック
   */
  private checkSpaceAfterQuestionExclamation(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    const pattern = /[?!？！]/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const index = match.index;

      if (!checkInBrackets && this.bracketDetector.isInsideBracket(index, bracketRanges)) {
        continue;
      }

      const next = text[index + 1];
      if (!next) {
        continue;
      }
      if (/\s/.test(next)) {
        continue;
      }
      if (/[?!？！]/.test(next)) {
        continue;
      }

      let cursor = index + 1;
      let hasWhitespace = false;
      while (cursor < text.length) {
        const ch = text[cursor];
        if (/\s/.test(ch)) {
          hasWhitespace = true;
          break;
        }
        if (this.isClosingBracket(ch)) {
          cursor += 1;
          continue;
        }
        break;
      }

      if (hasWhitespace || cursor >= text.length) {
        continue;
      }

      diagnostics.push({
        range: {
          start: this.offsetToPosition(index),
          end: this.offsetToPosition(index + 1)
        },
        message: '疑問符/感嘆符の後に空白がありません。後続の文が続く場合は1文字分空けてください。',
        severity: DiagnosticSeverity.Information,
        code: 'space-after-question-exclamation'
      });
    }

    return diagnostics;
  }

  /**
   * 括弧内の文末句点有無をチェック
   */
  private checkPeriodBeforeCloseBracket(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    const innerRanges = this.bracketDetector.getInnerRanges(bracketRanges);
    const sentenceEndingPattern = /(?:です|ます|である|であります|だった|でした|であった|だ|とする|という)$/;

    for (const range of innerRanges) {
      if (!checkInBrackets && this.bracketDetector.isInsideBracket(range.start, bracketRanges)) {
        continue;
      }

      const innerText = text.slice(range.start, range.end);
      const trimmed = innerText.trim();
      if (!trimmed) {
        continue;
      }

      const endPunctMatch = /([。！？!?])\s*$/.exec(trimmed);
      const hasEndPunct = Boolean(endPunctMatch);
      const trimmedWithoutPunct = hasEndPunct ? trimmed.replace(/[。！？!?]\s*$/, '') : trimmed;
      const isSentenceLike = sentenceEndingPattern.test(trimmedWithoutPunct);

      if (isSentenceLike && !hasEndPunct) {
        const closeIndex = range.end;
        diagnostics.push({
          range: {
            start: this.offsetToPosition(closeIndex),
            end: this.offsetToPosition(closeIndex + 1)
          },
          message: '括弧内が文の場合は句点（。）を付けてください。',
          severity: DiagnosticSeverity.Information,
          code: 'period-before-close-bracket'
        });
        continue;
      }

      if (hasEndPunct && !isSentenceLike && this.isShortNounPhrase(trimmedWithoutPunct)) {
        const punctChar = endPunctMatch?.[1];
        if (!punctChar) {
          continue;
        }
        const punctIndex = range.start + innerText.lastIndexOf(punctChar);
        diagnostics.push({
          range: {
            start: this.offsetToPosition(punctIndex),
            end: this.offsetToPosition(punctIndex + 1)
          },
          message: '括弧内が語句の場合は句点を付けません。句点を削除してください。',
          severity: DiagnosticSeverity.Information,
          code: 'period-before-close-bracket'
        });
      }
    }

    return diagnostics;
  }

  private isShortNounPhrase(text: string): boolean {
    return !/[ぁ-ん]/.test(text) && text.length <= 6;
  }

  private isClosingBracket(char: string): boolean {
    return '」』）)]】〕〉》］｝'.includes(char);
  }

  /**
   * 辞書エントリのチェック（タスク7: ProofreadingDictionaryRule）
   */
  private checkDictionaryEntries(
    text: string,
    bracketRanges: BracketRange[],
    checkInBrackets: boolean
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];

    for (const entry of this.dictionaryEntries) {
      let pattern: RegExp;
      try {
        if (entry.mode === 'regex') {
          pattern = new RegExp(entry.match, 'g');
        } else {
          pattern = new RegExp(this.escapeRegex(entry.match), 'g');
        }
      } catch (e) {
        // 不正な正規表現はスキップ
        continue;
      }

      let match;
      while ((match = pattern.exec(text)) !== null) {
        const start = match.index;
        const end = match.index + match[0].length;

        if (!checkInBrackets && this.bracketDetector.isInsideBracket(start, bracketRanges)) {
          continue;
        }

        let message = entry.message ?? `「${match[0]}」が検出されました`;
        if (entry.replace) {
          message += `（推奨: 「${entry.replace}」）`;
        }

        diagnostics.push({
          range: {
            start: this.offsetToPosition(start),
            end: this.offsetToPosition(end)
          },
          message,
          severity: DiagnosticSeverity.Information,
          code: `dictionary-${entry.category}`
        });
      }
    }

    return diagnostics;
  }

  /**
   * 括弧階層のチェック（タスク13: BracketDepthRule）
   */
  private checkBracketDepth(
    bracketRanges: BracketRange[]
  ): ProofreadingDiagnostic[] {
    const diagnostics: ProofreadingDiagnostic[] = [];
    const maxDepth = this.config.categories.bracket.maxDepth;

    for (const range of bracketRanges) {
      if (range.depth >= maxDepth) {
        diagnostics.push({
          range: {
            start: this.offsetToPosition(range.start),
            end: this.offsetToPosition(range.end)
          },
          message: `括弧の入れ子が深すぎます（深さ: ${range.depth + 1}、閾値: ${maxDepth}）`,
          severity: DiagnosticSeverity.Information,
          code: 'bracket-depth'
        });
      }
    }

    return diagnostics;
  }

  /**
   * 正規表現のエスケープ
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

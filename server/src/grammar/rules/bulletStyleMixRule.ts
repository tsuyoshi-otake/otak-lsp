/**
 * Bullet Style Mix Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 5 - Detect mixing of bullet point styles
 *
 * Detects mixing of:
 * - Nakaguro: ・
 * - Hyphen: -
 * - Asterisk: *
 */

import {
  AdvancedRulesConfig,
  AdvancedGrammarErrorType
} from '../../../../shared/src/advancedTypes';
import { MixDetectionRule, PatternInfo } from './mixDetectionRule';
import { splitMarkdownPipeTableRowCells, stripMarkdownBlockquotePrefix } from '../../../../shared/src/markdownSyntax';
import { isNotEmpty } from '../../utils/arrayUtils';
import { splitLines } from '../../utils/stringUtils';

/**
 * Bullet Style Mix Detection Rule
 * 箇条書き記号の混在を検出する
 */
export class BulletStyleMixRule extends MixDetectionRule {
  name = 'bullet-style-mix';
  description = '箇条書き記号の混在（・と-と*）を検出します';

  private static findInlineSeparatorPositions(raw: string, marker: '-' | '*'): number[] {
    const positions: number[] = [];
    const pattern = marker === '-' ? /\s-\s/g : /\s\*\s/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(raw)) !== null) {
      // ` - ` / ` * ` の中央文字位置をマーカー位置として扱う
      positions.push(match.index + 1);
    }
    return positions;
  }

  /**
   * Collect bullet patterns from text
   * Only counts bullets at the beginning of lines
   */
  protected collectPatterns(text: string): Map<string, PatternInfo> {
    const patterns = new Map<string, PatternInfo>();
    const lines = splitLines(text);

    const nakaguroPositions: number[] = [];
    const hyphenPositions: number[] = [];
    const asteriskPositions: number[] = [];

    let offset = 0;
    for (const line of lines) {
      const { strippedLine, strippedLength } = stripMarkdownBlockquotePrefix(line);
      const trimmed = strippedLine.trimStart();
      const leadingSpaces = strippedLine.length - trimmed.length;

      // テーブル行: セルごとに先頭マーカーを検出
      if (trimmed.startsWith('|')) {
        const tableStartInStripped = leadingSpaces;
        const tableCells = splitMarkdownPipeTableRowCells(strippedLine.slice(tableStartInStripped));

        for (const cell of tableCells) {
          // セルの先頭（空白除外）
          const raw = cell.raw;
          const firstNonWs = raw.search(/\S/);
          if (firstNonWs < 0) {
            continue;
          }

          const cellTrimmedStart = raw.slice(firstNonWs);
          const cellMarkerOffset =
            offset + strippedLength + tableStartInStripped + cell.start + firstNonWs;

          const hasLeadingBullet =
            cellTrimmedStart.startsWith('・') ||
            cellTrimmedStart.startsWith('- ') ||
            cellTrimmedStart === '-' ||
            cellTrimmedStart.startsWith('* ') ||
            cellTrimmedStart === '*';

          if (cellTrimmedStart.startsWith('・')) {
            nakaguroPositions.push(cellMarkerOffset);
          } else if (cellTrimmedStart.startsWith('- ') || cellTrimmedStart === '-') {
            hyphenPositions.push(cellMarkerOffset);
          } else if (cellTrimmedStart.startsWith('* ') || cellTrimmedStart === '*') {
            asteriskPositions.push(cellMarkerOffset);
          }

          // EVALS 表などで「複数行の例文」を 1セル内に圧縮して載せるケース:
          // `・項目1 - 項目2 * 項目3` のような ` - ` / ` * ` を簡易的な箇条書き区切りとして扱う
          if (hasLeadingBullet) {
            for (const rel of BulletStyleMixRule.findInlineSeparatorPositions(raw, '-')) {
              hyphenPositions.push(offset + strippedLength + tableStartInStripped + cell.start + rel);
            }
            for (const rel of BulletStyleMixRule.findInlineSeparatorPositions(raw, '*')) {
              asteriskPositions.push(offset + strippedLength + tableStartInStripped + cell.start + rel);
            }
          }
        }
      } else {
        // 通常行: 行頭の箇条書きマーカーのみ検出
        const markerOffset = offset + strippedLength + leadingSpaces;
        if (trimmed.startsWith('・')) {
          nakaguroPositions.push(markerOffset);
        } else if (trimmed.startsWith('- ') || trimmed === '-') {
          hyphenPositions.push(markerOffset);
        } else if (trimmed.startsWith('* ') || trimmed === '*') {
          asteriskPositions.push(markerOffset);
        }
      }

      offset += line.length + 1; // +1 for newline
    }

    if (isNotEmpty(nakaguroPositions)) {
      patterns.set('nakaguro', {
        count: nakaguroPositions.length,
        positions: nakaguroPositions
      });
    }

    if (isNotEmpty(hyphenPositions)) {
      patterns.set('hyphen', {
        count: hyphenPositions.length,
        positions: hyphenPositions
      });
    }

    if (isNotEmpty(asteriskPositions)) {
      patterns.set('asterisk', {
        count: asteriskPositions.length,
        positions: asteriskPositions
      });
    }

    return patterns;
  }

  /**
   * Create diagnostic message
   */
  protected createDiagnosticMessage(patterns: Map<string, PatternInfo>): string {
    const styleNames: string[] = [];
    const nakaguro = patterns.get('nakaguro');
    if (nakaguro) {
      styleNames.push(`・（${nakaguro.count}箇所）`);
    }
    const hyphen = patterns.get('hyphen');
    if (hyphen) {
      styleNames.push(`-（${hyphen.count}箇所）`);
    }
    const asterisk = patterns.get('asterisk');
    if (asterisk) {
      styleNames.push(`*（${asterisk.count}箇所）`);
    }

    return `箇条書き記号が混在しています。${styleNames.join('と')}が使用されています。どれかに統一してください。`;
  }

  /**
   * Get suggestions for fixing
   */
  protected getSuggestions(_patterns: Map<string, PatternInfo>): string[] {
    return [
      '日本語文書では「・」を使用してください',
      'Markdown文書では「-」または「*」で統一してください'
    ];
  }

  /**
   * Get rule code
   */
  protected getRuleCode(): AdvancedGrammarErrorType {
    return 'bullet-style-mix';
  }

  /**
   * Get config key for this rule
   */
  protected getConfigKey(): keyof AdvancedRulesConfig {
    return 'enableBulletStyleMix';
  }
}

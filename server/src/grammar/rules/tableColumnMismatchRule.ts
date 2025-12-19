/**
 * Table Column Mismatch Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 13 - Detect column count mismatches in Markdown tables
 *
 * Detects when table rows have different column counts
 */

import { Token } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import {
  findMarkdownPipeTables,
  isMarkdownPipeTableSeparatorLine,
  splitMarkdownPipeTableRowCells,
  stripMarkdownBlockquotePrefix
} from '../../../../shared/src/markdownSyntax';

/**
 * Table information
 */
interface TableInfo {
  startLine: number;
  lines: string[];
  headerColumns: number;
}

/**
 * Table Column Mismatch Detection Rule
 * テーブル列数の不一致を検出する
 */
export class TableColumnMismatchRule implements AdvancedGrammarRule {
  name = 'table-column-mismatch';
  description = 'Markdownテーブルの列数不一致を検出します';

  /**
   * Check for table column mismatches
   */
  check(tokens: Token[], context: RuleContext): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const tables = this.findTables(context.documentText);

    for (const table of tables) {
      const tableDiagnostics = this.checkTable(table, context.documentText);
      diagnostics.push(...tableDiagnostics);
    }

    // EVALS 表などで「テーブル例」をセル内に `\\|` でエスケープして載せるケースを補足する
    diagnostics.push(...this.checkInlineEscapedTableExamples(context.documentText));

    return diagnostics;
  }

  private checkInlineEscapedTableExamples(text: string): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const lines = text.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      if (!line.includes('\\|') || !line.includes('-')) {
        continue;
      }

      const { strippedLine, strippedLength } = stripMarkdownBlockquotePrefix(line);
      const leadingWhitespace = strippedLine.length - strippedLine.trimStart().length;
      const tableLine = strippedLine.slice(leadingWhitespace);
      if (!tableLine.startsWith('|')) {
        continue;
      }

      const cells = splitMarkdownPipeTableRowCells(tableLine);
      for (const cell of cells) {
        const raw = cell.raw;
        if (!raw.includes('\\|')) {
          continue;
        }

        const reconstructed = this.reconstructInlineTable(raw);
        if (!reconstructed) {
          continue;
        }

        const mismatch = this.detectFirstColumnMismatch(reconstructed);
        if (!mismatch) {
          continue;
        }

        const cellStartChar = strippedLength + leadingWhitespace + cell.start;
        const cellEndChar = strippedLength + leadingWhitespace + cell.end;

        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: lineIndex, character: Math.min(cellStartChar, line.length) },
            end: { line: lineIndex, character: Math.min(cellEndChar, line.length) }
          },
          message: mismatch.isSeparator
            ? `テーブルの区切り行の列数が一致しません。ヘッダーは${mismatch.expected}列ですが、区切り行は${mismatch.actual}列です。`
            : `テーブルの列数が一致しません。ヘッダーは${mismatch.expected}列ですが、この行は${mismatch.actual}列です。`,
          code: 'table-column-mismatch',
          ruleName: this.name,
          suggestions: [`${mismatch.expected}列に修正してください`]
        }));
      }
    }

    return diagnostics;
  }

  private reconstructInlineTable(rawCell: string): string[] | null {
    // `\|` を `|` として復元し、`|<ws>|` を行境界（改行）として扱う。
    // NOTE: 空セルを含む複雑な表には対応しない（EVALS 表の圧縮例文向け）
    const unescaped = rawCell.replace(/\\\|/g, '|').trim();
    if (!unescaped.startsWith('|') || !unescaped.includes('|')) {
      return null;
    }

    const withNewlines = unescaped.replace(/\|\s+\|/g, '|\n|');
    const lines = withNewlines
      .split('\n')
      .map((l) => l.trimEnd())
      .filter((l) => l.trim().startsWith('|'));

    if (lines.length < 2) {
      return null;
    }

    // 区切り行が含まれていない場合は「テーブル例」ではない可能性が高い
    if (!lines.some((l) => isMarkdownPipeTableSeparatorLine(l))) {
      return null;
    }

    return lines;
  }

  private detectFirstColumnMismatch(lines: string[]): { expected: number; actual: number; isSeparator: boolean } | null {
    const headerLine = lines[0] ?? '';
    const expected = this.countColumns(headerLine);
    if (expected <= 0) {
      return null;
    }

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] ?? '';
      const actual = this.countColumns(line);
      if (actual <= 0) {
        continue;
      }
      if (actual !== expected) {
        return { expected, actual, isSeparator: isMarkdownPipeTableSeparatorLine(line) };
      }
    }

    return null;
  }

  /**
   * Find all tables in the document
   */
  private findTables(text: string): TableInfo[] {
    const tables: TableInfo[] = [];
    const blocks = findMarkdownPipeTables(text);

    for (const block of blocks) {
      const headerLine = block.lines[0] ?? '';
      const { strippedLine: normalizedHeader } = stripMarkdownBlockquotePrefix(headerLine);
      tables.push({
        startLine: block.startLine,
        lines: block.lines,
        headerColumns: this.countColumns(normalizedHeader)
      });
    }

    return tables;
  }

  /**
   * Count columns in a table row
   */
  private countColumns(line: string): number {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return 0;
    }

    // 先頭/末尾の区切りパイプは除外してカウント（Markdownの一般的な表記）
    let start = 0;
    let end = trimmed.length;
    if (trimmed.startsWith('|')) {
      start = 1;
    }
    if (end > start && trimmed.endsWith('|')) {
      end -= 1;
    }

    // `\|` はセル内のリテラルとして扱い、列区切りとして数えない
    let columns = 1;
    let escaped = false;
    for (let i = start; i < end; i++) {
      const ch = trimmed[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '|') {
        columns++;
      }
    }

    return columns;
  }

  /**
   * Check a single table for column mismatches
   */
  private checkTable(table: TableInfo, fullText: string): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const expectedColumns = table.headerColumns;

    for (let i = 0; i < table.lines.length; i++) {
      const line = table.lines[i];
      const { strippedLine: normalizedLine } = stripMarkdownBlockquotePrefix(line);
      const lineIndex = table.startLine + i;

      // Skip separator row check for now (it uses different counting)
      const isSeparator = isMarkdownPipeTableSeparatorLine(line);
      const actualColumns = this.countColumns(normalizedLine);

      if (!isSeparator && actualColumns !== expectedColumns) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          },
          message: `テーブルの列数が一致しません。ヘッダーは${expectedColumns}列ですが、この行は${actualColumns}列です。`,
          code: 'table-column-mismatch',
          ruleName: this.name,
          suggestions: [`${expectedColumns}列に修正してください`]
        }));
      } else if (isSeparator && actualColumns !== expectedColumns) {
        diagnostics.push(new AdvancedDiagnostic({
          range: {
            start: { line: lineIndex, character: 0 },
            end: { line: lineIndex, character: line.length }
          },
          message: `テーブルの区切り行の列数が一致しません。ヘッダーは${expectedColumns}列ですが、区切り行は${actualColumns}列です。`,
          code: 'table-column-mismatch',
          ruleName: this.name,
          suggestions: [`区切り行を${expectedColumns}列に修正してください（例: ${'|---'.repeat(expectedColumns)}|）`]
        }));
      }
    }

    return diagnostics;
  }

  /**
   * Check if this rule is enabled
   */
  isEnabled(config: AdvancedRulesConfig): boolean {
    return config.enableTableColumnMismatch;
  }
}

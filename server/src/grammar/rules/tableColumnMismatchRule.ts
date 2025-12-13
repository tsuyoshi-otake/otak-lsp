/**
 * Table Column Mismatch Rule
 * Feature: evals-ng-pattern-expansion
 * Task: 13 - Detect column count mismatches in Markdown tables
 *
 * Detects when table rows have different column counts
 */

import { Token, Range } from '../../../../shared/src/types';
import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  RuleContext,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';

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

    return diagnostics;
  }

  /**
   * Find all tables in the document
   */
  private findTables(text: string): TableInfo[] {
    const tables: TableInfo[] = [];
    const lines = text.split('\n');

    let currentTable: TableInfo | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isTableRow = line.trim().startsWith('|');

      if (isTableRow) {
        if (!currentTable) {
          currentTable = {
            startLine: i,
            lines: [line],
            headerColumns: this.countColumns(line)
          };
        } else {
          currentTable.lines.push(line);
        }
      } else if (currentTable) {
        // End of table
        if (currentTable.lines.length >= 2) {
          tables.push(currentTable);
        }
        currentTable = null;
      }
    }

    // Handle table at end of document
    if (currentTable && currentTable.lines.length >= 2) {
      tables.push(currentTable);
    }

    return tables;
  }

  /**
   * Count columns in a table row
   */
  private countColumns(line: string): number {
    // Remove leading/trailing pipes and split
    const trimmed = line.trim();
    const withoutEdges = trimmed.replace(/^\||\|$/g, '');
    return withoutEdges.split('|').length;
  }

  /**
   * Check a single table for column mismatches
   */
  private checkTable(table: TableInfo, fullText: string): AdvancedDiagnostic[] {
    const diagnostics: AdvancedDiagnostic[] = [];
    const expectedColumns = table.headerColumns;

    for (let i = 0; i < table.lines.length; i++) {
      const line = table.lines[i];
      const lineIndex = table.startLine + i;

      // Skip separator row check for now (it uses different counting)
      const isSeparator = /^\|[\s\-:|]+\|?$/.test(line.trim());
      const actualColumns = this.countColumns(line);

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

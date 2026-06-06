/**
 * Markdown Syntax Helpers
 *
 * サーバ/共有で共通利用する Markdown の簡易判定ユーティリティ。
 * - blockquote（>）プレフィックスの扱い
 * - 先頭 `|` 形式の GFM テーブル検出
 *
 * NOTE:
 * - 完全な CommonMark/GFM パーサではなく、LSP の除外/ルール用途のための軽量実装。
 * - ここで定義した判定を MarkdownFilter / ルール側で共有し、検出ロジックの不一致を防ぐ。
 */

export interface BlockquoteStripResult {
  strippedLine: string;
  depth: number;
  strippedLength: number;
}

/**
 * 行頭の blockquote プレフィックス（>）を剥がす。
 * - CommonMark: ">" の直後の 1 空白は無視される
 * - 先頭の空白は、次の ">" が続かない場合は本文インデントとして保持する
 */
export function stripMarkdownBlockquotePrefix(
  line: string,
  maxDepth: number = Number.POSITIVE_INFINITY
): BlockquoteStripResult {
  let index = 0;
  let depth = 0;

  while (depth < maxDepth) {
    const whitespaceStart = index;
    while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
      index++;
    }

    if (index < line.length && line[index] === '>') {
      depth++;
      index++;
      if (index < line.length && line[index] === ' ') {
        index++;
      }
      continue;
    }

    index = whitespaceStart;
    break;
  }

  return { strippedLine: line.substring(index), depth, strippedLength: index };
}

/**
 * 先頭 `|` 形式の Markdown テーブル行かどうか（候補）。
 * - blockquote（>）は無視する
 * - 末尾の `|` は任意（`| A | B` や `| A` を許容）
 */
export function isMarkdownPipeTableLine(line: string): boolean {
  const { strippedLine } = stripMarkdownBlockquotePrefix(line);
  const trimmed = strippedLine.trim();
  return trimmed.startsWith('|');
}

/**
 * 先頭 `|` 形式のテーブル区切り行かどうか。
 * 例: `|---|---|`, `|:---|---:|`, `|---`（末尾 `|` 省略も許容）
 */
export function isMarkdownPipeTableSeparatorLine(line: string): boolean {
  const { strippedLine } = stripMarkdownBlockquotePrefix(line);
  const trimmed = strippedLine.trim();
  if (!trimmed.startsWith('|')) {
    return false;
  }
  const compact = trimmed.replace(/\s+/g, '');
  return /^\|[-:|]+\|?$/.test(compact);
}

export interface MarkdownPipeTableBlock {
  startLine: number;
  endLineExclusive: number;
  lines: string[];
}

export interface MarkdownPipeTableCell {
  /**
   * セルの生文字列（`|` 区切りの間）。前後の空白は含む。
   * 例: ` A `, ` PASS `, ` \\| A \\| B \\| `
   */
  raw: string;
  /** 元の行（引数 line）に対する開始インデックス（0-based, `|` の直後） */
  start: number;
  /** 元の行（引数 line）に対する終了インデックス（0-based, `|` の直前 / 末尾） */
  end: number;
}

/**
 * 先頭 `|` 形式のテーブル行をセルに分割する。
 * - `\\|` のようなエスケープされた `|` はセル区切りとみなさない
 * - 行頭の空白は許容する（`  | A |`）
 * - 末尾 `|` がない場合でも最後のセルを返す
 */
export function splitMarkdownPipeTableRowCells(line: string): MarkdownPipeTableCell[] {
  const cells: MarkdownPipeTableCell[] = [];
  if (!line) {
    return cells;
  }

  let index = 0;
  while (index < line.length && (line[index] === ' ' || line[index] === '\t')) {
    index++;
  }

  if (index >= line.length || line[index] !== '|') {
    return cells;
  }

  let cellStart = index + 1;
  let escaped = false;

  for (let i = cellStart; i < line.length; i++) {
    const ch = line[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '|') {
      cells.push({ raw: line.slice(cellStart, i), start: cellStart, end: i });
      cellStart = i + 1;
    }
  }

  if (cellStart <= line.length) {
    cells.push({ raw: line.slice(cellStart), start: cellStart, end: line.length });
  }

  return cells;
}

/**
 * 先頭 `|` 形式のテーブルブロック（候補）を抽出する。
 * - blockquote を剥がしたうえで行頭が `|` の連続行を 1 ブロックとして扱う
 * - 区切り行（`|---` 等）が存在しない「未完成テーブル」も候補として含める
 *
 * NOTE:
 * - 文法チェック/ハイライトのノイズ低減を優先し、テーブル判定は保守的に「行頭 `|`」を条件にする
 * - 厳密なテーブル（ヘッダー+区切り行）の判定が必要な場合は `isMarkdownPipeTableSeparatorLine` 等を併用する
 */
export function findMarkdownPipeTables(text: string, precomputedLines?: string[]): MarkdownPipeTableBlock[] {
  // 呼び出し側で既に text.split('\n') 済みなら使い回して O(N) 重複を回避する
  const lines = precomputedLines ?? text.split('\n');
  const tables: MarkdownPipeTableBlock[] = [];

  let currentStart: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    if (isMarkdownPipeTableLine(lines[i])) {
      if (currentStart === null) {
        currentStart = i;
      }
      continue;
    }

    if (currentStart !== null) {
      tables.push({
        startLine: currentStart,
        endLineExclusive: i,
        lines: lines.slice(currentStart, i)
      });
      currentStart = null;
    }
  }

  if (currentStart !== null) {
    tables.push({
      startLine: currentStart,
      endLineExclusive: lines.length,
      lines: lines.slice(currentStart)
    });
  }

  return tables;
}

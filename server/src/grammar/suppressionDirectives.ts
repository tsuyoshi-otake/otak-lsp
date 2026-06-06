/**
 * インライン抑制ディレクティブ
 *
 * 文書中のコメントに書いた指示で、特定行・特定ルールの診断を抑制する。
 * Markdown の HTML コメント・各言語のコメントいずれの中に書いてもよい
 * （生テキストを行単位で走査し、コメント構文には依存しない）。
 *
 * 対応するディレクティブ:
 *   otak-lsp-disable-next-line [code ...]   次の行の診断を抑制
 *   otak-lsp-disable-line      [code ...]   同じ行の診断を抑制
 *   otak-lsp-disable           [code ...]   この行以降の診断を抑制（enable まで）
 *   otak-lsp-enable            [code ...]   抑制を解除
 *
 * code（診断コード / ルールID。例: noun-chain, term-notation）は省略可能で、
 * 省略時はそのスコープの全ルールを抑制する。複数指定はスペース/カンマ区切り。
 * code 列の後ろに ` -- 理由` のような説明を書いてもよい（最初の非コードトークンで打ち切る）。
 *
 * 例:
 *   <!-- otak-lsp-disable-next-line orthography-variant -- 法令用語の引用 -->
 *   // otak-lsp-disable-line term-notation
 */

export type DirectiveKind = 'disable-next-line' | 'disable-line' | 'disable' | 'enable';

/** 抑制判定器 */
export interface SuppressionScan {
  /** 1件でもディレクティブが存在したか（存在しなければフィルタを丸ごとスキップできる） */
  readonly hasDirectives: boolean;
  /** 指定行(0始まり)・コードの診断が抑制対象か */
  isSuppressed(line: number, code: string): boolean;
}

interface BlockRange {
  start: number;
  /** 排他的上限（この行は含まない） */
  end: number;
  /** null = 全コード */
  codes: Set<string> | null;
}

// コードらしいトークン（kebab-case 小文字）。これに合致する先頭トークン列をコードとみなす。
const CODE_TOKEN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
// ディレクティブ本体。長いキーワードを先に並べる（leftmost-longest 相当）。
// 末尾アンカー($)は付けない（. は \r を含まないため CRLF 行で末尾一致に失敗する）。
const DIRECTIVE_RE = /otak-lsp-(disable-next-line|disable-line|disable|enable)\b(.*)/;

/**
 * ディレクティブ行の残り（キーワード以降）からコード列を抽出する。
 * コメント閉じ記号（--> / ​*​/）は除去し、最初の非コードトークンで打ち切る。
 */
function parseCodes(rest: string): string[] {
  const cleaned = rest.replace(/--+>/g, ' ').replace(/\*\//g, ' ').trim();
  if (!cleaned) return [];
  const tokens = cleaned.split(/[\s,]+/).filter(Boolean);
  const codes: string[] = [];
  for (const token of tokens) {
    if (CODE_TOKEN.test(token)) {
      codes.push(token);
    } else {
      break; // 理由テキストなどに到達したら打ち切る
    }
  }
  return codes;
}

/**
 * 生テキストから抑制ディレクティブを走査する。
 */
export function parseSuppressionDirectives(text: string): SuppressionScan {
  // 高速パス: ディレクティブの痕跡が無ければ何もしない
  if (!text.includes('otak-lsp-disable') && !text.includes('otak-lsp-enable')) {
    return { hasDirectives: false, isSuppressed: () => false };
  }

  const lines = text.split('\n');
  const lineAll = new Set<number>();
  const lineCodes = new Map<number, Set<string>>();
  const blocks: BlockRange[] = [];

  let allBlockStart = -1;
  const codeBlockStart = new Map<string, number>();
  let hasDirectives = false;

  const addLineSuppress = (target: number, codes: string[]) => {
    if (target < 0) return;
    if (codes.length === 0) {
      lineAll.add(target);
    } else {
      const set = lineCodes.get(target) ?? new Set<string>();
      for (const c of codes) set.add(c);
      lineCodes.set(target, set);
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(DIRECTIVE_RE);
    if (!match) continue;
    hasDirectives = true;
    const kind = match[1] as DirectiveKind;
    const codes = parseCodes(match[2] ?? '');

    switch (kind) {
      case 'disable-next-line':
        addLineSuppress(i + 1, codes);
        break;
      case 'disable-line':
        addLineSuppress(i, codes);
        break;
      case 'disable':
        if (codes.length === 0) {
          if (allBlockStart < 0) allBlockStart = i;
        } else {
          for (const c of codes) {
            if (!codeBlockStart.has(c)) codeBlockStart.set(c, i);
          }
        }
        break;
      case 'enable':
        if (codes.length === 0) {
          // 全解除
          if (allBlockStart >= 0) {
            blocks.push({ start: allBlockStart, end: i + 1, codes: null });
            allBlockStart = -1;
          }
          for (const [c, st] of codeBlockStart) {
            blocks.push({ start: st, end: i + 1, codes: new Set([c]) });
          }
          codeBlockStart.clear();
        } else {
          for (const c of codes) {
            const st = codeBlockStart.get(c);
            if (st !== undefined) {
              blocks.push({ start: st, end: i + 1, codes: new Set([c]) });
              codeBlockStart.delete(c);
            }
          }
        }
        break;
    }
  }

  // 未終了の disable ブロックは文末まで適用
  if (allBlockStart >= 0) {
    blocks.push({ start: allBlockStart, end: lines.length, codes: null });
  }
  for (const [c, st] of codeBlockStart) {
    blocks.push({ start: st, end: lines.length, codes: new Set([c]) });
  }

  return {
    hasDirectives,
    isSuppressed(line: number, code: string): boolean {
      if (lineAll.has(line)) return true;
      const codes = lineCodes.get(line);
      if (codes && codes.has(code)) return true;
      for (const block of blocks) {
        if (line >= block.start && line < block.end && (block.codes === null || block.codes.has(code))) {
          return true;
        }
      }
      return false;
    },
  };
}

/**
 * 抑制スキャンを診断列に適用する。
 * code を持たない診断は行レベル（全コード抑制）のみ対象。
 */
export function applySuppressions<T extends { range: { start: { line: number } }; code?: string | number }>(
  diagnostics: T[],
  scan: SuppressionScan
): T[] {
  if (!scan.hasDirectives) return diagnostics;
  return diagnostics.filter((diag) => {
    const code = diag.code === undefined ? '' : String(diag.code);
    return !scan.isSuppressed(diag.range.start.line, code);
  });
}

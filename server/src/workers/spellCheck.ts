import nspell from 'nspell';
import { aff, dic } from 'otak-english-dictionary';
import { Diagnostic, DiagnosticSeverity } from '../../../shared/src/types';
import { TERM_NOTATION_DICTIONARIES } from '../dictionaries/termNotationDictionary';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';

// 表記辞書の正規表記だけを使う。大文字小文字以外の違いを含む誤表記は除く。
const notationEntries = Object.values(TERM_NOTATION_DICTIONARIES).flat();
const incorrectTerms = new Set(notationEntries
  .filter(([incorrect, correct]) => incorrect.toLowerCase() !== correct.toLowerCase())
  .map(([incorrect]) => incorrect.toLowerCase()));
const canonicalTerms = new Set(notationEntries
  .map(([, correct]) => correct.toLowerCase())
  .filter(correct => /^[a-z]{3,}$/.test(correct) && !incorrectTerms.has(correct)));

export interface SpellWorkerRequest {
  kind: 'spell';
  text: string;
  words: string[];
  maxDiagnostics: number;
  checkRepeat?: boolean;
  checkUppercase?: boolean;
  checkAllCaps?: boolean;
  excludedRanges: Array<{ start: number; end: number }>;
}

export interface SpellWorkerResult {
  diagnostics: Diagnostic[];
  truncated: boolean;
}

// 一般的なファイル拡張子とドットファイル。未知の拡張子は文章との区別がつかないため扱わない。
const FILE_EXTENSIONS = new Set([
  'js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'json', 'jsonc', 'yaml', 'yml', 'toml', 'xml',
  'html', 'htm', 'css', 'scss', 'md', 'mdx', 'txt', 'rst', 'csv', 'tsv', 'log', 'pdf',
  'py', 'rs', 'go', 'java', 'sh', 'bat', 'cmd', 'ps1', 'c', 'h', 'cpp', 'hpp', 'sql',
  'gz', 'zip', 'tar', 'svg', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'ini', 'conf', 'lock',
]);
const DOTFILES = new Set(['.env', '.gitignore', '.gitattributes', '.gitmodules', '.editorconfig', '.npmrc', '.eslintrc', '.prettierrc']);

function isKnownFilePath(candidate: string): boolean {
  const lastSeparator = Math.max(candidate.lastIndexOf('/'), candidate.lastIndexOf('\\'));
  const name = candidate.slice(lastSeparator + 1).toLowerCase();
  if (DOTFILES.has(name) || /^\.env\.[a-z0-9_-]+$/.test(name)) return true;
  const dot = name.lastIndexOf('.');
  return dot > 0 && FILE_EXTENSIONS.has(name.slice(dot + 1));
}

function isAsciiLetter(code: number): boolean {
  return (code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A);
}

function isAsciiDigit(code: number): boolean {
  return code >= 0x30 && code <= 0x39;
}

/** 既存のASCIIメールパターンを、@を境界に各部分を一度ずつ走査して検出する。 */
function findEmailRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let at = text.indexOf('@'); at !== -1; at = text.indexOf('@', at + 1)) {
    let start = at;
    while (start > 0) {
      const code = text.charCodeAt(start - 1);
      if (!isAsciiLetter(code) && !isAsciiDigit(code) && !'._%+-'.includes(text[start - 1])) break;
      start--;
    }
    if (start === at) continue;
    let cursor = at + 1;
    let suffixEnd = -1;
    while (cursor < text.length) {
      const code = text.charCodeAt(cursor);
      if (!isAsciiLetter(code) && !isAsciiDigit(code) && code !== 0x2E && code !== 0x2D) break;
      if (code === 0x2E && cursor > at + 1) {
        let end = cursor + 1;
        while (end < text.length && isAsciiLetter(text.charCodeAt(end))) end++;
        if (end - cursor - 1 >= 2) suffixEnd = end;
        cursor = end;
      } else {
        cursor++;
      }
    }
    if (suffixEnd !== -1) ranges.push({ start, end: suffixEnd });
  }
  return ranges;
}

/** 各要求に独立した辞書を作る。検査と候補生成は呼出側のWorker期限に従う。 */
export function checkSpelling(request: SpellWorkerRequest): SpellWorkerResult {
  const checker = nspell({ aff, dic });
  for (const word of request.words) checker.add(word);
  const ranges = request.excludedRanges.slice();
  for (const match of request.text.matchAll(/https?:\/\/[^\s<>()]+/g)) {
    ranges.push({ start: match.index!, end: match.index! + match[0].length });
  }
  for (const range of findEmailRanges(request.text)) ranges.push(range);
  for (const match of request.text.matchAll(/[A-Za-z0-9_~.-]+(?:[\\/][A-Za-z0-9_~.-]+)*/g)) {
    let length = match[0].length;
    while (length > 0 && match[0][length - 1] === '.') length--;
    const candidate = match[0].slice(0, length);
    if (candidate && isKnownFilePath(candidate)) ranges.push({ start: match.index!, end: match.index! + candidate.length });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  const lineStarts = computeLineStarts(request.text);
  const cache = new Map<string, string[] | null>();
  const diagnostics: Diagnostic[] = [];
  let rangeIndex = 0;
  let previous: { word: string; end: number } | undefined;
  const overlapsExcluded = (start: number, end: number): boolean => {
    let low = 0;
    let high = merged.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (merged[mid].end <= start) low = mid + 1;
      else high = mid;
    }
    return low < merged.length && merged[low].start < end;
  };
  for (const match of request.text.matchAll(/[A-Za-z]{2,}/g)) {
    const start = match.index!;
    const end = start + match[0].length;
    while (rangeIndex < merged.length && merged[rangeIndex].end <= start) rangeIndex++;
    if (rangeIndex < merged.length && merged[rangeIndex].start < end) continue;
    // 数字・識別子・英語の短縮形の一部分を単語として扱わない。
    if (/[A-Za-z0-9_'’\-]/.test(request.text[start - 1] ?? '') || /[A-Za-z0-9_'’\-]/.test(request.text[end] ?? '')) continue;
    if (request.checkRepeat && previous && previous.word.toLowerCase() === match[0].toLowerCase() &&
        /^[ \t]+$/.test(request.text.slice(previous.end, start)) && !overlapsExcluded(previous.end, start)) {
      if (diagnostics.length >= request.maxDiagnostics) return { diagnostics, truncated: true };
      diagnostics.push({
        range: { start: offsetToLineAndCharacter(lineStarts, start), end: offsetToLineAndCharacter(lineStarts, end) },
        message: `英単語「${match[0]}」が続けて使われています。`,
        severity: DiagnosticSeverity.Information,
        code: 'spell-repeat',
        source: 'otak-lsp-proofreading',
      });
    }
    previous = { word: match[0], end };
    const word = match[0];
    if (!/^[a-z]{3,}$/.test(word) &&
        !(request.checkUppercase && /^[A-Z][a-z]{2,}$/.test(word)) &&
        !(request.checkAllCaps && /^[A-Z]{3,}$/.test(word))) continue;
    let suggestions = cache.get(match[0]);
    if (suggestions === undefined) {
      suggestions = canonicalTerms.has(word.toLowerCase()) || checker.correct(word) ? null : word.length <= 24 ? checker.suggest(word).slice(0, 3) : [];
      cache.set(match[0], suggestions);
    }
    if (suggestions === null) continue;
    if (diagnostics.length >= request.maxDiagnostics) return { diagnostics, truncated: true };
    diagnostics.push({
      range: { start: offsetToLineAndCharacter(lineStarts, start), end: offsetToLineAndCharacter(lineStarts, end) },
      message: `英語辞書に「${match[0]}」がありません。`,
      severity: DiagnosticSeverity.Information,
      code: 'spell-unknown-word',
      source: 'otak-lsp-proofreading',
      suggestions,
    });
  }
  return { diagnostics, truncated: false };
}

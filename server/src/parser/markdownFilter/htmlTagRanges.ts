import { ExcludedRange } from '../../../../shared/src/markdownFilterTypes';
import { normalizeRanges } from '../../utils/rangeSweep';
import { isEscapedAt } from './rangeUtils';

const isNameStart = (ch: string): boolean => /[A-Za-z_:]/.test(ch);
const isNameChar = (ch: string): boolean => /[A-Za-z0-9_.:-]/.test(ch);
const isTagNameChar = (ch: string): boolean => /[A-Za-z0-9-]/.test(ch);
const isSpace = (ch: string): boolean => ch === ' ' || ch === '\t';

/** 単一行の完全なHTMLタグだけを除外する。本文、コード、未完成タグは保持する。 */
export function findHtmlTagRanges(text: string, existingRanges: ExcludedRange[]): ExcludedRange[] {
  const result: ExcludedRange[] = [];
  const code = normalizeRanges(existingRanges.filter(r => r.type === 'code-block' || r.type === 'inline-code'));
  let codeIndex = 0;
  for (let i = 0; i < text.length; i++) {
    while (codeIndex < code.length && code[codeIndex].end <= i) codeIndex++;
    if (codeIndex < code.length && code[codeIndex].start <= i) {
      i = code[codeIndex].end - 1;
      continue;
    }
    if (text[i] !== '<' || isEscapedAt(text, i)) continue;
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      if (end < 0) break;
      i = end + 2;
      continue;
    }

    let p = i + 1;
    const closing = text[p] === '/';
    if (closing) p++;
    if (!/[A-Za-z]/.test(text[p] ?? '')) continue;
    p++;
    while (p < text.length && isTagNameChar(text[p])) p++;
    let valid = false;
    while (p < text.length && text[p] !== '\n' && text[p] !== '\r') {
      if (text[p] === '>') { p++; valid = true; break; }
      if (!closing && text[p] === '/' && text[p + 1] === '>') { p += 2; valid = true; break; }
      if (!isSpace(text[p])) break;
      while (isSpace(text[p])) p++;
      if (text[p] === '>' || (!closing && text[p] === '/' && text[p + 1] === '>')) continue;
      if (closing || !isNameStart(text[p] ?? '')) break;
      p++;
      while (p < text.length && isNameChar(text[p])) p++;
      const afterName = p;
      while (isSpace(text[p])) p++;
      if (text[p] !== '=') { p = afterName; continue; }
      p++;
      while (isSpace(text[p])) p++;
      const quote = text[p] === '"' || text[p] === "'" ? text[p++] : '';
      const valueStart = p;
      while (p < text.length && text[p] !== '\r' && text[p] !== '\n' && text[p] !== '<' &&
        (quote ? text[p] !== quote : !/[\s"'=<>`]/.test(text[p]))) p++;
      if (quote) {
        if (text[p] !== quote) break;
        p++;
      } else if (p === valueStart) break;
    }
    if (valid && (codeIndex >= code.length || code[codeIndex].start >= p)) {
      result.push({ start: i, end: p, type: 'html-tag', content: text.slice(i, p), reason: 'HTMLタグ検出' });
      i = p - 1;
    } else if (p > i + 1) {
      // 不正・未完成入力の繰返しでも、同じ文字列を何度も走査しない。
      i = p - 1;
    }
  }
  return result;
}

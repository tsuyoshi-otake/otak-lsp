/**
 * normalモードで単一改行を文境界として扱うかの判定
 */

import { isBlank } from '../utils/stringUtils';

export function shouldSplitOnNewline(text: string, newlinePos: number): boolean {
  const beforeLine = getLineContent(text, newlinePos, 'before');
  const afterLine = getLineContent(text, newlinePos, 'after');

  if (isBlank(beforeLine) || isBlank(afterLine)) {
    return true;
  }

  if (/^[#\-*+>]/.test(afterLine.trim())) {
    return true;
  }

  if (/[。！？!?]$/.test(beforeLine.trim())) {
    return true;
  }

  if (/[:：]$/.test(beforeLine.trim())) {
    return true;
  }

  const beforeTrimmed = beforeLine.trim();
  if (/[はがをにへとでや、]$/.test(beforeTrimmed)) {
    if (/^[A-Z#\-*]/.test(afterLine.trim())) {
      return true;
    }
    return false;
  }

  return true;
}

function getLineContent(text: string, pos: number, direction: 'before' | 'after'): string {
  if (direction === 'before') {
    let start = pos - 1;
    while (start >= 0 && text[start] !== '\n' && text[start] !== '\r') {
      start--;
    }
    return text.substring(start + 1, pos);
  }

  let start = pos;
  if (text[start] === '\r' && start + 1 < text.length && text[start + 1] === '\n') {
    start++;
  }
  let end = start + 1;
  while (end < text.length && text[end] !== '\n' && text[end] !== '\r') {
    end++;
  }
  return text.substring(start + 1, end);
}

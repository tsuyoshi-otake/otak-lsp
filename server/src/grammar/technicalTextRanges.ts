/** HTMLタグや属性は本文の表記統一で書き換えない。位置は元テキストのオフセット。 */
export function findHtmlTagRanges(text: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  let cursor = 0;
  while (cursor < text.length) {
    const start = text.indexOf('<', cursor);
    if (start < 0) break;
    if (text.startsWith('<!--', start)) {
      const end = text.indexOf('-->', start + 4);
      if (end < 0) break;
      ranges.push({ start, end: end + 3 });
      cursor = end + 3;
      continue;
    }
    let i = start + 1;
    if (text[i] === '/') i++;
    if (!/[A-Za-z]/.test(text[i] ?? '')) { cursor = start + 1; continue; }
    while (i < text.length && /[A-Za-z0-9_:-]/.test(text[i])) i++;
    if (!/[\s/>]/.test(text[i] ?? '')) { cursor = i; continue; }
    let quote = '';
    while (i < text.length) {
      const char = text[i];
      if (quote) {
        if (char === quote) quote = '';
      } else if (char === '"' || char === "'") quote = char;
      else if (char === '>') break;
      else if (char === '<') break;
      i++;
    }
    if (text[i] === '>') {
      ranges.push({ start, end: i + 1 });
      cursor = i + 1;
    } else {
      cursor = i < text.length ? i : text.length;
    }
  }
  return ranges;
}

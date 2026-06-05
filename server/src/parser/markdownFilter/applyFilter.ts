import { ExcludedRange, FilterConfig } from '../../../../shared/src/markdownFilterTypes';
import { isBlank } from '../../utils/stringUtils';

const JAPANESE_CHAR_REGEX =
  /[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF\uFF65-\uFF9F]/;

/**
 * テキストに日本語文字が含まれているかを判定する。
 */
function containsJapanese(text: string): boolean {
  return JAPANESE_CHAR_REGEX.test(text);
}

/**
 * 位置（オフセット）と行構造を保持して、除外対象をスペース化する。
 */
function maskPreservingNewlines(segment: string): string {
  return segment.replace(/[^\r\n]/g, ' ');
}

/**
 * コードフェンス開始行の言語指定だけを無害化する。
 */
function sanitizeCodeFenceLanguageSpecLine(line: string): string {
  const lineForMatch = line.endsWith('\r') ? line.slice(0, -1) : line;
  const match = lineForMatch.match(/^(\s*(?:>\s*)*)(`{3,}|~{3,})(.*)$/);
  if (!match) {
    return line;
  }

  const prefixLength = match[1].length + match[2].length;
  const rest = match[3];
  if (isBlank(rest)) {
    return line;
  }

  if (prefixLength >= line.length) {
    return line;
  }

  const before = line.slice(0, prefixLength);
  const after = line.slice(prefixLength);
  return before + after.replace(/[^\t \r]/g, 'x');
}

/**
 * コードブロックのマスク規則を適用する。
 */
function transformCodeBlockSegment(segment: string, config: FilterConfig): string {
  const firstNewlineIndex = segment.indexOf('\n');
  if (firstNewlineIndex === -1) {
    // 単一行の ```code``` 形式は（後方互換のため）code-block として除外するが、
    // 構文記号（```）自体は Markdown構造ルールが参照できるよう保持する。
    // - テーブル内の evals 例などで ` ``` const x = 1; ``` ` を載せた場合に、
    //   すべてをスペース化すると構造ルール側で検出できなくなる。
    const lineForMatch = segment.endsWith('\r') ? segment.slice(0, -1) : segment;
    const inlineFence = lineForMatch.match(/^(\s*(?:>\s*)*)(`{3,}|~{3,}).*?\2\s*$/);
    if (!inlineFence) {
      return maskPreservingNewlines(segment);
    }

    const fence = inlineFence[2];
    const closingIndex = segment.lastIndexOf(fence);
    if (closingIndex < 0) {
      return maskPreservingNewlines(segment);
    }

    const openingIndex = segment.indexOf(fence);
    const contentStart = openingIndex + fence.length;
    const contentEnd = closingIndex;
    if (contentEnd <= contentStart) {
      return segment;
    }

    const before = segment.slice(0, contentStart);
    const inner = segment.slice(contentStart, contentEnd);
    const after = segment.slice(contentEnd);
    return before + inner.replace(/[^\r\n]/g, ' ') + after;
  }

  const openingLine = segment.slice(0, firstNewlineIndex);
  const sanitizedOpening = sanitizeCodeFenceLanguageSpecLine(openingLine);

  // 日本語を含まないコードブロックは preserveCodeBlockContent に関係なくマスクする
  const lastNewlineIndex = segment.lastIndexOf('\n');
  if (lastNewlineIndex === firstNewlineIndex) {
    return sanitizedOpening + segment.slice(firstNewlineIndex);
  }

  const contentRegion = segment.slice(firstNewlineIndex + 1, lastNewlineIndex + 1);
  const hasJapanese = containsJapanese(contentRegion);

  if (config.preserveCodeBlockContent && hasJapanese) {
    return sanitizedOpening + segment.slice(firstNewlineIndex);
  }

  const maskedContent = maskPreservingNewlines(contentRegion);
  return sanitizedOpening + '\n' + maskedContent + segment.slice(lastNewlineIndex + 1);
}

/**
 * フィルタリングを適用してテキストを生成する。
 */
export function applyMarkdownFilter(text: string, ranges: ExcludedRange[], config: FilterConfig): string {
  if (ranges.length === 0) {
    return text;
  }

  // NOTE:
  // - 位置（オフセット）だけでなく行構造も保持するため、\n/\r は置換しない
  // - Markdown構造ルール（見出し/箇条書き/テーブル/コードブロック等）が参照できるよう、
  //   一部の構文記号は保持する（トークン側は TokenFilter で除外する）
  const parts: string[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start >= range.end) {
      continue;
    }

    // table 全体は文法チェック用の除外情報として保持しつつ、
    // セマンティックハイライトのために内容は残す
    if (range.type === 'table') {
      continue;
    }

    // Markdown構造を維持したい要素は置換しない（TokenFilterでトークン側を除外する）
    if (
      range.type === 'heading' ||
      range.type === 'list-marker' ||
      range.type === 'emphasis-marker' ||
      range.type === 'link-marker' ||
      range.type === 'table-delimiter' ||
      range.type === 'table-separator'
    ) {
      continue;
    }

    const safeStart = Math.max(0, Math.min(range.start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(range.end, text.length));

    if (safeEnd <= cursor) {
      continue;
    }

    const start = Math.max(cursor, safeStart);

    if (cursor < start) {
      parts.push(text.slice(cursor, start));
    }

    const segment = text.slice(start, safeEnd);
    if (range.type === 'code-block' && start === safeStart) {
      parts.push(transformCodeBlockSegment(segment, config));
    } else {
      parts.push(maskPreservingNewlines(segment));
    }

    cursor = safeEnd;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.join('');
}

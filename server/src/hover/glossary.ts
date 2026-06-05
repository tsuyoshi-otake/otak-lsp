/**
 * 用語図鑑（オフライン）
 * HoverのWikipediaサマリーの下に表示するための簡易辞書
 * 
 * このファイルは検索・マッチング関数と公開クエリ関数を提供します。
 * 型定義、ユーティリティ関数、データ定義は別ファイルに分割されています。
 */

import { GlossaryId, GLOSSARY_GROUPS, Token } from '../../../shared/src/types';

// 型定義を再エクスポート
export type { GlossaryHit, GlossaryMatch, GlossaryEntry, GlossaryDefinition } from './glossaryTypes';

// データ定義をインポート
import { DEFAULT_ENABLED_GLOSSARIES, GLOSSARY_INDEX, GLOSSARIES } from './glossaryData';
import { normalizeKey } from './glossaryUtils';

// 正規表現定数
const PHRASE_REGEX = /[A-Za-z][A-Za-z0-9.+#/_:-]*(?:\s+[A-Za-z][A-Za-z0-9.+#/_:-]*){0,5}/g;
const WORD_REGEX = /[A-Za-z0-9.+#/_:-]+/g;
const ASCII_TERM_CHAR_RE = /[A-Za-z0-9.+#/_:-]/;
const CJK_TERM_CHAR_RE = /[ぁ-ゔァ-ヶー一-\u9FAF々・]/;
const MIXED_ASCII_TERM_CHAR_RE = /[A-Za-z0-9.+#/_:@-]/;
const MIXED_CJK_TERM_CHAR_RE = /[\p{Script=Katakana}\p{Script=Han}々ー・]/u;
const TERM_WINDOW_CHAR_RE = /[A-Za-z0-9.+#/_:@\- \tぁ-ゔァ-ヶー一-\u9FAF々・]/u;
const MAX_MATCH_CANDIDATE_LENGTH = 80;

// 型定義をインポート（内部使用）
import type { GlossaryHit } from './glossaryTypes';

/**
 * 候補文字列に対して最適なGlossaryHitを返す（ランク順）
 */
function bestHitForCandidate(candidate: string, rank: ReadonlyMap<GlossaryId, number>): GlossaryHit | null {
  const hits = GLOSSARY_INDEX.get(normalizeKey(candidate));
  if (!hits || hits.length === 0) {
    return null;
  }

  let best: GlossaryHit | null = null;
  let bestRank = Infinity;

  for (const hit of hits) {
    const r = rank.get(hit.id);
    if (r === undefined) {
      continue;
    }
    if (r < bestRank) {
      bestRank = r;
      best = hit;
    }
  }

  return best;
}

/**
 * GLOSSARY_GROUPSのpriority順にランクを付与する
 */
export function createGlossaryRank(enabledGlossaries: ReadonlyArray<GlossaryId>): ReadonlyMap<GlossaryId, number> {
  const enabledSet = new Set(enabledGlossaries);
  const rank = new Map<GlossaryId, number>();

  let priority = 0;
  const groups = [...GLOSSARY_GROUPS].sort((a, b) => a.priority - b.priority);
  for (const group of groups) {
    for (const id of group.members) {
      if (enabledSet.has(id) && !rank.has(id)) {
        rank.set(id, priority);
        priority++;
      }
    }
  }

  // グループ未所属のIDが将来追加された場合も無効化しない。
  for (const id of enabledGlossaries) {
    if (!rank.has(id)) {
      rank.set(id, priority);
      priority++;
    }
  }

  return rank;
}

function trimCandidateRange(text: string, start: number, end: number): { start: number; end: number; value: string } | null {
  let trimmedStart = start;
  let trimmedEnd = end;
  while (trimmedStart < trimmedEnd && /\s/.test(text[trimmedStart])) {
    trimmedStart++;
  }
  while (trimmedEnd > trimmedStart && /\s/.test(text[trimmedEnd - 1])) {
    trimmedEnd--;
  }

  if (trimmedStart >= trimmedEnd) {
    return null;
  }

  return {
    start: trimmedStart,
    end: trimmedEnd,
    value: text.slice(trimmedStart, trimmedEnd)
  };
}

function findBestMatchInWindow(
  text: string,
  offset: number,
  rank: ReadonlyMap<GlossaryId, number>
): { hit: GlossaryHit; range: { start: number; end: number } } | null {
  const ch = text[offset];
  if (!TERM_WINDOW_CHAR_RE.test(ch)) {
    return null;
  }

  let start = offset;
  while (start > 0 && TERM_WINDOW_CHAR_RE.test(text[start - 1])) {
    start--;
  }

  let end = offset + 1;
  while (end < text.length && TERM_WINDOW_CHAR_RE.test(text[end])) {
    end++;
  }

  const windowLength = end - start;
  const maxLen = Math.min(windowLength, MAX_MATCH_CANDIDATE_LENGTH);
  for (let len = maxLen; len >= 2; len--) {
    const minCandidateStart = Math.max(start, offset - len + 1);
    const maxCandidateStart = Math.min(offset, end - len);
    for (let candidateStart = minCandidateStart; candidateStart <= maxCandidateStart; candidateStart++) {
      const candidateEnd = candidateStart + len;
      const candidate = trimCandidateRange(text, candidateStart, candidateEnd);
      if (!candidate || offset < candidate.start || offset >= candidate.end) {
        continue;
      }

      const hit = bestHitForCandidate(candidate.value, rank);
      if (hit) {
        return { hit, range: { start: candidate.start, end: candidate.end } };
      }
    }
  }

  return null;
}

/**
 * トークンから用語図鑑のヒットを検索（ランク付き）
 */
export function findGlossaryHitWithRank(token: Token, rank: ReadonlyMap<GlossaryId, number>): GlossaryHit | null {
  const candidates = [token.baseForm, token.surface].filter((v): v is string => !!v && v !== '*');

  for (const candidate of candidates) {
    const hit = bestHitForCandidate(candidate, rank);
    if (hit) {
      return hit;
    }
  }

  return null;
}

/**
 * テキスト上の位置から前後に拡張して用語候補を抽出
 */
function expandRun(
  text: string,
  offset: number,
  charRe: RegExp
): { start: number; end: number; run: string } | null {
  let start = offset;
  let end = offset;

  while (start > 0 && charRe.test(text[start - 1])) {
    start--;
  }
  while (end < text.length && charRe.test(text[end])) {
    end++;
  }

  if (start === end) {
    return null;
  }

  return { start, end, run: text.slice(start, end) };
}

/**
 * 候補文字列が用語図鑑に存在するかチェック
 */
export function hasGlossaryEntry(candidate: string): boolean {
  return GLOSSARY_INDEX.has(normalizeKey(candidate));
}

/**
 * 用語図鑑の総エントリ数を取得
 */
export function getGlossaryEntryCount(): number {
  return GLOSSARIES.reduce((sum, glossary) => sum + glossary.entries.length, 0);
}

/**
 * 用語図鑑の定義一覧を取得
 */
export function getGlossaryDefinitions(): ReadonlyArray<{
  id: GlossaryId;
  title: string;
  entryCount: number;
}> {
  return GLOSSARIES.map((glossary) => ({
    id: glossary.id,
    title: glossary.title,
    entryCount: glossary.entries.length,
  }));
}

/**
 * テキスト上の位置から用語図鑑のマッチを検索（ランク付き）
 */
export function findGlossaryMatchWithRank(
  text: string,
  offset: number,
  rank: ReadonlyMap<GlossaryId, number>
): { hit: GlossaryHit; range: { start: number; end: number } } | null {
  if (offset < 0 || offset >= text.length) {
    return null;
  }

  const ch = text[offset];

  const windowHit = findBestMatchInWindow(text, offset, rank);
  if (windowHit) {
    return windowHit;
  }

  // ASCII系（英数字・記号）
  if (ASCII_TERM_CHAR_RE.test(ch)) {
    const expanded = expandRun(text, offset, ASCII_TERM_CHAR_RE);
    if (!expanded) {
      return null;
    }

    const { start, end, run } = expanded;

    // フレーズマッチ（複数単語）
    const phraseMatches = run.matchAll(PHRASE_REGEX);
    for (const match of phraseMatches) {
      if (match.index === undefined) {
        continue;
      }
      const phraseStart = start + match.index;
      const phraseEnd = phraseStart + match[0].length;
      if (offset >= phraseStart && offset < phraseEnd) {
        const hit = bestHitForCandidate(match[0], rank);
        if (hit) {
          return { hit, range: { start: phraseStart, end: phraseEnd } };
        }
      }
    }

    // 単語マッチ
    const wordMatches = run.matchAll(WORD_REGEX);
    for (const match of wordMatches) {
      if (match.index === undefined) {
        continue;
      }
      const wordStart = start + match.index;
      const wordEnd = wordStart + match[0].length;
      if (offset >= wordStart && offset < wordEnd) {
        const hit = bestHitForCandidate(match[0], rank);
        if (hit) {
          return { hit, range: { start: wordStart, end: wordEnd } };
        }
      }
    }

    return null;
  }

  // CJK系（日本語）
  if (CJK_TERM_CHAR_RE.test(ch)) {
    const expanded = expandRun(text, offset, CJK_TERM_CHAR_RE);
    if (!expanded) {
      return null;
    }

    const { start, end, run } = expanded;

    // 最長一致を試す
    for (let len = run.length; len >= 2; len--) {
      for (let i = 0; i <= run.length - len; i++) {
        const candidate = run.slice(i, i + len);
        const candidateStart = start + i;
        const candidateEnd = candidateStart + len;
        if (offset >= candidateStart && offset < candidateEnd) {
          const hit = bestHitForCandidate(candidate, rank);
          if (hit) {
            return { hit, range: { start: candidateStart, end: candidateEnd } };
          }
        }
      }
    }

    return null;
  }

  // 混在系（日本語+英数字）
  if (MIXED_ASCII_TERM_CHAR_RE.test(ch) || MIXED_CJK_TERM_CHAR_RE.test(ch)) {
    const mixedRe = new RegExp(
      `(?:${MIXED_ASCII_TERM_CHAR_RE.source}|${MIXED_CJK_TERM_CHAR_RE.source})`
    );
    const expanded = expandRun(text, offset, mixedRe);
    if (!expanded) {
      return null;
    }

    const { start, end, run } = expanded;

    // 最長一致を試す
    for (let len = run.length; len >= 2; len--) {
      for (let i = 0; i <= run.length - len; i++) {
        const candidate = run.slice(i, i + len);
        const candidateStart = start + i;
        const candidateEnd = candidateStart + len;
        if (offset >= candidateStart && offset < candidateEnd) {
          const hit = bestHitForCandidate(candidate, rank);
          if (hit) {
            return { hit, range: { start: candidateStart, end: candidateEnd } };
          }
        }
      }
    }

    return null;
  }

  return null;
}

/**
 * トークンから用語図鑑のヒットを検索（簡易版）
 */
export function findGlossaryHit(token: Token, enabledGlossaries: ReadonlyArray<GlossaryId>): GlossaryHit | null {
  return findGlossaryHitWithRank(token, createGlossaryRank(enabledGlossaries));
}

/**
 * テキスト上の位置から用語図鑑のマッチを検索（簡易版）
 */
export function findGlossaryMatch(
  text: string,
  offset: number,
  enabledGlossaries: ReadonlyArray<GlossaryId>
): { hit: GlossaryHit; range: { start: number; end: number } } | null {
  return findGlossaryMatchWithRank(text, offset, createGlossaryRank(enabledGlossaries));
}

// デフォルト有効用語図鑑をエクスポート
export { DEFAULT_ENABLED_GLOSSARIES };

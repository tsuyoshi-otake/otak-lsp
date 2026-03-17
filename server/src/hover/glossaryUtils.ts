/**
 * 用語図鑑のユーティリティ関数
 */

import { GlossaryEntry } from './glossaryTypes';

/**
 * 空白を正規化（NFKC正規化 + 連続空白を1つに + trim）
 */
export function normalizeWhitespace(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/**
 * 検索キーの正規化（NFKC正規化 + 連続空白を1つに + trim + 小文字化）
 */
export function normalizeKey(input: string): string {
  return input
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * 文字列配列をマージ（重複除去、term自身は除外）
 */
export function mergeStringArrays(
  base: ReadonlyArray<string> | undefined,
  extra: ReadonlyArray<string> | undefined,
  term: string
): string[] | undefined {
  const a = base ?? [];
  const b = extra ?? [];
  if (a.length === 0 && b.length === 0) {
    return undefined;
  }

  const termKey = normalizeKey(term);
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const v of [...a, ...b]) {
    const normalized = normalizeKey(v);
    if (!normalized || normalized === termKey || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(v);
  }

  return merged.length > 0 ? merged : undefined;
}

/**
 * GlossaryEntryの配列をマージ（同一termはマージ、順序は保持）
 */
export function mergeGlossaryEntries(existing: ReadonlyArray<GlossaryEntry>, additions: ReadonlyArray<GlossaryEntry>): GlossaryEntry[] {
  const byKey = new Map<string, GlossaryEntry>();
  const order: string[] = [];

  const put = (entry: GlossaryEntry): void => {
    const key = normalizeKey(entry.term);
    if (!key) {
      return;
    }

    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, { ...entry });
      order.push(key);
      return;
    }

    byKey.set(key, {
      ...current,
      description: current.description || entry.description,
      aliases: mergeStringArrays(current.aliases, entry.aliases, current.term),
      synonyms: mergeStringArrays(current.synonyms, entry.synonyms, current.term),
      antonyms: mergeStringArrays(current.antonyms, entry.antonyms, current.term),
    });
  };

  for (const entry of existing) {
    put(entry);
  }
  for (const entry of additions) {
    put(entry);
  }

  return order.map((k) => byKey.get(k)!).filter(Boolean);
}

/**
 * 括弧を解析（例: "用語（略称）" → { base: "用語", parens: "略称" }）
 */
export function parseParens(value: string): { base: string; parens: string | null } {
  const normalized = normalizeWhitespace(value);
  const match = normalized.match(/^(.*?)[(（]([^）)]+)[)）]\s*$/);
  if (!match) {
    return { base: normalized, parens: null };
  }
  return { base: match[1].trim(), parens: match[2].trim() };
}

/**
 * 括弧内から略称候補を抽出（例: "ALB/NLB" → ["ALB", "NLB"]）
 */
export function extractAcronymAliases(parens: string): string[] {
  const candidates = parens
    .split(/[\/,]/g)
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  const aliases: string[] = [];
  for (const v of candidates) {
    if (v.length < 2) {
      continue;
    }

    // 例: ALB/NLB, REST/HTTP, AAAA, CNAME
    if (/^[A-Z0-9][A-Z0-9@._-]{1,20}$/.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: Azure AD, Network Security Group, Private Endpoint（英字/数字+スペースあり、ただし全小文字は除外）
    if (/^[A-Za-z0-9][A-Za-z0-9 @._-]{1,30}$/.test(v) && /[A-Z0-9]/.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: 旧Azure AD, 旧 AWS SSO, 日本語+英字の混在（括弧内の補足としてよく出る）
    if (/^[\p{Script=Han}\p{Script=Katakana}々ー・A-Za-z0-9 @._-]{2,30}$/u.test(v) && /[\p{Script=Han}A-Z0-9]/u.test(v)) {
      aliases.push(v);
      continue;
    }

    // 例: オレンジクラウド, スクリプト（カナ/漢字のみ）
    if (/^[\p{Script=Katakana}\p{Script=Han}々ー・]{2,20}$/u.test(v)) {
      aliases.push(v);
      continue;
    }
  }

  return aliases;
}

/**
 * README.md から用語候補を抽出し、用語図鑑（オフライン）のカバレッジを確認するCLI。
 *
 * 目的:
 * - READMEに登場する主要な用語/熟語が、オフライン辞書で引ける状態を保つ
 *
 * 使い方:
 * - `npm run check:glossary`
 * - `npm run check:glossary -- --strict`（未登録があればexit 1）
 * - `npm run check:glossary -- --json`（JSON出力）
 * - `npm run check:glossary -- --katakana`（カタカナ語も候補に含める）
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { hasGlossaryEntry } from '../server/src/hover/glossary';

interface Options {
  strict: boolean;
  json: boolean;
  includeKatakana: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
    includeKatakana: argv.includes('--katakana'),
  };
}

function stripFencedCodeBlocks(markdown: string): string {
  return markdown.replace(/```[\s\S]*?```/g, '');
}

function extractCandidates(markdown: string, includeKatakana: boolean): Set<string> {
  const text = stripFencedCodeBlocks(markdown);
  const candidates = new Set<string>();

  for (const m of text.matchAll(/`([^`\n]+)`/g)) {
    const value = m[1]?.trim();
    if (value) {
      candidates.add(value);
    }
  }

  // ASCIIベースの熟語（最大4語）
  for (const m of text.matchAll(/\b[A-Za-z][A-Za-z0-9.+#/_:-]*(?:\s+[A-Za-z][A-Za-z0-9.+#/_:-]*){0,3}\b/g)) {
    candidates.add(m[0]);
  }

  // .NET のような先頭がドットの語
  for (const m of text.matchAll(/\.[A-Za-z][A-Za-z0-9.+#/_:-]*/g)) {
    candidates.add(m[0]);
  }

  if (includeKatakana) {
    for (const m of text.matchAll(/[ァ-ヶー]{4,}(?:・[ァ-ヶー]{2,})*/g)) {
      candidates.add(m[0]);
    }
  }

  return candidates;
}

function shouldSkipCandidate(candidate: string): boolean {
  if (!candidate) return true;
  const noise = new Set([
    'abc',
    'ABC',
    'A',
    'B',
    'h',
    'brightgreen',
    'Category',
    'cloud',
    'it',
    'Detection Coverage',
    'Example',
    'Last updated',
    'MIT License',
    'PASS',
    'Status',
    'true',
    'false',
    'normal',
    'strict/normal/loose',
  ]);
  if (noise.has(candidate)) return true;

  if (/https?:\/\//i.test(candidate)) return true;
  if (/\bshields\.io\b/i.test(candidate)) return true;
  if (/\bgithub\.com\b/i.test(candidate)) return true;
  if (/\bgithub\.io\b/i.test(candidate)) return true;
  if (/\bmicrosoft\.github\.io\b/i.test(candidate)) return true;
  if (/\.com\b/i.test(candidate)) return true;
  if (/^`/.test(candidate) || /`$/.test(candidate)) return true;
  if (/^\d+$/.test(candidate)) return true;
  if (/^\["/.test(candidate)) return true;
  if (candidate.includes('...')) return true;
  if (/^EVALS-/.test(candidate)) return true;
  if (/^\.(advanced|hover|markdown)\./.test(candidate)) return true;
  if (/^\.(debounceDelay|targetLanguages|js)$/.test(candidate)) return true;

  const allowShort = new Set(['AI', 'CD', 'CI', 'OS', 'DB', 'AZ', 'IP', 'ID', 'PR', 'MR', 'JS', 'TS']);
  if (candidate.length < 3 && !allowShort.has(candidate)) return true;

  return false;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const readmePath = path.resolve(process.cwd(), 'README.md');
  const markdown = readFileSync(readmePath, 'utf8');

  const candidates = extractCandidates(markdown, options.includeKatakana);
  const missing = [...candidates]
    .map((v) => v.trim())
    .filter((v) => !shouldSkipCandidate(v))
    .filter((v) => !hasGlossaryEntry(v))
    .sort((a, b) => a.localeCompare(b, 'ja'));

  if (options.json) {
    process.stdout.write(JSON.stringify({ total: candidates.size, missing }, null, 2));
    process.stdout.write('\n');
  } else {
    for (const term of missing) {
      process.stdout.write(`${term}\n`);
    }
    process.stdout.write(`\nTotal candidates: ${candidates.size}\n`);
    process.stdout.write(`Missing: ${missing.length}\n`);
  }

  if (options.strict && missing.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

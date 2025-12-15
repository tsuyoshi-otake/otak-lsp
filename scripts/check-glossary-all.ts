/**
 * 全カテゴリの用語図鑑（オフライン）の説明カバレッジを検査するCLI。
 *
 * 目的:
 * - すべてのカテゴリで「説明が空/欠落」がない状態を保つ
 * - フォールバック説明（一般的な用語/◯◯の用語…）に依存している割合を可視化する
 *
 * 使い方:
 * - `npm run check:glossary:all`
 * - `npm run check:glossary:all -- --strict`（説明欠落があればexit 1）
 * - `npm run check:glossary:all -- --json`（JSON出力）
 */

import { getGlossaryDefinitions } from '../server/src/hover/glossary';

interface Options {
  strict: boolean;
  json: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    strict: argv.includes('--strict'),
    json: argv.includes('--json'),
  };
}

function isFallbackDescription(description: string): boolean {
  const d = description.trim();
  if (d.startsWith('一般的な用語。')) return true;
  if (d.includes('の用語。「') && d.includes('」はコンソール上のリソース名/設定項目として使われる。')) return true;
  return false;
}

type Finding = Readonly<{
  glossaryId: string;
  glossaryTitle: string;
  term: string;
  reason: 'empty_description';
}>;

async function main(): Promise<void> {
  const options = parseArgs(process.argv);
  const glossaries = getGlossaryDefinitions();

  const findings: Finding[] = [];
  const summary = glossaries.map((g) => {
    let empty = 0;
    let fallback = 0;
    for (const e of g.entries) {
      const desc = e.description ?? '';
      if (desc.trim().length === 0) {
        empty += 1;
        findings.push({ glossaryId: g.id, glossaryTitle: g.title, term: e.term, reason: 'empty_description' });
        continue;
      }
      if (isFallbackDescription(desc)) {
        fallback += 1;
      }
    }
    return {
      id: g.id,
      title: g.title,
      total: g.entries.length,
      empty,
      fallback,
    };
  });

  const totals = summary.reduce(
    (acc, s) => {
      acc.total += s.total;
      acc.empty += s.empty;
      acc.fallback += s.fallback;
      return acc;
    },
    { total: 0, empty: 0, fallback: 0 }
  );

  if (options.json) {
    process.stdout.write(JSON.stringify({ totals, summary, findings }, null, 2));
    process.stdout.write('\n');
  } else {
    for (const s of summary.sort((a, b) => a.id.localeCompare(b.id, 'ja'))) {
      process.stdout.write(
        `${s.id}\t${s.title}\ttotal=${s.total}\tempty=${s.empty}\tfallback=${s.fallback}\n`
      );
    }
    process.stdout.write(`\nTotals: total=${totals.total} empty=${totals.empty} fallback=${totals.fallback}\n`);
  }

  if (options.strict && totals.empty > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});


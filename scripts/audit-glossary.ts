/**
 * 用語図鑑（glossary）の整合性監査CLI。
 *
 * 突き合わせる4つの真実源:
 *   1) GLOSSARIES        … 実データ（カテゴリごとのエントリ件数）
 *   2) GLOSSARY_GROUPS   … 型 GlossaryId のタクソノミ（グループ→メンバー）
 *   3) package.json      … contributes.configuration の enabledGlossaries enum / default
 *   4) README.md         … 「用語図鑑カテゴリ」表に載っているID
 *
 * 検出する不整合:
 *   - phantom: enum/README にあるが GlossaryId 型（グループのメンバー集合）に存在しない
 *   - empty:   型に存在するが実データのエントリが 0 件
 *   - enum漏れ: 型に存在するが package.json enum に無い
 *   - README漏れ: 実データありなのに README 表に無い（ドキュメント遅延）
 *   - README過剰: README 表にあるが実データが無い（誤案内）
 *
 * 使い方:
 *   npx ts-node scripts/audit-glossary.ts            # レポート表示
 *   npx ts-node scripts/audit-glossary.ts --json     # JSON出力
 *   npx ts-node scripts/audit-glossary.ts --strict   # phantom/README不整合があれば exit 1
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { GLOSSARY_GROUPS } from '../shared/src/types';
import { GLOSSARIES, DEFAULT_ENABLED_GLOSSARIES } from '../server/src/hover/glossaryData';

interface Options {
  json: boolean;
  strict: boolean;
}

function parseArgs(argv: string[]): Options {
  return {
    json: argv.includes('--json'),
    strict: argv.includes('--strict'),
  };
}

/**
 * データ未提供だが型/グループには登録済みの「整備中」カテゴリの allowlist。
 * 将来データを追加する予定のものを意図的に許容する。
 * - ここに無い空カテゴリが現れたら（=意図しない混入）--strict で失敗させる
 * - ここにあるカテゴリにデータが入ったら（=allowlist が陳腐化）--strict で失敗させ、削除を促す
 */
const KNOWN_EMPTY_TYPED: ReadonlySet<string> = new Set([
  'authIam',
  'messagingEda',
  'docker',
  'mysql',
  'yarn',
  'pnpm',
  'powershell',
  'javaCli',
  'maven',
  'gradle',
  'devProcess',
  'ipaMetrics',
]);

/** 型 GlossaryId に属する全IDの集合（グループのメンバーから収集） */
function collectTypedIds(): Set<string> {
  const ids = new Set<string>();
  for (const group of GLOSSARY_GROUPS) {
    for (const id of group.members) {
      ids.add(id);
    }
  }
  return ids;
}

/** カテゴリID → エントリ件数 */
function collectEntryCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const g of GLOSSARIES) {
    counts.set(g.id, g.entries.length);
  }
  return counts;
}

/** package.json の enabledGlossaries enum / default を取得 */
function readPackageJsonGlossaries(repoRoot: string): { enumIds: string[]; defaultIds: string[] } {
  const pkgPath = path.resolve(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const prop = pkg?.contributes?.configuration?.properties?.['otakLsp.hover.enabledGlossaries'];
  const enumIds: string[] = prop?.items?.enum ?? [];
  const defaultIds: string[] = prop?.default ?? [];
  return { enumIds, defaultIds };
}

/** README の用語図鑑表（`| \`id\` | ... |`）からIDを抽出 */
function readReadmeGlossaryIds(repoRoot: string): string[] {
  const readmePath = path.resolve(repoRoot, 'README.md');
  const md = readFileSync(readmePath, 'utf8');
  const ids: string[] = [];
  // 「用語図鑑カテゴリ」セクション内の表行: | `id` | 名称 | 説明 |
  const sectionMatch = md.match(/####? 用語図鑑カテゴリ[\s\S]*?(?=\n## |\n### |$)/);
  const scope = sectionMatch ? sectionMatch[0] : md;
  for (const m of scope.matchAll(/^\|\s*`([A-Za-z][A-Za-z0-9]*)`\s*\|/gm)) {
    ids.push(m[1]);
  }
  return ids;
}

function main(): void {
  const options = parseArgs(process.argv);
  const repoRoot = process.cwd();

  const typedIds = collectTypedIds();
  const entryCounts = collectEntryCounts();
  const { enumIds, defaultIds } = readPackageJsonGlossaries(repoRoot);
  const readmeIds = readReadmeGlossaryIds(repoRoot);

  const dataBackedIds = [...entryCounts.entries()].filter(([, n]) => n > 0).map(([id]) => id);
  const dataBackedSet = new Set(dataBackedIds);
  const enumSet = new Set(enumIds);
  const readmeSet = new Set(readmeIds);

  // phantom: enum/README にあるが型に存在しない
  const phantomInEnum = enumIds.filter((id) => !typedIds.has(id));
  const phantomInReadme = readmeIds.filter((id) => !typedIds.has(id));

  // empty: 型に存在するが実データ 0 件
  const emptyTyped = [...typedIds].filter((id) => (entryCounts.get(id) ?? 0) === 0).sort();

  // enum漏れ: 型に存在するが enum に無い
  const missingFromEnum = [...typedIds].filter((id) => !enumSet.has(id)).sort();

  // README漏れ: 実データありなのに README 表に無い
  const missingFromReadme = dataBackedIds.filter((id) => !readmeSet.has(id)).sort();

  // README過剰: README 表にあるが実データが無い
  const staleInReadme = readmeIds.filter((id) => !dataBackedSet.has(id)).sort();

  // default過剰: package.json default にあるが実データが無い（no-op設定）
  const emptyInDefault = defaultIds.filter((id) => (entryCounts.get(id) ?? 0) === 0).sort();

  // allowlist 違反: 想定外の空カテゴリ（混入） / allowlist にあるのにデータが入った（陳腐化）
  const unexpectedEmpty = emptyTyped.filter((id) => !KNOWN_EMPTY_TYPED.has(id));
  const staleAllowlist = [...KNOWN_EMPTY_TYPED].filter((id) => (entryCounts.get(id) ?? 0) > 0).sort();

  const report = {
    summary: {
      typedCategories: typedIds.size,
      dataBackedCategories: dataBackedIds.length,
      enumCategories: enumIds.length,
      readmeDocumentedCategories: readmeIds.length,
      totalEntries: [...entryCounts.values()].reduce((a, b) => a + b, 0),
    },
    issues: {
      phantomInEnum,        // 例: cloudflareServices（型にすら無い）
      phantomInReadme,
      emptyTyped,           // 型はあるがデータ未提供
      missingFromEnum,
      missingFromReadme,    // ドキュメント遅延
      staleInReadme,        // 誤案内
      emptyInDefault,       // 既定で有効だがデータ無し（no-op）
      unexpectedEmpty,      // allowlist 外の空カテゴリ（混入）
      staleAllowlist,       // allowlist にあるのにデータが入った（陳腐化）
    },
    dataBacked: dataBackedIds
      .map((id) => ({ id, entries: entryCounts.get(id) ?? 0 }))
      .sort((a, b) => b.entries - a.entries),
    runtimeDefaultCount: DEFAULT_ENABLED_GLOSSARIES.length,
  };

  if (options.json) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } else {
    const s = report.summary;
    process.stdout.write('=== Glossary Audit ===\n');
    process.stdout.write(`型カテゴリ(GlossaryId): ${s.typedCategories}\n`);
    process.stdout.write(`実データありカテゴリ : ${s.dataBackedCategories}\n`);
    process.stdout.write(`package.json enum   : ${s.enumCategories}\n`);
    process.stdout.write(`README記載         : ${s.readmeDocumentedCategories}\n`);
    process.stdout.write(`総エントリ数        : ${s.totalEntries}\n`);
    process.stdout.write(`runtime既定有効数   : ${report.runtimeDefaultCount}\n\n`);

    const print = (label: string, arr: string[]) => {
      process.stdout.write(`[${label}] (${arr.length})${arr.length ? ': ' + arr.join(', ') : ''}\n`);
    };
    print('phantom in enum (型に無い)', phantomInEnum);
    print('phantom in README (型に無い)', phantomInReadme);
    print('empty typed (データ未提供)', emptyTyped);
    print('missing from enum', missingFromEnum);
    print('missing from README (ドキュメント遅延)', missingFromReadme);
    print('stale in README (誤案内)', staleInReadme);
    print('empty in default (no-op既定)', emptyInDefault);
    print('unexpected empty (allowlist外の混入)', unexpectedEmpty);
    print('stale allowlist (データ入済み→要削除)', staleAllowlist);
  }

  if (
    options.strict &&
    (phantomInEnum.length ||
      phantomInReadme.length ||
      staleInReadme.length ||
      missingFromReadme.length ||
      unexpectedEmpty.length ||
      staleAllowlist.length)
  ) {
    process.exitCode = 1;
  }
}

main();

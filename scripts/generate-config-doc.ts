/**
 * 設定リファレンス自動生成CLI。
 *
 * package.json の contributes.configuration.properties を真実源として、
 * docs/configuration.md（全設定の完全な一覧）を生成する。
 * README には代表的な設定のみを載せ、完全版はこの生成物に逃がす。
 *
 * 使い方:
 *   npx ts-node scripts/generate-config-doc.ts            # docs/configuration.md を生成
 *   npx ts-node scripts/generate-config-doc.ts --check    # 生成結果と現状が一致するか検査（CI用、不一致でexit 1）
 */

import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

interface ConfigProperty {
  type?: string | string[];
  default?: unknown;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  maxItems?: number;
  items?: { type?: string; enum?: string[] };
  additionalProperties?: unknown;
}

interface Group {
  title: string;
  /** このグループに含めるキーの判定 */
  match: (key: string) => boolean;
}

/** 設定キーを論理グループへ振り分ける（先に一致したものを採用） */
const GROUPS: Group[] = [
  { title: 'Markdown', match: (k) => k.startsWith('otakLsp.markdown.') },
  { title: 'ホバー（用語図鑑・Wikipedia）', match: (k) => k.startsWith('otakLsp.hover.') },
  { title: '高度な文法ルール', match: (k) => k.startsWith('otakLsp.advanced.') && !k.startsWith('otakLsp.advanced.tieredExecution.') && !k.startsWith('otakLsp.advanced.parallelExecution.') },
  { title: 'パフォーマンス（段階実行・並列実行）', match: (k) => k.startsWith('otakLsp.advanced.tieredExecution.') || k.startsWith('otakLsp.advanced.parallelExecution.') },
  { title: '公文書対応', match: (k) => k.startsWith('otakLsp.official.') },
  { title: '校正設定', match: (k) => k.startsWith('otakLsp.proofreading.') },
  { title: '基本設定', match: () => true },
];

function formatType(prop: ConfigProperty): string {
  const t = prop.type;
  if (Array.isArray(t)) return t.join(' \\| ');
  if (t === 'array') {
    const itemType = prop.items?.type ?? 'string';
    return `${itemType}[]`;
  }
  return t ?? '';
}

function formatDefault(value: unknown): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value === '' ? '`""`' : '`' + value + '`';
  if (Array.isArray(value)) {
    if (value.length === 0) return '`[]`';
    // 長い配列は省略表記
    if (value.length > 6) {
      return '`[' + value.slice(0, 3).map((v) => JSON.stringify(v)).join(', ') + `, …（全${value.length}件）]\``;
    }
    return '`' + JSON.stringify(value) + '`';
  }
  if (value && typeof value === 'object') {
    return '`' + JSON.stringify(value) + '`';
  }
  return '`' + String(value) + '`';
}

/** 取りうる値・範囲などの補足 */
function formatConstraints(prop: ConfigProperty): string {
  const parts: string[] = [];
  const enumValues = prop.enum ?? prop.items?.enum;
  if (enumValues && enumValues.length > 0) {
    if (enumValues.length > 8) {
      parts.push(`列挙: ${enumValues.slice(0, 8).join(' / ')} …（全${enumValues.length}種）`);
    } else {
      parts.push(`列挙: ${enumValues.join(' / ')}`);
    }
  }
  if (prop.minimum !== undefined || prop.maximum !== undefined) {
    parts.push(`範囲: ${prop.minimum ?? ''}〜${prop.maximum ?? ''}`);
  }
  if (prop.maxItems !== undefined) {
    parts.push(`最大${prop.maxItems}件`);
  }
  return parts.join('、');
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function generate(repoRoot: string): string {
  const pkgPath = path.resolve(repoRoot, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const properties: Record<string, ConfigProperty> =
    pkg?.contributes?.configuration?.properties ?? {};
  const version: string = pkg?.version ?? '';

  const keys = Object.keys(properties);
  const grouped = new Map<string, string[]>();
  for (const g of GROUPS) grouped.set(g.title, []);

  for (const key of keys) {
    const group = GROUPS.find((g) => g.match(key))!;
    grouped.get(group.title)!.push(key);
  }

  const lines: string[] = [];
  lines.push('<!-- このファイルは scripts/generate-config-doc.ts による自動生成です。手動で編集しないでください。 -->');
  lines.push('<!-- 再生成: npm run docs:config / 検査: npm run check:config -->');
  lines.push('');
  lines.push('# 設定リファレンス');
  lines.push('');
  lines.push(`otak-lsp v${version} の全設定項目（${keys.length}件）の完全な一覧です。`);
  lines.push('真実源は `package.json` の `contributes.configuration` です。READMEには代表的な設定のみを掲載しています。');
  lines.push('');

  for (const g of GROUPS) {
    const groupKeys = grouped.get(g.title)!;
    if (groupKeys.length === 0) continue;
    lines.push(`## ${g.title}`);
    lines.push('');
    lines.push('| 設定キー | 型 | 既定値 | 制約 | 説明 |');
    lines.push('|---|---|---|---|---|');
    for (const key of groupKeys) {
      const prop = properties[key];
      const type = escapeCell(formatType(prop));
      const def = escapeCell(formatDefault(prop.default));
      const constraints = escapeCell(formatConstraints(prop));
      const desc = escapeCell(prop.description ?? '');
      lines.push(`| \`${key}\` | ${type} | ${def} | ${constraints} | ${desc} |`);
    }
    lines.push('');
  }

  return lines.join('\n') + '\n';
}

function main(): void {
  const repoRoot = process.cwd();
  const docPath = path.resolve(repoRoot, 'docs', 'configuration.md');
  const generated = generate(repoRoot);
  const isCheck = process.argv.includes('--check');

  if (isCheck) {
    let current = '';
    try {
      current = readFileSync(docPath, 'utf8');
    } catch {
      current = '';
    }
    if (current !== generated) {
      process.stderr.write('docs/configuration.md が package.json と一致していません。`npm run docs:config` を実行して再生成してください。\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write('docs/configuration.md は最新です。\n');
    return;
  }

  writeFileSync(docPath, generated, 'utf8');
  process.stdout.write(`docs/configuration.md を生成しました（${generated.split('\n').length} 行）。\n`);
}

main();

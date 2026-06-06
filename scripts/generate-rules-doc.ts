/**
 * ルールリファレンス自動生成CLI。
 *
 * 真実源:
 *   - 高度ルール: createDefaultAdvancedRules()（name / description / isEnabled）
 *   - 基本ルール: checker.ts（GrammarChecker の内部4ルール。ここでは静的に列挙）
 *
 * 各高度ルールの「設定キー」は isEnabled() を1フラグずつ反転させて決定論的に逆引きする
 * （ファイル走査やLLM抽出に頼らず、実装そのものから導出する）。
 * 生成物 docs/rules.md と README のルール数の真実源をこのレジストリに一本化する。
 *
 * 使い方:
 *   npx ts-node scripts/generate-rules-doc.ts            # docs/rules.md を生成
 *   npx ts-node scripts/generate-rules-doc.ts --check    # 生成物が最新か検査（CI用、不一致でexit 1）
 */

import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

import {
  AdvancedRulesConfig,
  DEFAULT_ADVANCED_RULES_CONFIG,
} from '../shared/src/advancedTypes';
import { createDefaultAdvancedRules, LIGHTWEIGHT_RULE_NAMES } from '../server/src/grammar/advancedRuleRegistry';

/** 公文書ルールの設定キー（otakLsp.official.* に属するもの） */
const OFFICIAL_CONFIG_KEYS = new Set([
  'enableOyobiNarabini',
  'enableMatawaWakushikuwa',
  'enableJouyouKanji',
  'enableBulletPunctuation',
]);

/**
 * 基本ルール（checker.ts の GrammarChecker 内部の4クラス。静的に列挙）。
 * 件数の単位は高度ルールと揃えて「ルールクラス」とする。
 * RedundantCopulaRule は診断コードとしては particle-sequence を共有する点に注意。
 */
const BASIC_RULES: { name: string; code: string; description: string }[] = [
  { name: 'double-particle', code: 'double-particle', description: '二重助詞（「がが」「をを」など同じ助詞の連続）を検出' },
  { name: 'particle-sequence', code: 'particle-sequence', description: '不適切な助詞連続（「がを」など）を検出' },
  { name: 'verb-particle-mismatch', code: 'verb-particle-mismatch', description: '自動詞に「を」を使う動詞-助詞不整合を検出' },
  { name: 'redundant-copula', code: 'particle-sequence', description: '冗長な助動詞（「でです」「にです」など）を検出（診断コードは particle-sequence を共有）' },
];

interface AdvancedRuleInfo {
  name: string;
  description: string;
  configKey: string | null;
  configPath: string | null;
  lightweight: boolean;
  official: boolean;
}

/** 各高度ルールが、どの boolean 設定キーで無効化されるかを逆引きする */
function discoverConfigKeys(): Map<string, string[]> {
  const rules = createDefaultAdvancedRules();
  const base: AdvancedRulesConfig = { ...DEFAULT_ADVANCED_RULES_CONFIG };
  const ruleToKeys = new Map<string, string[]>();

  for (const key of Object.keys(base) as (keyof AdvancedRulesConfig)[]) {
    if (typeof base[key] !== 'boolean') continue;
    const flipped: AdvancedRulesConfig = { ...base, [key]: false };
    for (const rule of rules) {
      if (rule.isEnabled(base) && !rule.isEnabled(flipped)) {
        const list = ruleToKeys.get(rule.name) ?? [];
        list.push(key as string);
        ruleToKeys.set(rule.name, list);
      }
    }
  }
  return ruleToKeys;
}

/** package.json から、短いキー名に対応する完全な設定パスを引く */
function resolveConfigPath(properties: Record<string, unknown>, shortKey: string): string | null {
  for (const fullKey of Object.keys(properties)) {
    if (fullKey.endsWith(`.${shortKey}`)) return fullKey;
  }
  return null;
}

function collectAdvancedRules(repoRoot: string): AdvancedRuleInfo[] {
  const pkg = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8'));
  const properties: Record<string, unknown> = pkg?.contributes?.configuration?.properties ?? {};
  const rules = createDefaultAdvancedRules();
  const ruleToKeys = discoverConfigKeys();
  const lightweight = new Set(LIGHTWEIGHT_RULE_NAMES);

  return rules.map((rule) => {
    const keys = ruleToKeys.get(rule.name) ?? [];
    const configKey = keys.length > 0 ? keys[0] : null;
    const official = configKey ? OFFICIAL_CONFIG_KEYS.has(configKey) : false;
    return {
      name: rule.name,
      description: rule.description,
      configKey,
      configPath: configKey ? resolveConfigPath(properties, configKey) : null,
      lightweight: lightweight.has(rule.name),
      official,
    };
  });
}

function escapeCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function generate(repoRoot: string): string {
  const pkg = JSON.parse(readFileSync(path.resolve(repoRoot, 'package.json'), 'utf8'));
  const version: string = pkg?.version ?? '';
  const advanced = collectAdvancedRules(repoRoot);

  const officialRules = advanced.filter((r) => r.official);
  const highRules = advanced.filter((r) => !r.official);

  const lines: string[] = [];
  lines.push('<!-- このファイルは scripts/generate-rules-doc.ts による自動生成です。手動で編集しないでください。 -->');
  lines.push('<!-- 再生成: npm run docs:rules / 検査: npm run check:rules -->');
  lines.push('');
  lines.push('# ルールリファレンス');
  lines.push('');
  lines.push(`otak-lsp v${version} に同梱される文法・文体・表記ルールの一覧です。`);
  lines.push('真実源は `server/src/grammar/advancedRuleRegistry.ts`（高度ルール）と `server/src/grammar/checker.ts`（基本ルール）です。');
  lines.push('');
  lines.push('| 種別 | 件数 |');
  lines.push('|---|---|');
  lines.push(`| 基本ルール | ${BASIC_RULES.length} |`);
  lines.push(`| 高度ルール（うち公文書 ${officialRules.length}） | ${advanced.length} |`);
  lines.push(`| 合計 | ${BASIC_RULES.length + advanced.length} |`);
  lines.push('');
  lines.push('> このほかに校正設定（`otakLsp.proofreading.*`）のチェック群があります。検出カテゴリの実測一覧は README の「Detection Coverage」（evalsから自動生成）を参照してください。');
  lines.push('');

  lines.push('## 基本ルール');
  lines.push('');
  lines.push('`server/src/grammar/checker.ts`（レガシーな基本チェッカ）。');
  lines.push('');
  lines.push('| ルールID | 診断コード | 説明 |');
  lines.push('|---|---|---|');
  for (const r of BASIC_RULES) {
    lines.push(`| \`${r.name}\` | \`${r.code}\` | ${escapeCell(r.description)} |`);
  }
  lines.push('');

  const renderAdvanced = (title: string, rows: AdvancedRuleInfo[]) => {
    lines.push(`## ${title}`);
    lines.push('');
    lines.push('| ルールID | 説明 | 設定キー | 軽量 |');
    lines.push('|---|---|---|---|');
    for (const r of rows) {
      const cfg = r.configPath ? `\`${r.configPath}\`` : (r.configKey ? `\`${r.configKey}\`` : '—');
      const light = r.lightweight ? '✓' : '';
      lines.push(`| \`${escapeCell(r.name)}\` | ${escapeCell(r.description)} | ${cfg} | ${light} |`);
    }
    lines.push('');
  };

  renderAdvanced('高度ルール', highRules);
  renderAdvanced('公文書ルール', officialRules);

  return lines.join('\n') + '\n';
}

function main(): void {
  const repoRoot = process.cwd();
  const docPath = path.resolve(repoRoot, 'docs', 'rules.md');
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
      process.stderr.write('docs/rules.md が実装と一致していません。`npm run docs:rules` を実行して再生成してください。\n');
      process.exitCode = 1;
      return;
    }
    process.stdout.write('docs/rules.md は最新です。\n');
    return;
  }

  writeFileSync(docPath, generated, 'utf8');
  const advancedCount = createDefaultAdvancedRules().length;
  process.stdout.write(`docs/rules.md を生成しました（基本${BASIC_RULES.length} + 高度${advancedCount}）。\n`);
}

main();

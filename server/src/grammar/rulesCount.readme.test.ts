/**
 * README のルール数が実装（レジストリ）と一致していることを保証する回帰テスト。
 *
 * ルールを増減したら README の「高度ルールN種」も更新する必要がある、というルールを
 * テストで強制する。docs/rules.md は scripts/generate-rules-doc.ts（npm run check:rules）
 * で別途検証される。
 */

import { readFileSync } from 'fs';
import * as path from 'path';

import { createDefaultAdvancedRules } from './advancedRuleRegistry';

describe('README rule count consistency', () => {
  it('README が高度ルールの実数を反映している', () => {
    const count = createDefaultAdvancedRules().length;
    const readme = readFileSync(path.resolve(process.cwd(), 'README.md'), 'utf8');
    expect(readme).toContain(`高度ルール${count}種`);
  });

  it('高度ルールの name は一意で、name/description は空でない', () => {
    const rules = createDefaultAdvancedRules();
    const names = rules.map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    for (const rule of rules) {
      expect(rule.name.length).toBeGreaterThan(0);
      expect(rule.description.length).toBeGreaterThan(0);
    }
  });
});

/**
 * MissingSubjectRule のテスト
 *
 * 目的:
 * - Markdownコードフェンス（```markdown）が診断範囲に混ざらないこと
 */

import { MarkdownFilter } from '../../parser/markdownFilter';
import { AdvancedRulesManager } from '../advancedRulesManager';

describe('MissingSubjectRule', () => {
  it('Markdownコードフェンス行を診断範囲に含めないこと', () => {
    const markdownFilter = new MarkdownFilter();

    const markdown = [
      '```markdown',
      '昨日、買いました。',
      '```',
      ''
    ].join('\n');

    const { filteredText, excludedRanges } = markdownFilter.filter(markdown, {
      ...markdownFilter.getConfig(),
      preserveCodeBlockContent: true
    });

    const manager = new AdvancedRulesManager();
    const diagnostics = manager.checkWithRules(filteredText, [], ['missing-subject'], excludedRanges);

    const missingSubjectDiagnostics = diagnostics.filter((d) => d.code === 'missing-subject');
    expect(missingSubjectDiagnostics.length).toBeGreaterThanOrEqual(1);

    // コードフェンスは1行目、本文は2行目なので、診断範囲は2行目に来るべき
    expect(missingSubjectDiagnostics[0].range.start.line).toBe(1);
    expect(missingSubjectDiagnostics[0].range.end.line).toBe(1);
  });
});


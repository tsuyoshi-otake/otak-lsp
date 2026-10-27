/**
 * CodeAction プロバイダーのユニットテスト
 * Issue #24: 修正候補を利用者へ届け、適用可能な候補をクイックフィックスにつなぐ
 */

import { TextDocument } from 'vscode-languageserver-textdocument';
import { Diagnostic, TextDocumentEdit } from 'vscode-languageserver/node';
import { buildCodeActions } from './codeActionProvider';

function makeDiag(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    range: { start: { line: 1, character: 0 }, end: { line: 1, character: 3 } },
    message: 'test diagnostic',
    severity: 2,
    source: 'otak-lsp',
    code: 'noun-chain',
    ...overrides,
  };
}

function getEdits(action: { edit?: unknown }): { uri: string; version: number | null; newText: string; line: number } | undefined {
  const changes = (action.edit as { documentChanges?: unknown[] })?.documentChanges;
  if (!changes || !TextDocumentEdit.is(changes[0])) return undefined;
  const edit = changes[0];
  return {
    uri: edit.textDocument.uri,
    version: edit.textDocument.version,
    newText: edit.edits[0].newText,
    line: edit.edits[0].range.start.line,
  };
}

describe('buildCodeActions', () => {
  it('Markdown文書では HTML コメント形式の抑制アクションを返す', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行\nline2');
    const actions = buildCodeActions(doc, [makeDiag()]);
    const suppress = actions.find((a) => a.title.includes('抑制'));
    const got = getEdits(suppress!);
    expect(got).toBeDefined();
    expect(got!.newText).toContain('otak-lsp-disable-line noun-chain');
    expect(got!.newText).toContain('<!--');
    expect(got!.line).toBe(1);
  });

  it('編集は文書versionを明示する（versioned documentChanges）', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 7, 'line0\n対象行');
    const actions = buildCodeActions(doc, [makeDiag()]);
    const got = getEdits(actions.find((a) => a.title.includes('抑制'))!);
    expect(got!.version).toBe(7);
  });

  it('コード文書ではラインコメント形式の抑制アクションを返す', () => {
    const doc = TextDocument.create('file:///a.ts', 'typescript', 1, '// コメント\nconst x = 1;');
    const diag = makeDiag({ range: { start: { line: 0, character: 3 }, end: { line: 0, character: 8 } } });
    const actions = buildCodeActions(doc, [diag]);
    const got = getEdits(actions.find((a) => a.title.includes('抑制'))!);
    expect(got!.newText).toContain('// otak-lsp-disable-line noun-chain');
    expect(got!.newText).not.toContain('<!--');
  });

  it('提案(suggestions)を説明用アクションとして返す（自動適用しない）', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    const diag = makeDiag({
      data: { documentVersion: 1, suggestions: ['文を分割してください'] },
    });
    const actions = buildCodeActions(doc, [diag]);
    const sugg = actions.find((a) => a.title.startsWith('修正案'));
    expect(sugg).toBeDefined();
    expect(sugg!.edit).toBeUndefined();
    expect(sugg!.command?.command).toBe('otakLsp.showSuggestion');
  });

  it('文書versionが異なる診断にはアクションを返さない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 2, 'line0\n対象行\nchanged');
    const diag = makeDiag({ data: { documentVersion: 1, suggestions: ['x'] } });
    expect(buildCodeActions(doc, [diag])).toHaveLength(0);
  });

  it('外部ソースの診断にはアクションを返さない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    const diag = makeDiag({ source: 'eslint' });
    expect(buildCodeActions(doc, [diag])).toHaveLength(0);
  });

  it('documentVersion未設定の診断でも抑制アクションは返す', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 5, 'line0\n対象行');
    expect(buildCodeActions(doc, [makeDiag()]).length).toBeGreaterThan(0);
  });

  it('インフラ用マーカー診断には抑制アクションを出さない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    for (const code of ['analysis-skipped', 'diagnostics-truncated', 'otak-lsp-invalid-directive']) {
      const actions = buildCodeActions(doc, [makeDiag({ code })]);
      expect(actions.find((a) => a.title.includes('抑制'))).toBeUndefined();
    }
  });

  it('辞書失敗の通知には効かない抑制アクションを出さず、同名の通常診断には出す', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    for (const code of ['dictionary-check-failed', 'dictionary-truncated']) {
      expect(buildCodeActions(doc, [makeDiag({ code, source: 'otak-lsp' })]).find(a => a.title.includes('抑制'))).toBeUndefined();
      expect(buildCodeActions(doc, [makeDiag({ code, source: 'otak-lsp-proofreading' })]).find(a => a.title.includes('抑制'))).toBeDefined();
    }
  });

  it('改行や記号を含むコードはディレクティブ注入しない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    for (const code of ['a\nb', 'x -->', 'CODE', 'a code', 'a_b']) {
      const actions = buildCodeActions(doc, [makeDiag({ code })]);
      expect(actions.find((a) => a.title.includes('抑制'))).toBeUndefined();
    }
  });

  it('行範囲外の診断には抑制アクションを出さない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0');
    const diag = makeDiag({ range: { start: { line: 9, character: 0 }, end: { line: 9, character: 1 } } });
    const actions = buildCodeActions(doc, [diag]);
    expect(actions.find((a) => a.title.includes('抑制'))).toBeUndefined();
  });

  it('コード以外の型（number）では抑制アクションを出さない', () => {
    const doc = TextDocument.create('file:///a.md', 'markdown', 1, 'line0\n対象行');
    const diag = makeDiag({ code: 42 as unknown as string });
    const actions = buildCodeActions(doc, [diag]);
    expect(actions.find((a) => a.title.includes('抑制'))).toBeUndefined();
  });
});

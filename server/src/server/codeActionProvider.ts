/**
 * CodeAction プロバイダー
 * Issue #24: 診断に添付された修正候補（suggestions）を利用者へ届け、
 * 「この行の診断を抑制する」クイックフィックスを提供する。
 *
 * 安全性の方針:
 * - 文字列の修正候補は「説明」として表示するのみで、自動置換 (TextEdit) には変換しない。
 * - 抑制アクションは `otak-lsp-disable-line <code>` コメントを挿入するだけで、
 *   ユーザーの本文は変更しない。
 * - 編集は OptionalVersionedTextDocumentIdentifier で文書versionを明示し、
 *   候補表示後に文書が変更されていたら適用側が拒否できるようにする。
 * - 診断に含まれる documentVersion が現在の文書versionと異なる場合は
 *   古い診断への適用を防ぐためアクションを返さない。
 * - インフラ用のマーカー診断（解析スキップ/省略/無効ディレクティブ警告）は
 *   抑制ディレクティブの対象外なので抑制アクションを出さない。
 */

import {
  CodeAction,
  CodeActionKind,
  Command,
  Diagnostic,
  OptionalVersionedTextDocumentIdentifier,
  TextDocumentEdit,
  TextEdit,
  WorkspaceEdit,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';

/** otak-lsp が発行する診断の source 値 */
const OTAK_SOURCES = new Set(['otak-lsp', 'otak-lsp-advanced', 'otak-lsp-proofreading']);

/** 抑制アクションを出さないインフラ用診断コード（ディレクティブで抑制されない） */
const INFRA_CODES = new Set(['analysis-skipped', 'diagnostics-truncated', 'otak-lsp-invalid-directive']);

/** 抑制ディレクティブに埋め込んでよいコード形式（改行等の注入を防ぐ） */
const SAFE_CODE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/** 診断の data に添付される拡張ペイロード（documentAnalyzer が設定） */
interface DiagnosticData {
  suggestions?: unknown;
  documentVersion?: unknown;
}

/** 表示できる修正案の最大件数（診断1件あたり） */
const MAX_SUGGESTION_ACTIONS = 3;

/** 修正案タイトルの最大文字数 */
const MAX_SUGGESTION_TITLE_LENGTH = 60;

/**
 * 言語IDに応じたディレクティブコメント形式を返す。
 * Markdown/プレーンテキストは HTML コメント、その他のコード言語はラインコメント。
 */
function directiveComment(languageId: string, code: string): string {
  const directive = `otak-lsp-disable-line ${code}`;
  if (languageId === 'markdown' || languageId === 'plaintext') {
    return ` <!-- ${directive} -->`;
  }
  if (languageId === 'python') {
    return ` # ${directive}`;
  }
  return ` // ${directive}`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 文書と、コードアクション要求に含まれる診断からクイックフィックスを構築する。
 */
export function buildCodeActions(document: TextDocument, diagnostics: Diagnostic[]): CodeAction[] {
  const actions: CodeAction[] = [];
  // 行末位置の算出は文書1回の走査で済ませる（診断ごとの全文splitを避ける）
  const lines = document.getText().split('\n');
  const lineEndChar = (line: number): number => (lines[line] ?? '').replace(/\r$/, '').length;

  for (const diag of diagnostics) {
    const source = typeof diag.source === 'string' ? diag.source : '';
    if (!OTAK_SOURCES.has(source)) {
      continue;
    }

    // 古い文書versionに由来する診断にはアクションを提供しない。
    // （documentVersion 未設定の診断は従来どおり提供する）
    const data: DiagnosticData = isObject(diag.data) ? diag.data : {};
    if (typeof data.documentVersion === 'number' && data.documentVersion !== document.version) {
      continue;
    }

    // 1) この行のこの診断コードだけを抑制するアクション。
    //    インフラ用マーカー（抑制不可）と、ディレクティブに安全に埋め込めない
    //    コード（改行・記号混入など）は対象外。
    const code = typeof diag.code === 'string' ? diag.code : '';
    const targetLine = diag.range.start.line;
    if (code.length > 0 && SAFE_CODE.test(code) && !INFRA_CODES.has(code)
        && targetLine >= 0 && targetLine < lines.length) {
      const insertPos = { line: targetLine, character: lineEndChar(targetLine) };
      const edit: WorkspaceEdit = {
        documentChanges: [
          TextDocumentEdit.create(
            OptionalVersionedTextDocumentIdentifier.create(document.uri, document.version),
            [TextEdit.insert(insertPos, directiveComment(document.languageId, code))]
          ),
        ],
      };
      actions.push({
        title: `この行の診断を抑制: ${code}`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diag],
        edit,
      });
    }

    // 2) 修正候補を説明として提示するアクション（自動適用しない）
    const suggestions = Array.isArray(data.suggestions)
      ? data.suggestions.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [];
    for (const suggestion of suggestions.slice(0, MAX_SUGGESTION_ACTIONS)) {
      const short = suggestion.length > MAX_SUGGESTION_TITLE_LENGTH
        ? `${suggestion.slice(0, MAX_SUGGESTION_TITLE_LENGTH - 1)}…`
        : suggestion;
      actions.push({
        title: `修正案: ${short}`,
        kind: CodeActionKind.QuickFix,
        diagnostics: [diag],
        command: Command.create('修正案を表示', 'otakLsp.showSuggestion', suggestion),
      });
    }
  }

  return actions;
}

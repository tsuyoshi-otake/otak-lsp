/**
 * VSCode Extension Client
 * otak-lsp - Japanese Grammar Analyzer
 * kuromoji.jsを使用した日本語形態素解析
 */

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
  TransportKind,
} from 'vscode-languageclient/node';
import * as path from 'path';
import { SemanticThemeId, SEMANTIC_THEMES } from '../../shared/src/types';

type SupportedLanguage = 'markdown' | 'javascript' | 'typescript' | 'python' | 'c' | 'cpp' | 'java' | 'rust' | 'plaintext';
const SUPPORTED_LANGUAGES: SupportedLanguage[] = ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'];

interface Configuration {
  enableGrammarCheck: boolean;
  enableSemanticHighlight: boolean;
  excludeTableDelimiters: boolean;
  markdown: {
    analyzeCodeBlocks: boolean;
    analyzeTables: boolean;
  };
  targetLanguages: SupportedLanguage[];
  debounceDelay: number;
}

interface DocumentFilter {
  scheme: string;
  language: string;
}

/**
 * server の `otakLsp/analyzeDocument` 応答契約（server/src/server/connection.ts）。
 * 「予約の受理」と「解析の終端」は区別され、完了前に ok:true にならない。
 */
interface AnalyzeDocumentResult {
  ok: boolean;
  status: string;
  reason?: string;
  diagnostics?: number;
}

/**
 * server の `otakLsp/analysisNotice` 通知契約（server/src/server/analysisRunner.ts）。
 */
interface AnalysisNotice {
  uri: string;
  kind: string;
  reason?: string;
  omitted?: number;
  total?: number;
}

/** サーバー起動状態。設定上のON/OFF（ユーザー意思）とは別に追跡する（Issue #19） */
type ServerRuntimeState = 'stopped' | 'starting' | 'running';

/** otak-lsp が管理する semanticTokenColorCustomizations.rules のキー */
const MANAGED_RULE_KEYS = ['noun', 'verb', 'adjective', 'particle', 'adverb'] as const;

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let extensionClient: ExtensionClient | undefined;
let currentThemeId: SemanticThemeId = 'pastel';

let serverState: ServerRuntimeState = 'stopped';
/** 直近の起動/再起動が失敗したか。true の間はエラー表示と再起動導線を出す */
let serverStartFailed = false;

/**
 * start/stop/restart を逐語実行する直列チェーン。
 * 連打・起動中のクリックでも stop/start が同時並行せず、状態が決定的に終端する。
 */
let clientLifecycle: Promise<void> = Promise.resolve();
/** toggle の直列チェーン。連打でも各回が最新の実効値を読んで反転する */
let toggleChain: Promise<void> = Promise.resolve();

/**
 * OFF→ON で元の個別ON/OFF値を復元するためのメモリ。
 * キーは「設定値を所有するスコープ」(`global` / `workspace` / `folder:<folderUri>`)
 * と設定キー名の組。文書URIではなく設定の所有者で管理するため、
 * 同一ワークスペース/フォルダー内の別文書とも正しく共有・分離される（Issue #20）。
 * 拡張セッション内のみ有効で、永続化しない（再起動後は「保存済みなし＝true」にフォールバック）。
 */
const previousEnableValues = new Map<string, boolean>();

/**
 * 解析通知の表示履歴。文書URI -> kind -> 最後に表示した署名(reason|omitted|total)。
 * 同一内容の再通知は表示せず出力パネルのみとし、省略件数など内容が変化した
 * 通知は新しい情報として再表示する。文書クローズで当該文書の履歴を破棄し、
 * NOTICE_HISTORY_LIMIT で文書数の上限も有界化する（Issue #23）。
 */
const noticeHistory = new Map<string, Map<string, string>>();
const NOTICE_HISTORY_LIMIT = 200;

function getConfigUpdateTarget(): vscode.ConfigurationTarget {
  const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  return hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
}

function enqueueLifecycle(task: () => Promise<void>): Promise<void> {
  const run = clientLifecycle.then(() => task());
  clientLifecycle = run.then(() => undefined, () => undefined);
  return run;
}

export function createDocumentSelector(languages: string[]): DocumentFilter[] {
  return languages.map((language) => ({ scheme: 'file', language }));
}

export function getServerModulePath(extensionPath: string): string {
  return path.join(extensionPath, 'server', 'out', 'main.js');
}

export function createLanguageClientOptions(
  languages: string[],
  channel: vscode.OutputChannel
): LanguageClientOptions {
  return {
    documentSelector: createDocumentSelector(languages),
    outputChannel: channel,
    // このクライアントは設定変更を自ら同期するため、サーバー側の重複登録は不要。
    initializationOptions: { configurationSync: 'otakLsp' },
    synchronize: { configurationSection: 'otakLsp' },
  };
}

export class ExtensionClient {
  private configuration: Configuration;

  constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.loadConfiguration();
  }

  private getDefaultConfiguration(): Configuration {
    return {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      excludeTableDelimiters: true,
      markdown: { analyzeCodeBlocks: true, analyzeTables: true },
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'],
      debounceDelay: 250,
    };
  }

  loadConfiguration(resource?: vscode.Uri): void {
    // resource 指定時はその文書の実効値、未指定時は既定（グローバル相当）を読む。
    // 読者へ異なるスコープを同じ設定として表示しないための契約（Issue #19/#20）。
    const config = resource
      ? vscode.workspace.getConfiguration('otakLsp', resource)
      : vscode.workspace.getConfiguration('otakLsp');
    this.configuration = {
      enableGrammarCheck: config.get<boolean>('enableGrammarCheck') ?? this.configuration.enableGrammarCheck,
      enableSemanticHighlight: config.get<boolean>('enableSemanticHighlight') ?? this.configuration.enableSemanticHighlight,
      excludeTableDelimiters: config.get<boolean>('excludeTableDelimiters') ?? this.configuration.excludeTableDelimiters,
      markdown: {
        analyzeCodeBlocks: config.get<boolean>('markdown.analyzeCodeBlocks') ?? this.configuration.markdown.analyzeCodeBlocks,
        analyzeTables: config.get<boolean>('markdown.analyzeTables') ?? this.configuration.markdown.analyzeTables,
      },
      targetLanguages: config.get<SupportedLanguage[]>('targetLanguages') ?? this.configuration.targetLanguages,
      debounceDelay: config.get<number>('debounceDelay') ?? this.configuration.debounceDelay,
    };
  }

  getConfiguration(): Configuration {
    return { ...this.configuration };
  }

  isTargetLanguage(languageId: string): boolean {
    return this.configuration.targetLanguages.includes(languageId as SupportedLanguage);
  }

  isGrammarCheckEnabled(): boolean {
    return this.configuration.enableGrammarCheck;
  }

  isSemanticHighlightEnabled(): boolean {
    return this.configuration.enableSemanticHighlight;
  }

  getTargetLanguages(): SupportedLanguage[] {
    return [...this.configuration.targetLanguages];
  }

  getDebounceDelay(): number {
    return this.configuration.debounceDelay;
  }
}

/** アクティブエディタの文書URI。設定の実効値は resource スコープで評価する（Issue #20） */
function getActiveResource(): vscode.Uri | undefined {
  return vscode.window.activeTextEditor?.document.uri;
}

/** アクティブ文書（無ければ無リソース）の実効ON/OFFを読む */
function readEffectiveEnableState(resource: vscode.Uri | undefined): { grammar: boolean; semantic: boolean } {
  const config = vscode.workspace.getConfiguration('otakLsp', resource);
  return {
    grammar: config.get<boolean>('enableGrammarCheck') ?? true,
    semantic: config.get<boolean>('enableSemanticHighlight') ?? true,
  };
}

type StatusKind = 'on' | 'off' | 'starting' | 'stopped' | 'error';

function buildStatusBarTooltip(kind: StatusKind, themeId: SemanticThemeId): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  // command link を有効にするための trust は、許可コマンドを明示列挙して最小権限に限定する。
  // 任意コマンド実行を許す `isTrusted = true` は使わない。
  tooltip.isTrusted = {
    enabledCommands: ['otakLsp.toggle', 'otakLsp.selectTheme', 'otakLsp.restartServer', 'workbench.action.openSettings'],
  };

  tooltip.appendMarkdown('### otak-lsp\n\n');
  tooltip.appendMarkdown('Japanese Grammar Analyzer\n\n');

  switch (kind) {
    case 'error':
      tooltip.appendMarkdown('サーバーの起動に失敗しました\n\n');
      tooltip.appendMarkdown('---\n\n');
      tooltip.appendMarkdown('[サーバーを再起動](command:otakLsp.restartServer)\n\n');
      break;
    case 'starting':
      tooltip.appendMarkdown('起動中...\n\n');
      break;
    case 'stopped':
      tooltip.appendMarkdown('サーバーが停止しています\n\n');
      tooltip.appendMarkdown('---\n\n');
      tooltip.appendMarkdown('[サーバーを再起動](command:otakLsp.restartServer)\n\n');
      break;
    case 'on':
      tooltip.appendMarkdown(`テーマ: ${SEMANTIC_THEMES[themeId].name}\n\n`);
      tooltip.appendMarkdown('---\n\n');
      tooltip.appendMarkdown('[テーマ設定](command:otakLsp.selectTheme) | [ルール設定](command:workbench.action.openSettings?"otakLsp")\n\n');
      break;
    case 'off':
      tooltip.appendMarkdown('---\n\n');
      tooltip.appendMarkdown('[有効化](command:otakLsp.toggle)\n\n');
      break;
  }

  return tooltip;
}

/**
 * ステータスバーを現在の「実態」で再描画する。
 * 表示状態 = 設定上のON/OFF（アクティブ文書の実効値）× サーバー起動状態の組合せ。
 * 起動失敗は設定値に関わらず最優先で表示する（Issue #19）。
 */
function refreshStatusBar(): void {
  if (!statusBarItem) {
    return;
  }
  const { grammar, semantic } = readEffectiveEnableState(getActiveResource());
  const enabled = grammar || semantic;

  let kind: StatusKind;
  if (serverStartFailed) {
    kind = 'error';
  } else if (!enabled) {
    kind = 'off';
  } else if (serverState === 'starting') {
    kind = 'starting';
  } else if (serverState === 'stopped') {
    kind = 'stopped';
  } else {
    kind = 'on';
  }

  switch (kind) {
    case 'error':
      statusBarItem.text = '$(error) otak-lsp: エラー';
      statusBarItem.command = 'otakLsp.restartServer';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
      break;
    case 'starting':
      statusBarItem.text = '$(loading~spin) otak-lsp: 起動中';
      statusBarItem.command = 'otakLsp.restartServer';
      statusBarItem.backgroundColor = undefined;
      break;
    case 'stopped':
      statusBarItem.text = '$(debug-stop) otak-lsp: 停止';
      statusBarItem.command = 'otakLsp.restartServer';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'off':
      statusBarItem.text = '$(circle-slash) otak-lsp: OFF';
      statusBarItem.command = 'otakLsp.toggle';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      break;
    case 'on':
      statusBarItem.text = '$(check) otak-lsp: ON';
      statusBarItem.command = 'otakLsp.toggle';
      statusBarItem.backgroundColor = undefined;
      break;
  }

  statusBarItem.tooltip = buildStatusBarTooltip(kind, currentThemeId);
  // スクリーンリーダー向けに、現在の状態とクリック時の挙動を明示する。
  const labels: Record<StatusKind, string> = {
    on: 'otak-lsp は有効です。アクティブにすると無効に切り替えます。',
    off: 'otak-lsp は無効です。アクティブにすると有効に切り替えます。',
    starting: 'otak-lsp のサーバーは起動中です。アクティブにすると再起動します。',
    stopped: 'otak-lsp のサーバーは停止しています。アクティブにすると再起動します。',
    error: 'otak-lsp のサーバー起動に失敗しました。アクティブにすると再起動します。',
  };
  statusBarItem.accessibilityInformation = { label: labels[kind], role: 'button' };
}

/**
 * 指定キーの更新先スコープを決める（Issue #20 の局所性契約）。
 * - 文書が属するフォルダーに既存の上書き値がある → WorkspaceFolder（そのまま上書き）
 * - 文書がワークスペース内にある（フォルダー上書きなし）→ Workspace
 *   （Global値が存在しても、ワークスペース内の操作をGlobalへ拡大しない）
 * - 文書がワークスペース外 / エディタなし → Global
 * 文書ごとの resource には触れず、設定の所有者スコープ単位で読み書きする。
 */
function pickEnableUpdateTarget(
  inspection: { workspaceFolderValue?: unknown } | undefined,
  resource: vscode.Uri | undefined
): vscode.ConfigurationTarget {
  const folder = resource ? vscode.workspace.getWorkspaceFolder(resource) : undefined;
  if (folder && inspection?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }
  if (folder) {
    return vscode.ConfigurationTarget.Workspace;
  }
  if (resource) {
    // 文書がワークスペース外: Workspace 値はこの文書に効かない
    return vscode.ConfigurationTarget.Global;
  }
  return getConfigUpdateTarget();
}

/**
 * スコープの所有者キー。folder はワークスペースフォルダーURIで識別する
 * （同一フォルダー内の文書は同じ folder 設定を共有する）。
 */
function getScopeOwnerKey(target: vscode.ConfigurationTarget, resource: vscode.Uri | undefined): string {
  if (target === vscode.ConfigurationTarget.WorkspaceFolder) {
    const folder = resource ? vscode.workspace.getWorkspaceFolder(resource) : undefined;
    return `folder:${folder?.uri.toString() ?? resource?.toString() ?? ''}`;
  }
  if (target === vscode.ConfigurationTarget.Workspace) {
    return 'workspace';
  }
  return 'global';
}

/**
 * ON/OFF 切り替え。
 * - resource はコマンド呼出し時点で固定する（queue 待ち中のエディタ切替で
 *   別文書の設定を書き換えない）。
 * - 各キーは「その値を所有するスコープ」へ書く。OFF 時は owner スコープ別に
 *   現在値を保存し、ON 時は同じ owner キーで復元する（未保存なら true）。
 *   grammar/semantic が別スコープに属していても互いの値を混ぜない。
 * - 更新失敗時は実際の設定を再読して表示する（部分適用を偽らない）。
 */
async function toggleEnabled(): Promise<void> {
  const resource = getActiveResource();
  const run = toggleChain.then(() => doToggleEnabled(resource));
  toggleChain = run.then(() => undefined, () => undefined);
  return run;
}

async function doToggleEnabled(resource: vscode.Uri | undefined): Promise<void> {
  const config = vscode.workspace.getConfiguration('otakLsp', resource);
  const { grammar, semantic } = readEffectiveEnableState(resource);
  const enabled = grammar || semantic;

  const grammarTarget = pickEnableUpdateTarget(config.inspect<boolean>('enableGrammarCheck'), resource);
  const semanticTarget = pickEnableUpdateTarget(config.inspect<boolean>('enableSemanticHighlight'), resource);
  const grammarMemKey = `${getScopeOwnerKey(grammarTarget, resource)}|enableGrammarCheck`;
  const semanticMemKey = `${getScopeOwnerKey(semanticTarget, resource)}|enableSemanticHighlight`;

  try {
    let message: string;
    if (enabled) {
      previousEnableValues.set(grammarMemKey, grammar);
      previousEnableValues.set(semanticMemKey, semantic);
      await Promise.all([
        config.update('enableGrammarCheck', false, grammarTarget),
        config.update('enableSemanticHighlight', false, semanticTarget),
      ]);
      message = 'otak-lspを無効にしました';
    } else {
      const nextGrammar = previousEnableValues.get(grammarMemKey) ?? true;
      const nextSemantic = previousEnableValues.get(semanticMemKey) ?? true;
      await Promise.all([
        config.update('enableGrammarCheck', nextGrammar, grammarTarget),
        config.update('enableSemanticHighlight', nextSemantic, semanticTarget),
      ]);
      message = 'otak-lspを有効にしました';
    }
    // 適用したスコープを利用者に明示する
    const scopeText = grammarTarget === semanticTarget
      ? scopeLabel(grammarTarget)
      : `${scopeLabel(grammarTarget)}/${scopeLabel(semanticTarget)}`;
    refreshStatusBar();
    outputChannel?.appendLine(`${message}（${scopeText}）`);
    vscode.window.setStatusBarMessage(`${message}（${scopeText}）`, 2000);
  } catch (error) {
    outputChannel?.appendLine(`Failed to update configuration: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: 設定の更新に失敗しました');
    refreshStatusBar();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * semanticTokenColorCustomizations の更新先スコープを決める。
 * そのキーを既に所有している最も具体的なスコープへ書く。未設定なら Global。
 * いずれの場合も「選んだスコープの生値」を基準にマージし、
 * 他スコープ由来の実効値をコピーしない（Issue #22）。
 */
function pickSemanticCustomizationTarget(
  inspection: { workspaceFolderValue?: unknown; workspaceValue?: unknown; globalValue?: unknown } | undefined,
  resource: vscode.Uri | undefined
): { target: vscode.ConfigurationTarget; rawValue: unknown } {
  if (resource && inspection?.workspaceFolderValue !== undefined) {
    return { target: vscode.ConfigurationTarget.WorkspaceFolder, rawValue: inspection.workspaceFolderValue };
  }
  if (inspection?.workspaceValue !== undefined) {
    return { target: vscode.ConfigurationTarget.Workspace, rawValue: inspection.workspaceValue };
  }
  return { target: vscode.ConfigurationTarget.Global, rawValue: inspection?.globalValue };
}

function scopeLabel(target: vscode.ConfigurationTarget): string {
  switch (target) {
    case vscode.ConfigurationTarget.Workspace:
      return 'ワークスペース設定';
    case vscode.ConfigurationTarget.WorkspaceFolder:
      return 'ワークスペースフォルダー設定';
    default:
      return 'ユーザー設定';
  }
}

/** VS Codeのテーマ指定は複数名と先頭・末尾のワイルドカードに対応する。 */
function matchesThemeScope(scope: string, themeName: string): boolean {
  if (!/^(?:\[[^\]]+\])+$/.test(scope)) return false;
  return [...scope.matchAll(/\[([^\]]+)\]/g)].some(match => {
    const pattern = match[1];
    const anyPrefix = pattern.startsWith('*');
    const anySuffix = pattern.endsWith('*');
    const name = pattern.slice(anyPrefix ? 1 : 0, anySuffix ? -1 : undefined);
    if (anyPrefix && anySuffix) return themeName.includes(name);
    if (anyPrefix) return themeName.endsWith(name);
    if (anySuffix) return themeName.startsWith(name);
    return themeName === name;
  });
}

async function applySemanticTheme(themeId: SemanticThemeId): Promise<void> {
  const theme = SEMANTIC_THEMES[themeId];
  if (!theme) {
    return;
  }

  const resource = getActiveResource();
  const config = vscode.workspace.getConfiguration('editor', resource);
  const inspection = config.inspect<Record<string, unknown>>('semanticTokenColorCustomizations');
  const { target, rawValue } = pickSemanticCustomizationTarget(inspection, resource);

  // ユーザーが設定済みの他トークンの rules を消さないよう、既存 rules を維持したまま
  // otak-lsp が管理する5品詞のキーだけを上書きする（設定の非破壊マージ）。
  // 基準は選んだスコープの生値であり、実効値（get()）ではない。
  const base = isRecord(rawValue) ? rawValue : {};
  const existingRules = isRecord(base.rules) ? base.rules : {};

  const newCustomizations = {
    ...base,
    rules: {
      ...existingRules,
      noun: { foreground: theme.colors.noun },
      verb: { foreground: theme.colors.verb },
      adjective: { foreground: theme.colors.adjective },
      particle: { foreground: theme.colors.particle },
      adverb: { foreground: theme.colors.adverb },
    },
  };

  await config.update('semanticTokenColorCustomizations', newCustomizations, target);

  currentThemeId = themeId;
  refreshStatusBar();
  outputChannel?.appendLine(`Semantic theme changed to: ${theme.name} (${scopeLabel(target)})`);

  // 配色テーマ固有ブロック `"[テーマ名]".rules` は一般 rules より優先される。
  // それが管理キーを上書きしている場合、更新完了表示に反して色が変わらないため警告する。
  const colorThemeName = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');
  if (colorThemeName) {
    const effective = config.get<Record<string, unknown>>('semanticTokenColorCustomizations') ?? {};
    const overridden = Object.entries(effective).some(([scope, block]) =>
      matchesThemeScope(scope, colorThemeName) && isRecord(block) && isRecord(block.rules)
      && Object.keys(block.rules).some(rule => {
        const tokenType = rule.split(/[.:]/)[0];
        return tokenType === '*' || MANAGED_RULE_KEYS.some(key => key === tokenType);
      })
    );
    if (overridden) {
      outputChannel?.appendLine(`Theme-specific override detected: "[${colorThemeName}]" ブロックが otak-lsp の色を上書きしています`);
      vscode.window.showWarningMessage(
        `otak-lsp: 配色テーマ「${colorThemeName}」固有の semanticTokenColorCustomizations が設定した色を上書きしています。` +
        `反映するには settings.json の "[${colorThemeName}]" ブロックを編集してください`
      );
    }
  }
}

function createServerOptions(extensionPath: string): ServerOptions {
  const serverModule = getServerModulePath(extensionPath);
  // サーバープロセスのヒープ上限を明示的に引き上げる。
  // VSCode が同梱する Node のバージョンによって既定の old-space 上限は 2GB〜4GB と
  // ばらつき、一時的なメモリスパイク（再起動直後の全文書再同期など）で OOM し得る。
  // 明示指定により全環境で一定の余裕を確保し、5 連続クラッシュによる恒久停止を避ける。
  const serverExecArgv = ['--max-old-space-size=6144'];
  return {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: serverExecArgv,
      },
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: [...serverExecArgv, '--nolazy', '--inspect=6009'],
      },
    },
  };
}

function setupStatusBar(context: vscode.ExtensionContext): void {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.name = 'otak-lsp - Japanese Grammar Analyzer';
  statusBarItem.text = '$(loading~spin) otak-lsp';
  statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n起動中...';
  statusBarItem.command = 'otakLsp.toggle';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

async function selectThemeInteractively(): Promise<void> {
  const themeIds: SemanticThemeId[] = ['default', 'pastel', 'vivid', 'monochrome', 'nature'];
  const items = themeIds.map((id) => {
    const theme = SEMANTIC_THEMES[id];
    return {
      label: id === currentThemeId ? `$(check) ${theme.name}` : theme.name,
      description: theme.description,
      themeId: id,
    };
  });

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'セマンティックハイライトのテーマを選択',
  });

  if (selected) {
    await applySemanticTheme(selected.themeId);
    vscode.window.setStatusBarMessage(`テーマを「${SEMANTIC_THEMES[selected.themeId].name}」に変更しました`, 2000);
  }
}

function showCurrentStatus(): void {
  // 起動時のスナップショットではなく、実行時点の最新設定を読む（Issue #19）。
  // Configuration JSON もアクティブ文書の実効値で揃える（Issue #20）。
  const resource = getActiveResource();
  extensionClient?.loadConfiguration(resource);
  const configuration = extensionClient?.getConfiguration();
  const { grammar, semantic } = readEffectiveEnableState(resource);
  const resourceConfig = vscode.workspace.getConfiguration('otakLsp', resource);
  const targetLanguages = resourceConfig.get<SupportedLanguage[]>('targetLanguages') ?? [];

  outputChannel?.show();
  outputChannel?.appendLine('--- Status ---');
  outputChannel?.appendLine(`Enabled (effective): ${grammar || semantic} (grammar=${grammar}, semantic=${semantic})`);
  outputChannel?.appendLine(
    `Server state: ${serverStartFailed ? 'error' : serverState}${client ? ` (client.state=${client.state})` : ''}`
  );
  outputChannel?.appendLine(
    `Debug log: ${resourceConfig.get<boolean>('debugLog') ?? false} (設定 otakLsp.debugLog または環境変数 OTAK_LSP_DEBUG=1 で有効化)`
  );
  outputChannel?.appendLine(`Configuration: ${JSON.stringify(configuration, null, 2)}`);

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    outputChannel?.appendLine(`Active file: ${editor.document.uri.fsPath}`);
    outputChannel?.appendLine(`Language ID: ${editor.document.languageId}`);
    outputChannel?.appendLine(
      `Is target language: ${targetLanguages.includes(editor.document.languageId as SupportedLanguage)}`
    );
  } else {
    outputChannel?.appendLine('No active editor');
  }

  vscode.window.showInformationMessage('otak-lsp: ステータスを出力パネルに表示しました');
}

/**
 * otakLsp/analyzeDocument の応答を利用者向けメッセージへ変換する。
 * 「受理」「完了」「スキップ/拒否/失敗/中断」を混同しない（Issue #21）。
 */
function describeManualAnalysisResult(result: AnalyzeDocumentResult | undefined | null): {
  level: 'info' | 'warning' | 'error';
  message: string;
} {
  if (result?.ok && result.status === 'completed') {
    const count = typeof result.diagnostics === 'number' ? result.diagnostics : 0;
    return { level: 'info', message: `otak-lsp: 再解析しました（指摘 ${count} 件）` };
  }

  switch (result?.status) {
    case 'skipped':
      switch (result.reason) {
        case 'disabled':
          return { level: 'warning', message: 'otak-lsp: このファイルでは機能が無効化されています（otakLsp.enableGrammarCheck / enableSemanticHighlight）' };
        case 'not-target-language':
          return { level: 'warning', message: 'otak-lsp: この言語は解析対象ではありません（otakLsp.targetLanguages）' };
        case 'document-too-large':
          return { level: 'warning', message: 'otak-lsp: ファイルが otakLsp.maxDocumentChars を超えているため解析をスキップしました' };
        default:
          return { level: 'warning', message: `otak-lsp: 解析をスキップしました（${result.reason ?? '不明な理由'}）` };
      }
    case 'rejected':
      if (result.reason === 'unknown-document') {
        return { level: 'warning', message: 'otak-lsp: このファイルは解析対象として認識されていません' };
      }
      return { level: 'warning', message: `otak-lsp: 解析要求が拒否されました（${result.reason ?? '不明な理由'}）` };
    case 'failed':
      if (result.reason === 'timeout') {
        return { level: 'error', message: 'otak-lsp: 解析がタイムアウトしました' };
      }
      return { level: 'error', message: `otak-lsp: 解析に失敗しました${result.reason ? `: ${result.reason}` : ''}` };
    case 'cancelled':
      return { level: 'warning', message: 'otak-lsp: 解析は中断されました（文書の編集・クローズなど）' };
    default:
      return { level: 'warning', message: 'otak-lsp: 解析対象として認識されていません' };
  }
}

async function analyzeCurrentFile(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('ファイルが開かれていません');
    return;
  }

  if (!client) {
    vscode.window.showWarningMessage('otak-lsp: Language Server が起動していません');
    return;
  }

  const uri = editor.document.uri.toString();
  outputChannel?.appendLine(`Manual analysis requested for: ${editor.document.uri.fsPath}`);

  try {
    // サーバに全ルール解析を要求し、解析の実際の終端（完了/スキップ/失敗/中断）を受け取る。
    const result = await client.sendRequest<AnalyzeDocumentResult>('otakLsp/analyzeDocument', { uri });
    const described = describeManualAnalysisResult(result);
    if (described.level === 'info') {
      vscode.window.setStatusBarMessage(described.message, 3000);
    } else if (described.level === 'warning') {
      vscode.window.showWarningMessage(described.message);
    } else {
      vscode.window.showErrorMessage(described.message);
    }
    outputChannel?.appendLine(`Manual analysis result: ${JSON.stringify(result)}`);
  } catch (error) {
    outputChannel?.appendLine(`Manual analysis failed: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: 解析リクエストに失敗しました');
  }
}

function noticeReasonLabel(reason?: string): string {
  switch (reason) {
    case 'document-too-large':
      return '文書が otakLsp.maxDocumentChars を超過';
    case 'disabled':
      return 'この文書では機能が無効';
    case 'not-target-language':
      return '対象外の言語';
    default:
      return reason ?? '不明な理由';
  }
}

function describeAnalysisNotice(notice: AnalysisNotice): string {
  switch (notice.kind) {
    case 'analysis-skipped':
      return `解析をスキップしました（${noticeReasonLabel(notice.reason)}）`;
    case 'diagnostics-truncated':
      return `診断が上限を超えたため ${notice.omitted ?? '?'} 件を省略しました（全 ${notice.total ?? '?'} 件）`;
    case 'analysis-failed':
      return `解析に失敗しました${notice.reason ? `: ${notice.reason}` : ''}`;
    default:
      return `解析通知: ${notice.kind}`;
  }
}

/**
 * サーバーからの解析通知。理由は必ず出力パネルに全件記録する。
 * 同一文書・同一 kind で内容（reason/omitted/total の署名）が変わらない再通知は
 * 表示を抑止し、内容が変化した通知は新しい情報として再表示する。
 */
function handleAnalysisNotice(notice: AnalysisNotice): void {
  if (!notice || typeof notice.uri !== 'string') {
    return;
  }
  const message = describeAnalysisNotice(notice);
  outputChannel?.appendLine(`[analysis-notice] ${notice.uri}: ${message}`);

  const signature = `${notice.reason ?? ''}|${notice.omitted ?? ''}|${notice.total ?? ''}`;
  let byKind = noticeHistory.get(notice.uri);
  if (!byKind) {
    byKind = new Map<string, string>();
    noticeHistory.set(notice.uri, byKind);
    // 明示的な有限上限: 最も古い文書から順に破棄する
    while (noticeHistory.size > NOTICE_HISTORY_LIMIT) {
      const oldest = noticeHistory.keys().next().value;
      if (oldest === undefined) break;
      noticeHistory.delete(oldest);
    }
  }
  if (byKind.get(notice.kind) === signature) {
    return; // 同一内容の再通知は表示しない（出力パネルには記録済み）
  }
  byKind.set(notice.kind, signature);

  if (notice.kind === 'analysis-failed') {
    void vscode.window
      .showWarningMessage(`otak-lsp: ${message}`, '出力パネルを開く')
      .then((choice) => {
        if (choice) {
          outputChannel?.show();
        }
      });
  } else {
    vscode.window.setStatusBarMessage(`otak-lsp: ${message}`, 8000);
  }
}

/** Issue #24: 修正候補の説明を表示するだけのコマンド（文字列の自動置換は行わない） */
function showSuggestion(suggestion?: unknown): void {
  const text = typeof suggestion === 'string' ? suggestion : '';
  outputChannel?.appendLine(`修正案: ${text || '(なし)'}`);
  if (text) {
    vscode.window.showInformationMessage(`修正案: ${text}`);
  } else {
    vscode.window.showInformationMessage('otak-lsp: この診断には修正案の説明がありません');
  }
}

function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('otakLsp.toggle', toggleEnabled),
    // Issue #18: 引数なし（コマンドパレット/キーバインド等）でも例外にせず、
    // テーマ選択を開く。無効IDは警告のみ。キャンセルは何もしない。
    vscode.commands.registerCommand('otakLsp.setTheme', async (themeId?: SemanticThemeId) => {
      if (themeId === undefined || themeId === null) {
        await selectThemeInteractively();
        return;
      }
      if (typeof themeId !== 'string' || !Object.prototype.hasOwnProperty.call(SEMANTIC_THEMES, themeId)) {
        vscode.window.showWarningMessage(`otak-lsp: 不明なテーマIDです: ${String(themeId)}`);
        return;
      }
      try {
        await applySemanticTheme(themeId);
        vscode.window.setStatusBarMessage(`テーマを「${SEMANTIC_THEMES[themeId].name}」に変更しました`, 2000);
      } catch (error) {
        outputChannel?.appendLine(`Failed to apply theme: ${error}`);
        vscode.window.showErrorMessage('otak-lsp: テーマの適用に失敗しました');
      }
    }),
    vscode.commands.registerCommand('otakLsp.selectTheme', selectThemeInteractively),
    vscode.commands.registerCommand('otakLsp.showStatus', showCurrentStatus),
    vscode.commands.registerCommand('otakLsp.analyzeCurrentFile', analyzeCurrentFile),
    // Issue #19: エラー時「クリックで再試行」が実際に呼ぶ復旧コマンド。
    // start/stop はライフサイクルチェーンで直列化される。
    vscode.commands.registerCommand('otakLsp.restartServer', () => enqueueLifecycle(restartLanguageClient)),
    vscode.commands.registerCommand('otakLsp.showSuggestion', showSuggestion)
  );
}

/**
 * Language Client を起動する。状態（起動中/実行中/失敗）は
 * 設定上のON/OFFとは独立に記録し、表示は refreshStatusBar に集約する。
 */
async function startLanguageClient(): Promise<void> {
  if (!client) {
    return;
  }
  serverState = 'starting';
  refreshStatusBar();
  try {
    await client.start();
    serverState = 'running';
    serverStartFailed = false;
    outputChannel?.appendLine('Language Server started successfully');
  } catch (error) {
    serverState = 'stopped';
    serverStartFailed = true;
    outputChannel?.appendLine(`Failed to start Language Server: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: Language Serverの起動に失敗しました');
  }
  refreshStatusBar();
}

async function restartLanguageClient(): Promise<void> {
  if (!client) {
    return;
  }
  try {
    await client.stop();
  } catch (error) {
    // 停止を確認できないまま新規起動は試みない。明示的な失敗終端とし、
    // エラー表示（再起動導線）で利用者の再試行を受け付ける。
    serverState = 'stopped';
    serverStartFailed = true;
    outputChannel?.appendLine(`Failed to stop Language Server: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: Language Serverの停止に失敗しました');
    refreshStatusBar();
    return;
  }
  serverState = 'stopped';
  refreshStatusBar();
  await startLanguageClient();
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('otak-lsp');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('otak-lsp is starting...');
  outputChannel.appendLine('Using kuromoji.js (no external dependencies required)');

  setupStatusBar(context);

  extensionClient = new ExtensionClient();

  const serverOptions = createServerOptions(context.extensionPath);
  // 同期対象は全対応言語とし、フォルダー・文書ごとの対象言語設定をサーバーで判定する。
  const clientOptions = createLanguageClientOptions(SUPPORTED_LANGUAGES, outputChannel);

  client = new LanguageClient(
    'otakLsp',
    'otak-lsp - Japanese Grammar Analyzer',
    serverOptions,
    clientOptions
  );

  // Issue #19: 実行中の起動/停止を購読し、実際の client 状態を表示へ反映する。
  context.subscriptions.push(
    client.onDidChangeState((event) => {
      serverState =
        event.newState === State.Running ? 'running'
        : event.newState === State.Starting ? 'starting'
        : 'stopped';
      refreshStatusBar();
    })
  );

  // Issue #23: 解析スキップ/診断打ち切り/解析失敗の通知。
  client.onNotification('otakLsp/analysisNotice', handleAnalysisNotice);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('otakLsp')) {
        extensionClient?.loadConfiguration(getActiveResource());
        refreshStatusBar();
        outputChannel?.appendLine('Configuration changed');
      }
    }),
    // Issue #20: 文書を切り替えたら、その文書の実効値で表示を更新する。
    vscode.window.onDidChangeActiveTextEditor(() => refreshStatusBar()),
    // Issue #23: 文書クローズで通知履歴を破棄する（再オープン時は新たに通知できる）。
    vscode.workspace.onDidCloseTextDocument((doc) => {
      noticeHistory.delete(doc.uri.toString());
    })
  );

  // ステータスバーのクリック先コマンドを起動完了前から有効にするため、
  // コマンド登録は start の前に行う。
  registerCommands(context);

  await enqueueLifecycle(startLanguageClient);

  context.subscriptions.push({
    dispose: () => {
      if (client) {
        client.stop();
      }
    },
  });

  outputChannel.appendLine('otak-lsp is now active');
  outputChannel.appendLine('Commands available: otakLsp.showStatus, otakLsp.analyzeCurrentFile');
}

export function deactivate(): Thenable<void> | undefined {
  if (outputChannel) {
    outputChannel.appendLine('otak-lsp is deactivating...');
  }
  noticeHistory.clear();
  if (!client) {
    return undefined;
  }
  return client.stop();
}

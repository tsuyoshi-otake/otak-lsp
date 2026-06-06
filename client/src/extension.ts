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
  TransportKind,
} from 'vscode-languageclient/node';
import * as path from 'path';
import { SemanticThemeId, SEMANTIC_THEMES } from '../../shared/src/types';

type SupportedLanguage = 'markdown' | 'javascript' | 'typescript' | 'python' | 'c' | 'cpp' | 'java' | 'rust' | 'plaintext';

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

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let statusBarItem: vscode.StatusBarItem | undefined;
let isEnabled: boolean = true;
let currentThemeId: SemanticThemeId = 'pastel';

function getConfigUpdateTarget(): vscode.ConfigurationTarget {
  const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;
  return hasWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global;
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
    synchronize: {
      configurationSection: ['otakLsp', 'otakLsp.advanced'],
    },
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

  loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('otakLsp');
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

function buildStatusBarTooltip(enabled: boolean, themeId: SemanticThemeId): vscode.MarkdownString {
  const tooltip = new vscode.MarkdownString();
  tooltip.isTrusted = true;
  tooltip.supportHtml = true;

  tooltip.appendMarkdown('### otak-lsp\n\n');
  tooltip.appendMarkdown('Japanese Grammar Analyzer\n\n');

  if (enabled) {
    tooltip.appendMarkdown(`テーマ: ${SEMANTIC_THEMES[themeId].name}\n\n`);
    tooltip.appendMarkdown('---\n\n');
    tooltip.appendMarkdown('[テーマ設定](command:otakLsp.selectTheme) | [ルール設定](command:workbench.action.openSettings?"otakLsp")\n\n');
  } else {
    tooltip.appendMarkdown('---\n\n');
    tooltip.appendMarkdown('[有効化](command:otakLsp.toggle)\n\n');
  }

  return tooltip;
}

function updateStatusBar(enabled: boolean): void {
  if (!statusBarItem) {
    return;
  }
  isEnabled = enabled;

  statusBarItem.text = enabled ? '$(check) otak-lsp: ON' : '$(circle-slash) otak-lsp: OFF';
  statusBarItem.backgroundColor = enabled
    ? undefined
    : new vscode.ThemeColor('statusBarItem.warningBackground');
  statusBarItem.tooltip = buildStatusBarTooltip(enabled, currentThemeId);
}

async function applySemanticTheme(themeId: SemanticThemeId): Promise<void> {
  const theme = SEMANTIC_THEMES[themeId];
  if (!theme) {
    return;
  }

  currentThemeId = themeId;
  const config = vscode.workspace.getConfiguration('editor');
  const currentCustomizations = config.get<Record<string, unknown>>('semanticTokenColorCustomizations') || {};

  const newCustomizations = {
    ...currentCustomizations,
    rules: {
      noun: { foreground: theme.colors.noun },
      verb: { foreground: theme.colors.verb },
      adjective: { foreground: theme.colors.adjective },
      particle: { foreground: theme.colors.particle },
      adverb: { foreground: theme.colors.adverb },
    },
  };

  await config.update('semanticTokenColorCustomizations', newCustomizations, vscode.ConfigurationTarget.Global);

  updateStatusBar(isEnabled);
  outputChannel?.appendLine(`Semantic theme changed to: ${theme.name}`);
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
  statusBarItem.text = '$(loading~spin) otak-lsp';
  statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n起動中...';
  statusBarItem.command = 'otakLsp.toggle';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

async function toggleEnabled(): Promise<void> {
  const newState = !isEnabled;
  const config = vscode.workspace.getConfiguration('otakLsp');
  const target = getConfigUpdateTarget();

  try {
    await Promise.all([
      config.update('enableGrammarCheck', newState, target),
      config.update('enableSemanticHighlight', newState, target),
    ]);

    updateStatusBar(newState);
    const message = newState ? 'otak-lspを有効にしました' : 'otak-lspを無効にしました';
    outputChannel?.appendLine(message);
    vscode.window.setStatusBarMessage(message, 2000);
  } catch (error) {
    outputChannel?.appendLine(`Failed to update configuration: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: 設定の更新に失敗しました');
  }
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

function showCurrentStatus(extensionClient: ExtensionClient, configuration: Configuration): void {
  outputChannel?.show();
  outputChannel?.appendLine('--- Status ---');
  outputChannel?.appendLine(`Enabled: ${isEnabled}`);
  outputChannel?.appendLine(`Client state: ${client?.state}`);
  outputChannel?.appendLine(`Configuration: ${JSON.stringify(configuration, null, 2)}`);

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    outputChannel?.appendLine(`Active file: ${editor.document.uri.fsPath}`);
    outputChannel?.appendLine(`Language ID: ${editor.document.languageId}`);
    outputChannel?.appendLine(`Is target language: ${extensionClient.isTargetLanguage(editor.document.languageId)}`);
  } else {
    outputChannel?.appendLine('No active editor');
  }

  vscode.window.showInformationMessage('otak-lsp: ステータスを出力パネルに表示しました');
}

function analyzeCurrentFile(): void {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage('ファイルが開かれていません');
    return;
  }

  outputChannel?.appendLine(`Manual analysis requested for: ${editor.document.uri.fsPath}`);
  if (client) {
    const text = editor.document.getText();
    outputChannel?.appendLine(`Document length: ${text.length} characters`);
    outputChannel?.appendLine(`First 100 chars: ${text.substring(0, 100)}`);
    vscode.window.showInformationMessage('otak-lsp: 解析をリクエストしました。出力パネルを確認してください。');
  }
}

function registerCommands(
  context: vscode.ExtensionContext,
  extensionClient: ExtensionClient,
  configuration: Configuration
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('otakLsp.toggle', toggleEnabled),
    vscode.commands.registerCommand('otakLsp.setTheme', async (themeId: SemanticThemeId) => {
      await applySemanticTheme(themeId);
      vscode.window.setStatusBarMessage(`テーマを「${SEMANTIC_THEMES[themeId].name}」に変更しました`, 2000);
    }),
    vscode.commands.registerCommand('otakLsp.selectTheme', selectThemeInteractively),
    vscode.commands.registerCommand('otakLsp.showStatus', () => showCurrentStatus(extensionClient, configuration)),
    vscode.commands.registerCommand('otakLsp.analyzeCurrentFile', analyzeCurrentFile)
  );
}

async function startLanguageClient(initialEnabled: boolean): Promise<void> {
  if (!client || !outputChannel) {
    return;
  }
  try {
    await client.start();
    outputChannel.appendLine('Language Server started successfully');
    updateStatusBar(initialEnabled);
  } catch (error) {
    outputChannel.appendLine(`Failed to start Language Server: ${error}`);
    vscode.window.showErrorMessage('otak-lsp: Language Serverの起動に失敗しました');
    if (statusBarItem) {
      statusBarItem.text = '$(error) otak-lsp: エラー';
      statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n起動に失敗しました\nクリックで再試行';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  outputChannel = vscode.window.createOutputChannel('otak-lsp');
  context.subscriptions.push(outputChannel);
  outputChannel.appendLine('otak-lsp is starting...');
  outputChannel.appendLine('Using kuromoji.js (no external dependencies required)');

  setupStatusBar(context);

  const extensionClient = new ExtensionClient();
  const configuration = extensionClient.getConfiguration();
  const initialEnabled = configuration.enableGrammarCheck || configuration.enableSemanticHighlight;

  const serverOptions = createServerOptions(context.extensionPath);
  const clientOptions = createLanguageClientOptions(configuration.targetLanguages, outputChannel);

  client = new LanguageClient(
    'otakLsp',
    'otak-lsp - Japanese Grammar Analyzer',
    serverOptions,
    clientOptions
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('otakLsp')) {
        extensionClient.loadConfiguration();
        const newConfig = extensionClient.getConfiguration();
        const enabled = newConfig.enableGrammarCheck || newConfig.enableSemanticHighlight;
        updateStatusBar(enabled);
        outputChannel?.appendLine(`Configuration changed: enabled=${enabled}`);
      }
    })
  );

  await startLanguageClient(initialEnabled);

  registerCommands(context, extensionClient, configuration);

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
  if (!client) {
    return undefined;
  }
  return client.stop();
}

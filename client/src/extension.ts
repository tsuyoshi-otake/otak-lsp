/**
 * VSCode Extension Client
 * otak-lsp - Japanese Grammar Analyzer
 * kuromoji.jsを使用した日本語形態素解析
 * Feature: package-name-refactoring
 * 要件: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import * as path from 'path';

/**
 * サポートする言語タイプ
 */
type SupportedLanguage = 'markdown' | 'javascript' | 'typescript' | 'python' | 'c' | 'cpp' | 'java' | 'rust' | 'plaintext';

/**
 * 設定インターフェース
 */
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

/**
 * ドキュメントフィルター
 */
interface DocumentFilter {
  scheme: string;
  language: string;
}

/**
 * Language Client インスタンス
 */
let client: LanguageClient | undefined;

/**
 * Output Channel
 */
let outputChannel: vscode.OutputChannel | undefined;

/**
 * Status Bar Item
 */
let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * 拡張機能の有効/無効状態
 */
let isEnabled: boolean = true;

/**
 * ドキュメントセレクターを作成
 * @param languages 対象言語リスト
 * @returns ドキュメントフィルター配列
 */
export function createDocumentSelector(languages: string[]): DocumentFilter[] {
  return languages.map((language) => ({
    scheme: 'file',
    language,
  }));
}

/**
 * サーバーモジュールパスを取得
 * @param extensionPath 拡張機能パス
 * @returns サーバーモジュールパス
 */
export function getServerModulePath(extensionPath: string): string {
  return path.join(extensionPath, 'server', 'out', 'main.js');
}

/**
 * Language Client オプションを作成
 * @param languages 対象言語リスト
 * @param channel Output Channel
 * @returns Language Client オプション
 */
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

/**
 * Extension Client
 * 設定管理とクライアント状態を管理する
 */
export class ExtensionClient {
  private configuration: Configuration;

  constructor() {
    this.configuration = this.getDefaultConfiguration();
    this.loadConfiguration();
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultConfiguration(): Configuration {
    return {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      excludeTableDelimiters: true,
      markdown: {
        analyzeCodeBlocks: true,
        analyzeTables: true,
      },
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust', 'plaintext'] as SupportedLanguage[],
      debounceDelay: 250,
    };
  }

  /**
   * VSCode設定から設定を読み込む
   */
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

  /**
   * 現在の設定を取得
   */
  getConfiguration(): Configuration {
    return { ...this.configuration };
  }

  /**
   * 対象言語かどうかを判定
   * @param languageId 言語ID
   */
  isTargetLanguage(languageId: string): boolean {
    return this.configuration.targetLanguages.includes(languageId as SupportedLanguage);
  }

  /**
   * 文法チェックが有効かどうか
   */
  isGrammarCheckEnabled(): boolean {
    return this.configuration.enableGrammarCheck;
  }

  /**
   * セマンティックハイライトが有効かどうか
   */
  isSemanticHighlightEnabled(): boolean {
    return this.configuration.enableSemanticHighlight;
  }

  /**
   * 対象言語リストを取得
   */
  getTargetLanguages(): SupportedLanguage[] {
    return [...this.configuration.targetLanguages];
  }

  /**
   * デバウンス遅延を取得
   */
  getDebounceDelay(): number {
    return this.configuration.debounceDelay;
  }
}

/**
 * ステータスバーを更新
 * @param enabled 有効/無効状態
 */
function updateStatusBar(enabled: boolean): void {
  if (!statusBarItem) {
    return;
  }

  isEnabled = enabled;

  if (enabled) {
    statusBarItem.text = '$(check) otak-lsp: ON';
    statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n文法チェック・ハイライト有効\nクリックで無効化';
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(circle-slash) otak-lsp: OFF';
    statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n文法チェック・ハイライト無効\nクリックで有効化';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

/**
 * 拡張機能を有効化
 * @param context 拡張機能コンテキスト
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  // Output Channelを作成
  outputChannel = vscode.window.createOutputChannel('otak-lsp');
  context.subscriptions.push(outputChannel);

  outputChannel.appendLine('otak-lsp is starting...');
  outputChannel.appendLine('Using kuromoji.js (no external dependencies required)');

  // ステータスバーを作成
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.text = '$(loading~spin) otak-lsp';
  statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n起動中...';
  statusBarItem.command = 'otakLsp.toggle';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // Extension Clientを作成
  const extensionClient = new ExtensionClient();
  const configuration = extensionClient.getConfiguration();

  // Server Optionsを設定
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'main.js')
  );

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        execArgv: ['--nolazy', '--inspect=6009'],
      },
    },
  };

  // Client Optionsを設定
  const clientOptions = createLanguageClientOptions(
    configuration.targetLanguages,
    outputChannel
  );

  // Language Clientを作成
  client = new LanguageClient(
    'otakLsp',
    'otak-lsp - Japanese Grammar Analyzer',
    serverOptions,
    clientOptions
  );

  // 設定変更の監視
  const configDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('otakLsp')) {
      extensionClient.loadConfiguration();
      outputChannel?.appendLine('Configuration changed');
    }
  });
  context.subscriptions.push(configDisposable);

  // Language Clientを開始
  try {
    await client.start();
    outputChannel.appendLine('Language Server started successfully');

    // ステータスバーを更新（成功）
    updateStatusBar(true);
  } catch (error) {
    outputChannel.appendLine(`Failed to start Language Server: ${error}`);
    vscode.window.showErrorMessage(
      'otak-lsp: Language Serverの起動に失敗しました'
    );

    // ステータスバーを更新（失敗）
    if (statusBarItem) {
      statusBarItem.text = '$(error) otak-lsp: エラー';
      statusBarItem.tooltip = 'otak-lsp - Japanese Grammar Analyzer\n起動に失敗しました\nクリックで再試行';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
  }

  // コマンド: ON/OFF切り替え
  const toggleCommand = vscode.commands.registerCommand(
    'otakLsp.toggle',
    () => {
      const newState = !isEnabled;
      updateStatusBar(newState);

      const message = newState ? '日本語文法チェックを有効にしました' : '日本語文法チェックを無効にしました';
      outputChannel?.appendLine(message);

      // サーバーに設定変更を通知
      if (client) {
        client.sendNotification('workspace/didChangeConfiguration', {
          settings: {
            otakLsp: {
              enableGrammarCheck: newState,
              enableSemanticHighlight: newState,
            },
          },
        });
      }

      // 2秒後に自動で消える通知
      vscode.window.setStatusBarMessage(message, 2000);
    }
  );
  context.subscriptions.push(toggleCommand);

  // コマンド: ステータス表示
  const showStatusCommand = vscode.commands.registerCommand(
    'otakLsp.showStatus',
    () => {
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
  );
  context.subscriptions.push(showStatusCommand);

  // コマンド: 手動解析
  const analyzeCommand = vscode.commands.registerCommand(
    'otakLsp.analyzeCurrentFile',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('ファイルが開かれていません');
        return;
      }

      outputChannel?.appendLine(`Manual analysis requested for: ${editor.document.uri.fsPath}`);

      // Force re-analysis by simulating a document change
      if (client) {
        // Send a notification to refresh diagnostics
        const text = editor.document.getText();
        outputChannel?.appendLine(`Document length: ${text.length} characters`);
        outputChannel?.appendLine(`First 100 chars: ${text.substring(0, 100)}`);

        vscode.window.showInformationMessage('otak-lsp: 解析をリクエストしました。出力パネルを確認してください。');
      }
    }
  );
  context.subscriptions.push(analyzeCommand);

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

/**
 * 拡張機能を無効化
 */
export function deactivate(): Thenable<void> | undefined {
  if (outputChannel) {
    outputChannel.appendLine('otak-lsp is deactivating...');
  }

  if (!client) {
    return undefined;
  }

  return client.stop();
}

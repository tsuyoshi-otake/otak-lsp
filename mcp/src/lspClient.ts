import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { JsonRpcConnection, JsonRpcRequest } from './jsonRpc';
import { Diagnostic } from './types';

export interface AnalyzeRequest {
  text: string;
  languageId: string;
  uri: string;
  timeoutMs?: number;
}

export interface LspClientOptions {
  serverPath?: string;
  timeoutMs?: number;
  logger?: (message: string) => void;
}

type DiagnosticsWaiterEntry = {
  resolve: (value: Diagnostic[]) => void;
  reject: (error: Error) => void;
  timeoutId: NodeJS.Timeout;
};

export class DiagnosticsWaiter {
  private readonly pending = new Map<string, DiagnosticsWaiterEntry>();

  waitFor(uri: string, timeoutMs: number): Promise<Diagnostic[]> {
    const existing = this.pending.get(uri);
    if (existing) {
      clearTimeout(existing.timeoutId);
      existing.reject(new Error('既存の診断待機が上書きされました。'));
      this.pending.delete(uri);
    }

    return new Promise<Diagnostic[]>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(uri);
        reject(new Error(`診断の待機がタイムアウトしました: ${uri}`));
      }, timeoutMs);

      this.pending.set(uri, {
        resolve,
        reject,
        timeoutId
      });
    });
  }

  resolve(uri: string, diagnostics: Diagnostic[]): void {
    const entry = this.pending.get(uri);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timeoutId);
    this.pending.delete(uri);
    entry.resolve(diagnostics);
  }

  rejectAll(error: Error): void {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timeoutId);
      entry.reject(error);
    }
    this.pending.clear();
  }
}

type LspLaunchConfig = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
};

const DEFAULT_TIMEOUT_MS = 5000;
const MCP_DEBOUNCE_DELAY_MS = 0;
const MCP_TIERED_EXECUTION = {
  enabled: false,
  idleDelayMs: 1200
};

export class LspClient {
  private readonly options: LspClientOptions;
  private readonly diagnosticsWaiter = new DiagnosticsWaiter();
  private connection: JsonRpcConnection | null = null;
  private process: ChildProcessWithoutNullStreams | null = null;
  private readyPromise: Promise<void> | null = null;

  constructor(options: LspClientOptions = {}) {
    this.options = options;
  }

  async start(): Promise<void> {
    if (this.readyPromise) {
      return this.readyPromise;
    }

    this.readyPromise = this.startInternal();
    return this.readyPromise;
  }

  async stop(): Promise<void> {
    this.diagnosticsWaiter.rejectAll(new Error('LSPクライアントを停止しました。'));
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connection = null;
    this.readyPromise = null;
  }

  async analyzeText(request: AnalyzeRequest): Promise<Diagnostic[]> {
    await this.start();

    if (!this.connection) {
      throw new Error('LSP接続が初期化されていません。');
    }

    const timeoutMs = request.timeoutMs ?? this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const didOpenParams = {
      textDocument: {
        uri: request.uri,
        languageId: request.languageId,
        version: 1,
        text: request.text
      }
    };

    this.connection.sendNotification('textDocument/didOpen', didOpenParams);

    try {
      return await this.diagnosticsWaiter.waitFor(request.uri, timeoutMs);
    } finally {
      this.connection.sendNotification('textDocument/didClose', {
        textDocument: {
          uri: request.uri
        }
      });
    }
  }

  private async startInternal(): Promise<void> {
    const launchConfig = resolveLspLaunchConfig(this.options.serverPath);
    this.process = spawn(launchConfig.command, launchConfig.args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: launchConfig.env
    });

    this.process.on('exit', (code, signal) => {
      const message = `LSPプロセスが終了しました code=${code ?? 'null'} signal=${signal ?? 'null'}`;
      this.log(message);
      this.diagnosticsWaiter.rejectAll(new Error('LSPプロセスが終了しました。'));
      this.connection = null;
      this.process = null;
      this.readyPromise = null;
    });

    this.process.stderr.on('data', (chunk) => {
      const text = chunk.toString('utf8').trim();
      if (text.length > 0) {
        this.log(`[LSP] ${text}`);
      }
    });

    const connection = new JsonRpcConnection(this.process.stdout, this.process.stdin);
    connection.onRequest((request) => this.handleServerRequest(request));
    connection.onNotification((method, params) => this.handleServerNotification(method, params));
    connection.onError((error) => {
      this.log(`[LSP] ${error.message}`);
    });

    this.connection = connection;

    await connection.sendRequest('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {
        workspace: {
          configuration: true
        }
      },
      clientInfo: {
        name: 'otak-mcp-lsp',
        version: '0.1.0'
      }
    });

    connection.sendNotification('initialized');
    this.sendMcpConfiguration();
  }

  private sendMcpConfiguration(): void {
    if (!this.connection) {
      return;
    }

    this.connection.sendNotification('workspace/didChangeConfiguration', {
      settings: {
        otakLsp: {
          debounceDelay: MCP_DEBOUNCE_DELAY_MS,
          advanced: {
            tieredExecution: MCP_TIERED_EXECUTION
          }
        }
      }
    });
  }

  private handleServerRequest(request: JsonRpcRequest): void {
    if (!this.connection) {
      return;
    }

    switch (request.method) {
      case 'client/registerCapability':
        this.connection.sendResponse(request.id, null);
        return;
      case 'workspace/configuration': {
        const params = request.params as { items?: Array<{ section?: string }> } | undefined;
        const items = Array.isArray(params?.items) ? params?.items : [];
        const result = items.map((item) => getConfigurationForSection(item.section));
        this.connection.sendResponse(request.id, result);
        return;
      }
      case 'workspace/semanticTokens/refresh':
        this.connection.sendResponse(request.id, null);
        return;
      default:
        this.connection.sendError(request.id, {
          code: -32601,
          message: `未対応のリクエストです: ${request.method}`
        });
        return;
    }
  }

  private handleServerNotification(method: string, params: unknown): void {
    if (method === 'textDocument/publishDiagnostics') {
      const payload = params as { uri?: string; diagnostics?: Diagnostic[] };
      if (payload && typeof payload.uri === 'string' && Array.isArray(payload.diagnostics)) {
        this.diagnosticsWaiter.resolve(payload.uri, payload.diagnostics);
      }
      return;
    }

    if (method === 'window/logMessage' || method === 'window/showMessage') {
      const message = (params as { message?: string })?.message;
      if (typeof message === 'string') {
        this.log(`[LSP] ${message}`);
      }
    }
  }

  private log(message: string): void {
    if (this.options.logger) {
      this.options.logger(message);
    }
  }
}

function resolveLspLaunchConfig(serverPath?: string): LspLaunchConfig {
  if (serverPath) {
    if (!fs.existsSync(serverPath)) {
      throw new Error(`LSPサーバーが見つかりません: ${serverPath}`);
    }
    return {
      command: process.execPath,
      // LSPはstdioで起動する（vscode-languageserverは --stdio/--node-ipc 等の指定が必要）
      args: [serverPath, '--stdio'],
      env: { ...process.env }
    };
  }

  const compiledPath = path.resolve(__dirname, '..', '..', 'server', 'out', 'main.js');
  if (fs.existsSync(compiledPath)) {
    return {
      command: process.execPath,
      // LSPはstdioで起動する（vscode-languageserverは --stdio/--node-ipc 等の指定が必要）
      args: [compiledPath, '--stdio'],
      env: { ...process.env }
    };
  }

  const tsPath = path.resolve(__dirname, '..', '..', 'server', 'src', 'main.ts');
  if (fs.existsSync(tsPath)) {
    return {
      command: process.execPath,
      // LSPはstdioで起動する（vscode-languageserverは --stdio/--node-ipc 等の指定が必要）
      args: ['-r', 'ts-node/register', tsPath, '--stdio'],
      env: {
        ...process.env,
        TS_NODE_TRANSPILE_ONLY: '1',
        TS_NODE_PROJECT: path.resolve(__dirname, '..', '..', 'server', 'tsconfig.json')
      }
    };
  }

  throw new Error('LSPサーバーのエントリが見つかりません。');
}

function getConfigurationForSection(section?: string): unknown {
  if (section === 'otakLsp' || !section) {
    return {
      debounceDelay: MCP_DEBOUNCE_DELAY_MS,
      advanced: {
        tieredExecution: MCP_TIERED_EXECUTION
      }
    };
  }

  if (section === 'otakLsp.advanced') {
    return {
      tieredExecution: MCP_TIERED_EXECUTION
    };
  }

  if (section === 'otakLsp.official' || section === 'otakLsp.proofreading') {
    return {};
  }

  return {};
}

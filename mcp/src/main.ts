import * as fs from 'fs';
import * as path from 'path';
import { JsonRpcConnection, JsonRpcRequest } from './jsonRpc';
import { AnalyzeArguments, AnalyzeResult, McpTool } from './types';
import { LspClient } from './lspClient';

const JSON_RPC_ERROR = {
  InvalidParams: -32602,
  MethodNotFound: -32601,
  InternalError: -32603
};

const ANALYZE_TOOL: McpTool = {
  name: 'analyze',
  description: '日本語文法解析の診断結果を返します。',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '解析対象のテキスト'
      },
      languageId: {
        type: 'string',
        description: 'LSPのlanguageId'
      },
      uri: {
        type: 'string',
        description: '省略時は自動生成'
      }
    },
    required: ['text', 'languageId']
  }
};

const SUPPORTED_LANGUAGE_IDS = new Set([
  'markdown',
  'plaintext',
  'javascript',
  'typescript',
  'python',
  'c',
  'cpp',
  'java',
  'rust'
]);

const lspClient = new LspClient({
  logger: (message) => {
    process.stderr.write(`[mcp] ${message}\n`);
  }
});

const connection = new JsonRpcConnection(process.stdin, process.stdout);
let initialized = false;
let uriCounter = 0;

process.stdin.resume();

connection.onRequest((request) => {
  void (async () => {
    try {
      await handleRequest(request);
    } catch (error) {
      connection.sendError(request.id, {
        code: JSON_RPC_ERROR.InternalError,
        message: '内部エラーが発生しました。',
        data: error instanceof Error ? error.message : String(error)
      });
    }
  })();
});

connection.onError((error) => {
  process.stderr.write(`[mcp] ${error.message}\n`);
});

process.on('SIGINT', () => {
  void shutdown(0);
});

process.on('SIGTERM', () => {
  void shutdown(0);
});

process.stdin.on('end', () => {
  void shutdown(0);
});

async function handleRequest(request: JsonRpcRequest): Promise<void> {
  switch (request.method) {
    case 'initialize':
      await handleInitialize(request);
      return;
    case 'tools/list':
      handleToolsList(request);
      return;
    case 'tools/call':
      await handleToolsCall(request);
      return;
    default:
      connection.sendError(request.id, {
        code: JSON_RPC_ERROR.MethodNotFound,
        message: `未対応のメソッドです: ${request.method}`
      });
      return;
  }
}

async function handleInitialize(request: JsonRpcRequest): Promise<void> {
  if (!initialized) {
    try {
      await lspClient.start();
      initialized = true;
    } catch (error) {
      connection.sendError(request.id, {
        code: JSON_RPC_ERROR.InternalError,
        message: 'LSPサーバーの起動に失敗しました。',
        data: error instanceof Error ? error.message : String(error)
      });
      return;
    }
  }

  const params = request.params as { protocolVersion?: string } | undefined;
  const protocolVersion = typeof params?.protocolVersion === 'string' ? params?.protocolVersion : '2024-11-05';

  connection.sendResponse(request.id, {
    protocolVersion,
    capabilities: {
      tools: {}
    },
    serverInfo: {
      name: 'otak-mcp-lsp',
      version: readPackageVersion()
    }
  });
}

function handleToolsList(request: JsonRpcRequest): void {
  connection.sendResponse(request.id, {
    tools: [ANALYZE_TOOL]
  });
}

async function handleToolsCall(request: JsonRpcRequest): Promise<void> {
  const params = request.params as { name?: string; arguments?: AnalyzeArguments } | undefined;
  if (!params || params.name !== 'analyze') {
    connection.sendError(request.id, {
      code: JSON_RPC_ERROR.MethodNotFound,
      message: '未対応のツールです。'
    });
    return;
  }

  const args = params.arguments;
  if (!args || typeof args.text !== 'string' || typeof args.languageId !== 'string') {
    connection.sendError(request.id, {
      code: JSON_RPC_ERROR.InvalidParams,
      message: 'textとlanguageIdは必須です。'
    });
    return;
  }

  if (!SUPPORTED_LANGUAGE_IDS.has(args.languageId)) {
    connection.sendError(request.id, {
      code: JSON_RPC_ERROR.InvalidParams,
      message: `未対応のlanguageIdです: ${args.languageId}`
    });
    return;
  }

  const uri = typeof args.uri === 'string' ? args.uri : createDocumentUri();

  try {
    const diagnostics = await lspClient.analyzeText({
      text: args.text,
      languageId: args.languageId,
      uri
    });

    const result: AnalyzeResult = { diagnostics };
    connection.sendResponse(request.id, {
      content: [
        {
          type: 'json',
          json: result
        }
      ]
    });
  } catch (error) {
    connection.sendError(request.id, {
      code: JSON_RPC_ERROR.InternalError,
      message: '診断の取得に失敗しました。',
      data: error instanceof Error ? error.message : String(error)
    });
  }
}

function createDocumentUri(): string {
  uriCounter += 1;
  return `untitled:mcp-${Date.now()}-${uriCounter}`;
}

function readPackageVersion(): string {
  try {
    const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
    const raw = fs.readFileSync(packagePath, 'utf8');
    const parsed = JSON.parse(raw) as { version?: string };
    if (parsed && typeof parsed.version === 'string') {
      return parsed.version;
    }
  } catch (error) {
    process.stderr.write(`[mcp] バージョンの取得に失敗しました: ${error instanceof Error ? error.message : String(error)}\n`);
  }
  return '0.0.0';
}

async function shutdown(exitCode: number): Promise<void> {
  await lspClient.stop();
  process.exit(exitCode);
}

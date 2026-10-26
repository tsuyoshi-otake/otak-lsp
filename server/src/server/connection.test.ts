/**
 * Connection Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createConnectionHandler, ConnectionHandler } from './connection';
import {
  TextDocuments,
  TextDocumentSyncKind,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ConfigManager } from './configManager';
import { AnalysisScheduler } from './analysisScheduler';
import { DocumentAnalyzer } from './documentAnalyzer';
import { DiagnosticsPublisher } from './diagnosticsPublisher';
import { HoverProvider } from '../hover/provider';
import { SemanticTokenProvider, tokenTypes, tokenModifiers } from '../semantic/tokenProvider';
import { SupportedLanguage, Configuration, GLOSSARY_GROUPS, Token } from '../../../shared/src/types';
import { AnalysisStateManager } from './languageServer';
import { AdvancedRulesConfig } from '../../../shared/src/advancedTypes';
import { ResourceConfigurationStore } from './workspaceConfigLoader';

// Mock objects for testing
const createMockConnection = () => {
  const logs: string[] = [];
  const handlers: Record<string, ((...args: any[]) => any) | null> = {};
  const requests: Record<string, ((...args: any[]) => any) | null> = {};

  return {
    logs,
    handlers,
    requests,
    console: {
      log: (msg: string) => logs.push(`LOG: ${msg}`),
      error: (msg: string) => logs.push(`ERROR: ${msg}`),
    },
    onInitialize: (handler: (params: any) => any) => {
      handlers['initialize'] = handler;
    },
    onInitialized: (handler: () => void) => {
      handlers['initialized'] = handler;
    },
    onDidChangeConfiguration: (handler: (change: any) => void) => {
      handlers['didChangeConfiguration'] = handler;
    },
    onHover: (handler: (params: any) => any) => {
      handlers['hover'] = handler;
    },
    onCodeAction: (handler: (params: any) => any) => {
      handlers['codeAction'] = handler;
    },
    onRequest: (type: string, handler: (...args: any[]) => any) => {
      requests[type] = handler;
    },
    client: {
      register: jest.fn(),
    },
    workspace: {
      getConfiguration: jest.fn().mockResolvedValue({}),
    },
    sendDiagnostics: jest.fn(),
    sendRequest: jest.fn().mockResolvedValue(null),
  };
};

const createMockConfigManager = (): ConfigManager => {
  const callbacks: Array<(config: Configuration) => void> = [];
  let config: Configuration = {
    enableGrammarCheck: true,
    enableSemanticHighlight: true,
    debounceDelay: 250,
    targetLanguages: ['plaintext', 'markdown'] as SupportedLanguage[],
    hover: { enableWikipedia: true, enableGlossary: true, enabledGlossaries: [], enabledGlossaryGroups: GLOSSARY_GROUPS.map(g => g.id) },
    markdown: { analyzeCodeBlocks: true, analyzeTables: true },
    excludeTableDelimiters: true,
    enableProfileLogs: false,
  };

  return {
    getConfig: () => config,
    getAdvancedConfig: () => ({
      enableStyleConsistency: true,
      sentenceSplitMode: 'normal',
      tieredExecution: { enabled: false, idleDelayMs: 1200 },
    }) as AdvancedRulesConfig,
    applySettings: (settings: unknown) => {
      config = { ...config, ...(settings as Partial<Configuration>) };
    },
    onConfigChange: (callback: (config: Configuration) => void) => {
      callbacks.push(callback);
    },
    handleLspConfigChange: (settings: unknown) => {
      config = { ...config, ...(settings as Partial<Configuration>) };
      callbacks.forEach((cb) => cb(config));
    },
  };
};

const createMockAnalysisScheduler = (): AnalysisScheduler => ({
  scheduleAnalysis: jest.fn(),
  scheduleFullAnalysis: jest.fn(),
  runFullAnalysis: jest.fn().mockReturnValue({
    outcome: Promise.resolve({ status: 'completed', diagnostics: 0, omittedDiagnostics: 0 }),
    cancel: jest.fn(),
  }),
  cancelAnalysis: jest.fn(),
  clearAllTimers: jest.fn(),
  setExecuteAnalysis: jest.fn(),
});

const createMockDocumentAnalyzer = (): DocumentAnalyzer => ({
  analyze: jest.fn().mockResolvedValue({
    status: 'completed',
    tokens: [],
    diagnostics: [],
    omittedDiagnostics: 0,
    excludedRanges: [],
    lineStarts: [0],
  }),
});

const createMockDiagnosticsPublisher = (): DiagnosticsPublisher => ({
  publish: jest.fn(),
  clear: jest.fn(),
});

describe('connection', () => {
  let mockConnection: ReturnType<typeof createMockConnection>;
  let mockDocuments: TextDocuments<TextDocument>;
  let mockConfigManager: ConfigManager;
  let mockAnalysisScheduler: AnalysisScheduler;
  let mockDocumentAnalyzer: DocumentAnalyzer;
  let mockDiagnosticsPublisher: DiagnosticsPublisher;
  let mockHoverProvider: HoverProvider;
  let mockSemanticTokenProvider: SemanticTokenProvider;
  let mockAnalysisStates: AnalysisStateManager;
  let connectionHandler: ConnectionHandler;

  beforeEach(() => {
    mockConnection = createMockConnection();
    mockDocuments = new TextDocuments(TextDocument);
    mockConfigManager = createMockConfigManager();
    mockAnalysisScheduler = createMockAnalysisScheduler();
    mockDocumentAnalyzer = createMockDocumentAnalyzer();
    mockDiagnosticsPublisher = createMockDiagnosticsPublisher();
    mockHoverProvider = {
      provideHover: jest.fn().mockResolvedValue(null),
      setWikipediaEnabled: jest.fn(),
      setGlossaryEnabled: jest.fn(),
      setEnabledGlossaries: jest.fn(),
    } as any;
    mockSemanticTokenProvider = new SemanticTokenProvider();
    mockAnalysisStates = new AnalysisStateManager();

    connectionHandler = createConnectionHandler(
      mockConnection as any,
      mockDocuments,
      mockConfigManager,
      mockAnalysisScheduler,
      mockDocumentAnalyzer,
      mockDiagnosticsPublisher,
      mockHoverProvider,
      mockSemanticTokenProvider,
      mockAnalysisStates
    );
  });

  describe('createConnectionHandler', () => {
    it('should create a connection handler instance', () => {
      expect(connectionHandler).toBeDefined();
      expect(typeof connectionHandler.initialize).toBe('function');
      expect(typeof connectionHandler.getCapabilities).toBe('function');
    });
  });

  describe('ConnectionHandler.initialize', () => {
    it('should register all handlers when initialize is called', () => {
      connectionHandler.initialize();

      expect(mockConnection.handlers['initialize']).toBeDefined();
      expect(mockConnection.handlers['initialized']).toBeDefined();
      expect(mockConnection.handlers['didChangeConfiguration']).toBeDefined();
      expect(mockConnection.handlers['hover']).toBeDefined();
      expect(mockConnection.requests['textDocument/semanticTokens/full']).toBeDefined();
    });
  });

  describe('ConnectionHandler.getCapabilities', () => {
    it('should return LSP capabilities', () => {
      const capabilities = connectionHandler.getCapabilities();

      expect(capabilities).toBeDefined();
      expect(capabilities.textDocumentSync).toBe(TextDocumentSyncKind.Incremental);
      expect(capabilities.hoverProvider).toBe(true);
      expect(capabilities.semanticTokensProvider).toBeDefined();
      expect(capabilities.semanticTokensProvider?.legend).toBeDefined();
      expect(capabilities.semanticTokensProvider?.legend.tokenTypes).toEqual(tokenTypes);
      expect(capabilities.semanticTokensProvider?.legend.tokenModifiers).toEqual(tokenModifiers);
    });
  });

  describe('onInitialize handler', () => {
    it('should return capabilities on initialize', () => {
      connectionHandler.initialize();

      const handler = mockConnection.handlers['initialize'];
      expect(handler).toBeDefined();

      const result = handler!({ capabilities: {} });
      expect(result.capabilities).toBeDefined();
      expect(result.capabilities.textDocumentSync).toBe(TextDocumentSyncKind.Incremental);
    });
  });

  describe('onHover handler', () => {
    it('should handle hover requests', async () => {
      connectionHandler.initialize();

      const handler = mockConnection.handlers['hover'];
      expect(handler).toBeDefined();

      // Create a mock document for hover
      const mockDoc = TextDocument.create('test://uri', 'plaintext', 1, 'テスト');

      // Store tokens and text for this URI
      connectionHandler.setDocumentCache('test://uri', {
        tokens: [],
        text: 'テスト',
        excludedRanges: [],
        lineStarts: [0],
      });

      // Mock documents.get to return our mock document
      jest.spyOn(mockDocuments, 'get').mockReturnValue(mockDoc);

      const result = await handler!({
        textDocument: { uri: 'test://uri' },
        position: { line: 0, character: 0 },
      });

      // Should return null if no hover info (mock returns null)
      expect(result).toBeNull();
    });
  });

  describe('semantic tokens handler', () => {
    it('should handle semantic tokens requests', () => {
      connectionHandler.initialize();

      const handler = mockConnection.requests['textDocument/semanticTokens/full'];
      expect(handler).toBeDefined();

      const result = handler!({ textDocument: { uri: 'test://uri' } });

      // Should return empty data when no tokens
      expect(result.data).toEqual([]);
    });
  });

  it('文書別設定を解析とホバーに渡し、設定変更後に再取得する', async () => {
    const doc = TextDocument.create('file:///folder/b.md', 'plaintext', 1, '本文');
    jest.spyOn(mockDocuments, 'get').mockReturnValue(doc);
    jest.spyOn(mockDocuments, 'all').mockReturnValue([doc]);
    mockAnalysisStates.updateState(doc.uri, { latestDocument: doc, latestVersion: doc.version });
    const token = new Token({ surface: '本文', pos: '名詞', posDetail1: '*', posDetail2: '*', posDetail3: '*',
      conjugation: '*', conjugationForm: '*', baseForm: '本文', reading: 'ホンブン', pronunciation: 'ホンブン', start: 0, end: 2 });
    jest.mocked(mockDocumentAnalyzer.analyze).mockResolvedValue({ status: 'completed', tokens: [token],
      diagnostics: [], omittedDiagnostics: 0, excludedRanges: [], lineStarts: [0], profileSteps: [] });
    let enabled = false;
    mockConnection.workspace.getConfiguration.mockImplementation(async ({ section, scopeUri }) => {
      if (section === 'otakLsp' && scopeUri) {
        return { enableGrammarCheck: enabled, enableSemanticHighlight: true, hover: { enableWikipedia: false } };
      }
      return {};
    });
    const resources = new ResourceConfigurationStore(mockConnection as unknown as import('vscode-languageserver/node').Connection, mockConfigManager);
    connectionHandler = createConnectionHandler(
      mockConnection as unknown as import('vscode-languageserver/node').Connection,
      mockDocuments, resources.manager, mockAnalysisScheduler, mockDocumentAnalyzer,
      mockDiagnosticsPublisher, mockHoverProvider, mockSemanticTokenProvider, mockAnalysisStates,
      undefined, undefined, resources
    );
    connectionHandler.initialize();
    mockConnection.handlers.initialize!({ capabilities: { workspace: { configuration: true } } });
    await resources.load(doc.uri);
    await connectionHandler.getExecuteAnalysis()(doc.uri, false);
    expect(mockDocumentAnalyzer.analyze).toHaveBeenLastCalledWith(
      expect.anything(), expect.objectContaining({ enableGrammarCheck: false }), expect.anything(),
      false, expect.anything(), undefined, expect.anything()
    );
    await mockConnection.handlers.hover!({ textDocument: { uri: doc.uri }, position: { line: 0, character: 0 } });
    expect(mockHoverProvider.provideHover).toHaveBeenLastCalledWith(
      [token], 0, '本文', expect.objectContaining({ enableWikipedia: false })
    );
    enabled = true;
    await mockConnection.handlers.didChangeConfiguration!({ settings: { otakLsp: {} } });
    expect(resources.manager.getConfig(doc.uri).enableGrammarCheck).toBe(true);
    expect(mockAnalysisScheduler.scheduleAnalysis).toHaveBeenCalledWith(doc);
  });

  describe('手動解析の完了待ち', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      const doc = TextDocument.create('file:///manual.md', 'markdown', 1, '本文');
      jest.spyOn(mockDocuments, 'get').mockReturnValue(doc);
      connectionHandler.initialize();
    });
    afterEach(() => jest.useRealTimers());

    it('実行の受付だけでは成功せず、完了結果を待ってタイマーを解放する', async () => {
      let finish!: (value: { status: 'completed'; diagnostics: number; omittedDiagnostics: number }) => void;
      const outcome = new Promise<{ status: 'completed'; diagnostics: number; omittedDiagnostics: number }>(resolve => { finish = resolve; });
      const cancel = jest.fn();
      jest.mocked(mockAnalysisScheduler.runFullAnalysis).mockReturnValue({ outcome, cancel });
      let settled = false;
      const response = mockConnection.requests['otakLsp/analyzeDocument']!({ uri: 'file:///manual.md' }).then((value: unknown) => { settled = true; return value; });
      await Promise.resolve();
      await Promise.resolve();
      expect(settled).toBe(false);
      finish({ status: 'completed', diagnostics: 3, omittedDiagnostics: 0 });
      expect(await response).toEqual({ ok: true, status: 'completed', diagnostics: 3 });
      expect(jest.getTimerCount()).toBe(0);
      expect(cancel).not.toHaveBeenCalled();
    });

    it('30秒で終端し、他の要求ではなく自分の待機を解除する', async () => {
      const cancel = jest.fn();
      jest.mocked(mockAnalysisScheduler.runFullAnalysis).mockReturnValue({ outcome: new Promise(() => undefined), cancel });
      const response = mockConnection.requests['otakLsp/analyzeDocument']!({ uri: 'file:///manual.md' });
      await jest.advanceTimersByTimeAsync(30000);
      expect(await response).toEqual({ ok: false, status: 'failed', reason: 'timeout' });
      expect(cancel).toHaveBeenCalledTimes(1);
      expect(jest.getTimerCount()).toBe(0);
      expect(mockAnalysisScheduler.cancelAnalysis).not.toHaveBeenCalled();
    });
  });
});

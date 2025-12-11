/**
 * Extension Client Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 2.1, 2.2, 2.3, 2.4, 2.5, 8.1
 */

// Mock vscode module before imports
const mockOutputChannel = {
  appendLine: jest.fn(),
  append: jest.fn(),
  clear: jest.fn(),
  dispose: jest.fn(),
  show: jest.fn(),
  hide: jest.fn(),
  name: 'Japanese Grammar Analyzer',
  replace: jest.fn(),
};

const mockDisposable = {
  dispose: jest.fn(),
};

let mockConfigValues: Record<string, unknown> = {
  enableGrammarCheck: true,
  enableSemanticHighlight: true,
  targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
  debounceDelay: 500,
};

const mockVscode = {
  window: {
    createOutputChannel: jest.fn(() => mockOutputChannel),
    showErrorMessage: jest.fn(),
    showInformationMessage: jest.fn(),
    showWarningMessage: jest.fn(),
  },
  workspace: {
    getConfiguration: jest.fn(() => ({
      get: jest.fn((key: string) => mockConfigValues[key]),
      update: jest.fn(),
    })),
    onDidChangeConfiguration: jest.fn(() => mockDisposable),
  },
  Uri: {
    file: (path: string) => ({ fsPath: path }),
    joinPath: (base: { fsPath: string }, ...pathSegments: string[]) => ({
      fsPath: [base.fsPath, ...pathSegments].join('/'),
    }),
  },
};

jest.mock('vscode', () => mockVscode, { virtual: true });

// Mock vscode-languageclient module
const mockLanguageClient = {
  start: jest.fn(() => Promise.resolve()),
  stop: jest.fn(() => Promise.resolve()),
  onReady: jest.fn(() => Promise.resolve()),
  sendNotification: jest.fn(),
  onNotification: jest.fn(),
};

const mockLanguageClientConstructor = jest.fn(() => mockLanguageClient);

jest.mock('vscode-languageclient/node', () => ({
  LanguageClient: mockLanguageClientConstructor,
  TransportKind: { ipc: 1 },
}), { virtual: true });

// Now import the module under test
import {
  ExtensionClient,
  createDocumentSelector,
  getServerModulePath,
  createLanguageClientOptions,
} from './extension';

describe('Extension Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset config values
    mockConfigValues = {
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
      debounceDelay: 500,
    };
  });

  describe('createDocumentSelector', () => {
    it('should create document selectors for all supported languages', () => {
      const languages = ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'];
      const selector = createDocumentSelector(languages);

      expect(selector).toHaveLength(8);
      expect(selector).toContainEqual({ scheme: 'file', language: 'markdown' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'javascript' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'typescript' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'python' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'c' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'cpp' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'java' });
      expect(selector).toContainEqual({ scheme: 'file', language: 'rust' });
    });

    it('should create empty selector for empty language list', () => {
      const selector = createDocumentSelector([]);
      expect(selector).toHaveLength(0);
    });

    it('should handle single language', () => {
      const selector = createDocumentSelector(['markdown']);
      expect(selector).toHaveLength(1);
      expect(selector[0]).toEqual({ scheme: 'file', language: 'markdown' });
    });
  });

  describe('getServerModulePath', () => {
    it('should return the correct server module path', () => {
      const path = getServerModulePath('/ext/path');
      expect(path).toContain('server');
      expect(path).toContain('out');
      expect(path).toContain('main.js');
    });
  });

  describe('createLanguageClientOptions', () => {
    it('should create valid language client options', () => {
      const languages = ['markdown', 'javascript'];
      const options = createLanguageClientOptions(languages, mockOutputChannel as unknown as import('vscode').OutputChannel);

      expect(options.documentSelector).toHaveLength(2);
      expect(options.outputChannel).toBe(mockOutputChannel);
      expect(options.synchronize).toBeDefined();
    });
  });

  describe('ExtensionClient', () => {
    let client: ExtensionClient;

    beforeEach(() => {
      client = new ExtensionClient();
    });

    describe('getConfiguration', () => {
      it('should return current configuration', () => {
        const config = client.getConfiguration();

        expect(config.enableGrammarCheck).toBe(true);
        expect(config.enableSemanticHighlight).toBe(true);
        expect(config.debounceDelay).toBe(500);
      });
    });

    describe('loadConfiguration', () => {
      it('should load configuration from vscode workspace', () => {
        client.loadConfiguration();
        const config = client.getConfiguration();

        expect(config.enableGrammarCheck).toBe(true);
      });

      it('should use default values when configuration returns undefined', () => {
        mockConfigValues = {};
        client.loadConfiguration();
        const config = client.getConfiguration();

        // Should retain previous values (defaults)
        expect(config.enableGrammarCheck).toBeDefined();
      });
    });

    describe('isTargetLanguage', () => {
      it('should return true for target languages', () => {
        expect(client.isTargetLanguage('markdown')).toBe(true);
        expect(client.isTargetLanguage('javascript')).toBe(true);
        expect(client.isTargetLanguage('typescript')).toBe(true);
      });

      it('should return false for non-target languages', () => {
        expect(client.isTargetLanguage('html')).toBe(false);
        expect(client.isTargetLanguage('css')).toBe(false);
      });
    });

    // MeCab関連のテストは削除（kuromoji.jsに移行したため）

    describe('isGrammarCheckEnabled', () => {
      it('should return grammar check setting', () => {
        expect(client.isGrammarCheckEnabled()).toBe(true);
      });
    });

    describe('isSemanticHighlightEnabled', () => {
      it('should return semantic highlight setting', () => {
        expect(client.isSemanticHighlightEnabled()).toBe(true);
      });
    });

    describe('getTargetLanguages', () => {
      it('should return target languages array', () => {
        const languages = client.getTargetLanguages();
        expect(languages).toContain('markdown');
        expect(languages).toContain('javascript');
      });
    });

    describe('getDebounceDelay', () => {
      it('should return debounce delay', () => {
        expect(client.getDebounceDelay()).toBe(500);
      });
    });
  });
});

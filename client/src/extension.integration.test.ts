/**
 * Integration Tests for Extension Client
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1
 *
 * These tests verify the integration between extension components.
 * Note: Full VSCode API integration requires running with @vscode/test-electron
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
  mecabPath: 'mecab',
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
jest.mock('vscode-languageclient/node', () => ({
  LanguageClient: jest.fn(),
  TransportKind: { ipc: 1 },
}), { virtual: true });

// Now import the module under test
import {
  ExtensionClient,
  createDocumentSelector,
  getServerModulePath,
  createLanguageClientOptions,
} from './extension';

describe('Extension Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigValues = {
      mecabPath: 'mecab',
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
      debounceDelay: 500,
    };
  });

  describe('Document Selector Integration', () => {
    it('should create selectors for all supported programming languages', () => {
      const languages = ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'];
      const selectors = createDocumentSelector(languages);

      // Verify all languages are covered
      expect(selectors).toHaveLength(8);

      // Verify each selector has correct structure
      selectors.forEach((selector) => {
        expect(selector).toHaveProperty('scheme', 'file');
        expect(selector).toHaveProperty('language');
        expect(languages).toContain(selector.language);
      });
    });

    it('should support file scheme for local documents', () => {
      const selector = createDocumentSelector(['markdown']);
      expect(selector[0].scheme).toBe('file');
    });
  });

  describe('Server Module Path Integration', () => {
    it('should generate correct path structure', () => {
      const extensionPath = '/test/extension';
      const serverPath = getServerModulePath(extensionPath);

      expect(serverPath).toContain('server');
      expect(serverPath).toContain('out');
      expect(serverPath).toContain('main.js');
    });
  });

  describe('Language Client Options Integration', () => {
    it('should configure document selector with all target languages', () => {
      const languages = ['markdown', 'javascript', 'typescript'];
      const options = createLanguageClientOptions(languages, mockOutputChannel as unknown as import('vscode').OutputChannel);

      expect(options.documentSelector).toHaveLength(3);
      expect(options.documentSelector).toContainEqual({ scheme: 'file', language: 'markdown' });
      expect(options.documentSelector).toContainEqual({ scheme: 'file', language: 'javascript' });
      expect(options.documentSelector).toContainEqual({ scheme: 'file', language: 'typescript' });
    });

    it('should configure synchronize for configuration changes', () => {
      const options = createLanguageClientOptions(['markdown'], mockOutputChannel as unknown as import('vscode').OutputChannel);

      expect(options.synchronize).toBeDefined();
      expect(options.synchronize?.configurationSection).toBe('japaneseGrammarAnalyzer');
    });

    it('should include output channel for logging', () => {
      const options = createLanguageClientOptions(['markdown'], mockOutputChannel as unknown as import('vscode').OutputChannel);

      expect(options.outputChannel).toBe(mockOutputChannel);
    });
  });

  describe('Extension Client Integration', () => {
    it('should load configuration from VSCode workspace', () => {
      const client = new ExtensionClient();
      const config = client.getConfiguration();

      expect(config.mecabPath).toBe('mecab');
      expect(config.enableGrammarCheck).toBe(true);
      expect(config.enableSemanticHighlight).toBe(true);
      expect(config.targetLanguages).toHaveLength(8);
      expect(config.debounceDelay).toBe(500);
    });

    it('should correctly identify target languages', () => {
      const client = new ExtensionClient();

      // Target languages
      expect(client.isTargetLanguage('markdown')).toBe(true);
      expect(client.isTargetLanguage('javascript')).toBe(true);
      expect(client.isTargetLanguage('typescript')).toBe(true);
      expect(client.isTargetLanguage('python')).toBe(true);
      expect(client.isTargetLanguage('c')).toBe(true);
      expect(client.isTargetLanguage('cpp')).toBe(true);
      expect(client.isTargetLanguage('java')).toBe(true);
      expect(client.isTargetLanguage('rust')).toBe(true);

      // Non-target languages
      expect(client.isTargetLanguage('html')).toBe(false);
      expect(client.isTargetLanguage('css')).toBe(false);
      expect(client.isTargetLanguage('json')).toBe(false);
    });

    it('should provide access to all configuration values', () => {
      const client = new ExtensionClient();

      expect(client.getMeCabPath()).toBe('mecab');
      expect(client.isGrammarCheckEnabled()).toBe(true);
      expect(client.isSemanticHighlightEnabled()).toBe(true);
      expect(client.getTargetLanguages()).toEqual(
        expect.arrayContaining(['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'])
      );
      expect(client.getDebounceDelay()).toBe(500);
    });

    it('should reload configuration when requested', () => {
      const client = new ExtensionClient();

      // Modify mock to return different values
      mockConfigValues = {
        mecabPath: '/custom/mecab',
        enableGrammarCheck: false,
        enableSemanticHighlight: false,
        targetLanguages: ['markdown'],
        debounceDelay: 1000,
      };

      client.loadConfiguration();
      const config = client.getConfiguration();

      expect(config.mecabPath).toBe('/custom/mecab');
      expect(config.enableGrammarCheck).toBe(false);
      expect(config.enableSemanticHighlight).toBe(false);
      expect(config.targetLanguages).toEqual(['markdown']);
      expect(config.debounceDelay).toBe(1000);
    });
  });

  describe('Full Integration Flow', () => {
    it('should create complete extension setup', () => {
      // Create extension client
      const client = new ExtensionClient();
      const config = client.getConfiguration();

      // Create document selectors
      const selectors = createDocumentSelector(config.targetLanguages);
      expect(selectors).toHaveLength(config.targetLanguages.length);

      // Create server path
      const serverPath = getServerModulePath('/ext/path');
      expect(serverPath).toBeDefined();

      // Create language client options
      const options = createLanguageClientOptions(
        config.targetLanguages,
        mockOutputChannel as unknown as import('vscode').OutputChannel
      );
      expect(options).toBeDefined();
      expect(options.documentSelector).toHaveLength(config.targetLanguages.length);
    });

    it('should handle configuration changes consistently', () => {
      const client = new ExtensionClient();

      // Get initial configuration
      const initialConfig = client.getConfiguration();
      expect(initialConfig.enableGrammarCheck).toBe(true);

      // Simulate configuration change
      mockConfigValues = {
        mecabPath: 'mecab',
        enableGrammarCheck: false,
        enableSemanticHighlight: true,
        targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
        debounceDelay: 500,
      };

      // Reload and verify
      client.loadConfiguration();
      const newConfig = client.getConfiguration();
      expect(newConfig.enableGrammarCheck).toBe(false);

      // Verify document selector still works
      const selectors = createDocumentSelector(newConfig.targetLanguages);
      expect(selectors).toHaveLength(8);
    });
  });
});

describe('Extension Lifecycle Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigValues = {
      mecabPath: 'mecab',
      enableGrammarCheck: true,
      enableSemanticHighlight: true,
      targetLanguages: ['markdown', 'javascript', 'typescript', 'python', 'c', 'cpp', 'java', 'rust'],
      debounceDelay: 500,
    };
  });

  describe('Activation', () => {
    it('should create all necessary components during activation', () => {
      // Verify output channel creation function exists
      expect(mockVscode.window.createOutputChannel).toBeDefined();

      // Create extension client (part of activation)
      const client = new ExtensionClient();
      expect(client).toBeDefined();

      // Verify configuration is loaded
      const config = client.getConfiguration();
      expect(config).toBeDefined();
    });
  });

  describe('Configuration Synchronization', () => {
    it('should synchronize configuration section with language server', () => {
      const options = createLanguageClientOptions(
        ['markdown'],
        mockOutputChannel as unknown as import('vscode').OutputChannel
      );

      // Verify synchronization is configured
      expect(options.synchronize).toBeDefined();
      expect(options.synchronize?.configurationSection).toBe('japaneseGrammarAnalyzer');
    });
  });
});

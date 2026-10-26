/**
 * Issue #27: 実際のエントリーポイントを初期化し、依存先からのログ呼出しを検証する。
 * LSPの通信とlistenのみを置換し、main.tsとloggerの制御フローは実行する。
 */
describe('main の初期化中のログ', () => {
  it('設定マネージャーの生成前に依存先がdebugを呼んでも起動できる', () => {
    const oldLsp = process.env.OTAK_LSP_DEBUG;
    const oldLcp = process.env.OTAK_LCP_DEBUG;
    delete process.env.OTAK_LSP_DEBUG;
    delete process.env.OTAK_LCP_DEBUG;
    let probed = false;
    const listen = jest.fn();
    const connection = {
      console: { log: jest.fn(), error: jest.fn() },
      onInitialize: jest.fn(), onInitialized: jest.fn(), onDidChangeConfiguration: jest.fn(),
      onHover: jest.fn(), onRequest: jest.fn(), onCodeAction: jest.fn(),
      onShutdown: jest.fn(), onExit: jest.fn(), listen,
    };
    jest.doMock('vscode-languageserver/node', () => ({
      ...jest.requireActual('vscode-languageserver/node'),
      createConnection: () => connection,
      TextDocuments: class {
        listen = jest.fn();
        onDidOpen = jest.fn();
        onDidChangeContent = jest.fn();
        onDidSave = jest.fn();
        onDidClose = jest.fn();
      },
    }));
    jest.doMock('./grammar/advancedRulesManager', () => {
      const original = jest.requireActual<typeof import('./grammar/advancedRulesManager')>('./grammar/advancedRulesManager');
      return {
        ...original,
        AdvancedRulesManager: class extends original.AdvancedRulesManager {
          constructor(...args: ConstructorParameters<typeof original.AdvancedRulesManager>) {
            super(...args);
            probed = true;
            args[1]?.debug('初期化境界の検証');
          }
        },
      };
    });
    try {
      jest.isolateModules(() => {
        expect(() => require('./main')).not.toThrow();
      });
      expect(probed).toBe(true);
      expect(listen).toHaveBeenCalledTimes(1);
    } finally {
      if (oldLsp === undefined) delete process.env.OTAK_LSP_DEBUG;
      else process.env.OTAK_LSP_DEBUG = oldLsp;
      if (oldLcp === undefined) delete process.env.OTAK_LCP_DEBUG;
      else process.env.OTAK_LCP_DEBUG = oldLcp;
      jest.dontMock('vscode-languageserver/node');
      jest.dontMock('./grammar/advancedRulesManager');
      jest.resetModules();
    }
  });
});

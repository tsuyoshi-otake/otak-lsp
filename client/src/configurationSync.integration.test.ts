import type { OutputChannel } from 'vscode';
import { SyncConfigurationFeature } from 'vscode-languageclient/lib/common/configuration';
import { createLanguageClientOptions } from './extension';
import * as fc from 'fast-check';

type Change = { affectsConfiguration: (section: string) => boolean };
const mockListeners: Array<(event: Change) => void> = [];
const mockGetConfiguration = jest.fn(() => ({ get: (key: string) => key === 'otakLsp' ? { advanced: { sentenceComplexityThreshold: 30 } } : undefined }));

jest.mock('vscode', () => ({
  CancellationError: class CancellationError extends Error {},
  workspace: {
    onDidChangeConfiguration: (listener: (event: Change) => void) => {
      mockListeners.push(listener);
      return { dispose: () => { const index = mockListeners.indexOf(listener); if (index >= 0) mockListeners.splice(index, 1); } };
    },
    getConfiguration: () => mockGetConfiguration(),
  },
}), { virtual: true });
jest.mock('vscode-languageclient/node', () => ({ LanguageClient: jest.fn(), State: {}, TransportKind: {} }), { virtual: true });

describe('configuration notification boundary', () => {
  it('実languageclientは無関係な変更を通知せず、otakLspの変更を一度だけ通知する', () => {
    const sendNotification = jest.fn().mockResolvedValue(undefined);
    const options = createLanguageClientOptions(['markdown'], {} as OutputChannel);
    const client = { clientOptions: options, middleware: {}, sendNotification, error: jest.fn() };
    const feature = new SyncConfigurationFeature(client as unknown as ConstructorParameters<typeof SyncConfigurationFeature>[0]);
    try {
      feature.initialize();
      sendNotification.mockClear();
      mockGetConfiguration.mockClear();
      for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => section === 'editor.fontSize' });
      expect(sendNotification).not.toHaveBeenCalled();
      expect(mockGetConfiguration).not.toHaveBeenCalled();
      for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => section === 'otakLsp' || section === 'otakLsp.advanced' });
      expect(sendNotification).toHaveBeenCalledTimes(1);
      expect(sendNotification).toHaveBeenCalledWith(expect.objectContaining({ method: 'workspace/didChangeConfiguration' }),
        { settings: { otakLsp: { advanced: { sentenceComplexityThreshold: 30 } } } });
    } finally {
      feature.clear();
    }
  });

  it('セクションの指定漏れを実languageclientの契約検査が検出する', () => {
    const sendNotification = jest.fn().mockResolvedValue(undefined);
    const client = { clientOptions: {}, middleware: {}, sendNotification, error: jest.fn() };
    const feature = new SyncConfigurationFeature(client as unknown as ConstructorParameters<typeof SyncConfigurationFeature>[0]);
    try {
      feature.initialize();
      // 故障注入: サーバー登録からsectionを除去する。
      feature.register({ id: 'unscoped', registerOptions: {} });
      sendNotification.mockClear();
      for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => section === 'editor.fontSize' });
      expect(() => expect(sendNotification).not.toHaveBeenCalled()).toThrow();
      expect(sendNotification).toHaveBeenCalledTimes(1);
    } finally {
      feature.clear();
    }
  });

  it('クライアントが同期を所有しない場合はサーバーの動的登録で同じ範囲を監視する', () => {
    const sendNotification = jest.fn().mockResolvedValue(undefined);
    const client = { clientOptions: {}, middleware: {}, sendNotification, error: jest.fn() };
    const feature = new SyncConfigurationFeature(client as unknown as ConstructorParameters<typeof SyncConfigurationFeature>[0]);
    try {
      feature.initialize();
      feature.register({ id: 'server-registration', registerOptions: { section: 'otakLsp' } });
      sendNotification.mockClear();
      for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => section === 'editor.fontSize' });
      expect(sendNotification).not.toHaveBeenCalled();
      for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => section === 'otakLsp' });
      expect(sendNotification).toHaveBeenCalledTimes(1);
    } finally {
      feature.clear();
    }
  });

  it('生成した設定変更がotakLsp配下の場合だけ一度通知する', () => {
    const sendNotification = jest.fn().mockResolvedValue(undefined);
    const client = { clientOptions: createLanguageClientOptions(['markdown'], {} as OutputChannel), middleware: {}, sendNotification, error: jest.fn() };
    const feature = new SyncConfigurationFeature(client as unknown as ConstructorParameters<typeof SyncConfigurationFeature>[0]);
    try {
      feature.initialize();
      fc.assert(fc.property(fc.constantFrom('otakLsp', 'otakLsp.advanced', 'otakLsp.advanced.enableSentenceComplexity', 'editor.fontSize', 'files.autoSave', 'otakLspOther.setting'), changed => {
        sendNotification.mockClear();
        for (const listener of [...mockListeners]) listener({ affectsConfiguration: section => changed === section || changed.startsWith(`${section}.`) || section.startsWith(`${changed}.`) });
        expect(sendNotification).toHaveBeenCalledTimes(changed === 'otakLsp' || changed.startsWith('otakLsp.') ? 1 : 0);
      }), { numRuns: 30, seed: 20261027 });
    } finally {
      feature.clear();
    }
  });
});

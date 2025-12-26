import { DiagnosticsWaiter } from './lspClient';

describe('DiagnosticsWaiter', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('resolveで診断を返す', async () => {
    jest.useFakeTimers();
    const waiter = new DiagnosticsWaiter();
    const promise = waiter.waitFor('file://test', 1000);

    waiter.resolve('file://test', [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 1 }
        },
        message: 'テスト'
      }
    ]);

    await expect(promise).resolves.toHaveLength(1);
    jest.runOnlyPendingTimers();
  });

  test('タイムアウトで失敗する', async () => {
    jest.useFakeTimers();
    const waiter = new DiagnosticsWaiter();
    const promise = waiter.waitFor('file://timeout', 500);

    jest.advanceTimersByTime(500);
    await expect(promise).rejects.toThrow('タイムアウト');
  });
});

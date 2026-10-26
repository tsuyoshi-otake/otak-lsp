import { WikipediaClient } from './client';

describe('Wikipedia取得の終了と再要求制御', () => {
  let client: WikipediaClient;
  beforeEach(() => { jest.useFakeTimers(); client = new WikipediaClient(); });
  afterEach(() => { jest.clearAllTimers(); jest.useRealTimers(); });

  it('ヘッダー受信後も本文読み取りをタイムアウトで中断する', async () => {
    client.setTimeout(20);
    let signal!: AbortSignal;
    client.setFetch(async (_url, options) => {
      signal = options.signal as AbortSignal;
      return {
        ok: true,
        json: () => new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new Error('中断')), { once: true });
        }),
      } as Response;
    });
    let settled = false;
    const work = client.getSummary('本文待ち').then(value => { settled = true; return value; });
    await jest.advanceTimersByTimeAsync(30);
    expect(signal.aborted).toBe(true);
    expect(settled).toBe(true);
    await expect(work).resolves.toBeNull();
  });

  it.each(['60', new Date(Date.now() + 60_000).toUTCString()])('Retry-After %s の間は別の語も再要求しない', async retryAfter => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, headers: new Headers({ 'Retry-After': retryAfter }) });
    client.setFetch(fetch);
    await client.getSummary('最初');
    await client.getSummary('最初');
    client.prefetchSummary('別の語');
    expect(fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(60_001);
    await client.getSummary('別の語');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('記事が存在しない語を短時間に繰り返し取得しない', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    client.setFetch(fetch);
    await client.getSummary('存在しない語');
    await client.getSummary('存在しない語');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

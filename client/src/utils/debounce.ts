/**
 * デバウンスユーティリティ - 入力遅延を軽減するため
 * 最後の呼び出しから指定された待機時間が経過するまで関数の実行を遅延させる
 */

export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel(): void;
  flush(): void;
  pending(): boolean;
}

export interface DebounceOptions {
  /** 関数を実行するまでの遅延時間（ミリ秒） */
  delay: number;
  /** trueの場合、末尾ではなく先頭エッジで実行 */
  leading?: boolean;
  /** 強制実行までの最大待機時間 */
  maxWait?: number;
}

/**
 * 関数のデバウンス版を作成する
 * 最後の呼び出しから指定された遅延が経過するまで実行を遅延させる
 * 
 * @param func - デバウンスする関数
 * @param options - デバウンス設定オプション
 * @returns cancel、flush、pendingメソッドを持つデバウンス版関数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  options: DebounceOptions
): DebouncedFunction<T> {
  const { delay, leading = false, maxWait } = options;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let maxTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;
  let lastCallTime: number | null = null;
  let lastInvokeTime = 0;

  function invokeFunc(time: number): void {
    const args = lastArgs;
    lastArgs = null;
    lastInvokeTime = time;
    if (args) {
      func(...args);
    }
  }

  function cancelTimer(id: ReturnType<typeof setTimeout> | null): void {
    if (id !== null) {
      clearTimeout(id);
    }
  }

  function shouldInvoke(time: number): boolean {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === null ||
      timeSinceLastCall >= delay ||
      timeSinceLastCall < 0 ||
      (maxWait !== undefined && timeSinceLastInvoke >= maxWait)
    );
  }

  function remainingWait(time: number): number {
    const timeSinceLastCall = time - (lastCallTime || 0);
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = delay - timeSinceLastCall;

    return maxWait !== undefined
      ? Math.min(timeWaiting, maxWait - timeSinceLastInvoke)
      : timeWaiting;
  }

  function timerExpired(): void {
    const time = Date.now();
    if (shouldInvoke(time)) {
      trailingEdge(time);
      return;
    }
    timeoutId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number): void {
    timeoutId = null;
    cancelTimer(maxTimeoutId);
    maxTimeoutId = null;

    if (lastArgs) {
      invokeFunc(time);
    }
  }

  function leadingEdge(time: number): void {
    lastInvokeTime = time;
    timeoutId = setTimeout(timerExpired, delay);
    if (leading) {
      invokeFunc(time);
    }
  }

  function cancel(): void {
    cancelTimer(timeoutId);
    cancelTimer(maxTimeoutId);
    timeoutId = null;
    maxTimeoutId = null;
    lastArgs = null;
    lastCallTime = null;
    lastInvokeTime = 0;
  }

  function flush(): void {
    if (timeoutId !== null) {
      trailingEdge(Date.now());
    }
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  function debounced(...args: Parameters<T>): void {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastCallTime = time;

    if (isInvoking) {
      if (timeoutId === null) {
        leadingEdge(time);
        return;
      }
      if (maxWait !== undefined) {
        cancelTimer(timeoutId);
        timeoutId = setTimeout(timerExpired, delay);
        invokeFunc(time);
        return;
      }
    }
    if (timeoutId === null) {
      timeoutId = setTimeout(timerExpired, delay);
    }
    
    if (maxWait !== undefined && maxTimeoutId === null) {
      maxTimeoutId = setTimeout(() => {
        if (timeoutId !== null) {
          trailingEdge(Date.now());
        }
      }, maxWait);
    }
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced;
}

/**
 * キャンセル可能なPromiseを返す非同期デバウンス関数
 */
export interface DebouncedAsyncFunction<T extends (...args: unknown[]) => Promise<unknown>> {
  (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null>;
  cancel(): void;
  pending(): boolean;
}

/**
 * 非同期関数のデバウンス版を作成する
 * キャンセルされた呼び出しはnullを返す
 * 
 * @param func - デバウンスする非同期関数
 * @param options - デバウンス設定オプション
 * @returns デバウンス版の非同期関数
 */
export function debounceAsync<T extends (...args: unknown[]) => Promise<unknown>>(
  func: T,
  options: DebounceOptions
): DebouncedAsyncFunction<T> {
  const { delay } = options;
  
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let currentReject: ((reason?: unknown) => void) | null = null;

  function cancel(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (currentReject) {
      currentReject(new Error('Cancelled'));
      currentReject = null;
    }
  }

  function pending(): boolean {
    return timeoutId !== null;
  }

  async function debounced(...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | null> {
    cancel();

    return new Promise<Awaited<ReturnType<T>> | null>((resolve, reject) => {
      currentReject = reject;
      
      timeoutId = setTimeout(async () => {
        timeoutId = null;
        currentReject = null;
        try {
          const result = await func(...args);
          resolve(result as Awaited<ReturnType<T>>);
        } catch (error) {
          reject(error);
        }
      }, delay);
    }).catch((error) => {
      if (error instanceof Error && error.message === 'Cancelled') {
        return null;
      }
      throw error;
    });
  }

  debounced.cancel = cancel;
  debounced.pending = pending;

  return debounced;
}

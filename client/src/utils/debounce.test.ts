import { debounce, debounceAsync, DebouncedFunction, DebouncedAsyncFunction } from './debounce';

describe('debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本動作', () => {
    it('指定された遅延後に関数を実行する', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
    });

    it('連続呼び出し時は最後の呼び出しのみ実行する', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced('first');
      debounced('second');
      debounced('third');

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('third');
    });

    it('遅延時間内の呼び出しはタイマーをリセットする', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced();
      jest.advanceTimersByTime(50);
      debounced();
      jest.advanceTimersByTime(50);
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('leading オプション', () => {
    it('leading: true の場合、最初の呼び出しで即座に実行する', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100, leading: true });

      debounced('first');
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('first');

      debounced('second');
      expect(func).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      expect(func).toHaveBeenCalledTimes(2);
      expect(func).toHaveBeenLastCalledWith('second');
    });
  });

  describe('maxWait オプション', () => {
    it('maxWait を超えると強制的に実行する', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100, maxWait: 200 });

      debounced('first');
      jest.advanceTimersByTime(50);
      debounced('second');
      jest.advanceTimersByTime(50);
      debounced('third');
      jest.advanceTimersByTime(50);
      debounced('fourth');
      jest.advanceTimersByTime(50);

      // maxWait (200 ms) に達したので実行される
      expect(func).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel メソッド', () => {
    it('保留中の実行をキャンセルする', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced();
      debounced.cancel();

      jest.advanceTimersByTime(100);
      expect(func).not.toHaveBeenCalled();
    });

    it('キャンセル後は pending が false を返す', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced();
      expect(debounced.pending()).toBe(true);

      debounced.cancel();
      expect(debounced.pending()).toBe(false);
    });
  });

  describe('flush メソッド', () => {
    it('保留中の実行を即座に実行する', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced('test');
      expect(func).not.toHaveBeenCalled();

      debounced.flush();
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('test');
    });

    it('保留中の実行がない場合は何もしない', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      debounced.flush();
      expect(func).not.toHaveBeenCalled();
    });
  });

  describe('pending メソッド', () => {
    it('保留中の実行がある場合は true を返す', () => {
      const func = jest.fn();
      const debounced = debounce(func, { delay: 100 });

      expect(debounced.pending()).toBe(false);
      debounced();
      expect(debounced.pending()).toBe(true);

      jest.advanceTimersByTime(100);
      expect(debounced.pending()).toBe(false);
    });
  });
});

describe('debounceAsync', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本動作', () => {
    it('指定された遅延後に非同期関数を実行する', async () => {
      const func = jest.fn().mockResolvedValue('result');
      const debounced = debounceAsync(func, { delay: 100 });

      const promise = debounced();
      expect(func).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);
      await Promise.resolve(); // マイクロタスクを処理

      const result = await promise;
      expect(func).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('連続呼び出し時は前の呼び出しをキャンセルする', async () => {
      const func = jest.fn().mockResolvedValue('result');
      const debounced = debounceAsync(func, { delay: 100 });

      const promise1 = debounced('first');
      const promise2 = debounced('second');

      jest.advanceTimersByTime(100);
      await Promise.resolve(); // マイクロタスクを処理

      const result1 = await promise1;
      const result2 = await promise2;

      expect(result1).toBeNull(); // キャンセルされた
      expect(result2).toBe('result');
      expect(func).toHaveBeenCalledTimes(1);
      expect(func).toHaveBeenCalledWith('second');
    });
  });

  describe('cancel メソッド', () => {
    it('保留中の実行をキャンセルする', async () => {
      const func = jest.fn().mockResolvedValue('result');
      const debounced = debounceAsync(func, { delay: 100 });

      const promise = debounced();
      debounced.cancel();

      jest.advanceTimersByTime(100);
      await Promise.resolve(); // マイクロタスクを処理

      const result = await promise;
      expect(result).toBeNull();
      expect(func).not.toHaveBeenCalled();
    });
  });

  describe('pending メソッド', () => {
    it('保留中の実行がある場合は true を返す', async () => {
      const func = jest.fn().mockResolvedValue('result');
      const debounced = debounceAsync(func, { delay: 100 });

      expect(debounced.pending()).toBe(false);
      debounced();
      expect(debounced.pending()).toBe(true);

      jest.advanceTimersByTime(100);
      await Promise.resolve(); // マイクロタスクを処理

      expect(debounced.pending()).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('非同期関数のエラーを伝播する', async () => {
      const error = new Error('Test error');
      const func = jest.fn().mockRejectedValue(error);
      const debounced = debounceAsync(func, { delay: 100 });

      const promise = debounced();
      jest.advanceTimersByTime(100);
      await Promise.resolve(); // マイクロタスクを処理

      await expect(promise).rejects.toThrow('Test error');
    });
  });
});

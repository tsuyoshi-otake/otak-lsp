import { TextDocument } from 'vscode-languageserver-textdocument';
import { AnalysisRunOutcome, createAnalysisScheduler } from './analysisScheduler';
import { AnalysisStateManager } from './languageServer';
import { ConfigManager } from './configManager';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

describe('解析予約のライフサイクル', () => {
  const uri = 'file:///lifecycle.md';
  let states: AnalysisStateManager;
  let scheduler: ReturnType<typeof createAnalysisScheduler>;
  const document = (version: number) => TextDocument.create(uri, 'markdown', version, `本文${version}`);

  beforeEach(() => {
    jest.useFakeTimers();
    states = new AnalysisStateManager();
    scheduler = createAnalysisScheduler(states, {
      getConfig: () => ({ enableGrammarCheck: true, enableSemanticHighlight: true, debounceDelay: 20 }),
      getAdvancedConfig: () => ({ ...DEFAULT_ADVANCED_RULES_CONFIG, tieredExecution: { enabled: true, idleDelayMs: 100 } }),
    } as ConfigManager);
  });

  afterEach(() => {
    scheduler.clearAllTimers();
    jest.useRealTimers();
  });

  const completedOutcome = (): AnalysisRunOutcome => ({ status: 'completed', diagnostics: 0, omittedDiagnostics: 0 });

  it('保存で全ルール解析を開始したら古い軽量予約を実行しない', async () => {
    let finish!: () => void;
    const execute = jest.fn(() => new Promise<AnalysisRunOutcome>(resolve => { finish = () => resolve(completedOutcome()); }));
    scheduler.setExecuteAnalysis(execute);
    scheduler.scheduleAnalysis(document(1));
    scheduler.scheduleFullAnalysis(uri);
    await jest.advanceTimersByTimeAsync(150);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenLastCalledWith(uri, false);
    finish();
    await jest.advanceTimersByTimeAsync(0);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('全ルール解析中の編集にも新しいアイドル解析を予約する', async () => {
    let finish!: () => void;
    const calls: Array<[number, boolean]> = [];
    scheduler.setExecuteAnalysis(async (_uri, light) => {
      calls.push([states.getState(uri).latestVersion, light]);
      if (!light && calls.length === 2) {
        await new Promise<void>(resolve => { finish = resolve; });
      }
      return completedOutcome();
    });
    scheduler.scheduleAnalysis(document(1));
    await jest.advanceTimersByTimeAsync(100);
    scheduler.scheduleAnalysis(document(2));
    finish();
    await jest.advanceTimersByTimeAsync(120);
    expect(calls).toEqual([[1, true], [1, false], [2, true], [2, false]]);
  });

  it('閉じた文書の解析完了で状態を再作成しない', async () => {
    let finish!: () => void;
    scheduler.setExecuteAnalysis(() => new Promise<AnalysisRunOutcome>(resolve => { finish = () => resolve(completedOutcome()); }));
    scheduler.scheduleAnalysis(document(1));
    await jest.advanceTimersByTimeAsync(20);
    scheduler.cancelAnalysis(uri);
    states.deleteState(uri);
    finish();
    await jest.advanceTimersByTimeAsync(200);
    expect(states.hasState(uri)).toBe(false);
  });

  it('旧versionの解析完了で新versionの待機を早期解決しない', async () => {
    // Codex再現: v1 の全ルール解析進行中に文書が v2 になり runFullAnalysis(v2)
    // が呼ばれると、v1 実行の終端が v2 の待機者を 'stale' で解決していた。
    const resolutions: AnalysisRunOutcome[] = [];
    let v1Finish!: () => void;
    scheduler.setExecuteAnalysis(jest.fn()
      .mockImplementationOnce(() => new Promise<AnalysisRunOutcome>((r) => { v1Finish = () => r({ status: 'stale' }); }))
      .mockResolvedValue(completedOutcome()));

    // v1 の全ルール解析を開始（execute がブロック中）
    states.updateState(uri, { latestDocument: document(1), latestVersion: 1, lastChangeAt: 0 });
    scheduler.scheduleFullAnalysis(uri);
    await jest.advanceTimersByTimeAsync(0);
    expect(states.getState(uri).running).toBe(true);

    // v2 が届き、v2 の runFullAnalysis を待機
    states.updateState(uri, { latestDocument: document(2), latestVersion: 2, lastChangeAt: 1 });
    const req = scheduler.runFullAnalysis(uri);
    void req.outcome.then((o) => { resolutions.push(o); });

    // v1 実行が stale で終端しても、v2 の待機者は v1 の結果では解決されない。
    // その後に走る v2 全ルール解析の結果で解決される。
    v1Finish();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(0);
    // 旧実装（generation 紐付けのみ）では最初の解決が 'stale' になる。
    expect(resolutions).toEqual([completedOutcome()]);
  });

  it('cancelAnalysis は待機中の runFullAnalysis を cancelled で解決する', async () => {
    states.updateState(uri, { latestDocument: document(1), latestVersion: 1, lastChangeAt: 0 });
    scheduler.setExecuteAnalysis(() => new Promise<AnalysisRunOutcome>(() => { /* 永続ブロック */ }));
    scheduler.scheduleFullAnalysis(uri);
    await jest.advanceTimersByTimeAsync(0);
    const req = scheduler.runFullAnalysis(uri);
    scheduler.cancelAnalysis(uri);
    await expect(req.outcome).resolves.toEqual({ status: 'cancelled' });
  });

  it('request.cancel() はその待機だけを解除する', async () => {
    states.updateState(uri, { latestDocument: document(1), latestVersion: 1, lastChangeAt: 0 });
    scheduler.setExecuteAnalysis(() => new Promise<AnalysisRunOutcome>(() => { /* 永続ブロック */ }));
    scheduler.scheduleFullAnalysis(uri);
    await jest.advanceTimersByTimeAsync(0);
    const req1 = scheduler.runFullAnalysis(uri);
    const req2 = scheduler.runFullAnalysis(uri);
    req1.cancel();
    await expect(req1.outcome).resolves.toEqual({ status: 'cancelled' });
    // req2 は解析完了まで解決されないまま残る（ここでは実行がブロック中）
    let resolved = false;
    void req2.outcome.then(() => { resolved = true; });
    await jest.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(false);
    req2.cancel(); // cleanup
  });

  it('実行失敗後も次の編集を処理できる', async () => {
    const execute = jest.fn().mockRejectedValueOnce(new Error('解析失敗')).mockResolvedValue(completedOutcome());
    scheduler.setExecuteAnalysis(execute);
    scheduler.scheduleAnalysis(document(1));
    await jest.advanceTimersByTimeAsync(20);
    scheduler.scheduleAnalysis(document(2));
    await jest.advanceTimersByTimeAsync(20);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(states.getState(uri).running).toBe(false);
  });
});

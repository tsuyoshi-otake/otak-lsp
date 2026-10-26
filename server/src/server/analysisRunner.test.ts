import { TextDocument } from 'vscode-languageserver-textdocument';
import { createExecuteAnalysis, AnalysisRunnerDeps } from './analysisRunner';
import { AnalysisResult } from './documentAnalyzer';
import { AnalysisStateManager } from './languageServer';
import { DocumentCacheStore } from './documentCacheStore';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';

describe('解析結果の世代確認', () => {
  const uri = 'file:///result.md';
  const result: AnalysisResult = { status: 'completed', tokens: [], diagnostics: [], omittedDiagnostics: 0, excludedRanges: [], lineStarts: [0], profileSteps: [] };
  let states: AnalysisStateManager;
  let cache: DocumentCacheStore;
  let publish: jest.Mock;
  let clear: jest.Mock;
  let notify: jest.Mock;
  let finish: (value: AnalysisResult) => void;
  let fail: (reason: Error) => void;
  let execute: ReturnType<typeof createExecuteAnalysis>;

  beforeEach(() => {
    states = new AnalysisStateManager();
    states.updateState(uri, { latestDocument: TextDocument.create(uri, 'markdown', 5, '古い本文'), latestVersion: 5 });
    cache = new DocumentCacheStore();
    publish = jest.fn();
    clear = jest.fn();
    notify = jest.fn().mockResolvedValue(undefined);
    const work = new Promise<AnalysisResult>((resolve, reject) => { finish = resolve; fail = reject; });
    execute = createExecuteAnalysis({
      analysisStates: states, cacheStore: cache,
      connection: { sendRequest: jest.fn().mockResolvedValue(undefined), sendNotification: notify },
      configManager: { getConfig: () => ({ enableSemanticHighlight: true }), getAdvancedConfig: () => DEFAULT_ADVANCED_RULES_CONFIG },
      documentAnalyzer: { analyze: () => work },
      diagnosticsPublisher: { publish, clear },
      profiler: {}, isProfileLogsEnabled: () => false,
    } as unknown as AnalysisRunnerDeps);
  });

  it('クローズ後の結果を公開せず状態を再作成しない', async () => {
    const task = execute(uri, false);
    states.deleteState(uri);
    finish(result);
    await task;
    expect(states.hasState(uri)).toBe(false);
    expect(cache.getEntry(uri)).toBeUndefined();
    expect(publish).not.toHaveBeenCalled();
  });

  it.each([1, 5])('同じURIをバージョン%iで開き直しても旧結果を公開しない', async version => {
    const task = execute(uri, false);
    states.deleteState(uri);
    states.updateState(uri, { latestDocument: TextDocument.create(uri, 'markdown', version, '新しい本文'), latestVersion: version });
    finish(result);
    await task;
    expect(publish).not.toHaveBeenCalled();
    expect(cache.getEntry(uri)).toBeUndefined();
  });

  it('古い解析の失敗で開き直した文書の結果を消さない', async () => {
    const task = execute(uri, false);
    states.deleteState(uri);
    states.updateState(uri, { latestDocument: TextDocument.create(uri, 'markdown', 1, '新しい本文'), latestVersion: 1 });
    cache.setAnalysisResult(uri, [], '新しい本文', [], [0]);
    fail(new Error('旧解析が失敗'));
    await task;
    expect(clear).not.toHaveBeenCalled();
    expect(cache.getText(uri)).toBe('新しい本文');
  });

  it('省略通知の総件数に案内用マーカーを含めない', async () => {
    const diagnostic = (code: string) => ({ code, message: code, range: {
      start: { line: 0, character: 0 }, end: { line: 0, character: 1 },
    } });
    const task = execute(uri, false);
    finish({ ...result, omittedDiagnostics: 3, diagnostics: [diagnostic('double-particle'), diagnostic('diagnostics-truncated')] });
    await task;
    expect(notify).toHaveBeenCalledWith('otakLsp/analysisNotice', {
      uri, kind: 'diagnostics-truncated', omitted: 3, total: 4,
    });
  });
});

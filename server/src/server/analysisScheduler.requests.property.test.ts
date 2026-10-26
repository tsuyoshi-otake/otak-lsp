/**
 * 手動解析の操作履歴を、実スケジューラーの観測結果と照合する。
 * Issue #21: 本体の完了条件を模写せず、依頼版と境界イベントの対応を検証する。
 * executor は制御可能な契約アダプター。runner 内部の stale 判定は別テストの責務。
 */
import * as fc from 'fast-check';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DEFAULT_ADVANCED_RULES_CONFIG } from '../../../shared/src/advancedTypes';
import { AnalysisRunOutcome, createAnalysisScheduler } from './analysisScheduler';
import { AnalysisStateManager } from './languageServer';
import { ConfigManager } from './configManager';

type Operation = 'request' | 'edit' | 'complete' | 'fail' | 'cancel';
interface Completion {
  version: number;
  step: number;
  result: AnalysisRunOutcome;
}
interface RequestObservation {
  version: number;
  step: number;
  result?: AnalysisRunOutcome;
}

const flush = async (): Promise<void> => {
  // 実際のPromise連鎖を進める。壁時計・デバウンスタイマーを進める操作ではない。
  for (let i = 0; i < 12; i++) await Promise.resolve();
};

describe('Issue #21: 手動解析要求の状態履歴', () => {
  it('旧版の解析完了が新版の手動要求を早期解決しない', async () => {
    const uri = 'file:///manual-version.md';
    const states = new AnalysisStateManager();
    const scheduler = createAnalysisScheduler(states, {
      getConfig: () => ({ maxConcurrentAnalyses: 1, debounceDelay: 1 }),
      getAdvancedConfig: () => DEFAULT_ADVANCED_RULES_CONFIG,
    } as unknown as ConfigManager);
    const pending: Array<(outcome: AnalysisRunOutcome) => void> = [];
    scheduler.setExecuteAnalysis(() => new Promise(resolve => pending.push(resolve)));
    states.updateState(uri, { latestVersion: 1, latestDocument: TextDocument.create(uri, 'markdown', 1, '旧') });
    scheduler.scheduleFullAnalysis(uri);
    await flush();
    states.updateState(uri, { latestVersion: 2, latestDocument: TextDocument.create(uri, 'markdown', 2, '新') });
    const request = scheduler.runFullAnalysis(uri);
    let observed: AnalysisRunOutcome | undefined;
    void request.outcome.then(outcome => { observed = outcome; });
    try {
      pending.shift()!({ status: 'stale' });
      await flush();
      expect(observed).toBeUndefined();
      expect(pending).toHaveLength(1);
      pending.shift()!({ status: 'completed', diagnostics: 1, omittedDiagnostics: 0 });
      await expect(request.outcome).resolves.toEqual({ status: 'completed', diagnostics: 1, omittedDiagnostics: 0 });
    } finally {
      request.cancel();
      scheduler.clearAllTimers();
      pending.forEach(resolve => resolve({ status: 'cancelled' }));
      await flush();
    }
  });

  it('操作列の依頼・版更新・完了・失敗・取消を実装に適用し、対応する終端だけを観測する', async () => {
    await fc.assert(fc.asyncProperty(
      fc.array(fc.constantFrom<Operation>('request', 'edit', 'complete', 'fail', 'cancel'), { minLength: 1, maxLength: 24 }),
      async (operations) => {
        const uri = 'file:///scheduler-request-property.md';
        const states = new AnalysisStateManager();
        let version = 1;
        let step = 0;
        const config = {
          getConfig: () => ({ maxConcurrentAnalyses: 1, enableGrammarCheck: true, enableSemanticHighlight: true, debounceDelay: 1 }),
          getAdvancedConfig: () => DEFAULT_ADVANCED_RULES_CONFIG,
        } as unknown as ConfigManager;
        const scheduler = createAnalysisScheduler(states, config);
        const executions: Array<{ version: number; resolve: (outcome: AnalysisRunOutcome) => void }> = [];
        const completions: Completion[] = [];
        const requests: RequestObservation[] = [];
        const cancellations: number[] = [];
        const updateDocument = (): void => {
          states.updateState(uri, { latestVersion: version, latestDocument: TextDocument.create(uri, 'markdown', version, `版${version}`) });
        };
        updateDocument();
        scheduler.setExecuteAnalysis(() => new Promise<AnalysisRunOutcome>((resolve) => {
          // 境界に到達した事実を観測する。スケジューラーの待機者選択は再実装しない。
          executions.push({ version: states.getExistingState(uri)!.latestVersion, resolve });
        }));
        const request = (): void => {
          const observation: RequestObservation = { version, step };
          requests.push(observation);
          void scheduler.runFullAnalysis(uri).outcome.then(result => { observation.result = result; });
        };
        const finish = (fail = false): void => {
          const execution = executions.shift();
          if (!execution) return;
          const result: AnalysisRunOutcome = execution.version !== version
            ? { status: 'stale' }
            : fail ? { status: 'failed', error: 'controlled executor failure' }
              : { status: 'completed', diagnostics: 1, omittedDiagnostics: 0 };
          completions.push({ version: execution.version, step, result });
          execution.resolve(result);
        };
        const verify = (): void => {
          // このfixtureでは一つのURI/世代。直列化は本番の制約であり生成順序もそれに従う。
          expect(executions.length).toBeLessThanOrEqual(1);
          for (const item of requests) {
            if (!item.result) continue;
            if (item.result.status === 'cancelled') {
              expect(cancellations.some(cancelStep => cancelStep >= item.step)).toBe(true);
            } else {
              expect(completions.some(completion => completion.step >= item.step
                && completion.version >= item.version
                && completion.result.status === item.result!.status)).toBe(true);
            }
          }
        };
        try {
          for (const operation of operations) {
            step++;
            if (operation === 'request') request();
            if (operation === 'edit') { version++; updateDocument(); }
            if (operation === 'complete') finish();
            if (operation === 'fail') finish(true);
            if (operation === 'cancel') { cancellations.push(step); scheduler.cancelAnalysis(uri); }
            await flush();
            verify();
          }
          // 正常環境で実行機会を与えたとき、最後の正当な依頼が実際に完了することも要求する。
          step++;
          request();
          await flush();
          for (let i = 0; i < operations.length + 4 && requests.some(r => !r.result); i++) {
            step++;
            finish();
            await flush();
            verify();
          }
          expect(requests.every(r => r.result !== undefined)).toBe(true);
          expect(requests[requests.length - 1].result?.status).toBe('completed');
        } finally {
          scheduler.clearAllTimers();
          for (const execution of executions) execution.resolve({ status: 'cancelled' });
          await flush();
        }
      }
    ), { numRuns: 30, seed: 20261026 });
  });
});

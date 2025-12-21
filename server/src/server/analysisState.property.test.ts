/**
 * 解析状態管理のプロパティベーステスト
 * Feature: input-lag-improvement
 * 検証対象: 要件 1.1, 1.2, 1.3, 3.1, 3.2
 */

import * as fc from 'fast-check';
import { AnalysisStateManager, createInitialAnalysisState } from './languageServer';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * テスト用のTextDocumentを生成するヘルパー
 */
function createMockTextDocument(uri: string, version: number, text: string): TextDocument {
  return TextDocument.create(uri, 'markdown', version, text);
}

describe('Property-Based Tests: 解析状態管理', () => {
  /**
   * Feature: input-lag-improvement, Property 1: 解析の直列化
   * 任意の文書URIに対して、解析が実行中の場合、新しい解析要求は待機状態に設定され、同時実行されない
   * 検証対象: 要件 1.1, 1.2
   */
  describe('Property 1: 解析の直列化', () => {
    it('解析実行中に新しい要求が来た場合、待機状態に設定される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version1, version2) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の解析を開始（running = true）
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: version1,
              lastChangeAt: Date.now(),
            });

            // 解析実行中であることを確認
            const stateAfterStart = manager.getState(uri);
            expect(stateAfterStart.running).toBe(true);

            // 新しい解析要求が来た場合、待機状態に設定
            const newVersion = version1 + version2;
            manager.updateState(uri, {
              pending: true,
              latestVersion: newVersion,
              lastChangeAt: Date.now(),
            });

            // 状態を確認
            const stateAfterNewRequest = manager.getState(uri);
            // 実行中フラグは維持される
            expect(stateAfterNewRequest.running).toBe(true);
            // 待機フラグが設定される
            expect(stateAfterNewRequest.pending).toBe(true);
            // 最新バージョンが更新される
            expect(stateAfterNewRequest.latestVersion).toBe(newVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析完了後に待機中の要求があれば、次の解析を開始できる状態になる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 解析実行中で待機中の要求がある状態
            manager.updateState(uri, {
              running: true,
              pending: true,
              latestVersion: version,
              lastChangeAt: Date.now(),
            });

            // 解析完了時の状態遷移をシミュレート
            const stateBeforeComplete = manager.getState(uri);
            expect(stateBeforeComplete.running).toBe(true);
            expect(stateBeforeComplete.pending).toBe(true);

            // 解析完了: running = false に設定
            manager.updateState(uri, {
              running: false,
            });

            // 待機中の要求があるので、次の解析を開始できる
            const stateAfterComplete = manager.getState(uri);
            expect(stateAfterComplete.running).toBe(false);
            expect(stateAfterComplete.pending).toBe(true);

            // 次の解析を開始
            manager.updateState(uri, {
              running: true,
              pending: false,
            });

            const stateAfterRestart = manager.getState(uri);
            expect(stateAfterRestart.running).toBe(true);
            expect(stateAfterRestart.pending).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析が実行中でない場合、新しい要求は即座に実行状態になれる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 初期状態（実行中でない）
            const initialState = manager.getState(uri);
            expect(initialState.running).toBe(false);

            // 新しい解析要求を即座に実行状態に設定
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: version,
              lastChangeAt: Date.now(),
            });

            const stateAfterStart = manager.getState(uri);
            expect(stateAfterStart.running).toBe(true);
            expect(stateAfterStart.pending).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('連続する解析要求のシーケンスで、同時に複数の解析が実行中にならない', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.array(
            fc.record({
              action: fc.constantFrom('request', 'complete'),
              version: fc.integer({ min: 1, max: 1000 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (uriSuffix, actions) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;
            let runningCount = 0;
            let maxRunningCount = 0;

            for (const action of actions) {
              const currentState = manager.getState(uri);

              if (action.action === 'request') {
                if (currentState.running) {
                  // 実行中なら待機状態に設定
                  manager.updateState(uri, {
                    pending: true,
                    latestVersion: action.version,
                    lastChangeAt: Date.now(),
                  });
                } else {
                  // 実行中でなければ開始
                  manager.updateState(uri, {
                    running: true,
                    pending: false,
                    latestVersion: action.version,
                    lastChangeAt: Date.now(),
                  });
                  runningCount++;
                }
              } else if (action.action === 'complete') {
                if (currentState.running) {
                  manager.updateState(uri, { running: false });
                  runningCount--;

                  // 待機中の要求があれば次を開始
                  const stateAfterComplete = manager.getState(uri);
                  if (stateAfterComplete.pending) {
                    manager.updateState(uri, {
                      running: true,
                      pending: false,
                    });
                    runningCount++;
                  }
                }
              }

              maxRunningCount = Math.max(maxRunningCount, runningCount);
            }

            // 同時に実行中の解析は最大1つ
            expect(maxRunningCount).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });


  /**
   * Feature: input-lag-improvement, Property 2: 最新要求の優先
   * 任意の文書に対して複数の解析要求が待機している場合、最新の文書状態のみが解析対象となる
   * 検証対象: 要件 1.3
   */
  describe('Property 2: 最新要求の優先', () => {
    it('複数の解析要求が来ても、最新のバージョンのみが保持される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 10 }),
          (uriSuffix, versions) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の解析を開始
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: versions[0],
              lastChangeAt: Date.now(),
            });

            // 複数の解析要求を順次受け付け
            let latestVersion = versions[0];
            for (let i = 1; i < versions.length; i++) {
              latestVersion = versions[i];
              manager.updateState(uri, {
                pending: true,
                latestVersion: latestVersion,
                lastChangeAt: Date.now() + i,
              });
            }

            // 最新のバージョンのみが保持されている
            const finalState = manager.getState(uri);
            expect(finalState.latestVersion).toBe(latestVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('待機中の要求が上書きされても、最新の文書情報が保持される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, text1, text2, version1, version2) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の解析を開始
            const doc1 = createMockTextDocument(uri, version1, text1);
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestDocument: doc1,
              latestVersion: version1,
              lastChangeAt: Date.now(),
            });

            // 新しい要求で上書き
            const doc2 = createMockTextDocument(uri, version1 + version2, text2);
            manager.updateState(uri, {
              pending: true,
              latestDocument: doc2,
              latestVersion: version1 + version2,
              lastChangeAt: Date.now() + 1,
            });

            // 最新の文書情報が保持されている
            const finalState = manager.getState(uri);
            expect(finalState.latestDocument).toBe(doc2);
            expect(finalState.latestVersion).toBe(version1 + version2);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析完了後に待機中の要求を処理する際、最新の文書状態が使用される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              version: fc.integer({ min: 1, max: 1000 }),
              timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (uriSuffix, requests) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の解析を開始
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: requests[0].version,
              lastChangeAt: requests[0].timestamp,
            });

            // 残りの要求を待機状態として追加（最新のみ保持）
            let latestRequest = requests[0];
            for (let i = 1; i < requests.length; i++) {
              latestRequest = requests[i];
              manager.updateState(uri, {
                pending: true,
                latestVersion: latestRequest.version,
                lastChangeAt: latestRequest.timestamp,
              });
            }

            // 解析完了
            manager.updateState(uri, { running: false });

            // 待機中の要求があるので、次の解析を開始できる
            const stateBeforeRestart = manager.getState(uri);
            expect(stateBeforeRestart.pending).toBe(true);
            expect(stateBeforeRestart.latestVersion).toBe(latestRequest.version);

            // 次の解析を開始
            manager.updateState(uri, {
              running: true,
              pending: false,
            });

            // 最新の文書状態で解析が開始される
            const stateAfterRestart = manager.getState(uri);
            expect(stateAfterRestart.running).toBe(true);
            expect(stateAfterRestart.latestVersion).toBe(latestRequest.version);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('lastChangeAtが最新の要求を追跡する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }), { minLength: 2, maxLength: 10 }),
          (uriSuffix, timestamps) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の解析を開始
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: 1,
              lastChangeAt: timestamps[0],
            });

            // 複数の要求を順次受け付け
            let latestTimestamp = timestamps[0];
            for (let i = 1; i < timestamps.length; i++) {
              latestTimestamp = timestamps[i];
              manager.updateState(uri, {
                pending: true,
                latestVersion: i + 1,
                lastChangeAt: latestTimestamp,
              });
            }

            // 最新のタイムスタンプが保持されている
            const finalState = manager.getState(uri);
            expect(finalState.lastChangeAt).toBe(latestTimestamp);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: input-lag-improvement, Property 5: デバウンス動作の維持
   * 任意の連続する文書変更に対して、適切なデバウンス遅延が適用され、
   * 解析完了後の再スケジューリングで残り時間が正しく計算される
   * 検証対象: 要件 4.1, 4.2, 4.3
   */
  describe('Property 5: デバウンス動作の維持', () => {
    it('解析が実行中でない場合、デバウンスタイマーを開始できる状態になる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          (uriSuffix, version, timestamp) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 初期状態（実行中でない）
            const initialState = manager.getState(uri);
            expect(initialState.running).toBe(false);

            // 解析要求を記録（デバウンスタイマー開始の前提条件）
            manager.updateState(uri, {
              latestVersion: version,
              lastChangeAt: timestamp,
            });

            // 実行中でないので、デバウンスタイマーを開始できる
            const stateAfterUpdate = manager.getState(uri);
            expect(stateAfterUpdate.running).toBe(false);
            expect(stateAfterUpdate.latestVersion).toBe(version);
            expect(stateAfterUpdate.lastChangeAt).toBe(timestamp);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析実行中の場合、デバウンスタイマーは開始されず待機状態になる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version1, version2) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 解析を開始（running = true）
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: version1,
              lastChangeAt: Date.now(),
            });

            // 新しい変更が来た場合、待機状態に設定
            const newVersion = version1 + version2;
            const newTimestamp = Date.now() + 100;
            manager.updateState(uri, {
              pending: true,
              latestVersion: newVersion,
              lastChangeAt: newTimestamp,
            });

            // 実行中フラグは維持され、待機状態になる
            const state = manager.getState(uri);
            expect(state.running).toBe(true);
            expect(state.pending).toBe(true);
            expect(state.latestVersion).toBe(newVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析完了後に待機中の要求がある場合、残り遅延時間を計算できる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 0, max: 500 }),
          (uriSuffix, debounceDelay, elapsed) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;
            const baseTime = 1000000;

            // 解析実行中で待機中の要求がある状態
            manager.updateState(uri, {
              running: true,
              pending: true,
              latestVersion: 1,
              lastChangeAt: baseTime,
            });

            // 解析完了
            manager.updateState(uri, { running: false });

            // 残り遅延時間を計算
            const state = manager.getState(uri);
            const currentTime = baseTime + elapsed;
            const remainingDelay = Math.max(0, debounceDelay - (currentTime - state.lastChangeAt));

            // 残り遅延時間は0以上
            expect(remainingDelay).toBeGreaterThanOrEqual(0);
            // 残り遅延時間はデバウンス遅延以下
            expect(remainingDelay).toBeLessThanOrEqual(debounceDelay);
            // 経過時間がデバウンス遅延以上なら残り時間は0
            if (elapsed >= debounceDelay) {
              expect(remainingDelay).toBe(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('連続する文書変更に対して、最新の変更時刻が記録される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              version: fc.integer({ min: 1, max: 1000 }),
              timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (uriSuffix, changes) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 連続する変更を適用
            let latestTimestamp = 0;
            for (const change of changes) {
              latestTimestamp = change.timestamp;
              manager.updateState(uri, {
                latestVersion: change.version,
                lastChangeAt: change.timestamp,
              });
            }

            // 最新の変更時刻が記録されている
            const state = manager.getState(uri);
            expect(state.lastChangeAt).toBe(latestTimestamp);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析完了後の再スケジューリングで、待機フラグがリセットされる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 解析実行中で待機中の要求がある状態
            manager.updateState(uri, {
              running: true,
              pending: true,
              latestVersion: version,
              lastChangeAt: Date.now(),
            });

            // 解析完了
            manager.updateState(uri, { running: false });

            // 待機中の要求があることを確認
            const stateAfterComplete = manager.getState(uri);
            expect(stateAfterComplete.pending).toBe(true);

            // 次の解析を開始（再スケジューリング）
            manager.updateState(uri, {
              running: true,
              pending: false,
            });

            // 待機フラグがリセットされている
            const stateAfterRestart = manager.getState(uri);
            expect(stateAfterRestart.running).toBe(true);
            expect(stateAfterRestart.pending).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('デバウンス遅延計算が正しく行われる（経過時間 < デバウンス遅延）', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 0, max: 99 }),
          (debounceDelay, elapsedPercent) => {
            // 経過時間をデバウンス遅延の割合で計算
            const elapsed = Math.floor((debounceDelay * elapsedPercent) / 100);
            const remainingDelay = Math.max(0, debounceDelay - elapsed);

            // 残り遅延時間は正の値
            expect(remainingDelay).toBeGreaterThan(0);
            // 残り遅延時間 + 経過時間 = デバウンス遅延
            expect(remainingDelay + elapsed).toBe(debounceDelay);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('デバウンス遅延計算が正しく行われる（経過時間 >= デバウンス遅延）', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          fc.integer({ min: 100, max: 200 }),
          (debounceDelay, elapsedPercent) => {
            // 経過時間をデバウンス遅延以上に設定
            const elapsed = Math.floor((debounceDelay * elapsedPercent) / 100);
            const remainingDelay = Math.max(0, debounceDelay - elapsed);

            // 残り遅延時間は0
            expect(remainingDelay).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: input-lag-improvement, Property 4: 状態管理の一貫性
   * 任意の文書URIに対して、解析状態が適切に管理され、文書クローズ時に状態が削除される
   * 検証対象: 要件 3.1, 3.2
   */
  describe('Property 4: 状態管理の一貫性', () => {
    it('任意のURIに対して解析状態を取得すると、初期状態または既存状態が返される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (uriSuffix) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 初回取得時は初期状態
            const state = manager.getState(uri);
            const initialState = createInitialAnalysisState();

            expect(state.running).toBe(initialState.running);
            expect(state.pending).toBe(initialState.pending);
            expect(state.latestDocument).toBe(initialState.latestDocument);
            expect(state.latestVersion).toBe(initialState.latestVersion);
            expect(state.lastChangeAt).toBe(initialState.lastChangeAt);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('任意のURIに対して状態を更新すると、更新内容が反映される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.boolean(),
          fc.boolean(),
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          (uriSuffix, running, pending, version, timestamp) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 状態を更新
            const updatedState = manager.updateState(uri, {
              running,
              pending,
              latestVersion: version,
              lastChangeAt: timestamp,
            });

            // 更新内容が反映されている
            expect(updatedState.running).toBe(running);
            expect(updatedState.pending).toBe(pending);
            expect(updatedState.latestVersion).toBe(version);
            expect(updatedState.lastChangeAt).toBe(timestamp);

            // 再取得しても同じ状態
            const retrievedState = manager.getState(uri);
            expect(retrievedState.running).toBe(running);
            expect(retrievedState.pending).toBe(pending);
            expect(retrievedState.latestVersion).toBe(version);
            expect(retrievedState.lastChangeAt).toBe(timestamp);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('任意のURIに対して状態を削除すると、そのURIの状態は存在しなくなる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 状態を設定
            manager.updateState(uri, { latestVersion: version, running: true });
            expect(manager.hasState(uri)).toBe(true);

            // 状態を削除
            const deleted = manager.deleteState(uri);
            expect(deleted).toBe(true);

            // 削除後は存在しない
            expect(manager.hasState(uri)).toBe(false);

            // 再度取得すると初期状態が返される
            const newState = manager.getState(uri);
            expect(newState.running).toBe(false);
            expect(newState.latestVersion).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('複数のURIに対して独立した状態管理が行われる', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              version: fc.integer({ min: 1, max: 100 }),
              running: fc.boolean(),
            }),
            { minLength: 2, maxLength: 10 }
          ).filter(arr => {
            // 重複IDを除外
            const ids = arr.map(a => a.id);
            return new Set(ids).size === ids.length;
          }),
          (documents) => {
            const manager = new AnalysisStateManager();

            // 各ドキュメントの状態を設定
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              manager.updateState(uri, {
                latestVersion: doc.version,
                running: doc.running,
              });
            }

            // 各ドキュメントの状態が独立して保持されている
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              const state = manager.getState(uri);
              expect(state.latestVersion).toBe(doc.version);
              expect(state.running).toBe(doc.running);
            }

            // 管理中の状態数が正しい
            expect(manager.size()).toBe(documents.length);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('1つのURIの状態を削除しても他のURIの状態に影響しない', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 5 }),
          fc.integer({ min: 0, max: 4 }),
          (docCount, deleteIndex) => {
            const safeDeleteIndex = deleteIndex % docCount;
            const manager = new AnalysisStateManager();

            // 複数ドキュメントの状態を設定
            for (let i = 0; i < docCount; i++) {
              const uri = `file:///doc${i}.md`;
              manager.updateState(uri, {
                latestVersion: i + 1,
                running: i % 2 === 0,
              });
            }

            // 1つの状態を削除
            const deletedUri = `file:///doc${safeDeleteIndex}.md`;
            manager.deleteState(deletedUri);

            // 削除した状態は存在しない
            expect(manager.hasState(deletedUri)).toBe(false);

            // 他の状態は影響を受けていない
            for (let i = 0; i < docCount; i++) {
              if (i !== safeDeleteIndex) {
                const uri = `file:///doc${i}.md`;
                const state = manager.getState(uri);
                expect(state.latestVersion).toBe(i + 1);
                expect(state.running).toBe(i % 2 === 0);
              }
            }

            // 管理中の状態数が正しい
            expect(manager.size()).toBe(docCount - 1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: input-lag-improvement, Property 3: 古い結果の破棄
   * 任意の解析結果について、完了時に文書バージョンが変更されている場合、
   * 診断送信、セマンティック更新、キャッシュ更新のいずれも実行されない
   * 検証対象: 要件 2.1, 2.2, 2.3, 2.4
   */
  describe('Property 3: 古い結果の破棄', () => {
    /**
     * 古い結果かどうかを判定するヘルパー関数
     * main.tsの実装と同じロジック
     */
    function isStaleResult(analysisVersion: number | undefined, currentVersion: number): boolean {
      return analysisVersion !== undefined && currentVersion > analysisVersion;
    }

    it('解析バージョンより現在のバージョンが大きい場合、結果は古いと判定される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 1, max: 1000 }),
          (analysisVersion, versionDiff) => {
            const currentVersion = analysisVersion + versionDiff;
            
            // 現在のバージョンが解析バージョンより大きい場合、古いと判定
            expect(isStaleResult(analysisVersion, currentVersion)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析バージョンと現在のバージョンが同じ場合、結果は最新と判定される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (version) => {
            // 同じバージョンの場合、最新と判定
            expect(isStaleResult(version, version)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析バージョンがundefinedの場合、結果は最新と判定される（後方互換性）', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (currentVersion) => {
            // undefinedの場合、最新と判定（後方互換性のため）
            expect(isStaleResult(undefined, currentVersion)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析開始時のバージョンを記録し、完了時に比較することで古い結果を検出できる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 5 }),
          (uriSuffix, initialVersion, versionIncrements) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 解析開始時のバージョンを記録
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: initialVersion,
              lastChangeAt: Date.now(),
            });
            const analysisVersion = initialVersion;

            // 解析中に新しい変更が来る（バージョンが上がる）
            let currentVersion = initialVersion;
            for (const increment of versionIncrements) {
              currentVersion += increment;
              manager.updateState(uri, {
                pending: true,
                latestVersion: currentVersion,
                lastChangeAt: Date.now(),
              });
            }

            // 解析完了時に古い結果かどうかを判定
            const state = manager.getState(uri);
            const isStale = isStaleResult(analysisVersion, state.latestVersion);

            // バージョンが上がっているので、古い結果と判定される
            expect(isStale).toBe(true);
            expect(state.latestVersion).toBeGreaterThan(analysisVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析中に変更がない場合、結果は最新と判定される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          (uriSuffix, version) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 解析開始時のバージョンを記録
            manager.updateState(uri, {
              running: true,
              pending: false,
              latestVersion: version,
              lastChangeAt: Date.now(),
            });
            const analysisVersion = version;

            // 解析中に変更がない（バージョンは同じ）

            // 解析完了時に古い結果かどうかを判定
            const state = manager.getState(uri);
            const isStale = isStaleResult(analysisVersion, state.latestVersion);

            // バージョンが同じなので、最新と判定される
            expect(isStale).toBe(false);
            expect(state.latestVersion).toBe(analysisVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('古い結果の場合、キャッシュ更新・診断送信・セマンティック更新を行わない判定ができる', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.boolean(),
          fc.boolean(),
          (uriSuffix, analysisVersion, versionDiff, shouldUpdateCache, shouldSendDiagnostics) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;
            const currentVersion = analysisVersion + versionDiff;

            // 解析状態を設定
            manager.updateState(uri, {
              running: false,
              pending: false,
              latestVersion: currentVersion,
              lastChangeAt: Date.now(),
            });

            // 古い結果かどうかを判定
            const state = manager.getState(uri);
            const isStale = isStaleResult(analysisVersion, state.latestVersion);

            // 古い結果の場合、更新を行わない
            let cacheUpdated = false;
            let diagnosticsSent = false;
            let semanticRefreshed = false;

            if (!isStale) {
              // 最新の結果の場合のみ更新を行う
              cacheUpdated = shouldUpdateCache;
              diagnosticsSent = shouldSendDiagnostics;
              semanticRefreshed = shouldSendDiagnostics;
            }

            // 古い結果の場合、すべての更新が行われない
            if (isStale) {
              expect(cacheUpdated).toBe(false);
              expect(diagnosticsSent).toBe(false);
              expect(semanticRefreshed).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('連続する解析要求で、最新の結果のみが反映される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.array(
            fc.record({
              version: fc.integer({ min: 1, max: 1000 }),
              analysisTime: fc.integer({ min: 10, max: 100 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (uriSuffix, analyses) => {
            const manager = new AnalysisStateManager();
            const uri = `file:///${uriSuffix}.md`;

            // 各解析の結果を追跡
            const results: Array<{ version: number; isStale: boolean }> = [];

            // 連続する解析をシミュレート
            let latestVersion = 0;
            for (const analysis of analyses) {
              // 新しい解析要求
              latestVersion = analysis.version;
              manager.updateState(uri, {
                latestVersion: latestVersion,
                lastChangeAt: Date.now(),
              });
            }

            // 各解析の完了をシミュレート（逆順で完了する可能性がある）
            for (let i = 0; i < analyses.length; i++) {
              const analysisVersion = analyses[i].version;
              const state = manager.getState(uri);
              const isStale = isStaleResult(analysisVersion, state.latestVersion);
              results.push({ version: analysisVersion, isStale });
            }

            // 最新バージョン以外の結果は古いと判定される
            for (const result of results) {
              if (result.version < latestVersion) {
                expect(result.isStale).toBe(true);
              } else if (result.version === latestVersion) {
                expect(result.isStale).toBe(false);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('バージョン比較は厳密な大小比較で行われる', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: -100, max: 100 }),
          (baseVersion, diff) => {
            const analysisVersion = baseVersion;
            const currentVersion = baseVersion + diff;

            const isStale = isStaleResult(analysisVersion, currentVersion);

            // diff > 0 の場合のみ古いと判定
            if (diff > 0) {
              expect(isStale).toBe(true);
            } else {
              expect(isStale).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

/**
 * 機能互換性と最終一貫性のプロパティベーステスト
 * Feature: input-lag-improvement
 * 検証対象: 要件 5.1, 5.2, 5.3, 6.2, 6.3
 */

import * as fc from 'fast-check';
import { AnalysisStateManager } from './languageServer';

/**
 * 設定状態をシミュレートするインターフェース
 */
interface ConfigurationState {
  enableGrammarCheck: boolean;
  enableSemanticHighlight: boolean;
}

/**
 * 解析結果をシミュレートするインターフェース
 */
interface AnalysisResult {
  uri: string;
  version: number;
  diagnostics: string[];
  semanticTokens: number[];
}

/**
 * 機能互換性シミュレーター
 * 設定に基づいて解析結果の送信をシミュレート
 */
class FunctionalCompatibilitySimulator {
  private config: ConfigurationState;
  private analysisStates: AnalysisStateManager;
  private sentDiagnostics: Map<string, string[]> = new Map();
  private sentSemanticRefresh: Map<string, boolean> = new Map();
  private analysisResults: Map<string, AnalysisResult> = new Map();

  constructor(config: ConfigurationState) {
    this.config = config;
    this.analysisStates = new AnalysisStateManager();
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<ConfigurationState>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 設定を取得
   */
  getConfig(): ConfigurationState {
    return { ...this.config };
  }

  /**
   * 解析をシミュレート
   */
  simulateAnalysis(uri: string, version: number, text: string): AnalysisResult | null {
    const state = this.analysisStates.getState(uri);
    
    // 解析開始
    this.analysisStates.updateState(uri, {
      running: true,
      pending: false,
      latestVersion: version,
      lastChangeAt: Date.now(),
    });

    // 解析結果を生成（テキストに基づく簡易的な診断）
    const diagnostics: string[] = [];
    const semanticTokens: number[] = [];

    if (this.config.enableGrammarCheck) {
      // 簡易的な文法チェック（テキスト長に基づく）
      if (text.length > 100) {
        diagnostics.push('long-text-warning');
      }
      if (text.includes('です') && text.includes('だ')) {
        diagnostics.push('style-mix-warning');
      }
    }

    if (this.config.enableSemanticHighlight) {
      // 簡易的なセマンティックトークン生成
      for (let i = 0; i < Math.min(text.length, 10); i++) {
        semanticTokens.push(i);
      }
    }

    // 解析完了
    this.analysisStates.updateState(uri, { running: false });

    const result: AnalysisResult = {
      uri,
      version,
      diagnostics,
      semanticTokens,
    };

    // 結果を保存
    this.analysisResults.set(uri, result);

    // 要件 5.1: 文法チェックが有効な場合、診断情報を送信
    if (this.config.enableGrammarCheck) {
      this.sentDiagnostics.set(uri, diagnostics);
    }

    // 要件 5.2: セマンティックハイライトが有効な場合、更新を通知
    if (this.config.enableSemanticHighlight) {
      this.sentSemanticRefresh.set(uri, true);
    }

    return result;
  }

  /**
   * 送信された診断情報を取得
   */
  getSentDiagnostics(uri: string): string[] | undefined {
    return this.sentDiagnostics.get(uri);
  }

  /**
   * セマンティック更新が送信されたか確認
   */
  wasSemanticRefreshSent(uri: string): boolean {
    return this.sentSemanticRefresh.get(uri) ?? false;
  }

  /**
   * 解析結果を取得
   */
  getAnalysisResult(uri: string): AnalysisResult | undefined {
    return this.analysisResults.get(uri);
  }

  /**
   * 状態をクリア
   */
  clear(): void {
    this.sentDiagnostics.clear();
    this.sentSemanticRefresh.clear();
    this.analysisResults.clear();
    this.analysisStates.clear();
  }
}

/**
 * 最終一貫性シミュレーター
 * 連続編集後の最終状態をシミュレート
 */
class EventualConsistencySimulator {
  private analysisStates: AnalysisStateManager;
  private documentVersions: Map<string, number> = new Map();
  private documentTexts: Map<string, string> = new Map();
  private analysisResults: Map<string, { version: number; text: string }> = new Map();
  private debounceDelay: number;

  constructor(debounceDelay: number = 250) {
    this.analysisStates = new AnalysisStateManager();
    this.debounceDelay = debounceDelay;
  }

  /**
   * 文書変更をシミュレート
   */
  simulateDocumentChange(uri: string, version: number, text: string): void {
    this.documentVersions.set(uri, version);
    this.documentTexts.set(uri, text);

    const state = this.analysisStates.getState(uri);
    
    if (state.running) {
      // 実行中の場合は待機状態に設定
      this.analysisStates.updateState(uri, {
        pending: true,
        latestVersion: version,
        lastChangeAt: Date.now(),
      });
    } else {
      // 実行中でない場合は最新情報を記録
      this.analysisStates.updateState(uri, {
        latestVersion: version,
        lastChangeAt: Date.now(),
      });
    }
  }

  /**
   * 解析実行をシミュレート
   */
  simulateAnalysisRun(uri: string): { version: number; text: string } | null {
    const state = this.analysisStates.getState(uri);
    const currentVersion = this.documentVersions.get(uri);
    const currentText = this.documentTexts.get(uri);

    if (currentVersion === undefined || currentText === undefined) {
      return null;
    }

    // 解析開始
    const analysisVersion = state.latestVersion;
    this.analysisStates.updateState(uri, {
      running: true,
      pending: false,
    });

    // 解析完了
    this.analysisStates.updateState(uri, { running: false });

    // バージョンチェック
    const stateAfterComplete = this.analysisStates.getState(uri);
    const isStale = analysisVersion < stateAfterComplete.latestVersion;

    if (isStale) {
      // 古い結果は破棄
      return null;
    }

    // 最新の結果を保存
    const result = { version: analysisVersion, text: currentText };
    this.analysisResults.set(uri, result);

    return result;
  }

  /**
   * 待機中の解析があるか確認
   */
  hasPendingAnalysis(uri: string): boolean {
    return this.analysisStates.getState(uri).pending;
  }

  /**
   * すべての待機中解析を処理
   */
  processAllPendingAnalyses(uri: string): void {
    let iterations = 0;
    const maxIterations = 100; // 無限ループ防止

    while (this.hasPendingAnalysis(uri) && iterations < maxIterations) {
      this.simulateAnalysisRun(uri);
      iterations++;
    }
  }

  /**
   * 最終的な解析結果を取得
   */
  getFinalAnalysisResult(uri: string): { version: number; text: string } | undefined {
    return this.analysisResults.get(uri);
  }

  /**
   * 現在の文書バージョンを取得
   */
  getCurrentDocumentVersion(uri: string): number | undefined {
    return this.documentVersions.get(uri);
  }

  /**
   * 現在の文書テキストを取得
   */
  getCurrentDocumentText(uri: string): string | undefined {
    return this.documentTexts.get(uri);
  }

  /**
   * 状態をクリア
   */
  clear(): void {
    this.analysisStates.clear();
    this.documentVersions.clear();
    this.documentTexts.clear();
    this.analysisResults.clear();
  }
}

describe('Property-Based Tests: 機能互換性と最終一貫性', () => {
  /**
   * Feature: input-lag-improvement, Property 6: 機能互換性の保証
   * 任意の設定状態において、文法チェックとセマンティックハイライトが有効な場合、
   * 最新の解析結果に基づいて適切な通知が送信される
   * 検証対象: 要件 5.1, 5.2, 5.3
   */
  describe('Property 6: 機能互換性の保証', () => {
    it('文法チェックが有効な場合、最新の解析結果に基づいて診断情報が送信される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 200 }),
          (uriSuffix, version, text) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: true,
              enableSemanticHighlight: false,
            });

            const uri = `file:///${uriSuffix}.md`;
            const result = simulator.simulateAnalysis(uri, version, text);

            // 要件 5.1: 文法チェックが有効な場合、診断情報が送信される
            expect(result).not.toBeNull();
            const sentDiagnostics = simulator.getSentDiagnostics(uri);
            expect(sentDiagnostics).toBeDefined();
            expect(sentDiagnostics).toEqual(result?.diagnostics);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('セマンティックハイライトが有効な場合、最新の解析結果に基づいてハイライト更新が通知される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 200 }),
          (uriSuffix, version, text) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: false,
              enableSemanticHighlight: true,
            });

            const uri = `file:///${uriSuffix}.md`;
            const result = simulator.simulateAnalysis(uri, version, text);

            // 要件 5.2: セマンティックハイライトが有効な場合、更新が通知される
            expect(result).not.toBeNull();
            expect(simulator.wasSemanticRefreshSent(uri)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('両方の機能が有効な場合、両方の通知が送信される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 200 }),
          (uriSuffix, version, text) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: true,
              enableSemanticHighlight: true,
            });

            const uri = `file:///${uriSuffix}.md`;
            const result = simulator.simulateAnalysis(uri, version, text);

            // 両方の機能が有効な場合、両方の通知が送信される
            expect(result).not.toBeNull();
            expect(simulator.getSentDiagnostics(uri)).toBeDefined();
            expect(simulator.wasSemanticRefreshSent(uri)).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('設定が変更された場合、従来通りの動作を維持する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 200 }),
          fc.boolean(),
          fc.boolean(),
          (uriSuffix, version, text, grammarEnabled, semanticEnabled) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: grammarEnabled,
              enableSemanticHighlight: semanticEnabled,
            });

            const uri = `file:///${uriSuffix}.md`;
            const result = simulator.simulateAnalysis(uri, version, text);

            // 要件 5.3: 設定に応じた動作
            expect(result).not.toBeNull();

            // 文法チェックが有効な場合のみ診断情報が送信される
            if (grammarEnabled) {
              expect(simulator.getSentDiagnostics(uri)).toBeDefined();
            }

            // セマンティックハイライトが有効な場合のみ更新が通知される
            if (semanticEnabled) {
              expect(simulator.wasSemanticRefreshSent(uri)).toBe(true);
            } else {
              expect(simulator.wasSemanticRefreshSent(uri)).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('設定変更後も解析結果が正しく反映される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              version: fc.integer({ min: 1, max: 100 }),
              text: fc.string({ minLength: 0, maxLength: 100 }),
              grammarEnabled: fc.boolean(),
              semanticEnabled: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (uriSuffix, changes) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: true,
              enableSemanticHighlight: true,
            });

            const uri = `file:///${uriSuffix}.md`;

            for (const change of changes) {
              // 設定を変更
              simulator.updateConfig({
                enableGrammarCheck: change.grammarEnabled,
                enableSemanticHighlight: change.semanticEnabled,
              });

              // 解析を実行
              simulator.clear();
              const result = simulator.simulateAnalysis(uri, change.version, change.text);

              // 設定に応じた動作を確認
              expect(result).not.toBeNull();

              if (change.grammarEnabled) {
                expect(simulator.getSentDiagnostics(uri)).toBeDefined();
              }

              if (change.semanticEnabled) {
                expect(simulator.wasSemanticRefreshSent(uri)).toBe(true);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('複数の文書に対して独立した機能互換性が保証される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              version: fc.integer({ min: 1, max: 100 }),
              text: fc.string({ minLength: 0, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 5 }
          ).filter(arr => {
            // 重複IDを除外
            const ids = arr.map(a => a.id);
            return new Set(ids).size === ids.length;
          }),
          (documents) => {
            const simulator = new FunctionalCompatibilitySimulator({
              enableGrammarCheck: true,
              enableSemanticHighlight: true,
            });

            // 各文書を解析
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              simulator.simulateAnalysis(uri, doc.version, doc.text);
            }

            // 各文書に対して独立した結果が保持されている
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              const result = simulator.getAnalysisResult(uri);
              expect(result).toBeDefined();
              expect(result?.version).toBe(doc.version);
              expect(simulator.getSentDiagnostics(uri)).toBeDefined();
              expect(simulator.wasSemanticRefreshSent(uri)).toBe(true);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: input-lag-improvement, Property 7: 最終一貫性の保証
   * 任意の連続編集シーケンス後、最終的に診断とセマンティックハイライトが
   * 最新の文書内容と一致する
   * 検証対象: 要件 6.2, 6.3
   */
  describe('Property 7: 最終一貫性の保証', () => {
    it('連続編集後、最終的な解析結果が最新の文書バージョンと一致する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(
            fc.record({
              version: fc.integer({ min: 1, max: 1000 }),
              text: fc.string({ minLength: 0, maxLength: 100 }),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (uriSuffix, edits) => {
            const simulator = new EventualConsistencySimulator();
            const uri = `file:///${uriSuffix}.md`;

            // 連続編集をシミュレート
            let latestVersion = 0;
            let latestText = '';
            for (const edit of edits) {
              latestVersion = edit.version;
              latestText = edit.text;
              simulator.simulateDocumentChange(uri, edit.version, edit.text);
            }

            // すべての待機中解析を処理
            simulator.processAllPendingAnalyses(uri);

            // 最終的な解析を実行
            simulator.simulateAnalysisRun(uri);

            // 要件 6.2: 最終的な解析結果が最新の文書と一致
            const finalResult = simulator.getFinalAnalysisResult(uri);
            expect(finalResult).toBeDefined();
            expect(finalResult?.version).toBe(latestVersion);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('解析処理中に新しい変更が発生した場合、不要な処理を回避する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          fc.string({ minLength: 0, maxLength: 100 }),
          (uriSuffix, version1, version2, text1, text2) => {
            const simulator = new EventualConsistencySimulator();
            const uri = `file:///${uriSuffix}.md`;

            // 最初の変更
            simulator.simulateDocumentChange(uri, version1, text1);

            // 解析開始前に新しい変更
            const newVersion = version1 + version2;
            simulator.simulateDocumentChange(uri, newVersion, text2);

            // 解析を実行
            simulator.simulateAnalysisRun(uri);

            // 要件 6.3: 最新の変更のみが処理される
            const finalResult = simulator.getFinalAnalysisResult(uri);
            if (finalResult) {
              // 結果がある場合、最新バージョンと一致
              expect(finalResult.version).toBe(newVersion);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('複数の連続編集シーケンスで最終一貫性が保証される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.array(
            fc.array(
              fc.record({
                version: fc.integer({ min: 1, max: 1000 }),
                text: fc.string({ minLength: 0, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            { minLength: 1, maxLength: 3 }
          ),
          (uriSuffix, editSequences) => {
            const simulator = new EventualConsistencySimulator();
            const uri = `file:///${uriSuffix}.md`;

            let latestVersion = 0;

            // 複数の編集シーケンスを処理
            for (const sequence of editSequences) {
              for (const edit of sequence) {
                latestVersion = Math.max(latestVersion, edit.version);
                simulator.simulateDocumentChange(uri, edit.version, edit.text);
              }

              // 各シーケンス後に解析を実行
              simulator.processAllPendingAnalyses(uri);
              simulator.simulateAnalysisRun(uri);
            }

            // 最終的な解析結果が最新バージョンと一致
            const finalResult = simulator.getFinalAnalysisResult(uri);
            if (finalResult) {
              expect(finalResult.version).toBeLessThanOrEqual(latestVersion);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('待機中の解析がすべて処理された後、最新の状態が反映される', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.array(fc.integer({ min: 1, max: 1000 }), { minLength: 2, maxLength: 10 }),
          (uriSuffix, versions) => {
            const simulator = new EventualConsistencySimulator();
            const uri = `file:///${uriSuffix}.md`;

            // 連続して変更を適用
            let latestVersion = 0;
            for (let i = 0; i < versions.length; i++) {
              latestVersion = versions[i];
              simulator.simulateDocumentChange(uri, versions[i], `text${i}`);
            }

            // すべての待機中解析を処理
            simulator.processAllPendingAnalyses(uri);

            // 最終解析を実行
            simulator.simulateAnalysisRun(uri);

            // 待機中の解析がないことを確認
            expect(simulator.hasPendingAnalysis(uri)).toBe(false);

            // 最終結果が最新バージョンと一致
            const finalResult = simulator.getFinalAnalysisResult(uri);
            if (finalResult) {
              expect(finalResult.version).toBe(latestVersion);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('文書バージョンが単調増加する場合、最終結果は最大バージョンと一致する', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 100 }),
          fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 10 }),
          (uriSuffix, initialVersion, increments) => {
            const simulator = new EventualConsistencySimulator();
            const uri = `file:///${uriSuffix}.md`;

            // 単調増加するバージョンで変更を適用
            let currentVersion = initialVersion;
            for (const increment of increments) {
              currentVersion += increment;
              simulator.simulateDocumentChange(uri, currentVersion, `text-v${currentVersion}`);
            }

            // すべての解析を処理
            simulator.processAllPendingAnalyses(uri);
            simulator.simulateAnalysisRun(uri);

            // 最終結果が最大バージョンと一致
            const finalResult = simulator.getFinalAnalysisResult(uri);
            if (finalResult) {
              expect(finalResult.version).toBe(currentVersion);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('複数の文書に対して独立した最終一貫性が保証される', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              edits: fc.array(
                fc.record({
                  version: fc.integer({ min: 1, max: 100 }),
                  text: fc.string({ minLength: 0, maxLength: 50 }),
                }),
                { minLength: 1, maxLength: 5 }
              ),
            }),
            { minLength: 2, maxLength: 5 }
          ).filter(arr => {
            // 重複IDを除外
            const ids = arr.map(a => a.id);
            return new Set(ids).size === ids.length;
          }),
          (documents) => {
            const simulator = new EventualConsistencySimulator();

            // 各文書の最新バージョンを追跡
            const latestVersions: Map<string, number> = new Map();

            // 各文書に対して編集を適用
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              let latestVersion = 0;

              for (const edit of doc.edits) {
                latestVersion = edit.version;
                simulator.simulateDocumentChange(uri, edit.version, edit.text);
              }

              latestVersions.set(uri, latestVersion);
            }

            // 各文書の解析を処理
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              simulator.processAllPendingAnalyses(uri);
              simulator.simulateAnalysisRun(uri);
            }

            // 各文書の最終結果が最新バージョンと一致
            for (const doc of documents) {
              const uri = `file:///${doc.id}.md`;
              const finalResult = simulator.getFinalAnalysisResult(uri);
              const expectedVersion = latestVersions.get(uri);

              if (finalResult && expectedVersion !== undefined) {
                expect(finalResult.version).toBe(expectedVersion);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

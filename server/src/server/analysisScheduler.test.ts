/**
 * AnalysisScheduler Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createAnalysisScheduler, AnalysisScheduler } from './analysisScheduler';
import { AnalysisStateManager } from './languageServer';
import { ConfigManager } from './configManager';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { HoverProvider } from '../hover/provider';
import { WikipediaClient } from '../wikipedia/client';
import { createConfigManager } from './configManager';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { createLogger } from '../utils/logger';

describe('analysisScheduler', () => {
  let analysisStates: AnalysisStateManager;
  let configManager: ConfigManager;
  let scheduler: AnalysisScheduler;
  const logs: string[] = [];
  const analysisExecutions: Array<{ uri: string; lightweightOnly: boolean }> = [];

  // Mock execute analysis function
  const executeAnalysis = async (uri: string, lightweightOnly: boolean): Promise<void> => {
    analysisExecutions.push({ uri, lightweightOnly });
    return Promise.resolve();
  };

  beforeEach(() => {
    logs.length = 0;
    analysisExecutions.length = 0;
    analysisStates = new AnalysisStateManager();

    const advancedRulesManager = new AdvancedRulesManager();
    const proofreadingRulesManager = new ProofreadingRulesManager();
    const wikipediaClient = new WikipediaClient();
    const hoverProvider = new HoverProvider(wikipediaClient);

    const logger = createLogger((msg: string) => { logs.push(msg); }, true);

    configManager = createConfigManager(
      advancedRulesManager,
      proofreadingRulesManager,
      hoverProvider,
      logger
    );

    scheduler = createAnalysisScheduler(
      analysisStates,
      configManager,
      logger
    );
    
    // Set execute analysis function after creation
    scheduler.setExecuteAnalysis(executeAnalysis);
  });

  afterEach(() => {
    scheduler.clearAllTimers();
  });

  describe('createAnalysisScheduler', () => {
    it('should create an analysis scheduler instance', () => {
      expect(scheduler).toBeDefined();
      expect(typeof scheduler.scheduleAnalysis).toBe('function');
      expect(typeof scheduler.scheduleFullAnalysis).toBe('function');
      expect(typeof scheduler.cancelAnalysis).toBe('function');
      expect(typeof scheduler.clearAllTimers).toBe('function');
    });
  });

  describe('AnalysisScheduler.scheduleAnalysis', () => {
    it('should schedule analysis for a document', (done) => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'テスト'
      );

      // Update config to have short debounce for testing
      configManager.applySettings({ debounceDelay: 50 });

      scheduler.scheduleAnalysis(document);

      // Wait for debounce
      setTimeout(() => {
        expect(analysisExecutions.length).toBeGreaterThanOrEqual(1);
        expect(analysisExecutions[0].uri).toBe('test://uri');
        done();
      }, 100);
    });

    it('should debounce multiple rapid calls', (done) => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'テスト'
      );

      configManager.applySettings({ debounceDelay: 100 });

      // Rapid fire multiple schedules
      scheduler.scheduleAnalysis(document);
      scheduler.scheduleAnalysis(document);
      scheduler.scheduleAnalysis(document);

      // After debounce, should only have one execution
      setTimeout(() => {
        expect(analysisExecutions.length).toBe(1);
        done();
      }, 200);
    });

    it('should update analysis state when scheduling', () => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'テスト'
      );

      scheduler.scheduleAnalysis(document);

      const state = analysisStates.getState('test://uri');
      expect(state.latestDocument).toBe(document);
      expect(state.latestVersion).toBe(1);
    });

    it('should not schedule when both grammar check and semantic highlight are disabled', (done) => {
      const document = TextDocument.create(
        'test://uri-disabled',
        'plaintext',
        1,
        'テスト'
      );

      configManager.applySettings({
        enableGrammarCheck: false,
        enableSemanticHighlight: false,
        debounceDelay: 10,
      });

      const executionsBefore = analysisExecutions.length;
      scheduler.scheduleAnalysis(document);

      // Analysis should not be scheduled
      setTimeout(() => {
        expect(analysisExecutions.length).toBe(executionsBefore);
        done();
      }, 50);
    });
  });

  describe('AnalysisScheduler concurrency (memory safety)', () => {
    it('should not run more analyses concurrently than maxConcurrentAnalyses', (done) => {
      const MAX = 2;
      configManager.applySettings({ debounceDelay: 20, maxConcurrentAnalyses: MAX });

      let current = 0;
      let peak = 0;
      const completed: string[] = [];

      // 並走数を観測する gated executeAnalysis（各解析は 40ms 滞留させる）
      const gatedExecute = async (uri: string, lightweightOnly: boolean): Promise<void> => {
        analysisExecutions.push({ uri, lightweightOnly });
        current++;
        peak = Math.max(peak, current);
        await new Promise((r) => setTimeout(r, 40));
        current--;
        completed.push(uri);
      };
      scheduler.setExecuteAnalysis(gatedExecute);

      // 8 文書を一斉にスケジュール（config 変更時のファンアウトを模倣）
      const docs = Array.from({ length: 8 }, (_, i) =>
        TextDocument.create(`test://conc-${i}`, 'plaintext', 1, 'テスト')
      );
      docs.forEach((d) => scheduler.scheduleAnalysis(d));

      setTimeout(() => {
        // 全件が最終的に解析される（取りこぼさない）
        expect(completed.length).toBe(8);
        // ピーク同時数は上限以下（メモリ安全の核心）
        expect(peak).toBeLessThanOrEqual(MAX);
        expect(peak).toBeGreaterThan(0);
        done();
      }, 600);
    });

    it('should still analyze every document when fanned out under the cap', (done) => {
      configManager.applySettings({ debounceDelay: 10, maxConcurrentAnalyses: 1 });

      const uris = Array.from({ length: 5 }, (_, i) => `test://serial-${i}`);
      uris.forEach((uri) => {
        scheduler.scheduleAnalysis(TextDocument.create(uri, 'plaintext', 1, 'テスト'));
      });

      setTimeout(() => {
        const seen = new Set(
          analysisExecutions.filter((e) => e.uri.startsWith('test://serial-')).map((e) => e.uri)
        );
        expect(seen.size).toBe(5);
        done();
      }, 300);
    });
  });

  describe('AnalysisScheduler.scheduleFullAnalysis', () => {
    it('should schedule full analysis for a document', (done) => {
      const document = TextDocument.create(
        'test://full-uri',
        'plaintext',
        1,
        'テスト'
      );

      // First, set up the document in state
      analysisStates.updateState('test://full-uri', {
        latestDocument: document,
        latestVersion: 1,
      });

      scheduler.scheduleFullAnalysis('test://full-uri');

      // Wait for execution
      setTimeout(() => {
        const newExecutions = analysisExecutions.filter(e => e.uri === 'test://full-uri');
        expect(newExecutions.length).toBe(1);
        expect(newExecutions[0].lightweightOnly).toBe(false);
        done();
      }, 100);
    });

    it('should not schedule if no document exists for URI', () => {
      scheduler.scheduleFullAnalysis('nonexistent://uri');

      // Should not throw and should not schedule
      expect(analysisExecutions).toHaveLength(0);
    });
  });

  describe('AnalysisScheduler.cancelAnalysis', () => {
    it('should cancel pending analysis', (done) => {
      const document = TextDocument.create(
        'test://uri',
        'plaintext',
        1,
        'テスト'
      );

      configManager.applySettings({ debounceDelay: 100 });

      scheduler.scheduleAnalysis(document);
      scheduler.cancelAnalysis('test://uri');

      // After debounce time, should have no executions
      setTimeout(() => {
        expect(analysisExecutions).toHaveLength(0);
        done();
      }, 200);
    });
  });

  describe('AnalysisScheduler.clearAllTimers', () => {
    it('should clear all pending timers', (done) => {
      const doc1 = TextDocument.create('test://uri1', 'plaintext', 1, 'テスト1');
      const doc2 = TextDocument.create('test://uri2', 'plaintext', 1, 'テスト2');

      configManager.applySettings({ debounceDelay: 100 });

      scheduler.scheduleAnalysis(doc1);
      scheduler.scheduleAnalysis(doc2);
      scheduler.clearAllTimers();

      // After debounce time, should have no executions
      setTimeout(() => {
        expect(analysisExecutions).toHaveLength(0);
        done();
      }, 200);
    });
  });
});

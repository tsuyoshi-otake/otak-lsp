/**
 * Profiler Module Tests
 * Feature: main-ts-refactoring
 * TDD: RED -> GREEN -> REFACTOR
 */

import { createProfiler, ProfileStep } from './profiler';
import { RuleProfilingCollector } from '../../../shared/src/advancedTypes';

describe('profiler', () => {
  describe('createProfiler', () => {
    it('should create a profiler instance', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const isEnabled = () => true;

      const profiler = createProfiler(logger, isEnabled);

      expect(profiler).toBeDefined();
      expect(typeof profiler.isEnabled).toBe('function');
      expect(typeof profiler.recordStep).toBe('function');
      expect(typeof profiler.logBlock).toBe('function');
      expect(typeof profiler.logRuleProfilingBlock).toBe('function');
    });

    it('should return isEnabled state correctly', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);

      const enabledProfiler = createProfiler(logger, () => true);
      expect(enabledProfiler.isEnabled()).toBe(true);

      const disabledProfiler = createProfiler(logger, () => false);
      expect(disabledProfiler.isEnabled()).toBe(false);
    });
  });

  describe('Profiler.logBlock', () => {
    it('should not log when profiler is disabled', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => false);

      const steps: ProfileStep[] = [{ name: 'step1', ms: 100 }];
      profiler.logBlock('Test', 'uri=test', steps, 100);

      expect(logs).toHaveLength(0);
    });

    it('should log profile block with header when enabled', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      const steps: ProfileStep[] = [];
      profiler.logBlock('Test', 'uri=test', steps, 150);

      expect(logs).toHaveLength(1);
      expect(logs[0]).toContain('[PROFILE]');
      expect(logs[0]).toContain('Test');
      expect(logs[0]).toContain('uri=test');
      expect(logs[0]).toContain('150.0ms');
    });

    it('should log individual steps with percentage', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      const steps: ProfileStep[] = [
        { name: 'step1', ms: 50 },
        { name: 'step2', ms: 50, meta: 'count=10' },
      ];
      profiler.logBlock('Test', 'uri=test', steps, 100);

      expect(logs).toHaveLength(3); // header + 2 steps
      expect(logs[1]).toContain('step1=50.0ms');
      expect(logs[1]).toContain('50.0%');
      expect(logs[2]).toContain('step2=50.0ms');
      expect(logs[2]).toContain('count=10');
    });
  });

  describe('Profiler.logRuleProfilingBlock', () => {
    it('should not log when profiler is disabled', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => false);

      const collector: RuleProfilingCollector = {
        entries: [{ ruleName: 'rule1', executionTimeMs: 100, diagnosticsCount: 5, success: true }],
        totalTimeMs: 100,
      };
      profiler.logRuleProfilingBlock('test://uri', 1, collector);

      expect(logs).toHaveLength(0);
    });

    it('should not log when collector has no entries', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      const collector: RuleProfilingCollector = { entries: [], totalTimeMs: 0 };
      profiler.logRuleProfilingBlock('test://uri', 1, collector);

      expect(logs).toHaveLength(0);
    });

    it('should log rule profiling sorted by execution time descending', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      const collector: RuleProfilingCollector = {
        entries: [
          { ruleName: 'fastRule', executionTimeMs: 10, diagnosticsCount: 1, success: true },
          { ruleName: 'slowRule', executionTimeMs: 90, diagnosticsCount: 3, success: true },
        ],
        totalTimeMs: 100,
      };
      profiler.logRuleProfilingBlock('test://uri', 2, collector);

      expect(logs).toHaveLength(3); // header + 2 rules
      expect(logs[0]).toContain('uri=test://uri');
      expect(logs[0]).toContain('version=2');
      expect(logs[1]).toContain('slowRule'); // 降順なので遅いルールが先
      expect(logs[2]).toContain('fastRule');
    });

    it('should include error message for failed rules', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      const collector: RuleProfilingCollector = {
        entries: [
          { ruleName: 'failedRule', executionTimeMs: 50, diagnosticsCount: 0, success: false, errorMessage: 'Test error' },
        ],
        totalTimeMs: 50,
      };
      profiler.logRuleProfilingBlock('test://uri', 1, collector);

      expect(logs[1]).toContain('error=Test error');
    });
  });

  describe('formatMs', () => {
    it('should format milliseconds with one decimal place', () => {
      const logs: string[] = [];
      const logger = (msg: string) => logs.push(msg);
      const profiler = createProfiler(logger, () => true);

      profiler.logBlock('Test', '', [{ name: 'step', ms: 123.456 }], 123.456);

      expect(logs[0]).toContain('123.5ms');
    });
  });
});

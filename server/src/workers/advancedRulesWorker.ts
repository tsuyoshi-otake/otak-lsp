/**
 * Advanced Rules Worker
 * Feature: parallel-advanced-rules
 *
 * worker_threads 上で動く高度ルール実行エンジン。
 *
 * 設計:
 * - **状態保持**: worker 起動時に `createDefaultAdvancedRules()` で 55 ルールを生成し、
 *   インスタンスをモジュールスコープに保持する。stateful なルール内部キャッシュ
 *   (TermNotationRule の compiled trie, JouyouKanjiRule の lookup table 等) は
 *   1 度構築すれば同一 worker への以降の request で再利用される。
 * - **コンテキスト**: main 側で `prepareRuleContext` を 1 度だけ実行し、その結果
 *   (baseContext / originalShared) を毎リクエストで受け取る。worker 側で sentence parse を
 *   やり直さないため、N workers × T sentences の重複計算を避ける。
 * - **同期実行**: ルール 1 件ごとは同期で走り、`runSingleRule` 相当の例外抑止と
 *   profiling を内包する。main 側の同期 API と挙動互換。
 * - **メッセージ形式**: WorkerPool が付与する `id` をエコーバックする。エラー時は
 *   `{id, error}` を返し、正常時は `{id, result: {...}}` を返す。
 */

import { parentPort } from 'worker_threads';

import {
  AdvancedGrammarRule,
  AdvancedRulesConfig,
  AdvancedRuleSharedContext,
  RuleContext,
  RuleProfilingCollector,
  RuleProfilingEntry,
} from '../../../shared/src/advancedTypes';
import { Diagnostic } from '../../../shared/src/types';
import { ExcludedRange } from '../../../shared/src/markdownFilterTypes';
import { buildRuleContextForRule } from '../grammar/advancedRuleContext';
import { createDefaultAdvancedRules } from '../grammar/advancedRuleRegistry';
import { offsetToLineAndCharacter } from '../utils/lineStarts';
import {
  SerializedSentence,
  SerializedToken,
  deserializeSentences,
  deserializeTokens,
} from './tokenSerializer';

/**
 * main → worker メッセージ。
 * WorkerPool が `{ id, ...message }` の形で送るため、`id` は最上位に来る。
 */
export interface RunRulesMessage {
  id: number;
  ruleNames: string[];
  config: AdvancedRulesConfig;
  serializedTokens: SerializedToken[];
  baseContext: {
    documentText: string;
    serializedSentences: SerializedSentence[];
    shared: AdvancedRuleSharedContext;
  };
  originalText: string;
  originalShared?: AdvancedRuleSharedContext;
  excludedRanges?: ExcludedRange[];
  enableProfiling: boolean;
}

/**
 * worker → main 応答ペイロード (result)
 */
export interface RunRulesResultPayload {
  diagnostics: Diagnostic[];
  profilingEntries?: RuleProfilingEntry[];
  totalTimeMs?: number;
}

/**
 * worker → main 応答 (WorkerPool が assume する形式)
 */
export interface RunRulesResponse {
  id: number;
  result?: RunRulesResultPayload;
  error?: string;
}

// 55 ルールを worker 起動時に 1 度だけ生成。
// 各ルールの内部 state は最初の `rule.check(...)` で lazy 構築され、以降は再利用される。
const allRules: AdvancedGrammarRule[] = createDefaultAdvancedRules();
const rulesByName: Map<string, AdvancedGrammarRule> = new Map(
  allRules.map((r) => [r.name, r] as const)
);

/**
 * オフセットベース診断を行/文字ベースに修正する。
 * AdvancedRulesManager.fixDiagnosticRange と挙動互換。
 */
function fixDiagnosticRange(diagnostic: Diagnostic, lineStarts: number[]): Diagnostic {
  const { start, end } = diagnostic.range;
  if (start.line !== 0 || end.line !== 0 || start.line !== end.line) {
    return diagnostic;
  }
  // firstLineLength は computeLineStarts の規約上 lineStarts[1] - 1
  const firstLineLength = lineStarts.length >= 2 ? lineStarts[1] - 1 : Infinity;
  const maxChar = Math.max(start.character, end.character);
  if (maxChar > firstLineLength) {
    const newStart = offsetToLineAndCharacter(lineStarts, start.character);
    const newEnd = offsetToLineAndCharacter(lineStarts, end.character);
    return { ...diagnostic, range: { start: newStart, end: newEnd } };
  }
  return diagnostic;
}

/**
 * 1 件のリクエストを処理する。
 * 例外時はリクエスト全体をエラー応答にする (個別ルールの例外は内部で吸収して継続)。
 */
export function handleRunRules(msg: RunRulesMessage): RunRulesResponse {
  try {
    const tokens = deserializeTokens(msg.serializedTokens);
    const sentences = deserializeSentences(msg.baseContext.serializedSentences);
    const baseContext: RuleContext = {
      documentText: msg.baseContext.documentText,
      sentences,
      config: msg.config,
      shared: msg.baseContext.shared,
    };
    const lineStarts = msg.baseContext.shared.lineStarts;

    const profilingCollector: RuleProfilingCollector | undefined = msg.enableProfiling
      ? { entries: [], totalTimeMs: 0 }
      : undefined;
    const diagnostics: Diagnostic[] = [];

    for (const ruleName of msg.ruleNames) {
      const rule = rulesByName.get(ruleName);
      if (!rule) {
        continue;
      }
      const start = profilingCollector ? Date.now() : 0;
      let ruleDiagCount = 0;
      let success = true;
      let errorMessage: string | undefined;

      try {
        const ctx = buildRuleContextForRule(
          rule,
          baseContext,
          msg.excludedRanges,
          msg.originalText,
          msg.originalShared
        );
        const advDiags = rule.check(tokens, ctx);
        ruleDiagCount = advDiags.length;
        for (const ad of advDiags) {
          diagnostics.push(fixDiagnosticRange(ad.toDiagnostic(), lineStarts));
        }
      } catch (e) {
        success = false;
        errorMessage = e instanceof Error ? e.message : String(e);
        // 個別ルール失敗は main 側と同様に握り潰して継続
      }

      if (profilingCollector) {
        const elapsed = Date.now() - start;
        profilingCollector.entries.push({
          ruleName: rule.name,
          executionTimeMs: elapsed,
          diagnosticsCount: ruleDiagCount,
          success,
          errorMessage,
        });
        profilingCollector.totalTimeMs += elapsed;
      }
    }

    return {
      id: msg.id,
      result: {
        diagnostics,
        profilingEntries: profilingCollector?.entries,
        totalTimeMs: profilingCollector?.totalTimeMs,
      },
    };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return { id: msg.id, error: errorMessage };
  }
}

// parentPort は main thread (worker 起動側) でだけ null になる。
// worker_threads で実行されているときのみハンドラを登録する。
if (parentPort) {
  parentPort.on('message', (msg: RunRulesMessage) => {
    const response = handleRunRules(msg);
    parentPort!.postMessage(response);
  });
}

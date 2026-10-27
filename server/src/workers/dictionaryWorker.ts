import { parentPort } from 'worker_threads';
import { DictionaryEntry } from '../dictionaries/proofreadingDictionaryLoader';
import { BracketRangeDetector } from '../proofreading/bracketRangeDetector';
import { checkDictionaryEntries } from '../proofreading/rules/proofreadingDictionaryRule';
import { ProofreadingDiagnostic } from '../proofreading/rules/proofreadingRuleTypes';
import { computeLineStarts, offsetToLineAndCharacter } from '../utils/lineStarts';
import { checkSpelling, SpellWorkerRequest, SpellWorkerResult } from './spellCheck';

export interface DictionaryWorkerRequest {
  kind?: never;
  text: string;
  entries: DictionaryEntry[];
  checkInBrackets: boolean;
  maxDiagnostics: number;
  excludedRanges?: Array<{ start: number; end: number }>;
}

export interface DictionaryWorkerResult {
  diagnostics: ProofreadingDiagnostic[];
  truncated: boolean;
  invalidPatterns: number;
}

if (parentPort) {
  parentPort.on('message', (request: (DictionaryWorkerRequest | SpellWorkerRequest) & { id: number }) => {
    try {
      if (request.kind === 'spell') {
        const result: SpellWorkerResult = checkSpelling(request);
        parentPort!.postMessage({ id: request.id, result });
        return;
      }
      const detector = new BracketRangeDetector();
      const lineStarts = computeLineStarts(request.text);
      let invalidPatterns = 0;
      const entries = request.entries.filter(entry => {
        try {
          if (entry.match === '') throw new Error('empty pattern');
          if (entry.mode === 'regex') RegExp(entry.match, 'g');
          return true;
        } catch {
          invalidPatterns++;
          return false;
        }
      });
      const diagnostics = checkDictionaryEntries({
        text: request.text,
        bracketRanges: detector.detect(request.text),
        bracketDetector: detector,
        checkInBrackets: request.checkInBrackets,
        offsetToPosition: offset => offsetToLineAndCharacter(lineStarts, offset),
      }, entries, request.maxDiagnostics + 1, request.excludedRanges);
      const result: DictionaryWorkerResult = {
        diagnostics: diagnostics.slice(0, request.maxDiagnostics),
        truncated: diagnostics.length > request.maxDiagnostics,
        invalidPatterns,
      };
      parentPort!.postMessage({ id: request.id, result });
    } catch (error) {
      parentPort!.postMessage({ id: request.id, error: error instanceof Error ? error.message : String(error) });
    }
  });
}

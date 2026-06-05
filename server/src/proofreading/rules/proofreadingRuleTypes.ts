/**
 * 校正ルールの共通型
 */

import { DiagnosticSeverity, Position, Range } from '../../../../shared/src/types';
import { BracketRange, BracketRangeDetector } from '../bracketRangeDetector';

export interface ProofreadingDiagnostic {
  range: Range;
  message: string;
  severity: DiagnosticSeverity;
  code: string;
}

export interface ProofreadingRuleContext {
  text: string;
  bracketRanges: BracketRange[];
  checkInBrackets: boolean;
  bracketDetector: BracketRangeDetector;
  offsetToPosition: (offset: number) => Position;
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isClosingBracket(char: string): boolean {
  return '」』）)]】〕〉》］｝'.includes(char);
}

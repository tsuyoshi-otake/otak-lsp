import { AdvancedRuleSharedContext, RuleContext } from '../../../../shared/src/advancedTypes';
import { BracketRange, BracketRangeDetector } from '../../proofreading/bracketRangeDetector';

const detector = new BracketRangeDetector();
const cache = new WeakMap<AdvancedRuleSharedContext, { text: string; ranges: BracketRange[] }>();

/** 誤字カテゴリの括弧設定。共有コンテキスト内では同じ範囲を再利用する。 */
export function typoBracketRanges(context: RuleContext): BracketRange[] {
  if (context.config.proofreadingCheckInBrackets !== false) return [];
  const shared = context.shared;
  if (!shared) return detector.detect(context.documentText);
  const cached = cache.get(shared);
  if (cached && cached.text === context.documentText) return cached.ranges;
  const ranges = detector.detect(context.documentText);
  cache.set(shared, { text: context.documentText, ranges });
  return ranges;
}

export function isTypoInsideBracket(position: number, ranges: BracketRange[]): boolean {
  return detector.isInsideBracket(position, ranges);
}

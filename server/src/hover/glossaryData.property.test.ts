/**
 * glossaryData プロパティベーステスト
 * Feature: glossary-ja-json-rebuild
 *
 * Property 6: GLOSSARY_INDEXラウンドトリップ
 * Property 7: 全カテゴリのエントリ存在
 */

import * as fc from 'fast-check';
import { GLOSSARIES, GLOSSARY_INDEX } from './glossaryData';
import { normalizeKey } from './glossaryUtils';
import { GlossaryId } from '../../../shared/src/types';
import { GlossaryEntry } from './glossaryTypes';

// ============================================================
// ヘルパー: GLOSSARIES から全エントリを収集
// ============================================================

/** GLOSSARIES 内の全エントリを { entry, glossaryId, title } の配列として収集する */
function collectAllEntries(): Array<{
  entry: GlossaryEntry;
  glossaryId: GlossaryId;
  title: string;
}> {
  const result: Array<{ entry: GlossaryEntry; glossaryId: GlossaryId; title: string }> = [];
  for (const glossary of GLOSSARIES) {
    for (const entry of glossary.entries) {
      result.push({ entry, glossaryId: glossary.id, title: glossary.title });
    }
  }
  return result;
}

/** GLOSSARIES 内の全カテゴリIDを収集する */
function collectAllGlossaryIds(): GlossaryId[] {
  return GLOSSARIES.map((g) => g.id);
}

// ============================================================
// Property 6: GLOSSARY_INDEXラウンドトリップ
// ============================================================

describe('Property-Based Tests: glossaryData', () => {
  /**
   * Feature: glossary-ja-json-rebuild, Property 6: GLOSSARY_INDEXラウンドトリップ
   *
   * GLOSSARIES 内の全 GlossaryEntry について、normalizeKey(entry.term) で
   * GLOSSARY_INDEX を検索した結果が当該エントリを含むことを検証する。
   *
   * **Validates: Requirements 4.4, 7.3, 7.5**
   */
  describe('Property 6: GLOSSARY_INDEXラウンドトリップ', () => {
    // 全エントリを事前に収集
    const allEntries = collectAllEntries();

    it('GLOSSARIES 内の任意のエントリが GLOSSARY_INDEX から検索可能である', () => {
      // fast-check でランダムなエントリを選択して検証
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: allEntries.length - 1 }),
          (index) => {
            const { entry } = allEntries[index];
            const key = normalizeKey(entry.term);

            // 正規化キーが空でないことを前提とする
            if (!key) {
              return true; // 空キーはスキップ
            }

            // GLOSSARY_INDEX から検索
            const hits = GLOSSARY_INDEX.get(key);

            // ヒットが存在すること
            expect(hits).toBeDefined();
            expect(hits!.length).toBeGreaterThan(0);

            // 当該エントリの term と description を含む GlossaryHit が存在すること
            const matchingHit = hits!.find(
              (hit) => hit.term === entry.term && hit.description === entry.description,
            );
            expect(matchingHit).toBeDefined();

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // ============================================================
  // Property 7: 全カテゴリのエントリ存在
  // ============================================================

  /**
   * Feature: glossary-ja-json-rebuild, Property 7: 全カテゴリのエントリ存在
   *
   * 全 GlossaryId について GLOSSARIES に当該カテゴリが含まれ、
   * entries 数が0より大きいことを検証する。
   *
   * **Validates: Requirements 7.2, 7.6**
   */
  describe('Property 7: 全カテゴリのエントリ存在', () => {
    const allGlossaryIds = collectAllGlossaryIds();

    it('全 GlossaryId について GLOSSARIES に含まれ entries.length > 0 である', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: allGlossaryIds.length - 1 }),
          (index) => {
            const glossaryId = allGlossaryIds[index];

            const glossary = GLOSSARIES.find((g) => g.id === glossaryId);
            expect(glossary).toBeDefined();

            expect(glossary!.entries.length).toBeGreaterThan(0);

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});

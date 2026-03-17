/**
 * 変換スクリプトのプロパティベーステスト
 * Feature: glossary-ja-json-rebuild
 *
 * Property 1: エントリ変換のaliases生成正確性
 * Property 2: description生成の正確性
 * Property 3: ドメインマッピングの1対1制約
 * Property 4: 最初のsenseによるカテゴリ決定
 * Property 5: 未知ドメインのフォールバック
 */

import * as fc from 'fast-check';
import {
  JaJsonEntry,
  DOMAIN_MAPPING,
  convertJaJsonEntry,
  resolveGlossaryId,
  getDomainLabel,
} from './generate-glossary-from-json';
import { GlossaryId } from '../shared/src/types';

// ============================================================
// Arbitrary（ランダムデータ生成器）
// ============================================================

/** 日本語風の文字列を生成する */
const jaStringArb = fc.stringOf(
  fc.constantFrom(
    ...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'.split(''),
  ),
  { minLength: 1, maxLength: 10 },
);

/** 英数字の文字列を生成する */
const asciiTermArb = fc.stringOf(
  fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-'.split('')),
  { minLength: 1, maxLength: 15 },
);

/** DOMAIN_MAPPINGに存在するドメイン名のArbitrary */
const knownDomainArb = fc.constantFrom(...Object.keys(DOMAIN_MAPPING));

/** DOMAIN_MAPPINGに存在しないドメイン名のArbitrary */
const unknownDomainArb = fc
  .stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz-'.split('')), {
    minLength: 5,
    maxLength: 20,
  })
  .filter((d) => !(d in DOMAIN_MAPPING));

/** senseを1つ生成するArbitrary */
const senseArb = (domainArb: fc.Arbitrary<string>) =>
  fc.record({
    definition: fc.string({ minLength: 1, maxLength: 50 }),
    domain: domainArb,
    normalizedDomain: domainArb,
    normalizedKeywords: fc.array(fc.string({ minLength: 1, maxLength: 10 }), {
      minLength: 0,
      maxLength: 3,
    }),
  });

/**
 * ja.jsonエントリを生成するArbitrary
 * term, reading, normalizedTerms, sensesをランダムに生成する
 */
const jaJsonEntryArb = (domainArb: fc.Arbitrary<string> = knownDomainArb): fc.Arbitrary<JaJsonEntry> =>
  fc
    .record({
      term: jaStringArb,
      reading: jaStringArb,
      extraAliases: fc.array(asciiTermArb, { minLength: 0, maxLength: 3 }),
      senses: fc.array(senseArb(domainArb), { minLength: 1, maxLength: 4 }),
    })
    .map(({ term, reading, extraAliases, senses }) => ({
      term,
      reading,
      senses,
      // normalizedTermsにはterm, readingに加えて追加のエイリアスを含める
      normalizedTerms: [term, reading, ...extraAliases],
    }));

/** 複数senseを持つエントリのArbitrary（最低2つのsense） */
const multiSenseEntryArb = fc
  .record({
    term: jaStringArb,
    reading: jaStringArb,
    extraAliases: fc.array(asciiTermArb, { minLength: 0, maxLength: 3 }),
    senses: fc.array(senseArb(knownDomainArb), { minLength: 2, maxLength: 5 }),
  })
  .map(({ term, reading, extraAliases, senses }) => ({
    term,
    reading,
    senses,
    normalizedTerms: [term, reading, ...extraAliases],
  }));


// ============================================================
// Property 1: エントリ変換のaliases生成正確性
// ============================================================

describe('Property-Based Tests: 変換スクリプト', () => {
  /**
   * Feature: glossary-ja-json-rebuild, Property 1: エントリ変換のaliases生成正確性
   *
   * 任意のja.jsonエントリについて、convertJaJsonEntryで変換した結果の aliases は、
   * 元の normalizedTerms から term と完全一致する要素および reading と完全一致する要素を
   * 除外した残りと一致し、残りが空の場合は undefined である。
   * また、変換結果の term は元の term と一致する。
   *
   * **Validates: Requirements 1.1, 1.2, 1.5, 1.6**
   */
  describe('Property 1: エントリ変換のaliases生成正確性', () => {
    it('aliases は normalizedTerms から term と reading を除外した残りと一致する', () => {
      fc.assert(
        fc.property(jaJsonEntryArb(), (entry) => {
          const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);

          // term が一致すること（要件 1.1）
          expect(result.entry.term).toBe(entry.term);

          // 期待される aliases を計算
          const expectedAliases = entry.normalizedTerms.filter(
            (nt) => nt !== entry.term && nt !== entry.reading,
          );

          if (expectedAliases.length === 0) {
            // 残りが空なら aliases は undefined（要件 1.6）
            expect(result.entry.aliases).toBeUndefined();
          } else {
            // 残りがあれば aliases と一致（要件 1.2, 1.5）
            expect(result.entry.aliases).toEqual(expectedAliases);
          }
        }),
        { numRuns: 30 },
      );
    });

    it('term と reading が同一でも正しく動作する', () => {
      fc.assert(
        fc.property(
          fc.record({
            term: jaStringArb,
            extraAliases: fc.array(asciiTermArb, { minLength: 0, maxLength: 3 }),
            senses: fc.array(senseArb(knownDomainArb), { minLength: 1, maxLength: 2 }),
          }),
          ({ term, extraAliases, senses }) => {
            // term と reading を同一にする
            const entry: JaJsonEntry = {
              term,
              reading: term,
              senses,
              normalizedTerms: [term, term, ...extraAliases],
            };

            const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
            expect(result.entry.term).toBe(term);

            // term === reading の場合、normalizedTerms から term を除外した残り
            const expectedAliases = entry.normalizedTerms.filter((nt) => nt !== term);
            if (expectedAliases.length === 0) {
              expect(result.entry.aliases).toBeUndefined();
            } else {
              expect(result.entry.aliases).toEqual(expectedAliases);
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  // ============================================================
  // Property 2: description生成の正確性
  // ============================================================

  /**
   * Feature: glossary-ja-json-rebuild, Property 2: description生成の正確性
   *
   * 任意のja.jsonエントリについて、senseが1つの場合は description が senses[0].definition と一致し、
   * senseが2つ以上の場合は description が各senseの definition をドメイン日本語ラベル付き
   * （【ラベル】形式）で結合した文字列と一致する。
   *
   * **Validates: Requirements 1.3, 1.4, 6.6**
   */
  describe('Property 2: description生成の正確性', () => {
    it('単一senseの場合、description は senses[0].definition と一致する', () => {
      fc.assert(
        fc.property(
          fc
            .record({
              term: jaStringArb,
              reading: jaStringArb,
              sense: senseArb(knownDomainArb),
            })
            .map(({ term, reading, sense }) => ({
              term,
              reading,
              senses: [sense],
              normalizedTerms: [term, reading],
            })),
          (entry: JaJsonEntry) => {
            const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);
            // 単一senseの場合（要件 1.3）
            expect(result.entry.description).toBe(entry.senses[0].definition);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('複数senseの場合、description は【ドメインラベル】付きで結合される', () => {
      fc.assert(
        fc.property(multiSenseEntryArb, (entry: JaJsonEntry) => {
          const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);

          // 期待される description を計算（要件 1.4, 6.6）
          const expectedDescription = entry.senses
            .map((s) => `【${getDomainLabel(s.domain)}】${s.definition}`)
            .join(' ');

          expect(result.entry.description).toBe(expectedDescription);
        }),
        { numRuns: 30 },
      );
    });
  });

  // ============================================================
  // Property 3: ドメインマッピングの1対1制約
  // ============================================================

  /**
   * Feature: glossary-ja-json-rebuild, Property 3: ドメインマッピングの1対1制約
   *
   * 任意のドメイン名について、ドメインマッピングテーブル内でそのドメインに対応する
   * GlossaryId は一意に1つだけ存在する（Record<string, GlossaryId> 型の構造的保証）。
   *
   * **Validates: Requirements 2.5**
   */
  describe('Property 3: ドメインマッピングの1対1制約', () => {
    it('各ドメインは正確に1つの GlossaryId にマッピングされる', () => {
      fc.assert(
        fc.property(knownDomainArb, (domain) => {
          const glossaryId = DOMAIN_MAPPING[domain];

          // マッピングが存在すること
          expect(glossaryId).toBeDefined();

          // 値が文字列であること（GlossaryId型）
          expect(typeof glossaryId).toBe('string');

          // 同じドメインで再度参照しても同じ値が返ること（決定的）
          expect(DOMAIN_MAPPING[domain]).toBe(glossaryId);
        }),
        { numRuns: 30 },
      );
    });

    it('DOMAIN_MAPPING は Record<string, GlossaryId> 型であり、配列値を持たない', () => {
      // 全エントリについて値が単一の文字列であることを検証
      for (const [domain, glossaryId] of Object.entries(DOMAIN_MAPPING)) {
        expect(typeof glossaryId).toBe('string');
        expect(Array.isArray(glossaryId)).toBe(false);
        // GlossaryId として有効な値であること
        expect(glossaryId.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================
  // Property 4: 最初のsenseによるカテゴリ決定
  // ============================================================

  /**
   * Feature: glossary-ja-json-rebuild, Property 4: 最初のsenseによるカテゴリ決定
   *
   * 任意の複数senseを持つja.jsonエントリについて、convertJaJsonEntry で決定される
   * GlossaryId は、最初のsense（senses[0]）の domain をドメインマッピングで変換した結果と一致する。
   *
   * **Validates: Requirements 2.6**
   */
  describe('Property 4: 最初のsenseによるカテゴリ決定', () => {
    it('カテゴリは常に最初のsenseのdomainで決定される', () => {
      fc.assert(
        fc.property(multiSenseEntryArb, (entry: JaJsonEntry) => {
          const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);

          // 最初のsenseのdomainから期待されるGlossaryIdを計算
          const expectedGlossaryId = resolveGlossaryId(
            entry.senses[0].domain,
            DOMAIN_MAPPING,
          );

          expect(result.glossaryId).toBe(expectedGlossaryId);
        }),
        { numRuns: 30 },
      );
    });
  });

  // ============================================================
  // Property 5: 未知ドメインのフォールバック
  // ============================================================

  /**
   * Feature: glossary-ja-json-rebuild, Property 5: 未知ドメインのフォールバック
   *
   * 任意のドメインマッピングテーブルに存在しないドメイン名を持つja.jsonエントリについて、
   * convertJaJsonEntry は GlossaryId として 'it' を返す。
   *
   * **Validates: Requirements 6.4**
   */
  describe('Property 5: 未知ドメインのフォールバック', () => {
    // process.stderr.write の警告出力を抑制
    const originalWrite = process.stderr.write;
    beforeAll(() => {
      process.stderr.write = (() => true) as typeof process.stderr.write;
    });
    afterAll(() => {
      process.stderr.write = originalWrite;
    });

    it('未知ドメインは it にフォールバックする', () => {
      fc.assert(
        fc.property(jaJsonEntryArb(unknownDomainArb), (entry: JaJsonEntry) => {
          const result = convertJaJsonEntry(entry, DOMAIN_MAPPING);

          // 未知ドメインは 'it' にフォールバック（要件 6.4）
          expect(result.glossaryId).toBe('it');
        }),
        { numRuns: 30 },
      );
    });

    it('resolveGlossaryId は未知ドメインに対して it を返す', () => {
      fc.assert(
        fc.property(unknownDomainArb, (domain) => {
          const result = resolveGlossaryId(domain, DOMAIN_MAPPING);
          expect(result).toBe('it');
        }),
        { numRuns: 30 },
      );
    });
  });
});

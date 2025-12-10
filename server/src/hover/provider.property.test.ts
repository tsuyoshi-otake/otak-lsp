/**
 * Hover Provider Property-Based Tests
 * Feature: japanese-grammar-analyzer
 * 要件: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as fc from 'fast-check';
import { HoverProvider } from './provider';
import { Token } from '../../../shared/src/types';
import { WikipediaClient } from '../wikipedia/client';

describe('Property-Based Tests: Hover Provider', () => {
  let provider: HoverProvider;
  let mockWikipediaClient: WikipediaClient;

  beforeEach(() => {
    mockWikipediaClient = new WikipediaClient();
    provider = new HoverProvider(mockWikipediaClient);
    // Wikipediaを無効化してテストを安定させる
    provider.setWikipediaEnabled(false);
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 10: ホバー情報の形態素データ
   * 任意のドキュメント内の位置に対して、その位置にトークンが存在する場合、
   * ホバー情報は原形、読み、品詞情報を含む
   */
  describe('Property 10: ホバー情報の形態素データ', () => {
    it('should include pos, baseForm, and reading when token exists at position', () => {
      fc.assert(
        fc.property(
          fc.record({
            surface: fc.stringOf(
              fc.constantFrom('私', '食', 'べ', 'る', '日', '本', '語', '行', 'く'),
              { minLength: 1, maxLength: 5 }
            ),
            pos: fc.constantFrom('名詞', '動詞', '形容詞', '助詞', '副詞'),
            baseForm: fc.stringOf(
              fc.constantFrom('私', '食べる', '日本', '語', '行く', 'きれい'),
              { minLength: 1, maxLength: 5 }
            ),
            reading: fc.stringOf(
              fc.constantFrom('ワタシ', 'タベル', 'ニホン', 'ゴ', 'イク', 'キレイ'),
              { minLength: 1, maxLength: 5 }
            )
          }),
          (data) => {
            const token = new Token({
              surface: data.surface,
              pos: data.pos,
              posDetail1: '*',
              posDetail2: '*',
              posDetail3: '*',
              conjugation: '*',
              conjugationForm: '*',
              baseForm: data.baseForm,
              reading: data.reading,
              pronunciation: data.reading,
              start: 0,
              end: data.surface.length
            });

            const morphemeInfo = provider.formatMorphemeInfo(token);

            // 品詞情報が含まれている
            expect(morphemeInfo).toContain(data.pos);
            // 原形が*でない場合は含まれている
            if (data.baseForm !== '*') {
              expect(morphemeInfo).toContain(data.baseForm);
            }
            // 読みが*でない場合は含まれている
            if (data.reading !== '*') {
              expect(morphemeInfo).toContain(data.reading);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return hover info for any valid position within token range', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 1, max: 20 }),
          (start, length) => {
            const end = start + length;
            const token = new Token({
              surface: 'テスト'.repeat(Math.ceil(length / 3)).substring(0, length),
              pos: '名詞',
              posDetail1: '*',
              posDetail2: '*',
              posDetail3: '*',
              conjugation: '*',
              conjugationForm: '*',
              baseForm: 'テスト',
              reading: 'テスト',
              pronunciation: 'テスト',
              start,
              end
            });

            // 範囲内の任意の位置
            const position = start + Math.floor(length / 2);
            const foundToken = provider.getTokenAtPosition([token], position);

            expect(foundToken).not.toBeNull();
            expect(foundToken?.start).toBe(start);
            expect(foundToken?.end).toBe(end);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null for positions outside all token ranges', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              start: fc.integer({ min: 10, max: 50 }),
              length: fc.integer({ min: 1, max: 5 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          fc.integer({ min: 0, max: 5 }),
          (tokenData, positionOffset) => {
            // 最初のトークンの前の位置
            const firstStart = Math.min(...tokenData.map(t => t.start));
            if (positionOffset >= firstStart) {
              return; // スキップ
            }

            const tokens = tokenData.map((t, i) => {
              return new Token({
                surface: 'テ'.repeat(t.length),
                pos: '名詞',
                posDetail1: '*',
                posDetail2: '*',
                posDetail3: '*',
                conjugation: '*',
                conjugationForm: '*',
                baseForm: 'テスト',
                reading: 'テスト',
                pronunciation: 'テスト',
                start: t.start,
                end: t.start + t.length
              });
            });

            const result = provider.getTokenAtPosition(tokens, positionOffset);
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 11: Wikipedia統合
   * 任意の単語に対して、Wikipedia APIが利用可能な場合、ホバー情報はサマリーを含み、
   * 利用できない場合は形態素情報のみを含む
   */
  describe('Property 11: Wikipedia統合', () => {
    it('should include Wikipedia summary when API returns data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            '日本国は東アジアに位置する島国である。',
            '東京都は日本の首都である。',
            'プログラミングとはコンピュータに命令を与えることである。',
            '形態素解析は自然言語処理の基本技術である。',
            'Wikipediaは誰でも編集できる百科事典である。'
          ),
          fc.constantFrom('日本', '東京', 'プログラミング', '形態素', 'Wikipedia'),
          async (summaryText, term) => {
            // 各テストで新しいクライアントとプロバイダーを作成
            const testWikipediaClient = new WikipediaClient();
            const testProvider = new HoverProvider(testWikipediaClient);

            const mockFetch = jest.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({
                extract: summaryText
              })
            });
            testWikipediaClient.setFetch(mockFetch);

            const token = new Token({
              surface: term,
              pos: '名詞',
              posDetail1: '*',
              posDetail2: '*',
              posDetail3: '*',
              conjugation: '*',
              conjugationForm: '*',
              baseForm: term,
              reading: term,
              pronunciation: term,
              start: 0,
              end: term.length
            });

            const result = await testProvider.provideHover([token], 0);

            expect(result).not.toBeNull();
            expect(result?.contents).toContain(summaryText);
            expect(result?.contents).toContain('**Wikipedia**');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return morpheme info only when Wikipedia fails', async () => {
      const wikipediaProvider = new HoverProvider(mockWikipediaClient);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('Network error', 'Timeout', 'Rate limited', 'Not found'),
          async (errorType) => {
            const mockFetch = jest.fn().mockRejectedValue(new Error(errorType));
            mockWikipediaClient.setFetch(mockFetch);

            const token = new Token({
              surface: '東京',
              pos: '名詞',
              posDetail1: '固有名詞',
              posDetail2: '*',
              posDetail3: '*',
              conjugation: '*',
              conjugationForm: '*',
              baseForm: '東京',
              reading: 'トウキョウ',
              pronunciation: 'トーキョー',
              start: 0,
              end: 2
            });

            const result = await wikipediaProvider.provideHover([token], 0);

            // 形態素情報は含まれる
            expect(result).not.toBeNull();
            expect(result?.contents).toContain('東京');
            expect(result?.contents).toContain('名詞');
            // Wikipediaセクションヘッダーは含まれない（エラー時）
            expect(result?.contents).not.toContain('---\n\n**Wikipedia**');
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should skip Wikipedia lookup for particles and auxiliary verbs', async () => {
      const wikipediaProvider = new HoverProvider(mockWikipediaClient);

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('助詞', '助動詞'),
          fc.constantFrom('は', 'が', 'を', 'に', 'で', 'た', 'だ', 'です'),
          async (pos, surface) => {
            const mockFetch = jest.fn().mockResolvedValue({
              ok: true,
              json: () => Promise.resolve({
                extract: 'Should not be fetched'
              })
            });
            mockWikipediaClient.setFetch(mockFetch);

            const token = new Token({
              surface,
              pos,
              posDetail1: '*',
              posDetail2: '*',
              posDetail3: '*',
              conjugation: '*',
              conjugationForm: '*',
              baseForm: surface,
              reading: surface,
              pronunciation: surface,
              start: 0,
              end: surface.length
            });

            const result = await wikipediaProvider.provideHover([token], 0);

            // 助詞・助動詞はWikipedia検索しない
            expect(mockFetch).not.toHaveBeenCalled();
            expect(result).not.toBeNull();
            expect(result?.contents).not.toContain('Should not be fetched');
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

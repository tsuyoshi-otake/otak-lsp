/**
 * MeCab Analyzerのプロパティベーステスト
 * Feature: japanese-grammar-analyzer
 */

import * as fc from 'fast-check';
import { MeCabAnalyzer } from './analyzer';
import { Token } from '../../../shared/src/types';

describe('Property-Based Tests: MeCab Analyzer', () => {
  const analyzer = new MeCabAnalyzer();

  /**
   * Feature: japanese-grammar-analyzer, Property 1: トークン化の完全性
   * 任意の日本語テキストに対して、MeCabによるトークン化を実行したとき、
   * 結果のトークンリストは空でなく、すべてのトークンの表層形を連結すると元のテキストと一致する
   *
   * 検証: 要件 1.1
   *
   * Note: MeCabが利用できない環境では、parseMeCabOutputを使用したモックテストで検証
   */
  describe('Property 1: トークン化の完全性', () => {
    it('should reconstruct original text from tokens for any Japanese text', () => {
      fc.assert(
        fc.property(
          // 日本語文字を含む文字列を生成
          fc.stringOf(
            fc.oneof(
              fc.constantFrom(...'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん'),
              fc.constantFrom(...'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン'),
              fc.constantFrom(...'日本語文字漢字')
            ),
            { minLength: 1, maxLength: 20 }
          ),
          (text) => {
            // MeCab出力形式をシミュレート
            const mockOutput = text.split('').map((char, index) => {
              return `${char}\t名詞,一般,*,*,*,*,${char},${char},${char}`;
            }).join('\n') + '\nEOS\n';

            const tokens = analyzer.parseMeCabOutput(mockOutput);

            // トークンリストが空でない
            expect(tokens.length).toBeGreaterThan(0);

            // 表層形を連結すると元のテキストと一致
            const reconstructed = tokens.map(t => t.surface).join('');
            expect(reconstructed).toBe(text);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain correct position information for all tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              surface: fc.stringOf(fc.constantFrom(...'あいうえお私行日本語'), { minLength: 1, maxLength: 3 }),
              pos: fc.constantFrom('名詞', '動詞', '助詞', '形容詞')
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tokenSpecs) => {
            const mockOutput = tokenSpecs.map(spec => {
              return `${spec.surface}\t${spec.pos},一般,*,*,*,*,${spec.surface},${spec.surface},${spec.surface}`;
            }).join('\n') + '\nEOS\n';

            const tokens = analyzer.parseMeCabOutput(mockOutput);

            // 位置情報の連続性を確認
            let expectedPosition = 0;
            for (const token of tokens) {
              expect(token.start).toBe(expectedPosition);
              expect(token.end).toBe(expectedPosition + token.surface.length);
              expectedPosition = token.end;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: japanese-grammar-analyzer, Property 2: トークン情報の完全性
   * 任意の日本語テキストに対して、形態素解析を実行したとき、
   * すべてのトークンは品詞情報、原形、読みを持つ
   *
   * 検証: 要件 1.2, 1.3
   */
  describe('Property 2: トークン情報の完全性', () => {
    it('should have POS information for all tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              surface: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
              pos: fc.constantFrom('名詞', '動詞', '助詞', '形容詞', '副詞'),
              baseForm: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
              reading: fc.stringOf(fc.constantFrom(...'アイウエオ'), { minLength: 1, maxLength: 3 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tokenSpecs) => {
            const mockOutput = tokenSpecs.map(spec => {
              return `${spec.surface}\t${spec.pos},一般,*,*,*,*,${spec.baseForm},${spec.reading},${spec.reading}`;
            }).join('\n') + '\nEOS\n';

            const tokens = analyzer.parseMeCabOutput(mockOutput);

            // すべてのトークンが品詞情報を持つ
            for (const token of tokens) {
              expect(token.pos).toBeDefined();
              expect(token.pos.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have base form for all tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              surface: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
              baseForm: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tokenSpecs) => {
            const mockOutput = tokenSpecs.map(spec => {
              return `${spec.surface}\t名詞,一般,*,*,*,*,${spec.baseForm},${spec.baseForm},${spec.baseForm}`;
            }).join('\n') + '\nEOS\n';

            const tokens = analyzer.parseMeCabOutput(mockOutput);

            // すべてのトークンが原形を持つ
            for (const token of tokens) {
              expect(token.baseForm).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have reading for all tokens', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              surface: fc.stringOf(fc.constantFrom(...'あいうえお'), { minLength: 1, maxLength: 3 }),
              reading: fc.stringOf(fc.constantFrom(...'アイウエオ'), { minLength: 1, maxLength: 3 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (tokenSpecs) => {
            const mockOutput = tokenSpecs.map(spec => {
              return `${spec.surface}\t名詞,一般,*,*,*,*,${spec.surface},${spec.reading},${spec.reading}`;
            }).join('\n') + '\nEOS\n';

            const tokens = analyzer.parseMeCabOutput(mockOutput);

            // すべてのトークンが読みを持つ
            for (const token of tokens) {
              expect(token.reading).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify POS types', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('名詞', '動詞', '助詞', '形容詞', '副詞'),
          (pos) => {
            const mockOutput = `テスト\t${pos},一般,*,*,*,*,テスト,テスト,テスト\nEOS\n`;
            const tokens = analyzer.parseMeCabOutput(mockOutput);

            expect(tokens.length).toBe(1);
            const token = tokens[0];

            // 品詞判定メソッドが正しく動作する
            switch (pos) {
              case '名詞':
                expect(token.isNoun()).toBe(true);
                expect(token.isVerb()).toBe(false);
                expect(token.isParticle()).toBe(false);
                break;
              case '動詞':
                expect(token.isVerb()).toBe(true);
                expect(token.isNoun()).toBe(false);
                break;
              case '助詞':
                expect(token.isParticle()).toBe(true);
                expect(token.isNoun()).toBe(false);
                break;
              case '形容詞':
                expect(token.isAdjective()).toBe(true);
                expect(token.isNoun()).toBe(false);
                break;
              case '副詞':
                expect(token.isAdverb()).toBe(true);
                expect(token.isNoun()).toBe(false);
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

import * as kuromoji from 'kuromoji-optimized';
import * as path from 'node:path';
import * as fc from 'fast-check';
import { installOptimizedLatticeBuilder } from './optimizedLatticeBuilder';

describe('未知語候補の最適化と元のkuromoji', () => {
  it('実辞書による元の全トークン属性と一致する', async () => {
    const dicPath = path.join(path.dirname(require.resolve('kuromoji-optimized')), '..', 'dict');
    const tokenizer = await new Promise<kuromoji.Tokenizer<unknown>>((resolve, reject) => {
      kuromoji.builder({ dicPath }).build((error, built) => error ? reject(error) : resolve(built));
    });
    const builder = (tokenizer as unknown as { viterbi_builder: { build: (text: string) => unknown } }).viterbi_builder;
    const original = builder.build;
    installOptimizedLatticeBuilder(tokenizer);
    const optimized = builder.build;
    const compare = (text: string) => {
      builder.build = original;
      const expected = tokenizer.tokenize(text);
      builder.build = optimized;
      expect(tokenizer.tokenize(text)).toEqual(expected);
    };
    for (const text of ['私は\uE000\uE001 学校。猫', 'ABCabc 12345\nテスト', '前\uFFFD\uFFFD 後、次。']) compare(text);
    fc.assert(fc.property(fc.array(fc.constantFrom('私', 'は', '猫', ' ', '\n', '。', '、', 'a', 'Z', '1', '２', 'カ', 'ー', '\uE000', '\uFFFD'), { maxLength: 60 }), fragments => {
      compare(fragments.join(''));
    }), { numRuns: 200, seed: 20261027 });
  }, 30000);
});

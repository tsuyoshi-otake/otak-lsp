/**
 * MeCab Analyzerのユニットテスト
 * Feature: japanese-grammar-analyzer
 * 要件: 1.1, 1.2, 1.3, 1.5, 8.1, 8.4
 */

import { MeCabAnalyzer } from './analyzer';
import { Token } from '../../../shared/src/types';

// MeCabの利用可能性を確認
let mecabAvailable = false;

describe('MeCab Analyzer', () => {
  let analyzer: MeCabAnalyzer;

  beforeAll(async () => {
    analyzer = new MeCabAnalyzer();
    mecabAvailable = await analyzer.isAvailable();
    if (!mecabAvailable) {
      console.warn('MeCab is not available. Some tests will be skipped.');
    }
  });

  describe('isAvailable', () => {
    it('should return boolean indicating MeCab availability', async () => {
      const result = await analyzer.isAvailable();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('analyze', () => {
    it('should return empty array for empty string', async () => {
      const tokens = await analyzer.analyze('');
      expect(tokens).toEqual([]);
    });

    it('should analyze simple Japanese text when MeCab is available', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const tokens = await analyzer.analyze('日本語');
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0]).toBeInstanceOf(Token);
      expect(tokens[0].surface).toBe('日本語');
    });

    it('should include position information for each token when MeCab is available', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const tokens = await analyzer.analyze('私は行く');
      expect(tokens.length).toBeGreaterThan(0);

      // 各トークンが位置情報を持っていることを確認
      let expectedStart = 0;
      for (const token of tokens) {
        expect(token.start).toBe(expectedStart);
        expect(token.end).toBe(expectedStart + token.surface.length);
        expectedStart = token.end;
      }
    });

    it('should provide POS information for each token when MeCab is available', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const tokens = await analyzer.analyze('私は学校に行く');
      expect(tokens.length).toBeGreaterThan(0);

      // 各トークンが品詞情報を持っていることを確認
      for (const token of tokens) {
        expect(token.pos).toBeDefined();
        expect(token.pos.length).toBeGreaterThan(0);
      }
    });

    it('should provide base form and reading for each token when MeCab is available', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const tokens = await analyzer.analyze('食べる');
      expect(tokens.length).toBeGreaterThan(0);

      // 原形と読みがあることを確認
      for (const token of tokens) {
        expect(token.baseForm).toBeDefined();
        expect(token.reading).toBeDefined();
      }
    });

    it('should handle mixed Japanese and non-Japanese text', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const tokens = await analyzer.analyze('Hello日本語World');
      expect(tokens.length).toBeGreaterThan(0);

      // 全トークンの表層形を連結すると元のテキストになることを確認
      const reconstructed = tokens.map(t => t.surface).join('');
      expect(reconstructed).toBe('Hello日本語World');
    });
  });

  describe('getVersion', () => {
    it('should return version string when MeCab is available', async () => {
      if (!mecabAvailable) {
        console.warn('Skipping test: MeCab not available');
        return;
      }

      const version = await analyzer.getVersion();
      expect(typeof version).toBe('string');
      expect(version.length).toBeGreaterThan(0);
    });

    it('should throw error when MeCab is not available', async () => {
      const unavailableAnalyzer = new MeCabAnalyzer('/nonexistent/path/mecab');
      await expect(unavailableAnalyzer.getVersion()).rejects.toThrow();
    });
  });

  describe('parseMeCabOutput', () => {
    it('should parse standard MeCab output format', () => {
      const output = `日本語\t名詞,一般,*,*,*,*,日本語,ニホンゴ,ニホンゴ
EOS`;
      const tokens = analyzer.parseMeCabOutput(output);

      expect(tokens.length).toBe(1);
      expect(tokens[0].surface).toBe('日本語');
      expect(tokens[0].pos).toBe('名詞');
      expect(tokens[0].posDetail1).toBe('一般');
      expect(tokens[0].baseForm).toBe('日本語');
      expect(tokens[0].reading).toBe('ニホンゴ');
    });

    it('should handle multiple tokens', () => {
      const output = `私\t名詞,代名詞,一般,*,*,*,私,ワタシ,ワタシ
は\t助詞,係助詞,*,*,*,*,は,ハ,ワ
行く\t動詞,自立,*,*,五段・カ行促音便,基本形,行く,イク,イク
EOS`;
      const tokens = analyzer.parseMeCabOutput(output);

      expect(tokens.length).toBe(3);
      expect(tokens[0].surface).toBe('私');
      expect(tokens[0].isNoun()).toBe(true);
      expect(tokens[1].surface).toBe('は');
      expect(tokens[1].isParticle()).toBe(true);
      expect(tokens[2].surface).toBe('行く');
      expect(tokens[2].isVerb()).toBe(true);
    });

    it('should calculate correct positions', () => {
      const output = `私\t名詞,代名詞,一般,*,*,*,私,ワタシ,ワタシ
は\t助詞,係助詞,*,*,*,*,は,ハ,ワ
EOS`;
      const tokens = analyzer.parseMeCabOutput(output);

      expect(tokens[0].start).toBe(0);
      expect(tokens[0].end).toBe(1);
      expect(tokens[1].start).toBe(1);
      expect(tokens[1].end).toBe(2);
    });

    it('should handle empty output', () => {
      const tokens = analyzer.parseMeCabOutput('EOS\n');
      expect(tokens).toEqual([]);
    });

    it('should handle output with missing fields', () => {
      const output = `テスト\t名詞,一般
EOS`;
      const tokens = analyzer.parseMeCabOutput(output);

      expect(tokens.length).toBe(1);
      expect(tokens[0].surface).toBe('テスト');
      expect(tokens[0].pos).toBe('名詞');
      // 不足フィールドは '*' で埋められる
      expect(tokens[0].baseForm).toBe('*');
    });
  });
});

/**
 * Token / Sentence Serializer Tests
 * Feature: parallel-advanced-rules
 *
 * Worker 境界での Token / Sentence 直列化往復テスト。
 * structured clone でメソッドが失われる前提のもと、復元側で
 * `new Token(...)` / `new Sentence(...)` がメソッドを完全に取り戻すことを担保する。
 */

import { Token } from '../../../shared/src/types';
import { Sentence } from '../../../shared/src/advancedTypes';
import {
  serializeToken,
  deserializeToken,
  serializeTokens,
  deserializeTokens,
  serializeSentence,
  deserializeSentence,
  serializeSentences,
  deserializeSentences,
} from './tokenSerializer';

function makeToken(overrides: Partial<ConstructorParameters<typeof Token>[0]> = {}): Token {
  return new Token({
    surface: '猫',
    pos: '名詞',
    posDetail1: '一般',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm: '猫',
    reading: 'ネコ',
    pronunciation: 'ネコ',
    start: 0,
    end: 1,
    ...overrides,
  });
}

describe('tokenSerializer', () => {
  describe('Token', () => {
    it('1 つの Token を往復しても全フィールドが同一', () => {
      const original = makeToken({ surface: 'です', pos: '助動詞', baseForm: 'です' });
      const restored = deserializeToken(serializeToken(original));

      expect(restored.surface).toBe(original.surface);
      expect(restored.pos).toBe(original.pos);
      expect(restored.posDetail1).toBe(original.posDetail1);
      expect(restored.posDetail2).toBe(original.posDetail2);
      expect(restored.posDetail3).toBe(original.posDetail3);
      expect(restored.conjugation).toBe(original.conjugation);
      expect(restored.conjugationForm).toBe(original.conjugationForm);
      expect(restored.baseForm).toBe(original.baseForm);
      expect(restored.reading).toBe(original.reading);
      expect(restored.pronunciation).toBe(original.pronunciation);
      expect(restored.start).toBe(original.start);
      expect(restored.end).toBe(original.end);
    });

    it('シリアライズ結果は Token インスタンスではなくプレーンオブジェクト', () => {
      const original = makeToken();
      const serialized = serializeToken(original);
      expect(serialized).not.toBeInstanceOf(Token);
      expect(typeof serialized).toBe('object');
    });

    it('復元後の Token は isParticle / isVerb / isNoun / isAdjective / isAdverb を呼べる', () => {
      const particle = deserializeToken(serializeToken(makeToken({ pos: '助詞', surface: 'を' })));
      const verb = deserializeToken(serializeToken(makeToken({ pos: '動詞', surface: '走る' })));
      const noun = deserializeToken(serializeToken(makeToken({ pos: '名詞', surface: '猫' })));
      const adjective = deserializeToken(serializeToken(makeToken({ pos: '形容詞', surface: '速い' })));
      const adverb = deserializeToken(serializeToken(makeToken({ pos: '副詞', surface: 'とても' })));

      expect(particle).toBeInstanceOf(Token);
      expect(particle.isParticle()).toBe(true);
      expect(particle.isVerb()).toBe(false);
      expect(verb.isVerb()).toBe(true);
      expect(verb.isParticle()).toBe(false);
      expect(noun.isNoun()).toBe(true);
      expect(adjective.isAdjective()).toBe(true);
      expect(adverb.isAdverb()).toBe(true);
    });

    it('structured clone で剥がれた状態 (= plain object) からも deserializeToken が復元できる', () => {
      const original = makeToken({ pos: '助詞', surface: 'が' });
      const wireFormat = JSON.parse(JSON.stringify(serializeToken(original)));
      const restored = deserializeToken(wireFormat);
      expect(restored).toBeInstanceOf(Token);
      expect(restored.isParticle()).toBe(true);
    });

    it('空配列の serializeTokens / deserializeTokens は空配列を返す', () => {
      expect(serializeTokens([])).toEqual([]);
      expect(deserializeTokens([])).toEqual([]);
    });

    it('大量トークン (3000 件) で全件メソッド復元', () => {
      const tokens: Token[] = [];
      for (let i = 0; i < 3000; i++) {
        tokens.push(makeToken({
          surface: `t${i}`,
          pos: i % 2 === 0 ? '名詞' : '助詞',
          start: i,
          end: i + 1,
        }));
      }
      const restored = deserializeTokens(serializeTokens(tokens));
      expect(restored).toHaveLength(3000);
      expect(restored.every((t) => t instanceof Token)).toBe(true);
      expect(restored[0].isNoun()).toBe(true);
      expect(restored[1].isParticle()).toBe(true);
      expect(restored[2999].surface).toBe('t2999');
    });
  });

  describe('Sentence', () => {
    function makeSentence(text: string, tokens: Token[]): Sentence {
      return new Sentence({
        text,
        tokens,
        start: 0,
        end: text.length,
      });
    }

    it('1 つの Sentence を往復しても全フィールドが同一', () => {
      const tokens = [makeToken({ surface: '今日' }), makeToken({ surface: 'です', pos: '助動詞' })];
      const original = makeSentence('今日です。', tokens);
      const restored = deserializeSentence(serializeSentence(original));

      expect(restored.text).toBe(original.text);
      expect(restored.start).toBe(original.start);
      expect(restored.end).toBe(original.end);
      expect(restored.tokens).toHaveLength(original.tokens.length);
      expect(restored.tokens[0].surface).toBe('今日');
      expect(restored.tokens[1].surface).toBe('です');
    });

    it('復元後の Sentence は endsWithDesuMasu / endsWithDearu を呼べる', () => {
      const desu = deserializeSentence(serializeSentence(makeSentence('今日は晴れです。', [])));
      const masu = deserializeSentence(serializeSentence(makeSentence('行きます。', [])));
      const dearu = deserializeSentence(serializeSentence(makeSentence('それである。', [])));

      expect(desu).toBeInstanceOf(Sentence);
      expect(desu.endsWithDesuMasu()).toBe(true);
      expect(masu.endsWithDesuMasu()).toBe(true);
      expect(dearu.endsWithDearu()).toBe(true);
      expect(desu.endsWithDearu()).toBe(false);
    });

    it('復元後の Sentence は commaCount を再計算する', () => {
      const original = makeSentence('今日は、晴れて、暖かい。', []);
      expect(original.commaCount).toBe(2);
      const restored = deserializeSentence(serializeSentence(original));
      expect(restored.commaCount).toBe(2);
    });

    it('Sentence 内の Token もメソッド付きで復元される', () => {
      const tokens = [
        makeToken({ surface: 'が', pos: '助詞' }),
        makeToken({ surface: '走る', pos: '動詞' }),
      ];
      const restored = deserializeSentence(serializeSentence(makeSentence('が走る', tokens)));
      expect(restored.tokens[0]).toBeInstanceOf(Token);
      expect(restored.tokens[0].isParticle()).toBe(true);
      expect(restored.tokens[1].isVerb()).toBe(true);
    });

    it('structured clone (JSON 経由) でも Sentence + Token を復元できる', () => {
      const tokens = [makeToken({ pos: '名詞' })];
      const original = makeSentence('猫', tokens);
      const wireFormat = JSON.parse(JSON.stringify(serializeSentence(original)));
      const restored = deserializeSentence(wireFormat);

      expect(restored).toBeInstanceOf(Sentence);
      expect(restored.tokens[0]).toBeInstanceOf(Token);
      expect(restored.tokens[0].isNoun()).toBe(true);
    });

    it('空配列の serializeSentences / deserializeSentences は空配列を返す', () => {
      expect(serializeSentences([])).toEqual([]);
      expect(deserializeSentences([])).toEqual([]);
    });

    it('Sentence[] のラウンドトリップで件数とメソッドを保持', () => {
      const sentences = [
        makeSentence('猫。', [makeToken({ pos: '名詞' })]),
        makeSentence('犬です。', [
          makeToken({ pos: '名詞', surface: '犬' }),
          makeToken({ pos: '助動詞', surface: 'です' }),
        ]),
      ];
      const restored = deserializeSentences(serializeSentences(sentences));
      expect(restored).toHaveLength(2);
      expect(restored.every((s) => s instanceof Sentence)).toBe(true);
      expect(restored[1].endsWithDesuMasu()).toBe(true);
    });
  });
});

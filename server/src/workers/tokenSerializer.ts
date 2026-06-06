/**
 * Token / Sentence Serializer
 * Feature: parallel-advanced-rules
 *
 * worker_threads 境界では structured clone でクラスメソッドが失われる。
 * Token / Sentence は構造体に潰し、worker 側で `new Token(...)` /
 * `new Sentence(...)` でクラスを再構築する。
 *
 * 既存型と互換:
 * - Token は TokenParams を受ける constructor を持つので、フィールドのスプレッドで往復可能
 * - Sentence は SentenceParams (tokens: Token[]) を受けるので、tokens も再帰的にシリアライズする
 */

import { Token, TokenParams } from '../../../shared/src/types';
import { Sentence, SentenceParams } from '../../../shared/src/advancedTypes';

/**
 * シリアライズ済み Token。
 * 内部表現は `TokenParams` と同一の純粋な構造体。
 */
export type SerializedToken = TokenParams;

/**
 * シリアライズ済み Sentence。
 * tokens は SerializedToken[] になる。
 */
export interface SerializedSentence {
  text: string;
  tokens: SerializedToken[];
  start: number;
  end: number;
}

/**
 * Token → SerializedToken
 *
 * クラスのフィールドだけを取り出して純粋な構造体にする。
 * メソッド (isParticle 等) は転送されないが、受け取り側で `new Token(...)` すれば復元される。
 */
export function serializeToken(token: Token): SerializedToken {
  return {
    surface: token.surface,
    pos: token.pos,
    posDetail1: token.posDetail1,
    posDetail2: token.posDetail2,
    posDetail3: token.posDetail3,
    conjugation: token.conjugation,
    conjugationForm: token.conjugationForm,
    baseForm: token.baseForm,
    reading: token.reading,
    pronunciation: token.pronunciation,
    start: token.start,
    end: token.end,
  };
}

/**
 * SerializedToken → Token
 *
 * Token クラスは TokenParams を受け取る constructor を持つので、
 * そのまま渡すだけでメソッド付きインスタンスが復元される。
 */
export function deserializeToken(params: SerializedToken): Token {
  return new Token(params);
}

/**
 * Token[] の一括シリアライズ。
 */
export function serializeTokens(tokens: Token[]): SerializedToken[] {
  const out: SerializedToken[] = new Array<SerializedToken>(tokens.length);
  for (let i = 0; i < tokens.length; i++) {
    out[i] = serializeToken(tokens[i]);
  }
  return out;
}

/**
 * SerializedToken[] の一括デシリアライズ。
 */
export function deserializeTokens(params: SerializedToken[]): Token[] {
  const out: Token[] = new Array<Token>(params.length);
  for (let i = 0; i < params.length; i++) {
    out[i] = deserializeToken(params[i]);
  }
  return out;
}

/**
 * Sentence → SerializedSentence
 */
export function serializeSentence(sentence: Sentence): SerializedSentence {
  return {
    text: sentence.text,
    tokens: serializeTokens(sentence.tokens),
    start: sentence.start,
    end: sentence.end,
  };
}

/**
 * SerializedSentence → Sentence
 *
 * Sentence クラスは SentenceParams を受け取り、内部で countCommas を呼ぶため、
 * 復元後の commaCount も適切に再計算される。
 */
export function deserializeSentence(params: SerializedSentence): Sentence {
  const restoredParams: SentenceParams = {
    text: params.text,
    tokens: deserializeTokens(params.tokens),
    start: params.start,
    end: params.end,
  };
  return new Sentence(restoredParams);
}

/**
 * Sentence[] の一括シリアライズ。
 */
export function serializeSentences(sentences: Sentence[]): SerializedSentence[] {
  const out: SerializedSentence[] = new Array<SerializedSentence>(sentences.length);
  for (let i = 0; i < sentences.length; i++) {
    out[i] = serializeSentence(sentences[i]);
  }
  return out;
}

/**
 * SerializedSentence[] の一括デシリアライズ。
 */
export function deserializeSentences(params: SerializedSentence[]): Sentence[] {
  const out: Sentence[] = new Array<Sentence>(params.length);
  for (let i = 0; i < params.length; i++) {
    out[i] = deserializeSentence(params[i]);
  }
  return out;
}

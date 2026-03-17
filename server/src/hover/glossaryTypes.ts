/**
 * 用語図鑑の型定義
 */

import { GlossaryId } from '../../../shared/src/types';

/**
 * ホバー時に返される用語情報
 */
export interface GlossaryHit {
  id: GlossaryId;
  title: string;
  term: string;
  description: string;
  aliases?: string[];
  synonyms?: string[];
  antonyms?: string[];
}

/**
 * テキスト上の範囲を持つ用語マッチ結果
 */
export interface GlossaryMatch {
  hit: GlossaryHit;
  range: {
    start: number;
    end: number;
  };
}

/**
 * 用語辞書の1エントリ
 */
export interface GlossaryEntry {
  term: string;
  aliases?: string[];
  synonyms?: string[];
  antonyms?: string[];
  description: string;
}

/**
 * カテゴリID・タイトル・エントリ配列を持つ辞書定義
 */
export interface GlossaryDefinition {
  id: GlossaryId;
  title: string;
  entries: ReadonlyArray<GlossaryEntry>;
}

/**
 * コンソール用語のプロバイダーID
 */
export type ConsoleProviderId = 'aws' | 'azure' | 'oci' | 'cloudflare';

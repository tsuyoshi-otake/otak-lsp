/*
 * Adapted from kuromoji-optimized 1.0.0 ViterbiBuilder.build.
 * Copyright 2014 Takuya Asano; Copyright 2010-2014 Atilika Inc. and contributors.
 * Licensed under the Apache License, Version 2.0:
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Changes: calculate unknown-character run ends once and use substrings instead
 * of rebuilding each suffix. Dictionary candidates, costs and ordering remain.
 */
import ViterbiNode from 'kuromoji-optimized/src/viterbi/ViterbiNode';
import ViterbiLattice from 'kuromoji-optimized/src/viterbi/ViterbiLattice';

interface CharacterClass {
  class_name: string;
  class_id: number;
  is_grouping: number;
  is_always_invoke: number;
}
interface DictionaryBuffer { getShort(index: number): number }
interface OptimizedBuilder {
  token_info_dictionary: { dictionary: DictionaryBuffer; target_map: Record<number, number[]> };
  unknown_dictionary: { dictionary: DictionaryBuffer; target_map: Record<number, number[]>; lookup(char: string): CharacterClass };
  _searchResults: Array<{ v: number; len: number }>;
  _commonPrefixSearch(bytes: Uint8Array, start: number, end: number): number;
  _buildCharOffsets(text: string, byteLength: number): Int32Array;
  _byteOffsetToCharLen(offsets: Int32Array, start: number, end: number): number;
  build(text: string): ViterbiLattice;
}

/** AnalyzerがサロゲートをBMP文字に置換した後の入力だけに適用する。 */
export function installOptimizedLatticeBuilder(tokenizer: unknown): void {
  const builder = (tokenizer as { viterbi_builder: OptimizedBuilder }).viterbi_builder;
  if (!builder || typeof builder._commonPrefixSearch !== 'function' || typeof builder._buildCharOffsets !== 'function' ||
      typeof builder._byteOffsetToCharLen !== 'function' || typeof builder.unknown_dictionary?.lookup !== 'function') {
    throw new Error('kuromoji-optimizedの内部APIが想定と異なります');
  }
  builder.build = function build(text: string): ViterbiLattice {
    const lattice = new ViterbiLattice();
    const known = this.token_info_dictionary;
    const unknown = this.unknown_dictionary;
    const bytes = new TextEncoder().encode(text);
    const offsets = this._buildCharOffsets(text, bytes.length);
    const runEnds = new Int32Array(text.length);
    let nextClass = '';
    let end = text.length;
    for (let pos = text.length - 1; pos >= 0; pos--) {
      const current = unknown.lookup(text.charAt(pos)).class_name;
      if (current !== nextClass) end = pos + 1;
      runEnds[pos] = end;
      nextClass = current;
    }
    for (let pos = 0; pos < text.length; pos++) {
      const byteOffset = offsets[pos];
      const count = this._commonPrefixSearch(bytes, byteOffset, bytes.length);
      for (let n = 0; n < count; n++) {
        const result = this._searchResults[n];
        const length = this._byteOffsetToCharLen(offsets, pos, byteOffset + result.len);
        const surface = text.substring(pos, pos + length);
        for (const id of known.target_map[result.v]) {
          lattice.append(new ViterbiNode(id, known.dictionary.getShort(id + 4), pos + 1, length,
            ViterbiNode.NODE_TYPE.KNOWN, known.dictionary.getShort(id), known.dictionary.getShort(id + 2), surface));
        }
      }
      const charClass = unknown.lookup(text.charAt(pos));
      if (count === 0 || charClass.is_always_invoke === 1) {
        const endPos = charClass.is_grouping === 1 ? runEnds[pos] : pos + 1;
        const surface = text.substring(pos, endPos);
        for (const id of unknown.target_map[charClass.class_id]) {
          lattice.append(new ViterbiNode(id, unknown.dictionary.getShort(id + 4), pos + 1, endPos - pos,
            ViterbiNode.NODE_TYPE.UNKNOWN, unknown.dictionary.getShort(id), unknown.dictionary.getShort(id + 2), surface));
        }
      }
    }
    lattice.appendEos();
    return lattice;
  };
}

declare module 'kuromoji-optimized/src/viterbi/ViterbiNode' {
  class ViterbiNode {
    static NODE_TYPE: { KNOWN: number; UNKNOWN: number };
    constructor(id: number, cost: number, start: number, length: number, type: number, left: number, right: number, surface: string);
  }
  export = ViterbiNode;
}

declare module 'kuromoji-optimized/src/viterbi/ViterbiLattice' {
  import ViterbiNode = require('kuromoji-optimized/src/viterbi/ViterbiNode');
  class ViterbiLattice {
    append(node: ViterbiNode): void;
    appendEos(): void;
  }
  export = ViterbiLattice;
}

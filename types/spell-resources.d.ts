declare module 'otak-english-dictionary' {
  export const aff: string;
  export const dic: string;
}

declare module 'nspell' {
  interface SpellChecker {
    correct(word: string): boolean;
    suggest(word: string): string[];
    add(word: string): void;
  }
  export default function nspell(dictionary: { aff: string; dic: string }): SpellChecker;
}

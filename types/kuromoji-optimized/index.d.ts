// kuromoji-optimized は kuromoji.js のフォークで API 互換。
// 専用の型は提供されないので @types/kuromoji を再エクスポートする。
declare module 'kuromoji-optimized' {
  export * from 'kuromoji';
}

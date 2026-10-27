import { getJouyouFormOfOldKanji } from '../src/oldKanjiData';

describe('常用漢字表索引の参考字体', () => {
  it.each([
    ['鑛', '鉱'], ['學', '学'], ['龍', '竜'],
    ['漢', '漢'], ['餠', '餅'], ['辨', '弁'], ['瓣', '弁'], ['辯', '弁'],
  ])('%s の見出しは %s', (old, modern) => {
    expect(getJouyouFormOfOldKanji(old)).toBe(modern);
  });

  it('未知の字や通常の見出しを勝手に変換しない', () => {
    for (const char of ['彅', '漢', '学', '', '鑛山']) {
      expect(getJouyouFormOfOldKanji(char)).toBeUndefined();
    }
  });
});

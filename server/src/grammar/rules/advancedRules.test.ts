/**
 * Advanced Grammar Rulesの統合ユニットテスト
 * Feature: advanced-grammar-rules
 * 要件: 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5, 8.1-8.5, 9.1-9.5, 10.1-10.5, 11.1-11.5
 */

import { Token } from '../../../../shared/src/types';
import { Sentence, DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';
import { ParticleRepetitionRule } from './particleRepetitionRule';
import { ConjunctionRepetitionRule } from './conjunctionRepetitionRule';
import { AdversativeGaRule } from './adversativeGaRule';
import { AlphabetWidthRule } from './alphabetWidthRule';
import { WeakExpressionRule } from './weakExpressionRule';
import { CommaCountRule } from './commaCountRule';
import { TermNotationRule } from './termNotationRule';
import { KanjiOpeningRule } from './kanjiOpeningRule';
import { PassiveOveruseRule } from './passiveOveruseRule';

/**
 * ヘルパー関数
 */
const createToken = (
  surface: string,
  pos: string,
  start: number
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1: '*',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm: surface,
    reading: surface,
    pronunciation: surface,
    start,
    end: start + surface.length
  });
};

const createTokenWithBaseForm = (
  surface: string,
  pos: string,
  baseForm: string,
  start: number,
  end: number = start + surface.length
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1: '*',
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm,
    reading: surface,
    pronunciation: surface,
    start,
    end
  });
};

const createTokenWithReading = (
  surface: string,
  pos: string,
  start: number,
  reading: string,
  posDetail1: string = '*',
  baseForm: string = surface,
  end: number = start + surface.length
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1,
    posDetail2: '*',
    posDetail3: '*',
    conjugation: '*',
    conjugationForm: '*',
    baseForm,
    reading,
    pronunciation: reading,
    start,
    end
  });
};

const createContext = (text: string, sentences: Sentence[] = []): RuleContext => ({
  documentText: text,
  sentences,
  config: DEFAULT_ADVANCED_RULES_CONFIG
});

describe('ParticleRepetitionRule', () => {
  const rule = new ParticleRepetitionRule();

  it('should detect repeated particles in a sentence', () => {
    const tokens = [
      createToken('私', '名詞', 0),
      createToken('は', '助詞', 1),
      createToken('本', '名詞', 2),
      createToken('を', '助詞', 3),
      createToken('彼', '名詞', 4),
      createToken('は', '助詞', 5), // 「は」の繰り返し
      createToken('読む', '動詞', 6)
    ];
    const sentence = new Sentence({ text: '私は本を彼は読む', tokens, start: 0, end: 8 });
    const context = createContext('私は本を彼は読む', [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('particle-repetition');
  });

  it('should not flag particles used for different predicates (e.g. 〜を解析し、〜を検出する)', () => {
    const text = '日本語テキストを解析し、文法エラーを検出します';
    const tokens = [
      createToken('日本語', '名詞', 0),
      createToken('テキスト', '名詞', 3),
      createToken('を', '助詞', 7),
      createToken('解析', '名詞', 8),
      createToken('し', '動詞', 10),
      createToken('、', '記号', 11),
      createToken('文法', '名詞', 12),
      createToken('エラー', '名詞', 14),
      createToken('を', '助詞', 17),
      createToken('検出', '名詞', 18),
      createToken('し', '動詞', 20),
      createToken('ます', '助動詞', 21)
    ];
    const sentence = new Sentence({ text, tokens, start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not detect when particles are different', () => {
    const tokens = [
      createToken('私', '名詞', 0),
      createToken('は', '助詞', 1),
      createToken('本', '名詞', 2),
      createToken('を', '助詞', 3),
      createToken('読む', '動詞', 4)
    ];
    const sentence = new Sentence({ text: '私は本を読む', tokens, start: 0, end: 6 });
    const context = createContext('私は本を読む', [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not count quoted particles like 「を」', () => {
    const text = '助詞「を」を使う';
    const tokens = [
      createToken('助詞', '名詞', 0),
      createToken('「', '記号', 2),
      createToken('を', '助詞', 3), // 「を」(引用) はカウント対象外
      createToken('」', '記号', 4),
      createToken('を', '助詞', 5),
      createToken('使う', '動詞', 6)
    ];
    const sentence = new Sentence({ text, tokens, start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not report double particles like がが as repetition', () => {
    const text = '私がが行く';
    const tokens = [
      createToken('私', '名詞', 0),
      createToken('が', '助詞', 1),
      createToken('が', '助詞', 2),
      createToken('行く', '動詞', 3)
    ];
    const sentence = new Sentence({ text, tokens, start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not flag 「の」 in explanatory sentences like 「私がが行く」のような同じ助詞の重複', () => {
    const text = '「私がが行く」のような同じ助詞の重複';
    const tokens = [
      createToken('「', '記号', 0),
      createToken('私', '名詞', 1),
      createToken('が', '助詞', 2),
      createToken('が', '助詞', 3),
      createToken('行く', '動詞', 4),
      createToken('」', '記号', 6),
      createToken('の', '助詞', 7),
      createToken('よう', '名詞', 8),
      createToken('な', '助動詞', 10),
      createToken('同じ', '形容詞', 11),
      createToken('助詞', '名詞', 13),
      createToken('の', '助詞', 15),
      createToken('重複', '名詞', 16)
    ];
    const sentence = new Sentence({ text, tokens, start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check(tokens, context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should be enabled by default', () => {
    expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(true);
  });
});

describe('ConjunctionRepetitionRule', () => {
  const rule = new ConjunctionRepetitionRule();

  it('should detect repeated conjunctions', () => {
    const sentences = [
      new Sentence({ text: 'しかし、それは違う。', tokens: [], start: 0, end: 10 }),
      new Sentence({ text: 'しかし、これは正しい。', tokens: [], start: 10, end: 21 })
    ];
    const context = createContext('しかし、それは違う。しかし、これは正しい。', sentences);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('conjunction-repetition');
  });

  it('should not detect different conjunctions', () => {
    const sentences = [
      new Sentence({ text: 'しかし、それは違う。', tokens: [], start: 0, end: 10 }),
      new Sentence({ text: 'また、これは正しい。', tokens: [], start: 10, end: 20 })
    ];
    const context = createContext('しかし、それは違う。また、これは正しい。', sentences);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should provide alternatives', () => {
    const sentences = [
      new Sentence({ text: 'しかし、A。', tokens: [], start: 0, end: 6 }),
      new Sentence({ text: 'しかし、B。', tokens: [], start: 6, end: 12 })
    ];
    const context = createContext('しかし、A。しかし、B。', sentences);
    const diagnostics = rule.check([], context);

    expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
  });
});

describe('AdversativeGaRule', () => {
  const rule = new AdversativeGaRule();

  it('should detect adversative ga usage', () => {
    const tokens1 = [
      createToken('行き', '動詞', 0),
      createToken('ます', '助動詞', 2),
      createToken('が', '助詞', 4)
    ];
    const tokens2 = [
      createToken('行き', '動詞', 10),
      createToken('ます', '助動詞', 12),
      createToken('が', '助詞', 14)
    ];
    const sentences = [
      new Sentence({ text: '行きますが、', tokens: tokens1, start: 0, end: 6 }),
      new Sentence({ text: '行きますが、', tokens: tokens2, start: 10, end: 16 })
    ];
    const context = createContext('行きますが、行きますが、', sentences);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('adversative-ga');
  });
});

describe('AlphabetWidthRule', () => {
  const rule = new AlphabetWidthRule();

  it('should detect mixed width alphabets', () => {
    const text = 'これはＡＢＣとabcの混在です';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('alphabet-width');
  });

  it('should not detect when only halfwidth is used', () => {
    const text = 'This is ABC and xyz';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should not detect when only fullwidth is used', () => {
    const text = 'これはＡＢＣとＸＹＺです';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should provide conversion suggestion', () => {
    const text = 'これはＡＢＣとabcとdefの混在です';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
  });
});

describe('WeakExpressionRule', () => {
  const rule = new WeakExpressionRule();

  it('should detect "かもしれない"', () => {
    const text = 'それはかもしれない';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('weak-expression');
  });

  it('should detect "と思われる"', () => {
    const text = 'それはと思われる';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('weak-expression');
  });

  it('should detect "ような気がする"', () => {
    const text = 'それはような気がする';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('weak-expression');
  });

  it('should provide stronger expression suggestion', () => {
    const text = 'それはかもしれない';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('可能性がある');
  });
});

describe('CommaCountRule', () => {
  const rule = new CommaCountRule();

  it('should detect sentences with too many commas', () => {
    const text = '私は、今日、朝、昼、夜、と、食事をしました。';
    const sentence = new Sentence({ text, tokens: [], start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('comma-count');
    expect(diagnostics[0].message).toContain('6');
  });

  it('should not detect sentences with few commas', () => {
    const text = '私は、今日、朝食を食べました。';
    const sentence = new Sentence({ text, tokens: [], start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should include comma count in message', () => {
    const text = '私は、今日、朝、昼、夜、と、何度も、食事をしました。';
    const sentence = new Sentence({ text, tokens: [], start: 0, end: text.length });
    const context = createContext(text, [sentence]);
    const diagnostics = rule.check([], context);

    expect(diagnostics[0].message).toMatch(/\d+個/);
  });
});

describe('TermNotationRule', () => {
  const rule = new TermNotationRule();

  it('should detect "Javascript" and suggest "JavaScript"', () => {
    const text = 'Javascriptを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('term-notation');
    expect(diagnostics[0].suggestions[0]).toContain('JavaScript');
  });

  it('should detect "Github" and suggest "GitHub"', () => {
    const text = 'Githubを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('GitHub');
  });

  it('should detect "chatgpt" and suggest "ChatGPT"', () => {
    const text = 'chatgptを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('ChatGPT');
  });

  it('should detect "aws" and suggest "AWS"', () => {
    const text = 'awsを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('AWS');
  });

  it('should not detect correct notation', () => {
    const text = 'JavaScriptを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should support custom rules', () => {
    rule.addCustomRule('MyLib', 'my-lib');
    const text = 'MyLibを使用します';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('my-lib');
  });
});

describe('KanjiOpeningRule', () => {
  const rule = new KanjiOpeningRule();

  it('should detect "下さい" and suggest "ください"', () => {
    const text = '確認して下さい';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].code).toBe('kanji-opening');
    expect(diagnostics[0].suggestions[0]).toContain('ください');
  });

  it('should detect "出来る" and suggest "できる"', () => {
    const text = 'これは出来る';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('できる');
  });

  it('should detect "有難う" and suggest "ありがとう"', () => {
    const text = '有難うございます';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('ありがとう');
  });

  it('should detect "宜しく" and suggest "よろしく"', () => {
    const text = '宜しくお願いします';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].suggestions[0]).toContain('よろしく');
  });

  it('should not detect already opened kanji', () => {
    const text = 'ください、できます、ありがとう';
    const context = createContext(text);
    const diagnostics = rule.check([], context);

    expect(diagnostics).toHaveLength(0);
  });

  it('should NOT suggest "時" in compounds like "起動時"', () => {
    const text = '初回起動時に時間がかかる';
    const context = createContext(text);
    const tokens = [
      createTokenWithReading('初回', '名詞', 0, 'ショカイ', '一般'),
      createTokenWithReading('起動', '名詞', 2, 'キドウ', 'サ変接続'),
      createTokenWithReading('時', '名詞', 4, 'ジ', '接尾'),
      createTokenWithReading('に', '助詞', 5, 'ニ', '格助詞'),
      createTokenWithReading('時間', '名詞', 6, 'ジカン', '副詞可能'),
      createTokenWithReading('が', '助詞', 8, 'ガ', '格助詞'),
      createTokenWithReading('かかる', '動詞', 9, 'カカル', '自立', 'かかる')
    ];

    const diagnostics = rule.check(tokens, context);
    expect(diagnostics).toHaveLength(0);
  });

  it('should suggest "とき" for "困った時"', () => {
    const text = '困った時は';
    const context = createContext(text);
    const tokens = [
      createTokenWithReading('困っ', '動詞', 0, 'コマッ', '自立', '困る'),
      createTokenWithReading('た', '助動詞', 2, 'タ'),
      createTokenWithReading('時', '名詞', 3, 'トキ', '非自立'),
      createTokenWithReading('は', '助詞', 4, 'ハ', '係助詞')
    ];

    const diagnostics = rule.check(tokens, context);
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics.some((d) => d.message.includes('漢字「時」'))).toBe(true);
    expect(diagnostics.some((d) => d.suggestions.some((s) => s.includes('とき')))).toBe(true);
  });
});

describe('PassiveOveruseRule', () => {
  const rule = new PassiveOveruseRule();

  it('should detect passive overuse in consecutive sentences and report localized range', () => {
    const prefix = '前置きです。';
    const s1 = '報告書が作成された。';
    const s2 = '結果が分析された。';
    const s3 = '結論が導かれた。';
    const suffix = '後書きです。';
    const text = `${prefix}\n\n${s1}${s2}${s3}\n\n${suffix}`;

    const prefixOffset = 0;
    const s1Offset = prefix.length + 2; // \n\n
    const s2Offset = s1Offset + s1.length;
    const s3Offset = s2Offset + s2.length;

    const sentencePrefix = new Sentence({ text: prefix, tokens: [], start: prefixOffset, end: prefixOffset + prefix.length });

    const sentence1Tokens = [
      createTokenWithBaseForm('れ', '動詞', 'れる', s1Offset + 6),
      createTokenWithBaseForm('た', '助動詞', 'た', s1Offset + 7)
    ];
    const sentence1 = new Sentence({ text: s1, tokens: sentence1Tokens, start: s1Offset, end: s1Offset + s1.length });

    const sentence2Tokens = [
      createTokenWithBaseForm('れ', '動詞', 'れる', s2Offset + 6),
      createTokenWithBaseForm('た', '助動詞', 'た', s2Offset + 7)
    ];
    const sentence2 = new Sentence({ text: s2, tokens: sentence2Tokens, start: s2Offset, end: s2Offset + s2.length });

    const sentence3Tokens = [
      createTokenWithBaseForm('れ', '動詞', 'れる', s3Offset + 6),
      createTokenWithBaseForm('た', '助動詞', 'た', s3Offset + 7)
    ];
    const sentence3 = new Sentence({ text: s3, tokens: sentence3Tokens, start: s3Offset, end: s3Offset + s3.length });

    const suffixOffset = text.length - suffix.length;
    const sentenceSuffix = new Sentence({ text: suffix, tokens: [], start: suffixOffset, end: text.length });

    const allTokens = [...sentence1Tokens, ...sentence2Tokens, ...sentence3Tokens];
    const context = createContext(text, [sentencePrefix, sentence1, sentence2, sentence3, sentenceSuffix]);
    const diagnostics = rule.check(allTokens, context);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('passive-overuse');
    expect(diagnostics[0].message).toContain('3回');
    expect(diagnostics[0].range.start.line).toBe(0);
    expect(diagnostics[0].range.start.character).toBeGreaterThan(0);
    expect(diagnostics[0].range.end.character).toBeLessThan(text.length);
  });

  it('should not detect when passive expressions are not consecutive', () => {
    const text = '報告書が作成された。晴れた。結果が分析された。';
    const s1 = '報告書が作成された。';
    const s2 = '晴れた。';
    const s3 = '結果が分析された。';

    const s1Offset = 0;
    const s2Offset = s1.length;
    const s3Offset = s2Offset + s2.length;

    const sentence1Tokens = [
      createTokenWithBaseForm('れ', '動詞', 'れる', s1Offset + 6),
      createTokenWithBaseForm('た', '助動詞', 'た', s1Offset + 7)
    ];
    const sentence1 = new Sentence({ text: s1, tokens: sentence1Tokens, start: s1Offset, end: s1Offset + s1.length });

    const sentence2 = new Sentence({ text: s2, tokens: [], start: s2Offset, end: s2Offset + s2.length });

    const sentence3Tokens = [
      createTokenWithBaseForm('れ', '動詞', 'れる', s3Offset + 6),
      createTokenWithBaseForm('た', '助動詞', 'た', s3Offset + 7)
    ];
    const sentence3 = new Sentence({ text: s3, tokens: sentence3Tokens, start: s3Offset, end: s3Offset + s3.length });

    const allTokens = [...sentence1Tokens, ...sentence3Tokens];
    const context = createContext(text, [sentence1, sentence2, sentence3]);
    const diagnostics = rule.check(allTokens, context);

    expect(diagnostics).toHaveLength(0);
  });
});

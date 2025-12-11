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

  it('should be disabled by default', () => {
    expect(rule.isEnabled(DEFAULT_ADVANCED_RULES_CONFIG)).toBe(false);
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
});

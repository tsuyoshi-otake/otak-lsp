/**
 * Sentence Ending Colon Ruleのユニットテスト
 * Feature: sentence-ending-colon-detection
 * 要件: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3
 */

import { SentenceEndingColonRule } from './sentenceEndingColonRule';
import { Token } from '../../../../shared/src/types';
import {
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  Sentence,
  AdvancedRulesConfig
} from '../../../../shared/src/advancedTypes';

describe('SentenceEndingColonRule', () => {
  let rule: SentenceEndingColonRule;

  beforeEach(() => {
    rule = new SentenceEndingColonRule();
  });

  /**
   * ヘルパー関数: トークンを作成
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

  const createSentence = (text: string, start: number): Sentence => {
    return new Sentence({
      text,
      tokens: [createToken(text, '名詞', start)],
      start,
      end: start + text.length
    });
  };

  const createContext = (text: string, sentences?: Sentence[]): RuleContext => ({
    documentText: text,
    sentences: sentences || [createSentence(text, 0)],
    config: DEFAULT_ADVANCED_RULES_CONFIG
  });

  describe('基本的な文末コロン検出 (要件 1.1)', () => {
    it('文末の全角コロンを検出する', () => {
      const text = 'これはテストです：';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('sentence-ending-colon');
    });

    it('文末に空白がある場合でも全角コロンを検出する', () => {
      const text = 'これはテストです：  ';
      const sentence = createSentence(text.trim(), 0);
      const context = createContext(text, [sentence]);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].code).toBe('sentence-ending-colon');
    });

    it('複数の文末コロンを検出する', () => {
      const text1 = '最初の文：';
      const text2 = '次の文：';
      const sentences = [
        createSentence(text1, 0),
        createSentence(text2, text1.length + 1)
      ];
      const context = createContext(text1 + '\n' + text2, sentences);
      const tokens = [createToken(text1 + '\n' + text2, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(2);
    });
  });

  describe('修正提案 (要件 1.2, 3.2)', () => {
    it('句点への修正提案を含む', () => {
      const text = 'これはテストです：';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].suggestions).toBeDefined();
      expect(diagnostics[0].suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('文中のコロンは検出しない (要件 1.3)', () => {
    it('文中のコロンは警告を生成しない', () => {
      const text = '時間：10時から開始します。';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('複数のコロンがある文で文末以外は検出しない', () => {
      const text = '時間：10時、場所：会議室。';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('箇条書き前置きのコロンは検出しない (要件 1.4)', () => {
    it('次の行が「-」で始まる箇条書き前置きは検出しない', () => {
      const text = '以下の項目を確認してください：\n- 項目1\n- 項目2';
      const sentence = createSentence('以下の項目を確認してください：', 0);
      const context = createContext(text, [sentence]);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('次の行が「*」で始まる箇条書き前置きは検出しない', () => {
      const text = '必要な物：\n* 鉛筆\n* 消しゴム';
      const sentence = createSentence('必要な物：', 0);
      const context = createContext(text, [sentence]);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('次の行が番号付きリストで始まる箇条書き前置きは検出しない', () => {
      const text = '手順は以下の通り：\n1. 準備する\n2. 実行する';
      const sentence = createSentence('手順は以下の通り：', 0);
      const context = createContext(text, [sentence]);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('次の行が箇条書きでない場合は検出する', () => {
      const text = 'これはテストです：\nこれは通常の文です。';
      const sentence = createSentence('これはテストです：', 0);
      const context = createContext(text, [sentence]);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('半角コロンは検出しない (要件 1.5)', () => {
    it('半角コロン（:）は警告を生成しない', () => {
      const text = 'これはテストです:';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('半角コロンが文中にあっても検出しない', () => {
      const text = 'time: 10:00';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('警告メッセージ (要件 3.1, 3.3)', () => {
    it('適切な警告メッセージを表示する', () => {
      const text = 'これはテストです：';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics[0].message).toContain('文末にコロン');
      expect(diagnostics[0].message).toContain('：');
    });
  });

  describe('isEnabled (要件 2.1, 2.2, 2.3)', () => {
    it('設定で有効化されている場合trueを返す', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableSentenceEndingColon: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('設定で無効化されている場合falseを返す', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableSentenceEndingColon: false };
      expect(rule.isEnabled(config)).toBe(false);
    });

    it('デフォルトで有効である', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.enableSentenceEndingColon).toBe(true);
    });
  });

  describe('エッジケース', () => {
    it('空の文はスキップする', () => {
      const text = '';
      const sentence = createSentence('', 0);
      const context = createContext(text, [sentence]);
      const tokens: Token[] = [];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics).toHaveLength(0);
    });

    it('コロンのみの文を処理できる', () => {
      const text = '：';
      const context = createContext(text);
      const tokens = [createToken(text, '記号', 0)];
      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('句読点の後にコロンがある場合', () => {
      const text = 'テストです。：';
      const context = createContext(text);
      const tokens = [createToken(text, '名詞', 0)];
      const diagnostics = rule.check(tokens, context);

      // 句点の後のコロンも検出する
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  describe('ルール名とメタデータ', () => {
    it('正しいルール名を持つ', () => {
      expect(rule.name).toBe('sentence-ending-colon');
    });

    it('説明が存在する', () => {
      expect(rule.description).toBeDefined();
      expect(rule.description.length).toBeGreaterThan(0);
    });
  });
});

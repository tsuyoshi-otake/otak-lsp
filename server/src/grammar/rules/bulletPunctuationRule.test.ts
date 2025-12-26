/**
 * BulletPunctuationRuleの単体テスト
 * Feature: official-document-rules
 * 要件: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { BulletPunctuationRule, BulletItem } from './bulletPunctuationRule';
import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext, Sentence } from '../../../../shared/src/advancedTypes';

describe('BulletPunctuationRule', () => {
  const rule = new BulletPunctuationRule();

  const createToken = (surface: string, pos: string, start: number): Token => {
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

  const createContext = (text: string, tokens: Token[]): RuleContext => ({
    documentText: text,
    sentences: [],
    config: { ...DEFAULT_ADVANCED_RULES_CONFIG, enableBulletPunctuation: true }
  });

  describe('extractBulletItem', () => {
    it('ハイフンマーカーの箇条書きを検出する', () => {
      const line = '- 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('アスタリスクマーカーの箇条書きを検出する', () => {
      const line = '* 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('プラスマーカーの箇条書きを検出する', () => {
      const line = '+ 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('番号付きリストを検出する', () => {
      const line = '1. 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('中黒マーカーの箇条書きを検出する', () => {
      const line = '・ 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('インデント付きの箇条書きを検出する', () => {
      const line = '  - 項目テスト';
      const item = rule.extractBulletItem(line, 0);
      expect(item).not.toBeNull();
      expect(item!.text).toBe('項目テスト');
    });

    it('箇条書きでない行はnullを返す', () => {
      const line = 'これは通常のテキストです';
      const item = rule.extractBulletItem(line, 0);
      expect(item).toBeNull();
    });

    it('空の項目はnullを返す', () => {
      const line = '- ';
      const item = rule.extractBulletItem(line, 0);
      expect(item).toBeNull();
    });
  });

  describe('isTrailingException', () => {
    it('コロンで終わる項目は例外として扱う', () => {
      expect(rule.isTrailingException('以下の通り：')).toBe(true);
      expect(rule.isTrailingException('以下の通り:')).toBe(true);
    });

    it('括弧閉じで終わる項目は例外として扱う', () => {
      expect(rule.isTrailingException('項目（注釈）')).toBe(true);
      expect(rule.isTrailingException('項目「引用」')).toBe(true);
      expect(rule.isTrailingException('項目【重要】')).toBe(true);
      expect(rule.isTrailingException('項目『書名』')).toBe(true);
    });

    it('引用符閉じで終わる項目は例外として扱う', () => {
      expect(rule.isTrailingException('項目"引用"')).toBe(true);
      expect(rule.isTrailingException("項目'引用'")).toBe(true);
    });

    it('通常の項目は例外ではない', () => {
      expect(rule.isTrailingException('通常の項目')).toBe(false);
      expect(rule.isTrailingException('通常の項目。')).toBe(false);
    });
  });

  describe('classifyItem', () => {
    it('名詞で終わる項目は名詞句と判定する', () => {
      const tokens = [createToken('項目', '名詞', 0)];
      const classification = rule.classifyItem('項目', tokens);
      expect(classification).toBe('noun-phrase');
    });

    it('動詞で終わる項目は文と判定する', () => {
      const tokens = [createToken('実行する', '動詞', 0)];
      const classification = rule.classifyItem('実行する', tokens);
      expect(classification).toBe('sentence');
    });

    it('「です」で終わる項目は文と判定する', () => {
      const tokens = [
        createToken('項目', '名詞', 0),
        createToken('です', '助動詞', 2)
      ];
      const classification = rule.classifyItem('項目です', tokens);
      expect(classification).toBe('sentence');
    });

    it('「ます」で終わる項目は文と判定する', () => {
      const tokens = [
        createToken('実行', '名詞', 0),
        createToken('し', '動詞', 2),
        createToken('ます', '助動詞', 3)
      ];
      const classification = rule.classifyItem('実行します', tokens);
      expect(classification).toBe('sentence');
    });

    it('空のトークン列は曖昧と判定する', () => {
      const classification = rule.classifyItem('', []);
      expect(classification).toBe('ambiguous');
    });
  });

  describe('check', () => {
    it('名詞句に句点がある場合は警告を出力する', () => {
      const text = '- 項目。';
      const tokens = [createToken('項目', '名詞', 2)];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('bullet-punctuation');
      expect(diagnostics[0].message).toContain('名詞句');
      expect(diagnostics[0].message).toContain('句点');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Information);
    });

    it('文に句点がない場合は警告を出力する', () => {
      const text = '- 実行します';
      const tokens = [
        createToken('実行', '名詞', 2),
        createToken('し', '動詞', 4),
        createToken('ます', '助動詞', 5)
      ];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('bullet-punctuation');
      expect(diagnostics[0].message).toContain('文');
      expect(diagnostics[0].message).toContain('句点');
      expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Information);
    });

    it('名詞句に句点がない場合は警告を出力しない', () => {
      const text = '- 項目';
      const tokens = [createToken('項目', '名詞', 2)];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(0);
    });

    it('文に句点がある場合は警告を出力しない', () => {
      const text = '- 実行します。';
      const tokens = [
        createToken('実行', '名詞', 2),
        createToken('し', '動詞', 4),
        createToken('ます', '助動詞', 5),
        createToken('。', '記号', 8)
      ];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(0);
    });

    it('末尾がコロンの場合は診断を出力しない', () => {
      const text = '- 以下の通り：';
      const tokens = [createToken('以下', '名詞', 2)];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(0);
    });

    it('末尾が括弧閉じの場合は診断を出力しない', () => {
      const text = '- 項目（注釈）';
      const tokens = [createToken('項目', '名詞', 2)];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(0);
    });

    it('複数の箇条書き項目をチェックする', () => {
      const text = '- 項目1。\n- 項目2。\n- 項目3。';
      const tokens = [
        createToken('項目', '名詞', 2),
        createToken('1', '名詞', 4),
        createToken('項目', '名詞', 9),
        createToken('2', '名詞', 11),
        createToken('項目', '名詞', 16),
        createToken('3', '名詞', 18)
      ];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      // 名詞句に句点があるので3つの警告
      expect(diagnostics.length).toBe(3);
    });

    it('テーブルセル内の箇条書きでも警告を出力する', () => {
      const text = '| カテゴリ | PASS | - 項目。 |';
      const tokenStart = text.indexOf('項目');
      const tokens = [createToken('項目', '名詞', tokenStart)];
      const context = createContext(text, tokens);

      const diagnostics = rule.check(tokens, context);

      expect(diagnostics.length).toBe(1);
      expect(diagnostics[0].code).toBe('bullet-punctuation');
    });
  });

  describe('isEnabled', () => {
    it('enableBulletPunctuationがtrueの場合は有効', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableBulletPunctuation: true };
      expect(rule.isEnabled(config)).toBe(true);
    });

    it('enableBulletPunctuationがfalseの場合は無効', () => {
      const config = { ...DEFAULT_ADVANCED_RULES_CONFIG, enableBulletPunctuation: false };
      expect(rule.isEnabled(config)).toBe(false);
    });
  });
});

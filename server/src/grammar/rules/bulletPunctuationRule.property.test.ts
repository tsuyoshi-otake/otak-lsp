/**
 * BulletPunctuationRuleのプロパティベーステスト
 * Feature: official-document-rules
 * Property 8: 箇条書き項目の検出
 * Property 9: 名詞句の句点抑制
 * Property 10: 文の句点要求
 * Property 11: 曖昧判定と例外除外
 * 検証: 要件 6.1, 6.2, 6.3, 6.4, 6.5
 */

import * as fc from 'fast-check';
import { BulletPunctuationRule } from './bulletPunctuationRule';
import { Token } from '../../../../shared/src/types';
import { DEFAULT_ADVANCED_RULES_CONFIG, RuleContext } from '../../../../shared/src/advancedTypes';

describe('Property-Based Tests: BulletPunctuationRule', () => {
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

  /**
   * Feature: official-document-rules, Property 8: 箇条書き項目の検出
   * 箇条書きマーカー（「-」「*」「+」「番号.」「・」）を含む行では、
   * 該当ルールが有効であれば項目が検出される。
   *
   * 検証: 要件 6.1
   */
  describe('Property 8: 箇条書き項目の検出', () => {
    it('任意の箇条書きマーカーで項目が検出される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.stringOf(fc.constantFrom('あ', 'い', 'う', 'え', 'お'), { minLength: 1, maxLength: 10 }),
          (marker, content) => {
            const line = `${marker} ${content}`;
            const item = rule.extractBulletItem(line, 0);
            
            expect(item).not.toBeNull();
            expect(item!.text).toBe(content);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('番号付きリストで項目が検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99 }),
          fc.stringOf(fc.constantFrom('あ', 'い', 'う', 'え', 'お'), { minLength: 1, maxLength: 10 }),
          (num, content) => {
            const line = `${num}. ${content}`;
            const item = rule.extractBulletItem(line, 0);
            
            expect(item).not.toBeNull();
            expect(item!.text).toBe(content);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('インデント付きの箇条書きでも項目が検出される', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }),
          fc.constantFrom('-', '*', '+'),
          fc.stringOf(fc.constantFrom('あ', 'い', 'う', 'え', 'お'), { minLength: 1, maxLength: 10 }),
          (indentLevel, marker, content) => {
            const indent = '  '.repeat(indentLevel);
            const line = `${indent}${marker} ${content}`;
            const item = rule.extractBulletItem(line, 0);
            
            expect(item).not.toBeNull();
            expect(item!.text).toBe(content);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: official-document-rules, Property 9: 名詞句の句点抑制
   * 名詞句と判定された箇条書き項目が句点「。」で終わる場合、警告が出力される。
   *
   * 検証: 要件 6.2
   */
  describe('Property 9: 名詞句の句点抑制', () => {
    it('名詞句に句点がある場合は警告が出力される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('項目', '設定', 'データ', 'ファイル', '機能'),
          (marker, noun) => {
            const text = `${marker} ${noun}。`;
            // 名詞トークンの位置を計算（マーカー + スペース）
            const tokenStart = marker.length + 1;
            const tokens = [createToken(noun, '名詞', tokenStart)];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 名詞句に句点があるので警告が出る
            expect(diagnostics.length).toBe(1);
            expect(diagnostics[0].code).toBe('bullet-punctuation');
            expect(diagnostics[0].message).toContain('名詞句');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('名詞句に句点がない場合は警告が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('項目', '設定', 'データ', 'ファイル', '機能'),
          (marker, noun) => {
            const text = `${marker} ${noun}`;
            const tokenStart = marker.length + 1;
            const tokens = [createToken(noun, '名詞', tokenStart)];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 名詞句に句点がないので警告は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: official-document-rules, Property 10: 文の句点要求
   * 文と判定された箇条書き項目が句点「。」で終わらない場合、警告が出力される。
   *
   * 検証: 要件 6.3
   */
  describe('Property 10: 文の句点要求', () => {
    it('文に句点がない場合は警告が出力される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('実行します', '確認します', '設定します', '処理します'),
          (marker, sentence) => {
            const text = `${marker} ${sentence}`;
            const tokenStart = marker.length + 1;
            // 「〜します」の形式をトークン化
            const tokens = [
              createToken(sentence.slice(0, -3), '名詞', tokenStart),
              createToken('し', '動詞', tokenStart + sentence.length - 3),
              createToken('ます', '助動詞', tokenStart + sentence.length - 2)
            ];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 文に句点がないので警告が出る
            expect(diagnostics.length).toBe(1);
            expect(diagnostics[0].code).toBe('bullet-punctuation');
            expect(diagnostics[0].message).toContain('文');
          }
        ),
        { numRuns: 30 }
      );
    });

    it('文に句点がある場合は警告が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('実行します', '確認します', '設定します', '処理します'),
          (marker, sentence) => {
            const text = `${marker} ${sentence}。`;
            const tokenStart = marker.length + 1;
            const tokens = [
              createToken(sentence.slice(0, -3), '名詞', tokenStart),
              createToken('し', '動詞', tokenStart + sentence.length - 3),
              createToken('ます', '助動詞', tokenStart + sentence.length - 2),
              createToken('。', '記号', tokenStart + sentence.length)
            ];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 文に句点があるので警告は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Feature: official-document-rules, Property 11: 曖昧判定と例外除外
   * 名詞句/文の判定が曖昧な項目、または末尾が「：」や括弧/引用符閉じで終わる項目
   * については診断が出力されない。
   *
   * 検証: 要件 6.4, 6.5
   */
  describe('Property 11: 曖昧判定と例外除外', () => {
    it('末尾がコロンの場合は診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('以下の通り', '次の項目', '設定内容'),
          fc.constantFrom('：', ':'),
          (marker, content, colon) => {
            const text = `${marker} ${content}${colon}`;
            const tokenStart = marker.length + 1;
            const tokens = [createToken(content, '名詞', tokenStart)];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // コロンで終わるので診断は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('末尾が括弧閉じの場合は診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('項目', '設定', 'データ'),
          fc.constantFrom('）', '」', '】', '』'),
          (marker, content, closeBracket) => {
            const openBracket = closeBracket === '）' ? '（' :
                               closeBracket === '」' ? '「' :
                               closeBracket === '】' ? '【' : '『';
            const text = `${marker} ${content}${openBracket}注釈${closeBracket}`;
            const tokenStart = marker.length + 1;
            const tokens = [createToken(content, '名詞', tokenStart)];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 括弧閉じで終わるので診断は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('末尾が引用符閉じの場合は診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.constantFrom('項目', '設定', 'データ'),
          fc.constantFrom('"', "'"),
          (marker, content, quote) => {
            const text = `${marker} ${content}${quote}引用${quote}`;
            const tokenStart = marker.length + 1;
            const tokens = [createToken(content, '名詞', tokenStart)];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // 引用符閉じで終わるので診断は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('トークンがない場合は曖昧として診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('-', '*', '+', '・'),
          fc.stringOf(fc.constantFrom('あ', 'い', 'う'), { minLength: 1, maxLength: 5 }),
          (marker, content) => {
            const text = `${marker} ${content}`;
            // トークンなし（曖昧な状態）
            const tokens: Token[] = [];
            const context = createContext(text, tokens);

            const diagnostics = rule.check(tokens, context);

            // トークンがないので曖昧として診断は出ない
            expect(diagnostics.length).toBe(0);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

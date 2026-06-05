/**
 * Shared Preprocessing Cache Tests
 * Feature: advanced-rules-shared-preprocessing-cache
 *
 * 高度ルールの前処理結果を共有キャッシュ化するテスト
 */

import { Token } from '../../../shared/src/types';
import {
  AdvancedRuleSharedContext,
  RuleContext,
  DEFAULT_ADVANCED_RULES_CONFIG
} from '../../../shared/src/advancedTypes';
import { buildSharedContext } from './sharedContextBuilder';
import { TermNotationRule } from './rules/termNotationRule';
import { EnglishCaseMixRule } from './rules/englishCaseMixRule';
import { QuotationStyleMixRule } from './rules/quotationStyleMixRule';
import { AdvancedRulesManager } from './advancedRulesManager';

describe('AdvancedRuleSharedContext Type', () => {
  describe('要件1: 共有前処理の生成', () => {
    it('AdvancedRuleSharedContext 型が定義されている', () => {
      // 型が存在することをコンパイル時にチェック
      const sharedContext: AdvancedRuleSharedContext = {
        codeBlockRanges: [],
        inlineCodeRanges: [],
        codeRanges: [],
        lineStarts: [0],
        lines: ['']
      };

      expect(sharedContext.codeBlockRanges).toBeDefined();
      expect(sharedContext.inlineCodeRanges).toBeDefined();
      expect(sharedContext.codeRanges).toBeDefined();
      expect(sharedContext.lineStarts).toBeDefined();
      expect(sharedContext.lines).toBeDefined();
    });

    it('RuleContext に shared プロパティが含まれている', () => {
      const context: RuleContext = {
        documentText: 'テスト文書',
        sentences: [],
        config: DEFAULT_ADVANCED_RULES_CONFIG,
        shared: {
          codeBlockRanges: [],
          inlineCodeRanges: [],
          codeRanges: [],
          lineStarts: [0],
          lines: ['テスト文書']
        }
      };

      expect(context.shared).toBeDefined();
      expect(context.shared?.codeBlockRanges).toEqual([]);
    });

    it('RuleContext.shared はオプショナルである', () => {
      const context: RuleContext = {
        documentText: 'テスト文書',
        sentences: [],
        config: DEFAULT_ADVANCED_RULES_CONFIG
      };

      // shared がなくてもコンパイルエラーにならない
      expect(context.shared).toBeUndefined();
    });
  });

  describe('共有コンテキストの構造', () => {
    it('codeBlockRanges にフェンスコードブロック範囲が格納できる', () => {
      const shared: AdvancedRuleSharedContext = {
        codeBlockRanges: [
          { start: 10, end: 50 },
          { start: 100, end: 150 }
        ],
        inlineCodeRanges: [],
        codeRanges: [],
        lineStarts: [0],
        lines: ['']
      };

      expect(shared.codeBlockRanges).toHaveLength(2);
      expect(shared.codeBlockRanges[0].start).toBe(10);
      expect(shared.codeBlockRanges[0].end).toBe(50);
    });

    it('inlineCodeRanges にインラインコード範囲が格納できる', () => {
      const shared: AdvancedRuleSharedContext = {
        codeBlockRanges: [],
        inlineCodeRanges: [
          { start: 5, end: 15 }
        ],
        codeRanges: [],
        lineStarts: [0],
        lines: ['']
      };

      expect(shared.inlineCodeRanges).toHaveLength(1);
    });

    it('codeRanges にコードブロック+インラインコードの結合範囲が格納できる', () => {
      const shared: AdvancedRuleSharedContext = {
        codeBlockRanges: [{ start: 10, end: 50 }],
        inlineCodeRanges: [{ start: 5, end: 8 }],
        codeRanges: [
          { start: 5, end: 8 },
          { start: 10, end: 50 }
        ],
        lineStarts: [0],
        lines: ['']
      };

      expect(shared.codeRanges).toHaveLength(2);
    });

    it('lineStarts に行開始位置配列が格納できる', () => {
      const shared: AdvancedRuleSharedContext = {
        codeBlockRanges: [],
        inlineCodeRanges: [],
        codeRanges: [],
        lineStarts: [0, 10, 25, 40],
        lines: ['']
      };

      expect(shared.lineStarts).toHaveLength(4);
      expect(shared.lineStarts[0]).toBe(0);
    });

    it('lines に行テキスト配列が格納できる', () => {
      const shared: AdvancedRuleSharedContext = {
        codeBlockRanges: [],
        inlineCodeRanges: [],
        codeRanges: [],
        lineStarts: [0, 6, 12],
        lines: ['最初の行', '2行目', '3行目']
      };

      expect(shared.lines).toHaveLength(3);
      expect(shared.lines[0]).toBe('最初の行');
    });
  });
});

describe('buildSharedContext', () => {
  // テスト用ヘルパー: 共有コンテキスト付きルールコンテキスト作成
  function createContextWithShared(text: string): RuleContext {
    const shared = buildSharedContext(text);
    return {
      documentText: text,
      sentences: [],
      config: DEFAULT_ADVANCED_RULES_CONFIG,
      shared
    };
  }

  describe('要件1: 共有前処理の生成', () => {
    it('テキストからコードブロック範囲を抽出する', () => {
      const text = '本文\n```javascript\nconst x = 1;\n```\n本文続き';
      const shared = buildSharedContext(text);

      expect(shared.codeBlockRanges).toHaveLength(1);
      expect(shared.codeBlockRanges[0].start).toBe(3); // '本文\n' は3文字
      expect(text.slice(shared.codeBlockRanges[0].start, shared.codeBlockRanges[0].end)).toContain('```javascript');
    });

    it('テキストからインラインコード範囲を抽出する', () => {
      const text = '変数は`value`です。';
      const shared = buildSharedContext(text);

      expect(shared.inlineCodeRanges).toHaveLength(1);
      expect(text.slice(shared.inlineCodeRanges[0].start, shared.inlineCodeRanges[0].end)).toBe('`value`');
    });

    it('codeRanges にコードブロックとインラインコードを結合する', () => {
      const text = '`inline`があり\n```\nblock\n```\nです';
      const shared = buildSharedContext(text);

      expect(shared.codeRanges.length).toBeGreaterThanOrEqual(2);
      // codeRanges は codeBlockRanges と inlineCodeRanges の結合
      expect(shared.codeRanges.length).toBe(
        shared.codeBlockRanges.length + shared.inlineCodeRanges.length
      );
    });

    it('行開始位置を正しく計算する', () => {
      const text = '1行目\n2行目\n3行目';
      const shared = buildSharedContext(text);

      expect(shared.lineStarts).toEqual([0, 4, 8]);
    });

    it('行テキストを正しく抽出する', () => {
      const text = '1行目\n2行目\n3行目';
      const shared = buildSharedContext(text);

      expect(shared.lines).toEqual(['1行目', '2行目', '3行目']);
    });

    it('空テキストでも正しく動作する', () => {
      const shared = buildSharedContext('');

      expect(shared.codeBlockRanges).toEqual([]);
      expect(shared.inlineCodeRanges).toEqual([]);
      expect(shared.codeRanges).toEqual([]);
      expect(shared.lineStarts).toEqual([0]);
      expect(shared.lines).toEqual(['']);
    });

    it('コードブロックがない場合も正しく動作する', () => {
      const text = '普通のテキストです。';
      const shared = buildSharedContext(text);

      expect(shared.codeBlockRanges).toEqual([]);
      expect(shared.inlineCodeRanges).toEqual([]);
      expect(shared.codeRanges).toEqual([]);
    });

    it('複数のコードブロックを検出する', () => {
      const text = '```\nblock1\n```\n\n```python\nblock2\n```';
      const shared = buildSharedContext(text);

      expect(shared.codeBlockRanges).toHaveLength(2);
    });

    it('複数のインラインコードを検出する', () => {
      const text = '`a`と`b`と`c`';
      const shared = buildSharedContext(text);

      expect(shared.inlineCodeRanges).toHaveLength(3);
    });
  });

  describe('要件2: ルールからの参照', () => {
    it('RuleContext に shared を設定できる', () => {
      const text = 'テスト';
      const shared = buildSharedContext(text);
      const context: RuleContext = {
        documentText: text,
        sentences: [],
        config: DEFAULT_ADVANCED_RULES_CONFIG,
        shared
      };

      expect(context.shared).toBeDefined();
      expect(context.shared?.lines).toEqual(['テスト']);
    });
  });
});

describe('ルール側の共有コンテキスト参照', () => {
  const emptyTokens: Token[] = [];

  describe('要件2: ルールからの参照', () => {
    describe('TermNotationRule', () => {
      it('context.shared がある場合も正しく動作する', () => {
        const rule = new TermNotationRule();
        const text = 'javascriptは便利です。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableTermNotation: true,
            enableWebTechDictionary: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].code).toBe('term-notation');
      });

      it('context.shared がない場合もフォールバックで動作する', () => {
        const rule = new TermNotationRule();
        const text = 'javascriptは便利です。';
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableTermNotation: true,
            enableWebTechDictionary: true
          }
          // shared なし
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].code).toBe('term-notation');
      });

      it('コードブロック内の検出を除外する（shared使用）', () => {
        const rule = new TermNotationRule();
        const text = '```\njavascript\n```\nJavaScript は正しい。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableTermNotation: true,
            enableWebTechDictionary: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        // コードブロック内の javascript は検出されない
        expect(diagnostics.length).toBe(0);
      });
    });

    describe('EnglishCaseMixRule', () => {
      it('context.shared がある場合も正しく動作する', () => {
        const rule = new EnglishCaseMixRule();
        const text = 'APIを使用します。apiの設計は重要です。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableEnglishCaseMix: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].code).toBe('english-case-mix');
      });

      it('context.shared がない場合もフォールバックで動作する', () => {
        const rule = new EnglishCaseMixRule();
        const text = 'APIを使用します。apiの設計は重要です。';
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableEnglishCaseMix: true
          }
          // shared なし
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBe(1);
        expect(diagnostics[0].code).toBe('english-case-mix');
      });

      it('コードブロック内の検出を除外する（shared使用）', () => {
        const rule = new EnglishCaseMixRule();
        const text = '```\nAPI\n```\nAPIを使用する。apiはここに。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableEnglishCaseMix: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBe(1);
      });
    });

    describe('QuotationStyleMixRule', () => {
      it('context.shared がある場合も正しく動作する', () => {
        const rule = new QuotationStyleMixRule();
        const text = '「こんにちは」と"Hello"。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableQuotationStyleMix: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].code).toBe('quotation-style-mix');
      });

      it('context.shared がない場合もフォールバックで動作する', () => {
        const rule = new QuotationStyleMixRule();
        const text = '「こんにちは」と"Hello"。';
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableQuotationStyleMix: true
          }
          // shared なし
        };

        const diagnostics = rule.check(emptyTokens, context);
        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].code).toBe('quotation-style-mix');
      });

      it('コードブロック内の検出を除外する（shared使用）', () => {
        const rule = new QuotationStyleMixRule();
        const text = '```\n"code"\n```\n「本文」のみ。';
        const shared = buildSharedContext(text);
        const context: RuleContext = {
          documentText: text,
          sentences: [],
          config: {
            ...DEFAULT_ADVANCED_RULES_CONFIG,
            enableQuotationStyleMix: true
          },
          shared
        };

        const diagnostics = rule.check(emptyTokens, context);
        // コードブロック内の引用符は除外されるので混在なし
        expect(diagnostics.length).toBe(0);
      });
    });
  });

  describe('要件3: 正確性の維持', () => {
    it('shared 有無で診断結果が一致する（TermNotationRule）', () => {
      const rule = new TermNotationRule();
      const text = 'javascriptとtypescriptを使用。';
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableTermNotation: true,
        enableWebTechDictionary: true
      };

      const contextWithShared: RuleContext = {
        documentText: text,
        sentences: [],
        config,
        shared: buildSharedContext(text)
      };

      const contextWithoutShared: RuleContext = {
        documentText: text,
        sentences: [],
        config
      };

      const withShared = rule.check(emptyTokens, contextWithShared);
      const withoutShared = rule.check(emptyTokens, contextWithoutShared);

      expect(withShared.length).toBe(withoutShared.length);
      for (let i = 0; i < withShared.length; i++) {
        expect(withShared[i].code).toBe(withoutShared[i].code);
        expect(withShared[i].message).toBe(withoutShared[i].message);
      }
    });

    it('shared 有無で診断結果が一致する（EnglishCaseMixRule）', () => {
      const rule = new EnglishCaseMixRule();
      const text = 'APIとapiとApiが混在。';
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableEnglishCaseMix: true
      };

      const contextWithShared: RuleContext = {
        documentText: text,
        sentences: [],
        config,
        shared: buildSharedContext(text)
      };

      const contextWithoutShared: RuleContext = {
        documentText: text,
        sentences: [],
        config
      };

      const withShared = rule.check(emptyTokens, contextWithShared);
      const withoutShared = rule.check(emptyTokens, contextWithoutShared);

      expect(withShared.length).toBe(withoutShared.length);
    });

    it('shared 有無で診断結果が一致する（QuotationStyleMixRule）', () => {
      const rule = new QuotationStyleMixRule();
      const text = '「日本語」と"English"の混在。';
      const config = {
        ...DEFAULT_ADVANCED_RULES_CONFIG,
        enableQuotationStyleMix: true
      };

      const contextWithShared: RuleContext = {
        documentText: text,
        sentences: [],
        config,
        shared: buildSharedContext(text)
      };

      const contextWithoutShared: RuleContext = {
        documentText: text,
        sentences: [],
        config
      };

      const withShared = rule.check(emptyTokens, contextWithShared);
      const withoutShared = rule.check(emptyTokens, contextWithoutShared);

      expect(withShared.length).toBe(withoutShared.length);
    });
  });
});

describe('AdvancedRulesManager 統合テスト', () => {
  describe('要件1: 共有前処理の生成', () => {
    it('AdvancedRulesManager が共有コンテキストを生成してルールに渡す', () => {
      // カスタムルールを作成して共有コンテキストの有無を確認
      let receivedShared: AdvancedRuleSharedContext | undefined;

      const manager = new AdvancedRulesManager({
        enableTermNotation: false,
        enableEnglishCaseMix: false,
        enableQuotationStyleMix: false
      });

      // 全ルールを無効化して独自ルールのみ登録
      manager['rules'] = [];

      // 共有コンテキストを検証するカスタムルール
      const testRule = {
        name: 'test-shared-context',
        description: 'Test rule to verify shared context',
        check: (_tokens: Token[], context: RuleContext) => {
          receivedShared = context.shared as any;
          return [];
        },
        isEnabled: () => true
      };

      manager.registerRule(testRule);

      const text = '```\ncode\n```\nテスト`inline`';
      manager.checkText(text, []);

      // 共有コンテキストが渡されていることを確認
      expect(receivedShared).toBeDefined();
      expect(receivedShared?.codeBlockRanges).toBeDefined();
      expect(receivedShared?.inlineCodeRanges).toBeDefined();
      expect(receivedShared?.codeRanges).toBeDefined();
      expect(receivedShared?.lineStarts).toBeDefined();
      expect(receivedShared?.lines).toBeDefined();

      // コードブロックが検出されている
      expect(receivedShared?.codeBlockRanges.length).toBeGreaterThan(0);
      // インラインコードが検出されている
      expect(receivedShared?.inlineCodeRanges.length).toBeGreaterThan(0);
    });
  });

  describe('要件4: キャッシュのスコープ', () => {
    it('共有コンテキストは解析サイクルごとに新規生成される', () => {
      const manager = new AdvancedRulesManager({
        enableTermNotation: false,
        enableEnglishCaseMix: false,
        enableQuotationStyleMix: false
      });

      manager['rules'] = [];

      let firstShared: any;
      let secondShared: any;

      const testRule = {
        name: 'test-shared-context-scope',
        description: 'Test rule to verify shared context scope',
        check: (_tokens: Token[], context: RuleContext) => {
          if (!firstShared) {
            firstShared = context.shared;
          } else {
            secondShared = context.shared;
          }
          return [];
        },
        isEnabled: () => true
      };

      manager.registerRule(testRule);

      // 1回目の解析
      manager.checkText('テスト1', []);

      // 2回目の解析（異なるテキスト）
      manager.checkText('テスト2\n次の行', []);

      // 2つの共有コンテキストが異なるオブジェクトであることを確認
      expect(firstShared).not.toBe(secondShared);
      // 内容も異なる
      expect(firstShared?.lineStarts.length).not.toBe(secondShared?.lineStarts.length);
    });
  });
});

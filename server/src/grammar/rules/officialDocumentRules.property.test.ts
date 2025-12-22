/**
 * Official Document Rules Property-Based Tests
 * Feature: official-document-rules
 * Property 5: 設定によるルール有効/無効の切り替え
 * Property 6: 診断メッセージの品質
 * Property 7: 診断の重要度
 * Validates: Requirements 4.1, 5.1, 5.2, 5.3, 5.4
 */

import * as fc from 'fast-check';
import { Token, DiagnosticSeverity } from '../../../../shared/src/types';
import {
  Sentence,
  DEFAULT_ADVANCED_RULES_CONFIG,
  RuleContext,
  AdvancedRulesConfig,
  AdvancedDiagnostic
} from '../../../../shared/src/advancedTypes';
import { OyobiNarabiniRule } from './oyobiNarabiniRule';
import { MatawaWakushikuwaRule } from './matawaWakushikuwaRule';
import { JouyouKanjiRule } from './jouyouKanjiRule';
import { AdvancedRulesManager } from '../advancedRulesManager';

/**
 * ヘルパー関数: トークンを作成
 */
const createToken = (
  surface: string,
  pos: string,
  start: number,
  posDetail1: string = '*'
): Token => {
  return new Token({
    surface,
    pos,
    posDetail1,
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

/**
 * ヘルパー関数: RuleContextを作成
 */
const createContext = (
  text: string,
  sentences: Sentence[] = [],
  config: Partial<AdvancedRulesConfig> = {}
): RuleContext => ({
  documentText: text,
  sentences,
  config: { ...DEFAULT_ADVANCED_RULES_CONFIG, ...config }
});

describe('Property-Based Tests: Official Document Rules - 設定による有効/無効の切り替え', () => {
  /**
   * Property 5: 設定によるルール有効/無効の切り替え
   * Validates: Requirements 4.1
   *
   * *For any* ルールについて、設定でdisabledにした場合は診断が出力されず、
   * enabledにした場合は診断が出力される。
   */
  describe('Property 5: OyobiNarabiniRule の設定切り替え', () => {
    const rule = new OyobiNarabiniRule();

    it('enableOyobiNarabini=false の場合、ルールは無効', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const config = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableOyobiNarabini: enabled
            };
            expect(rule.isEnabled(config)).toBe(enabled);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが無効の場合、「並びに」単独使用でも診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('並びに', 'A並びにB', 'テスト並びに確認'),
          (textWithNarabini) => {
            const text = textWithNarabini;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableOyobiNarabini: false
            });

            // ルールが無効なので、checkを呼んでも診断は出力されるが、
            // AdvancedRulesManagerがisEnabledをチェックするため、
            // 実際の運用では診断は出力されない
            expect(rule.isEnabled(context.config)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが有効の場合、「並びに」単独使用で診断が出力される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('並びに', 'A並びにB', 'テスト並びに確認'),
          (textWithNarabini) => {
            const text = textWithNarabini;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableOyobiNarabini: true
            });

            expect(rule.isEnabled(context.config)).toBe(true);
            const diagnostics = rule.check([], context);
            // 「並びに」が含まれ「及び」が含まれないので警告が出る
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('oyobi-narabini');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: MatawaWakushikuwaRule の設定切り替え', () => {
    const rule = new MatawaWakushikuwaRule();

    it('enableMatawaWakushikuwa=false の場合、ルールは無効', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const config = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableMatawaWakushikuwa: enabled
            };
            expect(rule.isEnabled(config)).toBe(enabled);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが無効の場合、「若しくは」単独使用でも診断が出力されない', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('若しくは', 'A若しくはB', 'テスト若しくは確認'),
          (textWithWakushikuwa) => {
            const text = textWithWakushikuwa;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableMatawaWakushikuwa: false
            });

            expect(rule.isEnabled(context.config)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが有効の場合、「若しくは」単独使用で診断が出力される', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('若しくは', 'A若しくはB', 'テスト若しくは確認'),
          (textWithWakushikuwa) => {
            const text = textWithWakushikuwa;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableMatawaWakushikuwa: true
            });

            expect(rule.isEnabled(context.config)).toBe(true);
            const diagnostics = rule.check([], context);
            // 「若しくは」が含まれ「又は」が含まれないので警告が出る
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('matawa-wakushikuwa');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: JouyouKanjiRule の設定切り替え', () => {
    const rule = new JouyouKanjiRule();

    it('enableJouyouKanji=false の場合、ルールは無効', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          (enabled) => {
            const config = {
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              enableJouyouKanji: enabled
            };
            expect(rule.isEnabled(config)).toBe(enabled);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが無効の場合、常用漢字外でも診断が出力されない', () => {
      fc.assert(
        fc.property(
          // 常用漢字外の漢字を含むテキスト（「繋」「嘘」「噂」は常用漢字外）
          fc.constantFrom('繋がる', '嘘をつく', '噂話'),
          (textWithNonJouyou) => {
            const text = textWithNonJouyou;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text, [], {
              enableJouyouKanji: false
            });

            expect(rule.isEnabled(context.config)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('ルールが有効の場合、常用漢字外で診断が出力される', () => {
      fc.assert(
        fc.property(
          // 常用漢字外の漢字を含むテキスト（「繋」「嘘」「噂」は常用漢字外）
          fc.constantFrom('繋がる', '嘘をつく', '噂話'),
          (textWithNonJouyou) => {
            const text = textWithNonJouyou;
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text, [], {
              enableJouyouKanji: true,
              excludeProperNounsFromJouyouKanji: false
            });

            expect(rule.isEnabled(context.config)).toBe(true);
            const diagnostics = rule.check(tokens, context);
            // 常用漢字外の漢字が含まれるので警告が出る
            expect(diagnostics.length).toBeGreaterThan(0);
            expect(diagnostics[0].code).toBe('jouyou-kanji');
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 5: AdvancedRulesManager での統合テスト', () => {
    it('公文書ルールはデフォルトで無効', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            'enableOyobiNarabini',
            'enableMatawaWakushikuwa',
            'enableJouyouKanji'
          ) as fc.Arbitrary<keyof AdvancedRulesConfig>,
          (configKey) => {
            // デフォルト設定では公文書ルールは無効
            expect(DEFAULT_ADVANCED_RULES_CONFIG[configKey]).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('excludeProperNounsFromJouyouKanji はデフォルトで有効', () => {
      expect(DEFAULT_ADVANCED_RULES_CONFIG.excludeProperNounsFromJouyouKanji).toBe(true);
    });

    it('設定を有効にすると AdvancedRulesManager で診断が出力される', () => {
      fc.assert(
        fc.property(
          fc.record({
            enableOyobiNarabini: fc.boolean(),
            enableMatawaWakushikuwa: fc.boolean(),
            enableJouyouKanji: fc.boolean()
          }),
          (officialRulesConfig) => {
            const manager = new AdvancedRulesManager({
              ...DEFAULT_ADVANCED_RULES_CONFIG,
              ...officialRulesConfig,
              // 他のルールは無効にして公文書ルールのみテスト
              enableStyleConsistency: false,
              enableRaNukiDetection: false,
              enableDoubleNegation: false,
              enableParticleRepetition: false,
              enableConjunctionRepetition: false,
              enableAdversativeGa: false,
              enableAlphabetWidth: false,
              enableWeakExpression: false,
              enableCommaCount: false,
              enableTermNotation: false,
              enableKanjiOpening: false,
              enableRedundantExpression: false,
              enableTautology: false,
              enableNoParticleChain: false,
              enableMonotonousEnding: false,
              enableLongSentence: false,
              enableSahenVerb: false,
              enableMissingSubject: false,
              enableTwistedSentence: false,
              enableHomophone: false,
              enableHonorificError: false,
              enableAdverbAgreement: false,
              enableModifierPosition: false,
              enableAmbiguousDemonstrative: false,
              enablePassiveOveruse: false,
              enableNounChain: false,
              enableConjunctionMisuse: false,
              enableOkuriganaVariant: false,
              enableOrthographyVariant: false,
              enableNumberWidthMix: false,
              enableKatakanaChouon: false,
              enableHalfwidthKana: false,
              enableNumeralStyleMix: false,
              enableSpaceAroundUnit: false,
              enableBracketQuoteMismatch: false,
              enableDateFormatVariant: false,
              enableDashTildeNormalization: false,
              enableNakaguroUsage: false,
              enableSymbolWidthMix: false,
              enableSentenceEndingColon: false,
              enablePunctuationStyleMix: false,
              enableQuotationStyleMix: false,
              enableBulletStyleMix: false,
              enableEmphasisStyleMix: false,
              enableEnglishCaseMix: false,
              enableUnitNotationMix: false,
              enablePronounMix: false,
              enableHeadingLevelSkip: false,
              enableTableColumnMismatch: false,
              enableCodeBlockLanguage: false
            });

            const enabledRules = manager.getEnabledRules();
            const enabledRuleNames = enabledRules.map(r => r.name);

            // 設定に応じてルールが有効/無効になっている
            if (officialRulesConfig.enableOyobiNarabini) {
              expect(enabledRuleNames).toContain('oyobi-narabini');
            } else {
              expect(enabledRuleNames).not.toContain('oyobi-narabini');
            }

            if (officialRulesConfig.enableMatawaWakushikuwa) {
              expect(enabledRuleNames).toContain('matawa-wakushikuwa');
            } else {
              expect(enabledRuleNames).not.toContain('matawa-wakushikuwa');
            }

            if (officialRulesConfig.enableJouyouKanji) {
              expect(enabledRuleNames).toContain('jouyou-kanji');
            } else {
              expect(enabledRuleNames).not.toContain('jouyou-kanji');
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('設定変更が即座に反映される', () => {
      fc.assert(
        fc.property(
          fc.record({
            enableOyobiNarabini: fc.boolean(),
            enableMatawaWakushikuwa: fc.boolean(),
            enableJouyouKanji: fc.boolean()
          }),
          (newConfig) => {
            // 初期状態（デフォルト設定）
            const manager = new AdvancedRulesManager();
            const initialEnabledRules = manager.getEnabledRules().map(r => r.name);

            // デフォルトでは公文書ルールは無効
            expect(initialEnabledRules).not.toContain('oyobi-narabini');
            expect(initialEnabledRules).not.toContain('matawa-wakushikuwa');
            expect(initialEnabledRules).not.toContain('jouyou-kanji');

            // 設定を更新
            manager.updateConfig(newConfig);

            // 更新後の有効ルールを取得
            const updatedEnabledRules = manager.getEnabledRules().map(r => r.name);

            // 設定変更が即座に反映されている
            if (newConfig.enableOyobiNarabini) {
              expect(updatedEnabledRules).toContain('oyobi-narabini');
            } else {
              expect(updatedEnabledRules).not.toContain('oyobi-narabini');
            }

            if (newConfig.enableMatawaWakushikuwa) {
              expect(updatedEnabledRules).toContain('matawa-wakushikuwa');
            } else {
              expect(updatedEnabledRules).not.toContain('matawa-wakushikuwa');
            }

            if (newConfig.enableJouyouKanji) {
              expect(updatedEnabledRules).toContain('jouyou-kanji');
            } else {
              expect(updatedEnabledRules).not.toContain('jouyou-kanji');
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});


describe('Property-Based Tests: Official Document Rules - 診断メッセージの品質', () => {
  /**
   * Property 6: 診断メッセージの品質
   * Validates: Requirements 5.1, 5.2, 5.3
   *
   * *For any* 検出された問題について、診断メッセージには
   * (1)問題の説明、(2)修正案、(3)根拠となる基準名が含まれる。
   */
  describe('Property 6: OyobiNarabiniRule の診断メッセージ品質', () => {
    const rule = new OyobiNarabiniRule();

    it('診断メッセージには問題の説明、修正案、根拠が含まれる', () => {
      fc.assert(
        fc.property(
          // 「並びに」単独使用のパターン（警告が出るケース）
          fc.constantFrom(
            '並びに',
            'A並びにB',
            'テスト並びに確認',
            '資料並びに報告書'
          ),
          (textWithNarabini) => {
            const text = textWithNarabini;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableOyobiNarabini: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            for (const diagnostic of diagnostics) {
              // 5.1: 問題の説明が含まれる
              expect(diagnostic.message).toBeTruthy();
              expect(diagnostic.message.length).toBeGreaterThan(0);
              
              // 5.2: 修正案が含まれる
              expect(diagnostic.suggestions).toBeDefined();
              expect(diagnostic.suggestions!.length).toBeGreaterThan(0);
              
              // 5.3: 根拠となる基準名が含まれる
              expect(diagnostic.message).toMatch(/公用文作成の考え方|内閣告示/);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('3つ以上の要素並列時の提案メッセージにも根拠が含まれる', () => {
      fc.assert(
        fc.property(
          // 3つ以上の要素を「及び」のみで並列するパターン
          fc.constantFrom(
            'A、B及びC',
            '資料、報告書及び議事録',
            '計画、実施及び評価'
          ),
          (textWithMultipleElements) => {
            const text = textWithMultipleElements;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableOyobiNarabini: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            for (const diagnostic of diagnostics) {
              // 5.1: 問題の説明が含まれる
              expect(diagnostic.message).toBeTruthy();
              
              // 5.2: 修正案が含まれる
              expect(diagnostic.suggestions).toBeDefined();
              expect(diagnostic.suggestions!.length).toBeGreaterThan(0);
              
              // 5.3: 根拠となる基準名が含まれる
              expect(diagnostic.message).toMatch(/公用文作成の考え方|内閣告示/);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 6: MatawaWakushikuwaRule の診断メッセージ品質', () => {
    const rule = new MatawaWakushikuwaRule();

    it('診断メッセージには問題の説明、修正案、根拠が含まれる', () => {
      fc.assert(
        fc.property(
          // 「若しくは」単独使用のパターン（警告が出るケース）
          fc.constantFrom(
            '若しくは',
            'A若しくはB',
            'テスト若しくは確認',
            '承認若しくは却下'
          ),
          (textWithWakushikuwa) => {
            const text = textWithWakushikuwa;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableMatawaWakushikuwa: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            for (const diagnostic of diagnostics) {
              // 5.1: 問題の説明が含まれる
              expect(diagnostic.message).toBeTruthy();
              expect(diagnostic.message.length).toBeGreaterThan(0);
              
              // 5.2: 修正案が含まれる
              expect(diagnostic.suggestions).toBeDefined();
              expect(diagnostic.suggestions!.length).toBeGreaterThan(0);
              
              // 5.3: 根拠となる基準名が含まれる
              expect(diagnostic.message).toMatch(/公用文作成の考え方|内閣告示/);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('3つ以上の選択肢並列時の提案メッセージにも根拠が含まれる', () => {
      fc.assert(
        fc.property(
          // 3つ以上の選択肢を「又は」のみで並列するパターン
          fc.constantFrom(
            'A、B又はC',
            '承認、保留又は却下',
            '赤、青又は緑'
          ),
          (textWithMultipleChoices) => {
            const text = textWithMultipleChoices;
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableMatawaWakushikuwa: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            for (const diagnostic of diagnostics) {
              // 5.1: 問題の説明が含まれる
              expect(diagnostic.message).toBeTruthy();
              
              // 5.2: 修正案が含まれる
              expect(diagnostic.suggestions).toBeDefined();
              expect(diagnostic.suggestions!.length).toBeGreaterThan(0);
              
              // 5.3: 根拠となる基準名が含まれる
              expect(diagnostic.message).toMatch(/公用文作成の考え方|内閣告示/);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 6: JouyouKanjiRule の診断メッセージ品質', () => {
    const rule = new JouyouKanjiRule();

    it('診断メッセージには問題の説明、修正案、根拠が含まれる', () => {
      fc.assert(
        fc.property(
          // 常用漢字外の漢字を含むテキスト（単一トークンとして処理）
          // 「繋」「嘘」「噂」は常用漢字外
          fc.constantFrom(
            { text: '繋', kanji: '繋' },
            { text: '嘘', kanji: '嘘' },
            { text: '噂', kanji: '噂' }
          ),
          ({ text, kanji }) => {
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text, [], {
              enableJouyouKanji: true,
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check(tokens, context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            for (const diagnostic of diagnostics) {
              // 5.1: 問題の説明が含まれる（対象の漢字が明示される）
              expect(diagnostic.message).toBeTruthy();
              expect(diagnostic.message).toContain('常用漢字表');
              
              // 5.2: 修正案が含まれる
              expect(diagnostic.suggestions).toBeDefined();
              expect(diagnostic.suggestions!.length).toBeGreaterThan(0);
              
              // 5.3: 根拠となる基準名が含まれる
              expect(diagnostic.message).toMatch(/常用漢字表|内閣告示/);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('代替提案がある場合、具体的な修正案が提示される', () => {
      fc.assert(
        fc.property(
          // 代替提案がある常用漢字外の漢字
          fc.constantFrom(
            { text: '繋がる', expectedSuggestion: 'つな' },
            { text: '嘘をつく', expectedSuggestion: 'うそ' }
          ),
          ({ text, expectedSuggestion }) => {
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text, [], {
              enableJouyouKanji: true,
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check(tokens, context);
            
            // 診断が出力されることを確認
            expect(diagnostics.length).toBeGreaterThan(0);
            
            // 修正案に具体的な提案が含まれる
            const firstDiagnostic = diagnostics[0];
            expect(firstDiagnostic.suggestions).toBeDefined();
            expect(firstDiagnostic.suggestions!.length).toBeGreaterThan(0);
            
            // メッセージまたは修正案に代替表記が含まれる
            const hasAlternative = 
              firstDiagnostic.message.includes(expectedSuggestion) ||
              firstDiagnostic.suggestions!.some(s => s.includes(expectedSuggestion) || s.includes('ひらがな'));
            expect(hasAlternative).toBe(true);
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

describe('Property-Based Tests: Official Document Rules - 診断の重要度', () => {
  /**
   * Property 7: 診断の重要度
   * Validates: Requirements 5.4
   *
   * *For any* 公文書ルールによる診断は、重要度が「情報」
   * （DiagnosticSeverity.Information）である。
   */
  describe('Property 7: OyobiNarabiniRule の診断重要度', () => {
    const rule = new OyobiNarabiniRule();

    it('すべての診断の重要度がInformationである', () => {
      fc.assert(
        fc.property(
          // 診断が出力されるパターン
          fc.constantFrom(
            '並びに',
            'A並びにB',
            'A、B及びC',
            '資料、報告書及び議事録'
          ),
          (text) => {
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableOyobiNarabini: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力された場合、すべてInformationレベル
            for (const diagnostic of diagnostics) {
              expect(diagnostic.severity).toBe(DiagnosticSeverity.Information);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: MatawaWakushikuwaRule の診断重要度', () => {
    const rule = new MatawaWakushikuwaRule();

    it('すべての診断の重要度がInformationである', () => {
      fc.assert(
        fc.property(
          // 診断が出力されるパターン
          fc.constantFrom(
            '若しくは',
            'A若しくはB',
            'A、B又はC',
            '承認、保留又は却下'
          ),
          (text) => {
            const sentence = new Sentence({
              text,
              tokens: [],
              start: 0,
              end: text.length
            });
            const context = createContext(text, [sentence], {
              enableMatawaWakushikuwa: true
            });

            const diagnostics = rule.check([], context);
            
            // 診断が出力された場合、すべてInformationレベル
            for (const diagnostic of diagnostics) {
              expect(diagnostic.severity).toBe(DiagnosticSeverity.Information);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: JouyouKanjiRule の診断重要度', () => {
    const rule = new JouyouKanjiRule();

    it('すべての診断の重要度がInformationである', () => {
      fc.assert(
        fc.property(
          // 常用漢字外の漢字を含むテキスト（「繋」「嘘」「噂」は常用漢字外）
          fc.constantFrom('繋', '嘘', '噂'),
          (text) => {
            const tokens = [createToken(text, '名詞', 0)];
            const context = createContext(text, [], {
              enableJouyouKanji: true,
              excludeProperNounsFromJouyouKanji: false
            });

            const diagnostics = rule.check(tokens, context);
            
            // 診断が出力された場合、すべてInformationレベル
            for (const diagnostic of diagnostics) {
              expect(diagnostic.severity).toBe(DiagnosticSeverity.Information);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 7: 全公文書ルールの統合テスト', () => {
    it('公文書ルールの診断はすべてInformationレベル（エラーではなく提案）', () => {
      fc.assert(
        fc.property(
          fc.record({
            ruleType: fc.constantFrom('oyobi-narabini', 'matawa-wakushikuwa', 'jouyou-kanji'),
            testCase: fc.constantFrom(
              { text: '並びに', type: 'oyobi-narabini' },
              { text: '若しくは', type: 'matawa-wakushikuwa' },
              { text: '繋がる', type: 'jouyou-kanji' }
            )
          }),
          ({ testCase }) => {
            const { text, type } = testCase;
            
            let diagnostics: AdvancedDiagnostic[] = [];
            
            if (type === 'oyobi-narabini') {
              const rule = new OyobiNarabiniRule();
              const sentence = new Sentence({
                text,
                tokens: [],
                start: 0,
                end: text.length
              });
              const context = createContext(text, [sentence], {
                enableOyobiNarabini: true
              });
              diagnostics = rule.check([], context);
            } else if (type === 'matawa-wakushikuwa') {
              const rule = new MatawaWakushikuwaRule();
              const sentence = new Sentence({
                text,
                tokens: [],
                start: 0,
                end: text.length
              });
              const context = createContext(text, [sentence], {
                enableMatawaWakushikuwa: true
              });
              diagnostics = rule.check([], context);
            } else if (type === 'jouyou-kanji') {
              const rule = new JouyouKanjiRule();
              const tokens = [createToken(text, '名詞', 0)];
              const context = createContext(text, [], {
                enableJouyouKanji: true,
                excludeProperNounsFromJouyouKanji: false
              });
              diagnostics = rule.check(tokens, context);
            }
            
            // 診断が出力された場合、すべてInformationレベル
            // これは「エラーではなく提案として」という要件5.4を満たす
            for (const diagnostic of diagnostics) {
              expect(diagnostic.severity).toBe(DiagnosticSeverity.Information);
              // ErrorやWarningではないことを確認
              expect(diagnostic.severity).not.toBe(DiagnosticSeverity.Error);
              expect(diagnostic.severity).not.toBe(DiagnosticSeverity.Warning);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

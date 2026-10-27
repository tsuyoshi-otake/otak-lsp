import { TextDocument } from 'vscode-languageserver-textdocument';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { createDocumentAnalyzer } from './documentAnalyzer';
import { resolveConfiguration } from './configManager';
import { buildCodeActions } from './codeActionProvider';
import { NumeralStyleMixRule } from '../grammar/rules/numeralStyleMixRule';
import * as fc from 'fast-check';

describe('Issue #11: 数字表記の診断と修正案', () => {
  const settings = resolveConfiguration({});
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(), new TokenFilter(),
    new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager(),
  );
  async function actions(text: string, expectedCount = 1) {
    const document = TextDocument.create('file:///issue11.md', 'markdown', 1, text);
    const result = await analyzer.analyze(
      document, settings.config, settings.advancedConfig, false, undefined, undefined, settings.proofreadingConfig,
    );
    expect(result.status).toBe('completed');
    const diagnostics = result.diagnostics.filter(d => d.code === 'numeral-style-mix');
    expect(diagnostics).toHaveLength(expectedCount);
    return buildCodeActions(document, diagnostics).map(action => action.title);
  }

  it('仕様例「三人で5本」を検出し、三を3に統一する案を示す', async () => {
    expect(await actions('三人で5本の飲料を買った。')).toContain('修正案: アラビア数字「3」に変更して統一する');
  });

  it.each([
    '一方、2人が出発した。', '同一の3件を確認する。', '一人で5本を買う。', '一度に5件を処理する。',
    '二重助詞を2件検出する。', '二点リーダを2個使う。', '松濤一丁目に2人住む。',
  ])(
    '数量でない語や慣用表記を除外する: %s', async text => {
      expect(await actions(text, 0)).toEqual([]);
    });

  it('数詞を変えた場合も実文書の修正案が元の値と一致する', async () => {
    const digits = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    await fc.assert(fc.asyncProperty(fc.integer({ min: 2, max: 9 }), async value => {
      const found = await actions(`${digits[value - 1]}人で5本を買った。`);
      expect(found).toContain(`修正案: アラビア数字「${value}」に変更して統一する`);
    }), { numRuns: 30, seed: 20261027 });
  });

  it('一文字の数詞を除外する故障を実文書の契約テストが検出する', async () => {
    await actions('三人で5本の飲料を買った。');
    const original = NumeralStyleMixRule.prototype.findNumerals;
    const fault = jest.spyOn(NumeralStyleMixRule.prototype, 'findNumerals').mockImplementation(function (this: NumeralStyleMixRule, text, tokens) {
      const found = original.call(this, text, tokens);
      return { ...found, kanji: found.kanji.filter(value => value.value.length > 1) };
    });
    try {
      await expect(actions('三人で5本の飲料を買った。')).rejects.toThrow('Expected length: 1');
    } finally {
      fault.mockRestore();
    }
  });

  it('二十の修正案が数値20を保持して利用者に届く', async () => {
    expect(await actions('二十人と123件。')).toContain('修正案: アラビア数字「20」に変更して統一する');
  });

  it('桁数字を通常の漢数字で利用者に提示する', async () => {
    expect(await actions('二〇二四年と二〇二五年に2024件。')).toContain('修正案: 漢数字「二〇二四」に変更して統一する');
  });

  it('不正な位取りに対して変換案を提示しない', async () => {
    const found = await actions('十百人と123件。');
    expect(found.some(title => title.startsWith('修正案:'))).toBe(false);
  });
});

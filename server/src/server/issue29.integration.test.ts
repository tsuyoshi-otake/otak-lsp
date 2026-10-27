/** Issue #29: 実際のMarkdown解析から診断までの契約。 */
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/node';
import { MeCabAnalyzer } from '../mecab/analyzer';
import { CommentExtractor } from '../parser/commentExtractor';
import { MarkdownFilter } from '../parser/markdownFilter';
import { TokenFilter } from '../semantic/tokenFilter';
import { GrammarChecker } from '../grammar/checker';
import { AdvancedRulesManager } from '../grammar/advancedRulesManager';
import { ProofreadingRulesManager } from '../proofreading/proofreadingRulesManager';
import { createDocumentAnalyzer } from './documentAnalyzer';
import { resolveConfiguration } from './configManager';
import * as fc from 'fast-check';
import { LongSentenceRule } from '../grammar/rules/longSentenceRule';
import { SpaceAroundUnitRule } from '../grammar/rules/spaceAroundUnitRule';
import { SentenceParser } from '../grammar/sentenceParser';
import { EvalsRunner } from '../grammar/evals/evals-runner';
import { SentenceComplexityRule } from '../grammar/rules/sentenceComplexityRule';
import * as htmlTags from '../parser/markdownFilter/htmlTagRanges';
import { EnglishCaseMixRule } from '../grammar/rules/englishCaseMixRule';

describe('Issue #29: Markdown文書の診断', () => {
  const settings = resolveConfiguration({});
  const analyzer = createDocumentAnalyzer(
    new MeCabAnalyzer(), new CommentExtractor(), new MarkdownFilter(),
    new TokenFilter(), new GrammarChecker(), new AdvancedRulesManager(), new ProofreadingRulesManager()
  );

  async function diagnostics(text: string, code: string, threshold = 120, analyzeTables = false, language = 'markdown') {
    const result = await analyzer.analyze(
      TextDocument.create('file:///issue29.md', language, 1, text),
      { ...settings.config, markdown: { ...settings.config.markdown, analyzeTables } },
      { ...settings.advancedConfig, longSentenceThreshold: threshold },
      false, undefined, undefined, settings.proofreadingConfig
    );
    expect(result.status).toBe('completed');
    return result.diagnostics.filter(d => d.code === code);
  }

  it('evalsと実文書の文複雑度は既定閾値の前後で一致する', async () => {
    const runner = new EvalsRunner();
    const legal = '本契約に基づき甲が乙に対して負担する債務の履行に関連して生じた損害については、甲は乙に対して、その損害の発生原因の如何を問わず、一切の責任を負わないものとする。';
    const above = '私の友人の妹の会社の社長の息子の学校の先生の家の庭の木の葉が落ち、東京大阪京都名古屋福岡横浜広島仙台神戸奈良金沢長野の工事報告書を確認し、同時に、申請し、登録し、検査し、整理し、保管し、共有し、再度確認した。';
    for (const [text, expected] of [[legal, true], [above, true]] as const) {
      const evaluated = await runner.evaluateExample(text, 'sentence-complexity', true);
      const observed = await diagnostics(text, 'sentence-complexity', 120, false, 'plaintext');
      expect(evaluated.actualDetected).toBe(expected);
      expect(observed.length > 0).toBe(expected);
    }
  });

  it.each([
    ['私の友人の妹の会社の社長の息子の学校の先生の家の庭の木の葉が落ちた。', true],
    ['東京都港区六本木一丁目交差点付近高層ビル群地下駐車場入口案内標識設置工事完了報告書', true],
    ['昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。', true],
    ['田中さんの会社の東京支店の担当者に連絡しました。', false],
    ['2026年10月27日火曜日午前10時30分に会議を開始します。', false],
    ['東京都教育委員会事務局総務部教育政策課企画担当にお問い合わせください。', false],
    ['会議の終了後、担当者は議事録の内容を確認し、参加者から寄せられた修正を反映して、必要に応じて資料を整理し、次の会議までに共有フォルダーへ保存してください。', false],
    ['申請者は、提出した書類に変更が生じた場合、速やかに担当窓口へ届け出なければなりません。', false],
    ['私が作る資料を読む友人が話す内容を聞く。', false],
  ])('極端な単一指標と通常文を既定閾値で区別する: %s', async (text, expected) => {
    const evaluated = await new EvalsRunner().evaluateExample(text, 'sentence-complexity', true);
    const observed = await diagnostics(text, 'sentence-complexity', 120, false, 'plaintext');
    expect(evaluated.actualDetected).toBe(expected);
    expect(observed.length > 0).toBe(expected);
  });

  it('単一指標の極端値を打ち切る旧方式の再導入を実文書テストが検出する', async () => {
    const positives = [
      '私の友人の妹の会社の社長の息子の学校の先生の家の庭の木の葉が落ちた。',
      '東京都港区六本木一丁目交差点付近高層ビル群地下駐車場入口案内標識設置工事完了報告書',
      '昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。',
    ];
    const original = SentenceComplexityRule.prototype.calculateMetrics;
    const fault = jest.spyOn(SentenceComplexityRule.prototype, 'calculateMetrics').mockImplementation(
      function (this: SentenceComplexityRule, sentence, config, characterCount) {
        const m = original.call(this, sentence, config, characterCount);
        m.score = Math.round(Math.min(m.characterCount / 200, 1) * 30 + Math.min(m.commaCount / 8, 1) * 20 +
          Math.min(m.clauseDepth / 5, 1) * 20 + Math.min(m.maxNoChainLength / 5, 1) * 15 +
          Math.min(m.maxNounChainLength / 8, 1) * 15);
        return m;
      }
    );
    try {
      for (const text of positives) {
        await expect(async () => expect(await diagnostics(text, 'sentence-complexity', 120, false, 'plaintext'))
          .toHaveLength(1)).rejects.toThrow('Expected length: 1');
      }
    } finally {
      fault.mockRestore();
    }
  });

  it('節の深さを過小評価する故障と組合せ効果の除去を、法律文の検出が捉える', async () => {
    const text = '本契約に基づき甲が乙に対して負担する債務の履行に関連して生じた損害については、甲は乙に対して、その損害の発生原因の如何を問わず、一切の責任を負わないものとする。';
    const requireDetection = async () => expect(await diagnostics(text, 'sentence-complexity', 120, false, 'plaintext')).toHaveLength(1);
    await requireDetection();
    const originalDepth = SentenceComplexityRule.prototype.estimateClauseDepth;
    const depthFault = jest.spyOn(SentenceComplexityRule.prototype, 'estimateClauseDepth').mockImplementation(
      function (this: SentenceComplexityRule, tokens) { return Math.min(originalDepth.call(this, tokens), 1); }
    );
    try {
      await expect(requireDetection).rejects.toThrow('Expected length: 1');
    } finally {
      depthFault.mockRestore();
    }
    const originalMetrics = SentenceComplexityRule.prototype.calculateMetrics;
    const combinationFault = jest.spyOn(SentenceComplexityRule.prototype, 'calculateMetrics').mockImplementation(
      function (this: SentenceComplexityRule, sentence, config, characterCount) {
        const m = originalMetrics.call(this, sentence, config, characterCount);
        const weighted = Math.min(m.characterCount / 200, 1) * 30 + Math.min(m.commaCount / 8, 1) * 20 +
          Math.min(m.clauseDepth / 5, 1) * 20 + Math.min(m.maxNoChainLength / 5, 1) * 15 +
          Math.min(m.maxNounChainLength / 8, 1) * 15;
        m.score = Math.round(Math.min(100, Math.max(weighted, m.maxNoChainLength * 6,
          m.maxNounChainLength * 3, m.clauseDepth * 12)));
        return m;
      }
    );
    try {
      await expect(requireDetection).rejects.toThrow('Expected length: 1');
    } finally {
      combinationFault.mockRestore();
    }
  });

  it('文複雑度の低い閾値でも並列動作と入れ子のある文を区別する', async () => {
    const parallel = '私は朝食を食べて、学校に行って、本を読んで、友人と話して、家に帰って、夕食を作りました。';
    const nested = '昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。';
    for (const [text, expectedCount] of [[parallel, 0], [nested, 1]] as const) {
      const document = TextDocument.create('file:///complexity.txt', 'plaintext', 1, text);
      const result = await analyzer.analyze(document, settings.config,
        { ...settings.advancedConfig, sentenceComplexityThreshold: 35 },
        false, undefined, undefined, settings.proofreadingConfig);
      expect(result.status).toBe('completed');
      const found = result.diagnostics.filter(d => d.code === 'sentence-complexity');
      expect(found).toHaveLength(expectedCount);
      if (expectedCount === 1) {
        expect(found[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: text.length } });
      }
    }
  });

  it('読点のない並列動作を入れ子として警告せず、本当の入れ子を検出する', async () => {
    const parallel = '私は朝食を食べて学校に行って本を読んで友人と話して家に帰って夕食を作りました。';
    const nested = '昨日私が買った本を読んでいた彼女が言っていたことを聞いた友人が教えてくれた情報によると、来週開催される予定のイベントは中止になるらしい。';
    for (const [text, expected] of [[parallel, 0], [nested, 1]] as const) {
      const document = TextDocument.create('file:///complexity-connective.txt', 'plaintext', 1, text);
      const result = await analyzer.analyze(document, settings.config,
        { ...settings.advancedConfig, sentenceComplexityThreshold: 25 },
        false, undefined, undefined, settings.proofreadingConfig);
      expect(result.status).toBe('completed');
      expect(result.diagnostics.filter(d => d.code === 'sentence-complexity')).toHaveLength(expected);
    }
    const fault = jest.spyOn(SentenceComplexityRule.prototype, 'estimateClauseDepth').mockReturnValue(6);
    try {
      const document = TextDocument.create('file:///complexity-connective-fault.txt', 'plaintext', 1, parallel);
      const result = await analyzer.analyze(document, settings.config,
        { ...settings.advancedConfig, sentenceComplexityThreshold: 25 },
        false, undefined, undefined, settings.proofreadingConfig);
      await expect(async () => expect(result.diagnostics.filter(d => d.code === 'sentence-complexity')).toHaveLength(0))
        .rejects.toThrow('Expected length: 0');
    } finally {
      fault.mockRestore();
    }
  });

  it('非表示のMarkdownリンク先の長さで文複雑度を増やさない', async () => {
    const link = `[案内](https://example.com/${'a'.repeat(300)})資料を確認してください。`;
    const plain = '案内資料を確認してください。';
    async function complexity(text: string, language: string, threshold: number) {
      const document = TextDocument.create(`file:///complexity.${language}`, language, 1, text);
      const result = await analyzer.analyze(document, settings.config,
        { ...settings.advancedConfig, sentenceComplexityThreshold: threshold },
        false, undefined, undefined, settings.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics.filter(d => d.code === 'sentence-complexity');
    }
    expect(await complexity(link, 'markdown', 20)).toHaveLength(0);
    const linked = await complexity(link, 'markdown', 0);
    const visible = await complexity(plain, 'plaintext', 0);
    expect(linked).toHaveLength(1);
    expect(visible).toHaveLength(1);
    expect(linked[0].message).toBe(visible[0].message);
    expect(linked[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: link.length } });
    expect(await complexity(`[案内](https://example.com/${'a'.repeat(300)})`, 'markdown', 0)).toHaveLength(0);
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 400 }), async size => {
      const sample = `[案内](https://example.com/${'a'.repeat(size)})資料を確認してください。`;
      const observed = await complexity(sample, 'markdown', 0);
      expect(observed).toHaveLength(1);
      expect(observed[0].message).toBe(visible[0].message);
    }), { numRuns: 30, seed: 20261027 });
    const original = SentenceComplexityRule.prototype.calculateMetrics;
    const fault = jest.spyOn(SentenceComplexityRule.prototype, 'calculateMetrics').mockImplementation(
      function (this: SentenceComplexityRule, sentence, config) { return original.call(this, sentence, config); }
    );
    try {
      await expect(async () => expect(await complexity(link, 'markdown', 20)).toHaveLength(0)).rejects.toThrow('Expected length: 0');
    } finally {
      fault.mockRestore();
    }
  });

  it('HTMLリンクのタグや属性が表示文の長さと文複雑度に混入しない', async () => {
    const plain = '案内資料を確認してください。';
    const html = `<a href="https://example.com/${'a'.repeat(300)}">案内資料</a>を確認してください。`;
    const run = async (text: string, language: string, threshold: number) => {
      const result = await analyzer.analyze(TextDocument.create('file:///html-complexity.md', language, 1, text), settings.config,
        { ...settings.advancedConfig, sentenceComplexityThreshold: threshold, longSentenceThreshold: 20 },
        false, undefined, undefined, settings.proofreadingConfig);
      expect(result.status).toBe('completed');
      return result.diagnostics;
    };
    const plainDiagnostics = await run(plain, 'plaintext', 0);
    const htmlDiagnostics = await run(html, 'markdown', 0);
    const plainComplexity = plainDiagnostics.filter(d => d.code === 'sentence-complexity');
    const htmlComplexity = htmlDiagnostics.filter(d => d.code === 'sentence-complexity');
    expect(plainComplexity).toHaveLength(1);
    expect(htmlComplexity).toHaveLength(1);
    expect(htmlComplexity[0].message).toBe(plainComplexity[0].message);
    expect(htmlComplexity[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: html.length } });
    expect((await run(html, 'markdown', 20)).filter(d => d.code === 'sentence-complexity')).toHaveLength(0);
    expect(htmlDiagnostics.filter(d => d.code === 'long-sentence')).toHaveLength(0);
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 350 }), async size => {
      const sample = `<a href="https://example.com/${'a'.repeat(size)}">案内資料</a>を確認してください。`;
      const observed = (await run(sample, 'markdown', 0)).filter(d => d.code === 'sentence-complexity');
      expect(observed).toHaveLength(1);
      expect(observed[0].message).toBe(plainComplexity[0].message);
    }), { numRuns: 20, seed: 20261027 });
    const fault = jest.spyOn(htmlTags, 'findHtmlTagRanges').mockReturnValue([]);
    try {
      await expect(async () => expect((await run(html, 'markdown', 20))
        .filter(d => d.code === 'sentence-complexity')).toHaveLength(0)).rejects.toThrow('Expected length: 0');
    } finally {
      fault.mockRestore();
    }
  });

  it('HTML属性内の句読点は文を分割せず、表示文の長文は検出する', async () => {
    const visible = '案内資料を確認して、担当者に結果を連絡してください。';
    const html = `<a title="これは属性です。次も属性、です！">${visible}</a>`;
    const plain = await diagnostics(visible, 'long-sentence', 20, false, 'plaintext');
    const linked = await diagnostics(html, 'long-sentence', 20);
    expect(plain).toHaveLength(1);
    expect(linked).toHaveLength(1);
    expect(linked[0].message).toBe(plain[0].message);
    expect(linked[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: html.indexOf('</a>') } });
  });

  it('HTML属性のイコールを本文の記号幅の比較に含めず、本文の混在は検出する', async () => {
    expect(await diagnostics('値Ａ＝Ｂです。<a href="/guide">案内</a>', 'symbol-width-mix')).toHaveLength(0);
    expect(await diagnostics('値Ａ＝ＢとA=Bを比較します。', 'symbol-width-mix')).not.toHaveLength(0);
  });

  it('版番号は単位として指摘せず、数値と単位の間隔は指摘する', async () => {
    expect(await diagnostics('v1.2.0、v1.2.6、v1.1.1。', 'space-around-unit')).toHaveLength(0);
    expect(await diagnostics('容量は10GBです。', 'space-around-unit')).toHaveLength(1);
  });

  it('画像マーカーを感嘆符とせず、本文中の感嘆符は検出する', async () => {
    expect(await diagnostics('![画像](https://example.com/image.png)', 'space-after-question-exclamation')).toHaveLength(0);
    expect(await diagnostics('[![画像](https://example.com/icon)](https://example.com/)', 'space-after-question-exclamation')).toHaveLength(0);
    expect(await diagnostics('驚いた！次の文です。', 'space-after-question-exclamation')).toHaveLength(1);
    expect(await diagnostics('驚いた!次の文です。', 'space-after-question-exclamation')).toHaveLength(1);
  });

  it('HTMLコメントの開始記号を感嘆符とせず、本文の感嘆符は検出する', async () => {
    const found = await diagnostics('<!-- 説明 -->\n驚いた！次の文です。', 'space-after-question-exclamation');
    expect(found).toHaveLength(1);
    expect(found[0].range.start).toEqual({ line: 1, character: 3 });
    const escaped = await diagnostics('\\<!-- 説明 -->', 'space-after-question-exclamation');
    expect(escaped).toHaveLength(1);
    const plain = await diagnostics('<!-- 説明 -->', 'space-after-question-exclamation', 120, false, 'plaintext');
    expect(plain).toHaveLength(1);
  });

  it('複合語「約物」の一部を漢字開きの対象にせず、独立した形式名詞は検出する', async () => {
    expect(await diagnostics('約物を制御します。', 'kanji-opening')).toHaveLength(0);
    expect(await diagnostics('その時に確認する。', 'kanji-opening')).toHaveLength(1);
  });

  it('接尾語の「アイドル時」を「とき」に変更せず、形式名詞の「その時」は検出する', async () => {
    expect(await diagnostics('アイドル時に実行する。', 'orthography-variant')).toHaveLength(0);
    expect(await diagnostics('その時に確認する。', 'orthography-variant')).toHaveLength(1);
  });

  it('正しい「答えた」を同じ表記へ変更するよう提案せず、異なる送り仮名は検出する', async () => {
    expect(await diagnostics('質問に答えた。', 'okurigana-variant')).toHaveLength(0);
    const found = await diagnostics('作業を行なう。', 'okurigana-variant');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('行う');
  });

  it('「一致し」を補助動詞「致し」と誤認せず、実際の「致し」は検出する', async () => {
    expect(await diagnostics('データと一致しています。', 'okurigana-variant')).toHaveLength(0);
    const found = await diagnostics('お知らせ致します。', 'okurigana-variant');
    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('いたし');
  });

  it('未完成の相対リンクが次行の本文と診断を隠さない', async () => {
    const text = '[説明](./manual\n私はは学校へ行きます。)';
    const found = await diagnostics(text, 'double-particle');
    expect(found).toHaveLength(1);
    expect(found[0].range.start.line).toBe(1);
    const filter = new MarkdownFilter();
    const valid = '[説明](./manual\n"タイトル")';
    const filtered = filter.filter(valid);
    expect(filtered.excludedRanges.some(r => r.type === 'url' && r.content.includes('タイトル'))).toBe(true);
  });

  it('既に閉じた角括弧を後続の括弧と結び付けて本文を隠さない', async () => {
    const text = '[参考]は記号](私はは学校へ行きます)。';
    const found = await diagnostics(text, 'double-particle');
    expect(found).toHaveLength(1);
    expect(found[0].range.start.line).toBe(0);
  });

  it.each([
    ['particle-repetition', 2], ['sentence-ending-colon', 3],
    ['oyobi-narabini', 4], ['matawa-wakushikuwa', 5],
  ] as const)('Markdown表のセルを独立して文法検査する: %s', async (code, line) => {
    const table = [
      '| ルール | 結果 | 例 |',
      '| --- | --- | --- |',
      '| 同じ助詞の連続使用 | PASS | 私は本を彼は読む |',
      '| 文末コロン | PASS | これはテストです： |',
      '| 「及び/並びに」使い分け | PASS | A並びにBを確認する |',
      '| 「又は/若しくは」使い分け | PASS | A若しくはBを選択する |',
    ].join('\n');
    const found = await diagnostics(table, code, 120, true);
    expect(found.some(d => d.range.start.line === line)).toBe(true);
  });

  it('表の別セルを連結して同じ助詞を繰り返したと扱わない', async () => {
    const table = '| 前半 | 後半 |\n| --- | --- |\n| 私は学生です | 彼は先生です |';
    expect(await diagnostics(table, 'particle-repetition', 120, true)).toHaveLength(0);
  });

  it('別の表セルの文末を一つの連続文として扱わない', async () => {
    const table = '| 一列目 | 二列目 |\n| --- | --- |\n| Aです。Bです。 | Cです。 |';
    expect(await diagnostics(table, 'monotonous-ending', 120, true)).toHaveLength(0);
    const within = '| 一列目 | 二列目 |\n| --- | --- |\n| Aです。Bです。Cです。 | 正常です。 |';
    expect(await diagnostics(within, 'monotonous-ending', 120, true)).toHaveLength(1);
  });

  it('別セルの長さにかかわらず、例文セルの助詞診断に到達する', async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 100 }), async length => {
      const row = `| ${'項目'.repeat(length)} | 私は本を彼は読む |`;
      const table = `| 説明 | 例 |\n| --- | --- |\n${row}`;
      const found = await diagnostics(table, 'particle-repetition', 120, true);
      expect(found.some(d => d.range.start.line === 2 && d.range.start.character >= row.indexOf('私は'))).toBe(true);
    }), { numRuns: 30, seed: 20261027 });
  });

  it('代表セルだけを検査する故障を、例文セルの契約が検出する', async () => {
    const table = '| ルール | 例 |\n| --- | --- |\n| 同じ助詞の連続使用 | 私は本を彼は読む |';
    const assertCell = async () => expect((await diagnostics(table, 'particle-repetition', 120, true)).some(d => d.range.start.line === 2)).toBe(true);
    await assertCell();
    const parse = SentenceParser.parseSentences;
    const fault = jest.spyOn(SentenceParser, 'parseSentences').mockImplementation((text, tokens, excludedRanges, mode, lines) =>
      parse(text, tokens, excludedRanges, mode, lines, true));
    try {
      await expect(assertCell()).rejects.toThrow('Expected: true');
    } finally {
      fault.mockRestore();
    }
  });

  it('リンク先の長さによらず表示文の長さで判定し、長い表示文は検出する', async () => {
    const target = 'https://example.com/' + 'a'.repeat(150);
    expect(await diagnostics(`詳細は[案内](${target})です。`, 'long-sentence', 20)).toHaveLength(0);
    const long = await diagnostics(`詳細は[これは表示されるとても長いリンクの文章です](${target})。`, 'long-sentence', 20);
    expect(long).toHaveLength(1);
    expect(long[0].range.start).toEqual({ line: 0, character: 0 });
    expect(long[0].range.end.character).toBe(`詳細は[これは表示されるとても長いリンクの文章です](${target})。`.length);
  });

  it('リンク先の生成長と文書内の位置を変えても表示文字数は変わらない', async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 220 }), async length => {
      const short = `案内は[こちら](https://example.com/${'a'.repeat(length)})です。`;
      expect(await diagnostics(short, 'long-sentence', 12)).toHaveLength(0);
    }), { numRuns: 30 });
    const relative = '[短い](docs/with(nested)/file.md)と[案内](./other.md)です。';
    expect(await diagnostics(relative, 'long-sentence', 12)).toHaveLength(0);
    expect(await diagnostics(`[案内](docs/page.md?query=${'x'.repeat(80)})です。`, 'long-sentence', 12)).toHaveLength(0);
    const relativeQuery = `この文章には[案内](docs/page.md?query=${'x'.repeat(80)})が続いています。`;
    const relativeResult = await diagnostics(relativeQuery, 'long-sentence', 12);
    expect(relativeResult).toHaveLength(1);
    expect(relativeResult[0].range).toEqual({ start: { line: 0, character: 0 }, end: { line: 0, character: relativeQuery.length } });
    const linkedImage = `[![画像](https://example.com/icon)](https://example.com/${'b'.repeat(160)})`;
    expect(await diagnostics(linkedImage, 'long-sentence', 12)).toHaveLength(0);
    expect(await diagnostics(`| リンク |\n| --- |\n| ${relative} |`, 'long-sentence', 12, true)).toHaveLength(0);
    const text = `前文。\nこれは[十分に長い表示テキストです](docs/file.md)という文です。`;
    const result = await diagnostics(text, 'long-sentence', 12);
    expect(result).toHaveLength(1);
    expect(result[0].range).toEqual({ start: { line: 1, character: 0 }, end: { line: 1, character: text.split('\n')[1].length } });
  });

  it('本動詞や複合動詞は残し、補助動詞の表記を提案する', async () => {
    for (const text of ['固定配布版を見る。', '発表資料を見る。', '置き換えません。', '図書館で見る。', '本を置いて帰る。']) {
      expect(await diagnostics(text, 'orthography-variant')).toHaveLength(0);
    }
    expect(await diagnostics('試して見る。', 'orthography-variant')).not.toHaveLength(0);
    expect(await diagnostics('準備して置く。', 'orthography-variant')).not.toHaveLength(0);
    expect(await diagnostics('読んで見る。', 'orthography-variant')).not.toHaveLength(0);
  });

  it('技術表記のコロンは文書の記号統一を乱さない', async () => {
    const text = '概要：資料。形式：16:9 PDF。';
    expect(await diagnostics(text, 'symbol-width-mix')).toHaveLength(0);
    expect(await diagnostics('概要：資料。形式：PDF。備考:説明。', 'symbol-width-mix')).toHaveLength(1);
  });

  it('読点や対比をまたぐ助詞を同じ節の繰り返しとしない', async () => {
    expect(await diagnostics('この文書自体は社内規程ではなく、利用者は参考にできます。', 'particle-repetition')).toHaveLength(0);
    expect(await diagnostics('機能は未実装で、指摘対応は予定しています。', 'particle-repetition')).toHaveLength(0);
    expect(await diagnostics('私は彼は学生です。', 'particle-repetition')).not.toHaveLength(0);
  });

  it('節をまたぐ「の」を名詞の連鎖に含めない', async () => {
    expect(await diagnostics('資料の説明を読み、組織の規則を確認し、内容の変更を記録します。', 'no-particle-chain')).toHaveLength(0);
    expect(await diagnostics('資料の説明を読む担当者の役割の範囲です。', 'no-particle-chain')).toHaveLength(0);
    expect(await diagnostics('私の友達の父の会社です。', 'no-particle-chain')).not.toHaveLength(0);
  });

  it('同じ文末の連続は任意の文体上の参考として示す', async () => {
    const found = await diagnostics('これは資料です。あれは表です。こちらは図です。', 'monotonous-ending');
    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe(DiagnosticSeverity.Information);
    expect(found[0].message).toMatch(/文体|参考/);
    expect(JSON.stringify(found[0].data)).not.toMatch(/である|「だ」/);
  });

  it('常用漢字の省は表外とせず、表外の冪は検出する', async () => {
    expect(await diagnostics('承認の省略。', 'jouyou-kanji')).toHaveLength(0);
    expect(await diagnostics('冪を計算します。', 'jouyou-kanji')).not.toHaveLength(0);
  });

  it('語の途中の更にを副詞と扱わず、副詞の更には提案する', async () => {
    expect(await diagnostics('局所変更に必要な読量。', 'orthography-variant')).toHaveLength(0);
    expect(await diagnostics('更に確認します。', 'orthography-variant')).not.toHaveLength(0);
  });

  it('ISO日付は範囲として変更せず、数値範囲は提案する', async () => {
    expect(await diagnostics('公開日は2026-10-22です。', 'dash-tilde-normalization')).toHaveLength(0);
    expect(await diagnostics('対象は1-3です。', 'dash-tilde-normalization')).not.toHaveLength(0);
  });

  it('数値や章番号の範囲の波線は偶数を要求しない', async () => {
    expect(await diagnostics('Ⅲ-6〜8と第1〜3線を参照。', 'even-wave')).toHaveLength(0);
    expect(await diagnostics('あ〜、そうです。', 'even-wave')).not.toHaveLength(0);
  });

  it('HTML属性やファイル名を表記統一の対象から除く', async () => {
    expect(await diagnostics('IDを確認。<a id="revision_history"></a>', 'english-case-mix')).toHaveLength(0);
    expect(await diagnostics('「履歴」を確認。<a id="revision_history"></a>', 'quotation-style-mix')).toHaveLength(0);
    expect(await diagnostics('build-info.jsonを開きます。', 'term-notation')).toHaveLength(0);
    expect(await diagnostics('jsonを扱います。', 'term-notation')).not.toHaveLength(0);
    expect(await diagnostics('APIとapiを説明。<a id="revision_history"></a>', 'english-case-mix')).not.toHaveLength(0);
    expect(await diagnostics('「履歴」と"引用"です。<a id="revision_history"></a>', 'quotation-style-mix')).not.toHaveLength(0);
  });

  it('文書の先行する表記と異なる表記を、それぞれの原文位置に診断する', async () => {
    const text = '😀APIを説明。\nAPIを確認。\napiの設計を改善。';
    const found = await diagnostics(text, 'english-case-mix', 120, false, 'plaintext');
    expect(found.map(d => d.range)).toEqual([
      { start: { line: 0, character: 2 }, end: { line: 0, character: 5 } },
      { start: { line: 2, character: 0 }, end: { line: 2, character: 3 } },
    ]);
    expect(await diagnostics('APIを説明。\nAPIを確認。', 'english-case-mix', 120, false, 'plaintext')).toHaveLength(0);
    await fc.assert(fc.asyncProperty(fc.integer({ min: 1, max: 8 }), fc.integer({ min: 1, max: 8 }), async (upper, lower) => {
      const sample = 'APIを確認。'.repeat(upper) + '\n' + 'apiを確認。'.repeat(lower);
      const observed = await diagnostics(sample, 'english-case-mix', 120, false, 'plaintext');
      expect(observed.map(d => d.range.start)).toEqual([{ line: 0, character: 0 }, { line: 1, character: 0 }]);
    }), { numRuns: 20, seed: 20261027 });
    const original = EnglishCaseMixRule.prototype.check;
    const fault = jest.spyOn(EnglishCaseMixRule.prototype, 'check').mockImplementation(
      function (this: EnglishCaseMixRule, tokens, context) { return original.call(this, tokens, context).slice(0, 1); }
    );
    try {
      await expect(async () => expect((await diagnostics(text, 'english-case-mix', 120, false, 'plaintext'))
        .map(d => d.range.start)).toContainEqual({ line: 2, character: 0 })).rejects.toThrow();
    } finally {
      fault.mockRestore();
    }
  });

  it('インラインコードを挟む助詞を連続と扱わない', async () => {
    expect(await diagnostics('対象Releaseを `v1.2.1` に固定した。', 'particle-sequence')).toHaveLength(0);
    expect(await diagnostics('本をに置く。', 'particle-sequence')).not.toHaveLength(0);
  });

  it('取扱いは許容形と説明し、文書方針の提案とする', async () => {
    const found = await diagnostics('データ取扱いについて。', 'okurigana-variant');
    expect(found).toHaveLength(1);
    expect(found[0].message).toMatch(/許容/);
    expect(found[0].severity).toBe(DiagnosticSeverity.Information);
  });

  it('代表的な契約違反を同じアサーションが検出する', async () => {
    const assertShortLink = async () => expect(await diagnostics(`[案内](https://example.com/${'a'.repeat(150)})です。`, 'long-sentence', 20)).toHaveLength(0);
    const assertUnit = async () => expect(await diagnostics('容量は10GBです。', 'space-around-unit')).toHaveLength(1);
    await assertShortLink();
    await assertUnit();

    const detect = LongSentenceRule.prototype.detectLongSentences;
    const hiddenMutation = jest.spyOn(LongSentenceRule.prototype, 'detectLongSentences')
      .mockImplementation(function (this: LongSentenceRule, sentences, threshold) { return detect.call(this, sentences, threshold); });
    try {
      await expect(assertShortLink()).rejects.toThrow(/Expected length: 0/);
    } finally {
      hiddenMutation.mockRestore();
    }

    const rejectAllMutation = jest.spyOn(SpaceAroundUnitRule.prototype, 'check').mockReturnValue([]);
    try {
      await expect(assertUnit()).rejects.toThrow(/Expected length: 1/);
    } finally {
      rejectAllMutation.mockRestore();
    }
  });
});

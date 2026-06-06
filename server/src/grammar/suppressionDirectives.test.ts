/**
 * インライン抑制ディレクティブのユニットテスト
 */

import { parseSuppressionDirectives, applySuppressions } from './suppressionDirectives';

interface Diag {
  range: { start: { line: number } };
  code?: string;
}

function diag(line: number, code?: string): Diag {
  return { range: { start: { line } }, code };
}

describe('parseSuppressionDirectives', () => {
  it('ディレクティブが無ければ hasDirectives は false', () => {
    const scan = parseSuppressionDirectives('ふつうの文章です。\n次の行。');
    expect(scan.hasDirectives).toBe(false);
    expect(scan.isSuppressed(0, 'noun-chain')).toBe(false);
  });

  it('disable-next-line は次の行の指定コードのみ抑制する', () => {
    const text = [
      '<!-- otak-lsp-disable-next-line noun-chain -->', // line 0
      '東京都渋谷区松濤一丁目住所',                         // line 1
      '別の行',                                            // line 2
    ].join('\n');
    const scan = parseSuppressionDirectives(text);
    expect(scan.hasDirectives).toBe(true);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(1, 'term-notation')).toBe(false); // 別コードは抑制しない
    expect(scan.isSuppressed(0, 'noun-chain')).toBe(false);    // ディレクティブ行自体は対象外
    expect(scan.isSuppressed(2, 'noun-chain')).toBe(false);    // 次の行のみ
  });

  it('コード省略時は次の行の全コードを抑制する', () => {
    const text = '// otak-lsp-disable-next-line\n対象行';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(1, 'anything')).toBe(true);
  });

  it('disable-line は同じ行を抑制する', () => {
    const text = '東京都渋谷区松濤一丁目 // otak-lsp-disable-line noun-chain';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(0, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
  });

  it('複数コードをスペース/カンマ区切りで指定できる', () => {
    const text = '<!-- otak-lsp-disable-next-line noun-chain, term-notation -->\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(1, 'term-notation')).toBe(true);
    expect(scan.isSuppressed(1, 'kanji-opening')).toBe(false);
  });

  it('コードの後ろの理由テキスト（-- ...）は無視される', () => {
    const text = '<!-- otak-lsp-disable-next-line orthography-variant -- 法令用語の引用 -->\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'orthography-variant')).toBe(true);
    // 理由テキストがコードとして拾われていないこと
    expect(scan.isSuppressed(1, '法令用語の引用')).toBe(false);
  });

  it('disable/enable ブロックで指定コードを範囲抑制する', () => {
    const text = [
      '<!-- otak-lsp-disable term-notation -->', // 0
      'Javascript を使う',                        // 1
      'Typescript を使う',                        // 2
      '<!-- otak-lsp-enable term-notation -->',  // 3
      'Github を使う',                            // 4
    ].join('\n');
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'term-notation')).toBe(true);
    expect(scan.isSuppressed(2, 'term-notation')).toBe(true);
    expect(scan.isSuppressed(4, 'term-notation')).toBe(false); // enable 後は抑制しない
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);    // 別コードは抑制しない
  });

  it('disable（コード省略）は enable まで全コードを抑制する', () => {
    const text = [
      '// otak-lsp-disable',  // 0
      'A',                    // 1
      'B',                    // 2
      '// otak-lsp-enable',   // 3
      'C',                    // 4
    ].join('\n');
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'x')).toBe(true);
    expect(scan.isSuppressed(2, 'y')).toBe(true);
    expect(scan.isSuppressed(4, 'x')).toBe(false);
  });

  it('enable されない disable は文末まで適用される', () => {
    const text = ['先頭', '<!-- otak-lsp-disable noun-chain -->', 'A', 'B'].join('\n');
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(0, 'noun-chain')).toBe(false); // ディレクティブより前
    expect(scan.isSuppressed(2, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(3, 'noun-chain')).toBe(true);
  });

  it('CRLF 改行でも行番号がずれない', () => {
    const text = '<!-- otak-lsp-disable-next-line noun-chain -->\r\n対象行\r\n別の行';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
    expect(scan.isSuppressed(2, 'noun-chain')).toBe(false);
  });
});

describe('applySuppressions', () => {
  it('抑制対象の診断を除去し、それ以外は残す', () => {
    const text = '<!-- otak-lsp-disable-next-line noun-chain -->\n対象行\n別の行';
    const scan = parseSuppressionDirectives(text);
    const diags = [
      diag(1, 'noun-chain'),     // 抑制される
      diag(1, 'term-notation'),  // 残る（別コード）
      diag(2, 'noun-chain'),     // 残る（別の行）
    ];
    const result = applySuppressions(diags, scan);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(diag(1, 'term-notation'));
    expect(result).toContainEqual(diag(2, 'noun-chain'));
  });

  it('ディレクティブが無ければ元の配列をそのまま返す', () => {
    const scan = parseSuppressionDirectives('ふつうの文章');
    const diags = [diag(0, 'noun-chain')];
    expect(applySuppressions(diags, scan)).toBe(diags);
  });

  it('コード無し診断は全コード抑制（disable-next-line のみ）のときに除去される', () => {
    const text = '// otak-lsp-disable-next-line\n対象行';
    const scan = parseSuppressionDirectives(text);
    const diags = [diag(1)]; // code 未設定
    expect(applySuppressions(diags, scan)).toHaveLength(0);
  });
});

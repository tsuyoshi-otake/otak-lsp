/**
 * インライン抑制ディレクティブのユニットテスト
 */

import * as fc from 'fast-check';
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

describe('Issue #26: 無効コード・本文言及を全抑制に拡大しない', () => {
  it('不正なコードトークンを含むディレクティブは無効で、全抑制に拡大しない', () => {
    const text = '<!-- otak-lsp-disable-next-line Noun_Chain -->\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
    expect(scan.isSuppressed(1, 'double-particle')).toBe(false);
    expect(scan.invalidDirectives).toEqual([
      { line: 0, kind: 'disable-next-line', offendingToken: 'Noun_Chain' },
    ]);
  });

  it('先頭が非コードトークンなら後続の有効コードも採用しない', () => {
    const text = '// otak-lsp-disable-next-line Bad_Code noun-chain\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
    expect(scan.invalidDirectives).toHaveLength(1);
  });

  it('本文中の言及はディレクティブとして扱わない', () => {
    const text = 'これはotak-lsp-disableの説明です。\n次の行';
    const scan = parseSuppressionDirectives(text);
    expect(scan.hasDirectives).toBe(false);
    expect(scan.isSuppressed(1, 'anything')).toBe(false);
  });

  it('コードの後の言及もディレクティブとして扱わない', () => {
    const text = 'call otak-lsp-disable-next-line noun-chain\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
  });

  it('行末コメント内のディレクティブは引き続き有効', () => {
    const text = '対象文 // otak-lsp-disable-line noun-chain';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(0, 'noun-chain')).toBe(true);
  });

  it('コード省略 + 理由マーカー（--）は全抑制として有効', () => {
    const text = '// otak-lsp-disable -- 一時的な回避\nA';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'x')).toBe(true);
    expect(scan.invalidDirectives).toHaveLength(0);
  });

  it('コメントなしの行頭ディレクティブは有効（プレーンテキスト）', () => {
    const text = 'otak-lsp-disable-next-line noun-chain\n対象';
    const scan = parseSuppressionDirectives(text);
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
  });

  it('PBT: 不正コードトークンを含む disable-next-line はどのコードも抑制しない', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Z][A-Za-z_]*$/),
        fc.constantFrom('//', '<!--', '#', '*'),
        (badCode, marker) => {
          const text = `${marker} otak-lsp-disable-next-line ${badCode}\n対象`;
          const scan = parseSuppressionDirectives(text);
          expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
          expect(scan.isSuppressed(1, 'anything-else')).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('PBT: コメント記号を伴わない文中のキーワードはディレクティブにならない', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[ぁ-ん一-龯]+$/),
        fc.constantFrom('disable-next-line', 'disable-line', 'disable', 'enable'),
        (prose, kind) => {
          const text = `${prose}otak-lsp-${kind} noun-chain\n対象`;
          const scan = parseSuppressionDirectives(text);
          expect(scan.isSuppressed(0, 'noun-chain')).toBe(false);
          expect(scan.isSuppressed(1, 'noun-chain')).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });
});

describe('Issue #26: 言語別スコープ（文字列・コードサンプルの誤爆防止）', () => {
  it('コード言語: 文字列リテラル内の類似表記はディレクティブにしない', () => {
    const text = 'const example = "// otak-lsp-disable -- example";\n対象';
    // CommentExtractor のコメント範囲に含まれない（文字列内の // はコメントでない）
    const scan = parseSuppressionDirectives(text, { includeRanges: [] });
    expect(scan.isSuppressed(1, 'x')).toBe(false);
    expect(scan.hasDirectives).toBe(false);
  });

  it('コード言語: 実コメント内のディレクティブは有効', () => {
    const text = '// otak-lsp-disable-next-line noun-chain\n対象';
    const scan = parseSuppressionDirectives(text, { includeRanges: [{ start: 0, end: 42 }] });
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
  });

  it('markdown: フェンスコードブロック内のディレクティブ風テキストは無効', () => {
    const text = '```text\notak-lsp-disable\n```\n対象';
    const scan = parseSuppressionDirectives(text, { includeRanges: [], excludeRanges: [{ start: 0, end: 30 }] });
    expect(scan.isSuppressed(3, 'x')).toBe(false);
    expect(scan.hasDirectives).toBe(false);
  });

  it('markdown: HTMLコメント内のディレクティブは有効', () => {
    const text = '<!-- otak-lsp-disable-next-line noun-chain -->\n対象';
    const scan = parseSuppressionDirectives(text, { includeRanges: [{ start: 0, end: 45 }] });
    expect(scan.isSuppressed(1, 'noun-chain')).toBe(true);
  });

  it('markdown: 除外範囲内のHTMLコメントは無効（コードフェンス内のサンプル）', () => {
    const text = '```\n<!-- otak-lsp-disable -->\n```\n対象';
    const scan = parseSuppressionDirectives(text, {
      includeRanges: [{ start: 4, end: 28 }],
      excludeRanges: [{ start: 0, end: 32 }],
    });
    expect(scan.isSuppressed(3, 'x')).toBe(false);
  });
});

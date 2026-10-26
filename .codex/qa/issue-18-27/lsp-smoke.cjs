// 事前に npm run compile。実サーバープロセスとJSON-RPCで疎通し、外部サービスは使用しない。
const path = require('path');
const cp = require('child_process');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../..');
const { createMessageConnection, StreamMessageReader, StreamMessageWriter } = require(path.join(root, 'node_modules/vscode-jsonrpc/node'));
const server = cp.spawn(process.execPath, [path.join(root, 'server/out/main.js'), '--stdio'], {
  cwd: root, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, OTAK_LCP_DEBUG: '0', OTAK_LSP_DEBUG: '0' },
});
let stderr = '';
server.stderr.on('data', chunk => { stderr += chunk; });
const connection = createMessageConnection(new StreamMessageReader(server.stdout), new StreamMessageWriter(server.stdin));
const diagnostics = new Map();
const notices = [];
connection.onNotification('textDocument/publishDiagnostics', value => diagnostics.set(value.uri, value.diagnostics));
connection.onNotification('otakLsp/analysisNotice', value => notices.push(value));
connection.onNotification('window/logMessage', () => undefined);
connection.onRequest('workspace/semanticTokens/refresh', () => null);
connection.onRequest('workspace/configuration', params => params.items.map(item => {
  if (item.section !== 'otakLsp') return {};
  return {
    enableGrammarCheck: !item.scopeUri?.endsWith('off.md'),
    enableSemanticHighlight: !item.scopeUri?.endsWith('off.md'),
    hover: { enableWikipedia: false },
    advanced: { parallelExecution: { enabled: false } },
    maxDocumentChars: item.scopeUri?.endsWith('large.md') ? 10 : 10000,
    maxNumberOfProblems: item.scopeUri?.endsWith('capped.md') ? 1 : 2000,
  };
}));
connection.listen();
let exited = false;
const exit = new Promise(resolve => server.once('exit', (code, signal) => { exited = true; resolve({ code, signal }); }));
const deadline = setTimeout(() => { server.kill(); }, 25000);
const uri = name => `file:///otak-lsp-qa/${name}.md`;
const analyze = name => connection.sendRequest('otakLsp/analyzeDocument', { uri: uri(name) });
async function open(name, text) {
  await connection.sendNotification('textDocument/didOpen', { textDocument: { uri: uri(name), languageId: 'markdown', version: 1, text } });
}
(async () => {
  try {
    const initialized = await connection.sendRequest('initialize', { processId: process.pid, rootUri: null,
      capabilities: { workspace: { configuration: true }, textDocument: { codeAction: { literalSupport: true } } },
    });
    assert(initialized.capabilities.codeActionProvider);
    await connection.sendNotification('initialized', {});
    await open('normal', '私はは学校に行きます。');
    assert.equal((await analyze('normal')).status, 'completed');
    const observed = diagnostics.get(uri('normal'));
    const diagnostic = observed.find(item => item.code === 'double-particle');
    assert(diagnostic, '本番形態素解析と診断公開に到達する');
    assert.equal(diagnostic.data.documentVersion, 1);
    const actions = await connection.sendRequest('textDocument/codeAction', {
      textDocument: { uri: uri('normal') }, range: diagnostic.range, context: { diagnostics: [diagnostic] },
    });
    const edit = actions.find(action => action.edit)?.edit.documentChanges[0];
    assert.equal(edit.textDocument.uri, uri('normal'));
    assert.equal(edit.textDocument.version, 1);
    assert(edit.edits[0].newText.includes('otak-lsp-disable-line double-particle'));
    console.log('C21/C24: 実解析完了・診断・版付きCodeAction PASS');

    await open('off', '私はは学校に行きます。');
    assert.deepEqual(await analyze('off'), { ok: false, status: 'skipped', reason: 'disabled' });
    await open('large', '東京タワーを見学します。');
    assert.equal((await analyze('large')).reason, 'document-too-large');
    assert.equal(await connection.sendRequest('textDocument/hover', { textDocument: { uri: uri('large') }, position: { line: 0, character: 1 } }), null);
    assert.equal((await analyze('missing')).reason, 'unknown-document');
    console.log('C14/C21/C23: OFF・サイズ上限・未登録文書の明示終端とホバー拒否 PASS');

    await open('capped', '私はは学校に行きます。\n私はは学校に行きます。');
    await analyze('capped');
    assert(diagnostics.get(uri('capped')).some(item => item.code === 'diagnostics-truncated'));
    const notice = notices.find(item => item.uri === uri('capped') && item.kind === 'diagnostics-truncated');
    assert(notice);
    assert.equal(notice.total, notice.omitted + 1);
    console.log('C23: 上限診断と省略通知の件数整合 PASS');
  } finally {
    if (!exited) {
      await connection.sendRequest('shutdown').catch(() => undefined);
      await connection.sendNotification('exit').catch(() => undefined);
    }
    connection.dispose();
    const result = await exit;
    clearTimeout(deadline);
    assert.equal(result.code, 0, stderr || 'サーバーの正常終了');
  }
})().catch(error => { console.error(error); process.exitCode = 1; });

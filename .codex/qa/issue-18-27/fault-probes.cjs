// Issue #21/#26: 本番ソースをメモリ内で変異させ、契約違反の検出力を確認する。
// 実行: node .codex/qa/issue-18-27/fault-probes.cjs
// ソースファイルの書換え、外部アクセス、パッケージ導入は行わない。
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
const Module = require('module');
const root = path.resolve(__dirname, '../../..');
const ts = require(path.join(root, 'node_modules/typescript'));
require(path.join(root, 'node_modules/ts-node/register/transpile-only'));
const watchdog = setTimeout(() => {
  console.error('検証基盤エラー: 10秒以内に完了しませんでした（変異検出には数えない）');
  process.exit(1);
}, 10000);

function load(relative, mutation) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  if (mutation) {
    assert(source.includes(mutation[0]), '変異箇所が見つかること');
    source = source.replace(mutation[0], mutation[1]);
  }
  const loaded = new Module(file, module);
  loaded.filename = file;
  loaded.paths = Module._nodeModulePaths(path.dirname(file));
  loaded._compile(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText, file);
  return loaded.exports;
}

const parserPath = 'server/src/grammar/suppressionDirectives.ts';
const parserChecks = [
  {
    id: 'C26-無効コードを全抑制へ広げない',
    mutation: ['if (parsed.invalidToken !== undefined) {', 'if (false) {'],
    check: parser => assert.equal(parser('<!-- otak-lsp-disable-next-line Noun_Chain -->\n対象').isSuppressed(1, 'double-particle'), false),
  },
  {
    id: 'C26-本文中の言及を指示としない',
    mutation: ['if (!isDirectivePosition(lines[i], match.index ?? 0)) {', 'if (false) {'],
    check: parser => assert.equal(parser('本文で otak-lsp-disable-next-line double-particle\n対象').isSuppressed(1, 'double-particle'), false),
  },
  {
    id: 'C26-有効な指示は実際に抑制する',
    mutation: ['isSuppressed(line: number, code: string): boolean {', 'isSuppressed(line: number, code: string): boolean { return false;'],
    check: parser => assert.equal(parser('<!-- otak-lsp-disable-next-line double-particle -->\n対象').isSuppressed(1, 'double-particle'), true),
  },
];

async function schedulerCheck(createScheduler) {
  const { AnalysisStateManager } = require(path.join(root, 'server/src/server/languageServer'));
  const { TextDocument } = require(path.join(root, 'node_modules/vscode-languageserver-textdocument'));
  const { DEFAULT_ADVANCED_RULES_CONFIG } = require(path.join(root, 'shared/src/advancedTypes'));
  const states = new AnalysisStateManager();
  const uri = 'file:///fault-probe.md';
  const scheduler = createScheduler(states, {
    getConfig: () => ({ maxConcurrentAnalyses: 1, debounceDelay: 1 }),
    getAdvancedConfig: () => DEFAULT_ADVANCED_RULES_CONFIG,
  });
  const pending = [];
  const tick = () => new Promise(resolve => setTimeout(resolve, 0));
  scheduler.setExecuteAnalysis(() => new Promise(resolve => pending.push(resolve)));
  states.updateState(uri, { latestDocument: TextDocument.create(uri, 'markdown', 1, '旧'), latestVersion: 1 });
  scheduler.scheduleFullAnalysis(uri);
  await tick();
  states.updateState(uri, { latestDocument: TextDocument.create(uri, 'markdown', 2, '新'), latestVersion: 2 });
  let observed;
  const request = scheduler.runFullAnalysis(uri);
  request.outcome.then(value => { observed = value; });
  try {
    assert.equal(pending.length, 1);
    pending.shift()({ status: 'stale' });
    await tick();
    assert.equal(observed, undefined, '旧版の完了で新版の要求を解決しない');
    assert.equal(pending.length, 1, '正常条件で新版の解析が進行する');
    pending.shift()({ status: 'completed', diagnostics: 1, omittedDiagnostics: 0 });
    await request.outcome;
    assert.equal(observed.status, 'completed', '新版の成功を観測する');
  } finally {
    request.cancel();
    scheduler.clearAllTimers();
    for (const resolve of pending) resolve({ status: 'cancelled' });
    await tick();
  }
}

async function hoverCheck(composeHover) {
  const { TextDocument } = require(path.join(root, 'node_modules/vscode-languageserver-textdocument'));
  const { DocumentCacheStore } = require(path.join(root, 'server/src/server/documentCacheStore'));
  const uri = 'file:///hover-fault.md';
  const doc = TextDocument.create(uri, 'markdown', 1, '東京');
  const cacheStore = new DocumentCacheStore();
  cacheStore.setAnalysisResult(uri, [], '東京', [], [0]);
  let requests = 0;
  const result = await composeHover({ textDocument: { uri }, position: { line: 0, character: 0 } }, {
    documents: { get: () => doc }, cacheStore,
    getConfig: () => ({ enableGrammarCheck: true, targetLanguages: ['markdown'], markdown: {} }),
    hoverProvider: { provideHover: async () => { requests++; return null; } },
  });
  assert.equal(result, null);
  assert.equal(requests, 0, '未解析文書から検索境界へ到達しない');
}

(async () => {
  for (const probe of parserChecks) {
    probe.check(load(parserPath).parseSuppressionDirectives);
  }
  const schedulerPath = 'server/src/server/analysisScheduler.ts';
  await schedulerCheck(load(schedulerPath).createAnalysisScheduler);
  const hoverPath = 'server/src/server/hoverComposer.ts';
  await hoverCheck(load(hoverPath).composeHoverResponse);
  const probes = parserChecks.map(probe => ({
    id: probe.id,
    run: () => probe.check(load(parserPath, probe.mutation).parseSuppressionDirectives),
  }));
  probes.push({
    id: 'C21-旧版完了と正常進行',
    run: () => schedulerCheck(load(schedulerPath, [
      'const versionMatch = runVersion === undefined || waiter.minVersion <= runVersion;',
      'const versionMatch = true;',
    ]).createAnalysisScheduler),
  });
  probes.push({
    id: 'C14-未解析文書の検索拒否',
    run: () => hoverCheck(load(hoverPath, [
      'if (!entry || entry.tokens.length === 0 || entry.text !== document.getText()) {',
      'if (!entry) {',
    ]).composeHoverResponse),
  });
  for (const probe of probes) {
    let detected = false;
    try { await probe.run(); }
    catch (error) {
      if (error.code !== 'ERR_ASSERTION') throw error;
      detected = true;
      console.log(`${probe.id}: 契約のアサーションで変異を検出`);
    }
    assert(detected, `${probe.id}: 未検出の変異`);
  }
  console.log('通常実装の契約確認成功 / 5変異を検出。モデル検査・網羅的Mutation Scoreは対象外。');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => clearTimeout(watchdog));

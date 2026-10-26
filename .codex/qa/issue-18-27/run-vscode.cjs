// npm run compile 後、node .codex/qa/issue-18-27/run-vscode.cjs "VS Code実行ファイル"。
// 専用プロファイルとワークスペースを ~/tmp に作成し、終了時に自身の一時ディレクトリだけを削除する。
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const executable = process.argv[2];
if (!executable || !fs.existsSync(executable)) throw new Error('インストール済み VS Code の実行ファイルを指定してください');
const root = path.resolve(__dirname, '../../..');
const tempRoot = path.join(os.homedir(), 'tmp');
fs.mkdirSync(tempRoot, { recursive: true });
const workDir = fs.mkdtempSync(path.join(tempRoot, 'otak-lsp-vscode-'));
const profile = path.join(workDir, 'profile');
const workspace = path.join(workDir, 'vscode-workspace');
const otherWorkspace = path.join(workDir, 'other-workspace');
fs.mkdirSync(path.join(profile, 'User'), { recursive: true });
fs.mkdirSync(path.join(workspace, '.vscode'), { recursive: true });
fs.mkdirSync(path.join(otherWorkspace, '.vscode'), { recursive: true });
fs.writeFileSync(path.join(profile, 'User/settings.json'), JSON.stringify({
  'workbench.startupEditor': 'none', 'update.mode': 'none', 'extensions.autoUpdate': false,
  'editor.semanticTokenColorCustomizations': { rules: { variable: '#123456' } },
}));
const workspaceSettings = {
  'otakLsp.enableGrammarCheck': true, 'otakLsp.enableSemanticHighlight': false,
  'otakLsp.hover.enableWikipedia': false, 'otakLsp.advanced.parallelExecution.enabled': false,
  'editor.semanticTokenColorCustomizations': { rules: { function: '#abcdef' } },
};
const workspaceFile = path.join(workDir, 'verification.code-workspace');
fs.writeFileSync(workspaceFile, JSON.stringify({ folders: [{ path: workspace }, { path: otherWorkspace }], settings: workspaceSettings }));
fs.writeFileSync(path.join(otherWorkspace, '.vscode/settings.json'), JSON.stringify({
  'otakLsp.enableGrammarCheck': false, 'otakLsp.enableSemanticHighlight': false,
}));
fs.writeFileSync(path.join(otherWorkspace, 'other.md'), '私はは学校に行きます。');
fs.writeFileSync(path.join(workspace, 'sample.md'), '私はは学校に行きます。');
const log = fs.openSync(path.join(workDir, 'vscode.log'), 'w');
const child = cp.spawn(executable, [
  '--new-window', '--user-data-dir', profile, '--extensions-dir', path.join(workDir, 'extensions'),
  `--extensionDevelopmentPath=${root}`, `--extensionTestsPath=${path.join(__dirname, 'vscode-workflow.cjs')}`,
  '--skip-welcome', '--skip-release-notes', workspaceFile,
], { windowsHide: true, env: { ...process.env, OTAK_QA_DIR: workDir }, stdio: ['ignore', log, log] });
let timedOut = false;
const timer = setTimeout(() => {
  timedOut = true;
  if (process.platform === 'win32') cp.spawnSync('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, timeout: 15000 });
  else child.kill();
}, 120000);
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('close', code => {
  clearTimeout(timer);
  fs.closeSync(log);
  const resultPath = path.join(workDir, 'vscode-workflow-result.json');
  if (fs.existsSync(resultPath)) console.log(fs.readFileSync(resultPath, 'utf8'));
  else console.error('検証結果が出力されませんでした', fs.readFileSync(path.join(workDir, 'vscode.log'), 'utf8').slice(-4000));
  process.exitCode = code === 0 && !timedOut && fs.existsSync(resultPath) ? 0 : 1;
  // mkdtemp が作った固定親配下の一意ディレクトリであることを確認する。
  if (path.dirname(workDir) !== tempRoot || !path.basename(workDir).startsWith('otak-lsp-vscode-')) throw new Error('一時ディレクトリの範囲不一致');
  fs.rmSync(workDir, { recursive: true, force: true });
});

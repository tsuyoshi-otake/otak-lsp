import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('VS Code compatibility contract', () => {
  it('declares and type-checks against the supported minimum version', () => {
    const root = resolve(__dirname, '../..');
    const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const lock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
    const client = JSON.parse(readFileSync(require.resolve('vscode-languageclient/package.json'), 'utf8'));
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8');

    // languageclient 9.0.1 declares VS Code 1.82 as its minimum supported host.
    expect(client.engines.vscode).toBe('^1.82.0');
    expect(manifest.engines.vscode).toBe('^1.82.0');
    expect(manifest.devDependencies['@types/vscode']).toBe('1.82.0');
    expect(lock.packages['node_modules/@types/vscode'].version).toBe('1.82.0');
    expect(readme).toContain('VS Code **1.82.0** 以上');
    expect(readme).toContain('VS%20Code-%5E1.82.0-007acc');
  });
});

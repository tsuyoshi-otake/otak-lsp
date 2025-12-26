import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { JsonRpcConnection } from './jsonRpc';

describe('MCP analyze integration', () => {
  jest.setTimeout(20000);

  test('tools/callで診断を取得できる', async () => {
    const child = spawnMcp();
    const connection = new JsonRpcConnection(child.stdout, child.stdin);

    const initResult = await connection.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      clientInfo: { name: 'jest' }
    });

    expect(initResult).toHaveProperty('capabilities');

    const result = await connection.sendRequest('tools/call', {
      name: 'analyze',
      arguments: {
        text: '私はがが行きます。',
        languageId: 'markdown'
      }
    });

    const content = (result as { content?: Array<{ type?: string; json?: { diagnostics?: unknown[] } }> }).content;
    expect(Array.isArray(content)).toBe(true);
    expect(content?.[0]?.type).toBe('json');
    expect(Array.isArray(content?.[0]?.json?.diagnostics)).toBe(true);

    await shutdownMcp(child);
  });
});

function spawnMcp(): ChildProcessWithoutNullStreams {
  const compiledPath = path.resolve(__dirname, '..', 'out', 'main.js');
  if (fs.existsSync(compiledPath)) {
    return spawn(process.execPath, [compiledPath], { stdio: ['pipe', 'pipe', 'pipe'] });
  }

  const tsPath = path.resolve(__dirname, 'main.ts');
  return spawn(process.execPath, ['-r', 'ts-node/register', tsPath], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: '1'
    }
  });
}

function shutdownMcp(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      child.kill();
      resolve();
    }, 2000);

    child.once('exit', () => {
      clearTimeout(timeoutId);
      resolve();
    });
    child.stdin.end();
  });
}

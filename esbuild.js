const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Server build configuration
 */
async function buildServer() {
  const ctx = await esbuild.context({
    entryPoints: ['server/src/main.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'server/out/main.js',
    external: ['vscode', 'kuromoji'],
    logLevel: 'warning'
  });

  if (watch) {
    await ctx.watch();
    console.log('[server] watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[server] build complete');
  }
}

/**
 * Advanced Rules Worker build configuration
 * Feature: parallel-advanced-rules
 *
 * worker_threads ベースの並列ルール実行 worker。
 * main bundle と別の独立 bundle として `server/out/advancedRulesWorker.js` に出力する。
 * vscode-languageserver / kuromoji 等の重量級依存は include しないため、軽量。
 */
async function buildAdvancedRulesWorker() {
  const ctx = await esbuild.context({
    entryPoints: ['server/src/workers/advancedRulesWorker.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'server/out/advancedRulesWorker.js',
    external: ['vscode', 'kuromoji'],
    logLevel: 'warning'
  });

  if (watch) {
    await ctx.watch();
    console.log('[advancedRulesWorker] watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[advancedRulesWorker] build complete');
  }
}

/** 辞書正規表現の隔離実行用Worker。 */
async function buildDictionaryWorker() {
  const ctx = await esbuild.context({
    entryPoints: ['server/src/workers/dictionaryWorker.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'server/out/dictionaryWorker.js',
    plugins: [{
      name: 'english-dictionary',
      setup(build) {
        build.onResolve({ filter: /^otak-english-dictionary$/ }, () => ({ path: 'english-dictionary', namespace: 'otak-dictionary' }));
        build.onLoad({ filter: /.*/, namespace: 'otak-dictionary' }, () => {
          const directory = path.dirname(require.resolve('dictionary-en'));
          const aff = path.join(directory, 'index.aff');
          const dic = path.join(directory, 'index.dic');
          return {
            contents: `export const aff = ${JSON.stringify(fs.readFileSync(aff, 'utf8'))}; export const dic = ${JSON.stringify(fs.readFileSync(dic, 'utf8'))};`,
            loader: 'js',
            watchFiles: [aff, dic],
          };
        });
      },
    }],
    logLevel: 'warning'
  });
  if (watch) {
    await ctx.watch();
    console.log('[dictionaryWorker] watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[dictionaryWorker] build complete');
  }
}

/**
 * Client build configuration
 */
async function buildClient() {
  const ctx = await esbuild.context({
    entryPoints: ['client/src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: 'client/out/extension.js',
    external: ['vscode'],
    logLevel: 'warning'
  });

  if (watch) {
    await ctx.watch();
    console.log('[client] watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('[client] build complete');
  }
}

async function main() {
  try {
    await Promise.all([buildServer(), buildAdvancedRulesWorker(), buildDictionaryWorker(), buildClient()]);
    if (!watch) {
      console.log('Build completed successfully');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();

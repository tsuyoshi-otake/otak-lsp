const esbuild = require('esbuild');
const path = require('path');

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
    await Promise.all([buildServer(), buildClient()]);
    if (!watch) {
      console.log('Build completed successfully');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

main();

/**
 * MCPパッケージ用の成果物を生成する
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const packageDir = path.join(rootDir, 'packages', 'otak-mcp-lsp');
const mcpOutDir = path.join(rootDir, 'mcp', 'out');
const serverOutDir = path.join(rootDir, 'server', 'out');
const packageJsonPath = path.join(packageDir, 'package.json');
const rootPackageJsonPath = path.join(rootDir, 'package.json');

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) {
    throw new Error(`コピー元が存在しません: ${srcDir}`);
  }
  ensureDir(destDir);

  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

function syncPackageVersion() {
  const rootJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  if (rootJson.version && packageJson.version !== rootJson.version) {
    packageJson.version = rootJson.version;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  }
}

function build() {
  syncPackageVersion();

  copyDir(mcpOutDir, path.join(packageDir, 'mcp', 'out'));
  copyDir(serverOutDir, path.join(packageDir, 'server', 'out'));

  copyFile(path.join(rootDir, 'LICENSE'), path.join(packageDir, 'LICENSE'));
}

try {
  build();
  console.log('otak-mcp-lsp package build complete');
} catch (error) {
  console.error(`otak-mcp-lsp package build failed: ${error.message}`);
  process.exit(1);
}

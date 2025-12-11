/**
 * Prepare package for VSIX build
 * Remove unnecessary files from node_modules to reduce package size
 */

const fs = require('fs');
const path = require('path');

const nodeModulesPath = path.join(__dirname, '..', 'node_modules');

// Directories to remove from packages
const dirsToRemove = [
  'kuromoji/test',
  'kuromoji/demo',
  'kuromoji/example',
  'kuromoji/build',
  'zlibjs/test',
  'zlibjs/vendor',
  'async/internal',
];

// Files to remove (patterns)
const filesToRemove = [
  '.travis.yml',
  '.codeclimate.yml',
  '.jshintrc',
  '.node-version',
  'bower.json',
  'gulpfile.js',
  'jsdoc.json',
  'Makefile',
  'CHANGELOG.md',
  'HISTORY.md',
  'NOTICE.md',
];

function removeDir(dirPath) {
  if (fs.existsSync(dirPath)) {
    console.log(`Removing directory: ${dirPath}`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    console.log(`Removing file: ${filePath}`);
    fs.unlinkSync(filePath);
  }
}

function cleanPackage(packageName) {
  const packagePath = path.join(nodeModulesPath, packageName);
  if (!fs.existsSync(packagePath)) return;

  // Remove specific files
  filesToRemove.forEach(file => {
    removeFile(path.join(packagePath, file));
  });
}

console.log('Preparing package for VSIX build...');

// Remove directories
dirsToRemove.forEach(dir => {
  removeDir(path.join(nodeModulesPath, dir));
});

// Clean specific packages
['kuromoji', 'async', 'doublearray', 'zlibjs'].forEach(pkg => {
  cleanPackage(pkg);
});

console.log('Package preparation complete!');

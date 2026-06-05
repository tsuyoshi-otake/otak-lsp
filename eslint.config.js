const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const unusedImports = require('eslint-plugin-unused-imports');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      '**/out/**',
      '**/node_modules/**',
      '**/generatedGlossaryData/**',
      '**/*.js',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.jest,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'unused-imports': unusedImports,
    },
    rules: {
      // Layered presets: eslint-recommended → tseslint disables conflicting
      // core rules (e.g. no-undef) → tseslint recommended → project overrides.
      // Spreading rules only (not the whole configs) keeps parser/plugin
      // wiring explicit in this block.
      ...js.configs.recommended.rules,
      ...tseslint.configs['flat/eslint-recommended'].rules,
      ...tseslint.configs.recommended.rules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-irregular-whitespace': ['error', {
        skipStrings: true,
        skipComments: true,
        skipRegExps: true,
        skipTemplates: true,
      }],
      'no-control-regex': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: [
      '**/*.test.ts',
      '**/__tests__/**/*.ts',
      'server/src/grammar/evals/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];

/**
 * Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.
 * Copyright © 2026 Self-Made Legends LLC (SML). All rights reserved.
 * Proprietary and confidential. Unauthorized copying, distribution,
 * or use of this file, via any medium, is strictly prohibited.
 *
 * eslint was a devDependency with no config and no script, so nothing was
 * ever linted. BOOTSTRAP.md Step 5 asks for the SML source header to be
 * "enforced rather than remembered" — that rule is below.
 */
const js = require('@eslint/js');
const react = require('eslint-plugin-react');

const HEADER = 'Dads & Daughters Beauty Bond™ — a Self-Made Legends LLC (SML) product.';

/**
 * NOTICE.md §3.2 requires the SML attribution header on every source file, and
 * BOOTSTRAP.md Step 5 asks for it to be enforced rather than remembered. All
 * 103 files carry it today; this is what keeps the 104th from shipping without.
 */
const smlHeader = {
  rules: {
    'require-header': {
      meta: {
        type: 'problem',
        docs: { description: 'every source file carries the SML attribution header' },
        schema: [],
      },
      create(context) {
        return {
          Program(node) {
            const src = context.sourceCode ?? context.getSourceCode();
            const top = src.getText().slice(0, 400);
            if (top.includes(HEADER)) return;
            context.report({
              node,
              message:
                'Missing the SML attribution header (NOTICE.md §3.2). '
                + 'Copy the block from any neighbouring file.',
            });
          },
        };
      },
    },
  },
};

module.exports = [
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'assets/**', 'scripts/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    plugins: { react, sml: smlHeader },
    settings: { react: { version: 'detect' } },
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        FormData: 'readonly',
        __DEV__: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        require: 'readonly',
        module: 'writable',
        process: 'readonly',
      },
    },
    rules: {
      // Without this every component imported for JSX reads as unused.
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'sml/require-header': 'error',

      // React Native screens legitimately hold JSX-only identifiers.
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^(React|_)',
      }],
      'no-undef': 'error',
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',

      // A swallowed rejection is how nine missing endpoints stayed invisible:
      // `.catch(() => {})` turned every 404 into a silent fallback. Empty
      // blocks now have to say why they are empty.
      'no-empty': ['error', { allowEmptyCatch: false }],
    },
  },
];

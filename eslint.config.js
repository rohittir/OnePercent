// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The prototype and the design mockups are reference pages, not part of the build.
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/cdk.out/**', '**/coverage/**', 'index.html', 'design/**']),
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }] },
  },
])

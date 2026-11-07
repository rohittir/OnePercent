// @ts-check
import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // The prototype and the design mockups are reference pages, not part of the build.
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/cdk.out/**', '**/coverage/**', '**/test-results/**', '**/playwright-report/**', 'index.html', 'design/**']),
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { args: 'after-used', argsIgnorePattern: '^_' }] },
  },
  {
    // The app, its service worker, and the callbacks of page.evaluate in e2e run in the browser.
    files: ['web/**/*.{js,jsx}', 'e2e/**/*.js'],
    languageOptions: { globals: { ...globals.browser, ...globals.serviceworker }, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      // Text from a user is rendered by React as text, never as HTML.
      'no-restricted-syntax': ['error',
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: 'Render text, never HTML' },
        { selector: 'AssignmentExpression[left.property.name=/^(?:inner|outer)HTML$/]', message: 'Render text, never HTML' }],
    },
  },
])

/**
 * ESLint configuration for financial API usage patterns
 * Warns when developers bypass the shared financial client
 */
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';

export default [
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CallExpression[callee.name="fetch"]',
          message: '🚫 For financial API calls to /go-api/*, use @/hooks/use-financial-data hooks or @/lib/financial/client instead of raw fetch(). This ensures proper error handling, caching, and optimistic updates. For non-financial APIs, consider if you need proper error handling.',
        },
      ],
    },
  },
  {
    // Allow fetch in the financial client itself and test files
    files: [
      'lib/financial/client.ts',
      'hooks/use-financial-data.ts',
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      'tests/**/*',
      'app/api/**/*',
      'pages/api/**/*',
      '**/*.server.{ts,tsx}',
    ],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
];
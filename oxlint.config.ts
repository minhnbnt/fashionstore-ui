import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['react', 'typescript', 'oxc', 'jsx-a11y', 'unicorn', 'import', 'promise'],
  jsPlugins: ['@tanstack/eslint-plugin-query'],
  options: {
    typeAware: true,
  },
  rules: {
    'react/rules-of-hooks': 'error',
    'react/only-export-components': ['warn', { allowConstantExport: true }],

    'typescript/no-floating-promises': 'error',
    'typescript/no-misused-promises': 'error',
    'typescript/no-unsafe-assignment': 'warn',

    '@tanstack/query/exhaustive-deps': 'error',
    '@tanstack/query/no-unstable-deps': 'error',
    '@tanstack/query/stable-query-client': 'error',
    '@tanstack/query/no-rest-destructuring': 'error',
    '@tanstack/query/infinite-query-property-order': 'warn',
    '@tanstack/query/mutation-property-order': 'warn',
    '@tanstack/query/no-void-query-fn': 'warn',
    '@tanstack/query/prefer-query-options': 'warn',
  },
})

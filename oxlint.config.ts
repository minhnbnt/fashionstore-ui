import { defineConfig } from 'oxlint'

export default defineConfig({
  plugins: ['react', 'typescript', 'oxc', 'jsx-a11y', 'unicorn', 'import', 'promise'],
  jsPlugins: ['@tanstack/eslint-plugin-query', '@shadcn/lint'],
  options: {
    typeAware: true,
  },
  settings: {
    shadcn: {
      ui: '@/components/ui',
    },
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

    'shadcn/no-restyle': [
      'error',
      {
        allow: ['layout'],
        contracts: [
          {
            pattern: '^Input$',
            allow: ['layout', 'spacing'],
          },
          {
            pattern: '^CardTitle$',
            allow: ['layout', 'typography'],
          },
        ],
      },
    ],
    'shadcn/no-raw-colors': 'error',
    'shadcn/no-arbitrary-values': 'error',
    'shadcn/no-inline-styles': 'error',
    'shadcn/no-unknown-classes': 'error',
    'shadcn/require-static-classes': 'error',
  },
  overrides: [
    {
      files: ['src/components/ui/**'],
      rules: {
        'shadcn/no-restyle': 'off',
        'shadcn/no-arbitrary-values': 'off',
        'shadcn/require-static-classes': 'off',
        // File sinh tự động dùng class của plugin tw-animate-css
        // mà linter không phân giải được từ theme.
        'shadcn/no-unknown-classes': 'off',
      },
    },
  ],
})

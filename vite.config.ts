import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, lazyPlugins } from 'vite-plus'

export default defineConfig({
  staged: {
    '*': 'vp check --fix',
  },

  fmt: {
    singleQuote: true,
    semi: false,
    sortTailwindcss: true,
    sortImports: {
      customGroups: [
        {
          groupName: 'react-libs',
          elementNamePattern: ['react', 'react-**', 'react-**/**'],
        },
      ],
      groups: [
        'react-libs',
        ['value-builtin', 'value-external'],
        'value-internal',
        ['value-parent', 'value-sibling', 'value-index'],
        'unknown',
      ],
    },
  },

  lint: {
    plugins: ['react', 'typescript', 'oxc', 'jsx-a11y', 'unicorn', 'import', 'promise'],
    jsPlugins: [
      '@tanstack/eslint-plugin-query',
      { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
    ],
    options: { typeAware: true, typeCheck: true },
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

      'vite-plus/prefer-vite-plus-imports': 'error',
    },
  },

  plugins: lazyPlugins(() => [react(), tailwindcss()]),

  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react-vendor',
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
            },
            {
              name: 'router-vendor',
              test: /node_modules[\\/]react-router[\\/]/,
            },
            {
              name: 'query-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/](motion|framer-motion)[\\/]/,
            },
            {
              name: 'zod-vendor',
              test: /node_modules[\\/]zod[\\/]/,
            },
            {
              name: 'ai-vendor',
              test: /node_modules[\\/]ai[\\/]/,
            },
          ],
        },
      },
    },
  },

  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@generated': path.resolve(import.meta.dirname, 'generated'),
    },
  },

  server: {
    allowedHosts: true,
  },
})

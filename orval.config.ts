import { defineConfig } from 'orval'

export default defineConfig({
  fashionstore: {
    input: {
      target: './docs/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'generated/endpoints',
      schemas: 'generated/model',
      client: 'react-query',
      httpClient: 'fetch',
      clean: true,
      override: {
        mutator: {
          path: './src/lib/apiFetch.ts',
          name: 'customFetch',
        },
      },
    },
  },
})

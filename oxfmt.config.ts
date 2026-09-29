import { defineConfig } from 'oxfmt'

export default defineConfig({
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
})

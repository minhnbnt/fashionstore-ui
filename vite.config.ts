import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
              name: 'query-vendor',
              test: /node_modules[\\/]@tanstack[\\/]/,
            },
            {
              name: 'motion-vendor',
              test: /node_modules[\\/](motion|framer-motion)[\\/]/,
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

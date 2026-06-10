import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,   // test files share SQLite — run sequentially
    globalSetup: ['./tests/globalSetup.ts'],
    exclude: ['tests/**/*[(][1][)]*', '**/node_modules/**'],  // ignore Windows duplicate files
    env: {
      DATABASE_URL: 'file:./test.db',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
})

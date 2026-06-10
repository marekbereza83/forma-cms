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
      // R2 stubs — values unused (S3 client is mocked in upload.test.ts)
      R2_ACCOUNT_ID: 'test-account',
      R2_ACCESS_KEY_ID: 'test-key',
      R2_SECRET_ACCESS_KEY: 'test-secret',
      R2_BUCKET: 'test-bucket',
      R2_PUBLIC_BASE_URL: 'https://pub-test.r2.dev',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
})

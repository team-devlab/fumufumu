import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // unit テストは `.unit.test.ts` のみ実行する
    include: ['src/test/**/*.unit.test.ts'],
  },
});

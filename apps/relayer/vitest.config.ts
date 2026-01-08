import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    envFile: '../../packages/database/.env',
  },
  define: {
    'process.env.NODE_ENV': '\"test\"',
  },
});

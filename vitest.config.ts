
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Vitest configuration options
    globals: true, // Use global APIs
    environment: 'node', // Test environment
    include: ['**/apps/relayer/test/**/*.test.ts'], // Include test files
  },
});

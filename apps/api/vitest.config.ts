import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Test against the shared source, not whatever was last built into its dist
      '@taohoadon/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});

import { defineConfig } from 'vitest/config';
import * as path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@paypal-gateway/shared': path.resolve(__dirname, 'packages/shared/src/index.ts'),
      '@paypal-gateway/policy': path.resolve(__dirname, 'packages/policy/src/index.ts'),
      '@paypal-gateway/paypal-adapter': path.resolve(__dirname, 'packages/paypal-adapter/src/index.ts'),
      '@paypal-gateway/scanner': path.resolve(__dirname, 'packages/scanner/src/index.ts'),
      '@paypal-gateway/guarded-tools': path.resolve(__dirname, 'packages/guarded-tools/src/index.ts'),
    },
  },
});

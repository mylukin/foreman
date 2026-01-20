import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    fileParallelism: false, // Disable parallel file execution to avoid race conditions
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/test-utils/**',
        'src/**/*.example.ts',
        'src/index.ts',
        'src/infrastructure/index.ts',
        'src/repositories/index.ts',
        'src/services/index.ts',
      ],
    },
    mockReset: true,
    unstubEnvs: true,
  },
});

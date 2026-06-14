import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}'],
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'src/utils/distribution.js',
        'src/utils/statusSync.js',
        'src/utils/consistencyCheck.js',
        'src/utils/migrateData.js',
        'src/utils/archive.js'
      ],
      thresholds: {
        lines: 68,
        functions: 68,
        branches: 60,
        statements: 66,
        'src/utils/distribution.js': {
          lines: 85,
          functions: 88,
          branches: 75
        },
        'src/utils/statusSync.js': {
          lines: 80,
          functions: 85,
          branches: 70
        },
        'src/utils/migrateData.js': {
          lines: 80,
          functions: 90,
          branches: 70
        },
        'src/utils/archive.js': {
          lines: 80,
          functions: 85,
          branches: 70
        },
        'src/utils/consistencyCheck.js': {
          lines: 60,
          functions: 55,
          branches: 50
        }
      }
    }
  }
});
